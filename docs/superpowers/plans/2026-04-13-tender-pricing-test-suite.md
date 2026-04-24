# Tender Pricing Test Suite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Comprehensive test coverage for the rate buildup evaluator (pure functions) and server-side tender pricing validation/CRUD.

**Architecture:** Two test layers. Layer 1: client-side Vitest tests for pure evaluation functions (`evaluateTemplate`, `evaluateSnapshot`, `computeInactiveNodeIds`, `isGroupActive`), requiring extraction of pure logic from the React-coupled `canvasStorage.ts`. Layer 2: server-side Vitest tests using the existing Testcontainer infrastructure for CrewKind CRUD, template save validation, row update validation, and an integration test that creates a sheet, adds rows, attaches snapshots with outputs, and verifies persistence.

**Tech Stack:** Vitest 2.x (both client + server), expr-eval (formula parser), Mongoose/Typegoose (server models), supertest (server GraphQL tests)

---

## File Map

### New files (client)

| File | Purpose |
|------|---------|
| `client/src/components/pages/developer/CalculatorCanvas/canvasTypes.ts` | Canvas type definitions extracted from canvasStorage.ts |
| `client/src/components/pages/developer/CalculatorCanvas/snapshotEvaluator.ts` | Pure evaluation functions extracted from canvasStorage.ts |
| `client/vitest.config.ts` | Minimal Vitest config for pure function tests |
| `client/src/testing/generatedGraphqlStub.ts` | Stub for the generated GraphQL file (exports only enums) |
| `client/src/components/TenderPricing/calculators/__tests__/evaluateTemplate.test.ts` | evaluateTemplate unit tests |
| `client/src/components/pages/developer/CalculatorCanvas/__tests__/snapshotEvaluator.test.ts` | evaluateSnapshot, computeSnapshotUnitPrice tests |
| `client/src/components/pages/developer/CalculatorCanvas/__tests__/groupActivation.test.ts` | isGroupActive, computeInactiveNodeIds tests |

### Modified files (client)

| File | Change |
|------|--------|
| `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts` | Remove extracted types/functions, import + re-export from new modules |
| `client/package.json` | Add vitest devDependency + test script |

### New files (server)

| File | Purpose |
|------|---------|
| `server/src/graphql/__tests__/crewKindResolver.test.ts` | CrewKind CRUD + authorization tests |
| `server/src/graphql/__tests__/rateBuildupTemplateResolver.test.ts` | Template save validation tests |
| `server/src/graphql/__tests__/tenderPricingSheetResolver.test.ts` | Row update validation + integration tests |

---

## Task 1: Extract canvas types from canvasStorage.ts

**Files:**
- Create: `client/src/components/pages/developer/CalculatorCanvas/canvasTypes.ts`
- Modify: `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts`

- [ ] **Step 1: Create canvasTypes.ts with extracted type definitions**

```typescript
// client/src/components/pages/developer/CalculatorCanvas/canvasTypes.ts
import {
  Position,
  CanvasParameterDef,
  CanvasTableDef,
  CanvasFormulaStep,
  CanvasBreakdownDef,
  OutputDef,
  SpecialNodePositions,
} from "../../../../components/TenderPricing/calculators/types";

// ─── CanvasDocument ───────────────────────────────────────────────────────────

export interface GroupActivation {
  controllerId: string;
  /** Percentage / Toggle: simple comparison, e.g. "> 0", "< 1", "=== 1" */
  condition?: string;
  /** Selector only: which option ID activates this group */
  optionId?: string;
}

/** Named choice in a Selector controller */
export interface ControllerOption {
  id: string;
  label: string;
}

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

export interface ControllerDef {
  id: string;
  label: string;
  type: "percentage" | "toggle" | "selector";
  /** Percentage: 0–1 number. Toggle: boolean. Absent for selector. */
  defaultValue?: number | boolean;
  /** Selector only */
  options?: ControllerOption[];
  /** Selector only: option IDs selected by default */
  defaultSelected?: string[];
  hint?: string;      // template-level guidance shown read-only to estimators
  position: Position; // canvas node position
}

export interface GroupDef {
  id: string;
  label: string;
  parentGroupId?: string;
  memberIds: string[]; // ordered list: param/table/formula step/sub-group IDs
  activation?: GroupActivation;   // omitted = always active
  position: Position;  // canvas position; w/h used for group resize
}

// CanvasDocument is the in-memory representation used by the canvas.
// Canvas-specific concerns (positions, defaultRows) are co-located on each def.
// `specialPositions` holds positions for the two synthetic nodes (quantity, unitPrice)
// that have no def object.
export interface CanvasDocument {
  id: string; // MongoDB _id (or a temp "new_<timestamp>" before first save)
  label: string;
  defaultUnit: string;
  parameterDefs: CanvasParameterDef[];
  tableDefs: CanvasTableDef[];
  formulaSteps: CanvasFormulaStep[];
  breakdownDefs: CanvasBreakdownDef[];
  outputDefs: OutputDef[];
  specialPositions: SpecialNodePositions; // positions for quantity/unitPrice synthetic nodes
  groupDefs: GroupDef[];
  controllerDefs: ControllerDef[];
  unitVariants?: UnitVariant[];
  updatedAt?: string;
}
```

- [ ] **Step 2: Update canvasStorage.ts — replace type definitions with imports + re-exports**

Remove the following from canvasStorage.ts (lines ~24–101): `GroupActivation`, `ControllerOption`, `UnitVariant`, `ControllerDef`, `GroupDef`, `CanvasDocument` interfaces.

Replace with:

```typescript
// At the top of canvasStorage.ts, after the React and other imports:
export {
  GroupActivation,
  ControllerOption,
  UnitVariant,
  ControllerDef,
  GroupDef,
  CanvasDocument,
} from "./canvasTypes";
import type {
  CanvasDocument,
  GroupDef,
  ControllerDef,
  UnitVariant,
} from "./canvasTypes";
```

The file continues to export these names so no downstream imports break.

- [ ] **Step 3: Verify the client compiles**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Expected: no errors (or only pre-existing ones unrelated to this change)

- [ ] **Step 4: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/canvasTypes.ts \
       client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts
git commit -m "refactor: extract canvas type definitions from canvasStorage.ts"
```

---

## Task 2: Extract pure evaluation functions from canvasStorage.ts

**Files:**
- Create: `client/src/components/pages/developer/CalculatorCanvas/snapshotEvaluator.ts`
- Modify: `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts`

- [ ] **Step 1: Create snapshotEvaluator.ts with extracted functions**

Move the following from canvasStorage.ts into this new file:
- `PricingRowOutput` interface
- `RateBuildupSnapshot` interface
- `isGroupActive` function
- `computeInactiveNodeIds` function
- `snapshotFromTemplate` function
- `snapshotToCanvasDoc` function
- `canvasDocToSnapshot` function
- `evaluateSnapshot` function
- `computeSnapshotUnitPrice` function

```typescript
// client/src/components/pages/developer/CalculatorCanvas/snapshotEvaluator.ts
import { RateBuildupOutputKind } from "../../../../generated/graphql";
import {
  RateEntry,
  EvaluatedOutput,
  SpecialNodePositions,
} from "../../../../components/TenderPricing/calculators/types";
import {
  evaluateTemplate,
  evaluateExpression,
} from "../../../../components/TenderPricing/calculators/evaluate";
import type {
  CanvasDocument,
  GroupDef,
  ControllerDef,
  UnitVariant,
} from "./canvasTypes";

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Resolved per-row output, ready to be saved to TenderPricingRow.rateBuildupOutputs.
 * Combines the template's structural def (unit, kind) + the estimator's pick +
 * the computed per-unit and scaled total values. Exactly one of `materialId`
 * / `crewKindId` is populated depending on `kind`.
 */
export interface PricingRowOutput {
  kind: RateBuildupOutputKind;
  materialId?: string;
  crewKindId?: string;
  unit: string;
  perUnitValue: number;
  totalValue: number;
}

/**
 * A frozen copy of a CanvasDocument attached to a tender pricing row.
 * `params`, `tables`, `controllers` hold job-specific estimator values.
 * `paramNotes` holds estimator context notes keyed by param ID.
 * `sourceTemplateId` is the server _id of the template this was forked from.
 */
export interface RateBuildupSnapshot extends CanvasDocument {
  sourceTemplateId: string;
  params: Record<string, number>;
  tables: Record<string, RateEntry[]>;
  controllers: Record<string, number | boolean | string[]>;
  paramNotes?: Record<string, string>;
  /**
   * Estimator's per-output selections, keyed by OutputDef.id. At evaluation
   * time these override the template's defaults. Exactly one of `materialId`
   * / `crewKindId` is used per entry, matching the output's `kind`.
   */
  outputs?: Record<string, { materialId?: string; crewKindId?: string }>;
}

// ─── Group activation ───────────────────────────────────────────────────────

