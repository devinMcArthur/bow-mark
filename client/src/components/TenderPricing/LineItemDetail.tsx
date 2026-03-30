// client/src/components/TenderPricing/LineItemDetail.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
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
import { useSystem } from "../../contexts/System";
import { TenderPricingRow } from "./types";
import { computeRow, formatCurrency, formatMarkup } from "./compute";
import { useCalculatorTemplates } from "./calculators/storage";
import { CalculatorInputs, CalculatorTemplate } from "./calculators/types";
import CalculatorPanel from "./CalculatorPanel";

// ── Migration: old flat JSON → new { params, tables } format ──────────────────

function migrateInputs(
  json: string | null | undefined,
  template: CalculatorTemplate
): CalculatorInputs {
  if (!json) return template.defaultInputs;
  try {
    const parsed = JSON.parse(json);
    // New format already has params key
    if (parsed.params !== undefined) return parsed as CalculatorInputs;
    // Old format: flat object — extract params and tables by matching defs
    const params: Record<string, number> = {};
    const tables: Record<string, import("./calculators/types").RateEntry[]> = {};
    for (const p of template.parameterDefs) {
      if (typeof parsed[p.id] === "number") params[p.id] = parsed[p.id];
    }
    for (const t of template.tableDefs) {
      if (Array.isArray(parsed[t.id])) tables[t.id] = parsed[t.id];
    }
    return { params, tables };
  } catch {
    return template.defaultInputs;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface LineItemDetailProps {
  row: TenderPricingRow;
  defaultMarkupPct: number;
  onUpdate: (rowId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

const LineItemDetail: React.FC<LineItemDetailProps> = ({
  row,
  defaultMarkupPct,
  onUpdate,
  onClose,
}) => {
  const { state: { system } } = useSystem();
  const units = system?.unitDefaults ?? [];
  const { templates } = useCalculatorTemplates();

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

  const activeTemplate = row.calculatorType
    ? templates.find((t) => t.id === row.calculatorType) ?? null
    : null;

  const previewRow: TenderPricingRow = {
    ...row,
    unitPrice: activeTemplate
      ? row.unitPrice
      : parseFloat(unitPrice) || null,
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

  const handleSelectType = (templateId: string | null) => {
    if (!templateId) {
      onUpdate(row._id, { calculatorType: null, calculatorInputsJson: null });
      return;
    }
    const t = templates.find((t) => t.id === templateId);
    if (!t) return;
    // Only seed defaultInputs if switching to a different type or no existing inputs
    const existingJson = row.calculatorType === templateId ? row.calculatorInputsJson : null;
    onUpdate(row._id, {
      calculatorType: templateId,
      calculatorInputsJson: existingJson ?? JSON.stringify(t.defaultInputs),
      unit: row.unit || t.defaultUnit || null,
    });
  };

  const handleCalculatorSave = (inputs: CalculatorInputs, computedUnitPrice: number) => {
    onUpdate(row._id, {
      calculatorInputsJson: JSON.stringify(inputs),
      unitPrice: parseFloat(computedUnitPrice.toFixed(4)) || null,
    });
  };

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
        {/* Type toggle — dynamic from loaded templates */}
        <Flex mb={4} align="center" gap={2} flexWrap="wrap">
          <Text fontSize="xs" color="gray.500" fontWeight="medium">Type:</Text>
          <ButtonGroup size="xs" isAttached variant="outline">
            <Button
              colorScheme={!row.calculatorType ? "blue" : "gray"}
              variant={!row.calculatorType ? "solid" : "outline"}
              onClick={() => handleSelectType(null)}
            >
              Manual
            </Button>
            {templates.map((t) => (
              <Button
                key={t.id}
                colorScheme={row.calculatorType === t.id ? "blue" : "gray"}
                variant={row.calculatorType === t.id ? "solid" : "outline"}
                onClick={() => handleSelectType(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </ButtonGroup>
        </Flex>

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
        <Grid templateColumns={activeTemplate ? "80px 110px" : "80px 110px 1fr"} gap={3} mb={4}>
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
          {!activeTemplate && (
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

        {/* Calculator panel — rendered for any active template */}
        {activeTemplate && (
          <Box borderTop="1px solid" borderColor="gray.100" pt={4} mt={4} mb={5}>
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color="gray.500"
              textTransform="uppercase"
              letterSpacing="wide"
              mb={4}
            >
              {activeTemplate.label} Calculator
            </Text>
            <CalculatorPanel
              template={activeTemplate}
              inputs={migrateInputs(row.calculatorInputsJson, activeTemplate)}
              resetKey={`${row._id}:${row.calculatorType ?? ""}`}
              quantity={parseFloat(quantity) || 0}
              onSave={handleCalculatorSave}
            />
          </Box>
        )}

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

// ── StatCell (unchanged) ──────────────────────────────────────────────────────

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
