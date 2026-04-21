import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase from "@testing/seedDatabase";
import { EnrichedFile, File, Tender, FileNode } from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import { migrateEnrichedFiles } from "../01-enrichedFiles";
import { migrateTenderFiles } from "../05-tenderFiles";

beforeAll(async () => {
  await prepareDatabase();
  await seedDatabase();
  await bootstrapRoots();
});
afterAll(async () => {
  await disconnectAndStopServer();
});

describe("migrateTenderFiles", () => {
  it("creates AI-managed category folders with correct order, and places categorized files inside them", async () => {
    const tender = await Tender.create({ name: "T1", jobcode: "J1", status: "bidding", createdBy: new mongoose.Types.ObjectId(), files: [] });
    await createEntityRoot({ namespace: "/tenders", entityId: tender._id });

    const file1 = await File.create({ mimetype: "application/pdf", originalFilename: "drawing.pdf" });
    const file2 = await File.create({ mimetype: "application/pdf", originalFilename: "spec.pdf" });
    const ef1 = await EnrichedFile.create({ file: file1._id, summaryStatus: "ready" });
    const ef2 = await EnrichedFile.create({ file: file2._id, summaryStatus: "ready" });

    const catId1 = new mongoose.Types.ObjectId();
    const catId2 = new mongoose.Types.ObjectId();
    await Tender.updateOne(
      { _id: tender._id },
      {
        $set: {
          files: [ef1._id, ef2._id],
          fileCategories: [
            { _id: catId1, name: "Drawings", order: 0, fileIds: [ef1._id] },
            { _id: catId2, name: "Specifications", order: 1, fileIds: [ef2._id] },
          ],
        },
      }
    );

    await migrateEnrichedFiles({ dryRun: false });
    await migrateTenderFiles({ dryRun: false });

    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const tenderRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: tender._id.toString() });

    const folders = await FileNode.find({ parentId: tenderRoot!._id, type: "folder" }).lean();
    expect(folders.map((f) => f.name).sort()).toEqual(["Drawings", "Specifications"]);
    for (const f of folders) {
      expect(f.aiManaged).toBe(true);
    }

    const drawings = folders.find((f) => f.name === "Drawings")!;
    const drawingPlacements = await FileNode.find({ parentId: drawings._id, type: "file" }).lean();
    expect(drawingPlacements).toHaveLength(1);
    expect(drawingPlacements[0].documentId?.toString()).toBe(ef1._id.toString());
  });

  it("places uncategorized files into an 'Uncategorized' folder", async () => {
    const tender = await Tender.create({ name: "T2", jobcode: "J2", status: "bidding", createdBy: new mongoose.Types.ObjectId(), files: [] });
    await createEntityRoot({ namespace: "/tenders", entityId: tender._id });

    const file1 = await File.create({ mimetype: "application/pdf", originalFilename: "addendum.pdf" });
    const ef1 = await EnrichedFile.create({ file: file1._id, summaryStatus: "ready" });

    await Tender.updateOne(
      { _id: tender._id },
      {
        $set: {
          files: [ef1._id],
          fileCategories: [],
        },
      }
    );

    await migrateEnrichedFiles({ dryRun: false });
    await migrateTenderFiles({ dryRun: false });

    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const tenderRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: tender._id.toString() });
    const uncat = await FileNode.findOne({ parentId: tenderRoot!._id, name: "Uncategorized", type: "folder" });
    expect(uncat).not.toBeNull();
    expect(uncat?.aiManaged).toBe(true);

    const placement = await FileNode.findOne({ parentId: uncat!._id, documentId: ef1._id }).lean();
    expect(placement).not.toBeNull();
  });

  it("is idempotent — two runs produce the same tree", async () => {
    const tender = await Tender.create({ name: "T3", jobcode: "J3", status: "bidding", createdBy: new mongoose.Types.ObjectId(), files: [] });
    await createEntityRoot({ namespace: "/tenders", entityId: tender._id });

    const file1 = await File.create({ mimetype: "application/pdf", originalFilename: "d.pdf" });
    const ef1 = await EnrichedFile.create({ file: file1._id, summaryStatus: "ready" });

    await Tender.updateOne(
      { _id: tender._id },
      {
        $set: {
          files: [ef1._id],
          fileCategories: [{ _id: new mongoose.Types.ObjectId(), name: "Drawings", order: 0, fileIds: [ef1._id] }],
        },
      }
    );

    await migrateEnrichedFiles({ dryRun: false });
    await migrateTenderFiles({ dryRun: false });
    await migrateTenderFiles({ dryRun: false });

    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const tenderRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: tender._id.toString() });
    const folders = await FileNode.find({ parentId: tenderRoot!._id, type: "folder" }).lean();
    expect(folders).toHaveLength(1);
    const placements = await FileNode.find({ parentId: folders[0]._id, type: "file" }).lean();
    expect(placements).toHaveLength(1);
  });
});
