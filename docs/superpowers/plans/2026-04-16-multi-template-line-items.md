# Multi-Template Line Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single rate buildup snapshot per pricing row with a flat array, letting estimators attach multiple templates that sum to produce the unit price.

**Architecture:** Add `rateBuildupSnapshots: RateBuildupSnapshotEntry[]` (wrapper with `snapshot` JSON string + optional `memo`) to the row schema. Old `rateBuildupSnapshot` field kept on Mongoose for read safety but not exposed in GraphQL. Client reads/writes the new array field exclusively. LineItemDetail renders a collapsible card per snapshot.

**Tech Stack:** Typegoose/Mongoose, Type-GraphQL, Apollo Client, Chakra UI, Next.js

**Spec:** `docs/superpowers/specs/2026-04-16-multi-template-line-items-design.md`

---

### Task 1: Server schema and types

**Files:**
- Modify: `server/src/models/TenderPricingSheet/schema/index.ts`
- Modify: `server/src/typescript/tenderPricingSheet.ts`
- Modify: `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts`

- [ ] **Step 1: Add `RateBuildupSnapshotEntryClass` to Mongoose schema**

In `server/src/models/TenderPricingSheet/schema/index.ts`, add before `TenderPricingRowClass`:

```typescript
@ObjectType()
export class RateBuildupSnapshotEntryClass {
  @Field()
  @prop({ required: true })
  public snapshot!: string;

  @Field({ nullable: true })
  @prop({ trim: true })
  public memo?: string;
}
```

Then add the field on `TenderPricingRowClass` (after `rateBuildupSnapshot`):

```typescript
@Field(() => [RateBuildupSnapshotEntryClass])
@prop({ type: () => [RateBuildupSnapshotEntryClass], _id: false, default: [] })
public rateBuildupSnapshots!: RateBuildupSnapshotEntryClass[];
```

Keep the old `rateBuildupSnapshot` field as-is (read-only safety net).

- [ ] **Step 2: Add TypeScript interfaces**

In `server/src/typescript/tenderPricingSheet.ts`, add:

```typescript
export interface IRateBuildupSnapshotEntry {
  snapshot: string;
  memo?: string;
}
```

Update `ITenderPricingRowUpdate`:

```typescript
// Add alongside existing rateBuildupSnapshot (which stays for now):
rateBuildupSnapshots?: IRateBuildupSnapshotEntry[] | null;
```

- [ ] **Step 3: Add GraphQL input type**

In `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts`, add before `TenderPricingRowUpdateData`:

```typescript
@InputType()
export class RateBuildupSnapshotEntryInput {
  @Field()
  public snapshot!: string;

  @Field({ nullable: true })
  public memo?: string;
}
```

Add to `TenderPricingRowUpdateData`:

```typescript
@Field(() => [RateBuildupSnapshotEntryInput], { nullable: true })
public rateBuildupSnapshots?: RateBuildupSnapshotEntryInput[] | null;
```

- [ ] **Step 4: Commit**

```bash
git add server/src/models/TenderPricingSheet/schema/index.ts \
  server/src/typescript/tenderPricingSheet.ts \
  server/src/graphql/resolvers/tenderPricingSheet/mutations.ts
git commit -m "feat: add rateBuildupSnapshots schema, types, and GraphQL input"
```

---

### Task 2: Server update logic and bridging

**Files:**
- Modify: `server/src/models/TenderPricingSheet/class/update.ts`
- Modify: `server/src/graphql/resolvers/tenderPricingSheet/index.ts`
- Modify: `server/src/typescript/tenderReview.ts`
- Modify: `server/src/mcp/tools/tender.ts`

- [ ] **Step 1: Handle `rateBuildupSnapshots` in update.ts**

In `server/src/models/TenderPricingSheet/class/update.ts`, after the existing `rateBuildupSnapshot` handling (line ~50), add:

```typescript
if (data.rateBuildupSnapshots !== undefined) {
  if (data.rateBuildupSnapshots === null) {
    row.rateBuildupSnapshots = [];
  } else {
    row.rateBuildupSnapshots = data.rateBuildupSnapshots as any;
  }
}
```

In the duplicate logic (~line 157), add after `rateBuildupSnapshot`:

```typescript
rateBuildupSnapshots: src.rateBuildupSnapshots ?? [],
```

- [ ] **Step 2: Bridge old → new in the snapshot query**