/**
 * Evaluate whether a group is active given the current controller values.
 * Returns true if the group has no activation condition (always active).
 */
export function isGroupActive(
  group: GroupDef,
  doc: CanvasDocument,
  controllers: Record<string, number | boolean | string[]>
): boolean {
  const { activation } = group;
  if (!activation) return true;
  const ctrl = doc.controllerDefs.find((c) => c.id === activation.controllerId);
  if (!ctrl) return true;

  if (ctrl.type === "selector") {
    const selected = (controllers[activation.controllerId] as string[] | undefined)
      ?? ctrl.defaultSelected ?? [];
    return activation.optionId ? selected.includes(activation.optionId) : false;
  }

  const raw = controllers[activation.controllerId];
  const numVal =
    raw === undefined
      ? ctrl.type === "toggle"
        ? (ctrl.defaultValue ? 1 : 0)
        : (typeof ctrl.defaultValue === "number" ? ctrl.defaultValue : 0)
      : typeof raw === "boolean"
      ? raw ? 1 : 0
      : (raw as number);

  if (!activation.condition) return true;
  const m = activation.condition.trim().match(/^([><=!]{1,3})\s*(-?[\d.]+)$/);
  if (!m) return true;
  const rhs = parseFloat(m[2]);
  switch (m[1]) {
    case ">":   return numVal > rhs;
    case ">=":  return numVal >= rhs;
    case "<":   return numVal < rhs;
    case "<=":  return numVal <= rhs;
    case "===": case "==": return numVal === rhs;
    case "!==": case "!=": return numVal !== rhs;
    default:    return true;
  }
}

/**
 * Return the set of node IDs that belong to any currently-inactive group,
 * including members of inactive parent groups.
 */
