import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { FileNode } from "@models";
import { bootstrapRoots } from "../bootstrapRoots";
import { createEntityRoot } from "../createEntityRoot";

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await FileNode.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("createEntityRoot", () => {
  beforeEach(async () => {
    await FileNode.deleteMany({});
    await bootstrapRoots();
  });

  it("creates a per-entity root folder under the correct namespace", async () => {
    const entityId = new mongoose.Types.ObjectId();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await createEntityRoot({
          namespace: "/tenders",
          entityId,
          session,
        });
      });
    } finally {
      await session.endSession();
    }

    const tendersNs = await FileNode.findOne({
      name: "tenders",
      isReservedRoot: true,
    }).lean();
    const entityRoot = await FileNode.findOne({
      parentId: tendersNs!._id,
      name: entityId.toString(),
    }).lean();
    expect(entityRoot).not.toBeNull();
    expect(entityRoot?.isReservedRoot).toBe(true);
  });

  it("is idempotent (re-creation for the same entityId is a no-op)", async () => {
    const entityId = new mongoose.Types.ObjectId();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await createEntityRoot({ namespace: "/tenders", entityId, session });
      });
      await session.withTransaction(async () => {
        await createEntityRoot({ namespace: "/tenders", entityId, session });
      });
    } finally {
      await session.endSession();
    }
    const count = await FileNode.countDocuments({
      name: entityId.toString(),
      isReservedRoot: true,
    });
    expect(count).toBe(1);
  });

  it("rolls back cleanly when the enclosing transaction aborts", async () => {
    const entityId = new mongoose.Types.ObjectId();
    const session = await mongoose.startSession();
    await expect(
      session.withTransaction(async () => {
        await createEntityRoot({ namespace: "/tenders", entityId, session });
        throw new Error("abort");
      })
    ).rejects.toThrow("abort");
    await session.endSession();

    const count = await FileNode.countDocuments({
      name: entityId.toString(),
    });
    expect(count).toBe(0);
  });
});
