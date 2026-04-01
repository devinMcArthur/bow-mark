// client/src/components/pages/developer/CalculatorCanvas/InspectPanel.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Flex, Text, Badge, Button, Divider, VStack,
  Input, Select, Grid, IconButton,
} from "@chakra-ui/react";
import { v4 as uuidv4 } from "uuid";
import FormulaEditor from "./FormulaEditor";
import { Edge } from "reactflow";
import {
  TableDef,
  RateEntry,
} from "../../../../components/TenderPricing/calculators/types";
import { CanvasDocument } from "./canvasStorage";
import { slugify, renameNodeId } from "./canvasOps";
import { formulaToLatex } from "./formulaToLatex";
import katex from "katex";
import { StepDebugInfo } from "../../../../components/TenderPricing/calculators/evaluate";

interface Props {
  template: CanvasDocument;
  selectedNodeId: string | null;
  stepDebug: StepDebugInfo[];
  edges: Edge[];
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}

type NodeKind = "param" | "table" | "quantity" | "formula" | "breakdown" | "output" | "unknown";

const KIND_COLORS: Record<NodeKind, string> = {
  param: "blue", table: "green", quantity: "yellow",
  formula: "purple", breakdown: "teal", output: "cyan", unknown: "gray",
};
const KIND_LABELS: Record<NodeKind, string> = {
  param: "Parameter", table: "Table Aggregate", quantity: "Quantity (test input)",
  formula: "Formula Step", breakdown: "Summary", output: "Unit Price Output",
  unknown: "Unknown",
};

function detectKind(nodeId: string, template: CalculatorTemplate): NodeKind {
  if (nodeId === "quantity") return "quantity";
  if (nodeId === "unitPrice") return "output";
  if (template.parameterDefs.some((p) => p.id === nodeId)) return "param";
  if (template.tableDefs.some((t) => `${t.id}RatePerHr` === nodeId)) return "table";
  if (template.formulaSteps.some((s) => s.id === nodeId)) return "formula";
  if (template.breakdownDefs.some((b) => b.id === nodeId)) return "breakdown";
  return "unknown";
}

// ─── Generic editable field ───────────────────────────────────────────────────

const EditField: React.FC<{
  label: string;
  value: string;
  type?: "text" | "number";
  placeholder?: string;
  mono?: boolean;
  onBlur: (val: string) => void;
}> = ({ label, value, type = "text", placeholder, mono, onBlur }) => {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <Box mb={3}>
      <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
        {label}
      </Text>
      <Input
        size="sm"
        type={type}
        value={local}
        placeholder={placeholder}
        fontFamily={mono ? "mono" : undefined}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onBlur(local)}
      />
    </Box>
  );
};

// ─── Table rows editor ────────────────────────────────────────────────────────

const TableInspect: React.FC<{
  tableDef: TableDef;
  rows: RateEntry[];
  doc: CanvasDocument;
  onUpdateDoc: (doc: CanvasDocument) => void;
}> = ({ tableDef, rows, doc, onUpdateDoc }) => {
  const [localRows, setLocalRows] = useState<RateEntry[]>(rows);
  useEffect(() => setLocalRows(rows), [rows]);
  const focusRowId = useRef<string | null>(null);

  const save = (updatedRows: RateEntry[]) => {
    onUpdateDoc({
      ...doc,
      defaultInputs: {
        ...doc.defaultInputs,
        tables: { ...doc.defaultInputs.tables, [tableDef.id]: updatedRows },
      },
    });
  };

  const handleChange = (rowId: string, field: "name" | "qty" | "ratePerHour", raw: string) => {
    setLocalRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, [field]: field === "name" ? raw : parseFloat(raw) || 0 }
          : r
      )
    );
  };

  const addRow = () => {
    const newId = uuidv4();
    focusRowId.current = newId;
    const newRows = [...localRows, { id: newId, name: "New Item", qty: 1, ratePerHour: 0 }];
    setLocalRows(newRows);
    save(newRows);
  };

  const removeRow = (rowId: string) => {
    const newRows = localRows.filter((r) => r.id !== rowId);
    setLocalRows(newRows);
    save(newRows);
  };

  const total = localRows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);

  return (
    <Box mt={2}>
      <Grid templateColumns="1fr 44px 56px 18px" gap={1} mb={1}>
        <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase">{tableDef.rowLabel}</Text>
        <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase">Qty</Text>
        <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase">$/hr</Text>
        <Box />
      </Grid>
      {localRows.map((row) => (
        <Grid key={row.id} templateColumns="1fr 44px 56px 18px" gap={1} mb={1} alignItems="center">
          <Input size="xs" value={row.name} px={1} fontFamily="mono"
            ref={(el) => { if (el && focusRowId.current === row.id) { el.focus(); el.select(); focusRowId.current = null; } }}
            onChange={(e) => handleChange(row.id, "name", e.target.value)}
            onBlur={() => save(localRows)} />
          <Input size="xs" type="number" value={row.qty} px={1} textAlign="right" fontFamily="mono"
            onChange={(e) => handleChange(row.id, "qty", e.target.value)}
            onBlur={() => save(localRows)} />
          <Input size="xs" type="number" value={row.ratePerHour} px={1} textAlign="right" fontFamily="mono"
            onChange={(e) => handleChange(row.id, "ratePerHour", e.target.value)}
            onBlur={() => save(localRows)} />
          <IconButton
            aria-label="Remove row"
            icon={<span style={{ fontSize: 10 }}>✕</span>}
            size="xs"
            variant="ghost"
            colorScheme="red"
            minW="18px"
            h="18px"
            onClick={() => removeRow(row.id)}
          />
        </Grid>
      ))}
      <Divider my={2} />
      <Grid templateColumns="1fr auto" alignItems="center">
        <Text fontSize="xs" fontWeight="semibold" color="gray.500">Total</Text>
        <Text fontSize="xs" fontWeight="700" color="green.700" fontFamily="mono">${total.toFixed(2)}/hr</Text>
      </Grid>
      <Button size="xs" variant="ghost" colorScheme="green" mt={2} onClick={addRow} w="full">
        + Add Row
      </Button>
    </Box>
  );
};

