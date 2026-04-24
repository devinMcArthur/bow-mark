import mongoose, { ClientSession, Types } from "mongoose";
import { DomainEvent } from "@models";
import { getRequestContext } from "@lib/requestContext";
import type { JsonPatch } from "@lib/jsonPatch";

export class EventfulMutationRollback extends Error {
  constructor(message = "eventfulMutation rolled back by caller") {
    super(message);
    this.name = "EventfulMutationRollback";
  }
}

export interface DomainEventInput {
  type: string;
  schemaVersion?: number;
  actorKind: "user" | "ai" | "system";
  actorId?: Types.ObjectId;
  onBehalfOf?: Types.ObjectId;
  entityType: string;
  entityId: Types.ObjectId;
  relatedEntities?: Array<{
    entityType: string;
    entityId: Types.ObjectId;
    role: string;
  }>;
  fromVersion?: number;
  toVersion: number;
  diff: { forward: JsonPatch; inverse: JsonPatch };
  causedByEventId?: Types.ObjectId;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface EventfulMutationOutput<T> {
  result: T;
  /**
   * The event to emit. Pass `null` to indicate "no event for this op" — the
   * transaction still commits state, just without audit. Use sparingly; the
   * point of this helper is that state + event are atomic.
   */
  event: DomainEventInput | null;
  /**
   * Additional cascade events emitted in the same transaction. Used e.g.
   * when a folder move triggers per-descendant ancestor updates. Each
   * cascade event receives `causedByEventId` pointing at the root event
   * automatically.
   */
  cascade?: DomainEventInput[];
}

/**
 * Run `fn` inside a MongoDB transaction. On success, the returned event
 * (plus any cascade events) are appended to the DomainEvent log in the
 * same transaction. If anything throws, both state and event are rolled
 * back — no "state saved but audit lost" failure mode.
 *
 * Traceability fields (requestId, sessionId, correlationId, actorKind)
 * are pulled from the active RequestContext if the caller didn't set
 * them explicitly on the event.
 */
export async function eventfulMutation<T>(
  fn: (session: ClientSession) => Promise<EventfulMutationOutput<T>>
): Promise<T> {
  const ctx = getRequestContext();
  const session = await mongoose.startSession();
  try {
    let capturedResult: T | undefined;
    await session.withTransaction(async () => {
      const { result, event, cascade } = await fn(session);
      capturedResult = result;

      if (event) {
        const rootDoc = buildEventDoc(event, ctx);
        const [inserted] = await DomainEvent.insertMany([rootDoc], { session });

        if (cascade && cascade.length > 0) {
          const docs = cascade.map((c) =>
            buildEventDoc({ ...c, causedByEventId: inserted._id }, ctx)
          );
          await DomainEvent.insertMany(docs, { session });
        }
      }
    });
    return capturedResult as T;
  } finally {
    await session.endSession();
  }
}

function buildEventDoc(
  input: DomainEventInput,
  ctx: ReturnType<typeof getRequestContext>
) {
  // actorId / actorKind default from the ambient RequestContext when the
  // caller didn't set them explicitly. This is what makes "who did this?"
  // populate automatically for every mutation, since the Apollo context fn
  // enriches the ALS frame with user info from the JWT.
  const ctxUserId = ctx?.userId;
  const resolvedActorId =
    input.actorId ??
    (ctxUserId ? new mongoose.Types.ObjectId(ctxUserId) : undefined);
  return {
    type: input.type,
    schemaVersion: input.schemaVersion ?? 1,
    actorKind: input.actorKind ?? ctx?.actorKind ?? "user",
    actorId: resolvedActorId,
    onBehalfOf: input.onBehalfOf,
    entityType: input.entityType,
    entityId: input.entityId,
    relatedEntities: input.relatedEntities ?? [],
    at: new Date(),
    fromVersion: input.fromVersion,
    toVersion: input.toVersion,
    diff: input.diff,
    requestId: ctx?.traceId,
    sessionId: ctx?.sessionId,
    correlationId: ctx?.correlationId,
    causedByEventId: input.causedByEventId,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata,
  };
}
