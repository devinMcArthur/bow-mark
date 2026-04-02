// client/src/components/TenderPricing/LineItemDetail.tsx
import React, { useEffect, useState } from "react";
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
} from "@chakra-ui/react";
import { FiX } from "react-icons/fi";
import { useRouter } from "next/router";
import { useApolloClient } from "@apollo/client";
import { useSystem } from "../../contexts/System";
import { TenderPricingRow } from "./types";
import { computeRow, formatCurrency, formatMarkup } from "./compute";
import { RateBuildupTemplatesDocument } from "../../generated/graphql";
import {
  CanvasDocument,
  fragmentToDoc,
  snapshotFromTemplate,
} from "../pages/developer/CalculatorCanvas/canvasStorage";

// ── AttachTemplateButton ───────────────────────────────────────────────────────

const AttachTemplateButton: React.FC<{
  onAttach: (doc: CanvasDocument) => void;
}> = ({ onAttach }) => {
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
            bg="white" rounded="md" p={4} minW="300px" maxW="400px"
            onClick={(e) => e.stopPropagation()}
          >
            <Text fontWeight="semibold" mb={3} fontSize="sm">Select a Rate Buildup Template</Text>
            {templates.length === 0 ? (
              <Text fontSize="sm" color="gray.400">No templates found.</Text>
            ) : (
              templates.map((t) => (
                <Button
                  key={t.id}
                  variant="ghost"
                  size="sm"
                  w="100%"
                  justifyContent="flex-start"
                  onClick={() => { onAttach(t); setOpen(false); }}
                >
                  {t.label}
                </Button>
              ))
            )}
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
}

