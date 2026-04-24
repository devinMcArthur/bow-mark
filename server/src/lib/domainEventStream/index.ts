import type { Types } from "mongoose";
import { DomainEvent, DomainEventDocument } from "@models";
import { createBoundedQueue } from "./boundedQueue";

export interface WatchDomainEventsFilter {
  type?: string;
  entityType?: string;
  entityId?: Types.ObjectId;
  actorId?: Types.ObjectId;
  sessionId?: string;
  correlationId?: string;
}

export interface WatchDomainEventsHandle {
  iterator: AsyncIterable<DomainEventDocument>;
  close: () => void;
  /** Number of events dropped due to queue backpressure since the
   *  watcher opened. Non-zero means a slow consumer missed updates
   *  and should refetch to reconcile. */
  droppedCount: () => number;
}

// Cap live-tail queue growth so a stalled subscriber can't OOM the pod.
// Each entry holds a full Mongoose document (fullDocument: updateLookup),
// so this is sized conservatively — 1000 x ~5KB doc ≈ 5MB ceiling per
// watcher. Tuned by eyeball; raise if we need more headroom.
const MAX_QUEUE_SIZE = 1000;

/**
 * Tail new DomainEvents via MongoDB change streams, applying a server-side
 * $match so unrelated events never leave the database.
 *
 * Intended for server-internal consumers (search indexer, GraphQL subscription
 * resolvers, cache invalidators). Resume-token persistence is intentionally
 * out of scope for v1 — consumers that care about replay after a restart
 * should query DomainEvents directly for events newer than their
 * last-processed `at`. Watch is strictly for live tail.
 */
export function watchDomainEvents(
  filter: WatchDomainEventsFilter
): WatchDomainEventsHandle {
  const match: Record<string, unknown> = {
    operationType: "insert",
  };
  if (filter.type) match["fullDocument.type"] = filter.type;
  if (filter.entityType) match["fullDocument.entityType"] = filter.entityType;
  if (filter.entityId) match["fullDocument.entityId"] = filter.entityId;
  if (filter.actorId) match["fullDocument.actorId"] = filter.actorId;
  if (filter.sessionId) match["fullDocument.sessionId"] = filter.sessionId;
  if (filter.correlationId)
    match["fullDocument.correlationId"] = filter.correlationId;

  const stream = DomainEvent.watch([{ $match: match }], {
    fullDocument: "updateLookup",
  });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    try {
      const r = stream.close() as unknown as Promise<unknown> | undefined;
      if (r && typeof r.catch === "function") r.catch(() => undefined);
    } catch {
      // already closed — nothing to do
    }
  };

  // Mongoose 5 ChangeStream is EventEmitter-based, not AsyncIterable.
  // Bridge to AsyncIterable via a bounded queue + resolver. The bounded
  // queue drops oldest on overflow — see boundedQueue.ts for rationale.
  const queue = createBoundedQueue<DomainEventDocument>(MAX_QUEUE_SIZE);
  let resolveNext: ((v: IteratorResult<DomainEventDocument>) => void) | null = null;

  const pushResult = (value: IteratorResult<DomainEventDocument>) => {
    if (resolveNext) {
      const r = resolveNext;
      resolveNext = null;
      r(value);
    }
  };

  stream.on("change", (change: { operationType: string; fullDocument?: DomainEventDocument }) => {
    if (closed) return;
    if (change.operationType !== "insert") return;
    if (!change.fullDocument) return;
    if (resolveNext) {
      pushResult({ value: change.fullDocument, done: false });
    } else {
      queue.push(change.fullDocument);
    }
  });
  stream.on("error", () => close());
  stream.on("close", () => {
    closed = true;
    pushResult({ value: undefined as unknown as DomainEventDocument, done: true });
  });

  const iterator: AsyncIterable<DomainEventDocument> = {
    [Symbol.asyncIterator](): AsyncIterator<DomainEventDocument> {
      return {
        next(): Promise<IteratorResult<DomainEventDocument>> {
          if (closed && queue.size === 0) {
            return Promise.resolve({
              value: undefined as unknown as DomainEventDocument,
              done: true,
            });
          }
          if (queue.size > 0) {
            return Promise.resolve({ value: queue.shift()!, done: false });
          }
          return new Promise((resolve) => {
            resolveNext = resolve;
          });
        },
        return(): Promise<IteratorResult<DomainEventDocument>> {
          close();
          return Promise.resolve({
            value: undefined as unknown as DomainEventDocument,
            done: true,
          });
        },
      };
    },
  };

  return { iterator, close, droppedCount: () => queue.droppedCount };
}
