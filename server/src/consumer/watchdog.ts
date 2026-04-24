/**
 * Enrichment watchdog — scans MongoDB for enrichments stuck in non-terminal
 * states and republishes them. Split out of consumer/index.ts so unit
 * tests can import the recovery function without booting the consumer.
 */

import mongoose from "mongoose";
import { Enrichment } from "@models";
import { publishEnrichedFileCreated } from "../rabbitmq/publisher";

/** Max time a file can be in "processing" before the watchdog reclaims it. */
export const PROCESSING_STUCK_MS = 90 * 60_000; // 90 min

/** Max time a file can be in "pending" since its last publish before the
 *  watchdog republishes it. Checked against `queuedAt`. 30 min is long
 *  enough for a large batch to drain through the queue (prefetch=2, ~2 min
 *  per file) but short enough that a silently-dropped publish is recovered
 *  within one watchdog cycle instead of waiting hours. */
export const PENDING_STUCK_MS = 30 * 60_000; // 30 min

/** Cooldown before retrying a "failed" or "partial" file. */
export const FAILED_RETRY_COOLDOWN_MS = 60 * 60_000; // 1 hr

/** Max attempts before giving up on a file entirely. Applies to ALL
 *  recovery paths (processing, pending, failed, partial). */
export const MAX_SUMMARY_ATTEMPTS = 3;

/**
 * Scan for enrichments stuck in processing / pending / failed / partial
 * states and recover them. Called at startup and on a periodic interval.
 *
 * Recovery uses timestamp eligibility so we never race with an in-flight
 * handler. The handler's atomic claim guards against double-processing
 * even if this watchdog requeues while a delivery is already in flight.
 *
 * `orphaned` files are skipped — the source file is gone from storage
 * and no amount of retry will fix it. They need manual cleanup.
 */
