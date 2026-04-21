import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { Document as DocumentModel, File } from "@models";

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await DocumentModel.collection.drop().catch(() => undefined);
  await File.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("Document schema", () => {
  it("persists with required identity fields", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "abc",
      size: 1,
    });
    const doc = await DocumentModel.create({
      currentFileId: file._id,
    });
    expect(doc._id).toBeDefined();
    expect(doc.currentFileId.toString()).toBe(file._id.toString());
    expect(doc.enrichmentLocked).toBe(false);
  });

  it("supports optional description", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "abc2",
      size: 1,
    });
    const doc = await DocumentModel.create({
      currentFileId: file._id,
      description: "Latest revision per January addendum",
    });
    expect(doc.description).toBe("Latest revision per January addendum");
  });

  it("accepts a pre-specified _id (preserves EnrichedFile._id during migration)", async () => {
    const presetId = new mongoose.Types.ObjectId();
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "abc3",
      size: 1,
    });
    const doc = await DocumentModel.create({
      _id: presetId,
      currentFileId: file._id,
    });
    expect(doc._id.toString()).toBe(presetId.toString());
  });
});
