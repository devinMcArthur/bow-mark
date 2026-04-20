import mongoose, { Schema, Document } from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import {
  runWithContext,
  randomTraceId,
  randomSpanId,
  type RequestContext,
} from "@lib/requestContext";
import { DomainEvent } from "@models";
import {
  versioned,
  findOneAndUpdateVersioned,
} from "@lib/entityVersion";
import { computeForward, computeInverse } from "@lib/jsonPatch";
import { eventfulMutation } from "@lib/eventfulMutation";
import { watchDomainEvents } from "@lib/domainEventStream";

interface FoundationScratchDoc extends Document {
  _id: mongoose.Types.ObjectId;
  text: string;
  owner: mongoose.Types.ObjectId;
  version: number;
}
const schema = new Schema<FoundationScratchDoc>(
  { text: String, owner: { type: Schema.Types.ObjectId, ref: "User" } },
  { collection: "foundation_e2e_scratch", timestamps: true }
);
schema.plugin(versioned);
const ScratchNote =
  (mongoose.models.FoundationE2EScratch as mongoose.Model<FoundationScratchDoc>) ||
  mongoose.model<FoundationScratchDoc>("FoundationE2EScratch", schema);

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await ScratchNote.collection.drop().catch(() => undefined);
  await DomainEvent.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});
beforeEach(async () => {
  await ScratchNote.deleteMany({});
  await DomainEvent.deleteMany({});
});

const makeCtx = (overrides: Partial<RequestContext> = {}): RequestContext => ({
  traceId: randomTraceId(),
  spanId: randomSpanId(),
  actorKind: "user",
  userId: new mongoose.Types.ObjectId().toString(),
  sessionId: "sess-e2e",
  ...overrides,
});

describe("foundation end-to-end", () => {
  it("threads context → version check → event → change-stream delivery", async () => {
    const ctx = makeCtx();
    const owner = new mongoose.Types.ObjectId(ctx.userId!);

    // 1. Start watching before emitting.
    const { iterator, close } = watchDomainEvents({ entityType: "scratchNote" });
    const firstEvent = (async () => {
      for await (const ev of iterator) return ev;
      return null;
    })();

    // Give the change stream a moment to initialise before writing.
    await new Promise((r) => setTimeout(r, 100));

    // 2. Create via eventfulMutation.
    const created = await runWithContext(ctx, () =>
      eventfulMutation(async (session) => {
        const docs = await ScratchNote.create(
          [{ text: "alpha", owner }],
          { session }
        );
        const doc = docs[0];
        return {
          result: doc,
          event: {
            type: "scratchNote.created",
            actorKind: "user",
            actorId: owner,
            entityType: "scratchNote",
            entityId: doc._id,
            toVersion: doc.version,
            diff: {
              forward: computeForward({}, doc.toObject()),
              inverse: computeInverse({}, doc.toObject()),
            },
          },
        };
      })
    );
    expect(created.version).toBe(0);

    // 3. Change stream delivers the event with context fields attached.
    const streamed = await firstEvent;
    expect(streamed).not.toBeNull();
    expect(streamed!.entityId.toString()).toBe(created._id.toString());
    expect(streamed!.requestId).toBe(ctx.traceId);
    expect(streamed!.sessionId).toBe("sess-e2e");
    close();

    // 4. Version check: correct expectedVersion succeeds.
    await runWithContext(ctx, () =>
      eventfulMutation(async (session) => {
        const before = await ScratchNote.findById(created._id).session(session).lean();
        const updated = await findOneAndUpdateVersioned(
          ScratchNote,
          { _id: created._id },
          { $set: { text: "beta" } },
          { expectedVersion: 0, session }
        );
        return {
          result: updated!,
          event: {
            type: "scratchNote.updated",
            actorKind: "user",
            actorId: owner,
            entityType: "scratchNote",
            entityId: updated!._id,
            fromVersion: 0,
            toVersion: updated!.version,
            diff: {
              forward: computeForward(before, updated!.toObject()),
              inverse: computeInverse(before, updated!.toObject()),
            },
          },
        };
      })
    );

    const after = await ScratchNote.findById(created._id).lean();
    expect(after?.text).toBe("beta");
    expect(after?.version).toBe(1);

    // 5. Two events in the log, in order.
    const events = await DomainEvent.find({ entityId: created._id })
      .sort({ at: 1 })
      .lean();
    expect(events.map((e) => e.type)).toEqual([
      "scratchNote.created",
      "scratchNote.updated",
    ]);
    expect(events[1].fromVersion).toBe(0);
    expect(events[1].toVersion).toBe(1);
  });
});
