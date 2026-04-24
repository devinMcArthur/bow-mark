import mongoose from "mongoose";
import {
  Jobsite,
  File,
  FileNode,
  Document as DocumentModel,
} from "@models";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import { roleWeight } from "@graphql/resolvers/fileNode";
import type { MigrationOptions, MigrationReport } from "./01-enrichedFiles";

/**
 * For each Jobsite.fileObjects[{_id, file, minRole}] entry, create a Document
 * (keyed by the fileObject's sub-doc _id for stable idempotency) and a
 * FileNode placement under the jobsite's reserved root. No Enrichment is
 * created — these files were never enriched.
 *
 * Idempotent via upsert-by-_id on Document and upsert on
 * { parentId, documentId } for the FileNode.
 */
export async function migrateJobsiteFileObjects(
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

  const jobsitesNs = await FileNode.findOne({
    name: "jobsites",
    isReservedRoot: true,
  });
  if (!jobsitesNs) throw new Error("jobsites namespace not bootstrapped");

  const cursor = Jobsite.find().cursor();
  for await (const jobsite of cursor) {
    report.scanned += 1;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries = (((jobsite as any).fileObjects ?? []) as Array<{
        _id: mongoose.Types.ObjectId;
        file: mongoose.Types.ObjectId;
        minRole: string;
      }>);
      // No files → no root. Lazy-provisioning handles post-migration
      // uploads via `ensureEntityRoot` from the client.
      if (entries.length === 0) continue;

      if (!opts.dryRun) {
        await createEntityRoot({
          namespace: "/jobsites",
          entityId: jobsite._id,
        });

        const entityRoot = await FileNode.findOne({
          parentId: jobsitesNs._id,
          name: jobsite._id.toString(),
        });
        if (!entityRoot) continue;

        for (const entry of entries) {
          if (!entry._id || !entry.file) {
            report.skipped += 1;
            continue;
          }

          const file = await File.findById(entry.file).lean();
          if (!file) {
            report.skipped += 1;
            continue;
          }

          // Upsert Document keyed by fileObject sub-doc _id.
          await DocumentModel.updateOne(
            { _id: entry._id },
            {
              $setOnInsert: {
                _id: entry._id,
                currentFileId: file._id,
                enrichmentLocked: false,
                createdAt: new Date(),
                ...(opts.runId ? { migrationRunId: opts.runId } : {}),
              },
              $set: { updatedAt: new Date() },
            },
            { upsert: true }
          );
          report.documentsUpserted += 1;

          const name = file.originalFilename || file.description || "file";
          // Legacy Jobsite.fileObjects[].minRole was typed `string` (e.g.
          // "ProjectManager"). FileNode.minRole is numeric — route through
          // roleWeight so the placement writes an integer either way,
          // instead of CastError-skipping the row.
          const minRole =
            entry.minRole == null ? undefined : roleWeight(entry.minRole);
          await FileNode.updateOne(
            { parentId: entityRoot._id, documentId: entry._id },
            {
              $setOnInsert: {
                type: "file",
                name,
                normalizedName: normalizeNodeName(name),
                parentId: entityRoot._id,
                documentId: entry._id,
                systemManaged: false,
                sortKey: "0000",
                isReservedRoot: false,
                version: 0,
                minRole,
                createdAt: new Date(),
                ...(opts.runId ? { migrationRunId: opts.runId } : {}),
              },
              $set: { updatedAt: new Date() },
            },
            { upsert: true }
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      report.errors.push({
        enrichedFileId: jobsite._id.toString(),
        message: msg,
      });
    }
  }

  return report;
}
