import mongoose from "mongoose";
import "dotenv/config";
import { migrateEnrichedFiles } from "./01-enrichedFiles";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI required");
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log(`Running file-system migration (dryRun=${dryRun})...`);
  const ef = await migrateEnrichedFiles({ dryRun });
  console.log("01-enrichedFiles:", JSON.stringify(ef, null, 2));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
