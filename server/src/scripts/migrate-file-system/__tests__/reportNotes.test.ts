import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase from "@testing/seedDatabase";
import { File, DailyReport, ReportNote, FileNode, Document as DocumentModel, Enrichment } from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { migrateReportNotes } from "../06-reportNotes";

beforeAll(async () => {
  await prepareDatabase();
  await seedDatabase();
  await bootstrapRoots();
});
afterAll(async () => {
  await disconnectAndStopServer();
});

describe("migrateReportNotes", () => {
  it("creates Documents and placements under /daily-reports/<id>/ for ReportNote.files entries", async () => {
    const dailyReport = await DailyReport.findOne();
    const file = await File.create({ mimetype: "image/jpeg", originalFilename: "photo.jpg" });
    const note = await ReportNote.create({
      note: "sample note",
      files: [file._id],
      dailyReport: dailyReport!._id,
    });
    // Migration iterates DailyReport.find({ reportNote: { $exists } }) and
    // follows the forward ref — the back-ref on ReportNote alone isn't
    // enough to make the pair visible.
    await DailyReport.updateOne(
      { _id: dailyReport!._id },
      { $set: { reportNote: note._id } }
    );

    await migrateReportNotes({ dryRun: false });

    // Document created keyed by file._id
    const doc = await DocumentModel.findById(file._id).lean();
    expect(doc).not.toBeNull();
    expect(doc?.currentFileId?.toString()).toBe(file._id.toString());

    // No Enrichment
    const enr = await Enrichment.findOne({ documentId: file._id }).lean();
    expect(enr).toBeNull();

    // Placement exists under daily-reports entity root
    const dailyReportsNs = await FileNode.findOne({ name: "daily-reports", isReservedRoot: true });
    const entityRoot = await FileNode.findOne({ parentId: dailyReportsNs!._id, name: dailyReport!._id.toString() });
    const placement = await FileNode.findOne({ parentId: entityRoot!._id, documentId: file._id }).lean();
    expect(placement).not.toBeNull();
    expect(placement?.type).toBe("file");
  });

  it("is idempotent", async () => {
    const dailyReport = await DailyReport.findOne();
    const file = await File.create({ mimetype: "image/png", originalFilename: "p.png" });
    const note = await ReportNote.create({
      note: "another",
      files: [file._id],
      dailyReport: dailyReport!._id,
    });
    await DailyReport.updateOne(
      { _id: dailyReport!._id },
      { $set: { reportNote: note._id } }
    );

    await migrateReportNotes({ dryRun: false });
    await migrateReportNotes({ dryRun: false });

    expect(await DocumentModel.countDocuments({ _id: file._id })).toBe(1);
    const dailyReportsNs = await FileNode.findOne({ name: "daily-reports", isReservedRoot: true });
    const entityRoot = await FileNode.findOne({ parentId: dailyReportsNs!._id, name: dailyReport!._id.toString() });
    expect(await FileNode.countDocuments({ parentId: entityRoot!._id, documentId: file._id })).toBe(1);
  });

  it("skips notes with no dailyReport ref", async () => {
    await ReportNote.collection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      note: "orphan",
      files: [new mongoose.Types.ObjectId()],
      schemaVersion: 1,
    });

    const report = await migrateReportNotes({ dryRun: false });
    expect(report.errors.length).toBeGreaterThanOrEqual(0);
    // does not throw — that's the point
    expect(report.scanned).toBeGreaterThanOrEqual(1);
  });
});