In `server/src/graphql/resolvers/tenderPricingSheet/index.ts`, the `tenderPricingRowSnapshot` query currently returns `row?.rateBuildupSnapshot ?? null`. This query is used by the canvas editing page. Keep it for now — the canvas page edits a specific snapshot, not the array. No change needed to this query.

- [ ] **Step 3: Update tracked fields**

In `server/src/typescript/tenderReview.ts`, add to `TRACKED_ROW_FIELDS`:

```typescript
"rateBuildupSnapshots",
```

- [ ] **Step 4: Update MCP tools**

In `server/src/mcp/tools/tender.ts` (line ~266), update the `hasTemplate` check:

```typescript
hasTemplate: (r.rateBuildupSnapshots?.length ?? 0) > 0
  || (r.rateBuildupSnapshot != null && r.rateBuildupSnapshot !== ""),
```

This handles both old and new data.

- [ ] **Step 5: Commit**

```bash
git add server/src/models/TenderPricingSheet/class/update.ts \
  server/src/typescript/tenderReview.ts \
  server/src/mcp/tools/tender.ts
git commit -m "feat: server update logic and bridging for rateBuildupSnapshots"
```

---

### Task 3: Client types and GraphQL fragments

**Files:**
- Modify: `client/src/components/TenderPricing/types.ts`
- Modify: `client/src/pages/tender/[id]/index.tsx` (2 GraphQL fragments)
- Modify: `client/src/components/TenderPricing/PricingSheet.tsx` (GraphQL fragment)
- Modify: `client/src/components/Tender/TenderMobilePricingTab.tsx` (GraphQL fragment)
- Regenerate: `client/src/generated/graphql.tsx`

- [ ] **Step 1: Update client types**

In `client/src/components/TenderPricing/types.ts`, add:

```typescript
export interface RateBuildupSnapshotEntry {
  snapshot: string;
  memo?: string | null;
}
```

On `TenderPricingRow`, replace `rateBuildupSnapshot` with:

```typescript
rateBuildupSnapshots: RateBuildupSnapshotEntry[];
```

Remove `rateBuildupSnapshot?: string | null;`.

- [ ] **Step 2: Update GraphQL fragments**

In every file that queries `rateBuildupSnapshot`, replace it with:

```graphql
rateBuildupSnapshots {
  snapshot
  memo
}
```

Files (search for `rateBuildupSnapshot` in each):
- `client/src/pages/tender/[id]/index.tsx` — two fragments (~line 61 and ~line 165)
- `client/src/components/TenderPricing/PricingSheet.tsx` (~line 55)
- `client/src/components/Tender/TenderMobilePricingTab.tsx` (~line 59)

- [ ] **Step 3: Run GraphQL codegen**

```bash
cd client && npm run codegen
```

This regenerates `client/src/generated/graphql.tsx` with the new types.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/TenderPricing/types.ts \
  client/src/pages/tender/[id]/index.tsx \
  client/src/components/TenderPricing/PricingSheet.tsx \
  client/src/components/Tender/TenderMobilePricingTab.tsx \
  client/src/generated/graphql.tsx
git commit -m "feat: client types and GraphQL fragments for rateBuildupSnapshots"
```

---

### Task 4: LineItemDetail — multi-snapshot UI

This is the largest task. The core change: replace the single-snapshot state management and rendering with an array-based approach.

**Files:**
- Modify: `client/src/components/TenderPricing/LineItemDetail.tsx`

- [ ] **Step 1: Replace single-snapshot parsing with array parsing**

Replace the `parsedSnapshot` / `snapshotCanvasDoc` / `hasRateBuildup` logic (~lines 198-216) with:

```typescript
const parsedSnapshots = useMemo<{ snapshot: RateBuildupSnapshot; memo: string; doc: CanvasDocument }[]>(() => {
  return (row.rateBuildupSnapshots ?? []).map((entry) => {
    try {
      const raw = JSON.parse(entry.snapshot) as RateBuildupSnapshot;
      const snapshot = { ...raw, outputDefs: raw.outputDefs ?? [] };
      return { snapshot, memo: entry.memo ?? "", doc: snapshotToCanvasDoc(snapshot) };
    } catch { return null; }
  }).filter(Boolean) as { snapshot: RateBuildupSnapshot; memo: string; doc: CanvasDocument }[];
}, [row.rateBuildupSnapshots]);

