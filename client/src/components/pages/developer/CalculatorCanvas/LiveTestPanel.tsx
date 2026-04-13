// client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Flex, Input, Select, Text } from "@chakra-ui/react";
import { unitLabel } from "../../../../constants/units";
import { v4 as uuidv4 } from "uuid";
import { CanvasDocument } from "./canvasStorage";
import { RateEntry } from "../../../../components/TenderPricing/calculators/types";
import RateBuildupInputs from "./RateBuildupInputs";

interface Props {
  doc: CanvasDocument;
  /** When provided, renders a collapse button in the header. Omit when embedding outside CalculatorCanvas. */
  onCollapse?: () => void;
  /** Initial quantity for the test panel. Defaults to 100. */
  initialQuantity?: number;
  /** Seed values from snapshot (params, tables, controllers). Used in tender row context. */
  initialInputs?: {
    params?: Record<string, number>;
    tables?: Record<string, RateEntry[]>;
    controllers?: Record<string, number | boolean | string[]>;
  };
  /** Fires whenever any param, table, or controller value changes. */
  onInputsChange?: (
    params: Record<string, number>,
    tables: Record<string, RateEntry[]>,
    controllers: Record<string, number | boolean | string[]>
  ) => void;
  /** Current paramNotes from snapshot. Only present in tender row context. */
  paramNotes?: Record<string, string>;
  /** Fires when a param note changes. */
  onParamNoteChange?: (paramId: string, note: string) => void;
  /** Estimator's per-Output-node selections. Only present in tender row context. */
  outputs?: Record<string, { materialId?: string; crewKindId?: string }>;
  /** Fires when the estimator picks a material or crew kind for an Output node. */
  onOutputChange?: (
    outputId: string,
    selection: { materialId?: string; crewKindId?: string }
  ) => void;
  /** Canonical unit code from the line item (e.g. "m3"). Passed to RateBuildupInputs for variant activation. */
  unit?: string;
  /** Controlled test unit — owned by parent (CalculatorCanvas) so canvas nodes stay in sync. */
  testUnit?: string;
  /** Fires when the user changes the test unit selector. */
  onTestUnitChange?: (unit: string | undefined) => void;
}

// ─── State initializers ───────────────────────────────────────────────────────

function initParams(doc: CanvasDocument, seed: Record<string, number> = {}): Record<string, number> {
  return Object.fromEntries(doc.parameterDefs.map((p) => [p.id, seed[p.id] ?? p.defaultValue]));
}

function initTables(doc: CanvasDocument, seed: Record<string, RateEntry[]> = {}): Record<string, RateEntry[]> {
  return Object.fromEntries(doc.tableDefs.map((t) => [t.id, seed[t.id] ?? [...(t.defaultRows ?? [])]]));
}

