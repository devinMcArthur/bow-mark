# Calculator Template System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `AsphaltCalculator`/`GravelCalculator` components with a data-driven template system where every calculator type is a plain document of parameters, tables, formula steps, and breakdown definitions — evaluated by a single generic engine.

**Architecture:** Templates stored in `localStorage` (Phase 1). A formula evaluator seeds a variable context from parameters + pre-aggregated table totals, then runs formula steps in order using `expr-eval`. `CalculatorPanel` is a single generic component that renders any template. A new "Calculator Templates" tab on the developer page lets admins create and test templates live.

**Tech Stack:** React, TypeScript, Chakra UI, `expr-eval` (expression evaluator, ~10kb, no `eval()`), `localStorage`

---

## File Map

**Create:**
- `client/src/components/TenderPricing/calculators/types.ts` — all interfaces
- `client/src/components/TenderPricing/calculators/evaluate.ts` — `evaluateTemplate()` + `safeEval()`
- `client/src/components/TenderPricing/calculators/storage.ts` — `loadTemplates()`, `saveTemplates()`, `useCalculatorTemplates()`
- `client/src/components/TenderPricing/CalculatorPanel.tsx` — generic renderer
- `client/src/components/pages/developer/CalculatorTemplates/index.tsx` — tab root
- `client/src/components/pages/developer/CalculatorTemplates/TemplateList.tsx` — left sidebar
- `client/src/components/pages/developer/CalculatorTemplates/TemplateEditor.tsx` — edit form
- `client/src/components/pages/developer/CalculatorTemplates/TemplateTestPanel.tsx` — live test

**Modify:**
- `client/src/components/TenderPricing/LineItemDetail.tsx` — dynamic type picker, render CalculatorPanel, migrate old JSON format
- `client/src/pages/developer/index.tsx` — add Chakra Tabs

**Delete:**
- `client/src/components/TenderPricing/AsphaltCalculator.tsx`
- `client/src/components/TenderPricing/GravelCalculator.tsx`
- `client/src/components/TenderPricing/asphalt.ts`
- `client/src/components/TenderPricing/gravel.ts`

**Keep unchanged:**
- `client/src/components/TenderPricing/calculatorShared.tsx` — `ParamInput`, `RateRow`, `BreakdownCell` reused by `CalculatorPanel`

---

## Task 1: Install expr-eval

**Files:**
- Modify: `client/package.json`

- [ ] **Install the dependency**

```bash
cd client && npm install expr-eval && npm install --save-dev @types/expr-eval
```

- [ ] **Verify it installed**

```bash
node -e "const { Parser } = require('expr-eval'); console.log(new Parser().evaluate('2 * 3 + 1', {}));"
# Expected: 7
```

- [ ] **Commit**

```bash
cd client && git add package.json package-lock.json
git commit -m "chore(client): add expr-eval for calculator formula evaluation"
```

---

## Task 2: Core types

**Files:**
- Create: `client/src/components/TenderPricing/calculators/types.ts`

- [ ] **Create the file**

```typescript
// client/src/components/TenderPricing/calculators/types.ts

export interface CalculatorTemplate {
  id: string;                    // slug: "paving", "gravel", "concrete-sidewalk"
  label: string;                 // shown in type picker
  defaultUnit: string;           // pre-fills row unit field: "m²", "lin.m"
  parameterDefs: ParameterDef[];
  tableDefs: TableDef[];
  formulaSteps: FormulaStep[];
  breakdownDefs: BreakdownDef[];
  intermediateDefs: IntermediateDef[];
  defaultInputs: CalculatorInputs;
}

export interface ParameterDef {
  id: string;           // key in CalculatorInputs.params
  label: string;
  prefix?: string;      // "$"
  suffix?: string;      // "mm", "/t", "/hr"
  defaultValue: number;
}

export interface TableDef {
  id: string;           // key in CalculatorInputs.tables; also used as "{id}RatePerHr" in formula context
  label: string;
  rowLabel: string;     // column header: "Role", "Item"
}

export interface RateEntry {
  id: string;
  name: string;
  qty: number;
  ratePerHour: number;
}

export interface CalculatorInputs {
  params: Record<string, number>;
  tables: Record<string, RateEntry[]>;
}

export interface FormulaStep {
  id: string;           // variable name added to evaluation context
  label?: string;
  formula: string;      // arithmetic expression; can reference: parameter ids,
                        // prior step ids, "{tableId}RatePerHr", and "quantity"
}

export interface BreakdownDef {
  id: string;
  label: string;
  perUnit: string;      // formula step id whose value = $/unit
  subValue?: {
    stepId: string;     // formula step id for the sub-label number
    format: string;     // suffix appended after value: "/t", "/m²"
  };
}

export interface IntermediateDef {
  label: string;
  stepId: string;
  unit: string;
}

export interface CalculatorResult {
  unitPrice: number;
  breakdown: CostCategory[];
  intermediates: Intermediate[];
}

export interface CostCategory {
  id: string;
  label: string;
  perUnit: number;
  subValue?: string;
}

export interface Intermediate {
  label: string;
  value: number;
  unit: string;
}
```

- [ ] **Commit**

```bash
git add client/src/components/TenderPricing/calculators/types.ts
git commit -m "feat(calculators): add core CalculatorTemplate type definitions"
```

---

## Task 3: Evaluator and storage

**Files:**
- Create: `client/src/components/TenderPricing/calculators/evaluate.ts`
- Create: `client/src/components/TenderPricing/calculators/storage.ts`

- [ ] **Create evaluate.ts**

