import mongoose from "mongoose";
import {
  Jobsite,
  File,
  FileNode,
  Document as DocumentModel,
} from "@models";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import type { MigrationOptions, MigrationReport } from "./01-enrichedFiles";

/**
 * For each Jobsite.enrichedFiles[{enrichedFile, minRole}] entry, create a
 * FileNode placement under the jobsite's reserved root with the legacy
 * minRole preserved. Relies on 01-enrichedFiles having created a Document
 * keyed by _id === EnrichedFile._id.
 *
 * Idempotent via upsert on { parentId, documentId }.
 */
export async function migrateJobsiteEnrichedFiles(
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const entry of ((jobsite as any).enrichedFiles ?? []) as Array<{
          enrichedFile: mongoose.Types.ObjectId;
          minRole: string;
        }>) {
          const enrichedFileId = entry.enrichedFile;
          const minRole = entry.minRole;
          const doc = await DocumentModel.findById(enrichedFileId).lean();
          if (!doc) continue;
          const file = await File.findById(doc.currentFileId).lean();
          if (!file) continue;
          const name = file.originalFilename || file.description || "file";

          await FileNode.updateOne(
            { parentId: entityRoot._id, documentId: enrichedFileId },
            {
              $setOnInsert: {
                type: "file",
                name,
                normalizedName: normalizeNodeName(name),
                parentId: entityRoot._id,
                documentId: enrichedFileId,
                aiManaged: false,
                sortKey: "0000",
                isReservedRoot: false,
                version: 0,
                minRole,
                createdAt: new Date(),
              },
              $set: { updatedAt: new Date() },
            },
            { upsert: true }
          );
          report.documentsUpserted += 1;
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
