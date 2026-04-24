# Rate Buildup Schema Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the rate buildup data model before the tender integration: co-locate canvas positions into each node def, co-locate default values/rows into their defs, properly type `controllerDefs` and `groupDefs` on the server (currently JSON strings), and establish the base type hierarchy that the snapshot system will extend.

**Architecture:** Introduce `Position`, `CanvasNodeBase`, and per-type canvas-specific interfaces (`CanvasParameterDef`, `CanvasTableDef`, etc.) that extend the existing general defs with canvas concerns. `CanvasDocument` switches to these richer types. The server schema replaces JSON string fields for `controllerDefs`, `groupDefs`, `nodePositions`, and `defaultInputs` with properly typed Typegoose sub-documents. A migration script ports all existing template data to the new shape.

**Tech Stack:** React 17, Next.js 12, TypeScript, Typegoose/Mongoose, Type-GraphQL, Apollo Client

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `client/src/components/TenderPricing/calculators/types.ts` | Modify | Add `Position`, `CanvasNodeBase`; extend all def types with canvas variants |
| `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts` | Modify | Update `ControllerDef`, `GroupDef` bases; update `CanvasDocument` to use canvas def types; remove `nodePositions`/`defaultInputs`; update `fragmentToDoc`/`docToVariables`/`blankDocument` |
| `client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx` | Modify | Read positions from defs instead of `nodePositions` map |
| `client/src/components/pages/developer/CalculatorCanvas/canvasOps.ts` | Modify | Update `ClipboardPayload` and all ops to use new def shapes |
| `client/src/components/pages/developer/CalculatorCanvas/index.tsx` | Modify | Remove `nodePositions` references; seed controller defaults from defs |
| `client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx` | Modify | Seed params from `def.defaultValue`, tables from `def.defaultRows` |
| `client/src/components/TenderPricing/calculators/evaluate.ts` | Modify | Seed param defaults from `def.defaultValue`, tables from `def.defaultRows` |
| `server/src/models/RateBuildupTemplate/schema/index.ts` | Modify | Add typed Typegoose classes for position, controller options, controller defs, group activation, group defs; add fields to existing def classes; remove JSON string fields |
| `server/src/graphql/resolvers/rateBuildupTemplate/mutations.ts` | Modify | Update `SaveRateBuildupTemplateData` input type + `save()` to match new schema |
| `server/src/scripts/migrate-rate-buildup-schema.ts` | Create | One-time migration: move positions into defs, move defaultInputs into defs, parse groupDefs/controllerDefs from JSON strings to structured data |

---

## Task 1: Add `Position`, `CanvasNodeBase`, and canvas-specific def types to `types.ts`

**Files:**
- Modify: `client/src/components/TenderPricing/calculators/types.ts`

The general def types (`ParameterDef`, `TableDef`, etc.) stay intact for the old static calculator system. New canvas-specific variants extend them with `position` and canvas-only fields. This keeps the old calculators untouched.

- [ ] **Step 1: Add `Position` and `CanvasNodeBase`**

After the imports/top of file, add:

```ts
export interface Position {
  x: number;
  y: number;
  w?: number; // used by group nodes for resize
  h?: number;
}

/** All canvas nodes carry an id and a canvas position. */
export interface CanvasNodeBase {
  id: string;
  position: Position;
}
```

- [ ] **Step 2: Add `hint?` to `ParameterDef` and `TableDef`**

```ts
export interface ParameterDef {
  id: string;
  label: string;
  prefix?: string;
  suffix?: string;
  defaultValue: number;
  hint?: string;     // ← new
}

export interface TableDef {
  id: string;
  label: string;
  rowLabel: string;
  hint?: string;     // ← new
}
```

- [ ] **Step 3: Add canvas-specific def types**

