import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase from "@testing/seedDatabase";
import { EnrichedFile, File, Jobsite, FileNode } from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import { migrateEnrichedFiles } from "../01-enrichedFiles";
import { migrateJobsiteEnrichedFiles } from "../02-jobsiteEnrichedFiles";
import { UserRoles } from "@typescript/user";

beforeAll(async () => {
  await prepareDatabase();
  await seedDatabase();
  await bootstrapRoots();
});
afterAll(async () => {
  await disconnectAndStopServer();
});

describe("migrateJobsiteEnrichedFiles", () => {
  it("creates a FileNode for each jobsite.enrichedFiles entry, under the jobsite's reserved root, preserving minRole", async () => {
    const jobsite = await Jobsite.findOne();
    const file = await File.create({ mimetype: "application/pdf", description: "j.pdf" });
    const ef = await EnrichedFile.create({ file: file._id, summaryStatus: "ready" });
    await Jobsite.updateOne(
      { _id: jobsite!._id },
      { $push: { enrichedFiles: { enrichedFile: ef._id, minRole: UserRoles.ProjectManager } } }
    );

    // Run prerequisite migration first.
    await migrateEnrichedFiles({ dryRun: false });
    await createEntityRoot({ namespace: "/jobsites", entityId: jobsite!._id });

    await migrateJobsiteEnrichedFiles({ dryRun: false });

    const jobsiteNs = await FileNode.findOne({ name: "jobsites", isReservedRoot: true });
    const jobsiteRoot = await FileNode.findOne({ parentId: jobsiteNs!._id, name: jobsite!._id.toString() });
    const placements = await FileNode.find({ parentId: jobsiteRoot!._id, type: "file" }).lean();
    expect(placements).toHaveLength(1);
    expect(placements[0].documentId?.toString()).toBe(ef._id.toString());
    expect(placements[0].minRole).toBe(UserRoles.ProjectManager);
  });
});
