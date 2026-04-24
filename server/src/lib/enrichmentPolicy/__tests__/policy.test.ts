import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { FileNode, File, Document as DocumentModel } from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { shouldEnrichNow } from "..";

beforeAll(async () => {
  await prepareDatabase();
  await bootstrapRoots();
});
afterAll(async () => {
  await FileNode.collection.drop().catch(() => undefined);
  await File.collection.drop().catch(() => undefined);
  await DocumentModel.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

async function nsRoot(namespaceName: string) {
  return FileNode.findOne({ name: namespaceName, isReservedRoot: true });
}

async function perEntityRoot(namespace: "/tenders" | "/jobsites" | "/daily-reports", entityId: mongoose.Types.ObjectId) {
  await createEntityRoot({ namespace, entityId });
  const ns = await nsRoot(namespace.slice(1));
  return FileNode.findOne({ parentId: ns!._id, name: entityId.toString() });
}

async function makeFileNode(parentId: mongoose.Types.ObjectId, name: string, documentId: mongoose.Types.ObjectId) {
  return FileNode.create({
    type: "file",
    name,
    normalizedName: normalizeNodeName(name),
    parentId,
    documentId,
    version: 0,
    sortKey: "0000",
    systemManaged: false,
    isReservedRoot: false,
  });
}

describe("shouldEnrichNow", () => {
  it("returns true when placement is under /tenders/ and MIME is PDF", async () => {
    const tenderId = new mongoose.Types.ObjectId();
    const tenderRoot = await perEntityRoot("/tenders", tenderId);
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "x.pdf",
      storageKey: "s1",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    await makeFileNode(tenderRoot!._id, "x.pdf", doc._id);

    expect(await shouldEnrichNow(doc._id)).toBe(true);
  });

  it("returns false when placement is under /daily-reports/", async () => {
    const reportId = new mongoose.Types.ObjectId();
    const reportRoot = await perEntityRoot("/daily-reports", reportId);
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "x.pdf",
      storageKey: "s2",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    await makeFileNode(reportRoot!._id, "x.pdf", doc._id);

    expect(await shouldEnrichNow(doc._id)).toBe(false);
  });

  it("returns false when MIME is not in the enrichable allowlist", async () => {
    const tenderId = new mongoose.Types.ObjectId();
    const tenderRoot = await perEntityRoot("/tenders", tenderId);
    // Bypass Mongoose's SupportedMimeTypes enum validator by inserting
    // directly via the driver — we need a mimetype that's storable in the
    // collection but absent from ENRICHABLE_MIMETYPES.
    const fileId = new mongoose.Types.ObjectId();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (File.collection as any).insertOne({
      _id: fileId,
      mimetype: "video/mp4",
      originalFilename: "x.mp4",
      storageKey: "s3",
      size: 1,
      uploadedAt: new Date(),
    });
    const doc = await DocumentModel.create({ currentFileId: fileId });
    await makeFileNode(tenderRoot!._id, "x.mp4", doc._id);

    expect(await shouldEnrichNow(doc._id)).toBe(false);
  });

  it("returns false when enrichmentLocked=true regardless of placement", async () => {
    const tenderId = new mongoose.Types.ObjectId();
    const tenderRoot = await perEntityRoot("/tenders", tenderId);
    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "x.pdf",
      storageKey: "s4",
      size: 1,
    });
    const doc = await DocumentModel.create({
      currentFileId: file._id,
      enrichmentLocked: true,
    });
    await makeFileNode(tenderRoot!._id, "x.pdf", doc._id);

    expect(await shouldEnrichNow(doc._id)).toBe(false);
  });

  it("returns true if ANY placement is under an enrichable namespace (multi-placement)", async () => {
    const tenderId = new mongoose.Types.ObjectId();
    const reportId = new mongoose.Types.ObjectId();
    const tenderRoot = await perEntityRoot("/tenders", tenderId);
    const reportRoot = await perEntityRoot("/daily-reports", reportId);

    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "x.pdf",
      storageKey: "s5",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    await makeFileNode(tenderRoot!._id, "x.pdf", doc._id);
    await makeFileNode(reportRoot!._id, "x.pdf", doc._id);

    expect(await shouldEnrichNow(doc._id)).toBe(true);
  });
});
