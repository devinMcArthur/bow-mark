import https from "https";
import { Kysely } from "kysely";
import { db } from "../db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyDb = db as Kysely<any>;

export const CRITICAL_OPERATIONS = new Set([
  "CreateDailyReport",
  "UpdateDailyReport",
  "CreateEmployeeWork",
  "UpdateEmployeeWork",
  "CreateVehicleWork",
  "UpdateVehicleWork",
  "CreateMaterialShipment",
  "UpdateMaterialShipment",
]);

interface RecordErrorOpts {
  source: string;
  operation?: string;
  errorMessage: string;
  errorCode?: string;
  traceId?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  metadata?: Record<string, unknown>;
}

export async function recordError(opts: RecordErrorOpts): Promise<void> {
  try {
    await anyDb
      .insertInto("telemetry_errors")
      .values({
        source: opts.source,
        operation: opts.operation ?? null,
        error_message: opts.errorMessage,
        error_code: opts.errorCode ?? null,
        trace_id: opts.traceId ?? null,
        user_id: opts.userId ?? null,
        user_name: opts.userName ?? null,
        user_email: opts.userEmail ?? null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
      })
      .execute();
  } catch {
    // fire-and-forget
  }
}

interface RecordOpTimingOpts {
  operationName: string;
  durationMs: number;
  status: "ok" | "error";
  traceId?: string;
}

export async function recordOpTiming(opts: RecordOpTimingOpts): Promise<void> {
  try {
    await anyDb
      .insertInto("telemetry_op_timings")
      .values({
        operation_name: opts.operationName,
        duration_ms: opts.durationMs,
        status: opts.status,
        trace_id: opts.traceId ?? null,
      })
      .execute();
  } catch {
    // fire-and-forget
  }
}

interface RecordConsumerEventOpts {
  eventType: string;
  status: "ok" | "error" | "retry";
  durationMs?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export async function recordConsumerEvent(
  opts: RecordConsumerEventOpts
): Promise<void> {
  try {
    await anyDb
      .insertInto("telemetry_consumer_events")
      .values({
        event_type: opts.eventType,
        status: opts.status,
        duration_ms: opts.durationMs ?? null,
        error_message: opts.errorMessage ?? null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
      })
      .execute();
  } catch {
    // fire-and-forget
  }
}

export async function sendTelegramAlert(message: string): Promise<void> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;
    if (!token || !chatId) return;

    const body = JSON.stringify({ chat_id: chatId, text: `🚨 ${message}` });

    await new Promise<void>((resolve) => {
      const req = https.request(
        {
          hostname: "api.telegram.org",
          path: `/bot${token}/sendMessage`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (res) => {
          res.resume();
          resolve();
        }
      );
      req.on("error", () => resolve());
      req.write(body);
      req.end();
    });
  } catch {
    // fire-and-forget
  }
}

export async function recordErrorWithAlert(opts: RecordErrorOpts): Promise<void> {
  await recordError(opts);

  if (!opts.operation || !CRITICAL_OPERATIONS.has(opts.operation)) return;

  const time = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date());

  const userLine =
    opts.userName || opts.userEmail
      ? `${opts.userName ?? "unknown"} (${opts.userEmail ?? "no email"})`
      : "unauthenticated";

  const message = [
    `CRITICAL ERROR — bow-mark`,
    `Operation: ${opts.operation}`,
    `User: ${userLine}`,
    `Error: ${opts.errorMessage}`,
    `Time: ${time}`,
    `Trace: ${opts.traceId ?? "none"}`,
  ].join("\n");

  await sendTelegramAlert(message);
}
