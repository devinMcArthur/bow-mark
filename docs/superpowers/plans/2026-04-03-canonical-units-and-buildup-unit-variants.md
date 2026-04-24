# Canonical Units & Buildup Unit Variants — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text `system.unitDefaults` array with a server-defined canonical unit set, then extend the Quantity special node so a single rate buildup template can support multiple input units via conversion branches.

**Architecture:** Phase 1 (Tasks 1–5) defines the canonical unit const on both sides, renames `System.unitDefaults` → `unitExtras`, updates every dropdown, and migrates existing data — independently deployable. Phase 2 (Tasks 6–11) adds `unitVariants` to `CanvasDocument`, threads `unit` through the evaluation pipeline, and adds editing UI to the canvas InspectPanel. Phase 3 (Task 12) filters the buildup picker by unit compatibility.

**Tech Stack:** TypeScript, Typegoose/Mongoose, Type-GraphQL, Apollo, Next.js 12, Chakra UI, mathjs (expr-eval parser already in evaluate.ts)

---

## File Map

### New files
- `server/src/constants/units.ts` — canonical unit definitions + legacy remap
- `client/src/constants/units.ts` — identical client mirror (static, no GQL roundtrip needed)
- `server/src/scripts/migrate-units.ts` — one-shot migration script

### Modified files (Phase 1)
- `server/src/models/System/schema/index.ts` — rename `unitDefaults` → `unitExtras`
- `server/src/models/System/class/update.ts` — rename update method
- `server/src/models/System/class/index.ts` — rename public method
- `server/src/models/System/class/create.ts` — change default initialisation to empty `unitExtras`
- `server/src/graphql/resolvers/system/mutations.ts` — rename mutation helper
- `server/src/graphql/resolvers/system/index.ts` — rename GQL mutation
- `client/src/graphql/fragments/System.graphql` — `unitDefaults` → `unitExtras`
- `client/src/contexts/System/index.tsx` — update context reference
- `client/src/components/Common/forms/Unit.tsx` — use canonical + extras
- `client/src/components/Common/System/Units.tsx` — update admin display
- `client/src/components/Forms/System/SystemUnitUpdate.tsx` — update admin form
- `client/src/components/TenderPricing/PricingRow.tsx` — update dropdown
- `client/src/components/TenderPricing/LineItemDetail.tsx` — update dropdowns

### Modified files (Phase 2)
- `server/src/models/RateBuildupTemplate/schema/index.ts` — add `unitVariants` subdocument
- `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts` — add `UnitVariant` interface to `CanvasDocument`; extend `computeInactiveNodeIds`; extend `computeSnapshotUnitPrice`
- `client/src/components/TenderPricing/calculators/evaluate.ts` — export `evaluateExpression` helper
- `client/src/components/pages/developer/CalculatorCanvas/RateBuildupInputs.tsx` — add `unit` prop, pass to evaluation
- `client/src/components/TenderPricing/LineItemDetail.tsx` — pass `unit` to `RateBuildupInputs`
- `client/src/pages/tender/[id]/pricing/row/[rowId].tsx` — read + pass `unit` to canvas
- `client/src/components/pages/developer/CalculatorCanvas/InspectPanel.tsx` — unit variants editor for Quantity node
- `client/src/components/pages/developer/CalculatorCanvas/nodeTypes.tsx` — Quantity node shows supported units
- `client/src/components/pages/developer/CalculatorCanvas/index.tsx` — pass `unit` down to LiveTestPanel
- `client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx` — accept + use `unit` prop

### Modified files (Phase 3)
- `client/src/components/TenderPricing/LineItemDetail.tsx` — filter template list by unit

---

## Phase 1 — Canonical Unit Infrastructure

---

### Task 1: Define CANONICAL_UNITS const on server and client

**Files:**
- Create: `server/src/constants/units.ts`
- Create: `client/src/constants/units.ts`

- [ ] **Step 1: Create `server/src/constants/units.ts`**

```typescript
// server/src/constants/units.ts

export type UnitDimension = "area" | "volume" | "length" | "mass" | "time" | null;

export interface CanonicalUnit {
  code: string;
  label: string;
  name: string;
  dimension: UnitDimension;
}

export const CANONICAL_UNITS: CanonicalUnit[] = [
  { code: "m2",     label: "m²",     name: "Square Metres",  dimension: "area"   },
  { code: "sqft",   label: "sq.ft.", name: "Square Feet",    dimension: "area"   },
  { code: "m3",     label: "m³",     name: "Cubic Metres",   dimension: "volume" },
  { code: "yards",  label: "yd³",   name: "Cubic Yards",    dimension: "volume" },
  { code: "lm",     label: "lm",     name: "Lineal Metres",  dimension: "length" },
  { code: "mm",     label: "mm",     name: "Millimetres",    dimension: "length" },
  { code: "cm",     label: "cm",     name: "Centimetres",    dimension: "length" },
  { code: "inches", label: "in",     name: "Inches",         dimension: "length" },
  { code: "t",      label: "t",      name: "Tonnes",         dimension: "mass"   },
  { code: "hr",     label: "hr",     name: "Hours",          dimension: "time"   },
  { code: "day",    label: "day",    name: "Days",           dimension: "time"   },
  { code: "ea",     label: "EA",     name: "Each",           dimension: null     },
  { code: "ls",     label: "LS",     name: "Lump Sum",       dimension: null     },
];

export const CANONICAL_UNIT_CODES = new Set(CANONICAL_UNITS.map((u) => u.code));

/**
 * Maps legacy stored strings to canonical codes.
 * Only entries that need to change are listed here.
 */
export const UNIT_LEGACY_MAP: Record<string, string> = {
  "tonnes": "t",
  "each":   "ea",
  "sq.ft.": "sqft",
};

/** Resolve a raw stored string to its canonical code (or return as-is if already canonical/extra). */
export function resolveUnitCode(raw: string): string {
  return UNIT_LEGACY_MAP[raw] ?? raw;
}
```