function initControllers(
  doc: CanvasDocument,
  seed: Record<string, number | boolean | string[]> = {}
): Record<string, number | boolean | string[]> {
  return Object.fromEntries(
    (doc.controllerDefs ?? []).map((c) => [
      c.id,
      seed[c.id] !== undefined
        ? seed[c.id]
        : c.type === "selector"
        ? (c.defaultSelected ?? [])
        : c.type === "toggle"
        ? (c.defaultValue as boolean ?? false)
        : (c.defaultValue as number ?? 0),
    ])
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const LiveTestPanel: React.FC<Props> = ({
  doc, onCollapse, initialQuantity, initialInputs, onInputsChange, paramNotes, onParamNoteChange,
  outputs, onOutputChange, unit, testUnit, onTestUnitChange,
}) => {
  const [quantity, setQuantity] = useState(initialQuantity ?? 100);
  const [unitPrice, setUnitPrice] = useState<number | null>(null);
  const [params, setParams] = useState(() => initParams(doc, initialInputs?.params));
  const [tables, setTables] = useState(() => initTables(doc, initialInputs?.tables));
  const [controllers, setControllers] = useState(() => initControllers(doc, initialInputs?.controllers));
  // Refs so handlers don't go stale between renders
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const tablesRef = useRef(tables);
  tablesRef.current = tables;
  const controllersRef = useRef(controllers);
  controllersRef.current = controllers;

  // Reset all state when switching to a different doc
  useEffect(() => {
    setQuantity(initialQuantity ?? 100);
    setParams(initParams(doc, initialInputs?.params));
    setTables(initTables(doc, initialInputs?.tables));
    setControllers(initControllers(doc, initialInputs?.controllers));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  // ── Change handlers ──────────────────────────────────────────────────────────

  const onParamChange = useCallback((id: string, v: number) => {
    const next = { ...paramsRef.current, [id]: v };
    setParams(next);
    onInputsChange?.(next, tablesRef.current, controllersRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onInputsChange]);

  const onUpdateRow = useCallback((tableId: string, rowId: string, field: keyof RateEntry, value: string | number) => {
    const next = {
      ...tablesRef.current,
      [tableId]: (tablesRef.current[tableId] ?? []).map((r) => r.id === rowId ? { ...r, [field]: value } : r),
    };
    setTables(next);
    onInputsChange?.(paramsRef.current, next, controllersRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onInputsChange]);

  const onAddRow = useCallback((tableId: string) => {
    const next = {
      ...tablesRef.current,
      [tableId]: [...(tablesRef.current[tableId] ?? []), { id: uuidv4(), name: "", qty: 1, ratePerHour: 0 }],
    };
    setTables(next);
    onInputsChange?.(paramsRef.current, next, controllersRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onInputsChange]);

  const onRemoveRow = useCallback((tableId: string, rowId: string) => {
    const next = {
      ...tablesRef.current,
      [tableId]: (tablesRef.current[tableId] ?? []).filter((r) => r.id !== rowId),
    };
    setTables(next);
    onInputsChange?.(paramsRef.current, next, controllersRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onInputsChange]);

  const onControllerChange = useCallback((id: string, v: number | boolean | string[]) => {
    const next = { ...controllersRef.current, [id]: v };
    setControllers(next);
    onInputsChange?.(paramsRef.current, tablesRef.current, next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onInputsChange]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box h="100%" overflowY="auto" bg="white">
      {/* Sticky header */}
      <Flex
        align="center" justify="space-between"
        px={3} py={2}
        borderBottom="1px solid" borderColor="gray.100"
        position="sticky" top={0} bg="white" zIndex={1}
        gap={2}
      >
        <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" flexShrink={0}>
          Live Test
        </Text>
        {unitPrice !== null && (
          <Text fontSize="sm" fontWeight="bold" color="gray.800" flex={1} textAlign="right">
            ${unitPrice.toFixed(2)}
            <Text as="span" fontSize="xs" fontWeight="normal" color="gray.400">/{doc.defaultUnit || "unit"}</Text>
          </Text>
        )}
        {onCollapse && (
          <Button size="xs" variant="ghost" onClick={onCollapse}
            aria-label="Collapse live test panel"
            px={1} minW="auto" color="gray.400" _hover={{ color: "gray.600" }} flexShrink={0}
          >
            «
          </Button>
        )}
      </Flex>

      <Box px={3} py={3}>
        {/* Quantity */}
        <Flex align="center" gap={2} mb={4}>
          <Text fontSize="sm" color="gray.600" flex={1}>Quantity</Text>
          <Input
            size="sm" type="number" w="80px" textAlign="right"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
          />
          <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">{doc.defaultUnit}</Text>
        </Flex>

        {/* Unit variant selector — only shown in standalone canvas editor when no unit is provided externally */}
        {!unit && (doc.unitVariants ?? []).length > 0 && (
          <Flex align="center" gap={2} mb={4}>
            <Text fontSize="sm" color="gray.600" flex={1}>Test unit</Text>
            <Select
              size="sm" w="120px"
              value={testUnit ?? ""}
              onChange={(e) => onTestUnitChange?.(e.target.value || undefined)}
            >
              {(doc.unitVariants ?? []).map((v) => (
                <option key={v.unit} value={v.unit}>
                  {unitLabel(v.unit)}
                </option>
              ))}
            </Select>
          </Flex>
        )}

        <RateBuildupInputs
          doc={doc}
          params={params}
          tables={tables}
          controllers={controllers}
          quantity={quantity}
          onParamChange={onParamChange}
          onUpdateRow={onUpdateRow}
          onAddRow={onAddRow}
          onRemoveRow={onRemoveRow}
          onControllerChange={onControllerChange}
          paramNotes={paramNotes}
          onParamNoteChange={onParamNoteChange}
          outputs={outputs}
          onOutputChange={onOutputChange}
          onResult={(r) => setUnitPrice(r.unitPrice)}
          unit={unit ?? testUnit}
        />
      </Box>
    </Box>
  );
};

export default LiveTestPanel;
