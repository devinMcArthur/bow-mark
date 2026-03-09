import winston from "winston";

const consoleTransport = new winston.transports.Console({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
});

export const logger = winston.createLogger({
  transports: [consoleTransport],
});

/**
 * Compulsory error handling
 */

logger.on("error", (error) => {
  console.error("Error in logger caught", error);
});
