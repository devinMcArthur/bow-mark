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
import {
  ClipboardPayload, SINGLETONS,
  copyNodes, pasteNodes, deleteNodes, createNode, createGroup, createController,
  assignNodeToGroup, removeNodeFromGroup,
  applyPositionMapToDoc, buildPositionMapFromDoc,
} from "./canvasOps";
import { parseEdges } from "./edgeParser";
import { dagreLayout } from "./layoutEngine";
import { nodeTypes } from "./nodeTypes";

// ─── Node builder ─────────────────────────────────────────────────────────────

function buildNodes(
  doc: CanvasDocument,
  stepDebug: StepDebugInfo[],
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
  const makeNode = (
    id: string,
    type: string,
    data: Record<string, unknown>,
    position: { x: number; y: number },
    style?: React.CSSProperties,
    extra?: Record<string, unknown>
  ): Node => {
    const parentId = memberOf[id];
    return {
      id,
      type,
      position: { x: position.x, y: position.y },
      ...(parentId !== undefined ? { parentId } : {}),
      ...(style ? { style } : {}),
      ...(extra ?? {}),
      data,
    };
  };

  // Controller nodes
  for (const c of (doc.controllerDefs ?? [])) {
    nodes.push(makeNode(c.id, "controller", {
      id: c.id,
      label: c.label,
      controllerType: c.type,
      defaultValue: c.defaultValue,
      defaultSelected: c.defaultSelected,
      options: c.options,
    }, c.position));
  }

  // Group container nodes (rendered behind other nodes)
  for (const g of doc.groupDefs) {
    const w = g.position.w ?? 400;
    const h = g.position.h ?? 300;
    nodes.push(makeNode(
      g.id, "group",
      { label: g.label, onResizeEnd: (newW: number, newH: number) => onGroupResizeEnd(g.id, newW, newH) },
      g.position,
      { width: w, height: h },
      { zIndex: -1, draggable: false } // only draggable once selected
    ));
  }

  for (const p of doc.parameterDefs) {
    nodes.push(makeNode(p.id, "param", {
      id: p.id,
      label: p.label,
      suffix: p.suffix,
      value: p.defaultValue,
    }, p.position));
  }

  for (const t of doc.tableDefs) {
    const nodeId = `${t.id}RatePerHr`;
    const rows = t.defaultRows ?? [];
    const ratePerHr = rows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);
    nodes.push(makeNode(nodeId, "table", { id: nodeId, label: t.label, value: ratePerHr }, t.position));
  }

  // Singletons — never grouped
  nodes.push({
    id: "quantity",
    type: "quantity",
    position: { x: doc.specialPositions.quantity.x, y: doc.specialPositions.quantity.y },
    data: { value: quantity, onChange: onQuantityChange, unitVariants: doc.unitVariants ?? [] },
  });

  const labelMap: Record<string, string> = { quantity: "Quantity" };
  for (const p of doc.parameterDefs) labelMap[p.id] = p.label;
  for (const t of doc.tableDefs) labelMap[`${t.id}RatePerHr`] = t.label;
  for (const s of doc.formulaSteps) labelMap[s.id] = s.label ?? s.id;
  for (const c of (doc.controllerDefs ?? [])) labelMap[c.id] = c.label;

  for (const step of doc.formulaSteps) {
    const debug = debugMap[step.id];
    nodes.push(makeNode(step.id, "formula", {
      id: step.id,
      label: step.label,
      formula: step.formula,
      labelMap,
      value: debug?.value ?? 0,
      hasError: !!debug?.error,
    }, step.position));
  }

  for (const bd of doc.breakdownDefs) {
    const value = (bd.items ?? []).reduce((s, item) => s + (debugMap[item.stepId]?.value ?? 0), 0);
    nodes.push(makeNode(bd.id, "breakdown", { label: bd.label, value }, bd.position));
  }

  const unitPrice = doc.breakdownDefs.reduce(
    (sum, bd) => sum + (bd.items ?? []).reduce((s, item) => s + (debugMap[item.stepId]?.value ?? 0), 0),
    0
  );
  nodes.push({
    id: "unitPrice",
    type: "priceOutput",
    position: { x: doc.specialPositions.unitPrice.x, y: doc.specialPositions.unitPrice.y },
    data: { value: unitPrice },
  });

  return nodes;
}