```typescript
// client/src/components/TenderPricing/calculators/evaluate.ts
import { Parser } from "expr-eval";
import {
  CalculatorTemplate,
  CalculatorInputs,
  CalculatorResult,
} from "./types";

const parser = new Parser();

export function safeEval(formula: string, ctx: Record<string, number>): number {
  try {
    const result = parser.evaluate(formula, ctx);
    return typeof result === "number" && isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

export function evaluateTemplate(
  template: CalculatorTemplate,
  inputs: CalculatorInputs,
  quantity: number
): CalculatorResult {
  // 1. Seed context: quantity + parameters + table aggregates
  const ctx: Record<string, number> = { quantity };

  for (const p of template.parameterDefs) {
    ctx[p.id] = inputs.params[p.id] ?? p.defaultValue;
  }

  for (const t of template.tableDefs) {
    ctx[`${t.id}RatePerHr`] = (inputs.tables[t.id] ?? []).reduce(
      (s, r) => s + r.qty * r.ratePerHour,
      0
    );
  }

  // 2. Evaluate formula steps in order — each result joins the context
  for (const step of template.formulaSteps) {
    ctx[step.id] = safeEval(step.formula, ctx);
  }

  // 3. Assemble result
  const breakdown = template.breakdownDefs.map((b) => ({
    id: b.id,
    label: b.label,
    perUnit: ctx[b.perUnit] ?? 0,
    subValue: b.subValue
      ? `$${(ctx[b.subValue.stepId] ?? 0).toFixed(2)}${b.subValue.format}`
      : undefined,
  }));

  return {
    unitPrice: breakdown.reduce((s, b) => s + b.perUnit, 0),
    breakdown,
    intermediates: template.intermediateDefs.map((i) => ({
      label: i.label,
      value: ctx[i.stepId] ?? 0,
      unit: i.unit,
    })),
  };
}
```

- [ ] **Create storage.ts**

```typescript
// client/src/components/TenderPricing/calculators/storage.ts
import { useState, useCallback } from "react";
import { CalculatorTemplate } from "./types";

const STORAGE_KEY = "bow-mark:calculator-templates";

export function loadTemplates(): CalculatorTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CalculatorTemplate[]) : [];
  } catch {
    return [];
  }
}

export function saveTemplates(templates: CalculatorTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function useCalculatorTemplates() {
  const [templates, setTemplates] = useState<CalculatorTemplate[]>(loadTemplates);

  const save = useCallback((updated: CalculatorTemplate[]) => {
    saveTemplates(updated);
    setTemplates(updated);
  }, []);

  return { templates, saveTemplates: save };
}
```

- [ ] **Commit**

```bash
git add client/src/components/TenderPricing/calculators/
git commit -m "feat(calculators): add formula evaluator and localStorage storage"
```

---

## Task 4: Generic CalculatorPanel

**Files:**
- Create: `client/src/components/TenderPricing/CalculatorPanel.tsx`

- [ ] **Create CalculatorPanel.tsx**

