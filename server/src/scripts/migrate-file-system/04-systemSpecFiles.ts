import mongoose from "mongoose";
import {
  System,
  File,
  FileNode,
  Document as DocumentModel,
} from "@models";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import type { MigrationOptions, MigrationReport } from "./01-enrichedFiles";

/**
 * Legacy System.specFiles[] (flat array of EnrichedFile refs) becomes
 * placements under /system/specs/. Because System is global, there is no
 * per-entity root — placements live directly under the reserved
 * /system/specs/ namespace root.
 *
 * Requires 01-enrichedFiles to have run first, so Documents exist with
 * _id === EnrichedFile._id.
 *
 * Idempotent via upsert on { parentId, documentId }.
 */
export async function migrateSystemSpecFiles(
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

  const systemNs = await FileNode.findOne({
    name: "system",
    isReservedRoot: true,
  });
  if (!systemNs) throw new Error("system namespace not bootstrapped");
  const specsRoot = await FileNode.findOne({
    parentId: systemNs._id,
    name: "specs",
    isReservedRoot: true,
  });
  if (!specsRoot) throw new Error("/system/specs namespace not bootstrapped");

  const system = await System.findOne().lean();
  if (!system) return report;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const specFileIds = ((system as any).specFiles ?? []) as mongoose.Types.ObjectId[];
  for (const enrichedFileId of specFileIds) {
    report.scanned += 1;
    try {
      if (!opts.dryRun) {
        const doc = await DocumentModel.findById(enrichedFileId).lean();
        if (!doc) {
          report.skipped += 1;
          continue;
        }
        const file = await File.findById(doc.currentFileId).lean();
        if (!file) {
          report.skipped += 1;
          continue;
        }
        const name = file.originalFilename || file.description || "spec";

        await FileNode.updateOne(
          { parentId: specsRoot._id, documentId: enrichedFileId },
          {
            $setOnInsert: {
              type: "file",
              name,
              normalizedName: normalizeNodeName(name),
              parentId: specsRoot._id,
              documentId: enrichedFileId,
              systemManaged: false,
              sortKey: "0000",
              isReservedRoot: false,
              version: 0,
              createdAt: new Date(),
            },
            $set: { updatedAt: new Date() },
          },
          { upsert: true }
        );
        report.documentsUpserted += 1;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      report.errors.push({
        enrichedFileId: enrichedFileId.toString(),
        message: msg,
      });
    }
  }

  return report;
}
