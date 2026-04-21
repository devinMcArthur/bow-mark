import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { Enrichment, Document as DocumentModel, File } from "@models";

beforeAll(async () => {
  await prepareDatabase();
  await Enrichment.ensureIndexes();
});
afterAll(async () => {
  await Enrichment.collection.drop().catch(() => undefined);
  await DocumentModel.collection.drop().catch(() => undefined);
  await File.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("Enrichment schema", () => {
  it("persists the full state machine", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "e1",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    const enrichment = await Enrichment.create({
      documentId: doc._id,
      fileId: file._id,
      status: "pending",
      attempts: 0,
      processingVersion: 1,
      queuedAt: new Date(),
    });
    expect(enrichment.status).toBe("pending");
    expect(enrichment.attempts).toBe(0);
    expect(enrichment.processingVersion).toBe(1);
  });

  it("enforces unique index on documentId (one enrichment per document)", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "e2",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    await Enrichment.create({
      documentId: doc._id,
      fileId: file._id,
      status: "pending",
      attempts: 0,
      processingVersion: 1,
    });
    await expect(
      Enrichment.create({
        documentId: doc._id,
        fileId: file._id,
        status: "pending",
        attempts: 0,
        processingVersion: 1,
      })
    ).rejects.toThrow(/duplicate key/i);
  });

  it("stores summary and pageIndex results", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "e3",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    const enrichment = await Enrichment.create({
      documentId: doc._id,
      fileId: file._id,
      status: "ready",
      attempts: 1,
      processingVersion: 1,
      summary: {
        overview: "A paving spec",
        documentType: "specification",
        keyTopics: ["asphalt", "base course"],
      },
      pageCount: 12,
      pageIndex: [{ page: 1, summary: "Cover page" }],
    });
    expect(enrichment.summary?.overview).toBe("A paving spec");
    expect(enrichment.pageIndex?.[0].page).toBe(1);
  });
});
