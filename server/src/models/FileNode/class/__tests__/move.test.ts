import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { FileNode, Document as DocumentModel, File as FileModel, Enrichment } from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { StaleVersionError } from "@lib/entityVersion";
import { moveNodeCore, reevaluateEnrichmentAfterMove } from "../move";

beforeAll(async () => {
  await prepareDatabase();
  await bootstrapRoots();
  await FileNode.ensureIndexes();
});
afterAll(async () => {
  await FileNode.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

async function withSession<T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

describe("moveNodeCore", () => {
  it("moves a folder between two tender roots", async () => {
    const t1 = new mongoose.Types.ObjectId();
    const t2 = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId: t1 });
    await createEntityRoot({ namespace: "/tenders", entityId: t2 });
    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const t1Root = await FileNode.findOne({ parentId: tendersNs!._id, name: t1.toString() });
    const t2Root = await FileNode.findOne({ parentId: tendersNs!._id, name: t2.toString() });
    const folder = await FileNode.create({
      type: "folder", name: "F", normalizedName: normalizeNodeName("F"),
      parentId: t1Root!._id, systemManaged: false, sortKey: "5000", isReservedRoot: false, version: 0,
    });

    const { updated } = await withSession((session) =>
      moveNodeCore({ nodeId: folder._id, destinationParentId: t2Root!._id, expectedVersion: 0, session })
    );
    expect(updated.parentId.toString()).toBe(t2Root!._id.toString());
  });

  it("rejects moving a node into its own subtree (cycle)", async () => {
    const t = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId: t });
    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const tRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: t.toString() });

    const parent = await FileNode.create({
      type: "folder", name: "P", normalizedName: normalizeNodeName("P"),
      parentId: tRoot!._id, systemManaged: false, sortKey: "5000", isReservedRoot: false, version: 0,
    });
    const child = await FileNode.create({
      type: "folder", name: "C", normalizedName: normalizeNodeName("C"),
      parentId: parent._id, systemManaged: false, sortKey: "5000", isReservedRoot: false, version: 0,
    });

    await expect(
      withSession((session) =>
        moveNodeCore({ nodeId: parent._id, destinationParentId: child._id, expectedVersion: 0, session })
      )
    ).rejects.toThrow(/subtree/i);
  });

  it("rejects move into itself", async () => {
    const t = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId: t });
    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const tRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: t.toString() });
    const n = await FileNode.create({
      type: "folder", name: "N", normalizedName: normalizeNodeName("N"),
      parentId: tRoot!._id, systemManaged: false, sortKey: "5000", isReservedRoot: false, version: 0,
    });
    await expect(
      withSession((session) =>
        moveNodeCore({ nodeId: n._id, destinationParentId: n._id, expectedVersion: 0, session })
      )
    ).rejects.toThrow(/into itself/i);
  });

  it("rejects moving a reserved-root node", async () => {
    const t = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId: t });
    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const tRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: t.toString() });
    // tRoot is reserved. Try moving tendersNs (also reserved) under tRoot.
    await expect(
      withSession((session) =>
        moveNodeCore({ nodeId: tendersNs!._id, destinationParentId: tRoot!._id, expectedVersion: 0, session })
      )
    ).rejects.toThrow(/reserved-root/i);
  });

  it("rejects sibling name collision at destination", async () => {
    const t1 = new mongoose.Types.ObjectId();
    const t2 = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId: t1 });
    await createEntityRoot({ namespace: "/tenders", entityId: t2 });
    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const t1Root = await FileNode.findOne({ parentId: tendersNs!._id, name: t1.toString() });
    const t2Root = await FileNode.findOne({ parentId: tendersNs!._id, name: t2.toString() });
    await FileNode.create({
      type: "folder", name: "Drawings", normalizedName: normalizeNodeName("Drawings"),
      parentId: t2Root!._id, systemManaged: false, sortKey: "5000", isReservedRoot: false, version: 0,
    });
    const orig = await FileNode.create({
      type: "folder", name: "Drawings", normalizedName: normalizeNodeName("Drawings"),
      parentId: t1Root!._id, systemManaged: false, sortKey: "5000", isReservedRoot: false, version: 0,
    });
    await expect(
      withSession((session) =>
        moveNodeCore({ nodeId: orig._id, destinationParentId: t2Root!._id, expectedVersion: 0, session })
      )
    ).rejects.toThrow(/already exists/i);
  });

  it("throws StaleVersionError on OCC mismatch", async () => {
    const t1 = new mongoose.Types.ObjectId();
    const t2 = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId: t1 });
    await createEntityRoot({ namespace: "/tenders", entityId: t2 });
    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const t1Root = await FileNode.findOne({ parentId: tendersNs!._id, name: t1.toString() });
    const t2Root = await FileNode.findOne({ parentId: tendersNs!._id, name: t2.toString() });
    const n = await FileNode.create({
      type: "folder", name: "X", normalizedName: normalizeNodeName("X"),
      parentId: t1Root!._id, systemManaged: false, sortKey: "5000", isReservedRoot: false, version: 0,
    });

    await expect(
      withSession((session) =>
        moveNodeCore({ nodeId: n._id, destinationParentId: t2Root!._id, expectedVersion: 99, session })
      )
    ).rejects.toBeInstanceOf(StaleVersionError);
  });

  it("returns affected documentIds for moved file and descendants", async () => {
    const t1 = new mongoose.Types.ObjectId();
    const t2 = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId: t1 });
    await createEntityRoot({ namespace: "/tenders", entityId: t2 });
    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const t1Root = await FileNode.findOne({ parentId: tendersNs!._id, name: t1.toString() });
    const t2Root = await FileNode.findOne({ parentId: tendersNs!._id, name: t2.toString() });

    const docId = new mongoose.Types.ObjectId();
    const fileObj = await FileModel.create({ mimetype: "application/pdf", originalFilename: "a.pdf" });
    await DocumentModel.create({ _id: docId, currentFileId: fileObj._id, enrichmentLocked: false });

    const folder = await FileNode.create({
      type: "folder", name: "Sub", normalizedName: normalizeNodeName("Sub"),
      parentId: t1Root!._id, systemManaged: false, sortKey: "5000", isReservedRoot: false, version: 0,
    });
    await FileNode.create({
      type: "file", name: "a.pdf", normalizedName: normalizeNodeName("a.pdf"),
      parentId: folder._id, documentId: docId, systemManaged: false, sortKey: "0000", isReservedRoot: false, version: 0,
    });

    const { affectedDocumentIds } = await withSession((session) =>
      moveNodeCore({ nodeId: folder._id, destinationParentId: t2Root!._id, expectedVersion: 0, session })
    );
    expect(affectedDocumentIds.map((x) => x.toString())).toContain(docId.toString());
  });
});