```tsx
// client/src/components/TenderPricing/CalculatorPanel.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { FiPlus } from "react-icons/fi";
import {
  CalculatorTemplate,
  CalculatorInputs,
  RateEntry,
} from "./calculators/types";
import { evaluateTemplate } from "./calculators/evaluate";
import { ParamInput, RateRow, BreakdownCell } from "./calculatorShared";

interface CalculatorPanelProps {
  template: CalculatorTemplate;
  inputs: CalculatorInputs;
  resetKey: string;   // typically row._id — resets local state when this changes
  quantity: number;
  onSave: (inputs: CalculatorInputs, unitPrice: number) => void;
}

const CalculatorPanel: React.FC<CalculatorPanelProps> = ({
  template,
  inputs: initialInputs,
  resetKey,
  quantity,
  onSave,
}) => {
  const [inputs, setInputs] = useState<CalculatorInputs>(initialInputs);

  useEffect(() => {
    setInputs(initialInputs);
  }, [resetKey]);

  const result = useMemo(
    () => evaluateTemplate(template, inputs, quantity),
    [template, inputs, quantity]
  );

  const commit = useCallback(
    (updated: CalculatorInputs) => {
      onSave(updated, evaluateTemplate(template, updated, quantity).unitPrice);
    },
    [template, quantity, onSave]
  );

  const updateParam = (id: string, value: number, save: boolean) => {
    const updated: CalculatorInputs = {
      ...inputs,
      params: { ...inputs.params, [id]: value },
    };
    setInputs(updated);
    if (save) commit(updated);
  };

  const updateTableRow = (
    tableId: string,
    rowId: string,
    field: keyof RateEntry,
    value: string | number
  ) => {
    const rows = (inputs.tables[tableId] ?? []).map((r) =>
      r.id === rowId ? { ...r, [field]: value } : r
    );
    const updated: CalculatorInputs = {
      ...inputs,
      tables: { ...inputs.tables, [tableId]: rows },
    };
    setInputs(updated);
    commit(updated);
  };

  const addTableRow = (tableId: string) => {
    const rows = [
      ...(inputs.tables[tableId] ?? []),
      { id: `${tableId}-${Date.now()}`, name: "", qty: 1, ratePerHour: 0 },
    ];
    const updated: CalculatorInputs = {
      ...inputs,
      tables: { ...inputs.tables, [tableId]: rows },
    };
    setInputs(updated);
    commit(updated);
  };

  const removeTableRow = (tableId: string, rowId: string) => {
    const rows = (inputs.tables[tableId] ?? []).filter((r) => r.id !== rowId);
    const updated: CalculatorInputs = {
      ...inputs,
      tables: { ...inputs.tables, [tableId]: rows },
    };
    setInputs(updated);
    commit(updated);
  };

  const paramCols = Math.min(template.parameterDefs.length, 5);
  const tableCols = Math.min(template.tableDefs.length, 2);

  return (
    <Box>
      {/* ── Parameters ──────────────────────────────────────────────── */}
      <Grid templateColumns={`repeat(${paramCols}, 1fr)`} gap={3} mb={5}>
        {template.parameterDefs.map((p) => (
          <ParamInput
            key={p.id}
            label={p.label}
            prefix={p.prefix}
            suffix={p.suffix}
            value={inputs.params[p.id] ?? p.defaultValue}
            onChange={(v) => updateParam(p.id, v, false)}
            onBlur={(v) => updateParam(p.id, v, true)}
          />
        ))}
      </Grid>

      {/* ── Rate tables ─────────────────────────────────────────────── */}
      <Grid templateColumns={`repeat(${tableCols}, 1fr)`} gap={4} mb={5}>
        {template.tableDefs.map((t) => {
          const rows = inputs.tables[t.id] ?? [];
          const ratePerHr = rows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);
          return (
            <Box key={t.id}>
              <Flex align="center" justify="space-between" mb={2}>
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color="gray.600"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  {t.label}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  ${ratePerHr.toFixed(2)}/hr
                </Text>
              </Flex>
              <Box borderWidth={1} borderColor="gray.200" rounded="md" overflow="hidden">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#F7FAFC" }}>
                      <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 500, color: "#718096" }}>
                        {t.rowLabel}
                      </th>
                      <th style={{ textAlign: "center", padding: "4px 4px", fontWeight: 500, color: "#718096", width: "40px" }}>
                        Qty
                      </th>
                      <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "70px" }}>
                        $/hr
                      </th>
                      <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "70px" }}>
                        Total
                      </th>
                      <th style={{ width: "28px" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <RateRow
                        key={row.id}
                        entry={row}
                        onChangeName={(v) => updateTableRow(t.id, row.id, "name", v)}
                        onChangeQty={(v) => updateTableRow(t.id, row.id, "qty", v)}
                        onChangeRate={(v) => updateTableRow(t.id, row.id, "ratePerHour", v)}
                        onDelete={() => removeTableRow(t.id, row.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </Box>
              <Button
                size="xs"
                variant="ghost"
                leftIcon={<FiPlus />}
                mt={1}
                color="gray.500"
                onClick={() => addTableRow(t.id)}
              >
                Add
              </Button>
            </Box>
          );
        })}
      </Grid>

      {/* ── Cost breakdown ──────────────────────────────────────────── */}
      <Box>
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="gray.500"
          textTransform="uppercase"
          letterSpacing="wide"
          mb={2}
        >
          Cost Breakdown (/{template.defaultUnit})
        </Text>
        <Grid
          templateColumns={`repeat(${result.breakdown.length + 1}, 1fr)`}
          gap={0}
          borderWidth={1}
          borderColor="gray.200"
          rounded="lg"
          overflow="hidden"
        >
          {result.breakdown.map((cat) => (
            <BreakdownCell
              key={cat.id}
              label={cat.label}
              value={cat.perUnit}
              subValue={cat.subValue}
              borderRight
            />
          ))}
          <BreakdownCell label="Unit Price" value={result.unitPrice} highlight />
        </Grid>
        {result.intermediates.length > 0 && (
          <Text fontSize="xs" color="gray.400" mt={2}>
            {result.intermediates
              .map((i) => `${i.label}: ${i.value.toFixed(4)} ${i.unit}`)
              .join(" · ")}
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default CalculatorPanel;
```

- [ ] **Commit**

```bash
git add client/src/components/TenderPricing/CalculatorPanel.tsx
git commit -m "feat(calculators): add generic CalculatorPanel component"
```

---

## Task 5: Update LineItemDetail

**Files:**
- Modify: `client/src/components/TenderPricing/LineItemDetail.tsx`

The key changes:
1. Import `useCalculatorTemplates` instead of per-type imports
2. Replace the hardcoded type toggle with a dynamic one from loaded templates
3. When a calculator type is selected, render `<CalculatorPanel>` instead of `<AsphaltCalculator>` / `<GravelCalculator>`
4. When a type is first selected, seed `calculatorInputsJson` from `template.defaultInputs`
5. On calculator save, receive `(inputs: CalculatorInputs, unitPrice: number)` and write `{ calculatorInputsJson: JSON.stringify(inputs), unitPrice }`
6. Add `migrateInputs()` to transparently handle old flat JSON format

- [ ] **Add the migration helper at the top of the file (before the component)**

The old format was a flat object (`{ depthMm, materialRate, labour: [...], ... }`). The new format is `{ params: {...}, tables: {...} }`. Detect by checking for the `params` key.

- [ ] **Replace the full file content**

```tsx
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
              resetKey={row._id}
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
```

- [ ] **Start the dev environment and verify the pricing sheet still loads with no errors**

```bash
kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=20
# Navigate to a tender's pricing page — type picker should show "Manual" only (no templates yet)
# Existing rows with calculatorType set will fall back to manual since no templates in localStorage
```

- [ ] **Commit**

```bash
git add client/src/components/TenderPricing/LineItemDetail.tsx
git commit -m "feat(calculators): update LineItemDetail to use template registry + CalculatorPanel"
```

---

## Task 6: Add tabs to the developer page

**Files:**
- Modify: `client/src/pages/developer/index.tsx`

- [ ] **Replace the file content**

