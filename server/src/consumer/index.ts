/**
 * RabbitMQ Consumer - Entry point
 *
 * Run with: npm run start:consumer
 *
 * This process:
 * 1. Connects to MongoDB (to read source documents)
 * 2. Connects to PostgreSQL (to write transformed data)
 * 3. Connects to RabbitMQ (to receive sync events)
 * 4. Processes messages and transforms data to the reporting schema
 *
 * Resilience:
 * - Dedicated enriched-file channel with automatic reconnect on close
 * - Periodic watchdog that recovers files stuck in "processing" / "pending" / "failed"
 *   based on timestamp eligibility
 * - Startup sweep of stuck files
 */

import "reflect-metadata";
import * as dotenv from "dotenv";
import path from "path";

// Setup environment variables
if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
  dotenv.config({ path: path.join(__dirname, "..", "..", ".env.development") });
}

import http from "http";
import mongoose from "mongoose";
import { Channel, ConsumeMessage } from "amqplib";
import {
  getChannel,
  getConnection,
  setupTopology,
  closeConnection as closeRabbitMQ,
  RABBITMQ_CONFIG,
} from "../rabbitmq";
import {
  checkConnection as checkPostgres,
  closeConnection as closePostgres,
} from "../db";
import type { SyncMessage, EnrichedFileSummaryMessage } from "../rabbitmq/publisher";
import { publishEnrichedFileCreated } from "../rabbitmq/publisher";
import { EnrichedFile } from "@models";
import {
  dailyReportSyncHandler,
  employeeWorkSyncHandler,
  vehicleWorkSyncHandler,
  materialShipmentSyncHandler,
  productionSyncHandler,
  invoiceSyncHandler,
  enrichedFileSummaryHandler,
} from "./handlers";

// ─── Resilience tuning ────────────────────────────────────────────────────────

/** Prefetch for enriched-file channel. 2 allows 2 concurrent summarizations. */
const ENRICHED_FILE_PREFETCH = 2;

/** Delay before retrying channel setup after an error/close event. */
const RECONNECT_DELAY_MS = 5_000;

/** How often the watchdog scans for stuck files. */
const WATCHDOG_INTERVAL_MS = 10 * 60_000; // 10 min

/** Max time a file can be in "processing" before the watchdog reclaims it. */
const PROCESSING_STUCK_MS = 90 * 60_000; // 90 min (generous — large PDFs can take 45+ min)

/** Max time a file can be in "pending" before the watchdog republishes it. */
const PENDING_STUCK_MS = 10 * 60_000; // 10 min

/** Cooldown before retrying a "failed" file. */
const FAILED_RETRY_COOLDOWN_MS = 60 * 60_000; // 1 hr

/** Max attempts before giving up on a file entirely. */
const MAX_SUMMARY_ATTEMPTS = 5;

// ─── State ────────────────────────────────────────────────────────────────────

let isShuttingDown = false;
let watchdogTimer: NodeJS.Timeout | null = null;

/**
 * Process a message from a queue
 *
 * @returns true if message was processed successfully, false otherwise
 */
async function processMessage(
  queueName: string,
  msg: ConsumeMessage
): Promise<boolean> {
  const content = msg.content.toString();
  const routingKey = msg.fields.routingKey;

  // Both SyncMessage and EnrichedFileSummaryMessage live on the wire as JSON;
  // parse once as a loose shape and narrow per handler.
  const raw = JSON.parse(content) as Record<string, unknown>;
  const logId = (raw.mongoId as string) ?? (raw.enrichedFileId as string) ?? "?";
  console.log(`[Consumer] Processing ${routingKey}: ${logId}`);

  try {
    // Route to appropriate handler based on queue
    switch (queueName) {
      case RABBITMQ_CONFIG.queues.dailyReport.name:
        await dailyReportSyncHandler.handle(raw as unknown as SyncMessage);
        break;

      case RABBITMQ_CONFIG.queues.employee.name:
        // TODO: Implement employee sync handler
        console.log("[Consumer] Employee sync not yet implemented");
        break;

      case RABBITMQ_CONFIG.queues.jobsite.name:
        // TODO: Implement jobsite sync handler
        console.log("[Consumer] Jobsite sync not yet implemented");
        break;

      case RABBITMQ_CONFIG.queues.employeeWork.name:
        await employeeWorkSyncHandler.handle(raw as unknown as SyncMessage);
        break;

      case RABBITMQ_CONFIG.queues.vehicleWork.name:
        await vehicleWorkSyncHandler.handle(raw as unknown as SyncMessage);
        break;

      case RABBITMQ_CONFIG.queues.materialShipment.name:
        await materialShipmentSyncHandler.handle(raw as unknown as SyncMessage);
        break;

      case RABBITMQ_CONFIG.queues.production.name:
        await productionSyncHandler.handle(raw as unknown as SyncMessage);
        break;

      case RABBITMQ_CONFIG.queues.invoice.name:
        await invoiceSyncHandler.handle(raw as unknown as SyncMessage);
        break;

      case RABBITMQ_CONFIG.queues.enrichedFile.name:
        await enrichedFileSummaryHandler.handle(
          raw as unknown as EnrichedFileSummaryMessage
        );
        break;

      default:
        console.warn(`[Consumer] Unknown queue: ${queueName}`);
    }

    return true;
  } catch (error) {
    console.error(`[Consumer] Error processing ${routingKey}:`, error);
    return false;
  }
}

