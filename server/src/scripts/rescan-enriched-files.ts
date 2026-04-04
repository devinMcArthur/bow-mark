/**
 * Rescan enriched files — re-trigger summarization for all ready EnrichedFiles.
 *
 * Run after deploying the world-class tender summaries feature to regenerate
 * all document summaries and build page indexes for existing documents.
 * The consumer MUST be running to process the queue.
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register src/scripts/rescan-enriched-files.ts
 *
 * Flags:
 *   --dry-run   Log what would be reset without making any changes
 *   --id <id>   Re-scan a single enrichedFile by its MongoDB _id
 */

import "reflect-metadata";
import * as dotenv from "dotenv";
import path from "path";

if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.join(__dirname, "../../.env.development") });
}

import mongoose from "mongoose";
import { EnrichedFile } from "../models";
import { publishEnrichedFileCreated } from "../rabbitmq/publisher";

const isDryRun = process.argv.includes("--dry-run");
const targetId = (() => {
  const idx = process.argv.indexOf("--id");
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI required");
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  });
  console.log("[rescan] Connected to MongoDB");

  const query = targetId
    ? { _id: new mongoose.Types.ObjectId(targetId) }
    : { summaryStatus: "ready" };

  const files = await EnrichedFile.find(query).populate("file").lean();
  console.log(
    `[rescan] Found ${files.length} file(s) to re-scan${isDryRun ? " (dry run — no changes will be made)" : ""}`
  );

  let count = 0;
  for (const f of files) {
    const fileId =
      typeof f.file === "object" && (f.file as any)._id
        ? (f.file as any)._id.toString()
        : (f.file as any).toString();

    console.log(`[rescan] ${isDryRun ? "[dry-run] " : ""}${f._id} → file ${fileId}`);

    if (!isDryRun) {
      await EnrichedFile.findByIdAndUpdate(f._id, {
        $set: { summaryStatus: "pending" },
        $unset: { summary: "", summaryError: "", pageIndex: "" },
      });
      await publishEnrichedFileCreated(f._id.toString(), fileId, 0);
      count++;
      // Small delay to avoid flooding RabbitMQ
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log(
    `[rescan] Done. ${isDryRun ? "Would have reset" : "Reset and re-queued"} ${isDryRun ? files.length : count} file(s).`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[rescan] Fatal:", err);
  process.exit(1);
});
