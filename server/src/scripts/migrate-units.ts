// server/src/scripts/migrate-units.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const LEGACY_MAP: Record<string, string> = { "tonnes": "t", "each": "ea", "sq.ft.": "sqft" };
const CANONICAL_CODES = new Set([
  "m2", "sqft", "m3", "yards", "lm", "mm", "cm", "inches", "t", "hr", "day", "ea", "ls",
]);

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  // 1. System: rename unitDefaults → unitExtras, strip canonical codes from the extras list
  const systems = db.collection("systems");
  const system = await systems.findOne({});
  if (system) {
    const existing: string[] = system.unitDefaults ?? system.unitExtras ?? [];
    const remappedOldKeys = new Set(Object.keys(LEGACY_MAP));
    const extras = existing.filter((u) => !CANONICAL_CODES.has(u) && !remappedOldKeys.has(u));
    await systems.updateOne(
      { _id: system._id },
      { $set: { unitExtras: extras }, $unset: { unitDefaults: "" } }
    );
    console.log(`System: unitExtras = ${JSON.stringify(extras)}`);
  }

  // 2. TenderPricingSheet: remap row.unit on embedded rows
  const sheets = db.collection("tenderpricingsheets");
  let sheetCount = 0;
  for await (const sheet of sheets.find({})) {
    const rows: any[] = sheet.rows ?? [];
    let dirty = false;
    for (const row of rows) {
      if (row.unit && LEGACY_MAP[row.unit]) {
        row.unit = LEGACY_MAP[row.unit];
        dirty = true;
      }
    }
    if (dirty) {
      await sheets.updateOne({ _id: sheet._id }, { $set: { rows } });
      sheetCount++;
    }
  }
  console.log(`TenderPricingSheets updated: ${sheetCount}`);

  // 3. RateBuildupTemplate: remap defaultUnit
  const templates = db.collection("ratebuilduptemplates");
  let templateCount = 0;
  for await (const t of templates.find({ defaultUnit: { $in: Object.keys(LEGACY_MAP) } })) {
    await templates.updateOne(
      { _id: t._id },
      { $set: { defaultUnit: LEGACY_MAP[t.defaultUnit] } }
    );
    templateCount++;
  }
  console.log(`RateBuildupTemplates updated: ${templateCount}`);

  await mongoose.disconnect();
  console.log("Migration complete.");
}

run().catch((e) => { console.error(e); process.exit(1); });
