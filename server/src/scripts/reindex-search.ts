/**
 * Re-index all documents in MeiliSearch from MongoDB.
 *
 * Run this after pointing the server at a fresh MeiliSearch instance.
 *
 * Usage (requires prior `npm run build`):
 *   node dist/scripts/reindex-search.js
 */

import "reflect-metadata";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", "..", ".env.development") });

import mongoose from "mongoose";
import saveAll from "../testing/saveAll";

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI environment variable is required");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("MongoDB connected");

  if (!process.env.SEARCH_HOST || !process.env.SEARCH_API_KEY) {
    throw new Error("SEARCH_HOST and SEARCH_API_KEY environment variables are required");
  }

  console.log("\nStarting MeiliSearch re-index...");
  await saveAll();

  console.log("\nRe-index complete. Disconnecting...");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