const LineItemDetail: React.FC<LineItemDetailProps> = ({
  row,
  defaultMarkupPct,
  sheetId: _sheetId,
  tenderId,
  onUpdate,
  onClose,
}) => {
  const { state: { system } } = useSystem();
  const router = useRouter();
  const units = system?.unitDefaults ?? [];

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

  // Parse label from snapshot for display
  const snapshotLabel = (() => {
    if (!row.rateBuildupSnapshot) return null;
    try {
      return JSON.parse(row.rateBuildupSnapshot).label ?? "Buildup";
    } catch {
      return "Buildup";
    }
  })();

  const previewRow: TenderPricingRow = {
    ...row,
    unitPrice: hasRateBuildup ? row.unitPrice : (parseFloat(unitPrice) || null),
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
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Flex
        align="flex-start"
        justify="space-between"
        px={6}
        pt={5}
        pb={4}
        borderBottom="1px solid"
        borderColor="gray.200"
        bg="gray.50"
        flexShrink={0}
      >
        <Box>
          {row.itemNumber && (
            <Text fontSize="xs" fontWeight="semibold" color="blue.500" mb={1} letterSpacing="wide">
              {row.itemNumber}
            </Text>
          )}
          <Text fontWeight="semibold" fontSize="lg" color="gray.800" lineHeight="short">
            {row.description || (
              <Text as="span" color="gray.400" fontStyle="italic" fontWeight="normal">
                Untitled item
              </Text>
            )}
          </Text>
        </Box>
        <IconButton
          aria-label="Close detail"
          icon={<FiX />}
          size="sm"
          variant="ghost"
          color="gray.400"
          _hover={{ color: "gray.700", bg: "gray.100" }}
          onClick={onClose}
          mt={-1}
          mr={-1}
        />
      </Flex>

      {/* ── Form ────────────────────────────────────────────────────── */}
      <Box px={6} py={5} overflowY="auto" flex={1}>
        {/* Rate Buildup */}
        <Box mb={4}>
          <Text fontSize="xs" color="gray.500" fontWeight="medium" mb={2}>Rate Buildup</Text>
          {hasRateBuildup ? (
            <Flex align="center" gap={2}>
              <Text fontSize="sm" color="gray.700" fontWeight="medium">
                {snapshotLabel}
              </Text>
              <Button
                size="xs"
                colorScheme="blue"
                variant="outline"
                onClick={() => router.push(`/tender/${tenderId}/pricing/row/${row._id}`)}
              >
                Edit Buildup →
              </Button>
              <Button
                size="xs"
                variant="ghost"
                color="red.400"
                _hover={{ color: "red.600" }}
                onClick={() => onUpdate(row._id, { rateBuildupSnapshot: null, unitPrice: null })}
              >
                Detach
              </Button>
            </Flex>
          ) : (
            <AttachTemplateButton
              onAttach={(templateDoc) => {
                const snapshot = snapshotFromTemplate(templateDoc);
                onUpdate(row._id, {
                  rateBuildupSnapshot: JSON.stringify(snapshot),
                  unit: row.unit || templateDoc.defaultUnit || null,
                });
              }}
            />
          )}
        </Box>

        {/* Item # + Description */}
        <Grid templateColumns="90px 1fr" gap={3} mb={4}>
          <FormControl>
            <FormLabel fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>Item #</FormLabel>
            <Input
              size="sm"
              value={itemNumber}
              onChange={(e) => setItemNumber(e.target.value)}
              onBlur={() => commitStr("itemNumber", itemNumber)}
              placeholder="—"
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>Description</FormLabel>
            <Input
              size="sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => commitStr("description", description)}
              placeholder="Line item description"
            />
          </FormControl>
        </Grid>

        {/* Qty + Unit + Unit Price */}
        <Grid templateColumns={hasRateBuildup ? "80px 110px" : "80px 110px 1fr"} gap={3} mb={4}>
          <FormControl>
            <FormLabel fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>Qty</FormLabel>
            <Input
              size="sm"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onBlur={() => commitNum("quantity", quantity)}
              placeholder="—"
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>Unit</FormLabel>
            <select
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                onUpdate(row._id, { unit: e.target.value || null });
              }}
              style={{
                width: "100%",
                fontSize: "0.875rem",
                background: "white",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                padding: "0 8px",
                height: "32px",
                cursor: "pointer",
                color: unit ? "#1A202C" : "#A0AEC0",
              }}
            >
              <option value="">—</option>
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </FormControl>
          {!hasRateBuildup && (
            <FormControl>
              <FormLabel fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>Unit Price</FormLabel>
              <InputGroup size="sm">
                <InputLeftAddon>$</InputLeftAddon>
                <Input
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  onBlur={() => commitNum("unitPrice", unitPrice)}
                  placeholder="—"
                />
              </InputGroup>
            </FormControl>
          )}
        </Grid>

        {/* Markup */}
        <Flex align="flex-end" gap={4} mb={4}>
          <FormControl w="160px" flexShrink={0}>
            <FormLabel fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>
              Markup Override
            </FormLabel>
            <InputGroup size="sm">
              <InputLeftAddon
                bg={hasMarkupOverride ? "blue.50" : "gray.50"}
                color={hasMarkupOverride ? "blue.600" : "gray.500"}
                borderColor={hasMarkupOverride ? "blue.200" : "gray.200"}
                fontSize="xs"
                px={2}
              >
                Δ %
              </InputLeftAddon>
              <Input
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                onBlur={() => commitMarkup(markup)}
                placeholder="default"
                borderColor={hasMarkupOverride ? "blue.200" : undefined}
              />
            </InputGroup>
          </FormControl>
          <Box pb={1}>
            <Text fontSize="xs" color="gray.400">
              Effective:{" "}
              <Text as="span" fontWeight="semibold" color={hasMarkupOverride ? "blue.600" : "gray.600"}>
                {effectiveMarkup}%
              </Text>
              {hasMarkupOverride && (
                <Text as="span" color="gray.400">
                  {" "}(base {defaultMarkupPct}% {previewRow.markupOverride! > 0 ? "+" : ""}{previewRow.markupOverride}%)
                </Text>
              )}
            </Text>
          </Box>
        </Flex>

        {/* Notes */}
        <FormControl mb={5}>
          <FormLabel fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>Notes</FormLabel>
          <Textarea
            size="sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => commitStr("notes", notes)}
            rows={2}
            placeholder="Optional notes…"
            resize="none"
          />
        </FormControl>

        {/* Computed summary */}
        <Grid
          templateColumns="repeat(4, 1fr)"
          gap={0}
          borderWidth={1}
          borderColor="gray.200"
          rounded="lg"
          overflow="hidden"
        >
          <StatCell
            label="Unit Price"
            value={totalUP > 0 ? `$${totalUP.toFixed(2)}` : "—"}
            borderRight
          />
          <StatCell
            label="Markup"
            value={`${effectiveMarkup}%`}
            subValue={hasMarkupOverride ? formatMarkup(previewRow.markupOverride) : "default"}
            subColor={hasMarkupOverride ? "blue.500" : "gray.400"}
            borderRight
          />
          <StatCell
            label="Bid UP"
            value={suggestedBidUP > 0 ? `$${suggestedBidUP.toFixed(2)}` : "—"}
            borderRight
          />
          <StatCell
            label="Line Total"
            value={lineItemTotal > 0 ? formatCurrency(lineItemTotal) : "—"}
            highlight
          />
        </Grid>
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
    px={4}
    py={3}
    bg={highlight ? "blue.600" : "gray.50"}
    borderRight={borderRight ? "1px solid" : undefined}
    borderRightColor="gray.200"
    textAlign="center"
  >
    <Text
      fontSize="xs"
      fontWeight="medium"
      color={highlight ? "blue.100" : "gray.500"}
      mb={1}
      textTransform="uppercase"
      letterSpacing="wide"
    >
      {label}
    </Text>
    <Text fontSize="md" fontWeight="bold" color={highlight ? "white" : "gray.800"} lineHeight="short">
      {value}
    </Text>
    {subValue && (
      <Text fontSize="xs" color={highlight ? "blue.200" : subColor} mt={0.5}>
        {subValue}
      </Text>
    )}
  </Box>
);

export default LineItemDetail;
