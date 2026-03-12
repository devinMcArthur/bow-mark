/**
 * Migration: Move embedded EnrichedFile subdocs to standalone collection
 *
 * Run once after deploying the feature/tender schema migration.
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register src/scripts/migrate-enriched-files.ts
 */

import "reflect-metadata";
import * as dotenv from "dotenv";
import path from "path";

if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.join(__dirname, "../../.env.development") });
}

import mongoose from "mongoose";
import { EnrichedFile } from "../models";

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI required");
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  });
  console.log("[migrate] Connected to MongoDB");

  // Use raw collection access to avoid Typegoose schema conflicts during migration
  const db = mongoose.connection.db;
  const tendersCol = db.collection("tenders");
  const systemsCol = db.collection("systems");
  const enrichedFilesCol = db.collection("enrichedfiles");

  // ── Migrate Tender files ────────────────────────────────────────────────────
  const tenders = await tendersCol.find({}).toArray();
  let tenderFilesCount = 0;

  for (const tender of tenders) {
    const files = tender.files ?? [];
    const embeddedFiles = files.filter(
      (f: any) => typeof f === "object" && f !== null && f.summaryStatus
    );

    if (embeddedFiles.length === 0) {
      // Already migrated (array of ObjectIds) or empty
      continue;
    }

    const newRefs: mongoose.Types.ObjectId[] = [];

    for (const f of embeddedFiles) {
      // Check if already in enrichedfiles collection
      const existing = await enrichedFilesCol.findOne({ _id: f._id });
      if (existing) {
        newRefs.push(f._id);
        continue;
      }

      await enrichedFilesCol.insertOne({
        _id: f._id,
        file: f.file,
        documentType: f.documentType,
        summary: f.summary,
        summaryStatus: f.summaryStatus ?? "pending",
        pageCount: f.pageCount,
        summaryError: f.summaryError,
        createdAt: f.createdAt ?? new Date(),
      });

      newRefs.push(f._id);
      tenderFilesCount++;
    }

    await tendersCol.updateOne(
      { _id: tender._id },
      { $set: { files: newRefs } }
    );
    console.log(`[migrate] Tender ${tender._id}: migrated ${embeddedFiles.length} file(s)`);
  }

  // ── Migrate System specFiles ────────────────────────────────────────────────
  const systems = await systemsCol.find({}).toArray();
  let specFilesCount = 0;

  for (const system of systems) {
    const specFiles = system.specFiles ?? [];
    const embeddedSpecFiles = specFiles.filter(
      (f: any) => typeof f === "object" && f !== null && f.summaryStatus
    );

    if (embeddedSpecFiles.length === 0) continue;

    const newRefs: mongoose.Types.ObjectId[] = [];

    for (const f of embeddedSpecFiles) {
      const existing = await enrichedFilesCol.findOne({ _id: f._id });
      if (existing) {
        newRefs.push(f._id);
        continue;
      }

      await enrichedFilesCol.insertOne({
        _id: f._id,
        file: f.file,
        documentType: f.documentType,
        summary: f.summary,
        summaryStatus: f.summaryStatus ?? "pending",
        pageCount: f.pageCount,
        summaryError: f.summaryError,
        createdAt: f.createdAt ?? new Date(),
      });

      newRefs.push(f._id);
      specFilesCount++;
    }

    await systemsCol.updateOne(
      { _id: system._id },
      { $set: { specFiles: newRefs } }
    );
    console.log(`[migrate] System ${system._id}: migrated ${embeddedSpecFiles.length} spec file(s)`);
  }

  console.log(`[migrate] Done. Migrated ${tenderFilesCount} tender files + ${specFilesCount} spec files.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[migrate] Fatal:", err);
  process.exit(1);
});
