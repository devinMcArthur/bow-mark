import { Authorized, Resolver, Subscription, Arg, Root } from "type-graphql";
import mongoose from "mongoose";
import { DomainEventGql } from "./types";
import { watchDomainEvents } from "@lib/domainEventStream";
import type { DomainEventDocument } from "@models";

// Entity types whose event streams can be subscribed to. Narrow allow-list
// so a malformed or hostile client can't probe arbitrary collections.
// Per-entity read ACL (e.g. minRole checks on FileNode events) is a
// follow-up — gate at least keeps anon + random-string subscribers out.
const ALLOWED_ENTITY_TYPES = new Set([
  "FileNode",
  "Tender",
  "Jobsite",
  "DailyReport",
  "Invoice",
  "Company",
]);

async function* subscribeDomainEvents(
  entityType: string,
  entityId: string
): AsyncGenerator<DomainEventDocument> {
  if (!ALLOWED_ENTITY_TYPES.has(entityType)) {
    throw new Error(`entityType not subscribable: ${entityType}`);
  }
  if (!mongoose.isValidObjectId(entityId)) {
    throw new Error("Invalid entityId");
  }
  const { iterator, close } = watchDomainEvents({
    entityType,
    entityId: new mongoose.Types.ObjectId(entityId),
  });
  try {
    for await (const ev of iterator) yield ev;
  } finally {
    close();
  }
}

@Resolver()
export default class DomainEventResolver {
  @Authorized()
  @Subscription(() => DomainEventGql, {
    // Subscribe handler args are (root, args, context, info) — the first
    // positional param is the root value (undefined for subscriptions),
    // not the payload. Destructuring { args } off root yielded a crash
    // at WS connect.
    subscribe: (_root, args: { entityType: string; entityId: string }) =>
      subscribeDomainEvents(args.entityType, args.entityId),
  })
  domainEvent(
    @Arg("entityType") _entityType: string,
    @Arg("entityId") _entityId: string,
    @Root() event: DomainEventDocument
  ): DomainEventGql {
    return {
      _id: event._id.toString(),
      type: event.type,
      schemaVersion: event.schemaVersion,
      actorKind: event.actorKind,
      actorId: event.actorId?.toString(),
      onBehalfOf: event.onBehalfOf?.toString(),
      entityType: event.entityType,
      entityId: event.entityId.toString(),
      relatedEntities: event.relatedEntities,
      at: event.at,
      fromVersion: event.fromVersion,
      toVersion: event.toVersion,
      diff: event.diff,
      requestId: event.requestId,
      sessionId: event.sessionId,
      correlationId: event.correlationId,
      causedByEventId: event.causedByEventId?.toString(),
      metadata: event.metadata,
    };
  }
}
