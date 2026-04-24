import {
  EnrichedFile,
  File,
  Document as DocumentModel,
  Enrichment,
} from "@models";

export interface MigrationOptions {
  dryRun: boolean;
  /** Tag every new Document/Enrichment/FileNode row with this id so ops
   *  can rollback a specific run via `deleteMany({ migrationRunId })`. */
  runId?: string;
}

export interface MigrationReport {
  scanned: number;
  documentsUpserted: number;
  enrichmentsUpserted: number;
  filesBackfilled: number;
  skipped: number;
  errors: Array<{ enrichedFileId: string; message: string }>;
}

/**
 * Reference-preserving backfill: every EnrichedFile becomes a Document
 * with the SAME _id, plus an Enrichment row carrying the pipeline state.
 * File gets its new fields (originalFilename, storageKey, uploadedAt)
 * populated from legacy shape.
 *
 * Idempotent via upsert-by-_id.
 */
export async function migrateEnrichedFiles(
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

  const cursor = EnrichedFile.find().populate("file").cursor();
  for await (const ef of cursor) {
    report.scanned += 1;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const file = (ef as any).file;
      if (!file) {
        report.skipped += 1;
        continue;
      }

      if (!opts.dryRun) {
        // Backfill File fields.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fileUpdates: Record<string, any> = {};
        if (!file.originalFilename)
          fileUpdates.originalFilename = file.description ?? "";
        if (!file.storageKey) fileUpdates.storageKey = file._id.toString();
        if (!file.uploadedAt)
          fileUpdates.uploadedAt = file.createdAt ?? new Date();
        if (Object.keys(fileUpdates).length > 0) {
          await File.updateOne({ _id: file._id }, { $set: fileUpdates });
          report.filesBackfilled += 1;
        }

        // Upsert Document with _id === EnrichedFile._id.
        await DocumentModel.updateOne(
          { _id: ef._id },
          {
            $setOnInsert: {
              _id: ef._id,
              currentFileId: file._id,
              enrichmentLocked: false,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              createdAt: (ef as any).createdAt ?? new Date(),
              ...(opts.runId ? { migrationRunId: opts.runId } : {}),
            },
            $set: {
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
        report.documentsUpserted += 1;

        // Upsert Enrichment (unique index on documentId prevents dups).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const efAny = ef as any;
        await Enrichment.updateOne(
          { documentId: ef._id },
          {
            $setOnInsert: {
              documentId: ef._id,
              fileId: file._id,
              status: efAny.summaryStatus ?? "pending",
              attempts: efAny.summaryAttempts ?? 0,
              processingVersion: efAny.processingVersion ?? 1,
              queuedAt: efAny.queuedAt,
              processingStartedAt: efAny.processingStartedAt,
              summaryError: efAny.summaryError,
              pageCount: efAny.pageCount,
              pageIndex: efAny.pageIndex,
              summary: efAny.summary,
              documentType: efAny.documentType,
              summaryProgress: efAny.summaryProgress,
              ...(opts.runId ? { migrationRunId: opts.runId } : {}),
            },
          },
          { upsert: true }
        );
        report.enrichmentsUpserted += 1;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      report.errors.push({
        enrichedFileId: ef._id.toString(),
        message: msg,
      });
    }
  }

  return report;
}
