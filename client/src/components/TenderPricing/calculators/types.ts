// client/src/components/TenderPricing/calculators/types.ts

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
}

export interface TableDef {
  id: string;           // key in CalculatorInputs.tables; also used as "{id}RatePerHr" in formula context
  label: string;
  rowLabel: string;     // column header: "Role", "Item"
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

export interface BreakdownDef {
  id: string;
  label: string;
  perUnit: string;      // formula step id whose value = $/unit
  subValue?: {
    stepId: string;     // formula step id for the sub-label number
    format: string;     // suffix appended after value: "/t", "/m²"
  };
}

export interface IntermediateDef {
  label: string;
  stepId: string;
  unit: string;
}

export interface CalculatorResult {
  unitPrice: number;
  breakdown: CostCategory[];
  intermediates: Intermediate[];
}

export interface CostCategory {
  id: string;
  label: string;
  perUnit: number;
  subValue?: string;
}

export interface Intermediate {
  label: string;
  value: number;
  unit: string;
}
