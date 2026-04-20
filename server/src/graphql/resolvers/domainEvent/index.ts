import { Resolver, Subscription, Arg, Root } from "type-graphql";
import mongoose from "mongoose";
import { DomainEventGql } from "./types";
import { watchDomainEvents } from "@lib/domainEventStream";
import type { DomainEventDocument } from "@models";

async function* subscribeDomainEvents(
  entityType: string,
  entityId: string
): AsyncGenerator<DomainEventDocument> {
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
  @Subscription(() => DomainEventGql, {
    subscribe: ({ args }) =>
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
