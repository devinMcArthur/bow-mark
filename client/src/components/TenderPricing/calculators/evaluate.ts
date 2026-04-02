// client/src/components/TenderPricing/calculators/evaluate.ts
import { Parser } from "expr-eval";
import {
  CalculatorTemplate,
  CalculatorInputs,
  CalculatorResult,
} from "./types";

export interface StepDebugInfo {
  id: string;
  formula: string;
  value: number;
  error?: string;
}

const parser = new Parser();

// Sort formula steps so each step is evaluated after all steps it depends on.
// This means declaration order no longer matters — the dependency graph drives evaluation.
// Steps involved in a cycle (or with unresolvable deps) are appended at the end and
// will simply evaluate to 0 for missing references.
function topoSortSteps(steps: FormulaStep[]): {
  sorted: FormulaStep[];
  cycleIds: Set<string>;
} {
  const stepIds = new Set(steps.map((s) => s.id));
  const deps = new Map<string, Set<string>>();
  for (const step of steps) {
    const refs = new Set(
      step.formula.split(/[^a-zA-Z0-9_]+/).filter((t) => t && stepIds.has(t))
    );
    deps.set(step.id, refs);
  }

  const resolved = new Set<string>();
  const result: FormulaStep[] = [];
  const pending = [...steps];

  while (pending.length > 0) {
    const idx = pending.findIndex((s) =>
      [...(deps.get(s.id) ?? [])].every((d) => resolved.has(d))
    );
    if (idx === -1) {
      // Remaining steps form one or more cycles — record them and append
      return {
        sorted: [...result, ...pending],
        cycleIds: new Set(pending.map((s) => s.id)),
      };
    }
    const [step] = pending.splice(idx, 1);
    result.push(step);
    resolved.add(step.id);
  }

  return { sorted: result, cycleIds: new Set() };
}

export function safeEval(formula: string, ctx: Record<string, number>): number {
  try {
    const result = parser.evaluate(formula, ctx);
    return typeof result === "number" && isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

export function evaluateTemplate(
  template: CalculatorTemplate,
  inputs: CalculatorInputs,
  quantity: number,
  controllerValues?: Record<string, number>,   // optional: percentage/toggle controller values
  inactiveNodeIds?: Set<string>                // optional: nodes in disabled groups → zeroed out
): CalculatorResult {
  // 1. Seed context: quantity + parameters + table aggregates
  const ctx: Record<string, number> = { quantity };

  for (const p of template.parameterDefs) {
    ctx[p.id] = inputs.params[p.id] ?? p.defaultValue;
  }

  for (const t of template.tableDefs) {
    ctx[`${t.id}RatePerHr`] = (inputs.tables[t.id] ?? []).reduce(
      (s, r) => s + r.qty * r.ratePerHour,
      0
    );
  }

  // Inject controller values (percentage/toggle) — formula steps may reference them by ID
  for (const [id, val] of Object.entries(controllerValues ?? {})) {
    ctx[id] = val;
  }

  // 2. Evaluate formula steps in dependency order; skip steps in inactive groups
  for (const step of topoSortSteps(template.formulaSteps).sorted) {
    ctx[step.id] = inactiveNodeIds?.has(step.id) ? 0 : safeEval(step.formula, ctx);
  }

  // 3. Assemble result
  const breakdown = template.breakdownDefs.map((b) => ({
    id: b.id,
    label: b.label,
    value: (b.items ?? []).reduce((s, item) => s + (ctx[item.stepId] ?? 0), 0),
  }));

  return {
    unitPrice: breakdown.reduce((s, b) => s + b.value, 0),
    breakdown,
    intermediates: template.intermediateDefs.map((i) => ({
      label: i.label,
      value: ctx[i.stepId] ?? 0,
      unit: i.unit,
    })),
  };
}

export function debugEvaluateTemplate(
  template: CalculatorTemplate,
  inputs: CalculatorInputs,
  quantity: number,
  controllerValues?: Record<string, number>,   // optional: percentage/toggle controller values
  inactiveNodeIds?: Set<string>                // optional: nodes in disabled groups → zeroed out
): StepDebugInfo[] {
  const ctx: Record<string, number> = { quantity };

  for (const p of template.parameterDefs) {
    ctx[p.id] = inputs.params[p.id] ?? p.defaultValue;
  }

  for (const t of template.tableDefs) {
    ctx[`${t.id}RatePerHr`] = (inputs.tables[t.id] ?? []).reduce(
      (s, r) => s + r.qty * r.ratePerHour,
      0
    );
  }

  // Inject controller values (percentage/toggle) — formula steps may reference them by ID
  for (const [id, val] of Object.entries(controllerValues ?? {})) {
    ctx[id] = val;
  }

  const { sorted, cycleIds } = topoSortSteps(template.formulaSteps);

  return sorted.map((step) => {
    // Steps in inactive groups are zeroed out without evaluation
    if (inactiveNodeIds?.has(step.id)) {
      ctx[step.id] = 0;
      return { id: step.id, formula: step.formula, value: 0 };
    }

    // Detect cycle participants before they reach the expression parser
    if (cycleIds.has(step.id)) {
      const otherCycleMembers = step.formula
        .split(/[^a-zA-Z0-9_]+/)
        .filter((t) => t && cycleIds.has(t) && t !== step.id);
      ctx[step.id] = 0;
      const with_ = otherCycleMembers.length > 0
        ? ` with: ${otherCycleMembers.join(", ")}`
        : "";
      return {
        id: step.id,
        formula: step.formula,
        value: 0,
        error: `Circular dependency${with_}`,
      };
    }

    try {
      const result = parser.evaluate(step.formula, ctx);
      if (typeof result === "number" && isFinite(result)) {
        ctx[step.id] = result;
        return { id: step.id, formula: step.formula, value: result };
      } else {
        ctx[step.id] = 0;
        return { id: step.id, formula: step.formula, value: 0, error: "Result is not a finite number" };
      }
    } catch (e) {
      ctx[step.id] = 0;
      return { id: step.id, formula: step.formula, value: 0, error: e instanceof Error ? e.message : String(e) };
    }
  });
}
