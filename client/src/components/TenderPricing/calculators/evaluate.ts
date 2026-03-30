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
  quantity: number
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

  // 2. Evaluate formula steps in order — each result joins the context
  for (const step of template.formulaSteps) {
    ctx[step.id] = safeEval(step.formula, ctx);
  }

  // 3. Assemble result
  const breakdown = template.breakdownDefs.map((b) => ({
    id: b.id,
    label: b.label,
    perUnit: ctx[b.perUnit] ?? 0,
    subValue: b.subValue
      ? `$${(ctx[b.subValue.stepId] ?? 0).toFixed(2)}${b.subValue.format}`
      : undefined,
  }));

  return {
    unitPrice: breakdown.reduce((s, b) => s + b.perUnit, 0),
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
  quantity: number
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

  return template.formulaSteps.map((step) => {
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
