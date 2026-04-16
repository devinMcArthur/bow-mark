# Multi-Template Line Items

Replace the single rate buildup snapshot per pricing row with a flat array of snapshots, each independently evaluated. Unit price is the sum across all snapshots.

## Data Model

### New field: `rateBuildupSnapshots`

Array of wrapper objects on `TenderPricingRowClass`:

```typescript
// Server — Mongoose/Typegoose embedded sub-doc
@ObjectType()
class RateBuildupSnapshotEntry {
  @Field() @prop({ required: true }) snapshot!: string;   // JSON-stringified RateBuildupSnapshot
  @Field({ nullable: true }) @prop() memo?: string;       // estimator context ("Dirt Work", "Mobilization")
}

// On TenderPricingRowClass:
@Field(() => [RateBuildupSnapshotEntry])
@prop({ type: () => [RateBuildupSnapshotEntry], _id: false, default: [] })
rateBuildupSnapshots!: RateBuildupSnapshotEntry[];
```

### Retained fields (unchanged)

- `rateBuildupOutputs: RateBuildupOutputClass[]` — merged outputs from all snapshots
- `unitPrice: number` — sum of all snapshot unit prices
- `extraUnitPrice: number` — manual additional cost (independent of buildups)
- `extraUnitPriceMemo: string` — label for extra cost

### Deprecated field

- `rateBuildupSnapshot: string` — old single-snapshot field. Kept on Mongoose schema so existing documents don't error on read, but not exposed in GraphQL and never written to. Client reads from `rateBuildupSnapshots` only.

### Unit price formula

```
totalUP = sum(each snapshot's evaluateSnapshot().unitPrice) + extraUnitPrice
```

### Output aggregation

```
rateBuildupOutputs = concat(each snapshot's evaluateSnapshot().outputs)
```

## Client Types

```typescript
// client/src/components/TenderPricing/types.ts
interface RateBuildupSnapshotEntry {
  snapshot: string;   // JSON RateBuildupSnapshot
  memo?: string | null;
}

interface TenderPricingRow {
  // ... existing fields ...
  rateBuildupSnapshots: RateBuildupSnapshotEntry[];  // replaces rateBuildupSnapshot
  rateBuildupOutputs?: RateBuildupOutput[] | null;
  // unitPrice, extraUnitPrice, extraUnitPriceMemo unchanged
}
```

## GraphQL

### Query

`rateBuildupSnapshots` exposed as `[RateBuildupSnapshotEntry!]!` (non-nullable array of non-nullable entries). Always returns `[]` when empty.

### Mutation

Extend `TenderPricingRowUpdateData`:

```graphql
input RateBuildupSnapshotEntryInput {
  snapshot: String!
  memo: String
}

# On TenderPricingRowUpdateData:
rateBuildupSnapshots: [RateBuildupSnapshotEntryInput!]  # null = no-op, [] = clear all
```

Validation: same kind/field consistency check on merged `rateBuildupOutputs`.

## UI (LineItemDetail)

### Layout when snapshots exist

1. **Quantity card** — qty + unit inputs (same as today)
2. **Rate Buildups section**:
   - Header: "Rate Buildups" label + "+ Attach Template" button
   - Per-snapshot collapsible card:
     - Header: chevron, template label, inline-editable memo, this snapshot's unit price, trash icon (remove)
     - Expanded: `RateBuildupInputs` component (params, tables, controllers, outputs)
     - Collapsed: header only
   - Summary bar: per-snapshot breakdown + extra unit price + total unit price
3. **Additional Cost** — `extraUnitPrice` + memo (unchanged)
4. **Markup, Notes, Summary grid** (unchanged)

### No-buildup state

When `rateBuildupSnapshots` is empty, show the existing CTA ("Use a Rate Buildup Template"). Removing the last snapshot returns to this state.

### Attach flow

Same template picker modal as today. Closes after selection. Creates a new `RateBuildupSnapshotEntry` with `memo: ""`, appends to array. "+ Attach Template" button always visible to add more.

## Evaluation & Save Logic

### Per-snapshot state

Each snapshot in the array maintains independent local state: `params`, `tables`, `controllers`, `paramNotes`, `outputs`. These are managed as parallel arrays/maps keyed by array index.

### On any snapshot input change

1. Evaluate the changed snapshot via `evaluateSnapshot(snapshot, quantity, unit)`
2. Sum unit prices across all snapshots → row `unitPrice`
3. Concatenate outputs across all snapshots → row `rateBuildupOutputs`
4. Debounced save (500ms) — writes full `rateBuildupSnapshots` array + `unitPrice` + `rateBuildupOutputs` atomically

### On quantity change

All snapshots re-evaluate (formulas receive quantity in context). If summed unit price doesn't match stored `unitPrice`, auto-correct.

### Reconciliation on mount

Recompute each snapshot's unit price. If sum diverges from stored `unitPrice` by > 0.001, save corrected value.

## MCP Tools

Any pricing row MCP tools that read/write `rateBuildupSnapshot` must be updated to work with `rateBuildupSnapshots` array. Reading returns all entries; writing replaces the full array.

## Migration

No automated migration needed — no real tenders exist in production. Old `rateBuildupSnapshot` field is kept on schema for read safety but ignored by all new code paths.
