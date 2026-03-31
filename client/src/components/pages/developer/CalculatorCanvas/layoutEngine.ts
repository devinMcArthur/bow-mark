import dagre from "dagre";
import { Node, Edge } from "reactflow";
import { CalculatorTemplate } from "../../../../components/TenderPricing/calculators/types";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 72;

export function dagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", ranksep: 80, nodesep: 30 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

const COL_X = [0, 220, 440, 660, 880];
const ROW_GAP = 80;

function rowY(index: number): number {
  return index * ROW_GAP + 20;
}

export function initialLayout(
  template: CalculatorTemplate
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  // Column 0: params + table aggregates + quantity
  const col0Ids = [
    ...template.parameterDefs.map((p) => p.id),
    ...template.tableDefs.map((t) => `${t.id}RatePerHr`),
    "quantity",
  ];
  col0Ids.forEach((id, i) => {
    positions[id] = { x: COL_X[0], y: rowY(i) };
  });

  // Columns 1 & 2: formula steps, split at midpoint
  const steps = template.formulaSteps;
  const mid = Math.ceil(steps.length / 2);
  steps.slice(0, mid).forEach((s, i) => {
    positions[s.id] = { x: COL_X[1], y: rowY(i) };
  });
  steps.slice(mid).forEach((s, i) => {
    positions[s.id] = { x: COL_X[2], y: rowY(i) };
  });

  // Column 3: breakdown nodes
  template.breakdownDefs.forEach((bd, i) => {
    positions[bd.id] = { x: COL_X[3], y: rowY(i) };
  });

  // Column 4: unit price output
  positions["unitPrice"] = { x: COL_X[4], y: rowY(0) };

  return positions;
}