```tsx
// client/src/pages/developer/index.tsx
import {
  Flex,
  Heading,
  Icon,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import React from "react";
import { FiTool } from "react-icons/fi";
import ClientOnly from "../../components/Common/ClientOnly";
import Container from "../../components/Common/Container";
import RatingsReview from "../../components/pages/developer/RatingsReview";
import CalculatorTemplates from "../../components/pages/developer/CalculatorTemplates";
import { useAuth } from "../../contexts/Auth";
import { UserRoles } from "../../generated/graphql";

const DeveloperPage: React.FC = () => {
  const { state: { user } } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (user === null) {
      router.replace("/");
    } else if (user !== undefined && user.role !== UserRoles.Developer) {
      router.replace("/");
    }
  }, [user, router]);

  if (!user || user.role !== UserRoles.Developer) return null;

  return (
    <Container>
      <Flex flexDir="row" w="auto" gap={2} mb={6}>
        <Icon my="auto" as={FiTool} />
        <Heading size="sm" color="gray.600">
          Developer Tools
        </Heading>
      </Flex>
      <ClientOnly>
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Ratings Review</Tab>
            <Tab>Calculator Templates</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0}>
              <RatingsReview />
            </TabPanel>
            <TabPanel px={0}>
              <CalculatorTemplates />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ClientOnly>
    </Container>
  );
};

export default DeveloperPage;
```

- [ ] **Verify `/developer` page loads with the two tabs (CalculatorTemplates will 404 until Task 10)**

- [ ] **Commit**

```bash
git add client/src/pages/developer/index.tsx
git commit -m "feat(developer): add tab layout to developer page"
```

---

## Task 7: TemplateTestPanel

**Files:**
- Create: `client/src/components/pages/developer/CalculatorTemplates/TemplateTestPanel.tsx`

The test panel maintains its own local state seeded from the template's `defaultInputs`. Table row edits here update `defaultInputs` on the template (via `onUpdateDefaults`). Param changes are local only — defaults are set on `ParameterDef.defaultValue`.

- [ ] **Create the file**

```tsx
// client/src/components/pages/developer/CalculatorTemplates/TemplateTestPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Box, Flex, Grid, Input, Text } from "@chakra-ui/react";
import {
  CalculatorTemplate,
  CalculatorInputs,
  RateEntry,
} from "../../../../components/TenderPricing/calculators/types";
import { evaluateTemplate } from "../../../../components/TenderPricing/calculators/evaluate";
import { BreakdownCell, RateRow } from "../../../../components/TenderPricing/calculatorShared";
import { FiPlus } from "react-icons/fi";
import { Button } from "@chakra-ui/react";

interface TemplateTestPanelProps {
  template: CalculatorTemplate;
  onUpdateDefaults: (inputs: CalculatorInputs) => void;
}

const TemplateTestPanel: React.FC<TemplateTestPanelProps> = ({
  template,
  onUpdateDefaults,
}) => {
  const [quantity, setQuantity] = useState(100);
  const [params, setParams] = useState<Record<string, number>>(() =>
    Object.fromEntries(template.parameterDefs.map((p) => [p.id, p.defaultValue]))
  );
  const [tables, setTables] = useState<Record<string, RateEntry[]>>(
    () => template.defaultInputs.tables
  );

  // Reset when template changes
  useEffect(() => {
    setParams(Object.fromEntries(template.parameterDefs.map((p) => [p.id, p.defaultValue])));
    setTables(template.defaultInputs.tables);
  }, [template.id]);

  const inputs: CalculatorInputs = { params, tables };

  const result = useMemo(
    () => evaluateTemplate(template, inputs, quantity),
    [template, inputs, quantity]
  );

  const updateTable = (tableId: string, updated: RateEntry[]) => {
    const newTables = { ...tables, [tableId]: updated };
    setTables(newTables);
    onUpdateDefaults({ params: template.defaultInputs.params, tables: newTables });
  };

  const updateRow = (tableId: string, rowId: string, field: keyof RateEntry, value: string | number) => {
    const updated = (tables[tableId] ?? []).map((r) =>
      r.id === rowId ? { ...r, [field]: value } : r
    );
    updateTable(tableId, updated);
  };

  const addRow = (tableId: string) => {
    const updated = [
      ...(tables[tableId] ?? []),
      { id: `${tableId}-${Date.now()}`, name: "", qty: 1, ratePerHour: 0 },
    ];
    updateTable(tableId, updated);
  };

  const removeRow = (tableId: string, rowId: string) => {
    const updated = (tables[tableId] ?? []).filter((r) => r.id !== rowId);
    updateTable(tableId, updated);
  };

  return (
    <Box h="100%" overflowY="auto" p={4}>
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={3}>
        Live Test
      </Text>

      {/* Quantity */}
      <Flex align="center" gap={3} mb={4}>
        <Text fontSize="sm" color="gray.600" whiteSpace="nowrap">Quantity</Text>
        <Input
          size="sm"
          type="number"
          w="80px"
          value={quantity}
          onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
        />
        <Text fontSize="sm" color="gray.400">{template.defaultUnit}</Text>
      </Flex>

      {/* Params */}
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={2}>
        Parameters
      </Text>
      <Grid templateColumns="1fr 100px" gap={2} mb={4}>
        {template.parameterDefs.map((p) => (
          <React.Fragment key={p.id}>
            <Text fontSize="sm" color="gray.700" alignSelf="center">
              {p.label} {p.suffix && <Text as="span" color="gray.400" fontSize="xs">({p.suffix})</Text>}
            </Text>
            <Input
              size="sm"
              type="number"
              textAlign="right"
              value={params[p.id] ?? p.defaultValue}
              onChange={(e) =>
                setParams((prev) => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))
              }
            />
          </React.Fragment>
        ))}
      </Grid>

      {/* Tables — editing here updates defaultInputs */}
      {template.tableDefs.map((t) => {
        const rows = tables[t.id] ?? [];
        const ratePerHr = rows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);
        return (
          <Box key={t.id} mb={4}>
            <Flex align="center" justify="space-between" mb={2}>
              <Text fontSize="xs" fontWeight="semibold" color="gray.600" textTransform="uppercase" letterSpacing="wide">
                {t.label} (default rows)
              </Text>
              <Text fontSize="xs" color="gray.500">${ratePerHr.toFixed(2)}/hr</Text>
            </Flex>
            <Box borderWidth={1} borderColor="gray.200" rounded="md" overflow="hidden">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#F7FAFC" }}>
                    <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 500, color: "#718096" }}>{t.rowLabel}</th>
                    <th style={{ textAlign: "center", padding: "4px 4px", fontWeight: 500, color: "#718096", width: "40px" }}>Qty</th>
                    <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "70px" }}>$/hr</th>
                    <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "70px" }}>Total</th>
                    <th style={{ width: "28px" }} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <RateRow
                      key={row.id}
                      entry={row}
                      onChangeName={(v) => updateRow(t.id, row.id, "name", v)}
                      onChangeQty={(v) => updateRow(t.id, row.id, "qty", v)}
                      onChangeRate={(v) => updateRow(t.id, row.id, "ratePerHour", v)}
                      onDelete={() => removeRow(t.id, row.id)}
                    />
                  ))}
                </tbody>
              </table>
            </Box>
            <Button size="xs" variant="ghost" leftIcon={<FiPlus />} mt={1} color="gray.500" onClick={() => addRow(t.id)}>
              Add
            </Button>
          </Box>
        );
      })}

      {/* Breakdown */}
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={2}>
        Breakdown
      </Text>
      <Grid
        templateColumns={`repeat(${result.breakdown.length + 1}, 1fr)`}
        gap={0}
        borderWidth={1}
        borderColor="gray.200"
        rounded="lg"
        overflow="hidden"
        mb={2}
      >
        {result.breakdown.map((cat) => (
          <BreakdownCell
            key={cat.id}
            label={cat.label}
            value={cat.perUnit}
            subValue={cat.subValue}
            borderRight
          />
        ))}
        <BreakdownCell label="Unit Price" value={result.unitPrice} highlight />
      </Grid>
      {result.intermediates.length > 0 && (
        <Text fontSize="xs" color="gray.400">
          {result.intermediates.map((i) => `${i.label}: ${i.value.toFixed(4)} ${i.unit}`).join(" · ")}
        </Text>
      )}
    </Box>
  );
};

export default TemplateTestPanel;
```

