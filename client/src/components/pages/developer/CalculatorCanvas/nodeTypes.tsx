// client/src/components/pages/developer/CalculatorCanvas/nodeTypes.tsx
import React, { useMemo } from "react";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import katex from "katex";
import { formulaToLatex } from "./formulaToLatex";

const baseStyle: React.CSSProperties = {
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  minWidth: 160,
  position: "relative",
};

const labelStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 12,
  marginBottom: 1,
  color: "#ffffff",
};

const slugStyle: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 10,
  color: "#94a3b8",
  marginBottom: 3,
};

const valueStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  marginTop: 4,
  fontFamily: "monospace",
  color: "#ffffff",
};

const TypeBadge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div style={{
    position: "absolute",
    top: 7,
    right: 10,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color,
    opacity: 0.8,
  }}>
    {label}
  </div>
);

export const ParamNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div style={{
    ...baseStyle,
    background: "#1e3f6e",
    border: `1.5px solid ${selected ? "#93c5fd" : "#3b82f6"}`,
    borderTop: `3px solid #3b82f6`,
    boxShadow: selected ? "0 0 0 2px #3b82f640, 0 4px 12px #00000060" : "0 2px 8px #00000050",
  }}>
    <Handle type="source" position={Position.Right} isConnectable={false}
      style={{ background: "#3b82f6", border: "2px solid #1e3f6e", width: 10, height: 10 }} />
    <TypeBadge label="param" color="#93c5fd" />
    <div style={labelStyle}>{data.label}{data.suffix ? ` (${data.suffix})` : ""}</div>
    <div style={slugStyle}>{data.id}</div>
    <div style={{ ...valueStyle, color: "#bfdbfe" }}>{data.value}</div>
  </div>
);

export const TableNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div style={{
    ...baseStyle,
    background: "#1a4535",
    border: `1.5px solid ${selected ? "#6ee7b7" : "#10b981"}`,
    borderTop: `3px solid #10b981`,
    boxShadow: selected ? "0 0 0 2px #10b98140, 0 4px 12px #00000060" : "0 2px 8px #00000050",
  }}>
    <Handle type="source" position={Position.Right} isConnectable={false}
      style={{ background: "#10b981", border: "2px solid #1a4535", width: 10, height: 10 }} />
    <TypeBadge label="table" color="#6ee7b7" />
    <div style={labelStyle}>{data.label}</div>
    <div style={slugStyle}>{data.id}</div>
    <div style={{ ...valueStyle, color: "#a7f3d0" }}>${data.value.toFixed(2)}/hr</div>
  </div>
);

export const QuantityNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div style={{
    ...baseStyle,
    background: "#3d2e0a",
    border: `1.5px solid ${selected ? "#fcd34d" : "#f59e0b"}`,
    borderTop: `3px solid #f59e0b`,
    boxShadow: selected ? "0 0 0 2px #f59e0b40, 0 4px 12px #00000060" : "0 2px 8px #00000050",
  }}>
    <Handle type="source" position={Position.Right} isConnectable={false}
      style={{ background: "#f59e0b", border: "2px solid #3d2e0a", width: 10, height: 10 }} />
    <TypeBadge label="qty" color="#fcd34d" />
    <div style={labelStyle}>Quantity</div>
    <div style={{ ...slugStyle, marginBottom: 4 }}>tender input</div>
    <input
      className="nodrag"
      type="number"
      min={0}
      value={data.value}
      onChange={(e) => data.onChange(parseFloat(e.target.value) || 0)}
      style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid #92400e",
        borderRadius: 4,
        color: "#fef3c7",
        fontFamily: "monospace",
        fontSize: 13,
        fontWeight: 700,
        outline: "none",
        padding: "3px 6px",
        width: "100%",
      }}
    />
  </div>
);

