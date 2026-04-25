import winston from "winston";
import { recordError } from "@lib/telemetryDb";

const consoleTransport = new winston.transports.Console({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
});

class TelemetryTransport extends winston.Transport {
  constructor() {
    super({ level: "error" });
  }

  log(info: winston.LogEntry, callback: () => void): void {
    setImmediate(() => this.emit("logged", info));
    const message =
      typeof info.message === "string"
        ? info.message
        : JSON.stringify(info.message);
    recordError({
      source: "logger",
      errorMessage: message,
      metadata: info.meta as Record<string, unknown> | undefined,
    }).catch(() => {});
    callback();
  }
}

export const logger = winston.createLogger({
  transports: [consoleTransport, new TelemetryTransport()],
});

logger.on("error", (error) => {
  console.error("Error in logger caught", error);
});