// Returns true if `potentialDescendant` is anywhere in the subtree rooted at `ancestorId`.
// Used to prevent circular nesting when dragging a group into another group.
function isDescendantOf(
  ancestorId: string,
  potentialDescendant: string,
  groupDefs: CanvasDocument["groupDefs"]
): boolean {
  const visited = new Set<string>();
  const queue = [ancestorId];
  while (queue.length) {
    const cur = queue.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const group = groupDefs.find((g) => g.id === cur);
    if (!group) continue;
    for (const mid of group.memberIds) {
      if (mid === potentialDescendant) return true;
      if (groupDefs.some((g) => g.id === mid)) queue.push(mid);
    }
  }
  return false;
}

// ─── Context menu ─────────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  nodeIds: string[]; // empty = pane (background) click
  flowPos: { x: number; y: number }; // flow-coordinate of the click (for node creation)
  hasGroup?: boolean; // true when right-clicking on a group node
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
  onCreate: (type: "formula" | "param" | "table" | "breakdown" | "group" | "controller:percentage" | "controller:toggle" | "controller:selector", pos: { x: number; y: number }) => void;
  onDismiss: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  menu, clipboard, onCopy, onPaste, onDelete, onCreate, onDismiss,
}) => {
  const actionableIds = menu.nodeIds.filter((id) => !SINGLETONS.has(id));
  const isNodeMenu = menu.nodeIds.length > 0;
  const label = actionableIds.length > 1 ? ` (${actionableIds.length})` : "";
  const [showControllerSub, setShowControllerSub] = React.useState(false);

  const addItems = (
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
          Add {
            type === "formula" ? "Formula Step" :
            type === "param" ? "Parameter" :
            type === "table" ? "Rate Table" :
            type === "breakdown" ? "Summary" :
            "Group"
          }
        </div>
      ))}
      {/* Controller sub-menu */}
      <div
        style={{ ...MENU_ITEM, display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}
        onMouseEnter={(e) => { (e.currentTarget.style.background = "#334155"); setShowControllerSub(true); }}
        onMouseLeave={(e) => { (e.currentTarget.style.background = "transparent"); setShowControllerSub(false); }}
      >
        <span>Add Controller</span>
        <span style={{ fontSize: 10, color: "#64748b", marginLeft: 8 }}>▶</span>
        {showControllerSub && (
          <div style={{
            position: "absolute",
            top: 0,
            left: "100%",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "4px 0",
            minWidth: 130,
            boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
            zIndex: 1001,
          }}>
            {(["percentage", "toggle", "selector"] as const).map((ctrlType) => (
              <div
                key={ctrlType}
                style={MENU_ITEM}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onCreate(`controller:${ctrlType}`, menu.flowPos);
                  onDismiss();
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {ctrlType === "percentage" ? "Percentage" : ctrlType === "toggle" ? "Toggle" : "Selector"}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

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
            {menu.hasGroup && (
              <>
                <div style={MENU_DIVIDER} />
                {addItems}
              </>
            )}
          </>
        ) : (
          <>
            {addItems}
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
  onCreateNode: (type: "formula" | "param" | "table" | "breakdown" | "group" | "controller:percentage" | "controller:toggle" | "controller:selector", position: { x: number; y: number }) => void;
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
      onUpdateDoc({
        ...docRef.current,
        groupDefs: docRef.current.groupDefs.map((g) =>
          g.id === groupId ? { ...g, position: { ...g.position, w, h } } : g
        ),
      });
    },
    [onUpdateDoc]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(
    buildNodes(doc, stepDebug, quantity, onQuantityChange, handleGroupResizeEnd)
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
      setNodes(buildNodes(doc, stepDebug, quantity, onQuantityChange, handleGroupResizeEnd));
    } else {
      // Content change (formula edit, etc.): preserve current drag positions.
      // Merge live React Flow positions for nodes whose group membership is unchanged,
      // so nodes don't snap back during formula edits.
      setNodes((prev) => {
        const newMemberOf: Record<string, string | undefined> = {};
        for (const g of doc.groupDefs) {
          for (const mid of g.memberIds) newMemberOf[mid] = g.id;
        }
        const livePositions: Record<string, { x: number; y: number }> = {};
        for (const n of prev) {
          if (newMemberOf[n.id] === n.parentId) {
            livePositions[n.id] = { x: n.position.x, y: n.position.y };
          }
        }
        const mergedDoc = applyPositionMapToDoc(doc, livePositions);
        return buildNodes(mergedDoc, stepDebug, quantity, onQuantityChange, handleGroupResizeEnd);
      });
    }
  // Intentional omissions from deps: `doc` (we only want to re-run on doc.id
  // change, not on every content edit — content edits use the `prev` branch),
  // `onQuantityChange` (stable callback ref, and including it would cause
  // spurious rebuilds that reset selection).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, stepDebug, quantity, positionResetKey]);

  // Groups are only draggable when selected — lets users pan over large groups without
  // accidentally moving them. Click to select, then drag.
  useEffect(() => {
    setNodes((prev) => prev.map((n) => {
      if (n.type !== "group") return n;
      const draggable = n.id === selectedNodeId;
      return n.draggable === draggable ? n : { ...n, draggable };
    }));
  }, [selectedNodeId]);

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
    (_, draggedNode) => {
      // node.position is in the correct coordinate space already:
      //   - absolute for ungrouped nodes and group containers
      //   - relative to parent for grouped nodes (React Flow gives relative for parentId children)
      // Apply the new drag position to the appropriate def.
      let updatedDoc = applyPositionMapToDoc(docRef.current, {
        [draggedNode.id]: { x: draggedNode.position.x, y: draggedNode.position.y },
      });

      // Detect whether group membership changed
      if (draggedNode.type === "group") {
        // Group nodes: only nest if the dragged group is FULLY contained within another group.
        const allNodes = reactFlowInstance.current?.getNodes() ?? [];
        const otherGroups = allNodes.filter((n) => n.type === "group" && n.id !== draggedNode.id);

        const dragAbs = draggedNode.positionAbsolute ?? draggedNode.position;
        const dragRight = dragAbs.x + (draggedNode.width ?? 400);
        const dragBottom = dragAbs.y + (draggedNode.height ?? 300);

        const containingGroups = otherGroups.filter((g) => {
          const gAbs = g.positionAbsolute ?? g.position;
          const gRight = gAbs.x + (g.width ?? 400);
          const gBottom = gAbs.y + (g.height ?? 300);
          return (
            gAbs.x <= dragAbs.x &&
            gAbs.y <= dragAbs.y &&
            gRight >= dragRight &&
            gBottom >= dragBottom
          );
        });

        const targetGroup =
          containingGroups.length > 0
            ? containingGroups.reduce((best, g) =>
                (g.width ?? 400) * (g.height ?? 300) < (best.width ?? 400) * (best.height ?? 300)
                  ? g
                  : best
              )
            : null;

        const currentGroupId =
          docRef.current.groupDefs.find((g) => g.memberIds.includes(draggedNode.id))?.id ?? null;
        const targetGroupId = targetGroup?.id ?? null;

        if (targetGroupId !== currentGroupId) {
          // Guard: don't create a cycle (targetGroup is already inside draggedNode)
          if (targetGroupId && isDescendantOf(draggedNode.id, targetGroupId, docRef.current.groupDefs)) {
            onUpdateDoc(updatedDoc);
            return;
          }
          if (targetGroupId) {
            updatedDoc = assignNodeToGroup(draggedNode.id, targetGroupId, updatedDoc);
          } else {
            updatedDoc = removeNodeFromGroup(draggedNode.id, updatedDoc);
          }
        }
      } else {
        // Non-group nodes: partial intersection with a group is enough to assign
        const intersecting = reactFlowInstance.current?.getIntersectingNodes(draggedNode) ?? [];
        const intersectingGroups = intersecting.filter((n) => n.type === "group");

        const targetGroup =
          intersectingGroups.length > 0
            ? intersectingGroups.reduce((best, g) =>
                (g.width ?? 400) * (g.height ?? 300) < (best.width ?? 400) * (best.height ?? 300)
                  ? g
                  : best
              )
            : null;

        const currentGroupId =
          docRef.current.groupDefs.find((g) => g.memberIds.includes(draggedNode.id))?.id ?? null;
        const targetGroupId = targetGroup?.id ?? null;

        if (targetGroupId !== currentGroupId) {
          if (targetGroupId) {
            updatedDoc = assignNodeToGroup(draggedNode.id, targetGroupId, updatedDoc);
          } else {
            updatedDoc = removeNodeFromGroup(draggedNode.id, updatedDoc);
          }
        }
      }

      onUpdateDoc(updatedDoc);
    },
    [onUpdateDoc]
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
        const hasGroup = nodeIds.some((id) => docRef.current.groupDefs.some((g) => g.id === id));
        setContextMenu({ x: e.clientX, y: e.clientY, nodeIds, flowPos, hasGroup });
      } else {
        setContextMenu({ x: e.clientX, y: e.clientY, nodeIds: [], flowPos });
      }
    },
    [rfSelectedIds]
  );

  const handleAutoLayout = useCallback(() => {
    const GROUP_PAD = 40; // padding inside group containers (also reserves space for the label)
    // Fallback sizes before React Flow measures nodes (mirrors layoutEngine.ts)
    const TYPE_SIZE: Record<string, { w: number; h: number }> = {
      param: { w: 170, h: 80 }, table: { w: 170, h: 80 }, quantity: { w: 170, h: 90 },
      formula: { w: 240, h: 130 }, breakdown: { w: 170, h: 70 }, priceOutput: { w: 170, h: 70 },
    };
    const sz = (n: Node) => {
      const fb = TYPE_SIZE[n.type ?? ""] ?? { w: 200, h: 80 };
      return { w: n.width ?? fb.w, h: n.height ?? fb.h };
    };

    const groupedIds = new Set(doc.groupDefs.flatMap((g) => g.memberIds));
    const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const groupSizes: Record<string, { w: number; h: number }> = {};
    const newPositions = buildPositionMapFromDoc(doc);

    // Sort groups deepest-first so child groups are sized before their parents use them
    const getDepth = (id: string, depth = 0): number => {
      const parent = doc.groupDefs.find((g) => g.memberIds.includes(id));
      return parent ? getDepth(parent.id, depth + 1) : depth;
    };
    const sortedGroups = [...doc.groupDefs].sort((a, b) => getDepth(b.id) - getDepth(a.id));

    // Returns the direct member ID of `group` that contains `nodeId`, or null.
    // If nodeId is itself a direct member, returns nodeId.
    // If nodeId is inside a sub-group that is a direct member, returns that sub-group's ID.
    const getDirectMember = (nodeId: string, groupMemberIds: string[]): string | null => {
      if (groupMemberIds.includes(nodeId)) return nodeId;
      for (const mid of groupMemberIds) {
        const subGroup = doc.groupDefs.find((g) => g.id === mid);
        if (subGroup && getDirectMember(nodeId, subGroup.memberIds) !== null) return mid;
      }
      return null;
    };

    for (const group of sortedGroups) {
      const memberNodes = group.memberIds
        .map((mid) => {
          const n = nodeMap[mid];
          if (!n) return null;
          // Use computed layout size for sub-group members
          return n.type === "group" && groupSizes[n.id]
            ? { ...n, width: groupSizes[n.id].w, height: groupSizes[n.id].h }
            : n;
        })
        .filter((n): n is Node => n !== null);

      if (memberNodes.length === 0) continue;

      // Derive virtual intra-group edges: map each real edge's endpoints to their
      // direct member within this group (could be the node itself or a sub-group).
      // This ensures sub-group members are ordered correctly relative to sibling nodes.
      const intraEdgeSet = new Set<string>();
      const memberEdges: Edge[] = [];
      for (const edge of rawEdges) {
        const src = getDirectMember(edge.source, group.memberIds);
        const tgt = getDirectMember(edge.target, group.memberIds);
        if (!src || !tgt || src === tgt) continue;
        const key = `${src}→${tgt}`;
        if (!intraEdgeSet.has(key)) {
          intraEdgeSet.add(key);
          memberEdges.push({ ...edge, id: key, source: src, target: tgt });
        }
      }

      const laidOut = dagreLayout(memberNodes, memberEdges);
      const minX = Math.min(...laidOut.map((n) => n.position.x));
      const minY = Math.min(...laidOut.map((n) => n.position.y));

      let maxRight = 0;
      let maxBottom = 0;
      for (const n of laidOut) {
        const { w, h } = sz(n);
        const right = n.position.x - minX + GROUP_PAD + w;
        const bottom = n.position.y - minY + GROUP_PAD + h;
        if (right > maxRight) maxRight = right;
        if (bottom > maxBottom) maxBottom = bottom;
        newPositions[n.id] = {
          ...newPositions[n.id],
          x: n.position.x - minX + GROUP_PAD,
          y: n.position.y - minY + GROUP_PAD,
        };
      }

      const groupW = maxRight + GROUP_PAD;
      const groupH = maxBottom + GROUP_PAD;
      groupSizes[group.id] = { w: groupW, h: groupH };
      newPositions[group.id] = { ...(newPositions[group.id] ?? { x: 0, y: 0 }), w: groupW, h: groupH };
    }

    // Build a map from any node ID → its top-level entity (top-level group ID or the node
    // itself if ungrouped). Used to derive virtual edges between top-level entities.
    const getTopLevelEntity = (nodeId: string): string => {
      let current = nodeId;
      for (;;) {
        const parentGroup = doc.groupDefs.find((g) => g.memberIds.includes(current));
        if (!parentGroup) return current;
        current = parentGroup.id;
      }
    };

    // Derive virtual edges: replace each real edge with a top-level-entity → top-level-entity
    // edge. This tells dagre how groups (and ungrouped nodes) depend on each other.
    const virtualEdgeSet = new Set<string>();
    const virtualEdges: Edge[] = [];
    for (const edge of rawEdges) {
      const src = getTopLevelEntity(edge.source);
      const tgt = getTopLevelEntity(edge.target);
      if (src === tgt) continue; // same entity (intra-group edge) — skip
      const key = `${src}→${tgt}`;
      if (!virtualEdgeSet.has(key)) {
        virtualEdgeSet.add(key);
        virtualEdges.push({ ...edge, id: key, source: src, target: tgt });
      }
    }

    // Top-level layout: ungrouped nodes + group containers (with freshly computed sizes),
    // positioned using virtual edges so inter-group dependencies drive the left-to-right flow.
    const topLevelNodes = nodes
      .filter((n) => !groupedIds.has(n.id))
      .map((n) =>
        n.type === "group" && groupSizes[n.id]
          ? { ...n, width: groupSizes[n.id].w, height: groupSizes[n.id].h }
          : n
      );

    const topLaidOut = dagreLayout(topLevelNodes, virtualEdges);
    const topLaidOutMap = Object.fromEntries(topLaidOut.map((n) => [n.id, n.position]));
    for (const n of topLaidOut) {
      newPositions[n.id] = { ...(newPositions[n.id] ?? {}), x: n.position.x, y: n.position.y };
    }

    setNodes((prev) =>
      prev.map((n) => {
        if (topLaidOutMap[n.id]) {
          return {
            ...n,
            position: topLaidOutMap[n.id],
            ...(n.type === "group" && groupSizes[n.id]
              ? { style: { ...n.style, width: groupSizes[n.id].w, height: groupSizes[n.id].h } }
              : {}),
          };
        }
        // Update relative positions for group members
        if (groupedIds.has(n.id) && newPositions[n.id]) {
          return { ...n, position: { x: newPositions[n.id].x, y: newPositions[n.id].y } };
        }
        return n;
      })
    );

    onUpdateDoc(applyPositionMapToDoc(doc, newPositions));
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
