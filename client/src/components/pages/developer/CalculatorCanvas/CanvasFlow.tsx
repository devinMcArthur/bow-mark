// client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx
import React, { useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  useNodesState,
  Node,
  Edge,
  NodeMouseHandler,
  NodeDragStopHandler,
  Background,
  Controls,
  MiniMap,
} from "reactflow";
// Note: CSS is imported in _app.tsx, not here (Next.js 12 restriction)

import {
  CalculatorTemplate,
} from "../../../../components/TenderPricing/calculators/types";
import {
  debugEvaluateTemplate,
  StepDebugInfo,
} from "../../../../components/TenderPricing/calculators/evaluate";
import { parseEdges } from "./edgeParser";
import { initialLayout } from "./layoutEngine";
import { loadPositions, savePositions } from "./canvasStorage";
import { nodeTypes } from "./nodeTypes";

const QUANTITY_DEFAULT = 100;

function buildNodes(
  template: CalculatorTemplate,
  stepDebug: StepDebugInfo[],
  positions: Record<string, { x: number; y: number }>
): Node[] {
  const debugMap = Object.fromEntries(stepDebug.map((s) => [s.id, s]));
  const nodes: Node[] = [];

  // Param nodes
  for (const p of template.parameterDefs) {
    nodes.push({
      id: p.id,
      type: "param",
      position: positions[p.id] ?? { x: 0, y: 0 },
      data: {
        id: p.id,
        label: p.label,
        suffix: p.suffix,
        value: template.defaultInputs.params[p.id] ?? p.defaultValue,
      },
    });
  }

  // Table aggregate nodes
  for (const t of template.tableDefs) {
    const nodeId = `${t.id}RatePerHr`;
    const rows = template.defaultInputs.tables[t.id] ?? [];
    const ratePerHr = rows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);
    nodes.push({
      id: nodeId,
      type: "table",
      position: positions[nodeId] ?? { x: 0, y: 0 },
      data: { id: nodeId, label: t.label, value: ratePerHr },
    });
  }

  // Quantity node
  nodes.push({
    id: "quantity",
    type: "quantity",
    position: positions["quantity"] ?? { x: 0, y: 0 },
    data: { value: QUANTITY_DEFAULT },
  });

  // Formula step nodes
  for (const step of template.formulaSteps) {
    const debug = debugMap[step.id];
    nodes.push({
      id: step.id,
      type: "formula",
      position: positions[step.id] ?? { x: 0, y: 0 },
      data: {
        id: step.id,
        formula: step.formula,
        value: debug?.value ?? 0,
        hasError: !!debug?.error,
      },
    });
  }

  // Breakdown nodes
  for (const bd of template.breakdownDefs) {
    const debug = debugMap[bd.perUnit];
    nodes.push({
      id: bd.id,
      type: "breakdown",
      position: positions[bd.id] ?? { x: 0, y: 0 },
      data: { label: bd.label, value: debug?.value ?? 0 },
    });
  }

  // Unit price output node
  const unitPrice = template.breakdownDefs.reduce((sum, bd) => {
    return sum + (debugMap[bd.perUnit]?.value ?? 0);
  }, 0);
  nodes.push({
    id: "unitPrice",
    type: "output",
    position: positions["unitPrice"] ?? { x: 0, y: 0 },
    data: { value: unitPrice },
  });

  return nodes;
}

interface Props {
  template: CalculatorTemplate;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}

const CanvasFlow: React.FC<Props> = ({ template, selectedNodeId, onSelectNode }) => {
  const getStepDebug = () =>
    debugEvaluateTemplate(template, template.defaultInputs, QUANTITY_DEFAULT);

  const getPositions = () =>
    loadPositions(template.id) ?? initialLayout(template);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    buildNodes(template, getStepDebug(), getPositions())
  );

  // Reset nodes when the active template changes
  useEffect(() => {
    const positions = loadPositions(template.id) ?? initialLayout(template);
    const stepDebug = debugEvaluateTemplate(
      template,
      template.defaultInputs,
      QUANTITY_DEFAULT
    );
    setNodes(buildNodes(template, stepDebug, positions));
  }, [template.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edges: recompute when template changes or a node is selected (for highlighting)
  const edges: Edge[] = useMemo(() => {
    const all = parseEdges(template);
    if (!selectedNodeId) return all;
    return all.map((e) =>
      e.target === selectedNodeId
        ? { ...e, animated: true, style: { stroke: "#a78bfa", strokeWidth: 2 } }
        : e
    );
  }, [template, selectedNodeId]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => onSelectNode(node.id),
    [onSelectNode]
  );

  const handleNodeDragStop: NodeDragStopHandler = useCallback(
    (_, node) => {
      const existing = loadPositions(template.id) ?? {};
      savePositions(template.id, { ...existing, [node.id]: node.position });
    },
    [template.id]
  );

  const handlePaneClick = useCallback(() => onSelectNode(null), [onSelectNode]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onNodeClick={handleNodeClick}
      onNodeDragStop={handleNodeDragStop}
      onPaneClick={handlePaneClick}
      nodeTypes={nodeTypes}
      fitView
      nodesDraggable
      nodesConnectable={false}
      edgesUpdatable={false}
      edgesFocusable={false}
    >
      <Background color="#1e293b" gap={20} />
      <Controls />
      <MiniMap
        nodeColor={(n) => {
          if (n.type === "param") return "#2563eb";
          if (n.type === "table") return "#059669";
          if (n.type === "quantity") return "#ca8a04";
          if (n.type === "formula") return "#7c3aed";
          if (n.type === "breakdown") return "#16a34a";
          return "#3b82f6";
        }}
        style={{ background: "#0f172a" }}
      />
    </ReactFlow>
  );
};

export default CanvasFlow;
