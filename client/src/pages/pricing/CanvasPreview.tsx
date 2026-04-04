// client/src/pages/pricing/CanvasPreview.tsx
import React, { useMemo } from "react";
import { CanvasDocument } from "../../components/pages/developer/CalculatorCanvas/canvasStorage";

interface NodeRect {
  x: number;
  y: number;
  w: number;
  h: number;
  type: "param" | "table" | "formula" | "breakdown" | "quantity" | "controller" | "group";
}

// Approximate node sizes matching layoutEngine.ts TYPE_SIZE
const NODE_W: Record<NodeRect["type"], number> = {
  param: 170, table: 170, formula: 240, breakdown: 170,
  quantity: 170, controller: 170, group: 0, // group uses its own w/h
};
const NODE_H: Record<NodeRect["type"], number> = {
  param: 80, table: 80, formula: 130, breakdown: 70,
  quantity: 90, controller: 60, group: 0,
};

const NODE_COLOR: Record<NodeRect["type"], string> = {
  param:      "#3b82f6", // blue
  table:      "#059669", // green
  formula:    "#7c3aed", // purple
  breakdown:  "#16a34a", // dark green
  quantity:   "#ca8a04", // amber
  controller: "#0d9488", // teal
  group:      "#e2e8f0", // gray outline
};

/** Walk up the group tree to get the absolute offset for a node. */
function groupAbsoluteOffset(
  nodeId: string,
  groupDefs: CanvasDocument["groupDefs"]
): { dx: number; dy: number } {
  const parent = groupDefs.find((g) => g.memberIds.includes(nodeId));
  if (!parent) return { dx: 0, dy: 0 };
  const parentOffset = groupAbsoluteOffset(parent.id, groupDefs);
  return {
    dx: parent.position.x + parentOffset.dx,
    dy: parent.position.y + parentOffset.dy,
  };
}

function collectRects(doc: CanvasDocument): NodeRect[] {
  const rects: NodeRect[] = [];

  // Groups: absolute positions, use stored w/h
  for (const g of doc.groupDefs) {
    const { dx, dy } = groupAbsoluteOffset(g.id, doc.groupDefs);
    rects.push({
      x: g.position.x + dx, y: g.position.y + dy,
      w: g.position.w ?? 400, h: g.position.h ?? 300,
      type: "group",
    });
  }

  // Helper: resolve absolute position for any non-group node
  const abs = (id: string, pos: { x: number; y: number }) => {
    const { dx, dy } = groupAbsoluteOffset(id, doc.groupDefs);
    return { x: pos.x + dx, y: pos.y + dy };
  };

  for (const p of doc.parameterDefs) {
    const { x, y } = abs(p.id, p.position);
    rects.push({ x, y, w: NODE_W.param, h: NODE_H.param, type: "param" });
  }
  for (const t of doc.tableDefs) {
    const { x, y } = abs(`${t.id}RatePerHr`, t.position);
    rects.push({ x, y, w: NODE_W.table, h: NODE_H.table, type: "table" });
  }
  for (const s of doc.formulaSteps) {
    const { x, y } = abs(s.id, s.position);
    rects.push({ x, y, w: NODE_W.formula, h: NODE_H.formula, type: "formula" });
  }
  for (const b of doc.breakdownDefs) {
    const { x, y } = abs(b.id, b.position);
    rects.push({ x, y, w: NODE_W.breakdown, h: NODE_H.breakdown, type: "breakdown" });
  }
  for (const c of (doc.controllerDefs ?? [])) {
    const { x, y } = abs(c.id, c.position);
    rects.push({ x, y, w: NODE_W.controller, h: NODE_H.controller, type: "controller" });
  }
  rects.push({
    x: doc.specialPositions.quantity.x, y: doc.specialPositions.quantity.y,
    w: NODE_W.quantity, h: NODE_H.quantity, type: "quantity",
  });

  return rects;
}

interface Props {
  doc: CanvasDocument;
  width?: number;
  height?: number;
}

const CanvasPreview: React.FC<Props> = ({ doc, width = 200, height = 110 }) => {
  const rects = useMemo(() => collectRects(doc), [doc]);

  const { scaleX, scaleY, offsetX, offsetY } = useMemo(() => {
    if (rects.length === 0) return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
    const pad = 8;
    const minX = Math.min(...rects.map((r) => r.x));
    const minY = Math.min(...rects.map((r) => r.y));
    const maxX = Math.max(...rects.map((r) => r.x + r.w));
    const maxY = Math.max(...rects.map((r) => r.y + r.h));
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
    const scaledW = spanX * scale;
    const scaledH = spanY * scale;
    return {
      scaleX: scale,
      scaleY: scale,
      offsetX: (width - scaledW) / 2 - minX * scale,
      offsetY: (height - scaledH) / 2 - minY * scale,
    };
  }, [rects, width, height]);

  if (rects.length === 0) return null;

  // Groups first (background), then nodes on top
  const groups = rects.filter((r) => r.type === "group");
  const nodes = rects.filter((r) => r.type !== "group");

  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block" }}
    >
      <rect width={width} height={height} fill="#0f172a" />
      {groups.map((r, i) => (
        <rect
          key={`g${i}`}
          x={r.x * scaleX + offsetX}
          y={r.y * scaleY + offsetY}
          width={r.w * scaleX}
          height={r.h * scaleY}
          rx={3}
          fill="none"
          stroke="#334155"
          strokeWidth={1}
        />
      ))}
      {nodes.map((r, i) => (
        <rect
          key={`n${i}`}
          x={r.x * scaleX + offsetX}
          y={r.y * scaleY + offsetY}
          width={Math.max(r.w * scaleX, 3)}
          height={Math.max(r.h * scaleY, 2)}
          rx={2}
          fill={NODE_COLOR[r.type]}
          opacity={0.75}
        />
      ))}
    </svg>
  );
};

export default CanvasPreview;
