import { Types } from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { FileNode } from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { StaleVersionError } from "@lib/entityVersion";
import FileNodeMutationResolver from "@graphql/resolvers/fileNode/mutations";

let resolver: FileNodeMutationResolver;

beforeAll(async () => {
  await prepareDatabase();
  await FileNode.ensureIndexes();
  await bootstrapRoots();
  resolver = new FileNodeMutationResolver();
});

afterAll(async () => {
  await FileNode.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

// Helper: create a tender entity root and return the entity-root node.
async function makeTenderRoot(): Promise<{
  tenderRoot: InstanceType<typeof FileNode> & { _id: Types.ObjectId };
}> {
  const entityId = new Types.ObjectId();
  await createEntityRoot({ namespace: "/tenders", entityId });
  const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
  const tenderRoot = await FileNode.findOne({
    parentId: tendersNs!._id,
    name: entityId.toString(),
  });
  return { tenderRoot: tenderRoot as any };
}

describe("createFolder", () => {
  it("creates a subfolder under a tender root", async () => {
    const { tenderRoot } = await makeTenderRoot();

    const folder = await resolver.createFolder(tenderRoot._id.toString(), "My Folder");
    expect(folder.name).toBe("My Folder");
    expect(folder.normalizedName).toBe(normalizeNodeName("My Folder"));
    expect((folder.parentId as any).toString()).toBe(tenderRoot._id.toString());
    expect(folder.type).toBe("folder");
    expect(folder.isReservedRoot).toBe(false);
    expect(folder.version).toBe(0);
  });

  it("rejects creating at the filesystem root", async () => {
    const fsRoot = await FileNode.findOne({ parentId: null, name: "/" });
    await expect(
      resolver.createFolder(fsRoot!._id.toString(), "Sneaky Folder")
    ).rejects.toThrow("Cannot create folders at the filesystem root");
  });

  it("rejects a duplicate name under the same parent", async () => {
    const { tenderRoot } = await makeTenderRoot();

    await resolver.createFolder(tenderRoot._id.toString(), "Duplicate");
    // Second call with same (case-insensitively equal) name should fail.
    await expect(
      resolver.createFolder(tenderRoot._id.toString(), "Duplicate")
    ).rejects.toThrow("A node with this name already exists in this folder");
  });

  it("rejects an empty name", async () => {
    const { tenderRoot } = await makeTenderRoot();
    await expect(
      resolver.createFolder(tenderRoot._id.toString(), "   ")
    ).rejects.toThrow("Name cannot be empty");
  });

  it("rejects a trashed parent", async () => {
    const { tenderRoot } = await makeTenderRoot();
    // Manually trash the parent without going through trashNode OCC.
    await FileNode.findByIdAndUpdate(tenderRoot._id, {
      $set: { deletedAt: new Date() },
    });
    await expect(
      resolver.createFolder(tenderRoot._id.toString(), "Child Of Trashed")
    ).rejects.toThrow("Parent folder is trashed");
    // Restore it for cleanliness.
    await FileNode.findByIdAndUpdate(tenderRoot._id, { $unset: { deletedAt: "" } });
  });
});

describe("renameNode", () => {
  it("renames a node with the correct expectedVersion", async () => {
    const { tenderRoot } = await makeTenderRoot();
    const folder = await resolver.createFolder(tenderRoot._id.toString(), "Old Name");
    expect(folder.version).toBe(0);

    const renamed = await resolver.renameNode(
      folder._id.toString(),
      0,
      "New Name"
    );
    expect(renamed.name).toBe("New Name");
    expect(renamed.normalizedName).toBe(normalizeNodeName("New Name"));
    expect(renamed.version).toBe(1);
  });

  it("rejects renaming a reserved-root node", async () => {
    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    await expect(
      resolver.renameNode(tendersNs!._id.toString(), 0, "not-tenders")
    ).rejects.toThrow("Cannot rename a reserved-root node");
  });

  it("throws StaleVersionError on version mismatch", async () => {
    const { tenderRoot } = await makeTenderRoot();
    const folder = await resolver.createFolder(tenderRoot._id.toString(), "Folder-A");

    await expect(
      resolver.renameNode(folder._id.toString(), 99, "B")
    ).rejects.toBeInstanceOf(StaleVersionError);
  });

  it("rejects renaming a trashed node", async () => {
    const { tenderRoot } = await makeTenderRoot();
    const folder = await resolver.createFolder(tenderRoot._id.toString(), "ToTrashThenRename");
    await resolver.trashNode(folder._id.toString(), 0);

    await expect(
      resolver.renameNode(folder._id.toString(), 1, "TrashedRename")
    ).rejects.toThrow("Cannot rename a trashed node");
  });

  it("rejects a duplicate name when renaming", async () => {
    const { tenderRoot } = await makeTenderRoot();
    await resolver.createFolder(tenderRoot._id.toString(), "Alpha");
    const beta = await resolver.createFolder(tenderRoot._id.toString(), "Beta");

    await expect(
      resolver.renameNode(beta._id.toString(), 0, "Alpha")
    ).rejects.toThrow("A node with this name already exists in this folder");
  });
});

describe("trashNode", () => {
  it("soft-deletes a folder and all its descendants", async () => {
    const { tenderRoot } = await makeTenderRoot();
    const parent = await resolver.createFolder(tenderRoot._id.toString(), "Parent");
    const child1 = await resolver.createFolder(parent._id.toString(), "Child1");
    const child2 = await resolver.createFolder(parent._id.toString(), "Child2");
    const grandchild = await resolver.createFolder(child1._id.toString(), "Grandchild");

    const trashed = await resolver.trashNode(parent._id.toString(), 0);
    expect(trashed.deletedAt).not.toBeNull();

    // Verify descendants are also soft-deleted.
    for (const id of [child1._id, child2._id, grandchild._id]) {
      const node = await FileNode.findById(id).lean();
      expect(node!.deletedAt).not.toBeNull();
    }
  });

  it("rejects trashing a reserved-root node", async () => {
    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    await expect(
      resolver.trashNode(tendersNs!._id.toString(), 0)
    ).rejects.toThrow("Cannot trash a reserved-root node");
  });

  it("rejects trashing an already-trashed node", async () => {
    const { tenderRoot } = await makeTenderRoot();
    const folder = await resolver.createFolder(tenderRoot._id.toString(), "OnceIsEnough");
    await resolver.trashNode(folder._id.toString(), 0);

    // version is now 1 after first trash
    await expect(
      resolver.trashNode(folder._id.toString(), 1)
    ).rejects.toThrow("Node is already trashed");
  });

  it("throws StaleVersionError on version mismatch", async () => {
    const { tenderRoot } = await makeTenderRoot();
    const folder = await resolver.createFolder(tenderRoot._id.toString(), "StaleTrash");

    await expect(
      resolver.trashNode(folder._id.toString(), 99)
    ).rejects.toBeInstanceOf(StaleVersionError);
  });
});

describe("restoreNode", () => {
  it("clears deletedAt on a trashed node", async () => {
    const { tenderRoot } = await makeTenderRoot();
    const folder = await resolver.createFolder(tenderRoot._id.toString(), "ToRestore");
    const trashed = await resolver.trashNode(folder._id.toString(), 0);
    expect(trashed.deletedAt).not.toBeNull();
    // version is 1 after trash
    const restored = await resolver.restoreNode(folder._id.toString(), 1);
    expect(restored.deletedAt).toBeUndefined();
    expect(restored.version).toBe(2);
  });

  it("rejects restoring a node whose parent is still trashed", async () => {
    const { tenderRoot } = await makeTenderRoot();
    const parent = await resolver.createFolder(tenderRoot._id.toString(), "TrashedParent");
    const child = await resolver.createFolder(parent._id.toString(), "ChildOfTrash");

    // Trash the parent (this also cascades to child).
    await resolver.trashNode(parent._id.toString(), 0);

    // The child is now trashed with version=1 (bumped by updateMany in trashNode cascade).
    const childAfterTrash = await FileNode.findById(child._id).lean();
    expect(childAfterTrash!.deletedAt).not.toBeNull();

    // Attempting to restore the child while parent is still trashed should fail.
    await expect(
      resolver.restoreNode(child._id.toString(), childAfterTrash!.version)
    ).rejects.toThrow("ancestor is still trashed");
  });

  it("rejects restoring a node that is not trashed", async () => {
    const { tenderRoot } = await makeTenderRoot();
    const folder = await resolver.createFolder(tenderRoot._id.toString(), "NotTrashed");

    await expect(
      resolver.restoreNode(folder._id.toString(), 0)
    ).rejects.toThrow("Node is not trashed");
  });

  it("throws StaleVersionError on version mismatch", async () => {
    const { tenderRoot } = await makeTenderRoot();
    const folder = await resolver.createFolder(tenderRoot._id.toString(), "StaleRestore");
    await resolver.trashNode(folder._id.toString(), 0);

    await expect(
      resolver.restoreNode(folder._id.toString(), 0) // wrong version — should be 1 after trash
    ).rejects.toBeInstanceOf(StaleVersionError);
  });
});
