import mongoose from "mongoose";
import { Enrichment, Document as DocumentModel, File } from "@models";
import { prepareDatabase } from "@testing/vitestDB";
import {
  recoverStuckFiles,
  PROCESSING_STUCK_MS,
  PENDING_STUCK_MS,
  FAILED_RETRY_COOLDOWN_MS,
  MAX_SUMMARY_ATTEMPTS,
} from "../consumer/watchdog";
import * as publisher from "../rabbitmq/publisher";

// We spy on the publisher module's export rather than using vi.mock with
// a relative path. vi.mock + relative paths has hoisting quirks in CI
// that left mockPublish as the real function — vi.spyOn mutates the
// module.exports at runtime after both the test and watchdog.ts have
// loaded the publisher, so both see the same spy.
let publishSpy: ReturnType<typeof vi.spyOn>;

beforeAll(async () => {
  await prepareDatabase();
});

beforeEach(() => {
  publishSpy = vi
    .spyOn(publisher, "publishEnrichedFileCreated")
    .mockResolvedValue(true);
});

afterEach(async () => {
  publishSpy.mockRestore();
  await Enrichment.deleteMany({});
  await (DocumentModel as any).deleteMany({});
  await (File as any).deleteMany({});
});

async function makeEnrichment(overrides: Record<string, any>) {
  const documentId = new mongoose.Types.ObjectId();
  const fileId = new mongoose.Types.ObjectId();
  // Create a minimal Document so Enrichment.documentId ref is coherent.
  await DocumentModel.create({ _id: documentId, currentFileId: fileId, enrichmentLocked: false });
  return Enrichment.create({
    documentId,
    fileId,
    status: overrides.status ?? "pending",
    attempts: overrides.attempts ?? 0,
    processingVersion: overrides.processingVersion ?? 1,
    ...overrides,
  });
}

describe("recoverStuckFiles", () => {
  it("requeues an enrichment stuck in processing past the window", async () => {
    const staleTime = new Date(Date.now() - PROCESSING_STUCK_MS - 60_000);
    const enr = await makeEnrichment({
      status: "processing",
      processingStartedAt: staleTime,
      attempts: 2,
    });

    await recoverStuckFiles();

    expect(publishSpy).toHaveBeenCalledTimes(1);
    // Real attempt count is preserved — not reset to 0 (H4 fix)
    expect(publishSpy).toHaveBeenCalledWith(
      enr.documentId.toString(),
      enr.fileId.toString(),
      2
    );

    const refetched = await Enrichment.findOne({ documentId: enr.documentId }).lean();
    expect(refetched!.status).toBe("pending");
    expect(refetched!.processingStartedAt).toBeUndefined();
  });

  it("does NOT requeue a fresh-processing enrichment (another handler owns it)", async () => {
    const freshTime = new Date(Date.now() - 60_000);
    await makeEnrichment({
      status: "processing",
      processingStartedAt: freshTime,
    });

    await recoverStuckFiles();

    expect(publishSpy).not.toHaveBeenCalled();
  });

  it("requeues an enrichment stuck in pending past the queue-drain window", async () => {
    const staleTime = new Date(Date.now() - PENDING_STUCK_MS - 60_000);
    const enr = await makeEnrichment({
      status: "pending",
      queuedAt: staleTime,
    });

    await recoverStuckFiles();

    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy).toHaveBeenCalledWith(
      enr.documentId.toString(),
      enr.fileId.toString(),
      expect.any(Number)
    );
  });

  it("does NOT requeue a pending enrichment with fresh queuedAt (legitimately queued)", async () => {
    const freshTime = new Date(Date.now() - 60_000);
    await makeEnrichment({
      status: "pending",
      queuedAt: freshTime,
    });

    await recoverStuckFiles();

    expect(publishSpy).not.toHaveBeenCalled();
  });

  it("requeues a failed enrichment past the cooldown under max attempts", async () => {
    const staleQueuedAt = new Date(Date.now() - FAILED_RETRY_COOLDOWN_MS - 60_000);
    const enr = await makeEnrichment({
      status: "failed",
      attempts: 2,
      queuedAt: staleQueuedAt,
    });

    await recoverStuckFiles();

    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy).toHaveBeenCalledWith(
      enr.documentId.toString(),
      enr.fileId.toString(),
      2
    );
  });

  it("skips a failed enrichment that hit MAX_SUMMARY_ATTEMPTS", async () => {
    const staleQueuedAt = new Date(Date.now() - FAILED_RETRY_COOLDOWN_MS - 60_000);
    await makeEnrichment({
      status: "failed",
      attempts: MAX_SUMMARY_ATTEMPTS,
      queuedAt: staleQueuedAt,
    });

    await recoverStuckFiles();

    expect(publishSpy).not.toHaveBeenCalled();
  });

  it("skips an orphaned enrichment entirely (never retried)", async () => {
    await makeEnrichment({
      status: "orphaned",
      summaryError: "Source file not found in storage",
      queuedAt: new Date(Date.now() - 10 * 60 * 60_000), // 10 hours ago
    });

    await recoverStuckFiles();

    expect(publishSpy).not.toHaveBeenCalled();
  });

  it("requeues a partial enrichment past the cooldown without flipping status", async () => {
    // partial enrichments resume via the handler's claim predicate which allows
    // partial → processing directly. Watchdog must NOT reset them to pending.
    const staleQueuedAt = new Date(Date.now() - FAILED_RETRY_COOLDOWN_MS - 60_000);
    const enr = await makeEnrichment({
      status: "partial",
      attempts: 1,
      pageIndex: [{ page: 1, summary: "first" }],
      queuedAt: staleQueuedAt,
    });

    await recoverStuckFiles();

    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy).toHaveBeenCalledWith(
      enr.documentId.toString(),
      enr.fileId.toString(),
      1
    );

    const refetched = await Enrichment.findOne({ documentId: enr.documentId }).lean();
    // Status stays "partial" — the handler will flip it to "processing"
    // via its atomic claim when it picks up the requeued message
    expect(refetched!.status).toBe("partial");
    // pageIndex is preserved for resume
    expect(refetched!.pageIndex).toHaveLength(1);
  });

  it("handles an empty database without error", async () => {
    await expect(recoverStuckFiles()).resolves.not.toThrow();
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it("processes multiple buckets in one pass", async () => {
    const staleQueuedAt = new Date(Date.now() - FAILED_RETRY_COOLDOWN_MS - 60_000);

    await makeEnrichment({
      status: "processing",
      processingStartedAt: new Date(Date.now() - PROCESSING_STUCK_MS - 60_000),
      attempts: 1,
    });
    await makeEnrichment({
      status: "pending",
      queuedAt: new Date(Date.now() - PENDING_STUCK_MS - 60_000),
      attempts: 0,
    });
    await makeEnrichment({
      status: "failed",
      attempts: 2,
      queuedAt: staleQueuedAt,
    });
    await makeEnrichment({
      status: "partial",
      attempts: 1,
      queuedAt: staleQueuedAt,
    });

    await recoverStuckFiles();

    expect(publishSpy).toHaveBeenCalledTimes(4);
  });
});
