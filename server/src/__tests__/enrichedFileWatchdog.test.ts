// Hoisted mock replaces publishEnrichedFileCreated with a vi.fn() that
// records calls without touching RabbitMQ. Must be declared BEFORE the
// import of watchdog.ts so vitest hoists it correctly. `vi` is available
// as a global (vitest config enables globals).
vi.mock("../rabbitmq/publisher", () => ({
  publishEnrichedFileCreated: vi.fn().mockResolvedValue(true),
}));

import mongoose from "mongoose";
import { EnrichedFile, File } from "@models";
import { prepareDatabase } from "@testing/vitestDB";
import {
  recoverStuckFiles,
  PROCESSING_STUCK_MS,
  PENDING_STUCK_MS,
  FAILED_RETRY_COOLDOWN_MS,
  MAX_SUMMARY_ATTEMPTS,
} from "../consumer/watchdog";
import { publishEnrichedFileCreated } from "../rabbitmq/publisher";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPublish = publishEnrichedFileCreated as any;

beforeAll(async () => {
  await prepareDatabase();
});

beforeEach(() => {
  mockPublish.mockClear();
});

afterEach(async () => {
  await EnrichedFile.deleteMany({});
  await (File as any).deleteMany({});
});

async function makeFileDoc() {
  // Minimal File doc. Bypasses storage upload by not going through
  // File.createDocument — just writes the schema fields directly.
  return (File as any).create({
    mimetype: "application/pdf",
    description: "test.pdf",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function makeEnrichedFile(overrides: Record<string, any>) {
  const file = await makeFileDoc();
  return (EnrichedFile as any).create({
    file: file._id,
    ...overrides,
  });
}

describe("recoverStuckFiles", () => {
  it("requeues a file stuck in processing past the window", async () => {
    const staleTime = new Date(Date.now() - PROCESSING_STUCK_MS - 60_000);
    const doc = await makeEnrichedFile({
      summaryStatus: "processing",
      processingStartedAt: staleTime,
      summaryAttempts: 2,
    });

    await recoverStuckFiles();

    expect(mockPublish).toHaveBeenCalledTimes(1);
    // Real attempt count is preserved — not reset to 0 (H4 fix)
    expect(mockPublish).toHaveBeenCalledWith(doc._id.toString(), expect.any(String), 2);

    const refetched = await (EnrichedFile as any).findById(doc._id).lean();
    expect(refetched.summaryStatus).toBe("pending");
    expect(refetched.processingStartedAt).toBeUndefined();
  });

  it("does NOT requeue a fresh-processing file (another handler owns it)", async () => {
    const freshTime = new Date(Date.now() - 60_000);
    await makeEnrichedFile({
      summaryStatus: "processing",
      processingStartedAt: freshTime,
    });

    await recoverStuckFiles();

    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("requeues a file stuck in pending past the queue-drain window", async () => {
    const staleTime = new Date(Date.now() - PENDING_STUCK_MS - 60_000);
    const doc = await makeEnrichedFile({
      summaryStatus: "pending",
      queuedAt: staleTime,
    });

    await recoverStuckFiles();

    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockPublish).toHaveBeenCalledWith(
      doc._id.toString(),
      expect.any(String),
      expect.any(Number)
    );
  });

  it("does NOT requeue a pending file with fresh queuedAt (legitimately queued)", async () => {
    const freshTime = new Date(Date.now() - 60_000);
    await makeEnrichedFile({
      summaryStatus: "pending",
      queuedAt: freshTime,
    });

    await recoverStuckFiles();

    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("requeues a failed file past the cooldown under max attempts", async () => {
    const doc = await makeEnrichedFile({
      summaryStatus: "failed",
      summaryAttempts: 2,
      createdAt: new Date(Date.now() - FAILED_RETRY_COOLDOWN_MS - 60_000),
    });

    await recoverStuckFiles();

    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockPublish).toHaveBeenCalledWith(doc._id.toString(), expect.any(String), 2);
  });

  it("skips a failed file that hit MAX_SUMMARY_ATTEMPTS", async () => {
    await makeEnrichedFile({
      summaryStatus: "failed",
      summaryAttempts: MAX_SUMMARY_ATTEMPTS,
      createdAt: new Date(Date.now() - FAILED_RETRY_COOLDOWN_MS - 60_000),
    });

    await recoverStuckFiles();

    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("skips an orphaned file entirely (never retried)", async () => {
    await makeEnrichedFile({
      summaryStatus: "orphaned",
      summaryError: "Source file not found in storage",
      createdAt: new Date(Date.now() - 10 * 60 * 60_000), // 10 hours ago
    });

    await recoverStuckFiles();

    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("requeues a partial file past the cooldown without flipping status", async () => {
    // partial files resume via the handler's claim predicate which allows
    // partial → processing directly. Watchdog must NOT reset them to pending.
    const doc = await makeEnrichedFile({
      summaryStatus: "partial",
      summaryAttempts: 1,
      pageIndex: [{ page: 1, summary: "first" }],
      createdAt: new Date(Date.now() - FAILED_RETRY_COOLDOWN_MS - 60_000),
    });

    await recoverStuckFiles();

    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockPublish).toHaveBeenCalledWith(doc._id.toString(), expect.any(String), 1);

    const refetched = await (EnrichedFile as any).findById(doc._id).lean();
    // Status stays "partial" — the handler will flip it to "processing"
    // via its atomic claim when it picks up the requeued message
    expect(refetched.summaryStatus).toBe("partial");
    // pageIndex is preserved for resume
    expect(refetched.pageIndex).toHaveLength(1);
  });

  it("handles an empty database without error", async () => {
    await expect(recoverStuckFiles()).resolves.not.toThrow();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("processes multiple buckets in one pass", async () => {
    const makeStuck = async (overrides: Record<string, unknown>) =>
      makeEnrichedFile({
        createdAt: new Date(Date.now() - 10 * 60 * 60_000),
        ...overrides,
      });

    await makeStuck({
      summaryStatus: "processing",
      processingStartedAt: new Date(Date.now() - PROCESSING_STUCK_MS - 60_000),
      summaryAttempts: 1,
    });
    await makeStuck({
      summaryStatus: "pending",
      queuedAt: new Date(Date.now() - PENDING_STUCK_MS - 60_000),
      summaryAttempts: 0,
    });
    await makeStuck({
      summaryStatus: "failed",
      summaryAttempts: 3,
    });
    await makeStuck({
      summaryStatus: "partial",
      summaryAttempts: 1,
    });

    await recoverStuckFiles();

    expect(mockPublish).toHaveBeenCalledTimes(4);
  });
});
