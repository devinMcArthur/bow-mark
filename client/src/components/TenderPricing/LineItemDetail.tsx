// client/src/components/TenderPricing/LineItemDetail.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CANONICAL_UNITS } from "../../constants/units";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { v4 as uuidv4 } from "uuid";
import { FiChevronDown, FiChevronUp, FiEdit2, FiExternalLink, FiTrash2, FiX } from "react-icons/fi";
import { useRouter } from "next/router";
import { useApolloClient } from "@apollo/client";
import { useSystem } from "../../contexts/System";
import { TenderPricingRow } from "./types";
import { TenderFileItem } from "../Tender/types";
import { computeRow, formatCurrency, formatMarkup } from "./compute";
import { LineItemStatus, LINE_ITEM_STATUSES, STATUS_LABELS, STATUS_COLORS } from "./statusConstants";
import type { RateEntry } from "./calculators/types";
import { RateBuildupTemplatesDocument } from "../../generated/graphql";
import {
  CanvasDocument,
  RateBuildupSnapshot,
  fragmentToDoc,
  snapshotFromTemplate,
  snapshotToCanvasDoc,
  computeSnapshotUnitPrice,
  evaluateSnapshot,
} from "../pages/developer/CalculatorCanvas/canvasStorage";
import RateBuildupInputs from "../pages/developer/CalculatorCanvas/RateBuildupInputs";
import { TemplateCard } from "../../pages/pricing";

// ── Types ────────────────────────────────────────────────────────────────────

interface SnapshotLocalState {
  params: Record<string, number>;
  tables: Record<string, RateEntry[]>;
  controllers: Record<string, number | boolean | string[]>;
  paramNotes: Record<string, string>;
  outputs: Record<string, { materialId?: string; crewKindId?: string }>;
}

//── Helpers ───────────────────────────────────────────────────────────────────

function templateSupportsUnit(templateDoc: CanvasDocument, unit: string | null | undefined): boolean {
  if (!unit) return true;                              // no unit on row — show everything
  if (!templateDoc.unitVariants?.length) return true; // no variants — compatible with all units
  return templateDoc.unitVariants.some((v) => v.unit === unit);
}

// ── AttachTemplateButton ───────────────────────────────────────────────────────