describe("reevaluateEnrichmentAfterMove", () => {
  it("publishes for documents whose placement is now under an enrichable namespace", async () => {
    // Create a Document in /tenders/<id>/ (enrichable).
    const t = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId: t });
    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const tRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: t.toString() });

    const fileObj = await FileModel.create({ mimetype: "application/pdf", originalFilename: "r.pdf" });
    const docId = new mongoose.Types.ObjectId();
    await DocumentModel.create({ _id: docId, currentFileId: fileObj._id, enrichmentLocked: false });
    await FileNode.create({
      type: "file", name: "r.pdf", normalizedName: normalizeNodeName("r.pdf"),
      parentId: tRoot!._id, documentId: docId, systemManaged: false, sortKey: "0000", isReservedRoot: false, version: 0,
    });

    const published: string[] = [];
    await reevaluateEnrichmentAfterMove([docId], async (d) => {
      published.push(d);
    });
    expect(published).toContain(docId.toString());
  });

  it("skips documents that already have a ready Enrichment", async () => {
    const t = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId: t });
    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const tRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: t.toString() });

    const fileObj = await FileModel.create({ mimetype: "application/pdf", originalFilename: "s.pdf" });
    const docId = new mongoose.Types.ObjectId();
    await DocumentModel.create({ _id: docId, currentFileId: fileObj._id, enrichmentLocked: false });
    await FileNode.create({
      type: "file", name: "s.pdf", normalizedName: normalizeNodeName("s.pdf"),
      parentId: tRoot!._id, documentId: docId, systemManaged: false, sortKey: "0000", isReservedRoot: false, version: 0,
    });
    await Enrichment.create({ documentId: docId, fileId: fileObj._id, status: "ready", attempts: 1, processingVersion: 1 });

    const published: string[] = [];
    await reevaluateEnrichmentAfterMove([docId], async (d) => {
      published.push(d);
    });
    expect(published).not.toContain(docId.toString());
  });
});
