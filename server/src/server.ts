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
import saveAll from "@testing/saveAll";

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
    if (process.env.NODE_ENV !== "test" && process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      });
      console.log("MongoDB Connected");

      if (!production) {
        // await seedDatabase();
      }
    }

    // Bind Event Emitters
    bindEventEmitters();

    // Start API server
    if (apiEnabled) {
      const port = process.env.PORT || 8080;

      const app = await createApp();

      const server = app.listen(port, () =>
        console.log(`Server running on port: ${port}`)
      );

      // Set timeout to 5 minutes
      server.setTimeout(5 * 60 * 1000);
    }

    if (process.env.NODE_ENV !== "test") {
      if (apiEnabled) {
        if (production) {
          // await saveAll();
        } else {
          await saveAll();
        }
      }

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
