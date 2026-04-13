// client/src/components/pages/developer/CalculatorCanvas/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Flex, Tooltip } from "@chakra-ui/react";
import { Edge } from "reactflow";
import {
  debugEvaluateTemplate,
} from "../../../../components/TenderPricing/calculators/evaluate";
import { parseEdges } from "./edgeParser";
import { CanvasDocument, computeInactiveNodeIds } from "./canvasStorage";
import { ClipboardPayload, copyNodes, pasteNodes, deleteNodes, createNode, createGroup, createController } from "./canvasOps";
import CanvasFlow from "./CanvasFlow";
import InspectPanel from "./InspectPanel";
import LiveTestPanel from "./LiveTestPanel";
import { RateEntry, CalculatorTemplate } from "../../../../components/TenderPricing/calculators/types";

interface Props {
  doc: CanvasDocument;
  onSave: (doc: CanvasDocument) => void;
  /** Height of the canvas area (excluding the 28px internal undo toolbar). Defaults to 700px. */
  canvasHeight?: string | number;
  /** Seed values from a rate buildup snapshot (tender row context). */
  initialInputs?: {
    params?: Record<string, number>;
    tables?: Record<string, RateEntry[]>;
    controllers?: Record<string, number | boolean | string[]>;
  };
  /** Fires when any param, table, or controller changes in LiveTestPanel. */
  onInputsChange?: (
    params: Record<string, number>,
    tables: Record<string, RateEntry[]>,
    controllers: Record<string, number | boolean | string[]>
  ) => void;
  /** Per-param estimator notes from snapshot. */
  paramNotes?: Record<string, string>;
  /** Fires when a param note changes. */
  onParamNoteChange?: (paramId: string, note: string) => void;
  /** Estimator's per-Output-node selections (tender row context). */
  outputs?: Record<string, { materialId?: string; crewKindId?: string }>;
  /** Fires when the estimator picks a material or crew kind for an Output node. */
  onOutputChange?: (
    outputId: string,
    selection: { materialId?: string; crewKindId?: string }
  ) => void;
  /** Initial quantity for the LiveTest panel. Defaults to 100. */
  initialQuantity?: number;
  /**
   * When provided, replaces the default internal undo/redo strip.
   * Receives undo/redo handlers and state so the parent can render its own toolbar.
   */
  renderToolbar?: (props: {
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
  }) => React.ReactNode;
  /** Canonical unit code from the line item (e.g. "m3"). Threaded to LiveTestPanel → RateBuildupInputs. */
  unit?: string;
}