// ─── Per-kind edit sections ───────────────────────────────────────────────────

const ParamEdit: React.FC<{
  doc: CanvasDocument;
  nodeId: string;
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}> = ({ doc, nodeId, onUpdateDoc }) => {
  const param = doc.parameterDefs.find((p) => p.id === nodeId)!;

  const saveField = (updates: { label?: string; suffix?: string | undefined; defaultValue?: number }) => {
    const updatedDefs = doc.parameterDefs.map((p) =>
      p.id === nodeId ? { ...p, ...updates } : p
    );
    const updatedParams =
      updates.defaultValue !== undefined
        ? { ...doc.defaultInputs.params, [nodeId]: updates.defaultValue }
        : doc.defaultInputs.params;
    onUpdateDoc({ ...doc, parameterDefs: updatedDefs, defaultInputs: { ...doc.defaultInputs, params: updatedParams } });
  };

  const saveLabel = (newLabel: string) => {
    // Update label first, then rename the node's ID to the derived slug if it changed.
    const labeledDoc: CanvasDocument = {
      ...doc,
      parameterDefs: doc.parameterDefs.map((p) => p.id === nodeId ? { ...p, label: newLabel } : p),
    };
    const newSlug = slugify(newLabel);
    if (newSlug !== nodeId) {
      onUpdateDoc(renameNodeId(nodeId, newSlug, labeledDoc), newSlug);
    } else {
      onUpdateDoc(labeledDoc);
    }
  };

  return (
    <>
      <EditField label="Label" value={param.label} onBlur={saveLabel} />
      <EditField label="Suffix" value={param.suffix ?? ""} placeholder="e.g. mm, /t, /hr"
        onBlur={(v) => saveField({ suffix: v || undefined })} />
      <EditField label="Default Value" value={String(doc.defaultInputs.params[nodeId] ?? param.defaultValue)}
        type="number" mono onBlur={(v) => saveField({ defaultValue: parseFloat(v) || 0 })} />
    </>
  );
};