```ts
/** ParameterDef as it lives in a CanvasDocument — carries canvas position. */
export interface CanvasParameterDef extends ParameterDef, CanvasNodeBase {}

/** TableDef as it lives in a CanvasDocument — carries position and seeded default rows. */
export interface CanvasTableDef extends TableDef, CanvasNodeBase {
  defaultRows: RateEntry[];
}

/** FormulaStep as it lives in a CanvasDocument — carries canvas position. */
export interface CanvasFormulaStep extends FormulaStep, CanvasNodeBase {}

/** BreakdownDef as it lives in a CanvasDocument — carries canvas position. */
export interface CanvasBreakdownDef extends BreakdownDef, CanvasNodeBase {}
```

Note: `IntermediateDef` does NOT get a canvas variant — intermediates are not rendered as nodes on the canvas (they appear only in the LiveTestPanel result section).

- [ ] **Step 4: Add `SpecialNodePositions` for the two synthetic nodes**

```ts
/** Positions for the two synthetic canvas nodes that have no def. */
export interface SpecialNodePositions {
  quantity: Position;
  unitPrice: Position;
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/TenderPricing/calculators/types.ts
git commit -m "refactor: add Position, CanvasNodeBase, and canvas-specific def types to calculator types"
```

---

## Task 2: Update `ControllerDef`, `GroupDef`, and `CanvasDocument` in `canvasStorage.ts`

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts`

- [ ] **Step 1: Add `hint?` to `ControllerDef` and `position` to both `ControllerDef` and `GroupDef`**

```ts
export interface ControllerDef {
  id: string;
  label: string;
  type: "percentage" | "toggle" | "selector";
  defaultValue?: number | boolean;
  options?: ControllerOption[];
  defaultSelected?: string[];
  hint?: string;        // ← new
  position: Position;   // ← new
}

