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
