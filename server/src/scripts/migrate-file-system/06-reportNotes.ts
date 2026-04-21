import mongoose from "mongoose";
import {
  ReportNote,
  File,
  FileNode,
  Document as DocumentModel,
} from "@models";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import type { MigrationOptions, MigrationReport } from "./01-enrichedFiles";

async function placeFile(
  parentId: mongoose.Types.ObjectId,
  documentId: mongoose.Types.ObjectId,
  baseName: string
): Promise<"placed" | "skipped-collision"> {
  // Idempotent on {parentId, documentId}: if placement already exists, return early.
  const existing = await FileNode.findOne({ parentId, documentId });
  if (existing) return "placed";

  const attempts = [baseName, `${baseName} (${documentId.toString().slice(-6)})`];
  for (const name of attempts) {
    try {
      await FileNode.create({
        type: "file",
        name,
        normalizedName: normalizeNodeName(name),
        parentId,
        documentId,
        aiManaged: false,
        sortKey: "0000",
        isReservedRoot: false,
        version: 0,
      });
      return "placed";
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as any;
      if (e?.code !== 11000) throw err;
      // else: duplicate key, try next suffixed name
    }
  }
  return "skipped-collision";
}

/**
 * Legacy ReportNote.files[] (direct File refs) becomes Documents + FileNode
 * placements under /daily-reports/<dailyReportId>/. No Enrichment is created.
 * Documents are keyed by File._id for stable idempotency.
 */
export async function migrateReportNotes(
  opts: MigrationOptions
): Promise<MigrationReport> {
  const report: MigrationReport = {
    scanned: 0,
    documentsUpserted: 0,
    enrichmentsUpserted: 0,
    filesBackfilled: 0,
    skipped: 0,
    errors: [],
  };

  const dailyReportsNs = await FileNode.findOne({
    name: "daily-reports",
    isReservedRoot: true,
  });
  if (!dailyReportsNs)
    throw new Error("daily-reports namespace not bootstrapped");

  const cursor = ReportNote.find().cursor();
  for await (const note of cursor) {
    report.scanned += 1;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const noteAny = note as any;
      const dailyReportId = noteAny.dailyReport as mongoose.Types.ObjectId | undefined;
      if (!dailyReportId) {
        report.errors.push({
          enrichedFileId: note._id.toString(),
          message: "ReportNote has no dailyReport ref — skipping",
        });
        continue;
      }

      const fileIds = ((noteAny.files ?? []) as mongoose.Types.ObjectId[]).filter(Boolean);
      if (fileIds.length === 0) continue;

      if (!opts.dryRun) {
        await createEntityRoot({
          namespace: "/daily-reports",
          entityId: dailyReportId,
        });

        const entityRoot = await FileNode.findOne({
          parentId: dailyReportsNs._id,
          name: dailyReportId.toString(),
        });
        if (!entityRoot) continue;

        for (const fileId of fileIds) {
          const file = await File.findById(fileId).lean();
          if (!file) {
            report.skipped += 1;
            continue;
          }

          // Upsert Document keyed by file._id.
          await DocumentModel.updateOne(
            { _id: file._id },
            {
              $setOnInsert: {
                _id: file._id,
                currentFileId: file._id,
                enrichmentLocked: false,
                createdAt: new Date(),
              },
              $set: { updatedAt: new Date() },
            },
            { upsert: true }
          );
          report.documentsUpserted += 1;

          const baseName = file.originalFilename || file.description || "file";
          const outcome = await placeFile(entityRoot._id, file._id, baseName);
          if (outcome !== "placed") {
            report.errors.push({
              enrichedFileId: file._id.toString(),
              message: `name collision under daily-report ${dailyReportId.toString()}`,
            });
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      report.errors.push({
        enrichedFileId: note._id.toString(),
        message: msg,
      });
    }
  }

  return report;
}