const hasRateBuildup = parsedSnapshots.length > 0;
```

- [ ] **Step 2: Replace single-snapshot local state with per-snapshot arrays**

Replace the individual `snapParams`, `snapTables`, `snapControllers`, `snapParamNotes`, `snapOutputs` state variables with a single array of per-snapshot state:

```typescript
interface SnapshotLocalState {
  params: Record<string, number>;
  tables: Record<string, RateEntry[]>;
  controllers: Record<string, number | boolean | string[]>;
  paramNotes: Record<string, string>;
  outputs: Record<string, { materialId?: string; crewKindId?: string }>;
}

const [snapshotStates, setSnapshotStates] = useState<SnapshotLocalState[]>(() =>
  parsedSnapshots.map((s) => ({
    params: s.snapshot.params ?? {},
    tables: s.snapshot.tables ?? {},
    controllers: s.snapshot.controllers ?? {},
    paramNotes: s.snapshot.paramNotes ?? {},
    outputs: s.snapshot.outputs ?? {},
  }))
);
```

Add a `useEffect` that re-syncs when `row._id` changes (same pattern as existing code).

Keep `snapResult` as an array too:

```typescript
const [snapResults, setSnapResults] = useState<({ unitPrice: number; breakdown: { id: string; label: string; value: number }[] } | null)[]>([]);
```

- [ ] **Step 3: Replace single `scheduleSave` with array-aware save**

The new `scheduleSave` evaluates all snapshots, sums unit prices, concatenates outputs:

```typescript
const scheduleSave = useCallback((updatedStates: SnapshotLocalState[]) => {
  if (parsedSnapshots.length === 0) return;
  const entries: { snapshot: string; memo: string }[] = [];
  let totalUP = 0;
  const allOutputs: any[] = [];

  for (let i = 0; i < parsedSnapshots.length; i++) {
    const base = parsedSnapshots[i].snapshot;
    const state = updatedStates[i] ?? snapshotStates[i];
    const updated: RateBuildupSnapshot = {
      ...base,
      params: state.params,
      tables: state.tables,
      controllers: state.controllers,
      paramNotes: state.paramNotes,
      outputs: state.outputs,
    };
    const { unitPrice, outputs } = evaluateSnapshot(
      updated,
      parseFloat(quantityRef.current) || 1,
      row.unit ?? undefined
    );
    totalUP += unitPrice;
    allOutputs.push(...outputs);
    entries.push({
      snapshot: JSON.stringify(updated),
      memo: (row.rateBuildupSnapshots ?? [])[i]?.memo ?? "",
    });
  }

  if (saveTimer.current) clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(() => {
    onUpdate(row._id, {
      rateBuildupSnapshots: entries,
      unitPrice: totalUP || null,
      rateBuildupOutputs: allOutputs,
    });
  }, 500);
}, [parsedSnapshots, snapshotStates, row._id, row.unit, onUpdate]);
```

Update per-snapshot change handlers (`onSnapParamChange`, etc.) to update the correct index in `snapshotStates` and trigger `scheduleSave`.

- [ ] **Step 4: Replace single `snapshotUnitPrice` with summed value**

```typescript
const snapshotUnitPrice = useMemo<number | null>(() => {
  if (parsedSnapshots.length === 0) return null;
  let total = 0;
  for (const s of parsedSnapshots) {
    total += computeSnapshotUnitPrice(s.snapshot, row.quantity ?? 1, row.unit ?? undefined);
  }
  return total || null;
}, [parsedSnapshots, row.quantity, row.unit]);
```

- [ ] **Step 5: Update attach flow**

Replace the single-snapshot attach handler (~line 519-535) with one that appends to the array:

```typescript
onAttach={(templateDoc) => {
  const snapshot = snapshotFromTemplate(templateDoc);
  const { unitPrice: newUP, outputs: newOutputs } = evaluateSnapshot(
    snapshot,
    row.quantity ?? 1,
    row.unit ?? templateDoc.defaultUnit ?? undefined
  );
  const newEntry = { snapshot: JSON.stringify(snapshot), memo: "" };
  const updatedEntries = [...(row.rateBuildupSnapshots ?? []).map((e) => ({
    snapshot: e.snapshot,
    memo: e.memo ?? "",
  })), newEntry];

  // Recompute total UP across all snapshots
  let totalUP = newUP;
  const allOutputs = [...newOutputs];
  for (const existing of parsedSnapshots) {
    const { unitPrice, outputs } = evaluateSnapshot(
      existing.snapshot,
      row.quantity ?? 1,
      row.unit ?? undefined
    );
    totalUP += unitPrice;
    allOutputs.push(...outputs);
  }

  onUpdate(row._id, {
    rateBuildupSnapshots: updatedEntries,
    unit: row.unit || templateDoc.defaultUnit || null,
    unitPrice: totalUP || null,
    rateBuildupOutputs: allOutputs,
  });
}}
```

- [ ] **Step 6: Update rendering — per-snapshot collapsible cards**

Replace the single buildup rendering block (~lines 718-844) with a loop over `parsedSnapshots`. Each snapshot gets:

- A collapsible header with: chevron, template label (`parsedSnapshots[i].snapshot.label`), inline-editable memo, this snapshot's unit price, trash icon
- Expanded state: `RateBuildupInputs` with that snapshot's state
- The trash icon calls a `removeSnapshot(index)` function that removes from the array and saves

The `"+ Attach Template"` button appears in the section header, always visible.

The summary bar at the bottom sums breakdown categories across all snapshots.

- [ ] **Step 7: Update detach logic**

Replace the single detach button (~line 782):

```typescript
// Old: onClick={() => onUpdate(row._id, { rateBuildupSnapshot: null, unitPrice: null, rateBuildupOutputs: null })}
// New: per-snapshot remove
const removeSnapshot = (index: number) => {
  const updated = (row.rateBuildupSnapshots ?? [])
    .filter((_, i) => i !== index)
    .map((e) => ({ snapshot: e.snapshot, memo: e.memo ?? "" }));

  // Recompute totals from remaining snapshots
  let totalUP = 0;
  const allOutputs: any[] = [];
  for (const entry of updated) {
    try {
      const snap = JSON.parse(entry.snapshot) as RateBuildupSnapshot;
      const { unitPrice, outputs } = evaluateSnapshot(snap, row.quantity ?? 1, row.unit ?? undefined);
      totalUP += unitPrice;
      allOutputs.push(...outputs);
    } catch { /* skip corrupt */ }
  }

  onUpdate(row._id, {
    rateBuildupSnapshots: updated,
    unitPrice: updated.length > 0 ? (totalUP || null) : null,
    rateBuildupOutputs: updated.length > 0 ? allOutputs : null,
  });
};
```

- [ ] **Step 8: Update the no-buildup CTA**

Change the condition from `!hasRateBuildup` (which now checks `parsedSnapshots.length === 0`) — the existing CTA code works as-is since `hasRateBuildup` is derived from the array length.

When snapshots exist, move the "Attach Template" button into the Rate Buildups section header instead of showing the full CTA.

- [ ] **Step 9: Commit**

```bash
git add client/src/components/TenderPricing/LineItemDetail.tsx
git commit -m "feat: LineItemDetail multi-snapshot UI with per-snapshot cards"
```

---

### Task 5: Row canvas page update

**Files:**
- Modify: `client/src/pages/tender/[id]/pricing/row/[rowId].tsx`

- [ ] **Step 1: Update canvas page to load from array**

The canvas page at `/tender/[tenderId]/pricing/row/[rowId]` currently loads a single snapshot via `tenderPricingRowSnapshot` query. Update it to:

1. Accept a `snapshotIndex` query param (default `0`)
2. Load the full row's `rateBuildupSnapshots` array
3. Extract `snapshots[snapshotIndex].snapshot` as the working snapshot
4. On save, update that specific index in the array

The save handler (~line 124) changes from writing `rateBuildupSnapshot` to writing the full `rateBuildupSnapshots` array with the updated entry at the correct index.

- [ ] **Step 2: Update edit button in LineItemDetail**

In LineItemDetail, the edit icon for each snapshot (~line 774) should pass the snapshot index:

```typescript
router.push(`/tender/${tenderId}/pricing/row/${row._id}?snapshotIndex=${index}${qs}${us}`);
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/tender/[id]/pricing/row/[rowId].tsx \
  client/src/components/TenderPricing/LineItemDetail.tsx
git commit -m "feat: canvas page supports editing specific snapshot by index"
```

---

### Task 6: Verify and clean up

- [ ] **Step 1: Check pod logs**

After all changes, check that the server pod starts without TypeScript errors:

```bash
kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=30
```

- [ ] **Step 2: Run client type check**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 3: Run tests**

```bash
cd client && npm run test
```

- [ ] **Step 4: Manual smoke test**

1. Open a tender pricing sheet
2. Select a line item with no buildup — verify the CTA appears
3. Attach a template — verify it shows as a collapsible card
4. Edit parameters — verify unit price updates
5. Attach a second template — verify both cards appear and unit price sums
6. Add a memo to one snapshot — verify it saves
7. Remove one snapshot — verify the other remains and unit price recalculates
8. Remove the last snapshot — verify row returns to no-buildup state