export async function recoverStuckFiles(): Promise<void> {
  const now = Date.now();
  const processingCutoff = new Date(now - PROCESSING_STUCK_MS);
  const pendingCutoff = new Date(now - PENDING_STUCK_MS);
  const failedCutoff = new Date(now - FAILED_RETRY_COOLDOWN_MS);

  // ── Mark exhausted enrichments as permanently failed ───────────────────
  // Enrichments in ANY non-terminal state that have exceeded MAX_SUMMARY_ATTEMPTS
  // should stop cycling. Without this, processing↔pending resets loop
  // indefinitely for files that consistently crash the handler.
  const exhausted = await Enrichment.find({
    status: { $in: ["pending", "processing", "failed", "partial"] },
    attempts: { $gte: MAX_SUMMARY_ATTEMPTS },
  }).lean();
  if (exhausted.length > 0) {
    console.warn(
      `[Watchdog] Marking ${exhausted.length} enrichment(s) as permanently failed (exceeded ${MAX_SUMMARY_ATTEMPTS} attempts)`
    );
    await Enrichment.updateMany(
      {
        documentId: { $in: exhausted.map((e) => e.documentId) },
      },
      {
        $set: {
          status: "failed",
          summaryError: `Exceeded max retry attempts (${MAX_SUMMARY_ATTEMPTS})`,
        },
        $unset: { processingStartedAt: "" },
      }
    );
  }

  // Enrichments in "processing" whose handler exceeded the max processing window.
  // Covers: consumer crash mid-handler, broker channel timeout killing ack.
  // Capped by MAX_SUMMARY_ATTEMPTS (exhausted already marked above).
  const stuckProcessing = await Enrichment.find({
    status: "processing",
    attempts: { $lt: MAX_SUMMARY_ATTEMPTS },
    $or: [
      { processingStartedAt: { $lt: processingCutoff } },
      { processingStartedAt: { $exists: false } },
    ],
  }).lean();

  // Enrichments in "pending" whose last publish timestamp is older than the cutoff.
  // Capped by MAX_SUMMARY_ATTEMPTS (exhausted already marked above).
  const stuckPending = await Enrichment.find({
    status: "pending",
    attempts: { $lt: MAX_SUMMARY_ATTEMPTS },
    $or: [
      { queuedAt: { $exists: true, $lt: pendingCutoff } },
      { queuedAt: { $exists: false }, createdAt: { $lt: pendingCutoff } },
    ],
  }).lean();

  // Enrichments in "failed" past the retry cooldown, below max attempts.
  // Covers: transient failures (network, API outages, Claude 529s).
  // Use queuedAt as the age reference (closest semantic equivalent to
  // createdAt for enrichments — it's stamped when first queued).
  const stuckFailed = await Enrichment.find({
    status: "failed",
    queuedAt: { $lt: failedCutoff },
    $or: [
      { attempts: { $exists: false } },
      { attempts: { $lt: MAX_SUMMARY_ATTEMPTS } },
    ],
  }).lean();

  // Enrichments in "partial" — summary done, pageIndex failed partway. Same
  // cooldown as failed so we don't retry in a tight loop, but capped at
  // MAX_SUMMARY_ATTEMPTS so persistently-failing indexers give up.
  // Handler's atomic claim allows "partial", so generatePageIndex resumes
  // from the checkpoint (existing pageIndex array).
  const stuckPartial = await Enrichment.find({
    status: "partial",
    queuedAt: { $lt: failedCutoff },
    $or: [
      { attempts: { $exists: false } },
      { attempts: { $lt: MAX_SUMMARY_ATTEMPTS } },
    ],
  }).lean();

  const total =
    stuckProcessing.length +
    stuckPending.length +
    stuckFailed.length +
    stuckPartial.length;
  if (total === 0) return;

  console.warn(
    `[Watchdog] Found stuck enrichments — processing: ${stuckProcessing.length}, ` +
      `pending: ${stuckPending.length}, failed: ${stuckFailed.length}, ` +
      `partial: ${stuckPartial.length}`
  );

  const requeue = async (
    enrichments: Array<{
      documentId: mongoose.Types.ObjectId | unknown;
      fileId: mongoose.Types.ObjectId | unknown;
      attempts?: number;
      status?: string;
    }>,
    bucket: string
  ): Promise<void> => {
    for (const enrichment of enrichments) {
      const docId = enrichment.documentId as mongoose.Types.ObjectId;
      const fId = enrichment.fileId as mongoose.Types.ObjectId;

      if (!fId) {
        console.warn(`[Watchdog] Skipping enrichment for doc ${docId} — no fileId`);
        continue;
      }

      // For failed/processing/pending we reset status to pending so the
      // handler's claim predicate accepts the next delivery. For "partial"
      // we leave the status alone — the handler's claim predicate allows
      // "partial" directly so pageIndex resume works without a status flip.
      if (enrichment.status !== "partial") {
        await Enrichment.updateOne(
          { documentId: docId },
          {
            $set: { status: "pending" },
            $unset: { processingStartedAt: "", summaryError: "" },
          }
        );
      }

      // Preserve attempts as the retry attempt number. Passing 0
      // resets rate-limit backoff state and can hammer a still-limited
      // endpoint. Using the doc's counter carries backoff across passes.
      const enrichedFileIdStr = docId.toString();
      const fileIdStr = fId.toString();
      const attemptNum = enrichment.attempts ?? 0;
      const published = await publishEnrichedFileCreated(
        enrichedFileIdStr,
        fileIdStr,
        attemptNum
      );
      if (published) {
        console.log(
          `[Watchdog] Requeued ${bucket} enrichment ${enrichedFileIdStr} → ${fileIdStr} (attempt ${attemptNum})`
        );
      } else {
        console.error(
          `[Watchdog] Failed to republish ${bucket} enrichment ${enrichedFileIdStr} — will retry next pass`
        );
      }
      // Small delay between publishes to avoid flooding broker
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  await requeue(stuckProcessing as any, "processing");
  await requeue(stuckPending as any, "pending");
  await requeue(stuckFailed as any, "failed");
  await requeue(stuckPartial as any, "partial");
}