const AttachTemplateButton: React.FC<{
  onAttach: (doc: CanvasDocument) => void;
  rowUnit?: string | null;
}> = ({ onAttach, rowUnit }) => {
  const client = useApolloClient();
  const [templates, setTemplates] = useState<CanvasDocument[]>([]);
  const [open, setOpen] = useState(false);

  const handleOpen = async () => {
    const { data } = await client.query({
      query: RateBuildupTemplatesDocument,
      fetchPolicy: "network-only",
    });
    setTemplates((data?.rateBuildupTemplates ?? []).map(fragmentToDoc));
    setOpen(true);
  };

  const filtered = React.useMemo(
    () => templates.filter((t) => templateSupportsUnit(t, rowUnit)),
    [templates, rowUnit]
  );

  return (
    <>
      <Button size="xs" colorScheme="blue" variant="outline" onClick={handleOpen}>
        + Attach Template
      </Button>
      {open && (
        <Box
          position="fixed" inset={0} zIndex={100}
          bg="blackAlpha.600"
          display="flex" alignItems="center" justifyContent="center"
          onClick={() => setOpen(false)}
        >
          <Box
            bg="white" rounded="lg" overflow="hidden"
            w="560px" maxW="90vw" maxH="70vh"
            display="flex" flexDirection="column"
            onClick={(e) => e.stopPropagation()}
          >
            <Box px={5} py={3} borderBottom="1px solid" borderColor="gray.100" flexShrink={0} bg="gray.50">
              <Text fontWeight="semibold" fontSize="sm" color="gray.800">Select a Rate Buildup Template</Text>
            </Box>
            <Box overflowY="auto" flex={1}>
              {templates.length === 0 ? (
                <Text fontSize="sm" color="gray.400" p={5}>No templates found.</Text>
              ) : filtered.length === 0 ? (
                <Text fontSize="xs" color="gray.400" p={5}>
                  No buildups found for unit &quot;{rowUnit}&quot;. Add a unit variant in the canvas editor or change the line item unit.
                </Text>
              ) : (
                <Box borderColor="gray.100">
                  {filtered.map((t, i) => (
                    <TemplateCard
                      key={t.id}
                      doc={t}
                      index={i}
                      cardH={96}
                      previewW={120}
                      onClick={() => { onAttach(t); setOpen(false); }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

interface LineItemDetailProps {
  row: TenderPricingRow;
  defaultMarkupPct: number;
  sheetId: string;
  tenderId: string;
  onUpdate: (rowId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
  tenderFiles?: TenderFileItem[];
  activeDocFile?: string;
  activeDocPage?: number;
  onDocRefAdd?: (rowId: string, enrichedFileId: string, page: number, description?: string) => Promise<void>;
  onDocRefRemove?: (rowId: string, docRefId: string) => Promise<void>;
  onDocRefUpdate?: (rowId: string, docRefId: string, description: string | null) => Promise<void>;
  onDocRefClick?: (enrichedFileId: string, page: number) => void;
}

const LineItemDetail: React.FC<LineItemDetailProps> = ({
  row,
  defaultMarkupPct,
  sheetId,
  tenderId,
  onUpdate,
  onClose,
  tenderFiles,
  activeDocFile,
  activeDocPage,
  onDocRefAdd,
  onDocRefRemove,
  onDocRefUpdate,
  onDocRefClick,
}) => {
  const { state: { system } } = useSystem();
  const router = useRouter();
  const toast = useToast();

  const [itemNumber, setItemNumber] = useState(row.itemNumber ?? "");
  const [description, setDescription] = useState(row.description ?? "");
  const [quantity, setQuantity] = useState(row.quantity != null ? String(row.quantity) : "");
  const [unit, setUnit] = useState(row.unit ?? "");
  const [unitPrice, setUnitPrice] = useState(row.unitPrice != null ? String(row.unitPrice) : "");
  const [markup, setMarkup] = useState(row.markupOverride != null ? String(row.markupOverride) : "");
  const [notes, setNotes] = useState(row.notes ?? "");

  useEffect(() => {
    setItemNumber(row.itemNumber ?? "");
    setDescription(row.description ?? "");
    setQuantity(row.quantity != null ? String(row.quantity) : "");
    setUnit(row.unit ?? "");
    setUnitPrice(row.unitPrice != null ? String(row.unitPrice) : "");
    setMarkup(row.markupOverride != null ? String(row.markupOverride) : "");
    setNotes(row.notes ?? "");
  }, [row._id]);

  const commitStr = (field: string, val: string) => {
    onUpdate(row._id, { [field]: val || null });
  };

  const commitNum = (field: string, val: string) => {
    const n = parseFloat(val);
    onUpdate(row._id, { [field]: isNaN(n) ? null : n });
  };

  const commitMarkup = (val: string) => {
    const trimmed = val.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === "+") {
      onUpdate(row._id, { markupOverride: null });
    } else {
      const n = parseFloat(trimmed);
      onUpdate(row._id, { markupOverride: isNaN(n) || n === 0 ? null : n });
    }
  };

  // Parse all snapshot entries into usable objects.
  // Snapshots saved before outputDefs existed won't have the field — default
  // it here so downstream code (RateBuildupInputs, CanvasFlow, etc.) can
  // assume it's always an array.
  const parsedSnapshots = useMemo<{ snapshot: RateBuildupSnapshot; memo: string; doc: CanvasDocument }[]>(() => {
    return (row.rateBuildupSnapshots ?? []).map((entry) => {
      try {
        const raw = JSON.parse(entry.snapshot) as RateBuildupSnapshot;
        const snapshot = { ...raw, outputDefs: raw.outputDefs ?? [] };
        return { snapshot, memo: entry.memo ?? "", doc: snapshotToCanvasDoc(snapshot) };
      } catch { return null; }
    }).filter(Boolean) as { snapshot: RateBuildupSnapshot; memo: string; doc: CanvasDocument }[];
  }, [row.rateBuildupSnapshots]);

  const hasRateBuildup = parsedSnapshots.length > 0;

  // Per-snapshot local state — reset when switching rows
  const [snapshotStates, setSnapshotStates] = useState<SnapshotLocalState[]>(() =>
    parsedSnapshots.map((s) => ({
      params: s.snapshot.params ?? {},
      tables: s.snapshot.tables ?? {},
      controllers: s.snapshot.controllers ?? {},
      paramNotes: s.snapshot.paramNotes ?? {},
      outputs: s.snapshot.outputs ?? {},
    }))
  );
  const [snapResults, setSnapResults] = useState<({ unitPrice: number; breakdown: { id: string; label: string; value: number }[] } | null)[]>(
    () => parsedSnapshots.map(() => null)
  );
  const [buildupExpanded, setBuildupExpanded] = useState<boolean[]>(() => parsedSnapshots.map(() => true));
  const [extraUnitPrice, setExtraUnitPrice] = useState(row.extraUnitPrice != null ? String(row.extraUnitPrice) : "");
  const [extraUnitPriceMemo, setExtraUnitPriceMemo] = useState(row.extraUnitPriceMemo ?? "");

  useEffect(() => {
    setSnapshotStates(
      parsedSnapshots.map((s) => ({
        params: s.snapshot.params ?? {},
        tables: s.snapshot.tables ?? {},
        controllers: s.snapshot.controllers ?? {},
        paramNotes: s.snapshot.paramNotes ?? {},
        outputs: s.snapshot.outputs ?? {},
      }))
    );
    setSnapResults(parsedSnapshots.map(() => null));
    setBuildupExpanded(parsedSnapshots.map(() => true));
    setExtraUnitPrice(row.extraUnitPrice != null ? String(row.extraUnitPrice) : "");
    setExtraUnitPriceMemo(row.extraUnitPriceMemo ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row._id]);

  // Synchronously compute the correct summed unit price from all saved snapshots.
  // This is the source of truth for display and reconciliation.
  const snapshotUnitPrice = useMemo<number | null>(() => {
    if (parsedSnapshots.length === 0) return null;
    let total = 0;
    for (const s of parsedSnapshots) {
      total += computeSnapshotUnitPrice(s.snapshot, row.quantity ?? 1, row.unit ?? undefined);
    }
    return total || null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedSnapshots, row.quantity, row.unit]);

  // Reconcile on open or quantity change: if the stored unitPrice doesn't match what the
  // snapshots actually compute, save the correct value immediately.
  useEffect(() => {
    if (snapshotUnitPrice === null) return;
    if (Math.abs(snapshotUnitPrice - (row.unitPrice ?? 0)) > 0.001) {
      onUpdate(row._id, { unitPrice: snapshotUnitPrice });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row._id, row.quantity]);

  const quantityRef = useRef(quantity);
  quantityRef.current = quantity;

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((updatedStates: SnapshotLocalState[]) => {
    if (parsedSnapshots.length === 0) return;
    const entries: { snapshot: string; memo: string }[] = [];
    let totalUP = 0;
    const allOutputs: any[] = [];

    for (let i = 0; i < parsedSnapshots.length; i++) {
      const base = parsedSnapshots[i].snapshot;
      const state = updatedStates[i];
      if (!state) continue;
      const updated: RateBuildupSnapshot = {
        ...base,
        params: state.params,
        tables: state.tables,
        controllers: state.controllers,
        paramNotes: state.paramNotes,
        outputs: state.outputs,
      };
      const { unitPrice, outputs } = evaluateSnapshot(
        updated,
        parseFloat(quantityRef.current) || 1,
        row.unit ?? undefined
      );
      totalUP += unitPrice;
      allOutputs.push(...outputs);
      entries.push({
        snapshot: JSON.stringify(updated),
        memo: (row.rateBuildupSnapshots ?? [])[i]?.memo ?? "",
      });
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onUpdate(row._id, {
        rateBuildupSnapshots: entries,
        unitPrice: totalUP || null,
        rateBuildupOutputs: allOutputs,
      });
    }, 500);
  }, [parsedSnapshots, row._id, row.unit, row.rateBuildupSnapshots, onUpdate]);

  // Per-snapshot change handlers — each updates the correct index in snapshotStates
  const updateSnapshotAndSave = useCallback((index: number, updater: (state: SnapshotLocalState) => SnapshotLocalState) => {
    let nextStates: SnapshotLocalState[];
    setSnapshotStates(prev => {
      nextStates = [...prev];
      nextStates[index] = updater(nextStates[index]);
      return nextStates;
    });
    scheduleSave(nextStates!);
  }, [scheduleSave]);

  const makeSnapshotHandlers = useCallback((index: number) => ({
    onParamChange: (id: string, v: number) => {
      updateSnapshotAndSave(index, s => ({ ...s, params: { ...s.params, [id]: v } }));
    },
    onUpdateRow: (tableId: string, rowId: string, field: keyof RateEntry, value: string | number) => {
      updateSnapshotAndSave(index, s => ({
        ...s,
        tables: { ...s.tables, [tableId]: (s.tables[tableId] ?? []).map(r => r.id === rowId ? { ...r, [field]: value } : r) },
      }));
    },
    onAddRow: (tableId: string) => {
      updateSnapshotAndSave(index, s => ({
        ...s,
        tables: { ...s.tables, [tableId]: [...(s.tables[tableId] ?? []), { id: uuidv4(), name: "", qty: 1, ratePerHour: 0 }] },
      }));
    },
    onRemoveRow: (tableId: string, rowId: string) => {
      updateSnapshotAndSave(index, s => ({
        ...s,
        tables: { ...s.tables, [tableId]: (s.tables[tableId] ?? []).filter(r => r.id !== rowId) },
      }));
    },
    onControllerChange: (id: string, v: number | boolean | string[]) => {
      updateSnapshotAndSave(index, s => ({ ...s, controllers: { ...s.controllers, [id]: v } }));
    },
    onParamNoteChange: (paramId: string, note: string) => {
      updateSnapshotAndSave(index, s => ({ ...s, paramNotes: { ...s.paramNotes, [paramId]: note } }));
    },
    onOutputChange: (outputId: string, selection: { materialId?: string; crewKindId?: string }) => {
      updateSnapshotAndSave(index, s => ({ ...s, outputs: { ...s.outputs, [outputId]: selection } }));
    },
  }), [updateSnapshotAndSave]);

  // Remove a snapshot at a given index
  const removeSnapshot = useCallback((index: number) => {
    const updated = (row.rateBuildupSnapshots ?? [])
      .filter((_, i) => i !== index)
      .map(e => ({ snapshot: e.snapshot, memo: e.memo ?? "" }));

    let totalUP = 0;
    const allOutputs: any[] = [];
    for (const entry of updated) {
      try {
        const snap = JSON.parse(entry.snapshot) as RateBuildupSnapshot;
        const { unitPrice, outputs } = evaluateSnapshot(snap, row.quantity ?? 1, row.unit ?? undefined);
        totalUP += unitPrice;
        allOutputs.push(...outputs);
      } catch {}
    }

    onUpdate(row._id, {
      rateBuildupSnapshots: updated,
      unitPrice: updated.length > 0 ? (totalUP || null) : null,
      rateBuildupOutputs: updated.length > 0 ? allOutputs : null,
    });
  }, [row._id, row.rateBuildupSnapshots, row.quantity, row.unit, onUpdate]);

  // Update memo for a specific snapshot
  const updateMemo = useCallback((index: number, memo: string) => {
    const updated = (row.rateBuildupSnapshots ?? []).map((e, i) =>
      i === index ? { snapshot: e.snapshot, memo } : { snapshot: e.snapshot, memo: e.memo ?? "" }
    );
    onUpdate(row._id, { rateBuildupSnapshots: updated });
  }, [row._id, row.rateBuildupSnapshots, onUpdate]);

  const attachTemplate = useCallback((templateDoc: CanvasDocument) => {
    const snapshot = snapshotFromTemplate(templateDoc);
    const { unitPrice: newUP, outputs: newOutputs } = evaluateSnapshot(
      snapshot, row.quantity ?? 1, row.unit ?? templateDoc.defaultUnit ?? undefined
    );
    const newEntry = { snapshot: JSON.stringify(snapshot), memo: "" };
    const existing = (row.rateBuildupSnapshots ?? []).map(e => ({ snapshot: e.snapshot, memo: e.memo ?? "" }));
    const updatedEntries = [...existing, newEntry];

    let totalUP = newUP;
    const allOutputs = [...newOutputs];
    for (const s of parsedSnapshots) {
      const { unitPrice, outputs } = evaluateSnapshot(s.snapshot, row.quantity ?? 1, row.unit ?? undefined);
      totalUP += unitPrice;
      allOutputs.push(...outputs);
    }

    onUpdate(row._id, {
      rateBuildupSnapshots: updatedEntries,
      unit: row.unit || templateDoc.defaultUnit || null,
      unitPrice: totalUP || null,
      rateBuildupOutputs: allOutputs,
    });
  }, [row._id, row.quantity, row.unit, row.rateBuildupSnapshots, parsedSnapshots, onUpdate]);

  // Sum unit prices from all snapResults (when computed), else fall back to snapshotUnitPrice
  const snapResultSum = useMemo(() => {
    if (snapResults.some(r => r != null)) {
      return snapResults.reduce((sum, r) => sum + (r?.unitPrice ?? 0), 0);
    }
    return null;
  }, [snapResults]);

  const previewRow: TenderPricingRow = {
    ...row,
    unitPrice: hasRateBuildup ? (snapResultSum ?? snapshotUnitPrice ?? row.unitPrice) : (parseFloat(unitPrice) || null),
    quantity: parseFloat(quantity) || null,
    markupOverride: (() => {
      const t = markup.trim();
      if (!t || t === "-" || t === "+") return null;
      const n = parseFloat(t);
      return isNaN(n) || n === 0 ? null : n;
    })(),
  };
  const { totalUP, effectiveMarkup, suggestedBidUP, lineItemTotal } = computeRow(
    previewRow,
    defaultMarkupPct
  );
  const hasMarkupOverride = previewRow.markupOverride != null;

  return (
    <Flex direction="column" h="100%" bg="white">
      {/* ── Compact context bar ─────────────────────────────────────── */}
      <Flex
        align="center"
        justify="space-between"
        px={4}
        h="40px"
        borderBottom="1px solid"
        borderColor="gray.100"
        flexShrink={0}
        gap={2}
      >
        <Flex align="center" gap={2} minW={0}>
          {row.itemNumber && (
            <Text fontSize="xs" fontWeight="semibold" color="orange.500" letterSpacing="wide" flexShrink={0}>
              {row.itemNumber}
            </Text>
          )}
          <Text fontSize="sm" fontWeight="medium" color="gray.600" noOfLines={1}>
            {row.description || (
              <Text as="span" color="gray.400" fontStyle="italic" fontWeight="normal">
                Untitled item
              </Text>
            )}
          </Text>
        </Flex>
        <IconButton
          aria-label="Close detail"
          icon={<FiX size={14} />}
          size="xs"
          variant="ghost"
          color="gray.400"
          _hover={{ color: "gray.700", bg: "gray.100" }}
          onClick={onClose}
          flexShrink={0}
        />
      </Flex>

      {/* ── Form ────────────────────────────────────────────────────── */}
      <Box px={5} pb={5} overflowY="auto" flex={1} overscrollBehavior="contain">

        {/* ── Line item details ── */}
        <Box pt={4} mb={5}>

        {/* ── DETAILS SECTION with status pills ── */}
        <Flex align="center" justify="space-between" mb={2}>
          <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wider">
            Details
          </Text>
          <Flex gap={1.5} flexWrap="wrap">
            {LINE_ITEM_STATUSES.map((s) => {
              const active = s === ((row.status as LineItemStatus) ?? "not_started");
              return (
                <Flex
                  key={s}
                  align="center"
                  gap={1}
                  px={2}
                  py={0.5}
                  borderRadius="full"
                  cursor="pointer"
                  border="1px solid"
                  borderColor={active ? STATUS_COLORS[s] : "gray.200"}
                  bg={active ? `${STATUS_COLORS[s]}18` : "transparent"}
                  _hover={{ borderColor: STATUS_COLORS[s] }}
                  transition="all 0.15s"
                  onClick={() => onUpdate(row._id, { status: s })}
                >
                  <Box w="6px" h="6px" borderRadius="full" bg={STATUS_COLORS[s]} flexShrink={0} />
                  <Text fontSize="10px" fontWeight={active ? "semibold" : "normal"} color={active ? "gray.800" : "gray.500"} whiteSpace="nowrap">
                    {STATUS_LABELS[s]}
                  </Text>
                </Flex>
              );
            })}
          </Flex>
        </Flex>

        {/* Item # + Description */}
        <Grid templateColumns="80px 1fr" gap={3} mb={3}>
          <FormControl>
            <FormLabel fontSize="xs" color="gray.400" fontWeight="medium" mb={1}>Item #</FormLabel>
            <Input
              size="sm"
              value={itemNumber}
              onChange={(e) => setItemNumber(e.target.value)}
              onBlur={() => commitStr("itemNumber", itemNumber)}
              placeholder="—"
              bg="gray.50"
              _focus={{ bg: "white", borderColor: "orange.400", boxShadow: "0 0 0 1px #fb923c" }}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="xs" color="gray.400" fontWeight="medium" mb={1}>Description</FormLabel>
            <Input
              size="sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => commitStr("description", description)}
              placeholder="Line item description"
              bg="gray.50"
              _focus={{ bg: "white", borderColor: "orange.400", boxShadow: "0 0 0 1px #fb923c" }}
            />
          </FormControl>
        </Grid>

        {/* ── Rate Buildup CTA (no-buildup only) ── */}
        {!hasRateBuildup && (
          <Box
            bg="blue.50" border="1px dashed" borderColor="blue.200"
            rounded="lg" p={4} mb={4} textAlign="center"
          >
            <Text fontSize="sm" fontWeight="medium" color="blue.700" mb={1}>
              Use a Rate Buildup Template
            </Text>
            <Text fontSize="xs" color="blue.500" mb={3}>
              Build your unit price from crew rates, equipment, materials, and production rates
            </Text>
            <AttachTemplateButton rowUnit={row.unit} onAttach={attachTemplate} />
            <Text fontSize="10px" color="gray.400" mt={3}>
              or enter a unit price manually below
            </Text>
          </Box>
        )}

        {/* ── PRICING SECTION (no-buildup only) — after details ── */}
        {!hasRateBuildup && (
          <Box
            bg="orange.50" border="1px solid" borderColor="orange.200"
            rounded="lg" p={3} mb={4}
          >
            <Text fontSize="xs" fontWeight="semibold" color="orange.400" textTransform="uppercase" letterSpacing="wider" mb={3}>
              Pricing
            </Text>
            <FormControl mb={3}>
              <FormLabel fontSize="xs" color="orange.700" fontWeight="medium" mb={1}>Unit Price</FormLabel>
              <InputGroup size="md">
                <InputLeftAddon
                  bg="orange.100" color="orange.600"
                  borderColor="orange.200" fontWeight="semibold"
                  fontSize="sm" px={3}
                >
                  $
                </InputLeftAddon>
                <Input
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  onBlur={() => commitNum("unitPrice", unitPrice)}
                  placeholder="0.00"
                  bg="white"
                  borderColor="orange.200"
                  fontSize="lg"
                  fontWeight="semibold"
                  color="gray.800"
                  _focus={{ borderColor: "orange.400", boxShadow: "0 0 0 1px #fb923c" }}
                  _placeholder={{ color: "orange.200", fontWeight: "normal", fontSize: "md" }}
                />
              </InputGroup>
            </FormControl>
            <Grid templateColumns="1fr 1fr" gap={3}>
              <FormControl>
                <FormLabel fontSize="xs" color="orange.700" fontWeight="medium" mb={1}>Quantity</FormLabel>
                <Input
                  size="sm"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onBlur={() => commitNum("quantity", quantity)}
                  placeholder="—"
                  bg="white"
                  borderColor="orange.200"
                  _focus={{ borderColor: "orange.400", boxShadow: "0 0 0 1px #fb923c" }}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" color="orange.700" fontWeight="medium" mb={1}>Unit</FormLabel>
                <select
                  value={unit}
                  onChange={(e) => { setUnit(e.target.value); onUpdate(row._id, { unit: e.target.value || null }); }}
                  style={{
                    width: "100%", fontSize: "0.875rem",
                    background: "white", border: "1px solid #fed7aa",
                    borderRadius: "6px", padding: "0 8px", height: "32px",
                    cursor: "pointer", color: unit ? "#1A202C" : "#A0AEC0", outline: "none",
                  }}
                >
                  <option value="">—</option>
                  {CANONICAL_UNITS.map((u) => <option key={u.code} value={u.code}>{u.label}</option>)}
                  {(system?.unitExtras ?? []).map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </FormControl>
            </Grid>
          </Box>
        )}

        {/* Qty + Unit — featured card when there IS a buildup */}
        {hasRateBuildup && (
          <Box bg="gray.50" border="1px solid" borderColor="gray.200" rounded="lg" p={3} mb={4}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wider" mb={3}>
              Quantity
            </Text>
            <Grid templateColumns="1fr 1fr" gap={3}>
              <FormControl>
                <FormLabel fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>Quantity</FormLabel>
                <Input
                  size="md"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onBlur={() => {
                    commitNum("quantity", quantity);
                    scheduleSave(snapshotStates);
                  }}
                  placeholder="—"
                  bg="white"
                  borderColor="gray.200"
                  fontSize="lg"
                  fontWeight="semibold"
                  color="gray.800"
                  _focus={{ borderColor: "orange.400", boxShadow: "0 0 0 1px #fb923c" }}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>Unit</FormLabel>
                <select
                  value={unit}
                  onChange={(e) => { setUnit(e.target.value); onUpdate(row._id, { unit: e.target.value || null }); }}
                  style={{
                    width: "100%", fontSize: "0.875rem",
                    background: "white", border: "1px solid #E2E8F0",
                    borderRadius: "6px", padding: "0 8px", height: "40px",
                    cursor: "pointer", color: unit ? "#1A202C" : "#A0AEC0", outline: "none",
                  }}
                >
                  <option value="">—</option>
                  {CANONICAL_UNITS.map((u) => <option key={u.code} value={u.code}>{u.label}</option>)}
                  {(system?.unitExtras ?? []).map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </FormControl>
            </Grid>
          </Box>
        )}

        {/* Markup — compact inline row */}
        <Flex align="center" gap={3} mb={3} px={1} justify="flex-end">
          {hasMarkupOverride && (
            <Text fontSize="10px" color="gray.400" whiteSpace="nowrap">
              (base {defaultMarkupPct}%)
            </Text>
          )}
          <Text fontSize="xs" color="gray.400" fontWeight="medium" whiteSpace="nowrap">Markup</Text>
          <Text fontSize="sm" fontWeight="semibold" color={hasMarkupOverride ? "orange.700" : "gray.600"}>
            {effectiveMarkup}%
          </Text>
          <Flex align="center" gap={1}>
            <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">Override:</Text>
            <Input
              size="xs"
              w="52px"
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
              onBlur={() => commitMarkup(markup)}
              placeholder="—"
              textAlign="center"
              bg={hasMarkupOverride ? "orange.50" : "gray.50"}
              borderColor={hasMarkupOverride ? "orange.200" : "gray.200"}
              _focus={{ bg: "white", borderColor: "orange.400", boxShadow: "0 0 0 1px #fb923c" }}
            />
            <Text fontSize="xs" color="gray.400">%</Text>
          </Flex>
        </Flex>

        {/* Notes */}
        <FormControl mb={4}>
          <FormLabel fontSize="xs" color="gray.400" fontWeight="medium" mb={1}>Notes</FormLabel>
          <Textarea
            size="sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => commitStr("notes", notes)}
            rows={2}
            placeholder="Optional notes…"
            resize="none"
            bg="gray.50"
            _focus={{ bg: "white", borderColor: "orange.400", boxShadow: "0 0 0 1px #fb923c" }}
          />
        </FormControl>

        {/* Computed summary */}
        <Grid templateColumns="repeat(4, 1fr)" gap={0} borderWidth={1} borderColor="gray.200" rounded="lg" overflow="hidden">
          <StatCell label="Unit Price" value={totalUP > 0 ? `$${totalUP.toFixed(2)}` : "—"} borderRight />
          <StatCell
            label="Markup" value={`${effectiveMarkup}%`}
            subValue={hasMarkupOverride ? formatMarkup(previewRow.markupOverride) : "default"}
            subColor={hasMarkupOverride ? "orange.500" : "gray.400"}
            borderRight
          />
          <StatCell label="Bid UP" value={suggestedBidUP > 0 ? `$${suggestedBidUP.toFixed(2)}` : "—"} borderRight />
          <StatCell label="Line Total" value={lineItemTotal > 0 ? formatCurrency(lineItemTotal) : "—"} highlight />
        </Grid>
        </Box>{/* end details Box */}

        {/* ── Rate Buildups (below details) ── */}
        <Box borderTop="1px solid" borderColor="gray.100">
          {hasRateBuildup ? (
            <Box>
              {/* Section header with Attach button */}
              <Flex
                align="center" justify="space-between"
                position="sticky" top={0} zIndex={3}
                mx={-5} px={5} py={2}
                bg="white"
                borderBottom="1px solid" borderColor="gray.100"
                boxShadow="0 2px 8px rgba(0,0,0,0.05)"
              >
                <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wider">
                  Rate Buildups ({parsedSnapshots.length})
                </Text>
                <AttachTemplateButton rowUnit={row.unit} onAttach={attachTemplate} />
              </Flex>

              {/* Summary bar — sums breakdown values across all snapshots */}
              {(snapResults.some(r => r != null) || row.unitPrice != null) && (
                <Flex gap={0} borderBottom="1px solid" borderColor="gray.100" mx={-5} px={5}>
                  {(() => {
                    // Merge breakdown categories across all snapResults
                    const merged = new Map<string, { id: string; label: string; value: number }>();
                    for (const r of snapResults) {
                      if (!r) continue;
                      for (const cat of r.breakdown) {
                        const existing = merged.get(cat.id);
                        if (existing) {
                          existing.value += cat.value;
                        } else {
                          merged.set(cat.id, { ...cat });
                        }
                      }
                    }
                    return Array.from(merged.values()).map((cat) => (
                      <Box key={cat.id} px={3} py={1.5} flex={1} borderRight="1px solid" borderColor="gray.100">
                        <Text fontSize="9px" fontWeight="medium" color="gray.400" textTransform="uppercase" letterSpacing="wide">
                          {cat.label}
                        </Text>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                          ${cat.value.toFixed(2)}
                        </Text>
                      </Box>
                    ));
                  })()}
                  {(row.extraUnitPrice ?? 0) !== 0 && (
                    <Box px={3} py={1.5} borderRight="1px solid" borderColor="gray.100">
                      <Text fontSize="9px" fontWeight="medium" color="gray.400" textTransform="uppercase" letterSpacing="wide">
                        {row.extraUnitPriceMemo || "Extra"}
                      </Text>
                      <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                        +${(row.extraUnitPrice ?? 0).toFixed(2)}
                      </Text>
                    </Box>
                  )}
                  <Box px={3} py={1.5} minW="80px" bg="orange.50" ml="auto">
                    <Text fontSize="9px" fontWeight="medium" color="orange.400" textTransform="uppercase" letterSpacing="wide">
                      Unit Price
                    </Text>
                    <Text data-testid="buildup-unit-price" fontSize="xs" fontWeight="bold" color="orange.700">
                      ${((snapResultSum ?? row.unitPrice ?? 0) + (row.extraUnitPrice ?? 0)).toFixed(2)}
                    </Text>
                  </Box>
                </Flex>
              )}

              {/* Per-snapshot cards */}
              {parsedSnapshots.map((ps, index) => {
                const expanded = buildupExpanded[index] ?? true;
                const state = snapshotStates[index];
                const handlers = makeSnapshotHandlers(index);
                const label = ps.snapshot.label ?? "Buildup";
                const thisSnapUP = snapResults[index]?.unitPrice ??
                  computeSnapshotUnitPrice(ps.snapshot, row.quantity ?? 1, row.unit ?? undefined);

                return (
                  <Box key={`${ps.snapshot.sourceTemplateId ?? ps.snapshot.id}-${index}`} borderBottom="1px solid" borderColor="gray.100">
                    {/* Collapsible header */}
                    <Flex align="center" gap={0}>
                      <Flex
                        align="center" gap={2} flex={1} minW={0}
                        py={2} px={1} pr={2}
                        cursor="pointer"
                        role="button"
                        onClick={() => setBuildupExpanded(prev => {
                          const next = [...prev];
                          next[index] = !next[index];
                          return next;
                        })}
                        sx={{ "&:hover .snap-chevron": { color: "gray.700" } }}
                      >
                        <Flex
                          className="snap-chevron"
                          align="center" justify="center"
                          w="18px" h="18px"
                          rounded="md"
                          bg={expanded ? "orange.100" : "gray.100"}
                          color={expanded ? "orange.600" : "gray.400"}
                          flexShrink={0}
                          transition="all 0.15s"
                        >
                          {expanded ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />}
                        </Flex>
                        <Text fontSize="sm" fontWeight="medium" color="gray.700" noOfLines={1} flex={1}>
                          {label}
                        </Text>
                        <Input
                          size="xs"
                          w="120px"
                          defaultValue={ps.memo}
                          placeholder="memo..."
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => updateMemo(index, e.target.value)}
                          bg="gray.50"
                          borderColor="gray.200"
                          fontSize="xs"
                          _focus={{ bg: "white", borderColor: "orange.400", boxShadow: "0 0 0 1px #fb923c" }}
                          flexShrink={0}
                        />
                        <Text fontSize="xs" fontWeight="semibold" color="orange.600" flexShrink={0} ml={2}>
                          ${thisSnapUP.toFixed(2)}
                        </Text>
                      </Flex>
                      {/* Action buttons */}
                      <Flex align="center" gap={0.5} flexShrink={0} pr={1}>
                        <IconButton
                          aria-label="Edit buildup"
                          icon={<FiEdit2 size={11} />}
                          size="xs" variant="ghost"
                          color="gray.400" _hover={{ color: "orange.500", bg: "orange.50" }}
                          onClick={() => {
                            const q = parseFloat(quantity);
                            const qs = !isNaN(q) && q > 0 ? `?quantity=${q}` : "";
                            const si = `${qs ? "&" : "?"}snapshotIndex=${index}`;
                            const us = row.unit ? `&unit=${encodeURIComponent(row.unit)}` : "";
                            router.push(`/tender/${tenderId}/pricing/row/${row._id}${qs}${si}${us}`);
                          }}
                        />
                        <IconButton
                          aria-label="Remove buildup"
                          icon={<FiTrash2 size={11} />}
                          size="xs" variant="ghost"
                          color="gray.400" _hover={{ color: "red.500", bg: "red.50" }}
                          onClick={() => removeSnapshot(index)}
                        />
                      </Flex>
                    </Flex>

                    {/* Expanded: RateBuildupInputs */}
                    {state && (
                      <Box pt={3} pb={4} px={1} display={expanded ? "block" : "none"}>
                        <RateBuildupInputs
                          doc={ps.doc}
                          params={state.params}
                          tables={state.tables}
                          controllers={state.controllers}
                          quantity={parseFloat(quantity) || 1}
                          onParamChange={handlers.onParamChange}
                          onUpdateRow={handlers.onUpdateRow}
                          onAddRow={handlers.onAddRow}
                          onRemoveRow={handlers.onRemoveRow}
                          onControllerChange={handlers.onControllerChange}
                          paramNotes={state.paramNotes}
                          onParamNoteChange={handlers.onParamNoteChange}
                          outputs={state.outputs}
                          onOutputChange={handlers.onOutputChange}
                          columns={2}
                          onResult={(result) => {
                            setSnapResults(prev => {
                              const next = [...prev];
                              next[index] = result;
                              return next;
                            });
                          }}
                          unit={row.unit ?? undefined}
                        />
                      </Box>
                    )}
                  </Box>
                );
              })}

              {/* Extra unit price */}
              <Box borderTop="1px solid" borderColor="gray.100" px={1} pt={4} pb={5}>
                <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wider" mb={3}>
                  Additional Cost
                </Text>
                <Grid templateColumns="140px 1fr" gap={3}>
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>Extra $/unit</FormLabel>
                    <InputGroup size="sm">
                      <InputLeftAddon bg="gray.100" color="gray.500" borderColor="gray.200" fontSize="xs" px={2}>+$</InputLeftAddon>
                      <Input
                        value={extraUnitPrice}
                        onChange={(e) => setExtraUnitPrice(e.target.value)}
                        onBlur={() => {
                          const n = parseFloat(extraUnitPrice);
                          onUpdate(row._id, { extraUnitPrice: isNaN(n) ? null : n });
                        }}
                        placeholder="0.00"
                        bg="gray.50"
                        borderColor="gray.200"
                        _focus={{ bg: "white", borderColor: "orange.400", boxShadow: "0 0 0 1px #fb923c" }}
                      />
                    </InputGroup>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>Memo</FormLabel>
                    <Input
                      size="sm"
                      value={extraUnitPriceMemo}
                      onChange={(e) => setExtraUnitPriceMemo(e.target.value)}
                      onBlur={() => onUpdate(row._id, { extraUnitPriceMemo: extraUnitPriceMemo || null })}
                      placeholder="Subcontractor, haul-off, etc."
                      bg="gray.50"
                      borderColor="gray.200"
                      _focus={{ bg: "white", borderColor: "orange.400", boxShadow: "0 0 0 1px #fb923c" }}
                    />
                  </FormControl>
                </Grid>
              </Box>
            </Box>
          ) : null}
        </Box>

        {/* ── Spec References ── */}
        {(onDocRefAdd || (row.docRefs ?? []).length > 0) && (
          <Box borderTop="1px solid" borderColor="gray.100" pt={4} pb={5}>
            <Flex align="center" justify="space-between" mb={3}>
              <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wider">
                Spec References
              </Text>
              {activeDocFile && activeDocPage != null && (() => {
                const alreadyAttached = (row.docRefs ?? []).some(
                  (r) => r.enrichedFileId === activeDocFile && r.page === activeDocPage
                );
                return (
                  <Button
                    size="xs"
                    colorScheme={alreadyAttached ? "gray" : "blue"}
                    variant="outline"
                    isDisabled={alreadyAttached}
                    onClick={() => {
                      if (alreadyAttached) {
                        toast({
                          title: "Already attached",
                          description: `p.${activeDocPage} is already linked to this item.`,
                          status: "info",
                          duration: 2500,
                          isClosable: true,
                        });
                        return;
                      }
                      onDocRefAdd?.(row._id, activeDocFile, activeDocPage);
                    }}
                  >
                    {alreadyAttached ? "Already attached" : `+ Use current page (p.${activeDocPage})`}
                  </Button>
                );
              })()}
            </Flex>

            {(row.docRefs ?? []).length === 0 ? (
              <Text fontSize="xs" color="gray.400">
                No references attached. Navigate to a page in the Documents panel, then click &quot;Use current page&quot;.
              </Text>
            ) : (
              <Flex direction="column" gap={2}>
                {(row.docRefs ?? []).map((ref) => {
                  const file = tenderFiles?.find((f) => f._id === ref.enrichedFileId);
                  const fileName = file?.file.description ?? ref.enrichedFileId.slice(-6);
                  return (
                    <Box
                      key={ref._id}
                      border="1px solid"
                      borderColor="gray.200"
                      rounded="md"
                      px={3}
                      py={2}
                      bg="gray.50"
                    >
                      <Flex align="center" gap={2} mb={ref.description != null ? 1.5 : 0}>
                        <Text
                          fontSize="xs"
                          color="blue.600"
                          fontWeight="medium"
                          flex={1}
                          minW={0}
                          isTruncated
                          cursor="pointer"
                          _hover={{ textDecoration: "underline" }}
                          onClick={() => onDocRefClick?.(ref.enrichedFileId, ref.page)}
                          title={fileName}
                        >
                          {fileName}
                        </Text>
                        <Text fontSize="xs" color="gray.500" flexShrink={0}>
                          p.{ref.page}
                        </Text>
                        <IconButton
                          aria-label="Open page"
                          icon={<FiExternalLink size={11} />}
                          size="xs"
                          variant="ghost"
                          color="gray.400"
                          _hover={{ color: "blue.500" }}
                          onClick={() => onDocRefClick?.(ref.enrichedFileId, ref.page)}
                        />
                        <IconButton
                          aria-label="Remove reference"
                          icon={<FiTrash2 size={11} />}
                          size="xs"
                          variant="ghost"
                          color="gray.400"
                          _hover={{ color: "red.500", bg: "red.50" }}
                          onClick={() => onDocRefRemove?.(row._id, ref._id)}
                        />
                      </Flex>
                      <Input
                        size="xs"
                        placeholder="Add description (optional)…"
                        defaultValue={ref.description ?? ""}
                        onBlur={(e) => {
                          const val = e.target.value.trim() || null;
                          if (val !== (ref.description ?? null)) {
                            onDocRefUpdate?.(row._id, ref._id, val);
                          }
                        }}
                        bg="white"
                        borderColor="gray.200"
                        _focus={{ borderColor: "orange.400", boxShadow: "0 0 0 1px #fb923c" }}
                      />
                    </Box>
                  );
                })}
              </Flex>
            )}
          </Box>
        )}

      </Box>
    </Flex>
  );
};

// ── StatCell ──────────────────────────────────────────────────────────────────

interface StatCellProps {
  label: string;
  value: string;
  subValue?: string;
  subColor?: string;
  borderRight?: boolean;
  highlight?: boolean;
}

const StatCell: React.FC<StatCellProps> = ({
  label, value, subValue, subColor = "gray.400", borderRight, highlight,
}) => (
  <Box
    px={3}
    py={2.5}
    bg={highlight ? "orange.600" : "gray.50"}
    borderRight={borderRight ? "1px solid" : undefined}
    borderRightColor="gray.200"
    textAlign="center"
  >
    <Text
      fontSize="9px"
      fontWeight="semibold"
      color={highlight ? "orange.200" : "gray.400"}
      mb={0.5}
      textTransform="uppercase"
      letterSpacing="wider"
    >
      {label}
    </Text>
    <Text fontSize="sm" fontWeight="bold" color={highlight ? "white" : "gray.800"} lineHeight="short">
      {value}
    </Text>
    {subValue && (
      <Text fontSize="xs" color={highlight ? "orange.200" : subColor} mt={0.5}>
        {subValue}
      </Text>
    )}
  </Box>
);

export default LineItemDetail;
