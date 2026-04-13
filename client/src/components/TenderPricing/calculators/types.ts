// client/src/components/TenderPricing/calculators/types.ts
import { RateBuildupOutputKind } from "../../../generated/graphql";

// ─── Canvas position/node base ────────────────────────────────────────────────

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

/** Positions for the two synthetic canvas nodes that have no def. */
export interface SpecialNodePositions {
  quantity: Position;
  unitPrice: Position;
}

// ─── Static calculator system ─────────────────────────────────────────────────

export interface CalculatorTemplate {
  id: string;                    // slug: "paving", "gravel", "concrete-sidewalk"
  label: string;                 // shown in type picker
  defaultUnit: string;           // pre-fills row unit field: "m²", "lin.m"
  parameterDefs: ParameterDef[];
  tableDefs: TableDef[];
  formulaSteps: FormulaStep[];
  breakdownDefs: BreakdownDef[];
  outputDefs: OutputDef[];
  defaultInputs: CalculatorInputs;
}

export interface ParameterDef {
  id: string;           // key in CalculatorInputs.params
  label: string;
  prefix?: string;      // "$"
  suffix?: string;      // "mm", "/t", "/hr"
  defaultValue: number;
  hint?: string;        // template-level guidance shown read-only to estimators
}

export interface TableDef {
  id: string;           // key in CalculatorInputs.tables; also used as "{id}RatePerHr" in formula context
  label: string;
  rowLabel: string;     // column header: "Role", "Item"
  hint?: string;        // template-level guidance shown read-only to estimators
}

export interface RateEntry {
  id: string;
  name: string;
  qty: number;
  ratePerHour: number;
}

export interface CalculatorInputs {
  params: Record<string, number>;
  tables: Record<string, RateEntry[]>;
}

export interface FormulaStep {
  id: string;           // variable name added to evaluation context
  label?: string;
  formula: string;      // arithmetic expression; can reference: parameter ids,
                        // prior step ids, "{tableId}RatePerHr", and "quantity"
}

export interface BreakdownItem {
  stepId: string;       // formula step whose value is included in the sum
  label: string;        // display label for this line
}

export interface BreakdownDef {
  id: string;
  label: string;
  items: BreakdownItem[]; // summed to produce this breakdown node's value
}

/**
 * Output node — surfaces a per-unit secondary value from a formula step.
 * Template author wires an Output node to a formula step via `sourceStepId`
 * (following the same pattern as BreakdownItem.stepId). The `kind` discriminator
 * governs what the estimator picks in RateBuildupInputs — a Material from the
 * catalog (kind=material) or a CrewKind from the catalog (kind=crewHours).
 *
 * Displayed as "Demand" in the UI but stored as RateBuildupOutput in the data
 * model.
 */
export interface OutputDef extends CanvasNodeBase {
  /** Discriminator: "Material" | "CrewHours" — future: "other". */
  kind: RateBuildupOutputKind;
  /** Formula step whose per-unit computed value this output exposes. */
  sourceStepId: string;
  /**
   * Canonical unit code — fixed by template author for material outputs
   * (t, m3, ea, ...). Ignored for crewHours (unit is always "hr").
   */
  unit: string;
  /** Optional display label, e.g. "Asphalt" or "Operator". */
  label?: string;

  /** MATERIAL: whitelist of Material IDs the estimator can pick. Empty/absent = any. */
  allowedMaterialIds?: string[];
  /** MATERIAL: optional default (must be in whitelist if one is set). */
  defaultMaterialId?: string;

  /** CREW HOURS: whitelist of CrewKind IDs the estimator can pick. Empty/absent = any. */
  allowedCrewKindIds?: string[];
  /** CREW HOURS: optional default (must be in whitelist if one is set). */
  defaultCrewKindId?: string;
}

// ─── Canvas-specific def types ────────────────────────────────────────────────
// Extend the general def types with canvas concerns (position, defaultRows).
// The general types stay intact for the old static calculator system.

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

// OutputDef already extends CanvasNodeBase (carries position) — no separate canvas variant needed.

export interface CalculatorResult {
  unitPrice: number;
  breakdown: CostCategory[];
  outputs: EvaluatedOutput[];
}

export interface CostCategory {
  id: string;
  label: string;
  value: number;
}

/**
 * One Output node's resolved per-unit value after template evaluation.
 * `defaultMaterialId` / `defaultCrewKindId` are the template's defaults — at
 * snapshot save time, the estimator's selection from `snapshot.outputs`
 * overrides whichever one applies to the output's kind.
 */
export interface EvaluatedOutput {
  id: string;
  kind: RateBuildupOutputKind;
  label?: string;
  unit: string;
  perUnitValue: number;
  /** Template-level default material id (material kind). */
  defaultMaterialId?: string;
  /** Template-level default crew kind id (crewHours kind). */
  defaultCrewKindId?: string;
}