export interface GroupDef {
  id: string;
  label: string;
  parentGroupId?: string;
  memberIds: string[];
  activation?: GroupActivation;
  position: Position;   // ← new (carries w/h for group resize)
}
```

Import `Position` from `calculators/types`:
```ts
import { Position, CanvasParameterDef, CanvasTableDef, CanvasFormulaStep, CanvasBreakdownDef, SpecialNodePositions } from "../../../../components/TenderPricing/calculators/types";
```

- [ ] **Step 2: Update `CanvasDocument` to use canvas def types; remove `nodePositions` and `defaultInputs`**

```ts
export interface CanvasDocument {
  id: string;
  label: string;
  defaultUnit: string;
  parameterDefs: CanvasParameterDef[];      // ← was ParameterDef[]
  tableDefs: CanvasTableDef[];              // ← was TableDef[]
  formulaSteps: CanvasFormulaStep[];        // ← was FormulaStep[]
  breakdownDefs: CanvasBreakdownDef[];      // ← was BreakdownDef[]
  intermediateDefs: IntermediateDef[];      // unchanged — no canvas position needed
  specialPositions: SpecialNodePositions;  // ← replaces nodePositions["quantity"/"unitPrice"]
  groupDefs: GroupDef[];
  controllerDefs: ControllerDef[];
  // REMOVED: defaultInputs (now on each def)
  // REMOVED: nodePositions (now on each def)
}
```

- [ ] **Step 3: Update `fragmentToDoc` to parse new structure from server fragment**

The server still sends the old JSON string fields during the transition. `fragmentToDoc` unpacks them:

```ts
function fragmentToDoc(f: RateBuildupTemplateFullSnippetFragment): CanvasDocument {
  // Parse the JSON string fields (server sends new typed fields starting after migration)
  // After migration, server sends typed sub-docs; before migration, we parse JSON strings.
  // The fragment will reflect the new typed fields once the server schema is updated.

  const specialPositions: SpecialNodePositions = {
    quantity: { x: 100, y: 200 },
    unitPrice: { x: 700, y: 200 },
  };
  if (f.specialPositions) {
    try {
      const sp = typeof f.specialPositions === "string"
        ? JSON.parse(f.specialPositions)
        : f.specialPositions;
      if (sp.quantity) specialPositions.quantity = sp.quantity;
      if (sp.unitPrice) specialPositions.unitPrice = sp.unitPrice;
    } catch { /* ignore */ }
  }

  return {
    id: f._id,
    label: f.label,
    defaultUnit: f.defaultUnit ?? "unit",
    parameterDefs: (f.parameterDefs ?? []) as CanvasParameterDef[],
    tableDefs: (f.tableDefs ?? []) as CanvasTableDef[],
    formulaSteps: (f.formulaSteps ?? []) as CanvasFormulaStep[],
    breakdownDefs: (f.breakdownDefs ?? []) as CanvasBreakdownDef[],
    intermediateDefs: (f.intermediateDefs ?? []) as IntermediateDef[],
    specialPositions,
    groupDefs: (f.groupDefs ?? []) as GroupDef[],
    controllerDefs: (f.controllerDefs ?? []) as ControllerDef[],
  };
}
```

- [ ] **Step 4: Update `docToVariables` to send new structure**

Remove `defaultInputs` and `nodePositions` fields. Send `specialPositions` as a new field. The typed arrays (parameterDefs, tableDefs, etc.) are already sent as arrays — they now carry `position` and `defaultRows` fields naturally:

```ts
function docToVariables(doc: CanvasDocument, idRemap: Map<string, string>): SaveRateBuildupTemplateMutationVariables {
  const serverId = idRemap.get(doc.id) ?? doc.id;
  const isNew = serverId.startsWith("new_");
  return {
    data: {
      id: isNew ? undefined : serverId,
      label: doc.label,
      defaultUnit: doc.defaultUnit,
      parameterDefs: omitTypename(doc.parameterDefs),
      tableDefs: omitTypename(doc.tableDefs),
      formulaSteps: omitTypename(doc.formulaSteps),
      breakdownDefs: omitTypename(doc.breakdownDefs),
      intermediateDefs: omitTypename(doc.intermediateDefs),
      specialPositions: JSON.stringify(doc.specialPositions),
      groupDefs: omitTypename(doc.groupDefs),
      controllerDefs: omitTypename(doc.controllerDefs),
      // REMOVED: defaultInputs, nodePositions
    },
  };
}
```

- [ ] **Step 5: Update `blankDocument`**

```ts
function blankDocument(): CanvasDocument {
  return {
    id: `new_${Date.now()}`,
    label: "New Template",
    defaultUnit: "unit",
    parameterDefs: [],
    tableDefs: [],
    formulaSteps: [],
    breakdownDefs: [],
    intermediateDefs: [],
    specialPositions: {
      quantity: { x: 100, y: 200 },
      unitPrice: { x: 700, y: 200 },
    },
    groupDefs: [],
    controllerDefs: [],
  };
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts
git commit -m "refactor: CanvasDocument uses canvas def types; remove nodePositions/defaultInputs; add specialPositions"
```

---

## Task 3: Update `CanvasFlow.tsx` to read positions from defs

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx`

- [ ] **Step 1: Remove the `positions` parameter from `buildNodes`; read from defs directly**

Change the signature:
```ts
function buildNodes(
  doc: CanvasDocument,
  stepDebug: StepDebugInfo[],
  quantity: number,
  onQuantityChange: (v: number) => void,
  onGroupResizeEnd: (groupId: string, w: number, h: number) => void
): Node[]
```

Update `makeNode` to read position from the def directly, not from a positions map:

```ts
const makeNode = (
  id: string,
  type: string,
  data: Record<string, unknown>,
  position: Position,
  w?: number,
  h?: number
): Node => {
  const parentId = memberOf[id];
  return {
    id,
    type,
    position: { x: position.x, y: position.y },
    ...(w !== undefined ? { style: { width: w, height: h } } : {}),
    ...(parentId !== undefined ? { parentId } : {}),
    data,
  };
};
```

- [ ] **Step 2: Update each node builder to pass position from its def**

Controllers (pass `c.position`):
```ts
for (const c of (doc.controllerDefs ?? [])) {
  nodes.push(makeNode(c.id, "controller", { ... }, c.position));
}
```

Groups (pass `g.position`, use `g.position.w`/`g.position.h` for size):
```ts
for (const g of doc.groupDefs) {
  nodes.push(makeNode(g.id, "group", { ... }, g.position, g.position.w ?? 400, g.position.h ?? 300));
}
```

Params (pass `p.position`; read value from `p.defaultValue` directly):
```ts
for (const p of doc.parameterDefs) {
  nodes.push(makeNode(p.id, "param", {
    id: p.id, label: p.label, suffix: p.suffix,
    value: p.defaultValue,       // ← was: doc.defaultInputs.params[p.id] ?? p.defaultValue
  }, p.position));
}
```

Tables (pass `t.position`; read rows from `t.defaultRows`):
```ts
for (const t of doc.tableDefs) {
  const nodeId = `${t.id}RatePerHr`;
  const rows = t.defaultRows ?? [];
  const ratePerHr = rows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);
  nodes.push(makeNode(nodeId, "table", { id: nodeId, label: t.label, value: ratePerHr }, t.position));
}
```

Singletons (use `doc.specialPositions`):
```ts
nodes.push({
  id: "quantity",
  type: "quantity",
  position: { x: doc.specialPositions.quantity.x, y: doc.specialPositions.quantity.y },
  data: { value: quantity, onChange: onQuantityChange },
});
// ...
nodes.push({
  id: "unitPrice",
  type: "priceOutput",
  position: { x: doc.specialPositions.unitPrice.x, y: doc.specialPositions.unitPrice.y },
  data: { value: unitPrice },
});
```

Formula steps (pass `step.position`):
```ts
for (const step of doc.formulaSteps) {
  nodes.push(makeNode(step.id, "formula", { ... }, step.position));
}
```

Breakdown defs (pass `bd.position`):
```ts
for (const bd of doc.breakdownDefs) {
  nodes.push(makeNode(bd.id, "breakdown", { ... }, bd.position));
}
```

- [ ] **Step 3: Update node drag/resize handlers to write position back to the correct def**

Find where `onNodeDragStop` saves positions back to `doc.nodePositions` and update it to write position back into the appropriate def:

```ts
const handleNodeDragStop: NodeDragStopHandler = useCallback(
  (_, node) => {
    const { id, position } = node;
    let updated: CanvasDocument | null = null;

    if (id === "quantity" || id === "unitPrice") {
      updated = {
        ...doc,
        specialPositions: {
          ...doc.specialPositions,
          [id]: { x: position.x, y: position.y },
        },
      };
    } else if (doc.parameterDefs.some(p => p.id === id)) {
      updated = { ...doc, parameterDefs: doc.parameterDefs.map(p =>
        p.id === id ? { ...p, position: { ...p.position, x: position.x, y: position.y } } : p
      )};
    } else if (doc.tableDefs.some(t => `${t.id}RatePerHr` === id)) {
      updated = { ...doc, tableDefs: doc.tableDefs.map(t =>
        `${t.id}RatePerHr` === id ? { ...t, position: { ...t.position, x: position.x, y: position.y } } : t
      )};
    } else if (doc.formulaSteps.some(s => s.id === id)) {
      updated = { ...doc, formulaSteps: doc.formulaSteps.map(s =>
        s.id === id ? { ...s, position: { ...s.position, x: position.x, y: position.y } } : s
      )};
    } else if (doc.breakdownDefs.some(b => b.id === id)) {
      updated = { ...doc, breakdownDefs: doc.breakdownDefs.map(b =>
        b.id === id ? { ...b, position: { ...b.position, x: position.x, y: position.y } } : b
      )};
    } else if (doc.controllerDefs.some(c => c.id === id)) {
      updated = { ...doc, controllerDefs: doc.controllerDefs.map(c =>
        c.id === id ? { ...c, position: { ...c.position, x: position.x, y: position.y } } : c
      )};
    } else if (doc.groupDefs.some(g => g.id === id)) {
      updated = { ...doc, groupDefs: doc.groupDefs.map(g =>
        g.id === id ? { ...g, position: { ...g.position, x: position.x, y: position.y } } : g
      )};
    }

    if (updated) onSave(updated);
  },
  [doc, onSave]
);
```

Similarly update the group resize handler to write `w`/`h` back to `g.position`:
```ts
const handleGroupResizeEnd = useCallback(
  (groupId: string, w: number, h: number) => {
    const updated = { ...doc, groupDefs: doc.groupDefs.map(g =>
      g.id === groupId ? { ...g, position: { ...g.position, w, h } } : g
    )};
    onSave(updated);
  },
  [doc, onSave]
);
```

- [ ] **Step 4: Remove the `positions` state and effect that synced from `doc.nodePositions`**

The current code likely has something like:
```ts
const [positions, setPositions] = useState(doc.nodePositions ? JSON.parse(doc.nodePositions) : {});
```
Remove it entirely — positions are read directly from defs now.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx
git commit -m "refactor: CanvasFlow reads/writes positions from node defs, not nodePositions map"
```

---

## Task 4: Update `canvasOps.ts`

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/canvasOps.ts`

- [ ] **Step 1: Update `ClipboardPayload` to use canvas def types and remove separate positions**

```ts
export interface ClipboardPayload {
  formulaSteps: CanvasFormulaStep[];
  parameterDefs: CanvasParameterDef[];
  tableDefs: CanvasTableDef[];
  breakdownDefs: CanvasBreakdownDef[];
  // REMOVED: tableInputs (defaultRows now on CanvasTableDef)
  // REMOVED: positions (position now on each def)
}
```

- [ ] **Step 2: Update `copyNodes` to use the new def shapes**

When collecting `tableDefs`, no need to separately collect `tableInputs` — the rows are on `t.defaultRows`. Remove all references to `tableInputs` and `positions` in the clipboard payload.

- [ ] **Step 3: Update `pasteNodes` to offset positions on the def objects directly**

Instead of `positions[newId] = { x: origPos.x + offset.x, y: origPos.y + offset.y }`, map over the pasted defs and offset their `.position`:

```ts
const offset = { x: pasteTarget.x - avgX, y: pasteTarget.y - avgY };

const newParams = renamedParams.map(p => ({
  ...p,
  position: { ...p.position, x: p.position.x + offset.x, y: p.position.y + offset.y },
}));
// same for formulaSteps, tableDefs, breakdownDefs
```

- [ ] **Step 4: Update `createNode` to accept a `position` arg and set it on the new def**

```ts
export function createNode(
  type: "formula" | "param" | "table" | "breakdown",
  doc: CanvasDocument,
  position: { x: number; y: number }
): { doc: CanvasDocument; newId: string }
```

Set `position` on the new def object rather than writing to `nodePositions`.

- [ ] **Step 5: Update `createGroup` and `createController` similarly**

Both currently write to `doc.nodePositions`. Update them to set `position` on the new `GroupDef`/`ControllerDef`.

- [ ] **Step 6: Update `renameNodeId` to update position on the def (not in nodePositions)**

Since positions are now on the def objects keyed by `id`, renaming a node ID just means the def's `id` changes — the position travels with it. No separate `nodePositions` key to rename.

- [ ] **Step 7: Update `layoutEngine.ts` if it reads/writes `nodePositions`**

Check `layoutEngine.ts` — if it reads positions from `doc.nodePositions` for the auto-layout (dagre), update it to read from defs and write back to defs.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/canvasOps.ts \
        client/src/components/pages/developer/CalculatorCanvas/layoutEngine.ts
git commit -m "refactor: canvasOps uses canvas def types with co-located positions"
```

---

## Task 5: Update `evaluate.ts` and `LiveTestPanel.tsx` to read from defs

**Files:**
- Modify: `client/src/components/TenderPricing/calculators/evaluate.ts`
- Modify: `client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx`

- [ ] **Step 1: Update `evaluateTemplate` to use `def.defaultValue` and `def.defaultRows`**

The `inputs` parameter is kept for cases where the caller provides overrides (e.g., the tender row canvas page). When `inputs` is not provided, fall back to the def's built-in defaults:

```ts
export function evaluateTemplate(
  template: CalculatorTemplate,
  inputs?: CalculatorInputs,   // ← now optional
  quantity: number = 1,
  controllerValues?: Record<string, number>,
  inactiveNodeIds?: Set<string>
): CalculatorResult {
  const ctx: Record<string, number> = { quantity };

  for (const p of template.parameterDefs) {
    ctx[p.id] = inputs?.params[p.id] ?? p.defaultValue;
  }

  for (const t of template.tableDefs) {
    const rows = inputs?.tables[t.id] ?? (t as CanvasTableDef).defaultRows ?? [];
    ctx[`${t.id}RatePerHr`] = rows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);
  }
  // ... rest unchanged
}
```

Same change for `debugEvaluateTemplate`.

- [ ] **Step 2: Update `LiveTestPanel` to seed params from `def.defaultValue` and tables from `def.defaultRows`**

```ts
const [params, setParams] = useState<Record<string, number>>(() => {
  const result: Record<string, number> = {};
  for (const p of doc.parameterDefs) {
    result[p.id] = p.defaultValue;  // ← was: doc.defaultInputs?.params[p.id] ?? p.defaultValue
  }
  return result;
});