export function computeInactiveNodeIds(
  doc: CanvasDocument,
  controllers: Record<string, number | boolean | string[]>,
  activeUnit?: string
): Set<string> {
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
        shouldBeInactive = g.id !== activeVariantGroupId;
      } else {
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

// ─── Snapshot helpers ───────────────────────────────────────────────────────

export function snapshotFromTemplate(template: CanvasDocument): RateBuildupSnapshot {
  const params: Record<string, number> = {};
  for (const p of template.parameterDefs ?? []) {
    params[p.id] = p.defaultValue;
  }

  const tables: Record<string, RateEntry[]> = {};
  for (const t of template.tableDefs ?? []) {
    tables[t.id] = (t.defaultRows ?? []) as RateEntry[];
  }

  const controllers: Record<string, number | boolean | string[]> = {};
  for (const c of template.controllerDefs ?? []) {
    if (c.type === "percentage")
      controllers[c.id] = typeof c.defaultValue === "number" ? c.defaultValue : 0;
    else if (c.type === "toggle")
      controllers[c.id] = typeof c.defaultValue === "boolean" ? c.defaultValue : false;
    else if (c.type === "selector")
      controllers[c.id] = c.defaultSelected ?? [];
  }

  const outputs: Record<string, { materialId?: string; crewKindId?: string }> = {};
  for (const o of template.outputDefs ?? []) {
    outputs[o.id] = o.kind === "CrewHours"
      ? { crewKindId: o.defaultCrewKindId }
      : { materialId: o.defaultMaterialId };
  }

  return {
    ...template,
    sourceTemplateId: template.id,
    params,
    tables,
    controllers,
    outputs,
  };
}

export function snapshotToCanvasDoc(snapshot: RateBuildupSnapshot): CanvasDocument {
  const {
    sourceTemplateId: _sid,
    params: _p,
    tables: _t,
    controllers: _c,
    paramNotes: _pn,
    outputs: _o,
    ...rest
  } = snapshot;
  return {
    ...rest,
    outputDefs: rest.outputDefs ?? [],
  };
}

export function canvasDocToSnapshot(
  doc: CanvasDocument,
  existing: RateBuildupSnapshot
): RateBuildupSnapshot {
  return {
    ...doc,
    sourceTemplateId: existing.sourceTemplateId,
    params: existing.params,
    tables: existing.tables,
    controllers: existing.controllers,
    paramNotes: existing.paramNotes,
    outputs: existing.outputs,
  };
}

// ─── Snapshot evaluation ────────────────────────────────────────────────────

/**
 * Evaluate a snapshot against a quantity, returning both the unit price and the
 * resolved Output node values.
 */
export function evaluateSnapshot(
  snapshot: RateBuildupSnapshot,
  rawQuantity: number,
  unit?: string
): { unitPrice: number; outputs: PricingRowOutput[] } {
  const doc = snapshotToCanvasDoc(snapshot);

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

  const outputs: PricingRowOutput[] = (result.outputs ?? []).map((o: EvaluatedOutput) => {
    const total = parseFloat(o.perUnitValue.toFixed(6));
    const pick = snapshot.outputs?.[o.id];
    if (o.kind === "CrewHours") {
      const crewKindId = pick?.crewKindId ?? o.defaultCrewKindId;
      return {
        kind: RateBuildupOutputKind.CrewHours,
        crewKindId,
        unit: "hr",
        perUnitValue: total,
        totalValue: total,
      };
    }
    const materialId = pick?.materialId ?? o.defaultMaterialId;
    return {
      kind: RateBuildupOutputKind.Material,
      materialId,
      unit: o.unit,
      perUnitValue: total,
      totalValue: total,
    };
  });

  return {
    unitPrice: parseFloat(result.unitPrice.toFixed(4)),
    outputs,
  };
}

export function computeSnapshotUnitPrice(
  snapshot: RateBuildupSnapshot,
  rawQuantity: number,
  unit?: string
): number {
  return evaluateSnapshot(snapshot, rawQuantity, unit).unitPrice;
}
```

- [ ] **Step 2: Update canvasStorage.ts — remove extracted functions, add imports + re-exports**

Remove from canvasStorage.ts: `PricingRowOutput`, `RateBuildupSnapshot`, `isGroupActive`, `computeInactiveNodeIds`, `snapshotFromTemplate`, `snapshotToCanvasDoc`, `canvasDocToSnapshot`, `evaluateSnapshot`, `computeSnapshotUnitPrice`.

Add at the top (after the canvasTypes re-exports):

```typescript
export {
  PricingRowOutput,
  RateBuildupSnapshot,
  isGroupActive,
  computeInactiveNodeIds,
  snapshotFromTemplate,
  snapshotToCanvasDoc,
  canvasDocToSnapshot,
  evaluateSnapshot,
  computeSnapshotUnitPrice,
} from "./snapshotEvaluator";
```

The remaining canvasStorage.ts should contain only: React imports, the `useCanvasDocuments` hook, `fragmentToDoc`, and the re-exports from both new modules.

- [ ] **Step 3: Verify the client compiles**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/snapshotEvaluator.ts \
       client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts
git commit -m "refactor: extract pure evaluation functions from canvasStorage.ts"
```

---

## Task 3: Set up client-side Vitest

**Files:**
- Create: `client/vitest.config.ts`
- Create: `client/src/testing/generatedGraphqlStub.ts`
- Modify: `client/package.json`

- [ ] **Step 1: Create the generated GraphQL stub**

The real `client/src/generated/graphql.tsx` is 5000+ lines and imports Apollo Client and React. Tests for pure evaluator functions need only the enums. This stub replaces it in the test environment.

```typescript
// client/src/testing/generatedGraphqlStub.ts
// Minimal stub for unit tests — exports only the enums used by calculator types.
// Values MUST match the server enum in server/src/typescript/tenderPricingSheet.ts
// and the generated client/src/generated/graphql.tsx.

export enum RateBuildupOutputKind {
  CrewHours = "CrewHours",
  Material = "Material",
}
```

- [ ] **Step 2: Create vitest.config.ts**

```typescript
// client/vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: [
      // The generated GraphQL file (graphql.tsx) imports Apollo Client and
      // React. Pure evaluator tests don't need any of that — redirect to a
      // minimal stub that exports only the enums.
      {
        find: /generated\/graphql$/,
        replacement: path.resolve(__dirname, "src/testing/generatedGraphqlStub.ts"),
      },
    ],
  },
});
```

- [ ] **Step 3: Install vitest and add test script**

Run: `cd client && npm install --save-dev vitest`

Then add to `client/package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest runs (no tests yet)**

Run: `cd client && npx vitest run 2>&1 | tail -5`
Expected: "No test files found" or similar (no crash)

- [ ] **Step 5: Commit**

```bash
git add client/vitest.config.ts client/src/testing/generatedGraphqlStub.ts \
       client/package.json client/package-lock.json
git commit -m "chore: add Vitest to client for pure function unit tests"
```

---

## Task 4: evaluateTemplate unit tests

**Files:**
- Create: `client/src/components/TenderPricing/calculators/__tests__/evaluateTemplate.test.ts`

Tests target `evaluateTemplate` from `evaluate.ts`. Each describe block exercises one concern.

- [ ] **Step 1: Write the test file**

```typescript
// client/src/components/TenderPricing/calculators/__tests__/evaluateTemplate.test.ts
import { describe, it, expect } from "vitest";
import { evaluateTemplate, safeEval, EvaluatableTemplate } from "../evaluate";
import { RateBuildupOutputKind } from "../../../../generated/graphql";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Minimal position stub — evaluator ignores positions entirely. */
const pos = { x: 0, y: 0 };

/** Build a minimal template from just the parts we care about. */
function tmpl(overrides: Partial<EvaluatableTemplate> = {}): EvaluatableTemplate {
  return {
    parameterDefs: [],
    tableDefs: [],
    formulaSteps: [],
    breakdownDefs: [],
    outputDefs: [],
    ...overrides,
  };
}

// ─── safeEval ────────────────────────────────────────────────────────────────

describe("safeEval", () => {
  it("evaluates a simple expression", () => {
    expect(safeEval("a + b", { a: 2, b: 3 })).toBe(5);
  });

  it("returns 0 for division by zero (Infinity)", () => {
    expect(safeEval("1 / 0", {})).toBe(0);
  });

  it("returns 0 for undefined variables", () => {
    expect(safeEval("x * 2", {})).toBe(0);
  });

  it("returns 0 for syntax errors", () => {
    expect(safeEval("+ + +", {})).toBe(0);
  });

  it("returns 0 for NaN results", () => {
    expect(safeEval("0 / 0", {})).toBe(0);
  });
});

// ─── evaluateTemplate: basic formulas ────────────────────────────────────────

describe("evaluateTemplate", () => {
  describe("basic formula evaluation", () => {
    it("evaluates a single formula step and sums breakdown", () => {
      const template = tmpl({
        formulaSteps: [
          { id: "cost", formula: "quantity * 10", label: "Cost", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "Total", items: [{ stepId: "cost", label: "Cost" }], position: pos },
        ],
      });

      const result = evaluateTemplate(template, undefined, 100);
      // 100 * 10 = 1000
      expect(result.unitPrice).toBe(1000);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].value).toBe(1000);
    });

    it("supports multiple formula steps with inter-step references", () => {
      const template = tmpl({
        formulaSteps: [
          { id: "material", formula: "quantity * 5", position: pos },
          { id: "labour", formula: "quantity * 3", position: pos },
          { id: "total", formula: "material + labour", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "Total", items: [{ stepId: "total", label: "Total" }], position: pos },
        ],
      });

      const result = evaluateTemplate(template, undefined, 10);
      // material=50, labour=30, total=80
      expect(result.unitPrice).toBe(80);
    });

    it("evaluates steps in dependency order regardless of declaration order", () => {
      // Declare "total" before "material" — topological sort should handle it
      const template = tmpl({
        formulaSteps: [
          { id: "total", formula: "material + 1", position: pos },
          { id: "material", formula: "quantity * 2", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "All", items: [{ stepId: "total", label: "T" }], position: pos },
        ],
      });

      const result = evaluateTemplate(template, undefined, 5);
      // material=10, total=11
      expect(result.unitPrice).toBe(11);
    });
  });

  // ─── Parameters ──────────────────────────────────────────────────────────

  describe("parameters", () => {
    it("uses input params when provided", () => {
      const template = tmpl({
        parameterDefs: [
          { id: "rate", label: "Rate", defaultValue: 10, position: pos },
        ],
        formulaSteps: [
          { id: "cost", formula: "quantity * rate", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
        ],
      });

      const result = evaluateTemplate(template, { params: { rate: 25 }, tables: {} }, 4);
      expect(result.unitPrice).toBe(100); // 4 * 25
    });

    it("falls back to defaultValue when no input provided", () => {
      const template = tmpl({
        parameterDefs: [
          { id: "rate", label: "Rate", defaultValue: 10, position: pos },
        ],
        formulaSteps: [
          { id: "cost", formula: "quantity * rate", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
        ],
      });

      const result = evaluateTemplate(template, undefined, 4);
      expect(result.unitPrice).toBe(40); // 4 * 10 (default)
    });
  });

  // ─── Tables ──────────────────────────────────────────────────────────────

  describe("tables", () => {
    it("computes tableRatePerHr aggregate", () => {
      const template = tmpl({
        tableDefs: [
          {
            id: "crew",
            label: "Crew",
            rowLabel: "Role",
            defaultRows: [
              { id: "r1", name: "Operator", qty: 1, ratePerHour: 80 },
              { id: "r2", name: "Labourer", qty: 2, ratePerHour: 50 },
            ],
            position: pos,
          },
        ],
        formulaSteps: [
          // crewRatePerHr = 1*80 + 2*50 = 180
          { id: "crewCost", formula: "crewRatePerHr * 8", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "T", items: [{ stepId: "crewCost", label: "C" }], position: pos },
        ],
      });

      // Use default rows (no inputs), quantity doesn't matter for this formula
      const result = evaluateTemplate(template, undefined, 1);
      expect(result.unitPrice).toBe(1440); // 180 * 8
    });

    it("uses input table rows over defaults", () => {
      const template = tmpl({
        tableDefs: [
          {
            id: "crew",
            label: "Crew",
            rowLabel: "Role",
            defaultRows: [{ id: "r1", name: "Op", qty: 1, ratePerHour: 80 }],
            position: pos,
          },
        ],
        formulaSteps: [
          { id: "cost", formula: "crewRatePerHr", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
        ],
      });

      const result = evaluateTemplate(
        template,
        { params: {}, tables: { crew: [{ id: "r1", name: "Op", qty: 3, ratePerHour: 60 }] } },
        1
      );
      expect(result.unitPrice).toBe(180); // 3 * 60
    });
  });

  // ─── Breakdowns ──────────────────────────────────────────────────────────

  describe("breakdowns", () => {
    it("sums multiple steps into one breakdown category", () => {
      const template = tmpl({
        formulaSteps: [
          { id: "a", formula: "10", position: pos },
          { id: "b", formula: "20", position: pos },
          { id: "c", formula: "30", position: pos },
        ],
        breakdownDefs: [
          {
            id: "bd1",
            label: "Materials",
            items: [
              { stepId: "a", label: "A" },
              { stepId: "b", label: "B" },
            ],
            position: pos,
          },
          {
            id: "bd2",
            label: "Labour",
            items: [{ stepId: "c", label: "C" }],
            position: pos,
          },
        ],
      });

      const result = evaluateTemplate(template, undefined, 1);
      expect(result.unitPrice).toBe(60); // 10+20+30
      expect(result.breakdown[0].value).toBe(30); // a+b
      expect(result.breakdown[1].value).toBe(30); // c
    });

    it("handles breakdown referencing a missing step (value = 0)", () => {
      const template = tmpl({
        formulaSteps: [{ id: "a", formula: "10", position: pos }],
        breakdownDefs: [
          {
            id: "bd1",
            label: "T",
            items: [
              { stepId: "a", label: "A" },
              { stepId: "nonexistent", label: "X" },
            ],
            position: pos,
          },
        ],
      });

      const result = evaluateTemplate(template, undefined, 1);
      expect(result.breakdown[0].value).toBe(10); // a=10 + nonexistent=0
    });
  });

  // ─── Controller values ───────────────────────────────────────────────────

  describe("controller values", () => {
    it("injects controller values into formula context", () => {
      const template = tmpl({
        formulaSteps: [
          { id: "cost", formula: "quantity * 10 * markup", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
        ],
      });

      const result = evaluateTemplate(template, undefined, 100, { markup: 1.15 });
      expect(result.unitPrice).toBeCloseTo(1150);
    });
  });

  // ─── Inactive nodes ──────────────────────────────────────────────────────

  describe("inactive nodes", () => {
    it("zeroes out steps in inactiveNodeIds set", () => {
      const template = tmpl({
        formulaSteps: [
          { id: "active", formula: "100", position: pos },
          { id: "disabled", formula: "200", position: pos },
        ],
        breakdownDefs: [
          {
            id: "bd1",
            label: "T",
            items: [
              { stepId: "active", label: "A" },
              { stepId: "disabled", label: "D" },
            ],
            position: pos,
          },
        ],
      });

      const result = evaluateTemplate(
        template,
        undefined,
        1,
        undefined,
        new Set(["disabled"])
      );
      expect(result.unitPrice).toBe(100); // disabled zeroed
    });
  });

  // ─── Circular dependencies ───────────────────────────────────────────────

  describe("circular dependencies", () => {
    it("zeroes out steps involved in a cycle", () => {
      const template = tmpl({
        formulaSteps: [
          { id: "a", formula: "b + 1", position: pos },
          { id: "b", formula: "a + 1", position: pos },
        ],
        breakdownDefs: [
          {
            id: "bd1",
            label: "T",
            items: [
              { stepId: "a", label: "A" },
              { stepId: "b", label: "B" },
            ],
            position: pos,
          },
        ],
      });

      const result = evaluateTemplate(template, undefined, 1);
      // Both are in a cycle. They're appended and evaluated in order —
      // a = safeEval("b + 1", { quantity: 1 }) = 0 (b not yet defined)
      // b = safeEval("a + 1", { quantity: 1, a: 0 }) = 1
      // So: a=0, b=1 → total = 1
      expect(result.unitPrice).toBe(1);
    });
  });

  // ─── Output nodes ────────────────────────────────────────────────────────

  describe("output nodes", () => {
    it("reads output value from the source formula step", () => {
      const template = tmpl({
        formulaSteps: [
          { id: "asphaltTons", formula: "quantity * 0.1 * 2.4", position: pos },
          { id: "unitCost", formula: "asphaltTons * 120", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "T", items: [{ stepId: "unitCost", label: "C" }], position: pos },
        ],
        outputDefs: [
          {
            id: "out1",
            kind: RateBuildupOutputKind.Material,
            sourceStepId: "asphaltTons",
            unit: "t",
            label: "Asphalt",
            defaultMaterialId: "mat_123",
            position: pos,
          },
        ],
      });

      const result = evaluateTemplate(template, undefined, 1000);
      // asphaltTons = 1000 * 0.1 * 2.4 = 240
      expect(result.outputs).toHaveLength(1);
      expect(result.outputs[0].perUnitValue).toBe(240);
      expect(result.outputs[0].kind).toBe(RateBuildupOutputKind.Material);
      expect(result.outputs[0].unit).toBe("t");
      expect(result.outputs[0].defaultMaterialId).toBe("mat_123");
    });

    it("normalises CrewHours output unit to 'hr'", () => {
      const template = tmpl({
        formulaSteps: [
          { id: "hours", formula: "quantity * 0.5", position: pos },
        ],
        breakdownDefs: [],
        outputDefs: [
          {
            id: "out1",
            kind: RateBuildupOutputKind.CrewHours,
            sourceStepId: "hours",
            unit: "stale_value",
            label: "Operator",
            defaultCrewKindId: "ck_1",
            position: pos,
          },
        ],
      });

      const result = evaluateTemplate(template, undefined, 10);
      expect(result.outputs[0].unit).toBe("hr");
      expect(result.outputs[0].perUnitValue).toBe(5);
    });

    it("returns 0 for output referencing a non-existent step", () => {
      const template = tmpl({
        formulaSteps: [],
        breakdownDefs: [],
        outputDefs: [
          {
            id: "out1",
            kind: RateBuildupOutputKind.Material,
            sourceStepId: "missing",
            unit: "t",
            position: pos,
          },
        ],
      });

      const result = evaluateTemplate(template, undefined, 100);
      expect(result.outputs[0].perUnitValue).toBe(0);
    });
  });

  // ─── Empty template ──────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("returns zero for an empty template", () => {
      const result = evaluateTemplate(tmpl(), undefined, 100);
      expect(result.unitPrice).toBe(0);
      expect(result.breakdown).toEqual([]);
      expect(result.outputs).toEqual([]);
    });

    it("handles zero quantity", () => {
      const template = tmpl({
        formulaSteps: [
          { id: "cost", formula: "quantity * 10", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
        ],
      });

      const result = evaluateTemplate(template, undefined, 0);
      expect(result.unitPrice).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd client && npx vitest run src/components/TenderPricing/calculators/__tests__/evaluateTemplate.test.ts`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add client/src/components/TenderPricing/calculators/__tests__/evaluateTemplate.test.ts
git commit -m "test: evaluateTemplate unit tests — formulas, breakdowns, outputs, edge cases"
```

---

## Task 5: snapshotEvaluator unit tests (evaluateSnapshot + computeSnapshotUnitPrice)

**Files:**
- Create: `client/src/components/pages/developer/CalculatorCanvas/__tests__/snapshotEvaluator.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
// client/src/components/pages/developer/CalculatorCanvas/__tests__/snapshotEvaluator.test.ts
import { describe, it, expect } from "vitest";
import { RateBuildupOutputKind } from "../../../../../generated/graphql";
import {
  evaluateSnapshot,
  computeSnapshotUnitPrice,
  snapshotFromTemplate,
  RateBuildupSnapshot,
} from "../snapshotEvaluator";
import type { CanvasDocument } from "../canvasTypes";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pos = { x: 0, y: 0 };
const specialPositions = { quantity: pos, unitPrice: pos };

/** Build a minimal CanvasDocument. */
function doc(overrides: Partial<CanvasDocument> = {}): CanvasDocument {
  return {
    id: "tmpl_1",
    label: "Test Template",
    defaultUnit: "m2",
    parameterDefs: [],
    tableDefs: [],
    formulaSteps: [],
    breakdownDefs: [],
    outputDefs: [],
    specialPositions,
    groupDefs: [],
    controllerDefs: [],
    ...overrides,
  };
}

/** Build a snapshot from a CanvasDocument with optional param/table overrides. */
function snap(
  template: CanvasDocument,
  overrides: Partial<RateBuildupSnapshot> = {}
): RateBuildupSnapshot {
  return {
    ...snapshotFromTemplate(template),
    ...overrides,
  };
}

// ─── evaluateSnapshot: basic ─────────────────────────────────────────────────

describe("evaluateSnapshot", () => {
  it("computes unitPrice from a simple formula", () => {
    const d = doc({
      parameterDefs: [
        { id: "rate", label: "Rate", defaultValue: 120, position: pos },
      ],
      formulaSteps: [
        { id: "cost", formula: "quantity * rate", position: pos },
      ],
      breakdownDefs: [
        { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
      ],
    });
    const s = snap(d);

    const { unitPrice } = evaluateSnapshot(s, 50);
    // 50 * 120 = 6000
    expect(unitPrice).toBe(6000);
  });

  it("uses overridden param values from the snapshot", () => {
    const d = doc({
      parameterDefs: [
        { id: "rate", label: "Rate", defaultValue: 100, position: pos },
      ],
      formulaSteps: [
        { id: "cost", formula: "quantity * rate", position: pos },
      ],
      breakdownDefs: [
        { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
      ],
    });
    const s = snap(d, { params: { rate: 200 } });

    const { unitPrice } = evaluateSnapshot(s, 10);
    expect(unitPrice).toBe(2000); // 10 * 200
  });

  it("rounds unitPrice to 4 decimal places", () => {
    const d = doc({
      formulaSteps: [
        { id: "cost", formula: "1 / 3", position: pos },
      ],
      breakdownDefs: [
        { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
      ],
    });
    const s = snap(d);

    const { unitPrice } = evaluateSnapshot(s, 1);
    expect(unitPrice).toBe(0.3333);
  });

  // ─── Unit variants ───────────────────────────────────────────────────────

  describe("unit variants", () => {
    it("applies conversion formula when unit matches a variant", () => {
      // Template uses m2 natively. Variant for "m3" converts: quantity / depth_m
      const d = doc({
        parameterDefs: [
          { id: "depth_m", label: "Depth", defaultValue: 0.05, position: pos },
        ],
        formulaSteps: [
          { id: "cost", formula: "quantity * 10", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
        ],
        unitVariants: [
          { unit: "m3", activatesGroupId: "g1", conversionFormula: "quantity / depth_m" },
        ],
        groupDefs: [
          { id: "g1", label: "m3 group", memberIds: [], position: pos },
        ],
      });
      const s = snap(d);

      // raw quantity = 5 m3, depth_m = 0.05
      // converted quantity = 5 / 0.05 = 100
      // cost = 100 * 10 = 1000
      const { unitPrice } = evaluateSnapshot(s, 5, "m3");
      expect(unitPrice).toBe(1000);
    });

    it("uses raw quantity when unit has no matching variant", () => {
      const d = doc({
        formulaSteps: [
          { id: "cost", formula: "quantity * 10", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
        ],
        unitVariants: [
          { unit: "m3", activatesGroupId: "g1" },
        ],
        groupDefs: [
          { id: "g1", label: "m3 group", memberIds: [], position: pos },
        ],
      });
      const s = snap(d);

      // unit "m2" has no variant → raw quantity used
      const { unitPrice } = evaluateSnapshot(s, 5, "m2");
      expect(unitPrice).toBe(50);
    });

    it("falls back to raw quantity when conversion formula returns null", () => {
      const d = doc({
        formulaSteps: [
          { id: "cost", formula: "quantity * 10", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
        ],
        unitVariants: [
          { unit: "m3", activatesGroupId: "g1", conversionFormula: "invalid syntax +" },
        ],
        groupDefs: [
          { id: "g1", label: "m3 group", memberIds: [], position: pos },
        ],
      });
      const s = snap(d);

      const { unitPrice } = evaluateSnapshot(s, 5, "m3");
      expect(unitPrice).toBe(50); // raw quantity * 10
    });

    it("falls back to raw quantity when conversion formula returns non-positive", () => {
      const d = doc({
        formulaSteps: [
          { id: "cost", formula: "quantity * 10", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
        ],
        unitVariants: [
          { unit: "m3", activatesGroupId: "g1", conversionFormula: "0 - quantity" },
        ],
        groupDefs: [
          { id: "g1", label: "m3 group", memberIds: [], position: pos },
        ],
      });
      const s = snap(d);

      const { unitPrice } = evaluateSnapshot(s, 5, "m3");
      expect(unitPrice).toBe(50); // negative conversion → fall back to raw
    });
  });

  // ─── Controllers ─────────────────────────────────────────────────────────

  describe("controllers", () => {
    it("converts boolean controller to 0/1 in formula context", () => {
      const d = doc({
        controllerDefs: [
          { id: "hasSealcoat", label: "Sealcoat", type: "toggle", defaultValue: true, position: pos },
        ],
        formulaSteps: [
          { id: "cost", formula: "100 + hasSealcoat * 50", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
        ],
      });

      // Toggle ON (true → 1)
      const sOn = snap(d, { controllers: { hasSealcoat: true } });
      expect(evaluateSnapshot(sOn, 1).unitPrice).toBe(150);

      // Toggle OFF (false → 0)
      const sOff = snap(d, { controllers: { hasSealcoat: false } });
      expect(evaluateSnapshot(sOff, 1).unitPrice).toBe(100);
    });

    it("passes numeric controller values through directly", () => {
      const d = doc({
        controllerDefs: [
          { id: "wasteFactor", label: "Waste", type: "percentage", defaultValue: 0.1, position: pos },
        ],
        formulaSteps: [
          { id: "cost", formula: "quantity * 10 * (1 + wasteFactor)", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
        ],
      });
      const s = snap(d, { controllers: { wasteFactor: 0.15 } });

      const { unitPrice } = evaluateSnapshot(s, 100);
      expect(unitPrice).toBeCloseTo(1150); // 100 * 10 * 1.15
    });
  });

  // ─── Output resolution ───────────────────────────────────────────────────

  describe("output resolution", () => {
    it("resolves Material output with estimator pick overriding default", () => {
      const d = doc({
        formulaSteps: [
          { id: "tons", formula: "quantity * 0.24", position: pos },
        ],
        breakdownDefs: [],
        outputDefs: [
          {
            id: "out1",
            kind: RateBuildupOutputKind.Material,
            sourceStepId: "tons",
            unit: "t",
            defaultMaterialId: "mat_default",
            position: pos,
          },
        ],
      });
      const s = snap(d, {
        outputs: { out1: { materialId: "mat_override" } },
      });

      const { outputs } = evaluateSnapshot(s, 100);
      expect(outputs).toHaveLength(1);
      expect(outputs[0].kind).toBe(RateBuildupOutputKind.Material);
      expect(outputs[0].materialId).toBe("mat_override");
      expect(outputs[0].unit).toBe("t");
      // 100 * 0.24 = 24
      expect(outputs[0].totalValue).toBe(24);
      expect(outputs[0].perUnitValue).toBe(24); // mirrors totalValue
    });

    it("resolves CrewHours output with default when no estimator pick", () => {
      const d = doc({
        formulaSteps: [
          { id: "hours", formula: "quantity * 0.5", position: pos },
        ],
        breakdownDefs: [],
        outputDefs: [
          {
            id: "out1",
            kind: RateBuildupOutputKind.CrewHours,
            sourceStepId: "hours",
            unit: "ignored",
            defaultCrewKindId: "ck_base",
            position: pos,
          },
        ],
      });
      const s = snap(d); // no explicit output picks

      const { outputs } = evaluateSnapshot(s, 20);
      expect(outputs[0].kind).toBe(RateBuildupOutputKind.CrewHours);
      expect(outputs[0].crewKindId).toBe("ck_base");
      expect(outputs[0].unit).toBe("hr"); // always normalised
      expect(outputs[0].totalValue).toBe(10); // 20 * 0.5
    });

    it("output totalValue equals perUnitValue (formula produces row total)", () => {
      // This is the critical semantic: formula steps receive `quantity`
      // and produce full row totals. Outputs read that value directly.
      // We do NOT multiply by quantity again.
      const d = doc({
        formulaSteps: [
          { id: "tons", formula: "quantity * 0.1 * 2.4", position: pos },
        ],
        breakdownDefs: [],
        outputDefs: [
          {
            id: "out1",
            kind: RateBuildupOutputKind.Material,
            sourceStepId: "tons",
            unit: "t",
            position: pos,
          },
        ],
      });
      const s = snap(d);

      const { outputs } = evaluateSnapshot(s, 1000);
      // tons = 1000 * 0.1 * 2.4 = 240
      expect(outputs[0].totalValue).toBe(240);
      expect(outputs[0].perUnitValue).toBe(240);
      // NOT 240 * 1000 = 240000 — that would be the bug
    });
  });

  // ─── computeSnapshotUnitPrice ────────────────────────────────────────────

  describe("computeSnapshotUnitPrice", () => {
    it("returns only the unitPrice (convenience wrapper)", () => {
      const d = doc({
        formulaSteps: [
          { id: "cost", formula: "quantity * 10", position: pos },
        ],
        breakdownDefs: [
          { id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: pos },
        ],
      });
      const s = snap(d);

      expect(computeSnapshotUnitPrice(s, 50)).toBe(500);
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd client && npx vitest run src/components/pages/developer/CalculatorCanvas/__tests__/snapshotEvaluator.test.ts`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/__tests__/snapshotEvaluator.test.ts
git commit -m "test: evaluateSnapshot + computeSnapshotUnitPrice — variants, controllers, outputs"
```

---

## Task 6: isGroupActive + computeInactiveNodeIds tests

**Files:**
- Create: `client/src/components/pages/developer/CalculatorCanvas/__tests__/groupActivation.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
// client/src/components/pages/developer/CalculatorCanvas/__tests__/groupActivation.test.ts
import { describe, it, expect } from "vitest";
import { isGroupActive, computeInactiveNodeIds } from "../snapshotEvaluator";
import type { CanvasDocument, GroupDef } from "../canvasTypes";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pos = { x: 0, y: 0 };
const specialPositions = { quantity: pos, unitPrice: pos };

function doc(overrides: Partial<CanvasDocument> = {}): CanvasDocument {
  return {
    id: "tmpl_1",
    label: "Test",
    defaultUnit: "m2",
    parameterDefs: [],
    tableDefs: [],
    formulaSteps: [],
    breakdownDefs: [],
    outputDefs: [],
    specialPositions,
    groupDefs: [],
    controllerDefs: [],
    ...overrides,
  };
}

// ─── isGroupActive ───────────────────────────────────────────────────────────

describe("isGroupActive", () => {
  it("returns true when group has no activation condition", () => {
    const group: GroupDef = { id: "g1", label: "G", memberIds: ["a"], position: pos };
    expect(isGroupActive(group, doc(), {})).toBe(true);
  });

  it("returns true when referenced controller does not exist", () => {
    const group: GroupDef = {
      id: "g1", label: "G", memberIds: ["a"], position: pos,
      activation: { controllerId: "missing", condition: "> 0" },
    };
    expect(isGroupActive(group, doc(), {})).toBe(true);
  });

  // ─── Percentage controller ───────────────────────────────────────────

  describe("percentage controller", () => {
    const d = doc({
      controllerDefs: [
        { id: "pct", label: "Pct", type: "percentage", defaultValue: 0.5, position: pos },
      ],
    });

    it("> comparison", () => {
      const g: GroupDef = {
        id: "g1", label: "G", memberIds: [], position: pos,
        activation: { controllerId: "pct", condition: "> 0" },
      };
      expect(isGroupActive(g, d, { pct: 0.5 })).toBe(true);
      expect(isGroupActive(g, d, { pct: 0 })).toBe(false);
    });

    it(">= comparison", () => {
      const g: GroupDef = {
        id: "g1", label: "G", memberIds: [], position: pos,
        activation: { controllerId: "pct", condition: ">= 0.5" },
      };
      expect(isGroupActive(g, d, { pct: 0.5 })).toBe(true);
      expect(isGroupActive(g, d, { pct: 0.49 })).toBe(false);
    });

    it("=== comparison", () => {
      const g: GroupDef = {
        id: "g1", label: "G", memberIds: [], position: pos,
        activation: { controllerId: "pct", condition: "=== 1" },
      };
      expect(isGroupActive(g, d, { pct: 1 })).toBe(true);
      expect(isGroupActive(g, d, { pct: 0.5 })).toBe(false);
    });

    it("!== comparison", () => {
      const g: GroupDef = {
        id: "g1", label: "G", memberIds: [], position: pos,
        activation: { controllerId: "pct", condition: "!== 0" },
      };
      expect(isGroupActive(g, d, { pct: 0.5 })).toBe(true);
      expect(isGroupActive(g, d, { pct: 0 })).toBe(false);
    });

    it("falls back to defaultValue when controller value is undefined", () => {
      const g: GroupDef = {
        id: "g1", label: "G", memberIds: [], position: pos,
        activation: { controllerId: "pct", condition: "> 0" },
      };
      // No value for "pct" → default is 0.5 → 0.5 > 0 → true
      expect(isGroupActive(g, d, {})).toBe(true);
    });
  });

  // ─── Toggle controller ───────────────────────────────────────────────

  describe("toggle controller", () => {
    const d = doc({
      controllerDefs: [
        { id: "toggle", label: "On/Off", type: "toggle", defaultValue: false, position: pos },
      ],
    });

    it("converts true to 1, false to 0", () => {
      const g: GroupDef = {
        id: "g1", label: "G", memberIds: [], position: pos,
        activation: { controllerId: "toggle", condition: "=== 1" },
      };
      expect(isGroupActive(g, d, { toggle: true })).toBe(true);
      expect(isGroupActive(g, d, { toggle: false })).toBe(false);
    });

    it("uses defaultValue when controller value is undefined", () => {
      const g: GroupDef = {
        id: "g1", label: "G", memberIds: [], position: pos,
        activation: { controllerId: "toggle", condition: "=== 0" },
      };
      // default is false → 0 → === 0 → true
      expect(isGroupActive(g, d, {})).toBe(true);
    });
  });

  // ─── Selector controller ─────────────────────────────────────────────

  describe("selector controller", () => {
    const d = doc({
      controllerDefs: [
        {
          id: "sel",
          label: "Pick",
          type: "selector",
          options: [
            { id: "opt_a", label: "A" },
            { id: "opt_b", label: "B" },
          ],
          defaultSelected: ["opt_a"],
          position: pos,
        },
      ],
    });

    it("active when optionId is in selected array", () => {
      const g: GroupDef = {
        id: "g1", label: "G", memberIds: [], position: pos,
        activation: { controllerId: "sel", optionId: "opt_a" },
      };
      expect(isGroupActive(g, d, { sel: ["opt_a", "opt_b"] })).toBe(true);
    });

    it("inactive when optionId is not in selected array", () => {
      const g: GroupDef = {
        id: "g1", label: "G", memberIds: [], position: pos,
        activation: { controllerId: "sel", optionId: "opt_b" },
      };
      expect(isGroupActive(g, d, { sel: ["opt_a"] })).toBe(false);
    });

    it("uses defaultSelected when controller value is undefined", () => {
      const g: GroupDef = {
        id: "g1", label: "G", memberIds: [], position: pos,
        activation: { controllerId: "sel", optionId: "opt_a" },
      };
      // defaultSelected = ["opt_a"] → includes "opt_a" → true
      expect(isGroupActive(g, d, {})).toBe(true);
    });

    it("inactive when optionId is not set (in-progress authoring)", () => {
      const g: GroupDef = {
        id: "g1", label: "G", memberIds: [], position: pos,
        activation: { controllerId: "sel" }, // no optionId
      };
      expect(isGroupActive(g, d, { sel: ["opt_a"] })).toBe(false);
    });
  });

  // ─── Edge: no condition on non-selector ───────────────────────────────

  it("returns true when activation has no condition on percentage/toggle", () => {
    const d2 = doc({
      controllerDefs: [
        { id: "pct", label: "P", type: "percentage", defaultValue: 0, position: pos },
      ],
    });
    const g: GroupDef = {
      id: "g1", label: "G", memberIds: [], position: pos,
      activation: { controllerId: "pct" }, // no condition string
    };
    expect(isGroupActive(g, d2, { pct: 0 })).toBe(true);
  });
});

// ─── computeInactiveNodeIds ──────────────────────────────────────────────────

describe("computeInactiveNodeIds", () => {
  it("returns empty set when no groups exist", () => {
    const result = computeInactiveNodeIds(doc(), {});
    expect(result.size).toBe(0);
  });

  it("returns empty set when all groups are always-active", () => {
    const d = doc({
      groupDefs: [
        { id: "g1", label: "G1", memberIds: ["step1", "step2"], position: pos },
      ],
    });
    const result = computeInactiveNodeIds(d, {});
    expect(result.size).toBe(0);
  });

  it("returns member IDs of inactive groups", () => {
    const d = doc({
      controllerDefs: [
        { id: "toggle", label: "T", type: "toggle", defaultValue: false, position: pos },
      ],
      groupDefs: [
        {
          id: "g1", label: "G1", memberIds: ["stepA", "stepB"], position: pos,
          activation: { controllerId: "toggle", condition: "=== 1" },
        },
      ],
    });

    // toggle = false → 0 → !== 1 → inactive
    const result = computeInactiveNodeIds(d, { toggle: false });
    expect(result.has("stepA")).toBe(true);
    expect(result.has("stepB")).toBe(true);
  });

  it("propagates inactivity to child groups", () => {
    const d = doc({
      controllerDefs: [
        { id: "toggle", label: "T", type: "toggle", defaultValue: false, position: pos },
      ],
      groupDefs: [
        {
          id: "parent", label: "Parent", memberIds: ["child", "stepA"], position: pos,
          activation: { controllerId: "toggle", condition: "=== 1" },
        },
        {
          id: "child", label: "Child", memberIds: ["stepB"], position: pos,
          // Child has no activation of its own — always active when parent is
        },
      ],
    });

    const result = computeInactiveNodeIds(d, { toggle: false });
    // Parent inactive → child also inactive → stepB inactive
    expect(result.has("child")).toBe(true);
    expect(result.has("stepA")).toBe(true);
    expect(result.has("stepB")).toBe(true);
  });

  // ─── Unit variant groups ──────────────────────────────────────────────

  describe("unit variant groups", () => {
    const d = doc({
      unitVariants: [
        { unit: "m2", activatesGroupId: "g_m2" },
        { unit: "m3", activatesGroupId: "g_m3" },
      ],
      groupDefs: [
        { id: "g_m2", label: "m2 group", memberIds: ["step_m2"], position: pos },
        { id: "g_m3", label: "m3 group", memberIds: ["step_m3"], position: pos },
      ],
    });

    it("activates only the matching variant group", () => {
      const result = computeInactiveNodeIds(d, {}, "m2");
      expect(result.has("step_m2")).toBe(false); // active
      expect(result.has("step_m3")).toBe(true);  // inactive
    });

    it("deactivates all variant groups when no unit specified", () => {
      const result = computeInactiveNodeIds(d, {});
      expect(result.has("step_m2")).toBe(true);
      expect(result.has("step_m3")).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd client && npx vitest run src/components/pages/developer/CalculatorCanvas/__tests__/groupActivation.test.ts`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/__tests__/groupActivation.test.ts
git commit -m "test: isGroupActive + computeInactiveNodeIds — controllers, propagation, variants"
```

---

## Task 7: Server tests — CrewKind CRUD via GraphQL

**Files:**
- Create: `server/src/graphql/__tests__/crewKindResolver.test.ts`

Follows the same pattern as the existing `crewResolver.test.ts`: supertest + prepareDatabase + seedDatabase + vitestLogin.

- [ ] **Step 1: Write the test file**

```typescript
// server/src/graphql/__tests__/crewKindResolver.test.ts
import request from "supertest";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import createApp from "../../app";
import vitestLogin from "@testing/vitestLogin";
import { CrewKind } from "@models";
import { Server } from "http";

let documents: SeededDatabase, app: Server;
let adminToken: string;
let pmToken: string;
let foremanToken: string;

beforeAll(async () => {
  await prepareDatabase();
  app = await createApp();
  documents = await seedDatabase();
  adminToken = await vitestLogin(app, "admin@bowmark.ca");
  pmToken = await vitestLogin(app, "pm@bowmark.ca");
  foremanToken = await vitestLogin(app, "baseforeman1@bowmark.ca");
});

afterAll(async () => {
  await disconnectAndStopServer();
});

// ─── Mutations ───────────────────────────────────────────────────────────────

const CREW_KIND_CREATE = `
  mutation CrewKindCreate($data: CrewKindCreateData!) {
    crewKindCreate(data: $data) { _id name description }
  }
`;

const CREW_KIND_UPDATE = `
  mutation CrewKindUpdate($id: ID!, $data: CrewKindUpdateData!) {
    crewKindUpdate(id: $id, data: $data) { _id name description }
  }
`;

const CREW_KIND_ARCHIVE = `
  mutation CrewKindArchive($id: ID!) {
    crewKindArchive(id: $id) { _id archivedAt }
  }
`;

const CREW_KIND_UNARCHIVE = `
  mutation CrewKindUnarchive($id: ID!) {
    crewKindUnarchive(id: $id) { _id archivedAt }
  }
`;

const CREW_KIND_REMOVE = `
  mutation CrewKindRemove($id: ID!) {
    crewKindRemove(id: $id)
  }
`;

const CREW_KINDS_QUERY = `
  query CrewKinds { crewKinds { _id name description } }
`;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CrewKind Resolver", () => {
  let crewKindId: string;

  describe("crewKindCreate", () => {
    it("creates a crew kind (admin)", async () => {
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: CREW_KIND_CREATE,
          variables: { data: { name: "Base Crew", description: "Standard paving crew" } },
        });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.crewKindCreate.name).toBe("Base Crew");
      expect(res.body.data.crewKindCreate.description).toBe("Standard paving crew");
      crewKindId = res.body.data.crewKindCreate._id;
    });

    it("rejects non-admin (foreman)", async () => {
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", foremanToken)
        .send({
          query: CREW_KIND_CREATE,
          variables: { data: { name: "Unauthorized Crew" } },
        });

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toMatch(/Access denied/i);
    });
  });

  describe("crewKindUpdate", () => {
    it("updates name and description", async () => {
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: CREW_KIND_UPDATE,
          variables: {
            id: crewKindId,
            data: { name: "Heavy Crew", description: "Large forming crew" },
          },
        });

      expect(res.body.data.crewKindUpdate.name).toBe("Heavy Crew");
      expect(res.body.data.crewKindUpdate.description).toBe("Large forming crew");
    });

    it("rejects duplicate name", async () => {
      // Create a second crew kind
      const res1 = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: CREW_KIND_CREATE,
          variables: { data: { name: "Second Crew" } },
        });
      const secondId = res1.body.data.crewKindCreate._id;

      // Try to rename it to the first crew kind's name
      const res2 = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: CREW_KIND_UPDATE,
          variables: { id: secondId, data: { name: "Heavy Crew" } },
        });

      expect(res2.body.errors).toBeDefined();
      expect(res2.body.errors[0].message).toMatch(/already exists/i);
    });
  });

  describe("crewKindArchive / crewKindUnarchive", () => {
    it("archives and unarchives", async () => {
      const archiveRes = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({ query: CREW_KIND_ARCHIVE, variables: { id: crewKindId } });

      expect(archiveRes.body.data.crewKindArchive.archivedAt).toBeTruthy();

      const unarchiveRes = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({ query: CREW_KIND_UNARCHIVE, variables: { id: crewKindId } });

      expect(unarchiveRes.body.data.crewKindUnarchive.archivedAt).toBeNull();
    });
  });

  describe("crewKindRemove", () => {
    it("hard-deletes a crew kind", async () => {
      // Create a throwaway
      const res1 = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: CREW_KIND_CREATE,
          variables: { data: { name: "Disposable Crew" } },
        });
      const disposableId = res1.body.data.crewKindCreate._id;

      const res2 = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({ query: CREW_KIND_REMOVE, variables: { id: disposableId } });

      expect(res2.body.data.crewKindRemove).toBe(true);

      // Verify gone
      const dbDoc = await CrewKind.findById(disposableId);
      expect(dbDoc).toBeNull();
    });
  });

  describe("crewKinds query", () => {
    it("returns the list", async () => {
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({ query: CREW_KINDS_QUERY });

      expect(res.body.data.crewKinds).toBeInstanceOf(Array);
      expect(res.body.data.crewKinds.length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd server && npx vitest run src/graphql/__tests__/crewKindResolver.test.ts`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add server/src/graphql/__tests__/crewKindResolver.test.ts
git commit -m "test: CrewKind CRUD resolver — create, update, archive, remove, authorization"
```

---

## Task 8: Server tests — Template save validation

**Files:**
- Create: `server/src/graphql/__tests__/rateBuildupTemplateResolver.test.ts`

Tests the `saveRateBuildupTemplate` mutation for whitelist/default invariants and duplicate label checks.

- [ ] **Step 1: Write the test file**

```typescript
// server/src/graphql/__tests__/rateBuildupTemplateResolver.test.ts
import request from "supertest";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import createApp from "../../app";
import vitestLogin from "@testing/vitestLogin";
import { RateBuildupTemplate } from "@models";
import { Server } from "http";

let documents: SeededDatabase, app: Server;
let adminToken: string;

const pos = { x: 0, y: 0 };

beforeAll(async () => {
  await prepareDatabase();
  app = await createApp();
  documents = await seedDatabase();
  adminToken = await vitestLogin(app, "admin@bowmark.ca");
});

afterAll(async () => {
  await disconnectAndStopServer();
});

const SAVE_TEMPLATE = `
  mutation SaveRateBuildupTemplate($data: SaveRateBuildupTemplateData!) {
    saveRateBuildupTemplate(data: $data) {
      _id
      label
      defaultUnit
      outputDefs { id kind sourceStepId unit label defaultMaterialId defaultCrewKindId allowedMaterialIds allowedCrewKindIds }
    }
  }
`;

const DELETE_TEMPLATE = `
  mutation DeleteRateBuildupTemplate($id: ID!) {
    deleteRateBuildupTemplate(id: $id)
  }
`;

/** Minimal valid template data for the mutation */
function templateData(overrides: Record<string, any> = {}) {
  return {
    label: `Test Template ${Date.now()}`,
    defaultUnit: "m2",
    parameterDefs: [],
    tableDefs: [],
    formulaSteps: [
      { id: "cost", formula: "quantity * 10", position: pos },
    ],
    breakdownDefs: [
      { id: "bd1", label: "Total", items: [{ stepId: "cost", label: "Cost" }], position: pos },
    ],
    outputDefs: [],
    controllerDefs: [],
    groupDefs: [],
    ...overrides,
  };
}

describe("RateBuildupTemplate Save Validation", () => {
  let templateId: string;

  describe("happy path", () => {
    it("creates a new template", async () => {
      const data = templateData({ label: "Paving Standard" });
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({ query: SAVE_TEMPLATE, variables: { data } });

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.saveRateBuildupTemplate.label).toBe("Paving Standard");
      expect(res.body.data.saveRateBuildupTemplate.defaultUnit).toBe("m2");
      templateId = res.body.data.saveRateBuildupTemplate._id;
    });

    it("updates an existing template", async () => {
      const data = templateData({ id: templateId, label: "Paving Standard v2" });
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({ query: SAVE_TEMPLATE, variables: { data } });

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.saveRateBuildupTemplate.label).toBe("Paving Standard v2");
    });
  });

  describe("duplicate label", () => {
    it("rejects creating a template with a duplicate label", async () => {
      const data = templateData({ label: "Paving Standard v2" }); // same as updated above
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({ query: SAVE_TEMPLATE, variables: { data } });

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toMatch(/already exists/i);
    });
  });

  describe("output whitelist/default invariants", () => {
    it("rejects material default outside allowed list", async () => {
      const data = templateData({
        label: `Whitelist Test ${Date.now()}`,
        outputDefs: [
          {
            id: "out1",
            kind: "Material",
            sourceStepId: "cost",
            unit: "t",
            position: pos,
            allowedMaterialIds: ["mat_a", "mat_b"],
            defaultMaterialId: "mat_c", // NOT in list
          },
        ],
      });

      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({ query: SAVE_TEMPLATE, variables: { data } });

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toMatch(/default material is not in its allowed list/i);
    });

    it("rejects crewKind default outside allowed list", async () => {
      const data = templateData({
        label: `CK Whitelist Test ${Date.now()}`,
        outputDefs: [
          {
            id: "out1",
            kind: "CrewHours",
            sourceStepId: "cost",
            unit: "hr",
            position: pos,
            allowedCrewKindIds: ["ck_a"],
            defaultCrewKindId: "ck_b", // NOT in list
          },
        ],
      });

      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({ query: SAVE_TEMPLATE, variables: { data } });

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toMatch(/default crew kind is not in its allowed list/i);
    });

    it("accepts default within allowed list", async () => {
      const data = templateData({
        label: `Valid WL ${Date.now()}`,
        outputDefs: [
          {
            id: "out1",
            kind: "Material",
            sourceStepId: "cost",
            unit: "t",
            position: pos,
            allowedMaterialIds: ["mat_a", "mat_b"],
            defaultMaterialId: "mat_a", // IN list
          },
        ],
      });

      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({ query: SAVE_TEMPLATE, variables: { data } });

      expect(res.body.errors).toBeUndefined();
    });

    it("accepts when no whitelist is set (any allowed)", async () => {
      const data = templateData({
        label: `No WL ${Date.now()}`,
        outputDefs: [
          {
            id: "out1",
            kind: "Material",
            sourceStepId: "cost",
            unit: "t",
            position: pos,
            defaultMaterialId: "mat_anything",
            // No allowedMaterialIds → any material allowed
          },
        ],
      });

      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({ query: SAVE_TEMPLATE, variables: { data } });

      expect(res.body.errors).toBeUndefined();
    });
  });

  describe("deletion", () => {
    it("deletes a template", async () => {
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({ query: DELETE_TEMPLATE, variables: { id: templateId } });

      expect(res.body.data.deleteRateBuildupTemplate).toBe(true);
      const dbDoc = await RateBuildupTemplate.findById(templateId);
      expect(dbDoc).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd server && npx vitest run src/graphql/__tests__/rateBuildupTemplateResolver.test.ts`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add server/src/graphql/__tests__/rateBuildupTemplateResolver.test.ts
git commit -m "test: template save validation — whitelist/default invariants, duplicate label"
```

---

## Task 9: Server tests — Row update validation + integration

**Files:**
- Create: `server/src/graphql/__tests__/tenderPricingSheetResolver.test.ts`

Tests row update kind↔field consistency and an integration test that creates a sheet, adds a row, updates it with a snapshot and outputs, and verifies everything persists correctly.

- [ ] **Step 1: Write the test file**

```typescript
// server/src/graphql/__tests__/tenderPricingSheetResolver.test.ts
import request from "supertest";
import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import createApp from "../../app";
import vitestLogin from "@testing/vitestLogin";
import { Tender, TenderPricingSheet } from "@models";
import { Server } from "http";

let documents: SeededDatabase, app: Server;
let adminToken: string;
let tenderId: string;

beforeAll(async () => {
  await prepareDatabase();
  app = await createApp();
  documents = await seedDatabase();
  adminToken = await vitestLogin(app, "admin@bowmark.ca");

  // Create a tender for the pricing sheet tests
  const tender = await (Tender as any).create({
    name: "Test Tender for Pricing",
    jobcode: `PRICE-${Date.now()}`,
    status: "bidding",
    files: [],
    notes: [],
    createdBy: new mongoose.Types.ObjectId(),
  });
  tenderId = tender._id.toString();
});

afterAll(async () => {
  await disconnectAndStopServer();
});

// ─── Mutations ───────────────────────────────────────────────────────────────

const SHEET_CREATE = `
  mutation TenderPricingSheetCreate($tenderId: ID!) {
    tenderPricingSheetCreate(tenderId: $tenderId) { _id rows { _id } }
  }
`;

const ROW_CREATE = `
  mutation TenderPricingRowCreate($sheetId: ID!, $data: TenderPricingRowCreateData!) {
    tenderPricingRowCreate(sheetId: $sheetId, data: $data) {
      _id
      rows { _id type description itemNumber quantity unit unitPrice rateBuildupSnapshot rateBuildupOutputs { kind materialId crewKindId unit perUnitValue totalValue } }
    }
  }
`;

const ROW_UPDATE = `
  mutation TenderPricingRowUpdate($sheetId: ID!, $rowId: ID!, $data: TenderPricingRowUpdateData!) {
    tenderPricingRowUpdate(sheetId: $sheetId, rowId: $rowId, data: $data) {
      _id
      rows { _id unitPrice rateBuildupSnapshot rateBuildupOutputs { kind materialId crewKindId unit perUnitValue totalValue } }
    }
  }
`;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("TenderPricingSheet Resolver", () => {
  let sheetId: string;
  let rowId: string;

  describe("sheet + row creation", () => {
    it("creates a pricing sheet for a tender", async () => {
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({ query: SHEET_CREATE, variables: { tenderId } });

      expect(res.body.errors).toBeUndefined();
      sheetId = res.body.data.tenderPricingSheetCreate._id;
      expect(sheetId).toBeDefined();
    });

    it("adds a row to the sheet", async () => {
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: ROW_CREATE,
          variables: {
            sheetId,
            data: {
              type: "Item",
              description: "Supply & place asphalt",
              itemNumber: "A.1.1",
              indentLevel: 2,
              sortOrder: 0,
            },
          },
        });

      expect(res.body.errors).toBeUndefined();
      const rows = res.body.data.tenderPricingRowCreate.rows;
      expect(rows.length).toBeGreaterThan(0);
      rowId = rows[rows.length - 1]._id;
    });
  });

  describe("row update — kind↔field validation", () => {
    it("rejects Material output with crewKindId", async () => {
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: ROW_UPDATE,
          variables: {
            sheetId,
            rowId,
            data: {
              rateBuildupOutputs: [
                {
                  kind: "Material",
                  crewKindId: "some_ck_id", // INVALID for Material
                  unit: "t",
                  perUnitValue: 10,
                  totalValue: 10,
                },
              ],
            },
          },
        });

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toMatch(/Material.*cannot have crewKindId/i);
    });

    it("rejects CrewHours output with materialId", async () => {
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: ROW_UPDATE,
          variables: {
            sheetId,
            rowId,
            data: {
              rateBuildupOutputs: [
                {
                  kind: "CrewHours",
                  materialId: "some_mat_id", // INVALID for CrewHours
                  unit: "hr",
                  perUnitValue: 5,
                  totalValue: 5,
                },
              ],
            },
          },
        });

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toMatch(/CrewHours.*cannot have materialId/i);
    });

    it("clears outputs when null is sent", async () => {
      // First set valid outputs
      await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: ROW_UPDATE,
          variables: {
            sheetId,
            rowId,
            data: {
              rateBuildupOutputs: [
                { kind: "Material", materialId: "mat_a", unit: "t", perUnitValue: 10, totalValue: 10 },
              ],
            },
          },
        });

      // Now clear
      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: ROW_UPDATE,
          variables: {
            sheetId,
            rowId,
            data: { rateBuildupOutputs: null },
          },
        });

      expect(res.body.errors).toBeUndefined();
      const row = res.body.data.tenderPricingRowUpdate.rows.find(
        (r: any) => r._id === rowId
      );
      expect(row.rateBuildupOutputs).toEqual([]);
    });
  });

  describe("integration: snapshot + outputs persist", () => {
    it("attaches a snapshot with outputs and reads them back", async () => {
      const snapshotJson = JSON.stringify({
        id: "tmpl_1",
        sourceTemplateId: "tmpl_1",
        label: "Test Template",
        defaultUnit: "m2",
        parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 120, position: { x: 0, y: 0 } }],
        tableDefs: [],
        formulaSteps: [{ id: "cost", formula: "quantity * rate", position: { x: 0, y: 0 } }],
        breakdownDefs: [{ id: "bd1", label: "T", items: [{ stepId: "cost", label: "C" }], position: { x: 0, y: 0 } }],
        outputDefs: [{ id: "out1", kind: "Material", sourceStepId: "cost", unit: "t", position: { x: 0, y: 0 } }],
        specialPositions: { quantity: { x: 0, y: 0 }, unitPrice: { x: 0, y: 0 } },
        groupDefs: [],
        controllerDefs: [],
        params: { rate: 120 },
        tables: {},
        controllers: {},
      });

      const outputs = [
        { kind: "Material", materialId: "mat_asphalt", unit: "t", perUnitValue: 240, totalValue: 240 },
      ];

      const res = await request(app)
        .post("/graphql")
        .set("Authorization", adminToken)
        .send({
          query: ROW_UPDATE,
          variables: {
            sheetId,
            rowId,
            data: {
              quantity: 1000,
              unit: "m2",
              unitPrice: 6000,
              rateBuildupSnapshot: snapshotJson,
              rateBuildupOutputs: outputs,
            },
          },
        });

      expect(res.body.errors).toBeUndefined();

      // Verify from the mutation response
      const row = res.body.data.tenderPricingRowUpdate.rows.find(
        (r: any) => r._id === rowId
      );
      expect(row.unitPrice).toBe(6000);
      expect(row.rateBuildupSnapshot).toBe(snapshotJson);
      expect(row.rateBuildupOutputs).toHaveLength(1);
      expect(row.rateBuildupOutputs[0].kind).toBe("Material");
      expect(row.rateBuildupOutputs[0].materialId).toBe("mat_asphalt");
      expect(row.rateBuildupOutputs[0].totalValue).toBe(240);

      // Verify directly from the database
      const sheet = await TenderPricingSheet.findById(sheetId);
      const dbRow = sheet!.rows.find((r) => r._id.toString() === rowId);
      expect(dbRow!.unitPrice).toBe(6000);
      expect(dbRow!.rateBuildupSnapshot).toBe(snapshotJson);
      expect((dbRow as any).rateBuildupOutputs).toHaveLength(1);
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd server && npx vitest run src/graphql/__tests__/tenderPricingSheetResolver.test.ts`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add server/src/graphql/__tests__/tenderPricingSheetResolver.test.ts
git commit -m "test: TenderPricingSheet — row validation, snapshot + output persistence"
```

---

## Task 10: Run full test suite and verify no regressions

- [ ] **Step 1: Run all client tests**

Run: `cd client && npx vitest run`
Expected: all new tests pass

- [ ] **Step 2: Run all server tests**

Run: `cd server && npx vitest run`
Expected: all existing + new tests pass, no regressions

- [ ] **Step 3: Final commit (if any fixups needed)**

Only if test failures require minor adjustments. Otherwise this step is a no-op.
