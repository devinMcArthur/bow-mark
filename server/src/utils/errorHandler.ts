import { logger } from "@logger";

const errorHandler = (text: string, unknown: unknown) => {
  let message;
  if (typeof unknown === "string") {
    message = unknown;
  } else if (unknown instanceof Error) {
    message = unknown.message;
  }

  logger.error(`${text}${message ? `: ${message}` : ""}`);
};

export default errorHandler;
