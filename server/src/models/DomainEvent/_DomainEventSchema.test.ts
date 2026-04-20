import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { DomainEvent } from "@models";

beforeAll(async () => {
  await prepareDatabase();
  // Indexes are registered at schema declaration but not created until
  // first connection sync. Explicitly build them here so the index-check
  // test has something to inspect.
  await DomainEvent.ensureIndexes();
});
afterAll(async () => {
  await DomainEvent.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("DomainEvent schema", () => {
  it("persists a minimum-fields event and assigns _id/at", async () => {
    const ev = await DomainEvent.create({
      type: "test.thing.created",
      schemaVersion: 1,
      actorKind: "user",
      actorId: new mongoose.Types.ObjectId(),
      entityType: "thing",
      entityId: new mongoose.Types.ObjectId(),
      toVersion: 1,
      diff: {
        forward: [{ op: "add", path: "", value: { name: "alpha" } }],
        inverse: [{ op: "remove", path: "" }],
      },
    });
    expect(ev._id).toBeDefined();
    expect(ev.at).toBeInstanceOf(Date);
  });

  it("rejects actorKind outside the enum", async () => {
    await expect(
      DomainEvent.create({
        type: "t",
        schemaVersion: 1,
        actorKind: "alien" as never,
        entityType: "thing",
        entityId: new mongoose.Types.ObjectId(),
        toVersion: 1,
        diff: { forward: [], inverse: [] },
      })
    ).rejects.toThrow();
  });

  it("queries by entityType+entityId", async () => {
    const entityId = new mongoose.Types.ObjectId();
    await DomainEvent.create([
      {
        type: "x.created",
        schemaVersion: 1,
        actorKind: "system",
        entityType: "x",
        entityId,
        toVersion: 1,
        diff: { forward: [], inverse: [] },
      },
      {
        type: "x.updated",
        schemaVersion: 1,
        actorKind: "system",
        entityType: "x",
        entityId,
        toVersion: 2,
        diff: { forward: [], inverse: [] },
      },
    ]);
    const history = await DomainEvent.find({ entityType: "x", entityId })
      .sort({ at: 1, _id: 1 })
      .lean();
    expect(history).toHaveLength(2);
    expect(history[0].type).toBe("x.created");
    expect(history[1].type).toBe("x.updated");
  });

  it("indexes relatedEntities.entityId for cross-entity queries", async () => {
    const indexes = await DomainEvent.collection.indexes();
    const names = indexes.map((i) => JSON.stringify(i.key));
    expect(names.some((n) => n.includes("relatedEntities.entityId"))).toBe(true);
  });
});
