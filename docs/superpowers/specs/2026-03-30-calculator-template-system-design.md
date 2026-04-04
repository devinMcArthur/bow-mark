# Calculator Template System Design

**Date:** 2026-03-30
**Branch:** `feature/tender-pricing-sheet`
**Status:** Approved — ready for implementation

---

## Overview

Replace the current hardcoded `AsphaltCalculator` / `GravelCalculator` components and their per-type `compute()` functions with a data-driven **Calculator Template System**. Every calculator type is a template — a plain data document describing its parameters, tables, formula steps, and cost breakdown. A single generic evaluator runs any template identically. This foundation supports user-editable templates in a future commercial product without a rewrite.

---

## Goals

1. **Transparent cost breakdown** — estimators see every intermediate value (matching their Excel experience)
2. **Expandable** — adding a new calculator type is creating one template document, not writing code
3. **Future-proof** — templates are designed to live in MongoDB later; Phase 1 uses `localStorage` to validate the data structure first
4. **Single evaluator** — one engine runs all templates; no per-type code paths in the UI

---

## Data Model

All interfaces live in `client/src/components/TenderPricing/calculators/types.ts`.

### `CalculatorTemplate`

The core document. In Phase 1 stored in `localStorage`; in Phase 2 stored in MongoDB.

```typescript
interface CalculatorTemplate {
  id: string;                    // human-readable slug: "paving", "gravel", "concrete-sidewalk"
  label: string;                 // displayed in type picker: "Paving", "Gravel"
  defaultUnit: string;           // pre-fills row unit field: "m²", "lin.m"
  parameterDefs: ParameterDef[];
  tableDefs: TableDef[];
  formulaSteps: FormulaStep[];
  breakdownDefs: BreakdownDef[];
  intermediateDefs: IntermediateDef[];
  defaultInputs: CalculatorInputs;
}
```

### `ParameterDef`

Describes a scalar input the estimator fills in. Used by `CalculatorPanel` to render input fields.

```typescript
interface ParameterDef {
  id: string;           // matches key in CalculatorInputs.params
  label: string;        // "Depth", "Material Rate"
  prefix?: string;      // "$"
  suffix?: string;      // "mm", "/t", "/hr", "min"
  defaultValue: number;
}
```

### `TableDef`

Describes a rate table (labour, equipment, etc.). The evaluator pre-aggregates each table as `Σ(qty × ratePerHour)` and injects it as `{id}RatePerHr` into the formula context before any steps run.

```typescript
interface TableDef {
  id: string;       // "labour", "equipment"
  label: string;    // "Labour", "Equipment"
  rowLabel: string; // column header for name column: "Role", "Item"
}
```

### `RateEntry` — the row structure for all tables

All tables share the same row shape. Pour method (machine vs hand) for concrete is handled by adjusting the equipment table, not a separate field.

```typescript
interface RateEntry {
  id: string;
  name: string;
  qty: number;
  ratePerHour: number;
}
```

### `CalculatorInputs`

The saved state for a single line item's calculator. Stored as `calculatorInputsJson` on `TenderPricingRow`.

```typescript
interface CalculatorInputs {
  params: Record<string, number>;           // keyed by ParameterDef.id
  tables: Record<string, RateEntry[]>;      // keyed by TableDef.id
}
```

### `FormulaStep`

One step in the computation chain. Each step evaluates a formula string and adds its result to the evaluation context, making it available to all later steps.

```typescript
interface FormulaStep {
  id: string;       // variable name in evaluation context
  label?: string;   // optional display label (useful for future template editor UI)
  formula: string;  // arithmetic expression; can reference any prior step id,
                    // any parameter id, any {tableId}RatePerHr, or "quantity"
}
```

**Example — Paving steps:**
```
{ id: "tonnesPerM2",    formula: "depthMm * 0.00245" }
{ id: "materialPerM2",  formula: "materialRate * tonnesPerM2" }
{ id: "truckingPerT",   formula: "truckRate / 60 * roundTripMin / 13" }
{ id: "truckingPerM2",  formula: "truckingPerT * tonnesPerM2" }
{ id: "labourPerM2",    formula: "labourRatePerHr / productionRate * tonnesPerM2" }
{ id: "equipmentPerM2", formula: "equipmentRatePerHr / productionRate * tonnesPerM2" }
{ id: "totalTonnes",    formula: "tonnesPerM2 * quantity" }
```

### `BreakdownDef`

Maps a formula step to a named cost category shown in the breakdown display.

```typescript
interface BreakdownDef {
  id: string;
  label: string;
  perUnit: string;        // formula step id whose value = $/unit
  subValue?: {
    stepId: string;       // formula step id for the sub-label value
    format: string;       // unit appended after value: "/t", "/m²"
  };
}
```