const [tables, setTables] = useState<Record<string, RateEntry[]>>(() => {
  const result: Record<string, RateEntry[]> = {};
  for (const t of doc.tableDefs) {
    result[t.id] = (t as CanvasTableDef).defaultRows ?? [];  // ← was: doc.defaultInputs?.tables[t.id] ?? []
  }
  return result;
});
```

- [ ] **Step 3: Update `index.tsx` controller defaults to read from `controllerDefs` directly**

The memos that build `controllerDefaults` and `canvasControllers` already read from `doc.controllerDefs` — no change needed there. But remove any remaining reference to `doc.defaultInputs` or `doc.nodePositions`.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/TenderPricing/calculators/evaluate.ts \
        client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx \
        client/src/components/pages/developer/CalculatorCanvas/index.tsx
git commit -m "refactor: evaluator and LiveTestPanel seed from def.defaultValue/defaultRows"
```

---

## Task 6: Update server schema — properly type all sub-documents

**Files:**
- Modify: `server/src/models/RateBuildupTemplate/schema/index.ts`
- Modify: `server/src/graphql/resolvers/rateBuildupTemplate/mutations.ts`

- [ ] **Step 1: Add `RateBuildupPosition` class and update all existing def classes with position + new fields**

```ts
@ObjectType()
export class RateBuildupPosition {
  @Field(() => Float) @prop({ required: true }) public x!: number;
  @Field(() => Float) @prop({ required: true }) public y!: number;
  @Field(() => Float, { nullable: true }) @prop() public w?: number;
  @Field(() => Float, { nullable: true }) @prop() public h?: number;
}

// Update RateBuildupParameterDef:
@ObjectType()
export class RateBuildupParameterDef {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public label!: string;
  @Field({ nullable: true }) @prop() public prefix?: string;
  @Field({ nullable: true }) @prop() public suffix?: string;
  @Field(() => Float) @prop({ required: true }) public defaultValue!: number;
  @Field({ nullable: true }) @prop() public hint?: string;              // ← new
  @Field(() => RateBuildupPosition) @prop({ type: () => RateBuildupPosition, _id: false })
  public position!: RateBuildupPosition;                               // ← new
}

// Update RateBuildupTableDef — add position, defaultRows, hint:
@ObjectType()
export class RateBuildupRateEntry {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public name!: string;
  @Field(() => Float) @prop({ required: true }) public qty!: number;
  @Field(() => Float) @prop({ required: true }) public ratePerHour!: number;
}

@ObjectType()
export class RateBuildupTableDef {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public label!: string;
  @Field() @prop({ required: true }) public rowLabel!: string;
  @Field({ nullable: true }) @prop() public hint?: string;
  @Field(() => [RateBuildupRateEntry])
  @prop({ type: () => [RateBuildupRateEntry], _id: false, default: [] })
  public defaultRows!: RateBuildupRateEntry[];
  @Field(() => RateBuildupPosition) @prop({ type: () => RateBuildupPosition, _id: false })
  public position!: RateBuildupPosition;
}

// Add position to FormulaStep, BreakdownDef — same pattern as above
// (add @Field + @prop for position on each)
```

