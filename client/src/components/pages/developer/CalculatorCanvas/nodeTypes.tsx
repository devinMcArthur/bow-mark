// client/src/components/pages/developer/CalculatorCanvas/nodeTypes.tsx
import React, { useMemo } from "react";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import katex from "katex";
import { formulaToLatex } from "./formulaToLatex";

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
    <div style={{ ...idStyle, color: "#60a5fa" }}>{data.label}{data.suffix ? ` (${data.suffix})` : ""}</div>
    <div style={{ ...subStyle, fontFamily: "monospace" }}>{data.id}</div>
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
    <div style={{ ...idStyle, color: "#34d399" }}>{data.label}</div>
    <div style={{ ...subStyle, fontFamily: "monospace" }}>{data.id}</div>
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
    <div style={{ ...idStyle, color: "#fbbf24" }}>Quantity</div>
    <div style={{ ...subStyle, color: "#a16207", marginBottom: 2 }}>tender input</div>
    <input
      className="nodrag"
      type="number"
      min={0}
      value={data.value}
      onChange={(e) => data.onChange(parseFloat(e.target.value) || 0)}
      style={{
        background: "transparent",
        border: "none",
        borderBottom: "1px solid #92400e",
        color: "#fef3c7",
        fontFamily: "monospace",
        fontSize: 12,
        fontWeight: 600,
        marginTop: 4,
        outline: "none",
        padding: "2px 0",
        width: "100%",
      }}
    />
  </div>
);

// ─── KaTeX formula renderer ───────────────────────────────────────────────────

const katexOpts: katex.KatexOptions = {
  throwOnError: false,
  errorColor: "#f87171",
  displayMode: false,
  output: "html",
};

export const FormulaNode: React.FC<NodeProps> = ({ data, selected }) => {
  const latex = useMemo(
    () => formulaToLatex(data.formula ?? "", data.labelMap ?? {}),
    [data.formula, data.labelMap]
  );
  const katexHtml = useMemo(() => {
    if (!latex) return "";
    try {
      return katex.renderToString(latex, katexOpts);
    } catch {
      return "";
    }
  }, [latex]);

  return (
    <div style={{
      ...baseStyle,
      background: "#2e1a47",
      border: `1px solid ${selected ? "#a78bfa" : "#7c3aed"}`,
      color: "#c4b5fd",
      boxShadow: selected ? "0 0 0 2px #7c3aed40" : undefined,
      maxWidth: 300,
      minWidth: 180,
    }}>
      <Handle type="target" position={Position.Left} isConnectable={false}
        style={{ background: "#7c3aed", border: "none" }} />
      <Handle type="source" position={Position.Right} isConnectable={false}
        style={{ background: "#7c3aed", border: "none" }} />

      {/* Label */}
      <div style={{ ...idStyle, color: "#a78bfa" }}>{data.label ?? data.id}</div>

      {/* Slug hint */}
      <div style={{ ...subStyle, fontFamily: "monospace", marginBottom: 6 }}>{data.id}</div>

      {/* Typeset formula */}
      <div style={{
        background: "#1e1030",
        borderRadius: 4,
        padding: "6px 8px",
        marginBottom: 5,
        minHeight: 32,
        overflowX: "auto",
        overflowY: "hidden",
      }}>
        {katexHtml ? (
          <div
            // KaTeX injects its own colour; override to match our theme
            style={{ color: data.hasError ? "#f87171" : "#e9d5ff", fontSize: 13 }}
            dangerouslySetInnerHTML={{ __html: katexHtml }}
          />
        ) : (
          <div style={{ ...subStyle, fontFamily: "monospace", color: "#6d28d9", fontStyle: "italic" }}>
            empty
          </div>
        )}
      </div>

      {/* Result */}
      <div style={{ ...valueStyle, color: data.hasError ? "#f87171" : "#ddd6fe" }}>
        {data.hasError ? "⚠ error" : `= ${data.value.toFixed(4)}`}
      </div>
    </div>
  );
};

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

export const GroupNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      borderRadius: 8,
      border: `1px dashed ${selected ? "#818cf8" : "#475569"}`,
      background: "rgba(99, 102, 241, 0.04)",
      position: "relative",
    }}
  >
    <NodeResizer
      isVisible={selected}
      minWidth={200}
      minHeight={120}
      color="#6366f1"
      lineStyle={{ borderColor: "#6366f1" }}
      handleStyle={{ borderColor: "#6366f1", background: "#1e1b4b" }}
      onResizeEnd={(_, params) => data.onResizeEnd?.(params.width, params.height)}
    />
    <div
      style={{
        position: "absolute",
        top: 6,
        left: 10,
        fontSize: 9,
        color: "#818cf8",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 700,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {data.label}
    </div>
  </div>
);

// Defined at module level — React Flow warns if nodeTypes is redefined on every render
export const nodeTypes = {
  param: ParamNode,
  table: TableNode,
  quantity: QuantityNode,
  formula: FormulaNode,
  breakdown: BreakdownNode,
  priceOutput: OutputNode,
  group: GroupNode,
};
