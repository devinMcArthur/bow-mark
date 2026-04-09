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
import { FiChevronDown, FiChevronUp, FiEdit2, FiExternalLink, FiSlash, FiTrash2, FiX } from "react-icons/fi";
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
} from "../pages/developer/CalculatorCanvas/canvasStorage";
import RateBuildupInputs from "../pages/developer/CalculatorCanvas/RateBuildupInputs";
import { TemplateCard } from "../../pages/pricing";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

  const hasRateBuildup = !!row.rateBuildupSnapshot;

  // Parse snapshot for inline RateBuildupInputs
  const parsedSnapshot = useMemo<RateBuildupSnapshot | null>(() => {
    if (!row.rateBuildupSnapshot) return null;
    try { return JSON.parse(row.rateBuildupSnapshot) as RateBuildupSnapshot; }
    catch { return null; }
  }, [row.rateBuildupSnapshot]);

  const snapshotLabel = parsedSnapshot?.label ?? (hasRateBuildup ? "Buildup" : null);
  const snapshotCanvasDoc = useMemo(
    () => parsedSnapshot ? snapshotToCanvasDoc(parsedSnapshot) : null,
    [parsedSnapshot]
  );

  // Local state for snapshot inputs — reset when switching rows
  const [snapParams, setSnapParams] = useState<Record<string, number>>(() => parsedSnapshot?.params ?? {});
  const [snapTables, setSnapTables] = useState<Record<string, RateEntry[]>>(() => parsedSnapshot?.tables ?? {});
  const [snapControllers, setSnapControllers] = useState<Record<string, number | boolean | string[]>>(
    () => parsedSnapshot?.controllers ?? {}
  );
  const [snapParamNotes, setSnapParamNotes] = useState<Record<string, string>>(
    () => parsedSnapshot?.paramNotes ?? {}
  );
  const [snapResult, setSnapResult] = useState<{ unitPrice: number; breakdown: { id: string; label: string; value: number }[] } | null>(null);
  const [buildupExpanded, setBuildupExpanded] = useState(true);
  const [extraUnitPrice, setExtraUnitPrice] = useState(row.extraUnitPrice != null ? String(row.extraUnitPrice) : "");
  const [extraUnitPriceMemo, setExtraUnitPriceMemo] = useState(row.extraUnitPriceMemo ?? "");

  useEffect(() => {
    setSnapParams(parsedSnapshot?.params ?? {});
    setSnapTables(parsedSnapshot?.tables ?? {});
    setSnapControllers(parsedSnapshot?.controllers ?? {});
    setSnapParamNotes(parsedSnapshot?.paramNotes ?? {});
    setSnapResult(null);
    setBuildupExpanded(true);
    setExtraUnitPrice(row.extraUnitPrice != null ? String(row.extraUnitPrice) : "");
    setExtraUnitPriceMemo(row.extraUnitPriceMemo ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row._id]);

  // Synchronously compute the correct unit price from the saved snapshot.
  // This is the source of truth for display and reconciliation.
  const snapshotUnitPrice = useMemo<number | null>(() => {
    if (!parsedSnapshot) return null;
    return computeSnapshotUnitPrice(parsedSnapshot, row.quantity ?? 1, row.unit ?? undefined) || null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedSnapshot, row.quantity]);

  // Reconcile on open or quantity change: if the stored unitPrice doesn't match what the
  // snapshot actually computes, save the correct value immediately.
  useEffect(() => {
    if (snapshotUnitPrice === null) return;
    if (Math.abs(snapshotUnitPrice - (row.unitPrice ?? 0)) > 0.001) {
      onUpdate(row._id, { unitPrice: snapshotUnitPrice });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row._id, row.quantity]);

  // Refs so debounced save always sees latest values
  const quantityRef = useRef(quantity);
  quantityRef.current = quantity;
  const snapParamsRef = useRef(snapParams);
  snapParamsRef.current = snapParams;
  const snapTablesRef = useRef(snapTables);
  snapTablesRef.current = snapTables;
  const snapControllersRef = useRef(snapControllers);
  snapControllersRef.current = snapControllers;
  const snapParamNotesRef = useRef(snapParamNotes);
  snapParamNotesRef.current = snapParamNotes;
  const snapshotRef = useRef(parsedSnapshot);
  snapshotRef.current = parsedSnapshot;

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((
    params: Record<string, number>,
    tables: Record<string, RateEntry[]>,
    controllers: Record<string, number | boolean | string[]>,
    paramNotes: Record<string, string>
  ) => {
    const base = snapshotRef.current;
    if (!base) return;
    const updatedSnapshot: RateBuildupSnapshot = { ...base, params, tables, controllers, paramNotes };
    const freshUP = computeSnapshotUnitPrice(updatedSnapshot, parseFloat(quantityRef.current) || 1, row.unit ?? undefined);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onUpdate(row._id, {
        rateBuildupSnapshot: JSON.stringify(updatedSnapshot),
        unitPrice: freshUP || null,
      });
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row._id, onUpdate]);

  const onSnapParamChange = useCallback((id: string, v: number) => {
    const next = { ...snapParamsRef.current, [id]: v };
    setSnapParams(next);
    scheduleSave(next, snapTablesRef.current, snapControllersRef.current, snapParamNotesRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSave]);

  const onSnapUpdateRow = useCallback((tableId: string, rowId: string, field: keyof RateEntry, value: string | number) => {
    const next = {
      ...snapTablesRef.current,
      [tableId]: (snapTablesRef.current[tableId] ?? []).map((r) => r.id === rowId ? { ...r, [field]: value } : r),
    };
    setSnapTables(next);
    scheduleSave(snapParamsRef.current, next, snapControllersRef.current, snapParamNotesRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSave]);

  const onSnapAddRow = useCallback((tableId: string) => {
    const next = {
      ...snapTablesRef.current,
      [tableId]: [...(snapTablesRef.current[tableId] ?? []), { id: uuidv4(), name: "", qty: 1, ratePerHour: 0 }],
    };
    setSnapTables(next);
    scheduleSave(snapParamsRef.current, next, snapControllersRef.current, snapParamNotesRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSave]);

  const onSnapRemoveRow = useCallback((tableId: string, rowId: string) => {
    const next = {
      ...snapTablesRef.current,
      [tableId]: (snapTablesRef.current[tableId] ?? []).filter((r) => r.id !== rowId),
    };
    setSnapTables(next);
    scheduleSave(snapParamsRef.current, next, snapControllersRef.current, snapParamNotesRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSave]);

  const onSnapControllerChange = useCallback((id: string, v: number | boolean | string[]) => {
    const next = { ...snapControllersRef.current, [id]: v };
    setSnapControllers(next);
    scheduleSave(snapParamsRef.current, snapTablesRef.current, next, snapParamNotesRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSave]);

  const onSnapParamNoteChange = useCallback((paramId: string, note: string) => {
    const next = { ...snapParamNotesRef.current, [paramId]: note };
    setSnapParamNotes(next);
    scheduleSave(snapParamsRef.current, snapTablesRef.current, snapControllersRef.current, next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSave]);

  const previewRow: TenderPricingRow = {
    ...row,
    unitPrice: hasRateBuildup ? (snapResult?.unitPrice ?? snapshotUnitPrice ?? row.unitPrice) : (parseFloat(unitPrice) || null),
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
            <AttachTemplateButton
              rowUnit={row.unit}
              onAttach={(templateDoc) => {
                const snapshot = snapshotFromTemplate(templateDoc);
                onUpdate(row._id, {
                  rateBuildupSnapshot: JSON.stringify(snapshot),
                  unit: row.unit || templateDoc.defaultUnit || null,
                });
              }}
            />
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
                    scheduleSave(snapParamsRef.current, snapTablesRef.current, snapControllersRef.current, snapParamNotesRef.current);
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
        <Flex align="center" gap={3} mb={3} px={1}>
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
          {hasMarkupOverride && (
            <Text fontSize="10px" color="gray.400" whiteSpace="nowrap">
              (base {defaultMarkupPct}%)
            </Text>
          )}
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

        {/* ── Rate Buildup (below details) ── */}
        <Box borderTop="1px solid" borderColor="gray.100">
          {hasRateBuildup ? (
            <Box>
              {/* Sticky buildup header */}
              <Box
                position="sticky" top={0} zIndex={2}
                mx={-5} px={5}
                bg="white"
                borderBottom="1px solid" borderColor="gray.100"
                boxShadow="0 2px 8px rgba(0,0,0,0.05)"
              >
                {/* Row 1: clickable toggle area + action buttons */}
                <Flex align="center" gap={0}>
                  {/* Clickable toggle — left side */}
                  <Flex
                    align="center" gap={2.5} flex={1} minW={0}
                    py={2.5} pr={2}
                    cursor="pointer"
                    role="button"
                    onClick={() => setBuildupExpanded((e) => !e)}
                    sx={{ "&:hover .buildup-chevron": { color: "gray.700" } }}
                  >
                    <Flex
                      className="buildup-chevron"
                      align="center" justify="center"
                      w="20px" h="20px"
                      rounded="md"
                      bg={buildupExpanded ? "orange.100" : "gray.100"}
                      color={buildupExpanded ? "orange.600" : "gray.400"}
                      flexShrink={0}
                      transition="all 0.15s"
                    >
                      {buildupExpanded ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                    </Flex>
                    <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" flexShrink={0} pl={2}>
                      Rate Buildup
                    </Text>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" noOfLines={1} flex={1} pl={2}>
                      {snapshotLabel}
                    </Text>
                    <Text fontSize="xs" color={buildupExpanded ? "orange.500" : "gray.400"} flexShrink={0} mr={1}>
                      {buildupExpanded ? "collapse" : "expand"}
                    </Text>
                  </Flex>
                  {/* Action buttons — right side, don't trigger toggle */}
                  <Flex align="center" gap={0.5} flexShrink={0}>
                    <IconButton
                      aria-label="Edit buildup"
                      icon={<FiEdit2 size={12} />}
                      size="xs" variant="ghost"
                      color="gray.400" _hover={{ color: "orange.500", bg: "orange.50" }}
                      onClick={() => {
                        const q = parseFloat(quantity);
                        const qs = !isNaN(q) && q > 0 ? `?quantity=${q}` : "";
                        const us = row.unit ? `${qs ? "&" : "?"}unit=${encodeURIComponent(row.unit)}` : "";
                        router.push(`/tender/${tenderId}/pricing/row/${row._id}${qs}${us}`);
                      }}
                    />
                    <IconButton
                      aria-label="Detach buildup"
                      icon={<FiSlash size={12} />}
                      size="xs" variant="ghost"
                      color="gray.400" _hover={{ color: "red.500", bg: "red.50" }}
                      onClick={() => onUpdate(row._id, { rateBuildupSnapshot: null, unitPrice: null })}
                    />
                  </Flex>
                </Flex>
                {/* Row 2: breakdown summary (uses snapResult when computed, else falls back to saved unitPrice) */}
                {(snapResult || row.unitPrice != null) && (
                  <Flex gap={0} borderTop="1px solid" borderColor="gray.100">
                    {snapResult && snapResult.breakdown.map((cat) => (
                      <Box key={cat.id} px={3} py={1.5} flex={1} borderRight="1px solid" borderColor="gray.100">
                        <Text fontSize="9px" fontWeight="medium" color="gray.400" textTransform="uppercase" letterSpacing="wide">
                          {cat.label}
                        </Text>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                          ${cat.value.toFixed(2)}
                        </Text>
                      </Box>
                    ))}
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
                      <Text fontSize="xs" fontWeight="bold" color="orange.700">
                        ${((snapResult?.unitPrice ?? row.unitPrice ?? 0) + (row.extraUnitPrice ?? 0)).toFixed(2)}
                      </Text>
                    </Box>
                  </Flex>
                )}
              </Box>

              {/* Params — always mounted so onResult fires; hidden when collapsed */}
              {snapshotCanvasDoc && (
                <Box pt={5} pb={6} display={buildupExpanded ? "block" : "none"}>
                  <RateBuildupInputs
                    doc={snapshotCanvasDoc}
                    params={snapParams}
                    tables={snapTables}
                    controllers={snapControllers}
                    quantity={parseFloat(quantity) || 1}
                    onParamChange={onSnapParamChange}
                    onUpdateRow={onSnapUpdateRow}
                    onAddRow={onSnapAddRow}
                    onRemoveRow={onSnapRemoveRow}
                    onControllerChange={onSnapControllerChange}
                    paramNotes={snapParamNotes}
                    onParamNoteChange={onSnapParamNoteChange}
                    columns={2}
                    onResult={setSnapResult}
                    unit={row.unit ?? undefined}
                  />
                </Box>
              )}

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
          ) : (
            <Flex align="center" justify="space-between" py={4}>
              <Text fontSize="xs" color="gray.400">No rate buildup attached</Text>
              <AttachTemplateButton
                rowUnit={row.unit}
                onAttach={(templateDoc) => {
                  const snapshot = snapshotFromTemplate(templateDoc);
                  onUpdate(row._id, {
                    rateBuildupSnapshot: JSON.stringify(snapshot),
                    unit: row.unit || templateDoc.defaultUnit || null,
                  });
                }}
              />
            </Flex>
          )}
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