const FormulaEdit: React.FC<{
  doc: CanvasDocument;
  nodeId: string;
  stepDebug: StepDebugInfo[];
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}> = ({ doc, nodeId, stepDebug, onUpdateDoc }) => {
  const step = doc.formulaSteps.find((s) => s.id === nodeId)!;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any pending debounce when this node is deselected (component unmounts)
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleFormulaChange = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateDoc({
        ...doc,
        formulaSteps: doc.formulaSteps.map((s) =>
          s.id === nodeId ? { ...s, formula: val } : s
        ),
      });
    }, 350);
  };

  const saveLabel = (newLabel: string) => {
    const labeledDoc: CanvasDocument = {
      ...doc,
      formulaSteps: doc.formulaSteps.map((s) => s.id === nodeId ? { ...s, label: newLabel || undefined } : s),
    };
    const newSlug = slugify(newLabel);
    if (newLabel && newSlug !== nodeId) {
      onUpdateDoc(renameNodeId(nodeId, newSlug, labeledDoc), newSlug);
    } else {
      onUpdateDoc(labeledDoc);
    }
  };

  const debug = stepDebug.find((s) => s.id === nodeId);

  const availableVars = [
    ...doc.parameterDefs.map((p) => p.id),
    ...doc.tableDefs.map((t) => `${t.id}RatePerHr`),
    "quantity",
    ...doc.formulaSteps.filter((s) => s.id !== nodeId).map((s) => s.id),
  ];

  const labelMap: Record<string, string> = useMemo(() => {
    const m: Record<string, string> = { quantity: "Quantity" };
    for (const p of doc.parameterDefs) m[p.id] = p.label;
    for (const t of doc.tableDefs) m[`${t.id}RatePerHr`] = t.label;
    for (const s of doc.formulaSteps) m[s.id] = s.label ?? s.id;
    return m;
  }, [doc]);

  const katexHtml = useMemo(() => {
    if (!step.formula.trim()) return "";
    try {
      const latex = formulaToLatex(step.formula, labelMap);
      return katex.renderToString(latex, { throwOnError: false, displayMode: true, output: "html" });
    } catch {
      return "";
    }
  }, [step.formula, labelMap]);

  return (
    <>
      <EditField
        label="Label"
        value={step.label ?? ""}
        placeholder="Human-readable name"
        onBlur={saveLabel}
      />

      <Box mb={3}>
        <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
          Formula
        </Text>
        <FormulaEditor
          value={step.formula}
          variables={availableVars}
          onChange={handleFormulaChange}
        />
        <Text fontSize="11px" fontFamily="mono" mt={1}
          color={debug?.error ? "red.500" : "purple.600"}>
          {debug?.error ? `⚠ ${debug.error}` : `= ${debug?.value?.toFixed(6) ?? "—"}`}
        </Text>
      </Box>

      {katexHtml && (
        <Box mb={3}>
          <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Preview
          </Text>
          <Box
            bg="gray.50"
            border="1px solid"
            borderColor="purple.100"
            borderRadius="md"
            px={3}
            py={2}
            overflowX="auto"
            dangerouslySetInnerHTML={{ __html: katexHtml }}
          />
        </Box>
      )}
    </>
  );
};

const BreakdownEdit: React.FC<{
  doc: CanvasDocument;
  nodeId: string;
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}> = ({ doc, nodeId, onUpdateDoc }) => {
  const bd = doc.breakdownDefs.find((b) => b.id === nodeId)!;

  const saveItems = (items: typeof bd.items) => {
    onUpdateDoc({
      ...doc,
      breakdownDefs: doc.breakdownDefs.map((b) => b.id === nodeId ? { ...b, items } : b),
    });
  };

  const saveLabel = (newLabel: string) => {
    const labeledDoc: CanvasDocument = {
      ...doc,
      breakdownDefs: doc.breakdownDefs.map((b) => b.id === nodeId ? { ...b, label: newLabel } : b),
    };
    const newSlug = slugify(newLabel);
    if (newSlug !== nodeId) {
      onUpdateDoc(renameNodeId(nodeId, newSlug, labeledDoc), newSlug);
    } else {
      onUpdateDoc(labeledDoc);
    }
  };

  return (
    <>
      <EditField label="Label" value={bd.label} onBlur={saveLabel} />
      <Box mb={3}>
        <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={2}>
          Items (summed)
        </Text>
        {(bd.items ?? []).map((item, idx) => (
          <Flex key={idx} align="center" gap={1} mb={1}>
            <Select
              size="xs"
              flex={1}
              value={item.stepId}
              onChange={(e) => {
                const next = (bd.items ?? []).map((it, i) => i === idx ? { ...it, stepId: e.target.value } : it);
                saveItems(next);
              }}
            >
              {doc.formulaSteps.map((s) => (
                <option key={s.id} value={s.id}>{s.label ?? s.id}</option>
              ))}
            </Select>
            <IconButton
              aria-label="Remove item"
              icon={<>✕</>}
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={() => saveItems((bd.items ?? []).filter((_, i) => i !== idx))}
            />
          </Flex>
        ))}
        <Button
          size="xs"
          variant="ghost"
          colorScheme="green"
          mt={1}
          onClick={() => {
            const firstStep = doc.formulaSteps[0];
            if (!firstStep) return;
            saveItems([...(bd.items ?? []), { stepId: firstStep.id, label: firstStep.label ?? firstStep.id }]);
          }}
        >
          + Add Item
        </Button>
      </Box>
    </>
  );
};

