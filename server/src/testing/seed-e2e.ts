/**
 * Standalone seed script for E2E tests.
 *
 * Run from the server/ directory (mocks must be pre-loaded via --require):
 *   ts-node \
 *     --require src/testing/mockFileStorageSetup.ts \
 *     --require src/testing/mockEmailSetup.ts \
 *     src/testing/seed-e2e.ts
 *
 * Or use the npm script:
 *   npm run seed:e2e
 *
 * Env vars:
 *   MONGODB_URI  MongoDB connection string (default: mongodb://localhost:27018/bowmark-test)
 */
import "reflect-metadata";
import mongoose from "mongoose";
import seedDatabase from "./seedDatabase";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27018/bowmark-test";

async function main() {
  console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  });
  console.log("Connected. Seeding...");
  await seedDatabase();
  await mongoose.disconnect();
  console.log("E2E seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