- [ ] **Commit**

```bash
git add client/src/components/pages/developer/CalculatorTemplates/TemplateTestPanel.tsx
git commit -m "feat(developer): add TemplateTestPanel with live formula evaluation"
```

---

## Task 8: TemplateEditor

**Files:**
- Create: `client/src/components/pages/developer/CalculatorTemplates/TemplateEditor.tsx`

- [ ] **Create the file**

```tsx
// client/src/components/pages/developer/CalculatorTemplates/TemplateEditor.tsx
import React from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  IconButton,
  Input,
  Text,
} from "@chakra-ui/react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import {
  CalculatorTemplate,
  ParameterDef,
  TableDef,
  FormulaStep,
  BreakdownDef,
  IntermediateDef,
} from "../../../../components/TenderPricing/calculators/types";

interface TemplateEditorProps {
  template: CalculatorTemplate;
  onChange: (updated: CalculatorTemplate) => void;
}

// Generic editable row helper
const FieldRow: React.FC<{
  fields: { label: string; value: string; placeholder?: string; mono?: boolean; wide?: boolean }[];
  onChange: (index: number, value: string) => void;
  onDelete: () => void;
}> = ({ fields, onChange, onDelete }) => (
  <Flex gap={2} align="center" mb={1}>
    {fields.map((f, i) => (
      <Input
        key={i}
        size="xs"
        value={f.value}
        placeholder={f.placeholder}
        fontFamily={f.mono ? "mono" : undefined}
        flex={f.wide ? 2 : 1}
        onChange={(e) => onChange(i, e.target.value)}
      />
    ))}
    <IconButton
      aria-label="Delete"
      icon={<FiTrash2 />}
      size="xs"
      variant="ghost"
      colorScheme="red"
      onClick={onDelete}
    />
  </Flex>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text fontSize="10px" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" color="gray.400" mb={2} mt={5}>
    {children}
  </Text>
);

const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, onChange }) => {
  const patch = (partial: Partial<CalculatorTemplate>) =>
    onChange({ ...template, ...partial });

  // ── Parameters ────────────────────────────────────────────────────────────

  const updateParam = (i: number, field: keyof ParameterDef, value: string) => {
    const updated = template.parameterDefs.map((p, idx) =>
      idx === i
        ? { ...p, [field]: field === "defaultValue" ? parseFloat(value) || 0 : value }
        : p
    );
    patch({ parameterDefs: updated });
  };

  const addParam = () =>
    patch({
      parameterDefs: [
        ...template.parameterDefs,
        { id: "", label: "", defaultValue: 0 },
      ],
    });

  const removeParam = (i: number) =>
    patch({ parameterDefs: template.parameterDefs.filter((_, idx) => idx !== i) });

  // ── Tables ────────────────────────────────────────────────────────────────

  const updateTable = (i: number, field: keyof TableDef, value: string) => {
    const updated = template.tableDefs.map((t, idx) =>
      idx === i ? { ...t, [field]: value } : t
    );
    patch({ tableDefs: updated });
  };

  const addTable = () =>
    patch({
      tableDefs: [...template.tableDefs, { id: "", label: "", rowLabel: "Item" }],
    });

  const removeTable = (i: number) =>
    patch({ tableDefs: template.tableDefs.filter((_, idx) => idx !== i) });

  // ── Formula steps ─────────────────────────────────────────────────────────

  const updateStep = (i: number, field: keyof FormulaStep, value: string) => {
    const updated = template.formulaSteps.map((s, idx) =>
      idx === i ? { ...s, [field]: value } : s
    );
    patch({ formulaSteps: updated });
  };

  const addStep = () =>
    patch({ formulaSteps: [...template.formulaSteps, { id: "", formula: "" }] });

  const removeStep = (i: number) =>
    patch({ formulaSteps: template.formulaSteps.filter((_, idx) => idx !== i) });

  // ── Breakdown ─────────────────────────────────────────────────────────────

  const updateBreakdown = (i: number, field: string, value: string) => {
    const updated = template.breakdownDefs.map((b, idx) => {
      if (idx !== i) return b;
      if (field === "subValue.stepId" || field === "subValue.format") {
        const key = field.split(".")[1] as "stepId" | "format";
        return { ...b, subValue: { ...(b.subValue ?? { stepId: "", format: "" }), [key]: value } };
      }
      return { ...b, [field]: value };
    });
    patch({ breakdownDefs: updated });
  };

  const addBreakdown = () =>
    patch({ breakdownDefs: [...template.breakdownDefs, { id: "", label: "", perUnit: "" }] });

  const removeBreakdown = (i: number) =>
    patch({ breakdownDefs: template.breakdownDefs.filter((_, idx) => idx !== i) });

  // ── Intermediates ─────────────────────────────────────────────────────────

  const updateIntermediate = (i: number, field: keyof IntermediateDef, value: string) => {
    const updated = template.intermediateDefs.map((im, idx) =>
      idx === i ? { ...im, [field]: value } : im
    );
    patch({ intermediateDefs: updated });
  };

  const addIntermediate = () =>
    patch({ intermediateDefs: [...template.intermediateDefs, { label: "", stepId: "", unit: "" }] });

  const removeIntermediate = (i: number) =>
    patch({ intermediateDefs: template.intermediateDefs.filter((_, idx) => idx !== i) });

  return (
    <Box h="100%" overflowY="auto" p={4}>
      {/* Basic info */}
      <SectionLabel>Basic Info</SectionLabel>
      <Grid templateColumns="1fr 1fr 80px" gap={2} mb={2}>
        <Box>
          <Text fontSize="10px" color="gray.500" mb={1}>ID (slug)</Text>
          <Input size="xs" fontFamily="mono" value={template.id} onChange={(e) => patch({ id: e.target.value })} placeholder="paving" />
        </Box>
        <Box>
          <Text fontSize="10px" color="gray.500" mb={1}>Label</Text>
          <Input size="xs" value={template.label} onChange={(e) => patch({ label: e.target.value })} placeholder="Paving" />
        </Box>
        <Box>
          <Text fontSize="10px" color="gray.500" mb={1}>Default Unit</Text>
          <Input size="xs" value={template.defaultUnit} onChange={(e) => patch({ defaultUnit: e.target.value })} placeholder="m²" />
        </Box>
      </Grid>

      {/* Parameters */}
      <SectionLabel>Parameters</SectionLabel>
      <Grid templateColumns="auto auto auto auto auto auto" mb={1}>
        {["id", "label", "prefix", "suffix", "default", ""].map((h) => (
          <Text key={h} fontSize="9px" color="gray.400" fontWeight="600" textTransform="uppercase" px={1}>{h}</Text>
        ))}
      </Grid>
      {template.parameterDefs.map((p, i) => (
        <FieldRow
          key={i}
          fields={[
            { label: "id", value: p.id, placeholder: "depthMm", mono: true },
            { label: "label", value: p.label, placeholder: "Depth" },
            { label: "prefix", value: p.prefix ?? "", placeholder: "$" },
            { label: "suffix", value: p.suffix ?? "", placeholder: "mm" },
            { label: "default", value: String(p.defaultValue), placeholder: "0" },
          ]}
          onChange={(fi, v) => {
            const fields: (keyof ParameterDef)[] = ["id", "label", "prefix", "suffix", "defaultValue"];
            updateParam(i, fields[fi], v);
          }}
          onDelete={() => removeParam(i)}
        />
      ))}
      <Button size="xs" variant="ghost" leftIcon={<FiPlus />} color="gray.500" onClick={addParam}>
        Add parameter
      </Button>

      {/* Tables */}
      <SectionLabel>Tables</SectionLabel>
      <Grid templateColumns="auto auto auto auto" mb={1}>
        {["id", "label", "row label", ""].map((h) => (
          <Text key={h} fontSize="9px" color="gray.400" fontWeight="600" textTransform="uppercase" px={1}>{h}</Text>
        ))}
      </Grid>
      {template.tableDefs.map((t, i) => (
        <FieldRow
          key={i}
          fields={[
            { label: "id", value: t.id, placeholder: "labour", mono: true },
            { label: "label", value: t.label, placeholder: "Labour" },
            { label: "rowLabel", value: t.rowLabel, placeholder: "Role" },
          ]}
          onChange={(fi, v) => {
            const fields: (keyof TableDef)[] = ["id", "label", "rowLabel"];
            updateTable(i, fields[fi], v);
          }}
          onDelete={() => removeTable(i)}
        />
      ))}
      <Button size="xs" variant="ghost" leftIcon={<FiPlus />} color="gray.500" onClick={addTable}>
        Add table
      </Button>

      {/* Formula steps */}
      <SectionLabel>Formula Steps</SectionLabel>
      <Text fontSize="10px" color="gray.400" mb={2}>
        Available vars: parameter ids · <code>{"{tableId}"}RatePerHr</code> · prior step ids · <code>quantity</code>
      </Text>
      {template.formulaSteps.map((s, i) => (
        <FieldRow
          key={i}
          fields={[
            { label: "id", value: s.id, placeholder: "tonnesPerM2", mono: true },
            { label: "formula", value: s.formula, placeholder: "depthMm * 0.00245", mono: true, wide: true },
          ]}
          onChange={(fi, v) => updateStep(i, fi === 0 ? "id" : "formula", v)}
          onDelete={() => removeStep(i)}
        />
      ))}
      <Button size="xs" variant="ghost" leftIcon={<FiPlus />} color="gray.500" onClick={addStep}>
        Add step
      </Button>

      {/* Breakdown */}
      <SectionLabel>Breakdown</SectionLabel>
      <Text fontSize="10px" color="gray.400" mb={2}>perUnit = formula step id whose value is $/unit</Text>
      {template.breakdownDefs.map((b, i) => (
        <Box key={i} mb={2} pl={1} borderLeft="2px solid" borderColor="green.200">
          <FieldRow
            fields={[
              { label: "id", value: b.id, placeholder: "material", mono: true },
              { label: "label", value: b.label, placeholder: "Material" },
              { label: "perUnit", value: b.perUnit, placeholder: "materialPerM2", mono: true },
            ]}
            onChange={(fi, v) => {
              const fields = ["id", "label", "perUnit"];
              updateBreakdown(i, fields[fi], v);
            }}
            onDelete={() => removeBreakdown(i)}
          />
          <Flex gap={2} align="center" pl={1} mt={1}>
            <Text fontSize="10px" color="gray.400">sub:</Text>
            <Input
              size="xs"
              fontFamily="mono"
              flex={1}
              value={b.subValue?.stepId ?? ""}
              placeholder="stepId (optional)"
              onChange={(e) => updateBreakdown(i, "subValue.stepId", e.target.value)}
            />
            <Input
              size="xs"
              flex={0.5}
              value={b.subValue?.format ?? ""}
              placeholder="/t"
              onChange={(e) => updateBreakdown(i, "subValue.format", e.target.value)}
            />
          </Flex>
        </Box>
      ))}
      <Button size="xs" variant="ghost" leftIcon={<FiPlus />} color="gray.500" onClick={addBreakdown}>
        Add breakdown category
      </Button>

      {/* Intermediates */}
      <SectionLabel>Intermediates (footnotes)</SectionLabel>
      {template.intermediateDefs.map((im, i) => (
        <FieldRow
          key={i}
          fields={[
            { label: "label", value: im.label, placeholder: "Total tonnes" },
            { label: "stepId", value: im.stepId, placeholder: "totalTonnes", mono: true },
            { label: "unit", value: im.unit, placeholder: "t" },
          ]}
          onChange={(fi, v) => {
            const fields: (keyof IntermediateDef)[] = ["label", "stepId", "unit"];
            updateIntermediate(i, fields[fi], v);
          }}
          onDelete={() => removeIntermediate(i)}
        />
      ))}
      <Button size="xs" variant="ghost" leftIcon={<FiPlus />} color="gray.500" onClick={addIntermediate}>
        Add intermediate
      </Button>
    </Box>
  );
};

export default TemplateEditor;
```

