import mongoose, { Schema, Document } from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { versioned, StaleVersionError, findOneAndUpdateVersioned } from "..";

interface WidgetDoc extends Document {
  name: string;
  version: number;
}

const widgetSchema = new Schema<WidgetDoc>({ name: String });
widgetSchema.plugin(versioned);
const Widget = mongoose.model<WidgetDoc>("TestWidget", widgetSchema);

beforeAll(async () => {
  await prepareDatabase();
});

afterAll(async () => {
  await Widget.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("versioned plugin", () => {
  it("adds version=0 on create", async () => {
    const w = await Widget.create({ name: "alpha" });
    expect(w.version).toBe(0);
  });

  it("increments version on plain .save()", async () => {
    const w = await Widget.create({ name: "beta" });
    w.name = "beta-v2";
    await w.save();
    const fresh = await Widget.findById(w._id).lean();
    expect(fresh?.version).toBe(1);
  });

  it("findOneAndUpdateVersioned succeeds when expectedVersion matches", async () => {
    const w = await Widget.create({ name: "gamma" });
    const updated = await findOneAndUpdateVersioned(
      Widget,
      { _id: w._id },
      { $set: { name: "gamma-v2" } },
      { expectedVersion: 0 }
    );
    expect(updated?.version).toBe(1);
    expect(updated?.name).toBe("gamma-v2");
  });

  it("findOneAndUpdateVersioned throws StaleVersionError on mismatch", async () => {
    const w = await Widget.create({ name: "delta" });
    await expect(
      findOneAndUpdateVersioned(
        Widget,
        { _id: w._id },
        { $set: { name: "delta-v2" } },
        { expectedVersion: 99 }
      )
    ).rejects.toBeInstanceOf(StaleVersionError);
  });

  it("StaleVersionError carries entity identity", async () => {
    const w = await Widget.create({ name: "epsilon" });
    try {
      await findOneAndUpdateVersioned(
        Widget,
        { _id: w._id },
        { $set: { name: "x" } },
        { expectedVersion: 99 }
      );
    } catch (err) {
      expect(err).toBeInstanceOf(StaleVersionError);
      const e = err as StaleVersionError;
      expect(e.modelName).toBe("TestWidget");
      expect(e.expectedVersion).toBe(99);
    }
  });
});
