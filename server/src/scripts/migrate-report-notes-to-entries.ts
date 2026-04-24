import mongoose from "mongoose";
import "dotenv/config";
import { DailyReport, DailyReportEntry, ReportNote } from "@models";

/**
 * Turn existing ReportNote.note strings into DailyReportEntry rows so
 * the new journal timeline surfaces historical foreman notes without
 * losing any context. The source ReportNote.note field is intentionally
 * left untouched — this migration is additive. ReportNote.files were
 * already ported into the FileNode tree by migrate-file-system/06.
 *
 * We iterate DailyReports and follow their `reportNote` pointer rather
 * than the other way around: the back-reference from ReportNote to
 * DailyReport was only populated on newer rows (~43% of the collection),
 * so iterating from the ReportNote side misses the majority of data.
 * DailyReport → ReportNote is the canonical direction.
 *
 * Idempotency: the created entry reuses the ReportNote._id as its own
 * _id, so re-runs upsert instead of duplicating. Safe to run repeatedly.
 *
 * Usage:
 *   ts-node src/scripts/migrate-report-notes-to-entries.ts [--dry-run]
 */

interface MigrationReport {
  scannedDailyReports: number;
  entriesCreated: number;
  entriesAlreadyExisted: number;
  skippedNoReportNote: number;
  skippedEmptyText: number;
  skippedMissingReportNote: number;
  errors: Array<{ dailyReportId: string; message: string }>;
}

export async function migrateReportNotesToEntries(opts: {
  dryRun: boolean;
}): Promise<MigrationReport> {
  const report: MigrationReport = {
    scannedDailyReports: 0,
    entriesCreated: 0,
    entriesAlreadyExisted: 0,
    skippedNoReportNote: 0,
    skippedEmptyText: 0,
    skippedMissingReportNote: 0,
    errors: [],
  };

  // Stream DailyReports — the canonical side of the link. Only materialize
  // the small subset of fields we need to keep the cursor cheap on large
  // collections.
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

      // Pull just `note` off the ReportNote — files are already in the
      // FileNode tree thanks to migrate-file-system/06-reportNotes.
      const rn = await ReportNote.findById(reportNoteId, {
        _id: 1,
        note: 1,
      }).lean();
      if (!rn) {
        // Dangling DailyReport.reportNote pointer — the ReportNote
        // itself has been deleted. Counted but not migrated.
        report.skippedMissingReportNote += 1;
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = ((rn as any).note as string | undefined)?.trim() ?? "";
      if (text.length === 0) {
        report.skippedEmptyText += 1;
        continue;
      }

      // Entry._id reuses ReportNote._id — gives us a deterministic,
      // idempotent key. The two models live in separate collections so
      // there's no ObjectId collision risk.
      const entryId = rn._id;

      const existing = await DailyReportEntry.exists({ _id: entryId });
      if (existing) {
        report.entriesAlreadyExisted += 1;
        continue;
      }

      if (!opts.dryRun) {
        // ReportNote's createdAt isn't stored explicitly, but ObjectIds
        // carry a timestamp in their first 4 bytes — use that as the
        // entry's createdAt so the timeline orders migrated notes at
        // roughly the moment they were originally saved.
        const createdAt = new Date(
          parseInt(entryId.toString().substring(0, 8), 16) * 1000
        );

        await DailyReportEntry.create({
          _id: entryId,
          dailyReportId: dr._id,
          text,
          documentIds: [],
          // createdBy intentionally omitted — no reliable author on the
          // legacy ReportNote. UI renders these as "Unknown" which is
          // honest about provenance.
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

// Only run when invoked directly, not when imported from a test.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
