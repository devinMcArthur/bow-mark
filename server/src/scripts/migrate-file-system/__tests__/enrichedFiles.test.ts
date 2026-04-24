import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { EnrichedFile, File, Document as DocumentModel, Enrichment } from "@models";
import { migrateEnrichedFiles } from "../01-enrichedFiles";

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await disconnectAndStopServer();
});

beforeEach(async () => {
  await EnrichedFile.deleteMany({});
  await File.deleteMany({});
  await DocumentModel.deleteMany({});
  await Enrichment.deleteMany({});
});

describe("migrateEnrichedFiles", () => {
  it("creates a Document with _id === EnrichedFile._id", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      description: "spec.pdf",
    });
    const ef = await EnrichedFile.create({
      file: file._id,
      summaryStatus: "ready",
      summary: { overview: "x", documentType: "spec", keyTopics: [] },
      pageCount: 10,
      summaryAttempts: 1,
      processingVersion: 1,
    });

    await migrateEnrichedFiles({ dryRun: false });

    const doc = await DocumentModel.findById(ef._id).lean();
    expect(doc).not.toBeNull();
    expect(doc?.currentFileId?.toString()).toBe(file._id.toString());
  });

  it("creates an Enrichment with full state preserved", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      description: "spec.pdf",
    });
    const ef = await EnrichedFile.create({
      file: file._id,
      summaryStatus: "processing",
      summaryAttempts: 2,
      processingVersion: 3,
      queuedAt: new Date("2026-01-01"),
      processingStartedAt: new Date("2026-01-02"),
    });

    await migrateEnrichedFiles({ dryRun: false });

    const enrichment = await Enrichment.findOne({ documentId: ef._id }).lean();
    expect(enrichment).not.toBeNull();
    expect(enrichment?.status).toBe("processing");
    expect(enrichment?.attempts).toBe(2);
    expect(enrichment?.processingVersion).toBe(3);
    expect(enrichment?.fileId?.toString()).toBe(file._id.toString());
  });

  it("is idempotent (re-run doesn't duplicate)", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      description: "spec.pdf",
    });
    await EnrichedFile.create({
      file: file._id,
      summaryStatus: "ready",
    });

    await migrateEnrichedFiles({ dryRun: false });
    await migrateEnrichedFiles({ dryRun: false });
    await migrateEnrichedFiles({ dryRun: false });

    expect(await DocumentModel.countDocuments()).toBe(1);
    expect(await Enrichment.countDocuments()).toBe(1);
  });

  it("copies File.description to File.originalFilename if the new field is empty", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      description: "legacy-name.pdf",
    });
    await EnrichedFile.create({ file: file._id, summaryStatus: "ready" });

    await migrateEnrichedFiles({ dryRun: false });

    const refreshed = await File.findById(file._id).lean();
    expect(refreshed?.originalFilename).toBe("legacy-name.pdf");
    expect(refreshed?.storageKey).toBe(file._id.toString());
  });

  it("dry-run mode does not write", async () => {
    const file = await File.create({
      mimetype: "application/pdf",
      description: "spec.pdf",
    });
    await EnrichedFile.create({ file: file._id, summaryStatus: "ready" });

    const report = await migrateEnrichedFiles({ dryRun: true });
    expect(report.scanned).toBe(1);
    expect(await DocumentModel.countDocuments()).toBe(0);
    expect(await Enrichment.countDocuments()).toBe(0);
  });
});
