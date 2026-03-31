// client/src/components/pages/developer/CalculatorCanvas/nodeTypes.tsx
import React from "react";
import { Handle, Position, NodeProps } from "reactflow";

const baseStyle: React.CSSProperties = {
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 11,
  minWidth: 150,
};

const idStyle: React.CSSProperties = {
  fontFamily: "monospace",
  fontWeight: 700,
  fontSize: 11,
  marginBottom: 2,
};

const subStyle: React.CSSProperties = {
  fontSize: 10,
  opacity: 0.7,
  lineHeight: 1.3,
};

const valueStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  marginTop: 4,
  fontFamily: "monospace",
};

export const ParamNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div style={{
    ...baseStyle,
    background: "#1e3a5f",
    border: `1px solid ${selected ? "#60a5fa" : "#2563eb"}`,
    color: "#93c5fd",
    boxShadow: selected ? "0 0 0 2px #2563eb40" : undefined,
  }}>
    <Handle type="source" position={Position.Right} isConnectable={false}
      style={{ background: "#2563eb", border: "none" }} />
    <div style={{ ...idStyle, color: "#60a5fa" }}>{data.id}</div>
    {data.suffix && <div style={subStyle}>{data.label} ({data.suffix})</div>}
    <div style={{ ...valueStyle, color: "#bfdbfe" }}>{data.value}</div>
  </div>
);

export const TableNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div style={{
    ...baseStyle,
    background: "#1a3a2e",
    border: `1px solid ${selected ? "#34d399" : "#059669"}`,
    color: "#6ee7b7",
    boxShadow: selected ? "0 0 0 2px #05996940" : undefined,
  }}>
    <Handle type="source" position={Position.Right} isConnectable={false}
      style={{ background: "#059669", border: "none" }} />
    <div style={{ ...idStyle, color: "#34d399" }}>{data.id}</div>
    <div style={subStyle}>{data.label} Σ</div>
    <div style={{ ...valueStyle, color: "#a7f3d0" }}>${data.value.toFixed(2)}/hr</div>
  </div>
);

export const QuantityNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div style={{
    ...baseStyle,
    background: "#2d2a1e",
    border: `1px solid ${selected ? "#fbbf24" : "#ca8a04"}`,
    color: "#fde68a",
    boxShadow: selected ? "0 0 0 2px #ca8a0440" : undefined,
  }}>
    <Handle type="source" position={Position.Right} isConnectable={false}
      style={{ background: "#ca8a04", border: "none" }} />
    <div style={{ ...idStyle, color: "#fbbf24" }}>quantity</div>
    <div style={{ ...valueStyle, color: "#fef3c7" }}>{data.value}</div>
  </div>
);

export const FormulaNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div style={{
    ...baseStyle,
    background: "#2e1a47",
    border: `1px solid ${selected ? "#a78bfa" : "#7c3aed"}`,
    color: "#c4b5fd",
    boxShadow: selected ? "0 0 0 2px #7c3aed40" : undefined,
    maxWidth: 210,
  }}>
    <Handle type="target" position={Position.Left} isConnectable={false}
      style={{ background: "#7c3aed", border: "none" }} />
    <Handle type="source" position={Position.Right} isConnectable={false}
      style={{ background: "#7c3aed", border: "none" }} />
    <div style={{ ...idStyle, color: "#a78bfa" }}>{data.id}</div>
    <div style={{ ...subStyle, fontFamily: "monospace", color: "#8b5cf6" }}>{data.formula}</div>
    <div style={{ ...valueStyle, color: data.hasError ? "#f87171" : "#ddd6fe" }}>
      {data.hasError ? "⚠ error" : `= ${data.value.toFixed(4)}`}
    </div>
  </div>
);

export const BreakdownNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div style={{
    ...baseStyle,
    background: "#1a2e1a",
    border: `1px solid ${selected ? "#4ade80" : "#16a34a"}`,
    color: "#86efac",
    boxShadow: selected ? "0 0 0 2px #16a34a40" : undefined,
  }}>
    <Handle type="target" position={Position.Left} isConnectable={false}
      style={{ background: "#16a34a", border: "none" }} />
    <Handle type="source" position={Position.Right} isConnectable={false}
      style={{ background: "#16a34a", border: "none" }} />
    <div style={{ ...idStyle, color: "#4ade80" }}>{data.label}</div>
    <div style={{ ...valueStyle, color: "#bbf7d0" }}>${data.value.toFixed(2)}/unit</div>
  </div>
);

export const OutputNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div style={{
    ...baseStyle,
    background: "#1e3a8a",
    border: `2px solid ${selected ? "#93c5fd" : "#3b82f6"}`,
    color: "#bfdbfe",
    padding: "10px 14px",
    boxShadow: selected ? "0 0 0 2px #3b82f640" : undefined,
  }}>
    <Handle type="target" position={Position.Left} isConnectable={false}
      style={{ background: "#3b82f6", border: "none" }} />
    <div style={{ ...idStyle, color: "white", fontSize: 13 }}>Unit Price</div>
    <div style={{ ...valueStyle, color: "white", fontSize: 14 }}>${data.value.toFixed(2)}</div>
  </div>
);

// Defined at module level — React Flow warns if nodeTypes is redefined on every render
export const nodeTypes = {
  param: ParamNode,
  table: TableNode,
  quantity: QuantityNode,
  formula: FormulaNode,
  breakdown: BreakdownNode,
  output: OutputNode,
};
