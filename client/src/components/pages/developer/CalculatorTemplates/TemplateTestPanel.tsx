// client/src/components/pages/developer/CalculatorTemplates/TemplateTestPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Grid, Input, Text } from "@chakra-ui/react";
import {
  CalculatorTemplate,
  CalculatorInputs,
  RateEntry,
} from "../../../../components/TenderPricing/calculators/types";
import { evaluateTemplate } from "../../../../components/TenderPricing/calculators/evaluate";
import { BreakdownCell, RateRow } from "../../../../components/TenderPricing/calculatorShared";
import { FiPlus } from "react-icons/fi";

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