- [ ] **Commit**

```bash
git add client/src/components/pages/developer/CalculatorTemplates/TemplateEditor.tsx
git commit -m "feat(developer): add TemplateEditor form component"
```

---

## Task 9: TemplateList

**Files:**
- Create: `client/src/components/pages/developer/CalculatorTemplates/TemplateList.tsx`

- [ ] **Create the file**

```tsx
// client/src/components/pages/developer/CalculatorTemplates/TemplateList.tsx
import React from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { FiPlus } from "react-icons/fi";
import { CalculatorTemplate } from "../../../../components/TenderPricing/calculators/types";

interface TemplateListProps {
  templates: CalculatorTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  selectedId,
  onSelect,
  onNew,
}) => (
  <Box borderRight="1px solid" borderColor="gray.200" h="100%" minH="500px">
    <Flex
      px={3}
      py={2}
      align="center"
      justify="space-between"
      borderBottom="1px solid"
      borderColor="gray.100"
    >
      <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="wide">
        Templates
      </Text>
      <Button size="xs" colorScheme="blue" leftIcon={<FiPlus />} onClick={onNew}>
        New
      </Button>
    </Flex>

    {templates.length === 0 && (
      <Text fontSize="sm" color="gray.400" fontStyle="italic" p={3}>
        No templates yet
      </Text>
    )}

    {templates.map((t) => (
      <Box
        key={t.id}
        px={3}
        py={2.5}
        cursor="pointer"
        bg={selectedId === t.id ? "blue.50" : "white"}
        borderBottom="1px solid"
        borderColor="gray.50"
        _hover={{ bg: selectedId === t.id ? "blue.50" : "gray.50" }}
        onClick={() => onSelect(t.id)}
      >
        <Text fontSize="sm" fontWeight={selectedId === t.id ? 600 : 400} color="gray.800">
          {t.label || <Text as="span" color="gray.400" fontStyle="italic">Untitled</Text>}
        </Text>
        <Text fontSize="xs" color="gray.400" fontFamily="mono">
          {t.id || "—"} · {t.defaultUnit || "—"}
        </Text>
      </Box>
    ))}
  </Box>
);

export default TemplateList;
```