const TableLabelEdit: React.FC<{
  doc: CanvasDocument;
  nodeId: string;
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}> = ({ doc, nodeId, onUpdateDoc }) => {
  const tId = nodeId.replace(/RatePerHr$/, "");
  const tableDef = doc.tableDefs.find((t) => t.id === tId)!;

  const saveLabel = (newLabel: string) => {
    // The canvas node ID for a table is `${tableBaseId}RatePerHr`.
    // Rename the base ID; renameNodeId handles both the base and the RatePerHr variant.
    const labeledDoc: CanvasDocument = {
      ...doc,
      tableDefs: doc.tableDefs.map((t) => t.id === tId ? { ...t, label: newLabel } : t),
    };
    const newSlug = slugify(newLabel);
    const newNodeId = `${newSlug}RatePerHr`;
    if (newSlug !== tId) {
      onUpdateDoc(renameNodeId(nodeId, newNodeId, labeledDoc), newNodeId);
    } else {
      onUpdateDoc(labeledDoc);
    }
  };

  const saveRowLabel = (newRowLabel: string) => {
    onUpdateDoc({
      ...doc,
      tableDefs: doc.tableDefs.map((t) => t.id === tId ? { ...t, rowLabel: newRowLabel } : t),
    });
  };

  return (
    <>
      <EditField label="Label" value={tableDef.label} onBlur={saveLabel} />
      <EditField label="Row Label" value={tableDef.rowLabel} placeholder="e.g. Role, Equipment, Item"
        onBlur={saveRowLabel} />
    </>
  );
};

// ─── Main panel ───────────────────────────────────────────────────────────────

const InspectPanel: React.FC<Props> = ({
  template, selectedNodeId, stepDebug, edges, onUpdateDoc,
}) => {
  if (!selectedNodeId) {
    return (
      <Box p={6} h="100%" display="flex" alignItems="center" justifyContent="center">
        <Text fontSize="sm" color="gray.400">Click a node to inspect</Text>
      </Box>
    );
  }

  const kind = detectKind(selectedNodeId, template);
  const incoming = edges.filter((e) => e.target === selectedNodeId);
  const outgoing = edges.filter((e) => e.source === selectedNodeId);

  const tableDef = kind === "table"
    ? template.tableDefs.find((t) => `${t.id}RatePerHr` === selectedNodeId) ?? null
    : null;

  return (
    <Box p={4} h="100%" overflowY="auto">
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={3}>
        Inspect
      </Text>

      {/* Node ID + type badge */}
      <Text fontFamily="mono" fontWeight="700" fontSize="md" color="gray.800" mb={1}>
        {selectedNodeId}
      </Text>
      <Badge colorScheme={KIND_COLORS[kind]} mb={4} fontSize="10px">
        {KIND_LABELS[kind]}
      </Badge>

      {/* Editable fields per kind */}
      {kind === "param" && (
        <ParamEdit doc={template} nodeId={selectedNodeId} onUpdateDoc={onUpdateDoc} />
      )}
      {kind === "formula" && (
        <FormulaEdit doc={template} nodeId={selectedNodeId} stepDebug={stepDebug} onUpdateDoc={onUpdateDoc} />
      )}
      {kind === "breakdown" && (
        <BreakdownEdit doc={template} nodeId={selectedNodeId} onUpdateDoc={onUpdateDoc} />
      )}
      {kind === "table" && tableDef && (
        <>
          <TableLabelEdit doc={template} nodeId={selectedNodeId} onUpdateDoc={onUpdateDoc} />
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Rows
          </Text>
          <TableInspect
            tableDef={tableDef}
            rows={template.defaultInputs.tables[tableDef.id] ?? []}
            doc={template}
            onUpdateDoc={onUpdateDoc}
          />
          <Box mb={4} />
        </>
      )}
      {kind === "quantity" && (
        <Text fontSize="xs" color="gray.400" mb={4}>
          Simulation input only — quantity is provided by the tender sheet at runtime, not stored in the template.
        </Text>
      )}
      {kind === "output" && (
        <Text fontSize="xs" color="gray.400" mb={4}>Derived from all summary nodes. Read-only.</Text>
      )}
      {kind === "unknown" && (
        <Text fontSize="xs" color="gray.400" mb={4}>
          Node not found in template. It may have been deleted — try undoing or deselecting.
        </Text>
      )}

      <Divider mb={4} />

      {/* Receives from */}
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={2}>
        Receives from
      </Text>
      {incoming.length === 0 ? (
        <Text fontSize="xs" color="gray.400" mb={4}>— (source node)</Text>
      ) : (
        <VStack align="stretch" spacing={1} mb={4}>
          {incoming.map((e) => (
            <Text key={e.id} fontSize="xs" fontFamily="mono" color="gray.600">{e.source}</Text>
          ))}
        </VStack>
      )}

      {/* Feeds into */}
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={2}>
        Feeds into
      </Text>
      {outgoing.length === 0 ? (
        <Text fontSize="xs" color="gray.400">— (sink node)</Text>
      ) : (
        <VStack align="stretch" spacing={1}>
          {outgoing.map((e) => (
            <Text key={e.id} fontSize="xs" fontFamily="mono" color="gray.600">{e.target}</Text>
          ))}
        </VStack>
      )}
    </Box>
  );
};

export default InspectPanel;
