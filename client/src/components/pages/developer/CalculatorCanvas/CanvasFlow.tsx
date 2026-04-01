// client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"; // useState used for contextMenu
import ReactFlow, {
  useNodesState,
  ReactFlowInstance,
  Node,
  Edge,
  NodeMouseHandler,
  NodeDragStopHandler,
  Background,
  Controls,
  MiniMap,
} from "reactflow";
// Note: CSS is imported in _app.tsx, not here (Next.js 12 restriction)

import { StepDebugInfo } from "../../../../components/TenderPricing/calculators/evaluate";
import { CanvasDocument } from "./canvasStorage";
import { ClipboardPayload, SINGLETONS } from "./canvasOps";
import { parseEdges } from "./edgeParser";
import { dagreLayout } from "./layoutEngine";
import { nodeTypes } from "./nodeTypes";

// ─── Node builder ─────────────────────────────────────────────────────────────

function buildNodes(
  doc: CanvasDocument,
  stepDebug: StepDebugInfo[],
  positions: Record<string, { x: number; y: number; w?: number; h?: number }>,
  quantity: number,
  onQuantityChange: (v: number) => void,
  onGroupResizeEnd: (groupId: string, w: number, h: number) => void
): Node[] {
  const debugMap = Object.fromEntries(stepDebug.map((s) => [s.id, s]));
  const nodes: Node[] = [];

  // Build direct-parent map: nodeId → groupId
  const memberOf: Record<string, string> = {};
  for (const g of doc.groupDefs) {
    for (const mid of g.memberIds) {
      memberOf[mid] = g.id;
    }
  }

  // Helper: create a node with parentId if grouped
  const makeNode = (id: string, type: string, data: Record<string, unknown>): Node => {
    const pos = positions[id] ?? { x: 0, y: 0 };
    const parentId = memberOf[id];
    return {
      id,
      type,
      position: { x: pos.x, y: pos.y },
      ...(parentId !== undefined ? { parentId } : {}),
      data,
    };
  };

  // Group container nodes (rendered behind other nodes)
  for (const g of doc.groupDefs) {
    const pos = positions[g.id] ?? { x: 0, y: 0 };
    const w = pos.w ?? 400;
    const h = pos.h ?? 300;
    const parentId = memberOf[g.id];
    nodes.push({
      id: g.id,
      type: "group",
      position: { x: pos.x, y: pos.y },
      ...(parentId !== undefined ? { parentId } : {}),
      style: { width: w, height: h },
      zIndex: -1,
      data: {
        label: g.label,
        onResizeEnd: (newW: number, newH: number) => onGroupResizeEnd(g.id, newW, newH),
      },
    });
  }

  for (const p of doc.parameterDefs) {
    nodes.push(makeNode(p.id, "param", {
      id: p.id,
      label: p.label,
      suffix: p.suffix,
      value: doc.defaultInputs.params[p.id] ?? p.defaultValue,
    }));
  }

  for (const t of doc.tableDefs) {
    const nodeId = `${t.id}RatePerHr`;
    const rows = doc.defaultInputs.tables[t.id] ?? [];
    const ratePerHr = rows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);
    nodes.push(makeNode(nodeId, "table", { id: nodeId, label: t.label, value: ratePerHr }));
  }

  // Singletons — never grouped
  nodes.push({
    id: "quantity",
    type: "quantity",
    position: positions["quantity"] ?? { x: 0, y: 0 },
    data: { value: quantity, onChange: onQuantityChange },
  });

  const labelMap: Record<string, string> = { quantity: "Quantity" };
  for (const p of doc.parameterDefs) labelMap[p.id] = p.label;
  for (const t of doc.tableDefs) labelMap[`${t.id}RatePerHr`] = t.label;
  for (const s of doc.formulaSteps) labelMap[s.id] = s.label ?? s.id;

  for (const step of doc.formulaSteps) {
    const debug = debugMap[step.id];
    nodes.push(makeNode(step.id, "formula", {
      id: step.id,
      label: step.label,
      formula: step.formula,
      labelMap,
      value: debug?.value ?? 0,
      hasError: !!debug?.error,
    }));
  }

  for (const bd of doc.breakdownDefs) {
    const value = (bd.items ?? []).reduce((s, item) => s + (debugMap[item.stepId]?.value ?? 0), 0);
    nodes.push(makeNode(bd.id, "breakdown", { label: bd.label, value }));
  }

  const unitPrice = doc.breakdownDefs.reduce(
    (sum, bd) => sum + (bd.items ?? []).reduce((s, item) => s + (debugMap[item.stepId]?.value ?? 0), 0),
    0
  );
  nodes.push({
    id: "unitPrice",
    type: "priceOutput",
    position: positions["unitPrice"] ?? { x: 0, y: 0 },
    data: { value: unitPrice },
  });

  return nodes;
}