- [ ] **Step 2: Create `client/src/constants/units.ts` (identical content)**

```typescript
// client/src/constants/units.ts
// Keep in sync with server/src/constants/units.ts — this is static data, no GQL roundtrip needed.

export type UnitDimension = "area" | "volume" | "length" | "mass" | "time" | null;

export interface CanonicalUnit {
  code: string;
  label: string;
  name: string;
  dimension: UnitDimension;
}

export const CANONICAL_UNITS: CanonicalUnit[] = [
  { code: "m2",     label: "m²",     name: "Square Metres",  dimension: "area"   },
  { code: "sqft",   label: "sq.ft.", name: "Square Feet",    dimension: "area"   },
  { code: "m3",     label: "m³",     name: "Cubic Metres",   dimension: "volume" },
  { code: "yards",  label: "yd³",   name: "Cubic Yards",    dimension: "volume" },
  { code: "lm",     label: "lm",     name: "Lineal Metres",  dimension: "length" },
  { code: "mm",     label: "mm",     name: "Millimetres",    dimension: "length" },
  { code: "cm",     label: "cm",     name: "Centimetres",    dimension: "length" },
  { code: "inches", label: "in",     name: "Inches",         dimension: "length" },
  { code: "t",      label: "t",      name: "Tonnes",         dimension: "mass"   },
  { code: "hr",     label: "hr",     name: "Hours",          dimension: "time"   },
  { code: "day",    label: "day",    name: "Days",           dimension: "time"   },
  { code: "ea",     label: "EA",     name: "Each",           dimension: null     },
  { code: "ls",     label: "LS",     name: "Lump Sum",       dimension: null     },
];

export const CANONICAL_UNIT_CODES = new Set(CANONICAL_UNITS.map((u) => u.code));

export const UNIT_LEGACY_MAP: Record<string, string> = {
  "tonnes": "t",
  "each":   "ea",
  "sq.ft.": "sqft",
};

export function resolveUnitCode(raw: string): string {
  return UNIT_LEGACY_MAP[raw] ?? raw;
}

/** Return the display label for a unit code (canonical or custom). */
export function unitLabel(code: string): string {
  return CANONICAL_UNITS.find((u) => u.code === code)?.label ?? code;
}
```

- [ ] **Step 3: Type-check server**

```bash
cd /home/dev/work/bow-mark/server && npm run build 2>&1 | head -20
```
Expected: no new errors.

- [ ] **Step 4: Type-check client**

```bash
cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | head -20
```
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd /home/dev/work/bow-mark
git add server/src/constants/units.ts client/src/constants/units.ts
git commit -m "feat: add CANONICAL_UNITS const (server + client)"
```

---

### Task 2: Rename System.unitDefaults → unitExtras on the server

**Files:**
- Modify: `server/src/models/System/schema/index.ts`
- Modify: `server/src/models/System/class/update.ts`
- Modify: `server/src/models/System/class/index.ts`
- Modify: `server/src/models/System/class/create.ts`
- Modify: `server/src/graphql/resolvers/system/mutations.ts`
- Modify: `server/src/graphql/resolvers/system/index.ts`

- [ ] **Step 1: Rename field in schema**

In `server/src/models/System/schema/index.ts`, replace:
```typescript
  @Field(() => [String], { nullable: false })
  @prop({ type: () => [String], required: true, default: [] })
  public unitDefaults!: string[];
```
With:
```typescript
  @Field(() => [String], { nullable: false })
  @prop({ type: () => [String], required: true, default: [] })
  public unitExtras!: string[];
```

- [ ] **Step 2: Rename in create.ts**

In `server/src/models/System/class/create.ts`, replace:
```typescript
    unitDefaults: ["m", "m²", "m³", "t", "km", "t·km", "LS", "EA", "hr", "day"],
```
With:
```typescript
    unitExtras: [],
