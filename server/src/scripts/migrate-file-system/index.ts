import crypto from "crypto";
import mongoose from "mongoose";
import "dotenv/config";
import { migrateEnrichedFiles } from "./01-enrichedFiles";
import { migrateJobsiteEnrichedFiles } from "./02-jobsiteEnrichedFiles";
import { migrateJobsiteFileObjects } from "./03-jobsiteFileObjects";
import { migrateSystemSpecFiles } from "./04-systemSpecFiles";
import { migrateTenderFiles } from "./05-tenderFiles";
import { migrateReportNotes } from "./06-reportNotes";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI required");
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Generate a per-run id so every Document/Enrichment/FileNode row this
  // run inserts can be attributed to it. Rollback runbook:
  //   db.filenodes.deleteMany({ migrationRunId: "<runId>" })
  //   db.documents.deleteMany({ migrationRunId: "<runId>" })
  //   db.enrichments.deleteMany({ migrationRunId: "<runId>" })
  // Passed through to every sub-migration via opts.runId. Upserts only
  // stamp on insert ($setOnInsert), so rerunning a migration doesn't
  // retag previously migrated rows with the new run id.
  const runId = `fs-migrate-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(3).toString("hex")}`;
  const opts = { dryRun, runId };

  console.log(`Running file-system migration (dryRun=${dryRun}, runId=${runId})...`);
  const ef = await migrateEnrichedFiles(opts);
  console.log("01-enrichedFiles:", JSON.stringify(ef, null, 2));

  const jef = await migrateJobsiteEnrichedFiles(opts);
  console.log("02-jobsiteEnrichedFiles:", JSON.stringify(jef, null, 2));

  const jfo = await migrateJobsiteFileObjects(opts);
  console.log("03-jobsiteFileObjects:", JSON.stringify(jfo, null, 2));

  const ssf = await migrateSystemSpecFiles(opts);
  console.log("04-systemSpecFiles:", JSON.stringify(ssf, null, 2));

  const tf = await migrateTenderFiles(opts);
  console.log("05-tenderFiles:", JSON.stringify(tf, null, 2));

  const rn = await migrateReportNotes(opts);
  console.log("06-reportNotes:", JSON.stringify(rn, null, 2));

  console.log(`\nMigration complete — runId=${runId}`);
  console.log(
    `Rollback: delete rows where migrationRunId === "${runId}" in filenodes, documents, enrichments.`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