- [ ] **Step 2: Add `RateBuildupControllerOption`, `RateBuildupControllerDef` classes**

```ts
@ObjectType()
export class RateBuildupControllerOption {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public label!: string;
}

@ObjectType()
export class RateBuildupControllerDef {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public label!: string;
  @Field() @prop({ required: true }) public type!: string; // "percentage" | "toggle" | "selector"
  @Field(() => Float, { nullable: true }) @prop() public defaultValue?: number; // booleans stored as 0/1
  @Field(() => [RateBuildupControllerOption], { nullable: true })
  @prop({ type: () => [RateBuildupControllerOption], _id: false })
  public options?: RateBuildupControllerOption[];
  @Field(() => [String], { nullable: true })
  @prop({ type: () => [String] })
  public defaultSelected?: string[];
  @Field({ nullable: true }) @prop() public hint?: string;
  @Field(() => RateBuildupPosition) @prop({ type: () => RateBuildupPosition, _id: false })
  public position!: RateBuildupPosition;
}
```

Note: `defaultValue` on `ControllerDef` is `number | boolean` client-side. On the server, store as `number` (booleans as 0/1). `fragmentToDoc` converts back: `type === "toggle" ? c.defaultValue === 1 : c.defaultValue`.

- [ ] **Step 3: Add `RateBuildupGroupActivation` and `RateBuildupGroupDef` classes**

