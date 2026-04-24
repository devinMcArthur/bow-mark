import mongoose from "mongoose";
import "dotenv/config";
import { DailyReport, DailyReportEntry, ReportNote } from "@models";

/**
 * Turn existing ReportNote rows into DailyReportEntry rows so the new
 * journal timeline surfaces historical foreman notes and photos without
 * losing any context. The source ReportNote fields are intentionally
 * left untouched — this migration is additive.
 *
 * What gets migrated:
 *   - ReportNote.note  → DailyReportEntry.text  (when non-empty)
 *   - ReportNote.files → DailyReportEntry.documentIds  (File._id === Document._id,
 *     per the Document upsert key used in migrate-file-system/06-reportNotes.ts)
 *
 * Notes with ONLY images (no text) still get a DailyReportEntry so that
 * photos surface in the timeline regardless of whether a text note was
 * written alongside them.
 *
 * We iterate DailyReports and follow their `reportNote` pointer rather
 * than the other way around: the back-reference from ReportNote to
 * DailyReport was only populated on newer rows (~43% of the collection),
 * so iterating from the ReportNote side misses the majority of data.
 * DailyReport → ReportNote is the canonical direction.
 *
 * Idempotency: the created entry reuses the ReportNote._id as its own
 * _id, so re-runs upsert instead of duplicating. If an entry already
 * exists with empty documentIds but the source note had files, the entry
 * is updated to link the documents. Safe to run repeatedly.
 *
 * Usage:
 *   ts-node src/scripts/migrate-report-notes-to-entries.ts [--dry-run]
 */

interface MigrationReport {
  scannedDailyReports: number;
  entriesCreated: number;
  entriesUpdated: number;
  entriesAlreadyExisted: number;
  skippedNoReportNote: number;
  skippedNothingToMigrate: number;
  skippedMissingReportNote: number;
  errors: Array<{ dailyReportId: string; message: string }>;
}

export async function migrateReportNotesToEntries(opts: {
  dryRun: boolean;
}): Promise<MigrationReport> {
  const report: MigrationReport = {
    scannedDailyReports: 0,
    entriesCreated: 0,
    entriesUpdated: 0,
    entriesAlreadyExisted: 0,
    skippedNoReportNote: 0,
    skippedNothingToMigrate: 0,
    skippedMissingReportNote: 0,
    errors: [],
  };

  const cursor = DailyReport.find(
    { reportNote: { $exists: true, $ne: null } },
    { _id: 1, reportNote: 1 }
  ).cursor();

  for await (const dr of cursor) {
    report.scannedDailyReports += 1;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reportNoteId = (dr as any).reportNote as
        | mongoose.Types.ObjectId
        | undefined;
      if (!reportNoteId) {
        report.skippedNoReportNote += 1;
        continue;
      }

      const rn = await ReportNote.findById(reportNoteId, {
        _id: 1,
        note: 1,
        files: 1,
      }).lean();
      if (!rn) {
        report.skippedMissingReportNote += 1;
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = ((rn as any).note as string | undefined)?.trim() ?? "";
      // File._id === Document._id — 06-reportNotes upserts Documents keyed by file._id.
      const documentIds = (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((rn as any).files ?? []) as mongoose.Types.ObjectId[]
      ).filter(Boolean);

      if (text.length === 0 && documentIds.length === 0) {
        report.skippedNothingToMigrate += 1;
        continue;
      }

      const entryId = rn._id;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = await DailyReportEntry.findById(entryId, { documentIds: 1 }).lean() as any;
      if (existing) {
        const existingDocIds: mongoose.Types.ObjectId[] = existing.documentIds ?? [];
        if (existingDocIds.length === 0 && documentIds.length > 0) {
          // Entry was created by an earlier run that didn't link photos — patch it.
          if (!opts.dryRun) {
            await DailyReportEntry.updateOne(
              { _id: entryId },
              { $set: { documentIds } }
            );
          }
          report.entriesUpdated += 1;
        } else {
          report.entriesAlreadyExisted += 1;
        }
        continue;
      }

      if (!opts.dryRun) {
        const createdAt = new Date(
          parseInt(entryId.toString().substring(0, 8), 16) * 1000
        );

        await DailyReportEntry.create({
          _id: entryId,
          dailyReportId: dr._id,
          ...(text.length > 0 ? { text } : {}),
          documentIds,
          isIssue: false,
          createdAt,
          updatedAt: createdAt,
        });
      }

      report.entriesCreated += 1;
    } catch (err) {
      report.errors.push({
        dailyReportId: dr._id.toString(),
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return report;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI required");
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log(`Running report-notes → entries migration (dryRun=${dryRun})...`);
  const result = await migrateReportNotesToEntries({ dryRun });
  console.log(JSON.stringify(result, null, 2));

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