// ─── Context menu ─────────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  nodeIds: string[]; // empty = pane (background) click
  flowPos: { x: number; y: number }; // flow-coordinate of the click (for node creation)
}

const MENU_ITEM: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 12,
  cursor: "pointer",
  color: "#cbd5e1",
  whiteSpace: "nowrap",
};
const MENU_ITEM_DANGER: React.CSSProperties = { ...MENU_ITEM, color: "#f87171" };
const MENU_DIVIDER: React.CSSProperties = {
  borderTop: "1px solid #334155",
  margin: "3px 0",
};

interface ContextMenuProps {
  menu: ContextMenuState;
  clipboard: ClipboardPayload | null;
  onCopy: (ids: string[]) => void;
  onPaste: (position: { x: number; y: number }) => void;
  onDelete: (ids: string[]) => void;
  onCreate: (type: "formula" | "param" | "table" | "breakdown" | "group", pos: { x: number; y: number }) => void;
  onDismiss: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  menu, clipboard, onCopy, onPaste, onDelete, onCreate, onDismiss,
}) => {
  const actionableIds = menu.nodeIds.filter((id) => !SINGLETONS.has(id));
  const isNodeMenu = menu.nodeIds.length > 0;
  const label = actionableIds.length > 1 ? ` (${actionableIds.length})` : "";

  return (
    <>
      {/* Invisible overlay to close menu on outside click */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 999 }}
        onMouseDown={onDismiss}
      />
      <div
        style={{
          position: "fixed",
          top: menu.y,
          left: menu.x,
          zIndex: 1000,
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 8,
          padding: "4px 0",
          minWidth: 170,
          boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
          userSelect: "none",
        }}
      >
        {isNodeMenu ? (
          <>
            {actionableIds.length > 0 && (
              <div
                style={MENU_ITEM}
                onMouseDown={(e) => { e.stopPropagation(); onCopy(actionableIds); onDismiss(); }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Copy{label}
              </div>
            )}
            {clipboard && (
              <div
                style={MENU_ITEM}
                onMouseDown={(e) => { e.stopPropagation(); onPaste(menu.flowPos); onDismiss(); }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Paste
              </div>
            )}
            {actionableIds.length > 0 && (
              <>
                <div style={MENU_DIVIDER} />
                <div
                  style={MENU_ITEM_DANGER}
                  onMouseDown={(e) => { e.stopPropagation(); onDelete(actionableIds); onDismiss(); }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#3f1515")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  Delete{label}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {(["formula", "param", "table", "breakdown", "group"] as const).map((type) => (
              <div
                key={type}
                style={MENU_ITEM}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onCreate(type, menu.flowPos);
                  onDismiss();
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Add {type === "formula" ? "Formula Step" : type === "param" ? "Parameter" : type === "table" ? "Rate Table" : type === "breakdown" ? "Summary" : "Group"}
              </div>
            ))}
            {clipboard && (
              <>
                <div style={MENU_DIVIDER} />
                <div
                  style={MENU_ITEM}
                  onMouseDown={(e) => { e.stopPropagation(); onPaste(menu.flowPos); onDismiss(); }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  Paste ({
                    clipboard.formulaSteps.length +
                    clipboard.parameterDefs.length +
                    clipboard.tableDefs.length +
                    clipboard.breakdownDefs.length
                  } nodes)
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  doc: CanvasDocument;
  /** Pre-computed edges from the parent — avoids redundant parseEdges calls. */
  edges: Edge[];
  stepDebug: StepDebugInfo[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  quantity: number;
  onQuantityChange: (v: number) => void;
  onUpdateDoc: (doc: CanvasDocument) => void;
  clipboard: ClipboardPayload | null;
  onCopy: (nodeIds: string[]) => void;
  onPaste: (position: { x: number; y: number }) => void;
  onDeleteNodes: (nodeIds: string[]) => void;
  onCreateNode: (type: "formula" | "param" | "table" | "breakdown" | "group", position: { x: number; y: number }) => void;
  positionResetKey: number;
}

const CanvasFlow: React.FC<Props> = ({
  doc, edges: rawEdges, stepDebug, selectedNodeId, onSelectNode, quantity, onQuantityChange,
  onUpdateDoc, clipboard, onCopy, onPaste, onDeleteNodes, onCreateNode, positionResetKey,
}) => {
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef(doc);
  useEffect(() => { docRef.current = doc; }, [doc]);
  const prevDocId = useRef(doc.id);
  const prevResetKey = useRef(positionResetKey);
  // Capture selection state before React Flow's internal mousedown handler runs,
  // so we can restore it when the user Ctrl+clicks to multi-select.
  const nodesRef = useRef([] as typeof nodes);
  const preClickSelectionRef = useRef<Set<string>>(new Set());
  const lastFlowPosRef = useRef<{ x: number; y: number }>({ x: 200, y: 200 });

  const handleGroupResizeEnd = useCallback(
    (groupId: string, w: number, h: number) => {
      const existing = docRef.current.nodePositions[groupId] ?? { x: 0, y: 0 };
      onUpdateDoc({
        ...docRef.current,
        nodePositions: { ...docRef.current.nodePositions, [groupId]: { ...existing, w, h } },
      });
    },
    [onUpdateDoc]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(
    buildNodes(doc, stepDebug, doc.nodePositions, quantity, onQuantityChange, handleGroupResizeEnd)
  );
  nodesRef.current = nodes; // always current, used by the native mousedown capture

  // Derive selected node IDs directly from the nodes state — React Flow sets
  // node.selected=true via onNodesChange when the user multi-selects.
  const rfSelectedIds = useMemo(() => nodes.filter((n) => n.selected).map((n) => n.id), [nodes]);

  // Native mousedown in capture phase fires before React Flow's synthetic handlers.
  // When Ctrl is held we snapshot the selection so handleNodeClick can restore it.
  useEffect(() => {
    const capture = (e: MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        preClickSelectionRef.current = new Set(
          nodesRef.current.filter((n) => n.selected).map((n) => n.id)
        );
      }
    };
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousedown", capture, true);
    return () => el.removeEventListener("mousedown", capture, true);
  }, []);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    const docSwitched = doc.id !== prevDocId.current;
    const positionReset = positionResetKey !== prevResetKey.current;
    prevDocId.current = doc.id;
    prevResetKey.current = positionResetKey;

    if (docSwitched || positionReset) {
      // Doc switch or undo/redo: restore positions from the document
      setNodes(buildNodes(doc, stepDebug, doc.nodePositions, quantity, onQuantityChange, handleGroupResizeEnd));
    } else {
      // Content change (formula edit, etc.): preserve current drag positions.
      // Merge doc.nodePositions as base so newly-created nodes (not yet in prev)
      // land at their intended position rather than falling back to {x:0, y:0}.
      setNodes((prev) => {
        const positions = {
          ...doc.nodePositions,
          ...Object.fromEntries(prev.map((n) => [n.id, n.position])),
        };
        return buildNodes(doc, stepDebug, positions, quantity, onQuantityChange, handleGroupResizeEnd);
      });
    }
  // Intentional omissions from deps: `doc` (we only want to re-run on doc.id
  // change, not on every content edit — content edits use the `prev` branch),
  // `onQuantityChange` (stable callback ref, and including it would cause
  // spurious rebuilds that reset selection).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, stepDebug, quantity, positionResetKey]);

  const edges: Edge[] = useMemo(() => {
    const all = rawEdges;
    if (!selectedNodeId) return all;

    const forward = new Map<string, string[]>();
    for (const e of all) {
      if (!forward.has(e.source)) forward.set(e.source, []);
      forward.get(e.source)!.push(e.target);
    }
    const reachable = new Set<string>([selectedNodeId]);
    const queue = [selectedNodeId];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const next of forward.get(cur) ?? []) {
        if (!reachable.has(next)) { reachable.add(next); queue.push(next); }
      }
    }

    return all.map((e) => {
      if (reachable.has(e.source))
        return { ...e, animated: true, style: { stroke: "#f59e0b", strokeWidth: 2 } };
      if (e.target === selectedNodeId)
        return { ...e, style: { stroke: "#a78bfa", strokeWidth: 1.5, opacity: 0.5 } };
      return { ...e, style: { opacity: 0.2 } };
    });
  }, [rawEdges, selectedNodeId]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleNodeClick: NodeMouseHandler = useCallback(
    (e, node) => {
      if (e.ctrlKey || e.metaKey) {
        // Restore the pre-click selection (React Flow may have cleared it), then toggle the clicked node
        const prevSelected = new Set(preClickSelectionRef.current);
        if (prevSelected.has(node.id)) {
          prevSelected.delete(node.id);
        } else {
          prevSelected.add(node.id);
        }
        setNodes((nds) => nds.map((n) => ({ ...n, selected: prevSelected.has(n.id) })));
      } else {
        // Explicitly own the selection state so rfSelectedIds is always accurate.
        // React Flow fires onNodesChange for selections asynchronously, which can
        // leave rfSelectedIds stale at the point keyboard shortcuts check it.
        setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === node.id })));
        onSelectNode(node.id);
      }
    },
    [onSelectNode, setNodes]
  );

  const handleNodeDragStop: NodeDragStopHandler = useCallback(
    (_, node) => {
      const allPositions: Record<string, { x: number; y: number; w?: number; h?: number }> = {};
      nodes.forEach((n) => {
        const existing = doc.nodePositions[n.id];
        const xy = n.id === node.id ? node.position : n.position;
        allPositions[n.id] = { ...existing, ...xy };
      });
      onUpdateDoc({ ...doc, nodePositions: allPositions });
    },
    [doc, nodes, onUpdateDoc]
  );

  const handlePaneClick = useCallback(() => {
    onSelectNode(null);
    setContextMenu(null);
  }, [onSelectNode]);


  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && reactFlowInstance.current) {
      lastFlowPosRef.current = reactFlowInstance.current.project({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  // Native context menu handler on the outer div — bypasses React Flow's event
  // interception which swallows right-clicks on selected nodes.
  const handleContainerContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      const flowPos = reactFlowInstance.current?.project({
        x: e.clientX - (rect?.left ?? 0),
        y: e.clientY - (rect?.top ?? 0),
      }) ?? { x: 200, y: 200 };

      // Walk up from the click target to find either:
      // 1. A React Flow node wrapper (data-testid="rf__node-{id}")
      // 2. The selection bounding rect React Flow renders over selected nodes
      let el: HTMLElement | null = e.target as HTMLElement;
      let nodeId: string | null = null;
      let hitSelectionRect = false;

      while (el && el !== e.currentTarget) {
        const testId = el.dataset.testid;
        if (testId && testId.startsWith("rf__node-")) {
          nodeId = testId.slice("rf__node-".length);
          break;
        }
        if (el.classList.contains("react-flow__nodesselection-rect")) {
          hitSelectionRect = true;
          break;
        }
        el = el.parentElement;
      }

      // Right-click on the selection bounding box → menu for all selected nodes
      if (hitSelectionRect && rfSelectedIds.length > 0) {
        setContextMenu({ x: e.clientX, y: e.clientY, nodeIds: rfSelectedIds, flowPos });
        return;
      }

      if (nodeId) {
        const nodeIds =
          rfSelectedIds.includes(nodeId) && rfSelectedIds.length > 1
            ? rfSelectedIds
            : [nodeId];
        setContextMenu({ x: e.clientX, y: e.clientY, nodeIds, flowPos });
      } else {
        setContextMenu({ x: e.clientX, y: e.clientY, nodeIds: [], flowPos });
      }
    },
    [rfSelectedIds]
  );

  const handleAutoLayout = useCallback(() => {
    const nonGroupNodes = nodes.filter((n) => n.type !== "group");
    const laidOut = dagreLayout(nonGroupNodes, rawEdges);
    const laidOutMap = Object.fromEntries(laidOut.map((n) => [n.id, n.position]));
    setNodes((prev) =>
      prev.map((n) => (laidOutMap[n.id] ? { ...n, position: laidOutMap[n.id] } : n))
    );
    const newPositions = { ...doc.nodePositions };
    for (const n of laidOut) {
      newPositions[n.id] = { ...(newPositions[n.id] ?? {}), ...laidOutMap[n.id] };
    }
    onUpdateDoc({ ...doc, nodePositions: newPositions });
    requestAnimationFrame(() => reactFlowInstance.current?.fitView({ duration: 400 }));
  }, [nodes, rawEdges, doc, setNodes, onUpdateDoc]);

  // Keyboard shortcuts (Delete, Ctrl+C, Ctrl+V) — skip when editing text
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const editingText = tag === "INPUT" || tag === "TEXTAREA";

      if ((e.key === "Delete" || e.key === "Backspace") && !editingText) {
        if (rfSelectedIds.length > 0)
          onDeleteNodes(rfSelectedIds.filter((id) => !SINGLETONS.has(id)));
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "c" && !editingText) {
        const copyable = rfSelectedIds.filter((id) => !SINGLETONS.has(id));
        if (copyable.length > 0) { e.preventDefault(); onCopy(copyable); }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "v" && !editingText) {
        if (!clipboard) return;
        e.preventDefault();
        onPaste(lastFlowPosRef.current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rfSelectedIds, onDeleteNodes, onCopy, onPaste, clipboard]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }} onMouseMove={handleMouseMove} onContextMenu={handleContainerContextMenu}>
      <button
        onClick={handleAutoLayout}
        style={{
          position: "absolute", top: 10, left: 10, zIndex: 10,
          background: "#1e293b", border: "1px solid #334155", borderRadius: 6,
          color: "#94a3b8", cursor: "pointer", fontSize: 11, padding: "4px 10px",
        }}
      >
        Auto-layout
      </button>
      <div style={{
        position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
        zIndex: 10, color: "#475569", fontSize: 10, pointerEvents: "none",
        display: "flex", gap: 12,
      }}>
        <span>Drag → pan</span>
        <span>Shift+drag → box select</span>
        <span>Ctrl+click → multi-select</span>
        <span>Right-click → actions</span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        onInit={(instance) => { reactFlowInstance.current = instance; }}
        // Shift+drag on canvas = box select (default); Ctrl+click = multi-select
        multiSelectionKeyCode="Control"
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
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

      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          clipboard={clipboard}
          onCopy={onCopy}
          onPaste={onPaste}
          onDelete={onDeleteNodes}
          onCreate={onCreateNode}
          onDismiss={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default CanvasFlow;