- [ ] **Commit**

```bash
git add client/src/components/pages/developer/CalculatorTemplates/TemplateList.tsx
git commit -m "feat(developer): add TemplateList sidebar component"
```

---

## Task 10: CalculatorTemplates root (wires everything)

**Files:**
- Create: `client/src/components/pages/developer/CalculatorTemplates/index.tsx`

- [ ] **Create the file**

```tsx
// client/src/components/pages/developer/CalculatorTemplates/index.tsx
import React, { useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { useCalculatorTemplates } from "../../../../components/TenderPricing/calculators/storage";
import {
  CalculatorTemplate,
  CalculatorInputs,
} from "../../../../components/TenderPricing/calculators/types";
import TemplateList from "./TemplateList";
import TemplateEditor from "./TemplateEditor";
import TemplateTestPanel from "./TemplateTestPanel";

const EMPTY_TEMPLATE: CalculatorTemplate = {
  id: "",
  label: "",
  defaultUnit: "m²",
  parameterDefs: [],
  tableDefs: [],
  formulaSteps: [],
  breakdownDefs: [],
  intermediateDefs: [],
  defaultInputs: { params: {}, tables: {} },
};

const CalculatorTemplates: React.FC = () => {
  const { templates, saveTemplates } = useCalculatorTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(
    templates[0]?.id ?? null
  );

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  const handleNew = () => {
    const draft = { ...EMPTY_TEMPLATE, id: `template-${Date.now()}` };
    saveTemplates([...templates, draft]);
    setSelectedId(draft.id);
  };

  const handleChange = (updated: CalculatorTemplate) => {
    saveTemplates(templates.map((t) => (t.id === selectedId ? updated : t)));
    // If the id field changed, follow it
    if (updated.id !== selectedId) setSelectedId(updated.id);
  };

  const handleUpdateDefaults = (inputs: CalculatorInputs) => {
    if (!selected) return;
    handleChange({ ...selected, defaultInputs: inputs });
  };

  return (
    <Flex borderWidth={1} borderColor="gray.200" rounded="lg" overflow="hidden" minH="600px">
      {/* Left: template list */}
      <Box w="220px" flexShrink={0}>
        <TemplateList
          templates={templates}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={handleNew}
        />
      </Box>

      {/* Right: editor + test panel */}
      {selected ? (
        <Flex flex={1} overflow="hidden">
          {/* Editor (left half) */}
          <Box flex={1} borderRight="1px solid" borderColor="gray.200" overflow="hidden">
            <Box
              px={4}
              py={2}
              borderBottom="1px solid"
              borderColor="gray.100"
              bg="gray.50"
            >
              <Text fontSize="xs" fontWeight="600" color="gray.600">Edit</Text>
            </Box>
            <TemplateEditor template={selected} onChange={handleChange} />
          </Box>

          {/* Test panel (right half) */}
          <Box flex={1} overflow="hidden">
            <Box
              px={4}
              py={2}
              borderBottom="1px solid"
              borderColor="gray.100"
              bg="gray.50"
            >
              <Text fontSize="xs" fontWeight="600" color="gray.600">Live Test</Text>
            </Box>
            <TemplateTestPanel
              template={selected}
              onUpdateDefaults={handleUpdateDefaults}
            />
          </Box>
        </Flex>
      ) : (
        <Flex flex={1} align="center" justify="center">
          <Text color="gray.400" fontSize="sm">Select a template or create a new one</Text>
        </Flex>
      )}
    </Flex>
  );
};

export default CalculatorTemplates;
```

