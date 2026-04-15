/**
 * Reset stuck EnrichedFiles and re-enqueue them cleanly.
 *
 * Use after the Ready→Processing loop bug (fixed in the same commit as this
 * script) to recover files that were left in limbo when the consumer was
 * scaled down. Resets `summaryStatus` to "pending" and republishes via
 * `publishEnrichedFileCreated`, which now also stamps `queuedAt` so the
 * watchdog won't immediately re-duplicate them.
 *
 * Unlike rescan-enriched-files.ts, this script:
 *   - Targets non-ready files (pending/processing/failed) by default
 *   - Preserves existing summary/pageIndex data (no $unset)
 *   - Supports targeting a specific tender by id
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register src/scripts/reset-stuck-enriched-files.ts [flags]
 *
 * Flags:
 *   --dry-run            Log what would be reset without making any changes
 *   --tender <id>        Only reset files belonging to this tender
 *   --status <list>      Comma-separated statuses to reset (default: pending,processing,failed)
 *   --id <id>            Reset a single EnrichedFile by its MongoDB _id
 *
 * Before running, purge queue duplicates from the incident:
 *   kubectl exec -it <rabbitmq-pod> -- rabbitmqctl purge_queue enriched.file_summary
 */

import "reflect-metadata";
import * as dotenv from "dotenv";
import path from "path";

if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.join(__dirname, "../../.env.development") });
}

import mongoose from "mongoose";
import { EnrichedFile, Tender } from "../models";
import { publishEnrichedFileCreated } from "../rabbitmq/publisher";

const VALID_STATUSES = new Set(["pending", "processing", "failed", "ready"]);
const DEFAULT_STATUSES = ["pending", "processing", "failed"];

const isDryRun = process.argv.includes("--dry-run");
const getFlag = (name: string): string | null => {
  const idx = process.argv.indexOf(name);
  return idx !== -1 ? process.argv[idx + 1] ?? null : null;
};

const tenderId = getFlag("--tender");
const targetId = getFlag("--id");
const statusArg = getFlag("--status");

const statuses = statusArg
  ? statusArg.split(",").map((s) => s.trim()).filter(Boolean)
  : DEFAULT_STATUSES;

for (const s of statuses) {
  if (!VALID_STATUSES.has(s)) {
    console.error(`[reset] Invalid status: ${s}. Valid: ${[...VALID_STATUSES].join(", ")}`);
    process.exit(1);
  }
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI required");
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  });
  console.log("[reset] Connected to MongoDB");

  let query: Record<string, unknown>;
  if (targetId) {
    query = { _id: new mongoose.Types.ObjectId(targetId) };
  } else if (tenderId) {
    const tender = await Tender.findById(tenderId).lean();
    if (!tender) throw new Error(`Tender ${tenderId} not found`);
    const fileIds = ((tender as any).files as any[]).map((f: any) =>
      f._id ? f._id.toString() : f.toString()
    );
    query = {
      _id: { $in: fileIds.map((id) => new mongoose.Types.ObjectId(id)) },
      summaryStatus: { $in: statuses },
    };
  } else {
    query = { summaryStatus: { $in: statuses } };
  }

  const files = await EnrichedFile.find(query).populate("file").lean();
  console.log(
    `[reset] Found ${files.length} file(s) to reset — statuses: [${statuses.join(", ")}]` +
    `${tenderId ? ` tender: ${tenderId}` : ""}` +
    `${isDryRun ? " (dry run — no changes will be made)" : ""}`
  );

  if (files.length === 0) {
    await mongoose.disconnect();
    return;
  }

  const byStatus = files.reduce<Record<string, number>>((acc, f) => {
    const s = (f as any).summaryStatus as string;
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`[reset] Breakdown: ${JSON.stringify(byStatus)}`);

  let count = 0;
  for (const f of files) {
    if (!f.file) {
      console.warn(`[reset] Skipping ${f._id} — no file ref`);
      continue;
    }
    const fileRef = f.file as { _id?: unknown };
    const fileId = fileRef._id
      ? (fileRef._id as { toString(): string }).toString()
      : (f.file as { toString(): string }).toString();

    console.log(`[reset] ${isDryRun ? "[dry-run] " : ""}${f._id} → file ${fileId}`);

    if (!isDryRun) {
      await EnrichedFile.findByIdAndUpdate(f._id, {
        $set: { summaryStatus: "pending" },
        $unset: { processingStartedAt: "", summaryError: "" },
      });
      const published = await publishEnrichedFileCreated(
        f._id.toString(),
        fileId,
        0
      );
      if (!published) {
        console.error(`[reset] Failed to publish ${f._id} — broker unreachable?`);
        continue;
      }
      count++;
      // Small delay to avoid flooding RabbitMQ
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(
    `[reset] Done. ${isDryRun ? "Would have reset" : "Reset and re-queued"} ${isDryRun ? files.length : count} file(s).`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[reset] Fatal:", err);
  process.exit(1);
});