### `IntermediateDef`

Formula steps to display as footnotes below the breakdown (e.g., "61.3 t total").

```typescript
interface IntermediateDef {
  label: string;
  stepId: string;
  unit: string;
}
```

### `CalculatorResult`

Output of the evaluator. Consumed by `CalculatorPanel` for display and by `LineItemDetail` to write `unitPrice` back to the row.

```typescript
interface CalculatorResult {
  unitPrice: number;
  breakdown: CostCategory[];
  intermediates: Intermediate[];
}

interface CostCategory {
  id: string;
  label: string;
  perUnit: number;
  subValue?: string;
}

interface Intermediate {
  label: string;
  value: number;
  unit: string;
}
```

---

## Formula Evaluator

**File:** `client/src/components/TenderPricing/calculators/evaluate.ts`

Uses [`expr-eval`](https://github.com/silentmatt/expr-eval) — a ~10kb library with no `eval()`, safe expression parsing, and variable scope support.

```typescript
function evaluateTemplate(
  template: CalculatorTemplate,
  inputs: CalculatorInputs,
  quantity: number
): CalculatorResult {
  // 1. Seed context
  const ctx: Record<string, number> = { quantity };
  for (const p of template.parameterDefs)
    ctx[p.id] = inputs.params[p.id] ?? p.defaultValue;
  for (const t of template.tableDefs)
    ctx[`${t.id}RatePerHr`] = (inputs.tables[t.id] ?? [])
      .reduce((s, r) => s + r.qty * r.ratePerHour, 0);

  // 2. Evaluate formula steps in order
  for (const step of template.formulaSteps)
    ctx[step.id] = safeEval(step.formula, ctx); // div/0 → 0

  // 3. Assemble result
  const breakdown = template.breakdownDefs.map(b => ({
    id: b.id, label: b.label,
    perUnit: ctx[b.perUnit] ?? 0,
    subValue: b.subValue
      ? `$${(ctx[b.subValue.stepId] ?? 0).toFixed(2)}${b.subValue.format}`
      : undefined,
  }));

  return {
    unitPrice: breakdown.reduce((s, b) => s + b.perUnit, 0),
    breakdown,
    intermediates: template.intermediateDefs.map(i => ({
      label: i.label, value: ctx[i.stepId] ?? 0, unit: i.unit,
    })),
  };
}
```

`safeEval` wraps `expr-eval`'s `Parser.evaluate()` and returns `0` on any error or non-finite result.

---

## Storage — Phase 1 (localStorage)

**File:** `client/src/components/TenderPricing/calculators/storage.ts`

```typescript
const STORAGE_KEY = "bow-mark:calculator-templates";

function loadTemplates(): CalculatorTemplate[] { ... }
function saveTemplates(templates: CalculatorTemplate[]): void { ... }
```

Templates are loaded at app startup via a React context or hook. When `LineItemDetail` needs a template for type `"paving"`, it looks it up from the loaded list by `id`.

**Phase 2:** Replace `storage.ts` with a GraphQL query/mutation against a new `CalculatorTemplate` MongoDB collection. No other files change.

---

## Component Architecture

### `CalculatorPanel` (new, generic)

**File:** `client/src/components/TenderPricing/CalculatorPanel.tsx`

Replaces `AsphaltCalculator.tsx` and `GravelCalculator.tsx`. Reads everything from the template definition — never knows which calculator type it's rendering.

```typescript
interface CalculatorPanelProps {
  template: CalculatorTemplate;
  inputs: CalculatorInputs;
  quantity: number;
  onSave: (inputs: CalculatorInputs, unitPrice: number) => void;
}
```

Renders:
- Parameter inputs (from `parameterDefs`)
- Rate tables with add/remove/edit rows (from `tableDefs`)
- Live cost breakdown (from `evaluateTemplate()`, recomputes on every change)
- Intermediate footnotes

### `LineItemDetail` (updated)

- Type picker dynamically built from loaded templates (replaces hardcoded "Manual / Paving / Gravel" buttons)
- When a calculator type is selected, renders `<CalculatorPanel template={...} />` instead of hardcoded components
- `calculatorInputsJson` format changes: `{ params: {...}, tables: {...} }` instead of the current flat shape

**Migration:** Existing saved `calculatorInputsJson` blobs (flat shape from old `asphalt.ts` / `gravel.ts`) need to be parsed and re-shaped on load. `LineItemDetail` detects the old shape and converts it transparently.

---

## Developer Page — Calculator Templates Tab

**Page:** `client/src/pages/developer/index.tsx`
**New components:** `client/src/components/pages/developer/CalculatorTemplates/`

Adds a tab bar to the developer page with two tabs:
- **Ratings Review** (existing content, unchanged)
- **Calculator Templates** (new)

### Calculator Templates tab layout

```
┌─────────────────────────────────────────────────────────┐
│ [Ratings Review]  [Calculator Templates ●]              │  ← page tabs
├──────────────────┬──────────────────────────────────────┤
│ Templates        │ [Edit]  [Test]                       │  ← inner tabs
│ ─────────────── │ ─────────────────────────────────────┤
│ Paving      ●   │  Edit panel    │  Live Test panel     │
│ Gravel          │                │                      │
│ + New           │  parameterDefs │  qty input           │
│                 │  tableDefs     │  param inputs        │
│                 │  formulaSteps  │  table totals        │
│                 │  breakdownDefs │  breakdown cells     │
└─────────────────┴────────────────┴──────────────────────┘
```

**Edit panel** — form fields for each section of `CalculatorTemplate`:
- Parameters: id, label, prefix, suffix, defaultValue; add/remove rows
- Tables: id, label, rowLabel; add/remove rows
- Formula steps: id, formula string; add/remove/reorder rows
- Breakdown: id, label, perUnit (step id picker); add/remove rows

**Live Test panel** — always visible alongside the editor:
- Quantity input
- One numeric input per `parameterDef` (pre-filled with `defaultValue`)
- Aggregated table totals shown as read-only (`labourRatePerHr`, `equipmentRatePerHr`, etc.)
- Cost breakdown cells (recompute on every keystroke via `evaluateTemplate()`)
- Intermediate footnotes

---

## File Structure

```
client/src/
  components/
    TenderPricing/
      calculators/
        types.ts          ← all interfaces (CalculatorTemplate, FormulaStep, etc.)
        evaluate.ts       ← evaluateTemplate() + safeEval() via expr-eval
        storage.ts        ← localStorage load/save (Phase 1 only)
      CalculatorPanel.tsx ← generic renderer; replaces AsphaltCalculator + GravelCalculator
      calculatorShared.tsx ← kept; ParamInput, RateRow, BreakdownCell reused by CalculatorPanel
      LineItemDetail.tsx  ← updated: dynamic type picker, renders CalculatorPanel
      [AsphaltCalculator.tsx]  ← deleted
      [GravelCalculator.tsx]   ← deleted
      [asphalt.ts]             ← deleted (definition moves to localStorage template)
      [gravel.ts]              ← deleted (definition moves to localStorage template)
  components/pages/developer/
    CalculatorTemplates/
      index.tsx           ← tab root; loads/saves templates via storage.ts
      TemplateList.tsx    ← left sidebar: template list + New button
      TemplateEditor.tsx  ← edit parameterDefs, tableDefs, formulaSteps, breakdownDefs
      TemplateTestPanel.tsx ← live test: param inputs + evaluateTemplate() breakdown
  pages/
    developer/
      index.tsx           ← add Chakra Tabs; slots in RatingsReview + CalculatorTemplates
```

---

## Reference Templates

Three templates to create in the admin UI to prove the pattern:

| Template | Unit | Parameters | Tables | Cost categories |
|---|---|---|---|---|
| Paving | m² | depthMm, materialRate, truckRate, roundTripMin, productionRate | labour, equipment | material, trucking, labour, equipment |
| Gravel | m² | depthMm, materialRate, tandemRate, tandemRoundTripMin, pupRate, pupRoundTripMin, productionRate | labour, equipment | material, trucking, labour, equipment |
| Concrete Sidewalk | lin.m | widthM, thicknessMm, concreteRate, rebarKgPerM3, rebarRate, subbaseMm, subbaseRate, formsPerLm, stringlinePerLm, productionRate | labour, equipment | concrete, rebar, subbase, forms, stringline, labour, equipment |

The concrete sidewalk introduces: a cross-section geometry step (`m3PerLm = widthM * thicknessMm / 1000`), and cost categories with no direct production-rate dependency (forms, stringline are flat $/lin.m).

---

## Migration Path to Phase 2 (MongoDB)

When ready to persist templates server-side:

1. Add `CalculatorTemplate` Typegoose model (schema matches the TypeScript interface exactly — designed for this)
2. Add `calculatorTemplates` / `calculatorTemplate(id)` GraphQL queries
3. Add `calculatorTemplateCreate` / `Update` / `Delete` mutations
4. Replace `storage.ts` with a GraphQL hook — all other files unchanged
5. Seed from existing localStorage data via a one-time migration script

No changes to `CalculatorPanel`, `LineItemDetail`, `evaluate.ts`, or the developer page UI.

---

## Out of Scope (this phase)

- Server-side template storage (Phase 2)
- Formula validation / error highlighting in the editor
- Drag-to-reorder formula steps in the editor
- Template versioning or audit history
- User-facing template management (non-developer users)
- Seeding default templates automatically on first run
