import mongoose from "mongoose";
import { EnrichedFile } from "@models";
import { prepareDatabase } from "@testing/vitestDB";
import {
  claimEnrichedFile,
  isStorageNotFoundError,
  messageRetryDelayMs,
  HANDLER_OWNERSHIP_WINDOW_MS,
} from "../consumer/handlers/enrichedFileSummaryHandler";

beforeAll(async () => {
  await prepareDatabase();
});

afterEach(async () => {
  await EnrichedFile.deleteMany({});
});

function fakeFileRef() {
  return new mongoose.Types.ObjectId();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function makeEnrichedFile(data: Record<string, any>) {
  return (EnrichedFile as any).create({
    file: fakeFileRef(),
    ...data,
  });
}

describe("claimEnrichedFile", () => {
  it("claims a pending file and bumps processingVersion to 1", async () => {
    const doc = await makeEnrichedFile({ summaryStatus: "pending" });
    const claimed = await claimEnrichedFile(doc._id.toString());

    expect(claimed).not.toBeNull();
    expect(claimed.summaryStatus).toBe("processing");
    expect(claimed.processingVersion).toBe(1);
    expect(claimed.summaryAttempts).toBe(1);
    expect(claimed.processingStartedAt).toBeInstanceOf(Date);
  });

  it("claims a partial file so pageIndex generation can resume", async () => {
    const doc = await makeEnrichedFile({
      summaryStatus: "partial",
      processingVersion: 2,
      pageIndex: [
        { page: 1, summary: "first page" },
        { page: 2, summary: "second page" },
      ],
    });
    const claimed = await claimEnrichedFile(doc._id.toString());

    expect(claimed).not.toBeNull();
    expect(claimed.summaryStatus).toBe("processing");
    // processingVersion bumps from 2 to 3 so stale handlers can't clobber state
    expect(claimed.processingVersion).toBe(3);
    // Existing pageIndex is preserved so the resume seed is available
    expect(claimed.pageIndex).toHaveLength(2);
  });

  it("claims a stale-processing file (previous handler died mid-run)", async () => {
    const staleTime = new Date(Date.now() - HANDLER_OWNERSHIP_WINDOW_MS - 60_000);
    const doc = await makeEnrichedFile({
      summaryStatus: "processing",
      processingStartedAt: staleTime,
      processingVersion: 1,
    });
    const claimed = await claimEnrichedFile(doc._id.toString());

    expect(claimed).not.toBeNull();
    expect(claimed.processingVersion).toBe(2);
  });

  it("claims a legacy processing file with missing processingStartedAt", async () => {
    const doc = await makeEnrichedFile({ summaryStatus: "processing" });
    // No processingStartedAt — legacy doc path
    const claimed = await claimEnrichedFile(doc._id.toString());

    expect(claimed).not.toBeNull();
    expect(claimed.summaryStatus).toBe("processing");
  });

  it("refuses to claim a ready file (terminal success)", async () => {
    const doc = await makeEnrichedFile({ summaryStatus: "ready" });
    const claimed = await claimEnrichedFile(doc._id.toString());
    expect(claimed).toBeNull();
  });

  it("refuses to claim a failed file (stray redelivery)", async () => {
    const doc = await makeEnrichedFile({ summaryStatus: "failed" });
    const claimed = await claimEnrichedFile(doc._id.toString());
    expect(claimed).toBeNull();
  });

  it("refuses to claim an orphaned file (source gone, terminal)", async () => {
    const doc = await makeEnrichedFile({ summaryStatus: "orphaned" });
    const claimed = await claimEnrichedFile(doc._id.toString());
    expect(claimed).toBeNull();
  });

  it("refuses to claim a fresh-processing file (owned by another handler)", async () => {
    const freshTime = new Date(Date.now() - 60_000); // 1 min ago — well within ownership window
    const doc = await makeEnrichedFile({
      summaryStatus: "processing",
      processingStartedAt: freshTime,
    });
    const claimed = await claimEnrichedFile(doc._id.toString());
    expect(claimed).toBeNull();
  });

  it("resolves concurrent claims so exactly one wins", async () => {
    // This is the core reason we replaced the read-then-write idempotency
    // guard with findOneAndUpdate — MongoDB atomicity means one query
    // matches the `pending` predicate and the other observes `processing`.
    const doc = await makeEnrichedFile({ summaryStatus: "pending" });

    const [a, b] = await Promise.all([
      claimEnrichedFile(doc._id.toString()),
      claimEnrichedFile(doc._id.toString()),
    ]);

    const winners = [a, b].filter((x) => x !== null);
    const losers = [a, b].filter((x) => x === null);
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(winners[0].processingVersion).toBe(1);
  });

  it("increments processingVersion across sequential claims", async () => {
    const doc = await makeEnrichedFile({ summaryStatus: "pending" });

    const c1 = await claimEnrichedFile(doc._id.toString());
    expect(c1.processingVersion).toBe(1);

    // Simulate the file landing in partial status after the first claim
    // (summary succeeded, pageIndex crashed partway). The watchdog would
    // then republish, and the next claim should bump version to 2.
    await (EnrichedFile as any).findByIdAndUpdate(doc._id, {
      $set: { summaryStatus: "partial" },
    });

    const c2 = await claimEnrichedFile(doc._id.toString());
    expect(c2.processingVersion).toBe(2);
  });

  it("returns null when the file does not exist", async () => {
    const ghostId = new mongoose.Types.ObjectId().toString();
    const claimed = await claimEnrichedFile(ghostId);
    expect(claimed).toBeNull();
  });
});

describe("isStorageNotFoundError", () => {
  it("detects NoSuchKey via code", () => {
    expect(isStorageNotFoundError({ code: "NoSuchKey" })).toBe(true);
  });

  it("detects NotFound via code", () => {
    expect(isStorageNotFoundError({ code: "NotFound" })).toBe(true);
  });

  it("detects NoSuchKey via name (newer SDK shape)", () => {
    expect(isStorageNotFoundError({ name: "NoSuchKey" })).toBe(true);
  });

  it("detects 404 via statusCode", () => {
    expect(isStorageNotFoundError({ statusCode: 404 })).toBe(true);
  });

  it("returns false for unrelated AWS errors", () => {
    expect(isStorageNotFoundError({ code: "AccessDenied" })).toBe(false);
    expect(isStorageNotFoundError({ code: "NetworkingError" })).toBe(false);
    expect(isStorageNotFoundError({ statusCode: 500 })).toBe(false);
  });

  it("returns false for null / undefined / empty", () => {
    expect(isStorageNotFoundError(null)).toBe(false);
    expect(isStorageNotFoundError(undefined)).toBe(false);
    expect(isStorageNotFoundError({})).toBe(false);
  });

  it("returns false for plain Error instances", () => {
    expect(isStorageNotFoundError(new Error("oops"))).toBe(false);
  });
});

describe("messageRetryDelayMs", () => {
  it("returns 2 minutes for attempt 0", () => {
    expect(messageRetryDelayMs(0)).toBe(2 * 60_000);
  });

  it("returns 4 minutes for attempt 1", () => {
    expect(messageRetryDelayMs(1)).toBe(4 * 60_000);
  });

  it("returns 8 minutes for attempt 2", () => {
    expect(messageRetryDelayMs(2)).toBe(8 * 60_000);
  });

  it("caps at 8 minutes for attempt 3+", () => {
    expect(messageRetryDelayMs(3)).toBe(8 * 60_000);
    expect(messageRetryDelayMs(5)).toBe(8 * 60_000);
    expect(messageRetryDelayMs(10)).toBe(8 * 60_000);
  });
});
