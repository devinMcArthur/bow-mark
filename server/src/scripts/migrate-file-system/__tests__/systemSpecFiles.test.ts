import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase from "@testing/seedDatabase";
import { EnrichedFile, File, System, FileNode } from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { migrateEnrichedFiles } from "../01-enrichedFiles";
import { migrateSystemSpecFiles } from "../04-systemSpecFiles";

beforeAll(async () => {
  await prepareDatabase();
  await seedDatabase();
  await bootstrapRoots();
});
afterAll(async () => {
  await disconnectAndStopServer();
});

describe("migrateSystemSpecFiles", () => {
  it("creates a FileNode under /system/specs/ for each specFile, preserving documentId", async () => {
    const file = await File.create({ mimetype: "application/pdf", description: "spec.pdf", originalFilename: "spec.pdf" });
    const ef = await EnrichedFile.create({ file: file._id, summaryStatus: "ready" });
    await System.updateOne({}, { $addToSet: { specFiles: ef._id } });

    await migrateEnrichedFiles({ dryRun: false });
    await migrateSystemSpecFiles({ dryRun: false });

    const systemNs = await FileNode.findOne({ name: "system", isReservedRoot: true });
    const specsRoot = await FileNode.findOne({ parentId: systemNs!._id, name: "specs", isReservedRoot: true });
    const placements = await FileNode.find({ parentId: specsRoot!._id, type: "file" }).lean();
    expect(placements.length).toBeGreaterThanOrEqual(1);
    const mine = placements.find((p) => p.documentId?.toString() === ef._id.toString());
    expect(mine).toBeDefined();
  });

  it("is idempotent", async () => {
    const file = await File.create({ mimetype: "application/pdf", description: "x.pdf", originalFilename: "x.pdf" });
    const ef = await EnrichedFile.create({ file: file._id, summaryStatus: "ready" });
    await System.updateOne({}, { $addToSet: { specFiles: ef._id } });

    await migrateEnrichedFiles({ dryRun: false });
    await migrateSystemSpecFiles({ dryRun: false });
    await migrateSystemSpecFiles({ dryRun: false });

    const systemNs = await FileNode.findOne({ name: "system", isReservedRoot: true });
    const specsRoot = await FileNode.findOne({ parentId: systemNs!._id, name: "specs", isReservedRoot: true });
    expect(await FileNode.countDocuments({ parentId: specsRoot!._id, documentId: ef._id })).toBe(1);
  });
});