- [ ] **Verify the developer page Calculator Templates tab is fully functional**

  Navigate to `/developer`, click "Calculator Templates". Click "New", fill in a basic template with one parameter and one formula step. Verify the live test panel updates as you type a formula.

- [ ] **Commit**

```bash
git add client/src/components/pages/developer/CalculatorTemplates/
git commit -m "feat(developer): add CalculatorTemplates admin tab with editor + live test panel"
```

---

## Task 11: Delete old calculator files

**Files:**
- Delete: `client/src/components/TenderPricing/AsphaltCalculator.tsx`
- Delete: `client/src/components/TenderPricing/GravelCalculator.tsx`
- Delete: `client/src/components/TenderPricing/asphalt.ts`
- Delete: `client/src/components/TenderPricing/gravel.ts`

- [ ] **Delete the files**

```bash
git rm client/src/components/TenderPricing/AsphaltCalculator.tsx \
       client/src/components/TenderPricing/GravelCalculator.tsx \
       client/src/components/TenderPricing/asphalt.ts \
       client/src/components/TenderPricing/gravel.ts
```

- [ ] **Verify no remaining imports of the deleted files**

```bash
grep -r "AsphaltCalculator\|GravelCalculator\|from.*asphalt\|from.*gravel" client/src/components/TenderPricing/
# Expected: no output
```

- [ ] **Run a client type-check to confirm no broken imports**

```bash
cd client && npm run type-check
# Expected: no errors
```

- [ ] **Check pod logs after Tilt rebuilds to confirm server still starts cleanly**

```bash
kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=20
```

- [ ] **Commit**

```bash
git commit -m "chore(calculators): remove old per-type calculator files replaced by template system"
```

---

## Validation Checklist

After all tasks are complete:

- [ ] `/developer` → Calculator Templates tab renders with template list and editor/test split
- [ ] Create a new template, add parameterDefs and formulaSteps — test panel shows live breakdown with correct numbers
- [ ] Table row edits in the test panel persist as template `defaultInputs` (survive page refresh)
- [ ] On a tender pricing sheet, the type picker shows only templates that exist in localStorage (empty if none)
- [ ] Creating a template with `id: "paving"` makes "Paving" appear in the pricing sheet type picker
- [ ] Selecting the type on a line item seeds `calculatorInputsJson` from the template's `defaultInputs`
- [ ] `CalculatorPanel` renders parameters, tables, and breakdown for the selected template
- [ ] Old rows with flat `calculatorInputsJson` are transparently migrated to the new `{ params, tables }` format