const CalculatorCanvas: React.FC<Props> = ({
  doc,
  onSave,
  canvasHeight = "700px",
  initialInputs,
  onInputsChange,
  paramNotes,
  onParamNoteChange,
  outputs,
  onOutputChange,
  initialQuantity,
  renderToolbar,
  unit,
}) => {
  // Internal undo/redo — stacks reset when doc.id changes
  const [undoStack, setUndoStack] = useState<CanvasDocument[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasDocument[]>([]);
  const prevDocId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevDocId.current !== doc.id) {
      setUndoStack([]);
      setRedoStack([]);
      setSelectedNodeId(null);
      setTestUnit(doc.unitVariants?.[0]?.unit);
      prevDocId.current = doc.id;
    }
  }, [doc.id]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(initialQuantity ?? 100);
  const [clipboard, setClipboard] = useState<ClipboardPayload | null>(null);
  const [positionResetKey, setPositionResetKey] = useState(0);
  const [inspectWidth, setInspectWidth] = useState(260);
  const dragStartX = useRef<number | null>(null);
  const dragStartWidth = useRef(260);
  const [liveTestOpen, setLiveTestOpen] = useState(true);
  const [liveTestWidth, setLiveTestWidth] = useState(280);
  const [testUnit, setTestUnit] = useState<string | undefined>(() => doc.unitVariants?.[0]?.unit);
  const liveTestDragStartWidth = useRef(280);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    dragStartWidth.current = inspectWidth;
    const onMove = (ev: MouseEvent) => {
      if (dragStartX.current === null) return;
      const delta = dragStartX.current - ev.clientX;
      setInspectWidth(Math.max(200, Math.min(600, dragStartWidth.current + delta)));
    };
    const onUp = () => {
      dragStartX.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [inspectWidth]);

  const onLiveTestResizeStart = useCallback((e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    liveTestDragStartWidth.current = liveTestWidth;
    const onMove = (ev: MouseEvent) => {
      if (dragStartX.current === null) return;
      const delta = ev.clientX - dragStartX.current;
      setLiveTestWidth(Math.max(200, Math.min(600, liveTestDragStartWidth.current + delta)));
    };
    const onUp = () => {
      dragStartX.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [liveTestWidth]);

  // ─── Save / undo / redo ─────────────────────────────────────────────────────

  const handleSave = useCallback(
    (updated: CanvasDocument) => {
      setUndoStack((prev) => [...prev.slice(-49), doc]);
      setRedoStack([]);
      onSave(updated);
    },
    [doc, onSave]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, doc]);
    onSave(previous);
    setPositionResetKey((k) => k + 1);
  }, [undoStack, doc, onSave]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, doc]);
    onSave(next);
    setPositionResetKey((k) => k + 1);
  }, [redoStack, doc, onSave]);

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo, handleRedo]);

  // ─── Canvas eval ────────────────────────────────────────────────────────────

  const controllerDefaults = useMemo(() => {
    const result: Record<string, number> = {};
    for (const c of (doc.controllerDefs ?? [])) {
      if (c.type === "percentage") result[c.id] = typeof c.defaultValue === "number" ? c.defaultValue : 0;
      if (c.type === "toggle") result[c.id] = c.defaultValue ? 1 : 0;
    }
    return result;
  }, [doc]);

  const canvasControllers = useMemo(() => {
    const result: Record<string, number | boolean | string[]> = {};
    for (const c of (doc.controllerDefs ?? [])) {
      if (c.type === "percentage") result[c.id] = typeof c.defaultValue === "number" ? c.defaultValue : 0;
      else if (c.type === "toggle") result[c.id] = c.defaultValue ?? false;
      else if (c.type === "selector") result[c.id] = c.defaultSelected ?? [];
    }
    return result;
  }, [doc]);

  const effectiveUnit = unit ?? testUnit;

  const canvasInactiveNodeIds = useMemo(
    () => computeInactiveNodeIds(doc, canvasControllers, effectiveUnit),
    [doc, canvasControllers, effectiveUnit]
  );

  // Stabilise stepDebug by value: only return a new array reference when ids/values/errors
  // actually change. Without this, a position-only doc change (drag stop) produces a new
  // stepDebug reference → CanvasFlow rebuilds all node objects → ReactFlow remounts handles
  // mid-render → edge paths desync and leave ghost edges.
  const stepDebugRaw = useMemo(
    () => debugEvaluateTemplate(doc, undefined, quantity, controllerDefaults, canvasInactiveNodeIds),
    [doc, quantity, controllerDefaults, canvasInactiveNodeIds]
  );
  const stepDebugRef = useRef(stepDebugRaw);
  const stepDebug = (() => {
    const prev = stepDebugRef.current;
    const next = stepDebugRaw;
    if (
      prev.length === next.length &&
      next.every((s, i) => s.id === prev[i].id && s.value === prev[i].value && s.error === prev[i].error)
    ) {
      return prev;
    }
    stepDebugRef.current = next;
    return next;
  })();

  const edges: Edge[] = useMemo(() => parseEdges(doc), [doc]);

  // ─── Doc-level saves ────────────────────────────────────────────────────────

  const handleUpdateDoc = useCallback(
    (updated: CanvasDocument) => handleSave(updated),
    [handleSave]
  );

  const handleUpdateDocFromPanel = useCallback(
    (updated: CanvasDocument, newSelectedId?: string) => {
      handleSave(updated);
      if (newSelectedId !== undefined) setSelectedNodeId(newSelectedId);
    },
    [handleSave]
  );

  // ─── Node operations ────────────────────────────────────────────────────────

  const handleCopy = useCallback((nodeIds: string[]) => {
    setClipboard(copyNodes(nodeIds, doc));
  }, [doc]);

  const handlePaste = useCallback((position: { x: number; y: number }) => {
    if (!clipboard) return;
    handleSave(pasteNodes(clipboard, doc, position));
    setPositionResetKey((k) => k + 1);
  }, [doc, clipboard, handleSave]);

  const handleDeleteNodes = useCallback((nodeIds: string[]) => {
    handleSave(deleteNodes(nodeIds, doc));
    if (selectedNodeId && nodeIds.includes(selectedNodeId)) setSelectedNodeId(null);
  }, [doc, handleSave, selectedNodeId]);

  const handleCreateNode = useCallback(
    (type: "formula" | "param" | "table" | "breakdown" | "output" | "group" | "controller:percentage" | "controller:toggle" | "controller:selector", position: { x: number; y: number }) => {
      if (type === "group") {
        const { doc: newDoc, newId } = createGroup(doc, position);
        handleSave(newDoc);
        setSelectedNodeId(newId);
        setPositionResetKey((k) => k + 1);
      } else if (type.startsWith("controller:")) {
        const ctrlType = type.split(":")[1] as "percentage" | "toggle" | "selector";
        const { doc: newDoc, newId } = createController(doc, position, ctrlType);
        handleSave(newDoc);
        setSelectedNodeId(newId);
        setPositionResetKey((k) => k + 1);
      } else {
        const { doc: updatedDoc, newId } = createNode(type as "table" | "formula" | "param" | "breakdown" | "output", doc, position);
        handleSave(updatedDoc);
        setSelectedNodeId(newId);
        setPositionResetKey((k) => k + 1);
      }
    },
    [doc, handleSave]
  );

  // ─── Canvas height accounting for the 28px undo strip ───────────────────────

  const innerHeight = renderToolbar
    ? canvasHeight
    : typeof canvasHeight === "number"
    ? canvasHeight - 28
    : `calc(${canvasHeight} - 28px)`;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box w="100%" overflow="hidden">
      {/* Toolbar: external (renderToolbar) or built-in undo/redo strip */}
      {renderToolbar ? renderToolbar({ onUndo: handleUndo, onRedo: handleRedo, canUndo, canRedo }) : (
        <Flex
          align="center"
          gap={1}
          px={2}
          h="28px"
          bg="#1e293b"
          borderBottom="1px solid"
          borderColor="whiteAlpha.100"
          flexShrink={0}
          justify="flex-end"
        >
          <Tooltip label="Undo (Ctrl+Z)" placement="bottom">
            <Button
              size="xs"
              variant="ghost"
              color="gray.400"
              _hover={{ color: "white" }}
              onClick={handleUndo}
              isDisabled={!canUndo}
              fontFamily="mono"
              fontSize="md"
              px={2}
            >
              ↩
            </Button>
          </Tooltip>
          <Tooltip label="Redo (Ctrl+Y)" placement="bottom">
            <Button
              size="xs"
              variant="ghost"
              color="gray.400"
              _hover={{ color: "white" }}
              onClick={handleRedo}
              isDisabled={!canRedo}
              fontFamily="mono"
              fontSize="md"
              px={2}
            >
              ↪
            </Button>
          </Tooltip>
        </Flex>
      )}

      {/* Canvas area */}
      <Flex overflow="hidden" h={innerHeight}>
        {/* Live Test panel */}
        {liveTestOpen ? (
          <>
            <Box
              w={`${liveTestWidth}px`}
              flexShrink={0}
              overflowY="auto"
              bg="white"
              borderRight="1px solid"
              borderColor="gray.200"
            >
              <LiveTestPanel
                doc={doc}
                onCollapse={() => setLiveTestOpen(false)}
                initialQuantity={initialQuantity}
                initialInputs={initialInputs}
                onInputsChange={onInputsChange}
                paramNotes={paramNotes}
                onParamNoteChange={onParamNoteChange}
                outputs={outputs}
                onOutputChange={onOutputChange}
                unit={unit}
                testUnit={testUnit}
                onTestUnitChange={setTestUnit}
              />
            </Box>
            <Box
              w="4px"
              cursor="col-resize"
              bg="gray.100"
              _hover={{ bg: "blue.100" }}
              onMouseDown={onLiveTestResizeStart}
              flexShrink={0}
            />
          </>
        ) : (
          <Box
            w="28px"
            flexShrink={0}
            bg="gray.50"
            borderRight="1px solid"
            borderColor="gray.200"
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            onClick={() => setLiveTestOpen(true)}
            title="Open Live Test panel"
          >
            <Box
              fontSize="9px"
              color="gray.400"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              LIVE TEST
            </Box>
          </Box>
        )}

        <Box flex={1} minW={0} bg="#0f172a" position="relative">
          <CanvasFlow
            doc={doc}
            edges={edges}
            stepDebug={stepDebug}
            selectedNodeId={selectedNodeId}
            positionResetKey={positionResetKey}
            onSelectNode={setSelectedNodeId}
            quantity={quantity}
            onQuantityChange={setQuantity}
            onUpdateDoc={handleUpdateDoc}
            clipboard={clipboard}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onDeleteNodes={handleDeleteNodes}
            onCreateNode={handleCreateNode}
          />
        </Box>

        {selectedNodeId && (
          <>
            <Box
              w="4px"
              cursor="col-resize"
              bg="gray.100"
              _hover={{ bg: "blue.100" }}
              onMouseDown={onResizeStart}
              flexShrink={0}
            />
            <Box
              w={`${inspectWidth}px`}
              flexShrink={0}
              overflowY="auto"
              bg="white"
              borderLeft="1px solid"
              borderColor="gray.200"
            >
              <InspectPanel
                template={doc}
                selectedNodeId={selectedNodeId}
                stepDebug={stepDebug}
                edges={edges}
                onUpdateDoc={handleUpdateDocFromPanel}
              />
            </Box>
          </>
        )}
      </Flex>
    </Box>
  );
};

export default CalculatorCanvas;
