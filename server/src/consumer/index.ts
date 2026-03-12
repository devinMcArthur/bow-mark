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
import { ConsumeMessage } from "amqplib";
import {
  getChannel,
  setupTopology,
  closeConnection as closeRabbitMQ,
  RABBITMQ_CONFIG,
} from "../rabbitmq";
import {
  checkConnection as checkPostgres,
  closeConnection as closePostgres,
} from "../db";
import type { SyncMessage, TenderFileSummaryMessage, SpecFileSummaryMessage } from "../rabbitmq/publisher";
import { publishTenderFileCreated, publishSpecFileCreated } from "../rabbitmq/publisher";
import { Tender, System } from "@models";
import {
  dailyReportSyncHandler,
  employeeWorkSyncHandler,
  vehicleWorkSyncHandler,
  materialShipmentSyncHandler,
  productionSyncHandler,
  invoiceSyncHandler,
  tenderFileSummaryHandler,
  specFileSummaryHandler,
} from "./handlers";

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
  const message: SyncMessage = JSON.parse(content);
  const routingKey = msg.fields.routingKey;

  console.log(`[Consumer] Processing ${routingKey}: ${message.mongoId}`);

  try {
    // Route to appropriate handler based on queue
    switch (queueName) {
      case RABBITMQ_CONFIG.queues.dailyReport.name:
        await dailyReportSyncHandler.handle(message);
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
        await employeeWorkSyncHandler.handle(message);
        break;

      case RABBITMQ_CONFIG.queues.vehicleWork.name:
        await vehicleWorkSyncHandler.handle(message);
        break;

      case RABBITMQ_CONFIG.queues.materialShipment.name:
        await materialShipmentSyncHandler.handle(message);
        break;

      case RABBITMQ_CONFIG.queues.production.name:
        await productionSyncHandler.handle(message);
        break;

      case RABBITMQ_CONFIG.queues.invoice.name:
        await invoiceSyncHandler.handle(message);
        break;

      case RABBITMQ_CONFIG.queues.tenderFile.name: {
        const tenderMsg: TenderFileSummaryMessage = JSON.parse(content);
        await tenderFileSummaryHandler.handle(tenderMsg);
        break;
      }

      case RABBITMQ_CONFIG.queues.specFile.name: {
        const specMsg: SpecFileSummaryMessage = JSON.parse(content);
        await specFileSummaryHandler.handle(specMsg);
        break;
      }

      default:
        console.warn(`[Consumer] Unknown queue: ${queueName}`);
    }

    return true;
  } catch (error) {
    console.error(`[Consumer] Error processing ${routingKey}:`, error);
    return false;
  }
}

/**
 * On startup, reset any files stuck in "processing" back to "pending" and
 * republish their messages. This recovers from a consumer crash mid-processing.
 */
async function recoverStuckFiles(): Promise<void> {
  // Tender files
  const tenders = await Tender.find({ "files.summaryStatus": "processing" }).lean();
  for (const tender of tenders) {
    for (const file of tender.files) {
      if (file.summaryStatus !== "processing") continue;
      await Tender.findOneAndUpdate(
        { _id: tender._id, "files._id": file._id },
        { $set: { "files.$.summaryStatus": "pending" } }
      );
      if (!file.file) continue;
      await publishTenderFileCreated(
        tender._id.toString(),
        file._id.toString(),
        file.file.toString()
      );
      console.log(`[Consumer] Recovered stuck tender file ${file._id}`);
    }
  }

  // Spec files
  const system = await System.getSystem();
  if (system) {
    for (const specFile of system.specFiles ?? []) {
      if (specFile.summaryStatus !== "processing") continue;
      await System.findOneAndUpdate(
        { "specFiles._id": specFile._id },
        { $set: { "specFiles.$.summaryStatus": "pending" } }
      );
      if (!specFile.file) continue;
      await publishSpecFileCreated(
        specFile._id.toString(),
        specFile.file.toString()
      );
      console.log(`[Consumer] Recovered stuck spec file ${specFile._id}`);
    }
  }
}

/**
 * Start consuming from all sync queues
 */
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

  // Reset any files stuck in "processing" from a previous crash
  await recoverStuckFiles();

  const channel = await getChannel();

  // Consume from each queue
  for (const queueConfig of Object.values(RABBITMQ_CONFIG.queues)) {
    await channel.consume(
      queueConfig.name,
      async (msg) => {
        if (!msg) {
          console.log(`[Consumer] Consumer cancelled on ${queueConfig.name}`);
          return;
        }

        const success = await processMessage(queueConfig.name, msg);

        if (success) {
          // Acknowledge - message processed successfully
          channel.ack(msg);
        } else {
          // Negative acknowledge - requeue the message for retry
          // The second param (false) means don't requeue immediately
          // (prevents infinite retry loops)
          // In production, you might use a dead-letter queue instead
          channel.nack(msg, false, false);
          console.log("[Consumer] Message rejected and discarded");
        }
      },
      {
        noAck: false, // Manual acknowledgment
      }
    );

    console.log(`[Consumer] Listening on queue: ${queueConfig.name}`);
  }

  console.log("[Consumer] Ready and waiting for messages...");
}

/**
 * Graceful shutdown
 */
async function shutdown(): Promise<void> {
  console.log("\n[Consumer] Shutting down...");

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
