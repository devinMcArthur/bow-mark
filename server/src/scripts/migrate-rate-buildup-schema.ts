// server/src/scripts/migrate-rate-buildup-schema.ts
import mongoose from "mongoose";

async function migrate() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set");
  await mongoose.connect(uri);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const col = mongoose.connection.collection("ratebuilduptemplates") as any;
  const docs = await col.find({}).toArray();
  console.log(`Migrating ${docs.length} templates...`);

  for (const doc of docs) {
    // Parse JSON string fields (old schema)
    let defaultInputs: { params: Record<string, number>; tables: Record<string, any[]> } =
      { params: {}, tables: {} };
    let nodePositions: Record<string, { x: number; y: number; w?: number; h?: number }> = {};
    let groupDefs: any[] = [];
    let controllerDefs: any[] = [];

    try { if (doc.defaultInputs) defaultInputs = JSON.parse(doc.defaultInputs); } catch {}
    try { if (doc.nodePositions) nodePositions = JSON.parse(doc.nodePositions); } catch {}
    try {
      if (doc.groupDefs && typeof doc.groupDefs === "string") groupDefs = JSON.parse(doc.groupDefs);
      else if (Array.isArray(doc.groupDefs)) groupDefs = doc.groupDefs;
    } catch {}
    try {
      if (doc.controllerDefs && typeof doc.controllerDefs === "string") controllerDefs = JSON.parse(doc.controllerDefs);
      else if (Array.isArray(doc.controllerDefs)) controllerDefs = doc.controllerDefs;
    } catch {}

    // Migrate parameterDefs — add position, use defaultInputs.params as authoritative defaultValue
    const parameterDefs = (doc.parameterDefs ?? []).map((p: any) => {
      const pos = nodePositions[p.id] ?? { x: 0, y: 0 };
      const inputVal = defaultInputs.params[p.id];
      return {
        ...p,
        position: { x: pos.x, y: pos.y },
        defaultValue: inputVal !== undefined ? inputVal : p.defaultValue,
      };
    });

    // Migrate tableDefs — add position, add defaultRows from defaultInputs.tables
    const tableDefs = (doc.tableDefs ?? []).map((td: any) => {
      const pos = nodePositions[`${td.id}RatePerHr`] ?? { x: 0, y: 0 };
      return {
        ...td,
        position: { x: pos.x, y: pos.y },
        defaultRows: defaultInputs.tables[td.id] ?? [],
      };
    });

    // Migrate formulaSteps — add position
    const formulaSteps = (doc.formulaSteps ?? []).map((s: any) => {
      const pos = nodePositions[s.id] ?? { x: 0, y: 0 };
      return { ...s, position: { x: pos.x, y: pos.y } };
    });

    // Migrate breakdownDefs — add position
    const breakdownDefs = (doc.breakdownDefs ?? []).map((b: any) => {
      const pos = nodePositions[b.id] ?? { x: 0, y: 0 };
      return { ...b, position: { x: pos.x, y: pos.y } };
    });

    // Migrate controllerDefs from JSON string array → typed sub-docs with position
    const newControllerDefs = controllerDefs.map((c: any) => {
      const pos = nodePositions[c.id] ?? { x: 0, y: 0 };
      return {
        ...c,
        position: { x: pos.x, y: pos.y },
        // Normalize defaultValue: boolean → number
        defaultValue: typeof c.defaultValue === "boolean"
          ? (c.defaultValue ? 1 : 0)
          : c.defaultValue,
      };
    });

    // Migrate groupDefs from JSON string array → typed sub-docs with position
    const newGroupDefs = groupDefs.map((g: any) => {
      const pos = nodePositions[g.id] ?? { x: 0, y: 0, w: g.w, h: g.h };
      return {
        ...g,
        position: { x: pos.x, y: pos.y, w: pos.w, h: pos.h },
      };
    });

    // Migrate specialPositions
    const specialPositions = JSON.stringify({
      quantity: nodePositions["quantity"] ?? { x: 100, y: 200 },
      unitPrice: nodePositions["unitPrice"] ?? { x: 700, y: 200 },
    });

    await col.updateOne(
      { _id: doc._id },
      {
        $set: {
          parameterDefs,
          tableDefs,
          formulaSteps,
          breakdownDefs,
          controllerDefs: newControllerDefs,
          groupDefs: newGroupDefs,
          specialPositions,
          schemaVersion: 2,
          updatedAt: new Date(),
        },
        $unset: {
          defaultInputs: "",
          nodePositions: "",
        },
      }
    );

    console.log(`  ✓ ${doc.label} (${doc._id})`);
  }

  console.log("Migration complete.");
  await mongoose.disconnect();
}

migrate().catch((err) => { console.error(err); process.exit(1); });
