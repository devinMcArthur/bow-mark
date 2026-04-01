// client/src/components/pages/developer/CalculatorCanvas/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Flex, Select, Text, Tooltip } from "@chakra-ui/react";
import { Edge } from "reactflow";
import {
  debugEvaluateTemplate,
} from "../../../../components/TenderPricing/calculators/evaluate";
import { parseEdges } from "./edgeParser";
import { CanvasDocument, useCanvasDocuments } from "./canvasStorage";
import { ClipboardPayload, copyNodes, pasteNodes, deleteNodes, createNode, createGroup } from "./canvasOps";
import CanvasFlow from "./CanvasFlow";
import InspectPanel from "./InspectPanel";
import LiveTestPanel from "./LiveTestPanel";

interface Props {
  /** Height of the canvas + inspect-panel area. Defaults to 700px. */
  canvasHeight?: string | number;
}

const CalculatorCanvas: React.FC<Props> = ({ canvasHeight = "700px" }) => {
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

  const stepDebug = useMemo(
    () =>
      activeDoc
        ? debugEvaluateTemplate(activeDoc, activeDoc.defaultInputs, quantity)
        : [],
    [activeDoc, quantity]
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
    (type: "formula" | "param" | "table" | "breakdown" | "group", position: { x: number; y: number }) => {
      if (!activeDoc) return;
      if (type === "group") {
        const { doc, newId } = createGroup(activeDoc, position);
        saveDocument(doc);
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
