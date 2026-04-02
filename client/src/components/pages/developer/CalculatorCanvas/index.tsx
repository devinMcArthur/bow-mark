// client/src/components/pages/developer/CalculatorCanvas/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Box, Button, Flex, Select, Text, Tooltip } from "@chakra-ui/react";
import { Edge } from "reactflow";
import {
  debugEvaluateTemplate,
} from "../../../../components/TenderPricing/calculators/evaluate";
import { parseEdges } from "./edgeParser";
import { CanvasDocument, useCanvasDocuments, computeInactiveNodeIds } from "./canvasStorage";
import { ClipboardPayload, copyNodes, pasteNodes, deleteNodes, createNode, createGroup, createController } from "./canvasOps";
import CanvasFlow from "./CanvasFlow";
import InspectPanel from "./InspectPanel";
import LiveTestPanel from "./LiveTestPanel";

interface Props {
  /** Height of the canvas + inspect-panel area. Defaults to 700px. */
  canvasHeight?: string | number;
  /**
   * When set, locks the editor to this document ID and renders a slim
   * standalone header bar instead of the multi-doc toolbar.
   */
  docId?: string;
}

const CalculatorCanvas: React.FC<Props> = ({ canvasHeight = "700px", docId }) => {
  const router = useRouter();
  const { docs, loading, saveDocument, createDocument, forkDocument, deleteDocument, undo, redo, canUndo, canRedo } = useCanvasDocuments();
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [clipboard, setClipboard] = useState<ClipboardPayload | null>(null);
  const [positionResetKey, setPositionResetKey] = useState(0);
  const [inspectWidth, setInspectWidth] = useState(260);
  const dragStartX = useRef<number | null>(null);
  const dragStartWidth = useRef(260);
  const [liveTestOpen, setLiveTestOpen] = useState(true);
  const [liveTestWidth, setLiveTestWidth] = useState(280);
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
      const delta = ev.clientX - dragStartX.current; // right = wider for left panel
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

  const activeDoc = docs.find((d) => d.id === selectedDocId) ?? docs[0];

  // Set initial selectedDocId once docs load, and fall back if the selected doc is deleted
  useEffect(() => {
    if (docs.length > 0 && !docs.find((d) => d.id === selectedDocId)) {
      setSelectedDocId(docs[0].id);
      setSelectedNodeId(null);
    }
  }, [docs, selectedDocId]);

  // When a docId is provided (standalone page mode), pin selection to it
  useEffect(() => {
    if (docId && docs.find((d) => d.id === docId)) {
      setSelectedDocId(docId);
      setSelectedNodeId(null);
    }
  }, [docId, docs]);

  // ─── Standalone header: inline name editing ──────────────────────────────────
  const [nameEditValue, setNameEditValue] = useState<string | null>(null);

  const handleNameBlur = useCallback(() => {
    if (nameEditValue === null || !activeDoc) return;
    const trimmed = nameEditValue.trim();
    if (trimmed && trimmed !== activeDoc.label) {
      saveDocument({ ...activeDoc, label: trimmed });
    }
    setNameEditValue(null);
  }, [nameEditValue, activeDoc, saveDocument]);

  const handleStandaloneFork = useCallback(async () => {
    if (!activeDoc) return;
    const newId = await forkDocument(activeDoc.id);
    if (newId) router.push(`/pricing/rate-builder/${newId}`);
  }, [activeDoc, forkDocument, router]);

  const handleStandaloneDelete = useCallback(async () => {
    if (!activeDoc) return;
    if (docs.length <= 1) {
      window.alert("Cannot delete the only template.");
      return;
    }
    if (!window.confirm(`Delete "${activeDoc.label}"? This cannot be undone.`)) return;
    await deleteDocument(activeDoc.id);
    router.push("/pricing");
  }, [activeDoc, docs.length, deleteDocument, router]);

  const controllerDefaults = useMemo(() => {
    if (!activeDoc) return {};
    const result: Record<string, number> = {};
    for (const c of (activeDoc.controllerDefs ?? [])) {
      if (c.type === "percentage") result[c.id] = typeof c.defaultValue === "number" ? c.defaultValue : 0;
      if (c.type === "toggle") result[c.id] = c.defaultValue ? 1 : 0;
    }
    return result;
  }, [activeDoc]);

  const canvasControllers = useMemo(() => {
    if (!activeDoc) return {};
    const result: Record<string, number | boolean | string[]> = {};
    for (const c of (activeDoc.controllerDefs ?? [])) {
      if (c.type === "percentage") result[c.id] = typeof c.defaultValue === "number" ? c.defaultValue : 0;
      else if (c.type === "toggle") result[c.id] = c.defaultValue ?? false;
      else if (c.type === "selector") result[c.id] = c.defaultSelected ?? [];
    }
    return result;
  }, [activeDoc]);

  const canvasInactiveNodeIds = useMemo(
    () => activeDoc ? computeInactiveNodeIds(activeDoc, canvasControllers) : new Set<string>(),
    [activeDoc, canvasControllers]
  );

  const stepDebug = useMemo(
    () =>
      activeDoc
        ? debugEvaluateTemplate(activeDoc, activeDoc.defaultInputs, quantity, controllerDefaults, canvasInactiveNodeIds)
        : [],
    [activeDoc, quantity, controllerDefaults, canvasInactiveNodeIds]
  );

  // Computed once and shared between CanvasFlow (for highlight logic + auto-layout)
  // and InspectPanel (for dependency display) — avoids triple-calling parseEdges.
  const edges: Edge[] = useMemo(
    () => (activeDoc ? parseEdges(activeDoc) : []),
    [activeDoc]
  );

  // ─── Doc-level saves ────────────────────────────────────────────────────────

  const handleUpdateDoc = useCallback(
    (updated: CanvasDocument) => saveDocument(updated),
    [saveDocument]
  );

  // Full-document edits from InspectPanel (includes slug renames that change nodePositions).
  const handleUpdateDocFromPanel = useCallback(
    (updated: CanvasDocument, newSelectedId?: string) => {
      saveDocument(updated);
      if (newSelectedId !== undefined) setSelectedNodeId(newSelectedId);
    },
    [saveDocument]
  );

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo(selectedDocId);
        setPositionResetKey((k) => k + 1);
      } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo(selectedDocId);
        setPositionResetKey((k) => k + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedDocId, undo, redo]);

  // ─── Template toolbar ───────────────────────────────────────────────────────

  const handleNew = useCallback(async () => {
    const newId = await createDocument();
    setSelectedDocId(newId);
    setSelectedNodeId(null);
  }, [createDocument]);

  const handleFork = useCallback(async () => {
    if (!activeDoc) return;
    const newId = await forkDocument(activeDoc.id);
    if (newId) { setSelectedDocId(newId); setSelectedNodeId(null); }
  }, [activeDoc, forkDocument]);

  const handleDelete = useCallback(() => {
    if (!activeDoc || docs.length <= 1) return;
    deleteDocument(activeDoc.id);
    // useEffect above will switch selectedDocId once docs updates
  }, [activeDoc, docs.length, deleteDocument]);

  // ─── Node operations ────────────────────────────────────────────────────────

  const handleCopy = useCallback((nodeIds: string[]) => {
    if (!activeDoc) return;
    setClipboard(copyNodes(nodeIds, activeDoc));
  }, [activeDoc]);

  const handlePaste = useCallback((position: { x: number; y: number }) => {
    if (!activeDoc || !clipboard) return;
    saveDocument(pasteNodes(clipboard, activeDoc, position));
    setPositionResetKey((k) => k + 1);
  }, [activeDoc, clipboard, saveDocument]);

  const handleDeleteNodes = useCallback((nodeIds: string[]) => {
    if (!activeDoc) return;
    saveDocument(deleteNodes(nodeIds, activeDoc));
    if (selectedNodeId && nodeIds.includes(selectedNodeId)) setSelectedNodeId(null);
  }, [activeDoc, saveDocument, selectedNodeId]);

  const handleCreateNode = useCallback(
    (type: "formula" | "param" | "table" | "breakdown" | "group" | "controller:percentage" | "controller:toggle" | "controller:selector", position: { x: number; y: number }) => {
      if (!activeDoc) return;
      if (type === "group") {
        const { doc, newId } = createGroup(activeDoc, position);
        saveDocument(doc);
        setSelectedNodeId(newId);
        setPositionResetKey((k) => k + 1);
      } else if (type.startsWith("controller:")) {
        const ctrlType = type.split(":")[1] as "percentage" | "toggle" | "selector";
        const { doc: newDoc, newId } = createController(activeDoc, position, ctrlType);
        saveDocument(newDoc);
        setSelectedNodeId(newId);
        setPositionResetKey((k) => k + 1);
      } else {
        const { doc: updatedDoc, newId } = createNode(type, activeDoc, position);
        saveDocument(updatedDoc);
        setSelectedNodeId(newId);
        setPositionResetKey((k) => k + 1);
      }
    },
    [activeDoc, saveDocument]
  );

  if (loading) {
    return (
      <Flex align="center" justify="center" h="400px">
        <Text color="gray.400" fontSize="sm">Loading templates…</Text>
      </Flex>
    );
  }

  // ─── Standalone mode (full-page editor at /pricing/rate-builder/[id]) ─────────
  if (docId) {
    return (
      <Box w="100%" overflow="hidden">
        {/* Slim header bar */}
        <Flex
          align="center"
          gap={2}
          px={3}
          h="36px"
          bg="#1e293b"
          borderBottom="1px solid"
          borderColor="whiteAlpha.100"
          flexShrink={0}
        >
          <Button
            size="xs"
            variant="ghost"
            color="gray.400"
            _hover={{ color: "white" }}
            onClick={() => router.push("/pricing")}
            px={1}
            fontWeight="normal"
            fontSize="xs"
          >
            ← Pricing
          </Button>
          <Box w="1px" h="16px" bg="whiteAlpha.300" />
          {nameEditValue !== null ? (
            <input
              autoFocus
              value={nameEditValue}
              onChange={(e) => setNameEditValue(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") { setNameEditValue(null); }
              }}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #4a5568",
                color: "#f1f5f9",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "inherit",
                outline: "none",
                padding: "1px 4px",
                minWidth: 180,
              }}
            />
          ) : (
            <Text
              fontSize="sm"
              fontWeight="semibold"
              color="white"
              cursor="text"
              _hover={{ color: "gray.200" }}
              onClick={() => setNameEditValue(activeDoc?.label ?? "")}
              userSelect="none"
            >
              {activeDoc?.label ?? "…"}
            </Text>
          )}
          <Box flex={1} />
          {/* Undo / Redo */}
          <Tooltip label="Undo (Ctrl+Z)" placement="bottom">
            <Button
              size="xs"
              variant="ghost"
              color="gray.400"
              _hover={{ color: "white" }}
              onClick={() => { undo(selectedDocId); setPositionResetKey((k) => k + 1); }}
              isDisabled={!canUndo(selectedDocId)}
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
              onClick={() => { redo(selectedDocId); setPositionResetKey((k) => k + 1); }}
              isDisabled={!canRedo(selectedDocId)}
              fontFamily="mono"
              fontSize="md"
              px={2}
            >
              ↪
            </Button>
          </Tooltip>
          <Box w="1px" h="16px" bg="whiteAlpha.200" />
          <Tooltip label="Duplicate this template" placement="bottom">
            <Button
              size="xs"
              variant="ghost"
              color="gray.400"
              _hover={{ color: "white" }}
              onClick={handleStandaloneFork}
            >
              Fork
            </Button>
          </Tooltip>
          <Tooltip label="Delete this template" placement="bottom">
            <Button
              size="xs"
              variant="ghost"
              color="red.400"
              _hover={{ color: "red.300" }}
              onClick={handleStandaloneDelete}
            >
              Delete
            </Button>
          </Tooltip>
        </Flex>

        {/* Canvas area */}
        {activeDoc && (
          <Flex
            borderWidth={0}
            rounded="none"
            overflow="hidden"
            h={canvasHeight}
          >
            {/* Live Test panel or collapsed strip */}
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
                    doc={activeDoc}
                    onCollapse={() => setLiveTestOpen(false)}
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
                <Text
                  fontSize="9px"
                  color="gray.400"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  LIVE TEST
                </Text>
              </Box>
            )}

            <Box flex={1} minW={0} bg="#0f172a" position="relative">
              <CanvasFlow
                doc={activeDoc}
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
                    template={activeDoc}
                    selectedNodeId={selectedNodeId}
                    stepDebug={stepDebug}
                    edges={edges}
                    onUpdateDoc={handleUpdateDocFromPanel}
                  />
                </Box>
              </>
            )}
          </Flex>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {/* Template toolbar */}
      <Flex align="center" gap={3} mb={4}>
        <Text fontSize="sm" color="gray.600" whiteSpace="nowrap" fontWeight="medium">
          Template
        </Text>
        <Select
          size="sm"
          maxW="260px"
          value={selectedDocId}
          onChange={(e) => {
            setSelectedDocId(e.target.value);
            setSelectedNodeId(null);
          }}
        >
          {docs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label || d.id}
            </option>
          ))}
        </Select>

        <Button size="xs" colorScheme="purple" variant="outline" onClick={handleNew}>
          New
        </Button>
        <Tooltip label="Clone this template" placement="top">
          <Button size="xs" variant="outline" onClick={handleFork}>
            Fork
          </Button>
        </Tooltip>
        <Tooltip
          label={docs.length <= 1 ? "Cannot delete the last template" : "Delete this template"}
          placement="top"
        >
          <Button
            size="xs"
            colorScheme="red"
            variant="ghost"
            onClick={handleDelete}
            isDisabled={docs.length <= 1}
          >
            Delete
          </Button>
        </Tooltip>

        {/* Undo / Redo */}
        <Box w="1px" h="18px" bg="gray.200" mx={1} />
        <Tooltip label="Undo (Ctrl+Z)" placement="top">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => { undo(selectedDocId); setPositionResetKey((k) => k + 1); }}
            isDisabled={!canUndo(selectedDocId)}
            fontFamily="mono"
            fontSize="md"
            px={2}
          >
            ↩
          </Button>
        </Tooltip>
        <Tooltip label="Redo (Ctrl+Y)" placement="top">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => { redo(selectedDocId); setPositionResetKey((k) => k + 1); }}
            isDisabled={!canRedo(selectedDocId)}
            fontFamily="mono"
            fontSize="md"
            px={2}
          >
            ↪
          </Button>
        </Tooltip>
      </Flex>

      {activeDoc && (
        <Flex
          borderWidth={1}
          borderColor="gray.200"
          rounded="lg"
          overflow="hidden"
          h={canvasHeight}
        >
          {/* Live Test panel or collapsed strip */}
          {liveTestOpen ? (
            <>
              <Box
                w={`${liveTestWidth}px`}
                flexShrink={0}
                h="100%"
                overflowY="auto"
                borderRight="1px solid"
                borderColor="gray.200"
              >
                <LiveTestPanel
                  doc={activeDoc}
                  onCollapse={() => setLiveTestOpen(false)}
                />
              </Box>
              <Box
                w="4px"
                flexShrink={0}
                h="100%"
                bg="gray.200"
                cursor="col-resize"
                onMouseDown={onLiveTestResizeStart}
                _hover={{ bg: "purple.300" }}
                transition="background 0.15s"
              />
            </>
          ) : (
            <Box
              w="32px"
              flexShrink={0}
              h="100%"
              bg="gray.50"
              borderRight="1px solid"
              borderColor="gray.200"
              display="flex"
              alignItems="flex-start"
              justifyContent="center"
              pt={2}
            >
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setLiveTestOpen(true)}
                aria-label="Expand live test panel"
                px={1}
                minW="auto"
                color="gray.400"
                _hover={{ color: "gray.600" }}
              >
                »
              </Button>
            </Box>
          )}

          {/* Canvas */}
          <Box flex={1} h="100%" bg="#0f172a">
            <CanvasFlow
              doc={activeDoc}
              edges={edges}
              stepDebug={stepDebug}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              quantity={quantity}
              onQuantityChange={setQuantity}
              onUpdateDoc={handleUpdateDoc}
              clipboard={clipboard}
              onCopy={handleCopy}
              onPaste={handlePaste}
              onDeleteNodes={handleDeleteNodes}
              onCreateNode={handleCreateNode}
              positionResetKey={positionResetKey}
            />
          </Box>

          {/* Right drag handle — only shown when a node is selected */}
          {selectedNodeId && (
            <Box
              w="4px"
              flexShrink={0}
              h="100%"
              bg="gray.200"
              cursor="col-resize"
              onMouseDown={onResizeStart}
              _hover={{ bg: "purple.300" }}
              transition="background 0.15s"
            />
          )}

          <Box
            w={selectedNodeId ? `${inspectWidth}px` : "0px"}
            flexShrink={0}
            h="100%"
            overflowY="auto"
            overflowX="hidden"
            bg="white"
            transition="width 0.15s"
          >
            <InspectPanel
              template={activeDoc}
              selectedNodeId={selectedNodeId}
              stepDebug={stepDebug}
              edges={edges}
              onUpdateDoc={handleUpdateDocFromPanel}
            />
          </Box>
        </Flex>
      )}
    </Box>
  );
};

export default CalculatorCanvas;
