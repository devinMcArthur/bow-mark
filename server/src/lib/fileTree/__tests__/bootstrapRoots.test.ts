import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { FileNode } from "@models";
import { bootstrapRoots } from "../bootstrapRoots";

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await FileNode.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("bootstrapRoots", () => {
  beforeEach(async () => {
    await FileNode.deleteMany({});
  });

  it("creates the root + all reserved namespaces on first run", async () => {
    await bootstrapRoots();
    const root = await FileNode.findOne({ parentId: null, name: "/" }).lean();
    expect(root).not.toBeNull();
    expect(root?.isReservedRoot).toBe(true);

    const nsNames = ["system", "tenders", "jobsites", "daily-reports"];
    for (const name of nsNames) {
      const ns = await FileNode.findOne({
        parentId: root!._id,
        name,
      }).lean();
      expect(ns).not.toBeNull();
      expect(ns?.isReservedRoot).toBe(true);
    }

    const specs = await FileNode.findOne({
      name: "specs",
      isReservedRoot: true,
    }).lean();
    expect(specs).not.toBeNull();
  });

  it("is idempotent (re-running doesn't duplicate)", async () => {
    await bootstrapRoots();
    await bootstrapRoots();
    await bootstrapRoots();
    const rootCount = await FileNode.countDocuments({
      parentId: null,
      name: "/",
    });
    expect(rootCount).toBe(1);

    const tendersCount = await FileNode.countDocuments({
      name: "tenders",
      isReservedRoot: true,
    });
    expect(tendersCount).toBe(1);
  });
});