```ts
@ObjectType()
export class RateBuildupGroupActivation {
  @Field() @prop({ required: true }) public controllerId!: string;
  @Field({ nullable: true }) @prop() public condition?: string;
  @Field({ nullable: true }) @prop() public optionId?: string;
}

@ObjectType()
export class RateBuildupGroupDef {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public label!: string;
  @Field({ nullable: true }) @prop() public parentGroupId?: string;
  @Field(() => [String]) @prop({ type: () => [String], default: [] }) public memberIds!: string[];
  @Field(() => RateBuildupGroupActivation, { nullable: true })
  @prop({ type: () => RateBuildupGroupActivation, _id: false })
  public activation?: RateBuildupGroupActivation;
  @Field(() => RateBuildupPosition) @prop({ type: () => RateBuildupPosition, _id: false })
  public position!: RateBuildupPosition;
}
```

- [ ] **Step 4: Update `RateBuildupTemplateSchema` — replace JSON string fields with typed arrays; add `specialPositions`**

```ts
// REMOVE these three JSON string fields:
// public defaultInputs!: string;
// public nodePositions!: string;
// public groupDefs!: string;
// public controllerDefs!: string;

// ADD:
@Field(() => [RateBuildupControllerDef])
@prop({ type: () => [RateBuildupControllerDef], _id: false, default: [] })
public controllerDefs!: RateBuildupControllerDef[];

@Field(() => [RateBuildupGroupDef])
@prop({ type: () => [RateBuildupGroupDef], _id: false, default: [] })
public groupDefs!: RateBuildupGroupDef[];

@Field({ nullable: true })
@prop()
public specialPositions?: string; // JSON: { quantity: Position, unitPrice: Position }
```