```

- [ ] **Step 3: Rename in update.ts**

In `server/src/models/System/class/update.ts`, replace every reference to `unitDefaults` with `unitExtras`. (The method updates `system.unitDefaults = data` — change to `system.unitExtras = data`.)

- [ ] **Step 4: Rename public method in class/index.ts**

In `server/src/models/System/class/index.ts`, rename:
```typescript
public async updateUnitDefaults(data: string[]): Promise<void> {
```
To:
```typescript
public async updateUnitExtras(data: string[]): Promise<void> {
```
And update the body to call the renamed update function.

- [ ] **Step 5: Rename mutation helper**

In `server/src/graphql/resolvers/system/mutations.ts`, rename the `unitDefaults` function to `unitExtras` and update its body to call `system.updateUnitExtras(data)`.

- [ ] **Step 6: Rename GQL mutation resolver**

In `server/src/graphql/resolvers/system/index.ts`, replace:
```typescript
  @Authorized(["ADMIN"])
  @Mutation(() => SystemClass)
  async systemUpdateUnitDefaults(@Arg("data", () => [String]) data: string[]) {
    return mutations.unitDefaults(data);
  }
```
With:
```typescript
  @Authorized(["ADMIN"])
  @Mutation(() => SystemClass)
  async systemUpdateUnitExtras(@Arg("data", () => [String]) data: string[]) {
    return mutations.unitExtras(data);
  }
```

- [ ] **Step 7: Verify server compiles**

```bash
cd /home/dev/work/bow-mark/server && npm run build 2>&1 | head -30
```
Expected: clean build.

- [ ] **Step 8: Commit**

```bash
cd /home/dev/work/bow-mark/server
git add src/models/System/ src/graphql/resolvers/system/
git commit -m "feat: rename System.unitDefaults → unitExtras on server"
```

---

### Task 3: Update client GQL fragment + codegen — let TypeScript find all broken references

**Files:**
- Modify: `client/src/graphql/fragments/System.graphql`

- [ ] **Step 1: Update System fragment**

In `client/src/graphql/fragments/System.graphql`, replace `unitDefaults` with `unitExtras`:
```graphql
fragment SystemSnippet on SystemClass {
  unitExtras
  laborTypes
  # ... rest unchanged
}
```

- [ ] **Step 2: Run codegen**

```bash
cd /home/dev/work/bow-mark/client && npm run codegen 2>&1 | tail -10
```
Expected: codegen succeeds, generated types updated.

- [ ] **Step 3: Run type-check to surface all broken references**

```bash
cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | grep "unitDefaults"
```
Expected: errors listing every file that still references `system.unitDefaults` or the old mutation hook. These are all the files that need updating in Task 4.

---

### Task 4: Update all client dropdown components to use canonical + extras

**Files:**
- Modify: `client/src/contexts/System/index.tsx`
- Modify: `client/src/components/Common/forms/Unit.tsx`
- Modify: `client/src/components/Common/System/Units.tsx`
- Modify: `client/src/components/Forms/System/SystemUnitUpdate.tsx`
- Modify: `client/src/components/TenderPricing/PricingRow.tsx`
- Modify: `client/src/components/TenderPricing/LineItemDetail.tsx`

**Key pattern:** Every dropdown that listed `system.unitDefaults` options must now produce options from CANONICAL_UNITS first, then `system.unitExtras`. The option `value` is the canonical code; the option `label` is the display label.

```typescript
// Helper — use this in every dropdown that needs the full unit list
import { CANONICAL_UNITS } from "@/constants/units";

function buildUnitOptions(unitExtras: string[]) {
  const canonical = CANONICAL_UNITS.map((u) => ({ value: u.code, label: u.label }));
  const extras = unitExtras.map((u) => ({ value: u, label: u }));
  return [...canonical, ...extras];
}
```

- [ ] **Step 1: Update `client/src/contexts/System/index.tsx`**

Change all references from `unitDefaults` to `unitExtras` in the context state shape and the query result mapping.

- [ ] **Step 2: Update `client/src/components/Common/forms/Unit.tsx`**

Replace:
```typescript
  const options: ISelect["options"] = React.useMemo(() => {
    if (!system) return [];
    const options: ISelect["options"] = [];
    for (let i = 0; i < system.unitDefaults.length; i++) {
      options.push({ title: system.unitDefaults[i], value: system.unitDefaults[i] });
    }
    return options;
  }, [system]);
```
With:
```typescript
  const options: ISelect["options"] = React.useMemo(() => {
    if (!system) return [];
    const canonical = CANONICAL_UNITS.map((u) => ({ title: u.label, value: u.code }));
    const extras = (system.unitExtras ?? []).map((u) => ({ title: u, value: u }));
    return [...canonical, ...extras];
  }, [system]);
```
Add import: `import { CANONICAL_UNITS } from "../../../constants/units";`

- [ ] **Step 3: Update `client/src/components/Common/System/Units.tsx`**

Change the list render from `system.unitDefaults.map(...)` to:
```typescript
{CANONICAL_UNITS.map((u) => <ListItem key={u.code}>{u.label} <Text as="span" color="gray.400" fontSize="xs">({u.code})</Text></ListItem>)}
{(system.unitExtras ?? []).map((u) => <ListItem key={u}>{u}</ListItem>)}
```

- [ ] **Step 4: Update `client/src/components/Forms/System/SystemUnitUpdate.tsx`**

- Replace `unitDefaults` with `unitExtras` in all references.
- Replace the `useSystemUpdateUnitDefaultsMutation` hook with `useSystemUpdateUnitExtrasMutation` (generated name after codegen in Task 3).
- The form now only manages `unitExtras` (company-specific additions). Add a read-only section above showing canonical units for reference.

- [ ] **Step 5: Update `client/src/components/TenderPricing/PricingRow.tsx`**

Find the `UnitCell` component. Replace:
```typescript
const units = system?.unitDefaults ?? [];
// ...
{units.map((u) => <option key={u} value={u}>{u}</option>)}
```
With:
```typescript
import { CANONICAL_UNITS } from "../../constants/units";
// ...
{CANONICAL_UNITS.map((u) => <option key={u.code} value={u.code}>{u.label}</option>)}
{(system?.unitExtras ?? []).map((u) => <option key={u} value={u}>{u}</option>)}
```

- [ ] **Step 6: Update `client/src/components/TenderPricing/LineItemDetail.tsx`**

There are two unit dropdowns in this file (one for no-buildup, one for with-buildup). Update both with the same pattern as Step 5. Also replace `system.unitDefaults` in any other references.

- [ ] **Step 7: Verify no remaining unitDefaults references**

```bash
cd /home/dev/work/bow-mark/client && grep -r "unitDefaults" src/ --include="*.tsx" --include="*.ts" --include="*.graphql"
```
Expected: no output.

- [ ] **Step 8: Type-check passes cleanly**

```bash
cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | head -20
```
Expected: clean.

- [ ] **Step 9: Commit**

```bash
cd /home/dev/work/bow-mark/client
git add src/
git commit -m "feat: update all unit dropdowns to canonical + extras pattern"
```

---

### Task 5: Write and run the data migration script

**Files:**
- Create: `server/src/scripts/migrate-units.ts`

The migration does three things:
1. Renames `system.unitDefaults` → `unitExtras` in MongoDB, keeping only non-canonical values.
2. Remaps three legacy unit strings on `TenderPricingSheet` rows: `"tonnes"→"t"`, `"each"→"ea"`, `"sq.ft."→"sqft"`.
3. Remaps the same strings on `RateBuildupTemplate.defaultUnit`.

- [ ] **Step 1: Create migration script**

```typescript
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
```

- [ ] **Step 2: Run the migration against the paving dev database**

```bash
cd /home/dev/work/bow-mark/server
MONGO_URI=$(kubectl exec $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') -- printenv MONGO_URI) \
  npx ts-node -r tsconfig-paths/register src/scripts/migrate-units.ts
```
Expected output:
```
System: unitExtras = ["patches","pails","litre","loads"]
TenderPricingSheets updated: N
RateBuildupTemplates updated: N
Migration complete.
```

- [ ] **Step 3: Save updated dev DB state**

```bash
# In Tilt UI: trigger "save-db-state" resource
# Or manually:
cd /home/dev/work/bow-mark && ./scripts/save-db-state.sh
```

- [ ] **Step 4: Commit**

```bash
cd /home/dev/work/bow-mark
git add server/src/scripts/migrate-units.ts dev-data/
git commit -m "feat: migrate unitDefaults→unitExtras and remap legacy unit codes"
```

> **Note:** PostgreSQL `unit` columns in `fact_*`/`dim_*` tables also store these strings but are populated by the RabbitMQ consumer syncing from MongoDB. Historical PG rows (material shipments, production) do not need retroactive migration — they are reporting data and new syncs will write canonical codes going forward.

---

## Phase 2 — Quantity Node Unit Variants

---

### Task 6: Add UnitVariant type to CanvasDocument and RateBuildupTemplate schema

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts`
- Modify: `server/src/models/RateBuildupTemplate/schema/index.ts`

- [ ] **Step 1: Add `UnitVariant` interface and extend `CanvasDocument` on the client**

In `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts`, add after the `ControllerDef` interface:

```typescript
/**
 * Describes how the Quantity node handles a specific input unit.
 * When a line item's unit matches `unit`, the group `activatesGroupId` is
 * activated, and `conversionFormula` (if present) is evaluated to normalise
 * the raw quantity before the rest of the formulas run.
 *
 * conversionFormula may reference `quantity` (the raw input) and any param IDs
 * defined on the template. Result replaces `quantity` in the formula context.
 * Omit or leave empty for units that require no conversion (i.e. the template's
 * native unit).
 */
export interface UnitVariant {
  unit: string;              // canonical code, e.g. "m3"
  activatesGroupId: string;  // group to activate when this unit is selected
  conversionFormula?: string; // e.g. "quantity / depth_m"
}
```

Then add `unitVariants?: UnitVariant[];` to the `CanvasDocument` interface:

```typescript
export interface CanvasDocument {
  id: string;
  label: string;
  defaultUnit: string;
  parameterDefs: CanvasParameterDef[];
  tableDefs: CanvasTableDef[];
  formulaSteps: CanvasFormulaStep[];
  breakdownDefs: CanvasBreakdownDef[];
  intermediateDefs: IntermediateDef[];
  specialPositions: SpecialNodePositions;
  groupDefs: GroupDef[];
  controllerDefs: ControllerDef[];
  unitVariants?: UnitVariant[];  // ← new
}
```

- [ ] **Step 2: Add `RateBuildupUnitVariant` subdocument to server schema**

In `server/src/models/RateBuildupTemplate/schema/index.ts`, add before `RateBuildupTemplateSchema`:

```typescript
@ObjectType()
export class RateBuildupUnitVariant {
  @Field() @prop({ required: true }) public unit!: string;
  @Field() @prop({ required: true }) public activatesGroupId!: string;
  @Field({ nullable: true }) @prop() public conversionFormula?: string;
}
```

Then add to `RateBuildupTemplateSchema` (after `groupDefs`):

```typescript
  @Field(() => [RateBuildupUnitVariant], { nullable: true })
  @prop({ type: () => [RateBuildupUnitVariant], _id: false })
  public unitVariants?: RateBuildupUnitVariant[];
```

- [ ] **Step 3: Check server compiles**

```bash
cd /home/dev/work/bow-mark/server && npm run build 2>&1 | head -20
```

- [ ] **Step 4: Run client codegen (RateBuildupTemplate GQL type now has unitVariants)**

```bash
cd /home/dev/work/bow-mark/client && npm run codegen 2>&1 | tail -5
```

- [ ] **Step 5: Verify `fragmentToDoc` in canvasStorage handles `unitVariants`**

`fragmentToDoc` (in `canvasStorage.ts`) maps a GQL fragment result to `CanvasDocument`. Since `unitVariants` is a new optional field, confirm the mapping spreads all fields or explicitly includes `unitVariants`. If it's a selective mapping, add:
```typescript
unitVariants: fragment.unitVariants ?? [],
```

- [ ] **Step 6: Commit**

```bash
cd /home/dev/work/bow-mark
git add server/src/models/RateBuildupTemplate/ \
        client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts \
        client/src/generated/
git commit -m "feat: add UnitVariant type to CanvasDocument and RateBuildupTemplate schema"
```

---

### Task 7: Export `evaluateExpression` helper from evaluate.ts

**Files:**
- Modify: `client/src/components/TenderPricing/calculators/evaluate.ts`

The unit conversion formula (e.g. `"quantity / depth_m"`) needs to be evaluated with a variable context before the main formula graph runs. The `parser` in `evaluate.ts` is module-level and not exported — add a small exported helper.

- [ ] **Step 1: Add `evaluateExpression` export**

At the bottom of `client/src/components/TenderPricing/calculators/evaluate.ts`, add:

```typescript
/**
 * Evaluate a simple arithmetic expression with a numeric variable context.
 * Returns null if the formula throws or produces a non-finite result.
 * Used by the unit variant conversion step in computeSnapshotUnitPrice.
 */
export function evaluateExpression(
  formula: string,
  ctx: Record<string, number>
): number | null {
  if (!formula.trim()) return null;
  try {
    const result = parser.evaluate(formula, { ...ctx });
    return typeof result === "number" && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
cd /home/dev/work/bow-mark/client
git add src/components/TenderPricing/calculators/evaluate.ts
git commit -m "feat: export evaluateExpression helper from evaluate.ts"
```

---

### Task 8: Extend `computeInactiveNodeIds` and `computeSnapshotUnitPrice` for unit variants

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts`

- [ ] **Step 1: Extend `computeInactiveNodeIds` to accept `activeUnit`**

Replace the existing `computeInactiveNodeIds` signature and body:

```typescript
export function computeInactiveNodeIds(
  doc: CanvasDocument,
  controllers: Record<string, number | boolean | string[]>,
  activeUnit?: string   // ← new: canonical code of the line item's unit
): Set<string> {
  // Groups that serve as unit variant branches — their activation is driven by
  // activeUnit, not by controller values.
  const unitVariantGroupIds = new Set((doc.unitVariants ?? []).map((v) => v.activatesGroupId));
  const activeVariantGroupId = activeUnit
    ? (doc.unitVariants ?? []).find((v) => v.unit === activeUnit)?.activatesGroupId
    : undefined;

  const inactiveGroupIds = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const g of doc.groupDefs) {
      if (inactiveGroupIds.has(g.id)) continue;

      let shouldBeInactive: boolean;

      if (unitVariantGroupIds.has(g.id)) {
        // Unit variant group: active only if it's the matching variant
        shouldBeInactive = g.id !== activeVariantGroupId;
      } else {
        // Normal group: use existing controller-based logic
        const directlyInactive = !isGroupActive(g, doc, controllers);
        const parentGroup = doc.groupDefs.find((pg) => pg.memberIds.includes(g.id));
        const parentInactive = parentGroup ? inactiveGroupIds.has(parentGroup.id) : false;
        shouldBeInactive = directlyInactive || parentInactive;
      }

      if (shouldBeInactive) {
        inactiveGroupIds.add(g.id);
        changed = true;
      }
    }
  }

  const inactiveNodeIds = new Set<string>();
  for (const g of doc.groupDefs) {
    if (inactiveGroupIds.has(g.id)) {
      for (const mid of g.memberIds) inactiveNodeIds.add(mid);
    }
  }
  return inactiveNodeIds;
}
```

- [ ] **Step 2: Extend `computeSnapshotUnitPrice` to accept `unit`**

Replace the existing `computeSnapshotUnitPrice`:

```typescript
export function computeSnapshotUnitPrice(
  snapshot: RateBuildupSnapshot,
  rawQuantity: number,
  unit?: string   // ← new: canonical code of the line item's unit
): number {
  const doc = snapshotToCanvasDoc(snapshot);

  // Resolve active unit variant and normalize quantity via conversion formula
  const variant = unit ? (doc.unitVariants ?? []).find((v) => v.unit === unit) : undefined;
  let quantity = rawQuantity;
  if (variant?.conversionFormula) {
    const ctx: Record<string, number> = { quantity: rawQuantity };
    for (const p of doc.parameterDefs) ctx[p.id] = snapshot.params[p.id] ?? p.defaultValue;
    const converted = evaluateExpression(variant.conversionFormula, ctx);
    if (converted !== null && converted > 0) quantity = converted;
  }

  const controllerNumeric: Record<string, number> = {};
  for (const [k, v] of Object.entries(snapshot.controllers ?? {})) {
    if (typeof v === "number") controllerNumeric[k] = v;
    else if (typeof v === "boolean") controllerNumeric[k] = v ? 1 : 0;
  }
  const inactiveNodeIds = computeInactiveNodeIds(doc, snapshot.controllers ?? {}, unit);
  const result = evaluateTemplate(
    doc,
    { params: snapshot.params, tables: snapshot.tables },
    quantity,
    controllerNumeric,
    inactiveNodeIds
  );
  return parseFloat(result.unitPrice.toFixed(4));
}
```

Add import at the top of `canvasStorage.ts`:
```typescript
import { evaluateTemplate, evaluateExpression } from "../../TenderPricing/calculators/evaluate";
```
(Remove the old `evaluateTemplate`-only import and replace with this.)

- [ ] **Step 3: Fix all call sites of `computeInactiveNodeIds` that need updating**

Search for existing calls:
```bash
grep -n "computeInactiveNodeIds" client/src/components/pages/developer/CalculatorCanvas/RateBuildupInputs.tsx \
  client/src/components/pages/developer/CalculatorCanvas/index.tsx
```

In `RateBuildupInputs.tsx`, the call `computeInactiveNodeIds(doc, controllers)` is used in a `useMemo`. It does NOT need the `unit` arg here yet — that comes in Task 9. Leave it as-is for now (the new optional param defaults to `undefined`, existing behaviour unchanged).

- [ ] **Step 4: Type-check**

```bash
cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | head -20
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd /home/dev/work/bow-mark/client
git add src/components/pages/developer/CalculatorCanvas/canvasStorage.ts \
        src/components/TenderPricing/calculators/evaluate.ts
git commit -m "feat: extend computeInactiveNodeIds + computeSnapshotUnitPrice for unit variants"
```

---

### Task 9: Thread `unit` through RateBuildupInputs evaluation

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/RateBuildupInputs.tsx`

`RateBuildupInputs` already calls `evaluateTemplate` and `computeInactiveNodeIds` internally. It needs a `unit` prop so the right variant branch activates and quantity gets normalized.

- [ ] **Step 1: Add `unit` to `RateBuildupInputsProps`**

```typescript
export interface RateBuildupInputsProps {
  // ... existing props ...
  /** Canonical unit code from the line item (e.g. "m3"). Used to activate unit variant groups. */
  unit?: string;
}
```

- [ ] **Step 2: Consume `unit` in the component — pass to `computeInactiveNodeIds`**

In `RateBuildupInputs`, destructure `unit` from props:
```typescript
const RateBuildupInputs: React.FC<RateBuildupInputsProps> = ({
  doc, params, tables, controllers, quantity, unit,   // ← add unit
  // ...
}) => {
```

Update the `inactiveNodeIds` useMemo:
```typescript
  const inactiveNodeIds = useMemo(
    () => computeInactiveNodeIds(doc, controllers, unit),  // ← pass unit
    [doc, controllers, unit]
  );
```

- [ ] **Step 3: Normalize quantity before passing to evaluateTemplate**

Add a `normalizedQuantity` useMemo before the existing `result` memo:

```typescript
  const normalizedQuantity = useMemo(() => {
    if (!unit || !doc.unitVariants?.length) return quantity;
    const variant = doc.unitVariants.find((v) => v.unit === unit);
    if (!variant?.conversionFormula) return quantity;
    const ctx: Record<string, number> = { quantity };
    for (const p of doc.parameterDefs) ctx[p.id] = params[p.id] ?? p.defaultValue;
    const converted = evaluateExpression(variant.conversionFormula, ctx);
    return converted !== null && converted > 0 ? converted : quantity;
  }, [unit, doc.unitVariants, doc.parameterDefs, quantity, params]);
```

Add import at top of file:
```typescript
import { evaluateTemplate, debugEvaluateTemplate, evaluateExpression } from "../../../../components/TenderPricing/calculators/evaluate";
```

Update the `result` memo to use `normalizedQuantity`:
```typescript
  const result = useMemo(
    () => evaluateTemplate(doc, inputs, normalizedQuantity, controllerValues, inactiveNodeIds),
    [doc, inputs, normalizedQuantity, controllerValues, inactiveNodeIds]
  );
```

Update `formulaOutputMap` memo similarly — replace `quantity` with `normalizedQuantity` in the `debugEvaluateTemplate` call.

- [ ] **Step 4: Type-check**

```bash
cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
cd /home/dev/work/bow-mark/client
git add src/components/pages/developer/CalculatorCanvas/RateBuildupInputs.tsx
git commit -m "feat: RateBuildupInputs accepts unit prop, activates variant branch"
```

---

### Task 10: Pass `unit` from LineItemDetail and rowId page

**Files:**
- Modify: `client/src/components/TenderPricing/LineItemDetail.tsx`
- Modify: `client/src/pages/tender/[id]/pricing/row/[rowId].tsx`

- [ ] **Step 1: Pass `unit` to `RateBuildupInputs` in `LineItemDetail.tsx`**

Find both places where `<RateBuildupInputs` is rendered inside `LineItemDetail`. Add the `unit` prop:

```tsx
<RateBuildupInputs
  // ... existing props ...
  unit={row.unit ?? undefined}
/>
```

Also pass `unit` to `computeSnapshotUnitPrice` inside `LineItemDetail`'s `scheduleSave` callback and the `snapshotUnitPrice` useMemo:

```typescript
// snapshotUnitPrice useMemo
return computeSnapshotUnitPrice(parsedSnapshot, row.quantity ?? 1, row.unit ?? undefined) || null;

// scheduleSave callback
const unitPrice = computeSnapshotUnitPrice(updatedSnapshot, parseFloat(quantityRef.current) || 1, row.unit ?? undefined);
```

- [ ] **Step 2: Pass `unit` via URL param from LineItemDetail to buildup editor**

In `LineItemDetail.tsx`, find where the "Edit in canvas" / "Open buildup editor" button navigates to the row canvas page. Add `unit` to the URL:

```typescript
router.push(`/tender/${tenderId}/pricing/row/${row._id}?quantity=${row.quantity ?? 1}&unit=${encodeURIComponent(row.unit ?? "")}`);
```

- [ ] **Step 3: Read `unit` URL param in `rowId.tsx`**

In `client/src/pages/tender/[id]/pricing/row/[rowId].tsx`:

```typescript
const { id: tenderId, rowId, quantity: quantityParam, unit: unitParam } = router.query;
const urlUnit = typeof unitParam === "string" && unitParam ? unitParam : undefined;
```

Pass `urlUnit` to `computeSnapshotUnitPrice` in `scheduleSave`:
```typescript
const unitPrice = computeSnapshotUnitPrice(updatedSnapshot, rowQuantityRef.current, urlUnit);
```

Pass `urlUnit` to `CalculatorCanvas`:
```tsx
<CalculatorCanvas
  // ... existing props ...
  unit={urlUnit}
/>
```

- [ ] **Step 4: Accept `unit` in `CalculatorCanvas` and pass to `LiveTestPanel`**

In `client/src/components/pages/developer/CalculatorCanvas/index.tsx`:
- Add `unit?: string` to the Props interface.
- Pass it to `<LiveTestPanel unit={unit} />`.

In `client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx`:
- Add `unit?: string` to props.
- Pass it to `<RateBuildupInputs unit={unit} />`.

- [ ] **Step 5: Type-check**

```bash
cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
cd /home/dev/work/bow-mark/client
git add src/components/TenderPricing/LineItemDetail.tsx \
        src/pages/tender/ \
        src/components/pages/developer/CalculatorCanvas/index.tsx \
        src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx
git commit -m "feat: thread unit through LineItemDetail → rowId → CalculatorCanvas → LiveTestPanel"
```

---

### Task 11: Unit variants editor in the Quantity node InspectPanel + canvas visual

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/InspectPanel.tsx`
- Modify: `client/src/components/pages/developer/CalculatorCanvas/nodeTypes.tsx`
- Modify: `client/src/components/pages/developer/CalculatorCanvas/index.tsx` (save path)

The Quantity node is a singleton special node. InspectPanel currently renders different content based on the selected node type. Add a `"quantity"` case that renders the unit variants editor.

- [ ] **Step 1: Add unit variants editor section to InspectPanel**

Locate the section in `InspectPanel.tsx` that renders when the selected node is the quantity node (likely a `type === "quantity"` check or similar). Add a "Unit Variants" section:

```tsx
{/* Unit Variants — only shown when the Quantity node is selected */}
{selectedNodeType === "quantity" && (
  <Box mt={4}>
    <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={2}>
      Unit Variants
    </Text>
    <Text fontSize="xs" color="gray.400" mb={3}>
      Each variant activates a group and optionally normalises the quantity via a conversion formula.
    </Text>

    {/* Existing variants */}
    {(doc.unitVariants ?? []).map((v, i) => (
      <Box key={i} mb={2} p={2} border="1px solid" borderColor="gray.200" rounded="md">
        <Flex align="center" justify="space-between" mb={1}>
          <Text fontSize="xs" fontWeight="medium" color="gray.700">
            {unitLabel(v.unit)} <Text as="span" color="gray.400">({v.unit})</Text>
          </Text>
          <Box
            as="button"
            fontSize="xs"
            color="red.400"
            onClick={() => onUpdateDoc({
              ...doc,
              unitVariants: (doc.unitVariants ?? []).filter((_, j) => j !== i),
            })}
          >
            Remove
          </Box>
        </Flex>
        <Text fontSize="xs" color="gray.500" mb={0.5}>
          Group: {doc.groupDefs.find((g) => g.id === v.activatesGroupId)?.label ?? v.activatesGroupId}
        </Text>
        {v.conversionFormula && (
          <Text fontSize="xs" color="gray.400" fontFamily="mono">{v.conversionFormula}</Text>
        )}
      </Box>
    ))}

    {/* Add new variant */}
    <AddUnitVariantForm
      doc={doc}
      onAdd={(variant) => onUpdateDoc({
        ...doc,
        unitVariants: [...(doc.unitVariants ?? []), variant],
      })}
    />
  </Box>
)}
```

Create the `AddUnitVariantForm` sub-component in the same file:

```tsx
const AddUnitVariantForm: React.FC<{
  doc: CanvasDocument;
  onAdd: (v: UnitVariant) => void;
}> = ({ doc, onAdd }) => {
  const [unit, setUnit] = useState("");
  const [groupId, setGroupId] = useState("");
  const [formula, setFormula] = useState("");

  const canAdd = unit && groupId;

  return (
    <Box pt={2} borderTop="1px solid" borderColor="gray.100">
      <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" mb={1.5}>
        Add Variant
      </Text>
      <Select size="xs" mb={1.5} placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
        {CANONICAL_UNITS.map((u) => (
          <option key={u.code} value={u.code}>{u.label} ({u.code})</option>
        ))}
      </Select>
      <Select size="xs" mb={1.5} placeholder="Activates group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
        {doc.groupDefs.filter((g) => !doc.groupDefs.some((pg) => pg.memberIds.includes(g.id))).map((g) => (
          <option key={g.id} value={g.id}>{g.label}</option>
        ))}
      </Select>
      <Input
        size="xs" mb={1.5}
        placeholder="Conversion formula (optional, e.g. quantity / depth_m)"
        value={formula}
        onChange={(e) => setFormula(e.target.value)}
        fontFamily="mono"
      />
      <Button
        size="xs"
        colorScheme="orange"
        isDisabled={!canAdd}
        onClick={() => {
          onAdd({ unit, activatesGroupId: groupId, conversionFormula: formula || undefined });
          setUnit(""); setGroupId(""); setFormula("");
        }}
      >
        Add Variant
      </Button>
    </Box>
  );
};
```

Add required imports to InspectPanel:
```typescript
import { CANONICAL_UNITS, unitLabel } from "../../../../constants/units";
import { UnitVariant } from "./canvasStorage";
```

- [ ] **Step 2: Wire `onUpdateDoc` through InspectPanel props**

InspectPanel already receives `doc` and a save callback. Ensure the `onUpdateDoc` call (above) dispatches a doc update that gets persisted via the existing `scheduleSave` mechanism in `CalculatorCanvas/index.tsx`.

- [ ] **Step 3: Update QuantityNode canvas visual to show supported units**

In `client/src/components/pages/developer/CalculatorCanvas/nodeTypes.tsx`, find `QuantityNode`. Add a footer that lists the supported unit codes when `data.unitVariants` is present:

```tsx
{(data.unitVariants ?? []).length > 0 && (
  <div style={{ fontSize: 10, color: "#f59e0b", padding: "4px 8px 2px", borderTop: "1px solid #374151" }}>
    {data.unitVariants.map((v: any) => unitLabel(v.unit)).join(" · ")}
  </div>
)}
```

In `CalculatorCanvas/index.tsx`, ensure the Quantity node's `data` prop includes `unitVariants: doc.unitVariants ?? []` when building the node list.

- [ ] **Step 4: Type-check**

```bash
cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
cd /home/dev/work/bow-mark/client
git add src/components/pages/developer/CalculatorCanvas/
git commit -m "feat: Quantity node unit variants editor in InspectPanel + canvas visual"
```

---

## Phase 3 — Buildup Picker Filtering

---

### Task 12: Filter buildup template picker by line item unit

**Files:**
- Modify: `client/src/components/TenderPricing/LineItemDetail.tsx`

The `AttachTemplateButton` component currently shows all templates with no filtering. After this task, it filters to templates that either:
- Have no `unitVariants` (compatible with all units), or
- Have a `unitVariant` entry whose `unit` matches the line item's current `unit`.

- [ ] **Step 1: Add a unit compatibility helper**

At the top of `LineItemDetail.tsx` (or in a local utils block), add:

```typescript
function templateSupportsUnit(templateDoc: CanvasDocument, unit: string | null | undefined): boolean {
  if (!unit) return true;                           // no unit on row — show everything
  if (!templateDoc.unitVariants?.length) return true; // no variants — compatible with all units
  return templateDoc.unitVariants.some((v) => v.unit === unit);
}
```

- [ ] **Step 2: Apply filter in `AttachTemplateButton`**

`AttachTemplateButton` currently receives `row` as a prop (it needs it for the `onAttach` callback). Pass `row.unit` into the filtering:

```typescript
const filtered = React.useMemo(
  () => templates.filter((t) => templateSupportsUnit(t, row.unit)),
  [templates, row.unit]
);
```

Render `filtered` instead of `templates` in the list.

If `filtered` is empty and `templates` is non-empty, show a message:
```tsx
{filtered.length === 0 && templates.length > 0 && (
  <Text fontSize="xs" color="gray.400" p={3}>
    No buildups found for unit "{row.unit}". Add a unit variant in the canvas editor or change the line item unit.
  </Text>
)}
```

- [ ] **Step 3: Type-check**

```bash
cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | head -20
```

- [ ] **Step 4: Check server logs after any canvas changes**

```bash
kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=30
```
Expected: no TSError or crash loops.

- [ ] **Step 5: Final commit**

```bash
cd /home/dev/work/bow-mark/client
git add src/components/TenderPricing/LineItemDetail.tsx
git commit -m "feat: filter buildup picker by line item unit compatibility"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Canonical units defined as server const, mirrored on client — Task 1
- ✅ `unitDefaults` → `unitExtras`, canonical units removed from it — Tasks 2–4
- ✅ All unit dropdowns updated to canonical + extras pattern — Task 4
- ✅ Data migration remaps "tonnes"→"t", "each"→"ea", "sq.ft."→"sqft" — Task 5
- ✅ `UnitVariant` type added to `CanvasDocument` — Task 6
- ✅ Server schema updated — Task 6
- ✅ `computeInactiveNodeIds` deactivates non-matching unit variant groups — Task 8
- ✅ `computeSnapshotUnitPrice` normalises quantity via conversion formula — Task 8
- ✅ `RateBuildupInputs` receives `unit`, activates right branch — Task 9
- ✅ `unit` flows from row → LineItemDetail → rowId → CalculatorCanvas → LiveTestPanel — Task 10
- ✅ Quantity node InspectPanel allows adding/removing unit variants — Task 11
- ✅ Quantity node canvas visual shows supported units — Task 11
- ✅ Buildup picker filters by unit compatibility — Task 12

**Type consistency check:**
- `UnitVariant` defined in `canvasStorage.ts` — used in `CanvasDocument`, `RateBuildupInputs`, `InspectPanel`. Consistent throughout.
- `computeInactiveNodeIds(doc, controllers, activeUnit?)` — three call sites: `RateBuildupInputs` (passes `unit`), `computeSnapshotUnitPrice` (passes `unit`), and `CalculatorCanvas/index.tsx` (no unit needed in the canvas editor flow, `undefined` is fine).
- `computeSnapshotUnitPrice(snapshot, rawQuantity, unit?)` — called from `LineItemDetail` (passes `row.unit`) and `rowId.tsx` (passes `urlUnit`). Consistent.
- `evaluateExpression` exported from `evaluate.ts` — imported in `canvasStorage.ts` and `RateBuildupInputs.tsx`. Consistent.

**Placeholder scan:** None found. All steps contain complete code or exact commands.
