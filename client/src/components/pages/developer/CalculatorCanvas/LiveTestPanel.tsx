// client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Grid, Input, Text } from "@chakra-ui/react";
import { v4 as uuidv4 } from "uuid";
import { FiPlus } from "react-icons/fi";
import { CanvasDocument } from "./canvasStorage";
import { RateEntry } from "../../../../components/TenderPricing/calculators/types";
import {
  evaluateTemplate,
  debugEvaluateTemplate,
} from "../../../../components/TenderPricing/calculators/evaluate";
import {
  BreakdownCell,
  RateRow,
} from "../../../../components/TenderPricing/calculatorShared";

interface Props {
  doc: CanvasDocument;
  onCollapse: () => void;
}

const LiveTestPanel: React.FC<Props> = ({ doc, onCollapse }) => {
  const [quantity, setQuantity] = useState(100);
  const [params, setParams] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      doc.parameterDefs.map((p) => [p.id, doc.defaultInputs.params[p.id] ?? p.defaultValue])
    )
  );
  const [tables, setTables] = useState<Record<string, RateEntry[]>>(
    () => doc.defaultInputs.tables
  );

  // Reset scratch state when the active doc changes
  useEffect(() => {
    setQuantity(100);
    setParams(
      Object.fromEntries(
        doc.parameterDefs.map((p) => [p.id, doc.defaultInputs.params[p.id] ?? p.defaultValue])
      )
    );
    setTables(doc.defaultInputs.tables);
  }, [doc.id]);

  const inputs = useMemo(() => ({ params, tables }), [params, tables]);

  const result = useMemo(
    () => evaluateTemplate(doc, inputs, quantity),
    [doc, inputs, quantity]
  );

  const stepDebug = useMemo(
    () => debugEvaluateTemplate(doc, inputs, quantity),
    [doc, inputs, quantity]
  );

  const updateRow = (
    tableId: string,
    rowId: string,
    field: keyof RateEntry,
    value: string | number
  ) => {
    setTables((prev) => ({
      ...prev,
      [tableId]: (prev[tableId] ?? []).map((r) =>
        r.id === rowId ? { ...r, [field]: value } : r
      ),
    }));
  };

  const addRow = (tableId: string) => {
    setTables((prev) => ({
      ...prev,
      [tableId]: [
        ...(prev[tableId] ?? []),
        { id: uuidv4(), name: "", qty: 1, ratePerHour: 0 },
      ],
    }));
  };

  const removeRow = (tableId: string, rowId: string) => {
    setTables((prev) => ({
      ...prev,
      [tableId]: (prev[tableId] ?? []).filter((r) => r.id !== rowId),
    }));
  };

  return (
    <Box h="100%" overflowY="auto" bg="white">
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        px={3}
        py={2}
        borderBottom="1px solid"
        borderColor="gray.100"
        position="sticky"
        top={0}
        bg="white"
        zIndex={1}
      >
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="gray.500"
          textTransform="uppercase"
          letterSpacing="wide"
        >
          Live Test
        </Text>
        <Button
          size="xs"
          variant="ghost"
          onClick={onCollapse}
          aria-label="Collapse live test panel"
          px={1}
          minW="auto"
          color="gray.400"
          _hover={{ color: "gray.600" }}
        >
          «
        </Button>
      </Flex>

      <Box px={3} py={3}>
        {/* Quantity */}
        <Flex align="center" gap={2} mb={4}>
          <Text fontSize="sm" color="gray.600" flex={1}>
            Quantity
          </Text>
          <Input
            size="sm"
            type="number"
            w="80px"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            textAlign="right"
          />
          <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">
            {doc.defaultUnit}
          </Text>
        </Flex>

        {/* Parameters */}
        {doc.parameterDefs.length > 0 && (
          <>
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color="gray.400"
              textTransform="uppercase"
              letterSpacing="wide"
              mb={2}
            >
              Parameters
            </Text>
            <Grid templateColumns="1fr 80px" gap={2} alignItems="center" mb={4}>
              {doc.parameterDefs.map((p) => (
                <React.Fragment key={p.id}>
                  <Text fontSize="sm" color="gray.700">
                    {p.label}
                    {p.suffix && (
                      <Text as="span" fontSize="xs" color="gray.400">
                        {" "}
                        ({p.suffix})
                      </Text>
                    )}
                  </Text>
                  <Input
                    size="sm"
                    type="number"
                    textAlign="right"
                    value={params[p.id] ?? p.defaultValue}
                    onChange={(e) =>
                      setParams((prev) => ({
                        ...prev,
                        [p.id]: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </React.Fragment>
              ))}
            </Grid>
          </>
        )}

        {/* Rate Tables */}
        {doc.tableDefs.map((t) => {
          const rows = tables[t.id] ?? [];
          const ratePerHr = rows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);
          return (
            <Box key={t.id} mb={4}>
              <Flex align="center" justify="space-between" mb={1}>
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color="gray.400"
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
                      <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "64px" }}>
                        $/hr
                      </th>
                      <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "64px" }}>
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
                        onChangeName={(v) => updateRow(t.id, row.id, "name", v)}
                        onChangeQty={(v) => updateRow(t.id, row.id, "qty", v)}
                        onChangeRate={(v) => updateRow(t.id, row.id, "ratePerHour", v)}
                        onDelete={() => removeRow(t.id, row.id)}
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
                onClick={() => addRow(t.id)}
              >
                Add
              </Button>
            </Box>
          );
        })}

        {/* Summary breakdown */}
        {result.breakdown.length > 0 && (
          <>
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color="gray.400"
              textTransform="uppercase"
              letterSpacing="wide"
              mb={2}
            >
              Summary
            </Text>
            <Grid
              templateColumns={`repeat(${result.breakdown.length + 1}, 1fr)`}
              gap={0}
              borderWidth={1}
              borderColor="gray.200"
              rounded="lg"
              overflow="hidden"
              mb={3}
            >
              {result.breakdown.map((cat) => (
                <BreakdownCell key={cat.id} label={cat.label} value={cat.value} borderRight />
              ))}
              <BreakdownCell label="Unit Price" value={result.unitPrice} highlight />
            </Grid>
          </>
        )}

        {/* Formula step debug */}
        {stepDebug.length > 0 && (
          <Box mt={2}>
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color="gray.400"
              textTransform="uppercase"
              letterSpacing="wide"
              mb={2}
            >
              Formula Steps
            </Text>
            <Box borderWidth={1} borderColor="gray.200" rounded="md" overflow="hidden">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ background: "#F7FAFC" }}>
                    <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 600, color: "#718096", fontFamily: "monospace" }}>
                      id
                    </th>
                    <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 600, color: "#718096", fontFamily: "monospace" }}>
                      formula
                    </th>
                    <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600, color: "#718096", width: "80px" }}>
                      value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stepDebug.map((s) => (
                    <tr
                      key={s.id}
                      style={{
                        background: s.error ? "#FFF5F5" : "white",
                        borderTop: "1px solid #EDF2F7",
                      }}
                    >
                      <td style={{ padding: "4px 8px", fontFamily: "monospace", color: s.error ? "#C53030" : "#4A5568" }}>
                        {s.id}
                      </td>
                      <td style={{ padding: "4px 8px", fontFamily: "monospace", color: "#805AD5" }}>
                        {s.formula}
                        {s.error && (
                          <span style={{ color: "#C53030", marginLeft: 8, fontFamily: "sans-serif" }}>
                            ⚠ {s.error}
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "4px 8px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: s.error ? "#C53030" : "#1A202C",
                        }}
                      >
                        {s.error ? "—" : s.value.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default LiveTestPanel;
