// client/src/components/TenderPricing/calculators/types.ts

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
  intermediateDefs: IntermediateDef[];
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

export interface IntermediateDef {
  label: string;
  stepId: string;
  unit: string;
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

// Note: IntermediateDef does NOT get a canvas variant — intermediates are not
// rendered as nodes on the canvas (they appear only in the LiveTestPanel result section).

export interface CalculatorResult {
  unitPrice: number;
  breakdown: CostCategory[];
  intermediates: Intermediate[];
}

export interface CostCategory {
  id: string;
  label: string;
  value: number;
}

export interface Intermediate {
  label: string;
  value: number;
  unit: string;
}
