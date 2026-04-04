import { Edge } from "reactflow";
import { CalculatorTemplate } from "../../../../components/TenderPricing/calculators/types";
import { CanvasDocument } from "./canvasStorage";

export function parseEdges(template: CalculatorTemplate): Edge[] {
  const edges: Edge[] = [];

  const controllerDefs = (template as unknown as CanvasDocument).controllerDefs ?? [];

  // All valid source node ids — include all formula step ids upfront so edges are
  // generated regardless of declaration order (order is irrelevant since the
  // evaluator uses topological sort).
  const sourceSet = new Set<string>([
    "quantity",
    ...template.parameterDefs.map((p) => p.id),
    ...template.tableDefs.map((t) => `${t.id}RatePerHr`),
    ...template.formulaSteps.map((s) => s.id),
    // Percentage and Toggle controllers can be referenced in formula expressions
    ...controllerDefs.filter((c) => c.type !== "selector").map((c) => c.id),
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
          // Bias dagre to keep the quantity node vertically centred among its consumers.
          ...(token === "quantity" ? { weight: 3 } : {}),
        } as any);
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

  // Activation edges: controller → group (dashed style to distinguish from formula edges)
  const groupDefs = (template as unknown as CanvasDocument).groupDefs ?? [];
  for (const group of groupDefs) {
    if (!group.activation) continue;
    const ctrl = controllerDefs.find((c) => c.id === group.activation!.controllerId);
    const sourceHandle =
      ctrl?.type === "selector" && group.activation.optionId
        ? group.activation.optionId
        : undefined;
    edges.push({
      id: `${group.activation.controllerId}->activation->${group.id}`,
      source: group.activation.controllerId,
      target: group.id,
      ...(sourceHandle ? { sourceHandle } : {}),
      style: { strokeDasharray: "5 4", stroke: "#0d9488", opacity: 0.7 },
    });
  }

  return edges;
}
