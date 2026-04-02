// server/src/scripts/migrate-rate-buildup-schema.ts
import mongoose from "mongoose";
import { RateBuildupTemplate } from "@models";

async function migrate() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set");
  await mongoose.connect(uri);

  const templates = await RateBuildupTemplate.find({});
  console.log(`Migrating ${templates.length} templates...`);

  for (const t of templates) {
    const raw = t as any;

    // Parse JSON string fields (may not exist on already-migrated docs)
    let defaultInputs: { params: Record<string, number>; tables: Record<string, any[]> } =
      { params: {}, tables: {} };
    let nodePositions: Record<string, { x: number; y: number; w?: number; h?: number }> = {};
    let groupDefs: any[] = [];
    let controllerDefs: any[] = [];

    try { if (raw.defaultInputs) defaultInputs = JSON.parse(raw.defaultInputs); } catch {}
    try { if (raw.nodePositions) nodePositions = JSON.parse(raw.nodePositions); } catch {}
    try { if (raw.groupDefs && typeof raw.groupDefs === "string") groupDefs = JSON.parse(raw.groupDefs); } catch {}
    try { if (raw.controllerDefs && typeof raw.controllerDefs === "string") controllerDefs = JSON.parse(raw.controllerDefs); } catch {}

    // Migrate parameterDefs — add position, use defaultInputs.params as authoritative defaultValue
    for (const p of t.parameterDefs) {
      const pos = nodePositions[p.id] ?? { x: 0, y: 0 };
      (p as any).position = { x: pos.x, y: pos.y };
      const inputVal = defaultInputs.params[p.id];
      if (inputVal !== undefined) p.defaultValue = inputVal;
    }

    // Migrate tableDefs — add position, add defaultRows from defaultInputs.tables
    for (const td of t.tableDefs) {
      const pos = nodePositions[`${td.id}RatePerHr`] ?? { x: 0, y: 0 };
      (td as any).position = { x: pos.x, y: pos.y };
      (td as any).defaultRows = defaultInputs.tables[td.id] ?? [];
    }

    // Migrate formulaSteps — add position
    for (const s of t.formulaSteps) {
      const pos = nodePositions[s.id] ?? { x: 0, y: 0 };
      (s as any).position = { x: pos.x, y: pos.y };
    }

    // Migrate breakdownDefs — add position
    for (const b of t.breakdownDefs) {
      const pos = nodePositions[b.id] ?? { x: 0, y: 0 };
      (b as any).position = { x: pos.x, y: pos.y };
    }

    // Migrate controllerDefs from JSON string array → typed sub-docs with position
    if (Array.isArray(controllerDefs) && controllerDefs.length > 0) {
      t.controllerDefs = controllerDefs.map((c: any) => {
        const pos = nodePositions[c.id] ?? { x: 0, y: 0 };
        return {
          ...c,
          position: { x: pos.x, y: pos.y },
          // Normalize defaultValue: boolean → number
          defaultValue: typeof c.defaultValue === "boolean"
            ? (c.defaultValue ? 1 : 0)
            : c.defaultValue,
        };
      }) as any;
    }

    // Migrate groupDefs from JSON string array → typed sub-docs with position
    if (Array.isArray(groupDefs) && groupDefs.length > 0) {
      t.groupDefs = groupDefs.map((g: any) => {
        const pos = nodePositions[g.id] ?? { x: 0, y: 0, w: g.w, h: g.h };
        return {
          ...g,
          position: { x: pos.x, y: pos.y, w: pos.w, h: pos.h },
        };
      }) as any;
    }

    // Migrate specialPositions
    (t as any).specialPositions = JSON.stringify({
      quantity: nodePositions["quantity"] ?? { x: 100, y: 200 },
      unitPrice: nodePositions["unitPrice"] ?? { x: 700, y: 200 },
    });

    // Clear old JSON string fields
    raw.defaultInputs = undefined;
    raw.nodePositions = undefined;

    // Bump schema version
    t.schemaVersion = 2;
    t.updatedAt = new Date();

    await t.save();
    console.log(`  ✓ ${t.label} (${t._id})`);
  }

  console.log("Migration complete.");
  await mongoose.disconnect();
}

migrate().catch((err) => { console.error(err); process.exit(1); });
