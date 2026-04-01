import { Edge } from "reactflow";
import { CalculatorTemplate } from "../../../../components/TenderPricing/calculators/types";

export function parseEdges(template: CalculatorTemplate): Edge[] {
  const edges: Edge[] = [];

  // All valid source node ids — include all formula step ids upfront so edges are
  // generated regardless of declaration order (order is irrelevant since the
  // evaluator uses topological sort).
  const sourceSet = new Set<string>([
    "quantity",
    ...template.parameterDefs.map((p) => p.id),
    ...template.tableDefs.map((t) => `${t.id}RatePerHr`),
    ...template.formulaSteps.map((s) => s.id),
  ]);

  // Formula steps: parse each formula string for variable name tokens.
  // Use a Set per step to avoid duplicate edges when a variable appears
  // more than once in the same formula (e.g. `a * a + a`).
  for (const step of template.formulaSteps) {
    const seen = new Set<string>();
    const tokens = step.formula.split(/[^a-zA-Z0-9_]+/).filter(Boolean);
    for (const token of tokens) {
      if (sourceSet.has(token) && token !== step.id && !seen.has(token)) {
        seen.add(token);
        edges.push({
          id: `${token}->${step.id}`,
          source: token,
          target: step.id,
        });
      }
    }
  }

  // Breakdown nodes: one edge per item + one edge to unit price output
  for (const bd of template.breakdownDefs) {
    for (const item of (bd.items ?? [])) {
      edges.push({
        id: `${item.stepId}->${bd.id}`,
        source: item.stepId,
        target: bd.id,
      });
    }
    edges.push({
      id: `${bd.id}->unitPrice`,
      source: bd.id,
      target: "unitPrice",
    });
  }

  return edges;
}