// ─── Watchdog ─────────────────────────────────────────────────────────────────

/**
 * Scan for files stuck in processing / pending / failed states and recover them.
 * Called at startup and on a periodic interval.
 *
 * Recovery uses timestamp eligibility so we never race with an in-flight handler.
 */
async function recoverStuckFiles(): Promise<void> {
  const now = Date.now();
  const processingCutoff = new Date(now - PROCESSING_STUCK_MS);
  const pendingCutoff = new Date(now - PENDING_STUCK_MS);
  const failedCutoff = new Date(now - FAILED_RETRY_COOLDOWN_MS);

  // Files in "processing" whose handler exceeded the max processing window.
  // Covers: consumer crash mid-handler, broker channel timeout killing ack.
  const stuckProcessing = await EnrichedFile.find({
    summaryStatus: "processing",
    $or: [
      { processingStartedAt: { $lt: processingCutoff } },
      { processingStartedAt: { $exists: false } }, // legacy docs without the field
    ],
  })
    .populate("file")
    .lean();

  // Files in "pending" older than the pending cutoff (createdAt, since updatedAt
  // isn't tracked). Covers: publish-to-queue failure, broker drop.
  const stuckPending = await EnrichedFile.find({
    summaryStatus: "pending",
    createdAt: { $lt: pendingCutoff },
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

  const total = stuckProcessing.length + stuckPending.length + stuckFailed.length;
  if (total === 0) return;

  console.warn(
    `[Watchdog] Found stuck files — processing: ${stuckProcessing.length}, ` +
    `pending: ${stuckPending.length}, failed: ${stuckFailed.length}`
  );

  const requeue = async (
    files: Array<{ _id: mongoose.Types.ObjectId; file?: unknown }>,
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

      await EnrichedFile.findByIdAndUpdate(enrichedFile._id, {
        $set: { summaryStatus: "pending" },
        $unset: { processingStartedAt: "", summaryError: "" },
      });
      const published = await publishEnrichedFileCreated(
        enrichedFile._id.toString(),
        fileId,
        0
      );
      if (published) {
        console.log(
          `[Watchdog] Requeued ${bucket} file ${enrichedFile._id} → ${fileId}`
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
}

function startWatchdog(): void {
  if (watchdogTimer) return;
  watchdogTimer = setInterval(() => {
    recoverStuckFiles().catch((err) => {
      console.error("[Watchdog] Recovery pass failed:", err);
    });
  }, WATCHDOG_INTERVAL_MS);
  console.log(`[Watchdog] Started — scanning every ${WATCHDOG_INTERVAL_MS / 60_000} min`);
}

function stopWatchdog(): void {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

// ─── Enriched file channel (with reconnect) ──────────────────────────────────

/**
 * Create the dedicated enriched-file channel and register its consumer.
 * On channel close (e.g. broker timeout), schedules a reconnect unless
 * the consumer is shutting down.
 */
async function setupEnrichedFileChannel(): Promise<Channel> {
  const conn = await getConnection();
  const ch = await conn.createChannel();
  await ch.prefetch(ENRICHED_FILE_PREFETCH);

  ch.on("error", (err: Error) => {
    console.error("[RabbitMQ] Enriched file channel error:", err.message);
  });
  ch.on("close", () => {
    console.log("[RabbitMQ] Enriched file channel closed");
    if (isShuttingDown) return;
    scheduleEnrichedFileChannelReconnect();
  });

  const queueName = RABBITMQ_CONFIG.queues.enrichedFile.name;
  await ch.consume(
    queueName,
    async (msg) => {
      if (!msg) {
        console.log(`[Consumer] Consumer cancelled on ${queueName}`);
        return;
      }
      const success = await processMessage(queueName, msg);
      try {
        if (success) {
          ch.ack(msg);
        } else {
          ch.nack(msg, false, false);
          console.log("[Consumer] Enriched file message rejected (watchdog will recover)");
        }
      } catch (ackErr) {
        // Channel likely dead (e.g. broker timeout). The message will be
        // redelivered when a new channel is established; watchdog is the
        // ultimate safety net.
        console.error(
          `[Consumer] Failed to ${success ? "ack" : "nack"} enriched file message — ` +
          `channel likely closed. Watchdog will recover.`,
          ackErr
        );
      }
    },
    { noAck: false }
  );

  console.log(
    `[Consumer] Listening on queue: ${queueName} (prefetch=${ENRICHED_FILE_PREFETCH})`
  );
  return ch;
}

function scheduleEnrichedFileChannelReconnect(): void {
  if (isShuttingDown) return;
  console.log(
    `[Consumer] Scheduling enriched file channel reconnect in ${RECONNECT_DELAY_MS / 1000}s...`
  );
  setTimeout(() => {
    if (isShuttingDown) return;
    setupEnrichedFileChannel()
      .then(() => console.log("[Consumer] Enriched file channel reconnected"))
      .catch((err) => {
        console.error("[Consumer] Enriched file channel reconnect failed:", err);
        scheduleEnrichedFileChannelReconnect();
      });
  }, RECONNECT_DELAY_MS);
}

// ─── Startup ─────────────────────────────────────────────────────────────────

async function startConsumer(): Promise<void> {
  console.log("[Consumer] Starting up...");

  // Connect to MongoDB
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    });
    console.log("[Consumer] MongoDB connected");
  } else {
    throw new Error("MONGO_URI environment variable is required");
  }

  // Verify PostgreSQL connection
  const pgConnected = await checkPostgres();
  if (!pgConnected) {
    throw new Error("Failed to connect to PostgreSQL");
  }
  console.log("[Consumer] PostgreSQL connected");

  // Set up RabbitMQ exchange and queues
  await setupTopology();

  // Initial sweep — recover anything stuck from a previous run
  await recoverStuckFiles().catch((err) => {
    console.error("[Consumer] Startup recovery failed (continuing):", err);
  });

  const channel = await getChannel();

  // Set up enriched file channel (prefetch + reconnect)
  await setupEnrichedFileChannel();

  // Consume from remaining queues on the shared channel
  for (const queueConfig of Object.values(RABBITMQ_CONFIG.queues)) {
    if (queueConfig.name === RABBITMQ_CONFIG.queues.enrichedFile.name) continue;

    await channel.consume(
      queueConfig.name,
      async (msg) => {
        if (!msg) {
          console.log(`[Consumer] Consumer cancelled on ${queueConfig.name}`);
          return;
        }

        const success = await processMessage(queueConfig.name, msg);

        try {
          if (success) {
            channel.ack(msg);
          } else {
            channel.nack(msg, false, false);
            console.log("[Consumer] Message rejected and discarded");
          }
        } catch (ackErr) {
          console.error(
            `[Consumer] Failed to ${success ? "ack" : "nack"} message on ${queueConfig.name}:`,
            ackErr
          );
        }
      },
      {
        noAck: false, // Manual acknowledgment
      }
    );

    console.log(`[Consumer] Listening on queue: ${queueConfig.name}`);
  }

  // Start the periodic watchdog
  startWatchdog();

  console.log("[Consumer] Ready and waiting for messages...");
}

/**
 * Graceful shutdown
 */
async function shutdown(): Promise<void> {
  console.log("\n[Consumer] Shutting down...");
  isShuttingDown = true;
  stopWatchdog();

  try {
    await closeRabbitMQ();
    await closePostgres();
    await mongoose.disconnect();
    console.log("[Consumer] All connections closed");
  } catch (error) {
    console.error("[Consumer] Error during shutdown:", error);
  }

  process.exit(0);
}

// Handle shutdown signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Handle uncaught errors
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "[Consumer] Unhandled Rejection at:",
    promise,
    "reason:",
    reason
  );
});

// Minimal health server — returns 503 until consumer is ready, then 200
let consumerReady = false;
http.createServer((_req, res) => {
  res.writeHead(consumerReady ? 200 : 503);
  res.end();
}).listen(9090);

// Start the consumer
startConsumer()
  .then(() => { consumerReady = true; })
  .catch((error) => {
    console.error("[Consumer] Failed to start:", error);
    process.exit(1);
  });
