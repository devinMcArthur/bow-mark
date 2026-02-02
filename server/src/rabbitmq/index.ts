/**
 * RabbitMQ connection management
 *
 * Provides a singleton connection and channel for the application.
 * Handles reconnection logic and graceful shutdown.
 */

import amqp from "amqplib";
import { RABBITMQ_CONFIG } from "./config";

// Let TypeScript infer types from the amqplib API
let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let channel: Awaited<ReturnType<typeof amqp.connect>>["createChannel"] extends () => Promise<infer C> ? C | null : never = null;

/**
 * Get or create a RabbitMQ connection
 *
 * The connection is the TCP socket to RabbitMQ. It's expensive to create,
 * so we maintain a single connection per process.
 */
export async function getConnection() {
  if (connection) {
    return connection;
  }

  const { hostname, port, username, password, vhost } =
    RABBITMQ_CONFIG.connection;

  const url = `amqp://${username}:${password}@${hostname}:${port}/${encodeURIComponent(vhost)}`;

  console.log(
    `[RabbitMQ] Connecting to ${hostname}:${port}, vhost: ${vhost}...`
  );

  const conn = await amqp.connect(url);
  connection = conn;

  // Handle connection errors and closure
  conn.on("error", (err: Error) => {
    console.error("[RabbitMQ] Connection error:", err.message);
    connection = null;
    channel = null;
  });

  conn.on("close", () => {
    console.log("[RabbitMQ] Connection closed");
    connection = null;
    channel = null;
  });

  console.log("[RabbitMQ] Connected successfully");
  return conn;
}

/**
 * Get or create a channel
 *
 * A channel is a virtual connection inside the TCP connection.
 * Most operations (publish, consume, declare queues) happen on channels.
 * Channels are lightweight - you can have many per connection.
 *
 * We use one channel for simplicity, but you could use separate channels
 * for publishing vs consuming if needed.
 */
export async function getChannel() {
  if (channel) {
    return channel;
  }

  const conn = await getConnection();
  const ch = await conn.createChannel();
  channel = ch;

  // Prefetch limits how many unacknowledged messages the consumer receives at once.
  // This prevents a fast producer from overwhelming a slow consumer.
  // With prefetch(10), RabbitMQ sends up to 10 messages, then waits for acks.
  await ch.prefetch(10);

  ch.on("error", (err: Error) => {
    console.error("[RabbitMQ] Channel error:", err.message);
    channel = null;
  });

  ch.on("close", () => {
    console.log("[RabbitMQ] Channel closed");
    channel = null;
  });

  console.log("[RabbitMQ] Channel created");
  return ch;
}

/**
 * Set up the exchange and queues
 *
 * This is idempotent - safe to call multiple times. RabbitMQ will only
 * create the exchange/queues if they don't exist, and verify the config
 * matches if they do exist.
 *
 * Call this once when your application starts (both publisher and consumer
 * should call it to ensure the topology exists).
 */
export async function setupTopology(): Promise<void> {
  const ch = await getChannel();
  const { exchange, queues } = RABBITMQ_CONFIG;

  // Assert the exchange exists (creates if not)
  await ch.assertExchange(exchange.name, exchange.type, exchange.options);
  console.log(`[RabbitMQ] Exchange "${exchange.name}" ready`);

  // Assert each queue and bind it to the exchange
  for (const [, queueConfig] of Object.entries(queues)) {
    // assertQueue creates the queue if it doesn't exist
    await ch.assertQueue(queueConfig.name, queueConfig.options);

    // Bind the queue to the exchange with each routing pattern
    for (const routingPattern of queueConfig.bindings) {
      await ch.bindQueue(queueConfig.name, exchange.name, routingPattern);
    }

    console.log(
      `[RabbitMQ] Queue "${queueConfig.name}" ready (bindings: ${queueConfig.bindings.join(", ")})`
    );
  }
}

/**
 * Gracefully close the connection
 *
 * Call this during application shutdown. Closing the connection
 * automatically closes all channels.
 */
export async function closeConnection(): Promise<void> {
  if (channel) {
    try {
      await channel.close();
    } catch {
      // Channel might already be closed
    }
    channel = null;
  }

  if (connection) {
    try {
      await connection.close();
    } catch {
      // Connection might already be closed
    }
    connection = null;
  }

  console.log("[RabbitMQ] Connection closed gracefully");
}

// Re-export config for convenience
export { RABBITMQ_CONFIG, ROUTING_KEYS } from "./config";
export type { EntityType, ActionType } from "./config";
