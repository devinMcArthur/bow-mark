/**
 * EnrichedFile watchdog — scans MongoDB for files stuck in non-terminal
 * states and republishes them. Split out of consumer/index.ts so unit
 * tests can import the recovery function without booting the consumer.
 */

import mongoose from "mongoose";
import { EnrichedFile } from "@models";
import { publishEnrichedFileCreated } from "../rabbitmq/publisher";

/** Max time a file can be in "processing" before the watchdog reclaims it. */
export const PROCESSING_STUCK_MS = 90 * 60_000; // 90 min

/** Max time a file can be in "pending" since its last publish before the
 *  watchdog republishes it. Checked against `queuedAt` (fallback: `createdAt`
 *  for legacy docs that pre-date the field). Must be comfortably larger than
 *  the worst-case queue-drain time for a large upload batch. */
export const PENDING_STUCK_MS = 3 * 60 * 60_000; // 3 hr

/** Cooldown before retrying a "failed" or "partial" file. */
export const FAILED_RETRY_COOLDOWN_MS = 60 * 60_000; // 1 hr

/** Max attempts before giving up on a file entirely. Applies to ALL
 *  recovery paths (processing, pending, failed, partial). */
export const MAX_SUMMARY_ATTEMPTS = 3;

/**
 * Scan for files stuck in processing / pending / failed / partial states
 * and recover them. Called at startup and on a periodic interval.
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

  // ── Mark exhausted files as permanently failed ─────────────────────────
  // Files in ANY non-terminal state that have exceeded MAX_SUMMARY_ATTEMPTS
  // should stop cycling. Without this, processing↔pending resets loop
  // indefinitely for files that consistently crash the handler.
  const exhausted = await EnrichedFile.find({
    summaryStatus: { $in: ["pending", "processing", "failed", "partial"] },
    summaryAttempts: { $gte: MAX_SUMMARY_ATTEMPTS },
  }).lean();
  if (exhausted.length > 0) {
    console.warn(
      `[Watchdog] Marking ${exhausted.length} file(s) as permanently failed (exceeded ${MAX_SUMMARY_ATTEMPTS} attempts)`
    );
    await EnrichedFile.updateMany(
      {
        _id: { $in: exhausted.map((f) => f._id) },
      },
      {
        $set: {
          summaryStatus: "failed",
          summaryError: `Exceeded max retry attempts (${MAX_SUMMARY_ATTEMPTS})`,
        },
        $unset: { processingStartedAt: "" },
      }
    );
  }

  // Files in "processing" whose handler exceeded the max processing window.
  // Covers: consumer crash mid-handler, broker channel timeout killing ack.
  // Capped by MAX_SUMMARY_ATTEMPTS (exhausted files already marked above).
  const stuckProcessing = await EnrichedFile.find({
    summaryStatus: "processing",
    summaryAttempts: { $lt: MAX_SUMMARY_ATTEMPTS },
    $or: [
      { processingStartedAt: { $lt: processingCutoff } },
      { processingStartedAt: { $exists: false } },
    ],
  })
    .populate("file")
    .lean();

  // Files in "pending" whose last publish timestamp is older than the cutoff.
  // Capped by MAX_SUMMARY_ATTEMPTS (exhausted files already marked above).
  const stuckPending = await EnrichedFile.find({
    summaryStatus: "pending",
    summaryAttempts: { $lt: MAX_SUMMARY_ATTEMPTS },
    $or: [
      { queuedAt: { $exists: true, $lt: pendingCutoff } },
      { queuedAt: { $exists: false }, createdAt: { $lt: pendingCutoff } },
    ],
  })
    .populate("file")
    .lean();

  // Files in "failed" past the retry cooldown, below max attempts.
  // Covers: transient failures (network, API outages, Claude 529s).
  const stuckFailed = await EnrichedFile.find({
    summaryStatus: "failed",
    createdAt: { $lt: failedCutoff },
    $or: [
      { summaryAttempts: { $exists: false } },
      { summaryAttempts: { $lt: MAX_SUMMARY_ATTEMPTS } },
    ],
  })
    .populate("file")
    .lean();

  // Files in "partial" — summary done, pageIndex failed partway. Same
  // cooldown as failed so we don't retry in a tight loop, but capped at
  // MAX_SUMMARY_ATTEMPTS so persistently-failing indexers give up.
  // Handler's atomic claim allows "partial", so generatePageIndex resumes
  // from the checkpoint (existing pageIndex array).
  const stuckPartial = await EnrichedFile.find({
    summaryStatus: "partial",
    createdAt: { $lt: failedCutoff },
    $or: [
      { summaryAttempts: { $exists: false } },
      { summaryAttempts: { $lt: MAX_SUMMARY_ATTEMPTS } },
    ],
  })
    .populate("file")
    .lean();

  const total =
    stuckProcessing.length +
    stuckPending.length +
    stuckFailed.length +
    stuckPartial.length;
  if (total === 0) return;

  console.warn(
    `[Watchdog] Found stuck files — processing: ${stuckProcessing.length}, ` +
      `pending: ${stuckPending.length}, failed: ${stuckFailed.length}, ` +
      `partial: ${stuckPartial.length}`
  );

  const requeue = async (
    files: Array<{
      _id: mongoose.Types.ObjectId;
      file?: unknown;
      summaryAttempts?: number;
      summaryStatus?: string;
    }>,
    bucket: string
  ): Promise<void> => {
    for (const enrichedFile of files) {
      if (!enrichedFile.file) {
        console.warn(`[Watchdog] Skipping ${enrichedFile._id} — no file ref`);
        continue;
      }
      const fileRef = enrichedFile.file as { _id?: unknown };
      const fileId = fileRef._id
        ? (fileRef._id as { toString(): string }).toString()
        : (enrichedFile.file as { toString(): string }).toString();

      // For failed/processing/pending we reset status to pending so the
      // handler's claim predicate accepts the next delivery. For "partial"
      // we leave the status alone — the handler's claim predicate allows
      // "partial" directly so pageIndex resume works without a status flip.
      if (enrichedFile.summaryStatus !== "partial") {
        await EnrichedFile.findByIdAndUpdate(enrichedFile._id, {
          $set: { summaryStatus: "pending" },
          $unset: { processingStartedAt: "", summaryError: "" },
        });
      }

      // Preserve summaryAttempts as the retry attempt number. Passing 0
      // resets rate-limit backoff state and can hammer a still-limited
      // endpoint. Using the doc's counter carries backoff across passes.
      const attemptNum = enrichedFile.summaryAttempts ?? 0;
      const published = await publishEnrichedFileCreated(
        enrichedFile._id.toString(),
        fileId,
        attemptNum
      );
      if (published) {
        console.log(
          `[Watchdog] Requeued ${bucket} file ${enrichedFile._id} → ${fileId} (attempt ${attemptNum})`
        );
      } else {
        console.error(
          `[Watchdog] Failed to republish ${bucket} file ${enrichedFile._id} — will retry next pass`
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
