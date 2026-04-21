import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import {
  EnrichedFile,
  File,
  Tender,
  FileNode,
  Document as DocumentModel,
} from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { resolveDocumentsForContext } from "..";

let seed: SeededDatabase;

beforeAll(async () => {
  await prepareDatabase();
  seed = await seedDatabase();
});
afterAll(async () => {
  await disconnectAndStopServer();
});

describe("resolveDocumentsForContext", () => {
  it("reads old-shape tender.files[] when new-shape tree is empty", async () => {
    const tender = seed.tenderPricing.tender;
    const file = await File.create({
      mimetype: "application/pdf",
      description: "spec.pdf",
      originalFilename: "spec.pdf",
    });
    const enrichedFile = await EnrichedFile.create({
      file: file._id,
      summaryStatus: "ready",
    });
    await Tender.findByIdAndUpdate(tender._id, {
      $push: { files: enrichedFile._id },
    });

    const resolved = await resolveDocumentsForContext({
      scope: "tender",
      entityId: tender._id as any,
    });

    const match = resolved.find((d) => d.documentId.toString() === enrichedFile._id.toString());
    expect(match).toBeDefined();
    expect(match?.source).toBe("legacy-enrichedfile");
    expect(match?.mimetype).toBe("application/pdf");
    expect(match?.originalFilename).toBe("spec.pdf");
  });

  it("reads new-shape FileNodes when tree is populated", async () => {
    // Create a fresh tender and provision its root directly (we don't call
    // Tender.createDocument here to keep the test focused on the new-shape
    // read path).
    const tenderId = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId: tenderId });

    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const tenderRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: tenderId.toString() });

    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "new-spec.pdf",
      storageKey: "new-spec-key",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    await FileNode.create({
      type: "file",
      name: "new-spec.pdf",
      normalizedName: normalizeNodeName("new-spec.pdf"),
      parentId: tenderRoot!._id,
      documentId: doc._id,
      version: 0,
      sortKey: "0000",
      aiManaged: false,
      isReservedRoot: false,
    });

    const resolved = await resolveDocumentsForContext({
      scope: "tender",
      entityId: tenderId,
    });

    expect(resolved.length).toBeGreaterThan(0);
    expect(resolved.every((d) => d.source === "new-document")).toBe(true);
    expect(resolved.some((d) => d.originalFilename === "new-spec.pdf")).toBe(true);
  });

  it("returns empty array when scope has no documents", async () => {
    const resolved = await resolveDocumentsForContext({
      scope: "jobsite",
      entityId: new mongoose.Types.ObjectId(),
    });
    expect(resolved).toEqual([]);
  });
});
