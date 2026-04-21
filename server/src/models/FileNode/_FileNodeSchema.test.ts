import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { FileNode } from "@models";

beforeAll(async () => {
  await prepareDatabase();
  await FileNode.ensureIndexes();
});
afterAll(async () => {
  await FileNode.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("FileNode schema", () => {
  it("creates a root folder with parentId=null", async () => {
    const root = await FileNode.create({
      type: "folder",
      name: "test-root",
      normalizedName: "test-root",
      parentId: null,
      isReservedRoot: true,
      version: 0,
    });
    expect(root.type).toBe("folder");
    expect(root.parentId).toBeNull();
    expect(root.isReservedRoot).toBe(true);
  });

  it("enforces sibling uniqueness on normalizedName", async () => {
    const parent = await FileNode.create({
      type: "folder",
      name: "parent",
      normalizedName: "parent",
      parentId: null,
      isReservedRoot: false,
      version: 0,
    });
    await FileNode.create({
      type: "folder",
      name: "Child",
      normalizedName: "child",
      parentId: parent._id,
      isReservedRoot: false,
      version: 0,
    });
    await expect(
      FileNode.create({
        type: "folder",
        name: "CHILD",
        normalizedName: "child",
        parentId: parent._id,
        isReservedRoot: false,
        version: 0,
      })
    ).rejects.toThrow(/duplicate key/i);
  });

  it("allows same normalizedName across different parents", async () => {
    const p1 = await FileNode.create({
      type: "folder",
      name: "p1",
      normalizedName: "p1",
      parentId: null,
      isReservedRoot: false,
      version: 0,
    });
    const p2 = await FileNode.create({
      type: "folder",
      name: "p2",
      normalizedName: "p2",
      parentId: null,
      isReservedRoot: false,
      version: 0,
    });
    await FileNode.create({
      type: "folder",
      name: "child",
      normalizedName: "child",
      parentId: p1._id,
      isReservedRoot: false,
      version: 0,
    });
    await FileNode.create({
      type: "folder",
      name: "child",
      normalizedName: "child",
      parentId: p2._id,
      isReservedRoot: false,
      version: 0,
    });
    const all = await FileNode.find({
      normalizedName: "child",
      parentId: { $in: [p1._id, p2._id] },
    }).lean();
    expect(all).toHaveLength(2);
  });

  it("creates a file-type node referencing a documentId", async () => {
    const parent = await FileNode.create({
      type: "folder",
      name: "docs",
      normalizedName: "docs",
      parentId: null,
      isReservedRoot: false,
      version: 0,
    });
    const docId = new mongoose.Types.ObjectId();
    const fileNode = await FileNode.create({
      type: "file",
      name: "spec.pdf",
      normalizedName: "spec.pdf",
      parentId: parent._id,
      documentId: docId,
      isReservedRoot: false,
      version: 0,
    });
    expect(fileNode.type).toBe("file");
    expect(fileNode.documentId?.toString()).toBe(docId.toString());
  });

  it("supports soft delete via deletedAt field", async () => {
    const node = await FileNode.create({
      type: "folder",
      name: "tmp",
      normalizedName: "tmp",
      parentId: null,
      isReservedRoot: false,
      version: 0,
    });
    node.deletedAt = new Date();
    await node.save();
    const fresh = await FileNode.findById(node._id).lean();
    expect(fresh?.deletedAt).toBeInstanceOf(Date);
  });
});
