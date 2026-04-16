import * as dotenv from "dotenv";
import path from "path";
import "reflect-metadata";

// Setup environment variables
const production = process.env.NODE_ENV === "production";
if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
  dotenv.config({ path: path.join(__dirname, "..", ".env.development") });
}

import updateDocuments from "@utils/updateDocuments";
import workers from "@workers";
import { Company, System } from "@models";
import mongoose from "mongoose";
import createApp from "./app";
import { bindEventEmitters } from "@events";
import { setupTopology } from "./rabbitmq";

let workerEnabled = true,
  apiEnabled = true;

if (process.env.APP_TYPE === "api") {
  apiEnabled = true;
  workerEnabled = false;
} else if (process.env.APP_TYPE === "worker") {
  workerEnabled = true;
  apiEnabled = false;
}

const main = async () => {
  try {
    console.log(process.env.NODE_ENV);
    if (process.env.NODE_ENV !== "test" && process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      });
      console.log("MongoDB Connected");
    }

    // Bind Event Emitters
    bindEventEmitters();

    // Eagerly connect to RabbitMQ so the first file upload/retry doesn't
    // have to wait for the lazy connection. If RabbitMQ isn't available
    // yet, the publisher's retry logic (3 attempts with backoff) handles
    // it per-call — this just warms the connection for the common case.
    if (process.env.NODE_ENV !== "test") {
      setupTopology().catch((err) =>
        console.warn("[RabbitMQ] Eager connect failed (will retry lazily):", err.message)
      );
    }

    // Start API server
    if (apiEnabled) {
      const port = process.env.PORT || 8080;

      const app = await createApp();

      const server = app.listen(port, () =>
        console.log(`Server running on port: ${port}`)
      );

      // Set timeout to 10 minutes
      server.setTimeout(10 * 60 * 1000);
    }

    if (process.env.NODE_ENV !== "test" && !process.env.SKIP_POST_STARTUP) {
      await System.validateSystem();
      await Company.validateCompanies();

      // Enable worker
      if (workerEnabled) {
        await updateDocuments();

        workers();
      }
    }
  } catch (error: unknown) {
    console.error("Unknown server error:", error);
  }
};

main().catch((err) => console.error(err));
