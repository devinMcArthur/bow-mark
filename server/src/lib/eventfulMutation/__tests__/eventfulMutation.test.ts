import mongoose, { Schema, Document } from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { runWithContext, randomTraceId, randomSpanId } from "@lib/requestContext";
import { DomainEvent } from "@models";
import { versioned, findOneAndUpdateVersioned, StaleVersionError } from "@lib/entityVersion";
import { computeForward, computeInverse } from "@lib/jsonPatch";
import { eventfulMutation, EventfulMutationRollback } from "..";

interface ScratchDoc extends Document {
  _id: mongoose.Types.ObjectId;
  text: string;
  owner: mongoose.Types.ObjectId;
  version: number;
}
const scratchSchema = new Schema<ScratchDoc>(
  { text: String, owner: { type: Schema.Types.ObjectId, ref: "User" } },
  { collection: "eventfulmutation_test_scratch", timestamps: true }
);
scratchSchema.plugin(versioned);
const ScratchNote =
  (mongoose.models.EventfulTestScratch as mongoose.Model<ScratchDoc>) ||
  mongoose.model<ScratchDoc>("EventfulTestScratch", scratchSchema);

const ownerId = new mongoose.Types.ObjectId();

const withCtx = <T>(fn: () => Promise<T>): Promise<T> =>
  runWithContext(
    {
      traceId: randomTraceId(),
      spanId: randomSpanId(),
      actorKind: "user",
      userId: ownerId.toString(),
    },
    fn
  ) as Promise<T>;

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

describe("eventfulMutation", () => {
  it("commits state change and event in the same transaction", async () => {
    const note = await withCtx(() =>
      eventfulMutation(async (session) => {
        const created = await ScratchNote.create(
          [{ text: "hello", owner: ownerId }],
          { session }
        );
        const doc = created[0];
        return {
          result: doc,
          event: {
            type: "scratchNote.created",
            actorKind: "user",
            actorId: ownerId,
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
    expect(note.text).toBe("hello");
    const events = await DomainEvent.find({ entityId: note._id }).lean();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("scratchNote.created");
    expect(events[0].requestId).toBeDefined();
  });

  it("rolls back both state and event when the callback throws", async () => {
    await withCtx(async () => {
      await expect(
        eventfulMutation(async (session) => {
          await ScratchNote.create([{ text: "x", owner: ownerId }], { session });
          throw new Error("boom");
        })
      ).rejects.toThrow("boom");
    });
    expect(await ScratchNote.countDocuments()).toBe(0);
    expect(await DomainEvent.countDocuments()).toBe(0);
  });

  it("propagates StaleVersionError with full rollback", async () => {
    const note = await ScratchNote.create({ text: "a", owner: ownerId });
    await withCtx(async () => {
      await expect(
        eventfulMutation(async (session) => {
          await findOneAndUpdateVersioned(
            ScratchNote,
            { _id: note._id },
            { $set: { text: "b" } },
            { expectedVersion: 999, session }
          );
          return { result: null, event: null as never };
        })
      ).rejects.toBeInstanceOf(StaleVersionError);
    });
    expect(await DomainEvent.countDocuments()).toBe(0);
    const fresh = await ScratchNote.findById(note._id).lean();
    expect(fresh?.text).toBe("a");
    expect(fresh?.version).toBe(0);
  });

  it("pulls requestId / sessionId / userId from the active context", async () => {
    await runWithContext(
      {
        traceId: "a".repeat(32),
        spanId: "b".repeat(16),
        actorKind: "user",
        userId: ownerId.toString(),
        sessionId: "sess-999",
      },
      async () => {
        const doc = await eventfulMutation(async (session) => {
          const created = await ScratchNote.create(
            [{ text: "t", owner: ownerId }],
            { session }
          );
          const d = created[0];
          return {
            result: d,
            event: {
              type: "scratchNote.created",
              actorKind: "user",
              actorId: ownerId,
              entityType: "scratchNote",
              entityId: d._id,
              toVersion: d.version,
              diff: { forward: [], inverse: [] },
            },
          };
        });
        const ev = await DomainEvent.findOne({ entityId: doc._id }).lean();
        expect(ev?.requestId).toBe("a".repeat(32));
        expect(ev?.sessionId).toBe("sess-999");
        expect(ev?.actorId?.toString()).toBe(ownerId.toString());
      }
    );
  });

  it("EventfulMutationRollback aborts cleanly", async () => {
    await withCtx(async () => {
      const out = await eventfulMutation(async (session) => {
        await ScratchNote.create([{ text: "nope", owner: ownerId }], { session });
        throw new EventfulMutationRollback("preflight check failed");
      }).catch((e) => e);
      expect(out).toBeInstanceOf(EventfulMutationRollback);
    });
    expect(await ScratchNote.countDocuments()).toBe(0);
  });
});
