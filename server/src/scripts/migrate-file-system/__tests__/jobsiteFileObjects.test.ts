import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase from "@testing/seedDatabase";
import { File, Jobsite, FileNode, Document as DocumentModel, Enrichment } from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { migrateJobsiteFileObjects } from "../03-jobsiteFileObjects";
import { UserRoles } from "@typescript/user";

beforeAll(async () => {
  await prepareDatabase();
  await seedDatabase();
  await bootstrapRoots();
});
afterAll(async () => {
  await disconnectAndStopServer();
});

describe("migrateJobsiteFileObjects", () => {
  it("creates a Document and a FileNode placement for each fileObject, no Enrichment, minRole preserved", async () => {
    const jobsite = await Jobsite.findOne();
    const file = await File.create({ mimetype: "image/jpeg", description: "site.jpg", originalFilename: "site.jpg" });
    const fileObjectId = new mongoose.Types.ObjectId();
    await Jobsite.updateOne(
      { _id: jobsite!._id },
      { $push: { fileObjects: { _id: fileObjectId, file: file._id, minRole: UserRoles.User } } }
    );

    await migrateJobsiteFileObjects({ dryRun: false });

    // Document exists keyed by fileObject._id.
    const doc = await DocumentModel.findById(fileObjectId).lean();
    expect(doc).not.toBeNull();
    expect(doc?.currentFileId?.toString()).toBe(file._id.toString());

    // No Enrichment for this document.
    const enr = await Enrichment.findOne({ documentId: fileObjectId }).lean();
    expect(enr).toBeNull();

    // Placement exists under jobsite root.
    const jobsiteNs = await FileNode.findOne({ name: "jobsites", isReservedRoot: true });
    const jobsiteRoot = await FileNode.findOne({ parentId: jobsiteNs!._id, name: jobsite!._id.toString() });
    const placement = await FileNode.findOne({ parentId: jobsiteRoot!._id, documentId: fileObjectId }).lean();
    expect(placement).not.toBeNull();
    expect(placement?.minRole).toBe(UserRoles.User);
    expect(placement?.type).toBe("file");
  });

  it("is idempotent — running twice produces one Document and one placement", async () => {
    const jobsite = await Jobsite.findOne();
    const file = await File.create({ mimetype: "image/png", description: "p.png", originalFilename: "p.png" });
    const fileObjectId = new mongoose.Types.ObjectId();
    await Jobsite.updateOne(
      { _id: jobsite!._id },
      { $push: { fileObjects: { _id: fileObjectId, file: file._id, minRole: UserRoles.User } } }
    );

    await migrateJobsiteFileObjects({ dryRun: false });
    await migrateJobsiteFileObjects({ dryRun: false });

    expect(await DocumentModel.countDocuments({ _id: fileObjectId })).toBe(1);
    const jobsiteNs = await FileNode.findOne({ name: "jobsites", isReservedRoot: true });
    const jobsiteRoot = await FileNode.findOne({ parentId: jobsiteNs!._id, name: jobsite!._id.toString() });
    expect(await FileNode.countDocuments({ parentId: jobsiteRoot!._id, documentId: fileObjectId })).toBe(1);
  });
});
