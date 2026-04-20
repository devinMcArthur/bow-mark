import type { Types } from "mongoose";
import { DomainEvent, DomainEventDocument } from "@models";

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
}

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
    stream.close().catch(() => undefined);
  };

  const iterator: AsyncIterable<DomainEventDocument> = {
    async *[Symbol.asyncIterator]() {
      try {
        for await (const change of stream) {
          if (closed) break;
          if (change.operationType !== "insert") continue;
          const doc = (change as unknown as { fullDocument: DomainEventDocument })
            .fullDocument;
          yield doc;
        }
      } finally {
        close();
      }
    },
  };

  return { iterator, close };
}