`specialPositions` stays as a JSON string for now — it's a simple 2-key object and doesn't warrant a full sub-document class.

- [ ] **Step 5: Update `SaveRateBuildupTemplateData` and `save()` in `mutations.ts` to match**

Add input type classes for all the new typed sub-documents (mirror the schema classes with `@InputType` instead of `@ObjectType`). Update `SaveRateBuildupTemplateData` to replace the JSON string fields with typed input arrays. Update `save()` to assign the typed arrays directly.

The pattern: for each `@ObjectType` class added in Step 1-3, create a matching `@InputType` class (e.g., `RateBuildupControllerDefInput`). `SaveRateBuildupTemplateData` then declares:

```ts
@Field(() => [RateBuildupControllerDefInput]) public controllerDefs!: RateBuildupControllerDefInput[];
@Field(() => [RateBuildupGroupDefInput]) public groupDefs!: RateBuildupGroupDefInput[];
@Field({ nullable: true }) public specialPositions?: string;
// REMOVED: defaultInputs, nodePositions (as JSON strings)
```

- [ ] **Step 6: Run codegen and check server starts**

```bash
cd client && npm run codegen
```

```bash
kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=30
```

- [ ] **Step 7: Commit**

```bash
git add server/src/models/RateBuildupTemplate/schema/index.ts \
        server/src/graphql/resolvers/rateBuildupTemplate/mutations.ts \
        client/src/generated/graphql.ts
git commit -m "refactor: properly type controllerDefs and groupDefs on server; add positions to all def sub-documents"
```