export const ControllerNode: React.FC<NodeProps> = ({ data, selected }) => {
  const isSelector = data.controllerType === "selector";
  const isToggle = data.controllerType === "toggle";

  return (
    <div style={{
      ...baseStyle,
      background: "#134e4a",
      border: `1.5px solid ${selected ? "#5eead4" : "#0d9488"}`,
      borderTop: `3px solid #0d9488`,
      boxShadow: selected ? "0 0 0 2px #0d948840, 0 4px 12px #00000060" : "0 2px 8px #00000050",
      minWidth: isSelector ? 180 : 160,
    }}>
      {/* Percentage and Toggle output to formula graph */}
      {!isSelector && (
        <Handle type="source" position={Position.Right} isConnectable={false}
          style={{ background: "#0d9488", border: "2px solid #134e4a", width: 10, height: 10 }} />
      )}
      {/* Selector activates groups via a bottom handle */}
      {isSelector && (
        <Handle type="source" position={Position.Bottom} isConnectable={false}
          style={{ background: "#0d9488", border: "2px solid #134e4a", width: 10, height: 10 }} />
      )}
      <TypeBadge label={data.controllerType} color="#5eead4" />
      <div style={labelStyle}>{data.label}</div>

      {/* Percentage widget */}
      {data.controllerType === "percentage" && (
        <div style={{ ...valueStyle, color: "#99f6e4" }}>
          {((data.defaultValue as number ?? 0) * 100).toFixed(0)}%
        </div>
      )}

      {/* Toggle widget */}
      {isToggle && (
        <div style={{ ...valueStyle, color: "#99f6e4" }}>
          {data.defaultValue ? "ON" : "OFF"}
        </div>
      )}

      {/* Selector widget */}
      {isSelector && (
        <div style={{ marginTop: 4 }}>
          {(data.options as { id: string; label: string }[] ?? []).map((opt) => (
            <div key={opt.id} style={{
              fontSize: 10,
              color: (data.defaultSelected as string[] ?? []).includes(opt.id) ? "#5eead4" : "#64748b",
              fontFamily: "monospace",
              lineHeight: "1.6",
            }}>
              {(data.defaultSelected as string[] ?? []).includes(opt.id) ? "☑" : "☐"} {opt.label}
            </div>
          ))}
          {(data.options as { id: string; label: string }[] ?? []).length === 0 && (
            <div style={{ ...slugStyle, color: "#0f766e", fontStyle: "italic" }}>no options</div>
          )}
        </div>
      )}
    </div>
  );
};

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
      background: "#2d1b52",
      border: `1.5px solid ${selected ? "#c4b5fd" : "#8b5cf6"}`,
      borderTop: `3px solid #8b5cf6`,
      boxShadow: selected ? "0 0 0 2px #8b5cf640, 0 4px 12px #00000060" : "0 2px 8px #00000050",
      maxWidth: 300,
      minWidth: 190,
    }}>
      <Handle type="target" position={Position.Left} isConnectable={false}
        style={{ background: "#8b5cf6", border: "2px solid #2d1b52", width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} isConnectable={false}
        style={{ background: "#8b5cf6", border: "2px solid #2d1b52", width: 10, height: 10 }} />
      <TypeBadge label="formula" color="#c4b5fd" />
      <div style={labelStyle}>{data.label ?? data.id}</div>
      <div style={slugStyle}>{data.id}</div>
      <div style={{
        background: "#150c2e",
        borderRadius: 4,
        padding: "6px 8px",
        marginBottom: 5,
        minHeight: 32,
        overflowX: "auto",
        overflowY: "hidden",
        border: "1px solid #3b1f6e",
      }}>
        {katexHtml ? (
          <div
            style={{ color: data.hasError ? "#f87171" : "#ede9fe", fontSize: 13 }}
            dangerouslySetInnerHTML={{ __html: katexHtml }}
          />
        ) : (
          <div style={{ ...slugStyle, color: "#6d28d9", fontStyle: "italic" }}>
            empty
          </div>
        )}
      </div>
      <div style={{ ...valueStyle, color: data.hasError ? "#f87171" : "#ffffff" }}>
        {data.hasError ? "⚠ error" : `= ${data.value.toFixed(4)}`}
      </div>
    </div>
  );
};

export const BreakdownNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div style={{
    ...baseStyle,
    background: "#163a22",
    border: `1.5px solid ${selected ? "#86efac" : "#22c55e"}`,
    borderTop: `3px solid #22c55e`,
    boxShadow: selected ? "0 0 0 2px #22c55e40, 0 4px 12px #00000060" : "0 2px 8px #00000050",
  }}>
    <Handle type="target" position={Position.Left} isConnectable={false}
      style={{ background: "#22c55e", border: "2px solid #163a22", width: 10, height: 10 }} />
    <Handle type="source" position={Position.Right} isConnectable={false}
      style={{ background: "#22c55e", border: "2px solid #163a22", width: 10, height: 10 }} />
    <TypeBadge label="summary" color="#86efac" />
    <div style={labelStyle}>{data.label}</div>
    <div style={{ ...valueStyle, color: "#bbf7d0" }}>${data.value.toFixed(2)}/unit</div>
  </div>
);

export const OutputNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div style={{
    ...baseStyle,
    background: "#1e40af",
    border: `2px solid ${selected ? "#93c5fd" : "#60a5fa"}`,
    borderTop: `4px solid #60a5fa`,
    padding: "10px 14px",
    boxShadow: selected ? "0 0 0 3px #3b82f650, 0 4px 16px #00000070" : "0 4px 16px #00000060",
    minWidth: 180,
  }}>
    <Handle type="target" position={Position.Left} isConnectable={false}
      style={{ background: "#60a5fa", border: "2px solid #1e40af", width: 12, height: 12 }} />
    <div style={{ ...labelStyle, fontSize: 13, color: "#e0f2fe" }}>Unit Price</div>
    <div style={{ ...valueStyle, color: "#ffffff", fontSize: 18, marginTop: 6 }}>
      ${data.value.toFixed(2)}
    </div>
  </div>
);

export const GroupNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      borderRadius: 8,
      border: `1.5px dashed ${selected ? "#a5b4fc" : "#64748b"}`,
      background: selected ? "rgba(99, 102, 241, 0.10)" : "rgba(99, 102, 241, 0.05)",
      position: "relative",
    }}
  >
    <Handle type="target" position={Position.Left} isConnectable={false}
      style={{ background: "#0d9488", border: "2px solid #0f172a", width: 10, height: 10, top: 20 }} />
    <NodeResizer
      isVisible={selected}
      minWidth={200}
      minHeight={120}
      color="#818cf8"
      lineStyle={{ borderColor: "#818cf8" }}
      handleStyle={{ borderColor: "#818cf8", background: "#312e81", width: 14, height: 14 }}
      onResizeEnd={(_, params) => data.onResizeEnd?.(params.width, params.height)}
    />
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 12,
        fontSize: 10,
        color: "#a5b4fc",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
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
  controller: ControllerNode,
};
