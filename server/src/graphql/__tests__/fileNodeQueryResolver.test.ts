import { Types } from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { FileNode } from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import FileNodeResolver from "@graphql/resolvers/fileNode";

let resolver: FileNodeResolver;

beforeAll(async () => {
  await prepareDatabase();
  await bootstrapRoots();
  resolver = new FileNodeResolver();
});
afterAll(async () => {
  await FileNode.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("FileNodeResolver.fileNode", () => {
  it("returns the node when it exists", async () => {
    const root = await FileNode.findOne({ parentId: null, name: "/" });
    const node = await resolver.fileNode(root!._id.toString());
    expect(node).not.toBeNull();
    expect(node!.name).toBe("/");
  });

  it("returns null for soft-deleted node", async () => {
    const trashed = await FileNode.create({
      type: "folder",
      name: "temp",
      normalizedName: normalizeNodeName("temp"),
      parentId: null,
      aiManaged: false,
      sortKey: "0000",
      isReservedRoot: false,
      version: 0,
      deletedAt: new Date(),
    });
    const node = await resolver.fileNode(trashed._id.toString());
    expect(node).toBeNull();
  });

  it("returns null for invalid ObjectId", async () => {
    const node = await resolver.fileNode("not-an-id");
    expect(node).toBeNull();
  });
});

describe("FileNodeResolver.fileNodeChildren", () => {
  it("lists root children (reserved namespaces)", async () => {
    const root = await FileNode.findOne({ parentId: null, name: "/" });
    const children = await resolver.fileNodeChildren(root!._id.toString());
    // Reserved namespaces: system, tenders, jobsites, daily-reports
    const names = children.map((c) => c.name).sort();
    expect(names).toEqual(["daily-reports", "jobsites", "system", "tenders"]);
  });

  it("excludes soft-deleted children", async () => {
    const root = await FileNode.findOne({ parentId: null, name: "/" });
    const live = await FileNode.create({
      type: "folder",
      name: "live-child",
      normalizedName: normalizeNodeName("live-child"),
      parentId: root!._id,
      aiManaged: false,
      sortKey: "5000",
      isReservedRoot: false,
      version: 0,
    });
    const dead = await FileNode.create({
      type: "folder",
      name: "dead-child",
      normalizedName: normalizeNodeName("dead-child"),
      parentId: root!._id,
      aiManaged: false,
      sortKey: "5001",
      isReservedRoot: false,
      version: 0,
      deletedAt: new Date(),
    });
    const children = await resolver.fileNodeChildren(root!._id.toString());
    const names = children.map((c) => c.name);
    expect(names).toContain("live-child");
    expect(names).not.toContain("dead-child");
    // cleanup
    await FileNode.deleteOne({ _id: live._id });
    await FileNode.deleteOne({ _id: dead._id });
  });

  it("lists children of a per-entity root", async () => {
    const entityId = new Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId });
    const tendersNs = await FileNode.findOne({
      name: "tenders",
      isReservedRoot: true,
    });
    const tenderRoot = await FileNode.findOne({
      parentId: tendersNs!._id,
      name: entityId.toString(),
    });
    // Add a child under the tender root
    await FileNode.create({
      type: "folder",
      name: "Drawings",
      normalizedName: normalizeNodeName("Drawings"),
      parentId: tenderRoot!._id,
      aiManaged: true,
      sortKey: "0000",
      isReservedRoot: false,
      version: 0,
    });
    const children = await resolver.fileNodeChildren(tenderRoot!._id.toString());
    expect(children.map((c) => c.name)).toContain("Drawings");
  });

  it("returns [] for invalid ObjectId", async () => {
    const children = await resolver.fileNodeChildren("not-an-id");
    expect(children).toEqual([]);
  });
});

describe("FileNodeResolver.fileNodeBreadcrumbs", () => {
  it("returns root → entity-root chain for a per-entity root", async () => {
    const entityId = new Types.ObjectId();
    await createEntityRoot({ namespace: "/jobsites", entityId });
    const jobsitesNs = await FileNode.findOne({
      name: "jobsites",
      isReservedRoot: true,
    });
    const entityRoot = await FileNode.findOne({
      parentId: jobsitesNs!._id,
      name: entityId.toString(),
    });

    const chain = await resolver.fileNodeBreadcrumbs(entityRoot!._id.toString());
    expect(chain.map((n) => n.name)).toEqual([
      "/",
      "jobsites",
      entityId.toString(),
    ]);
  });

  it("returns [] for invalid ObjectId", async () => {
    const chain = await resolver.fileNodeBreadcrumbs("not-an-id");
    expect(chain).toEqual([]);
  });
});
