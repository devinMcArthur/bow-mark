import { Edge } from "reactflow";
import { CalculatorTemplate } from "../../../../components/TenderPricing/calculators/types";

export function parseEdges(template: CalculatorTemplate): Edge[] {
  const edges: Edge[] = [];

  // Build the set of all valid source node ids
  const sourceSet = new Set<string>([
    "quantity",
    ...template.parameterDefs.map((p) => p.id),
    ...template.tableDefs.map((t) => `${t.id}RatePerHr`),
  ]);

  // Formula steps: parse each formula string for variable name tokens
  for (const step of template.formulaSteps) {
    const tokens = step.formula.split(/[^a-zA-Z0-9_]+/).filter(Boolean);
    for (const token of tokens) {
      if (sourceSet.has(token)) {
        edges.push({
          id: `${token}->${step.id}`,
          source: token,
          target: step.id,
        });
      }
    }
    // Add this step's id so later steps can reference it
    sourceSet.add(step.id);
  }

  // Breakdown nodes: each references a formula step via perUnit
  for (const bd of template.breakdownDefs) {
    edges.push({
      id: `${bd.perUnit}->${bd.id}`,
      source: bd.perUnit,
      target: bd.id,
    });
    // Breakdown → unit price output
    edges.push({
      id: `${bd.id}->unitPrice`,
      source: bd.id,
      target: "unitPrice",
    });
  }

  return edges;
}
