/**
 * RabbitMQ message publishers
 *
 * These functions are called from Mongoose post-save hooks (or manually)
 * to notify consumers that an entity has changed.
 *
 * Messages are JSON payloads containing just the mongo_id. The consumer
 * fetches the full document from MongoDB - this keeps messages small and
 * ensures the consumer always sees the latest state.
 */

import { getChannel, setupTopology, RABBITMQ_CONFIG, ROUTING_KEYS } from ".";
import type { ActionType } from "./config";

/**
 * Message payload structure
 *
 * We only send the ID, not the full document. Why?
 * 1. Smaller messages = faster transport
 * 2. Consumer always fetches latest state (no stale data)
 * 3. If multiple updates happen quickly, consumer processes latest
 */
export interface SyncMessage {
  mongoId: string;
  action: ActionType;
  timestamp: string;
}

/**
 * Publish a message to the sync exchange
 *
 * @param routingKey - Determines which queue(s) receive the message
 * @param message - The payload to send
 *
 * The message is JSON-serialized and marked as persistent, meaning
 * RabbitMQ writes it to disk. This survives broker restarts.
 */
async function publish(routingKey: string, message: SyncMessage): Promise<boolean> {
  try {
    const channel = await getChannel();

    // Ensure topology exists (idempotent)
    await setupTopology();

    const success = channel.publish(
      RABBITMQ_CONFIG.exchange.name,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true, // Survive broker restarts
        contentType: "application/json",
      }
    );

    if (success) {
      console.log(`[RabbitMQ] Published ${routingKey}:`, message.mongoId);
    } else {
      // publish() returns false if the channel's write buffer is full.
      // The message is still queued internally - this just means backpressure.
      console.warn(`[RabbitMQ] Write buffer full for ${routingKey}`);
    }

    return success;
  } catch (error) {
    console.error(`[RabbitMQ] Failed to publish ${routingKey}:`, error);
    // Don't throw - we don't want sync failures to break the main operation
    return false;
  }
}

/**
 * Create a typed publisher for an entity type
 */
function createPublisher(routingKeys: Record<ActionType, string>) {
  return async (action: ActionType, mongoId: string): Promise<boolean> => {
    const message: SyncMessage = {
      mongoId,
      action,
      timestamp: new Date().toISOString(),
    };
    return publish(routingKeys[action], message);
  };
}

/**
 * Publish an employee change event
 *
 * Usage in Mongoose hook:
 *   EmployeeSchema.post('save', async function() {
 *     await publishEmployeeChange('updated', this._id.toString());
 *   });
 */
export const publishEmployeeChange = createPublisher(ROUTING_KEYS.employee);

/**
 * Publish a jobsite change event
 */
export const publishJobsiteChange = createPublisher(ROUTING_KEYS.jobsite);

/**
 * Publish a crew change event
 *
 * Note: Crew changes go to the daily_report queue (see config bindings)
 * because daily reports reference crews.
 */
export const publishCrewChange = createPublisher(ROUTING_KEYS.crew);

/**
 * Publish a daily report change event
 */
export const publishDailyReportChange = createPublisher(ROUTING_KEYS.dailyReport);

/**
 * Publish an Employee Work change event
 */
export const publishEmployeeWorkChange = createPublisher(ROUTING_KEYS.employeeWork);

/**
 * Publish a Vehicle Work change event
 */
export const publishVehicleWorkChange = createPublisher(ROUTING_KEYS.vehicleWork);

/**
 * Publish a Material Shipment change event
 */
export const publishMaterialShipmentChange = createPublisher(ROUTING_KEYS.materialShipment);

/**
 * Publish a Production change event
 */
export const publishProductionChange = createPublisher(ROUTING_KEYS.production);

/**
 * Publish an Invoice change event
 */
export const publishInvoiceChange = createPublisher(ROUTING_KEYS.invoice);