---

## Task 7: Migration script

**Files:**
- Create: `server/src/scripts/migrate-rate-buildup-schema.ts`

This script ports all existing template documents to the new shape. Run once in dev, verify, then run in production.

- [ ] **Step 1: Write the migration script**

```ts
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
```

- [ ] **Step 2: Run the migration in dev**

```bash
kubectl exec -it $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') -- \
  npx ts-node -r tsconfig-paths/register src/scripts/migrate-rate-buildup-schema.ts
```

Expected output: one `✓ <label>` line per template, then "Migration complete."

- [ ] **Step 3: Open the canvas tool in the browser and verify templates load correctly**

Navigate to `/pricing/rate-builder/[id]`. Confirm:
- All nodes appear in their correct positions
- Parameter default values are correct
- Table default rows are populated
- Controller nodes appear and connect to groups
- Groups render with correct size

- [ ] **Step 4: Commit**

```bash
git add server/src/scripts/migrate-rate-buildup-schema.ts
git commit -m "feat: migration script for rate buildup schema v2 — co-locate positions and defaults into defs"
```

---

## Self-Review

**Spec coverage:**
- ✅ `Position`, `CanvasNodeBase` defined
- ✅ Base/canvas variants established for all node types (ready for snapshot extension)
- ✅ `hint?` on `ParameterDef`, `TableDef`, `ControllerDef`
- ✅ `defaultRows` on `CanvasTableDef`/`RateBuildupTableDef`
- ✅ `position` co-located on every canvas node def
- ✅ `defaultInputs` removed from `CanvasDocument` and server schema
- ✅ `nodePositions` removed; replaced by `specialPositions` for the two synthetic nodes
- ✅ `controllerDefs` and `groupDefs` properly typed on server (no more JSON strings)
- ✅ Migration script moves all existing data to new shape
- ✅ Old static calculator system (`CalculatorTemplate`) untouched

**Type consistency:**
- `CanvasDocument.parameterDefs: CanvasParameterDef[]` — `CanvasParameterDef extends ParameterDef` ✅
- `CanvasDocument.tableDefs: CanvasTableDef[]` — has `defaultRows` + `position` ✅
- `evaluateTemplate` uses `inputs?.params[p.id] ?? p.defaultValue` — optional override pattern ✅
- Server `defaultValue` on controller: stored as `number` (booleans as 0/1), converted in `fragmentToDoc` ✅
- `specialPositions` stays as JSON string on server (simple 2-key object, not worth a sub-document class) ✅
