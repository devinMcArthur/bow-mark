import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { FiPlus } from "react-icons/fi";
import { TenderPricingRow } from "./types";
import {
  AsphaltCalculatorInputs,
  AsphaltLabourEntry,
  AsphaltEquipmentEntry,
  computeAsphalt,
  parseCalculatorInputs,
} from "./asphalt";
import { ParamInput, RateRow, BreakdownCell } from "./calculatorShared";

interface AsphaltCalculatorProps {
  row: TenderPricingRow;
  onSave: (data: Record<string, unknown>) => void;
}

const AsphaltCalculator: React.FC<AsphaltCalculatorProps> = ({ row, onSave }) => {
  const [inputs, setInputs] = useState<AsphaltCalculatorInputs>(() =>
    parseCalculatorInputs(row.calculatorInputsJson)
  );

  // Reset when row changes
  useEffect(() => {
    setInputs(parseCalculatorInputs(row.calculatorInputsJson));
  }, [row._id]);

  const quantity = row.quantity ?? 0;
  const computed = useMemo(() => computeAsphalt(inputs, quantity), [inputs, quantity]);

  const save = (updated: AsphaltCalculatorInputs) => {
    onSave({
      calculatorInputsJson: JSON.stringify(updated),
      unitPrice: updated.depthMm > 0
        ? parseFloat(computeAsphalt(updated, quantity).unitPrice.toFixed(4)) || null
        : null,
    });
  };

  // ── Labour table ─────────────────────────────────────────────────────────
  const updateLabourEntry = (id: string, field: keyof AsphaltLabourEntry, value: string | number) => {
    const updated = {
      ...inputs,
      labour: inputs.labour.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      ),
    };
    setInputs(updated);
    return updated;
  };

  const addLabour = () => {
    const updated = {
      ...inputs,
      labour: [
        ...inputs.labour,
        { id: `l${Date.now()}`, name: "", qty: 1, ratePerHour: 0 },
      ],
    };
    setInputs(updated);
    save(updated);
  };

  const removeLabour = (id: string) => {
    const updated = { ...inputs, labour: inputs.labour.filter((e) => e.id !== id) };
    setInputs(updated);
    save(updated);
  };

  // ── Equipment table ───────────────────────────────────────────────────────
  const updateEquipEntry = (id: string, field: keyof AsphaltEquipmentEntry, value: string | number) => {
    const updated = {
      ...inputs,
      equipment: inputs.equipment.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      ),
    };
    setInputs(updated);
    return updated;
  };

  const addEquip = () => {
    const updated = {
      ...inputs,
      equipment: [
        ...inputs.equipment,
        { id: `e${Date.now()}`, name: "", qty: 1, ratePerHour: 0 },
      ],
    };
    setInputs(updated);
    save(updated);
  };

  const removeEquip = (id: string) => {
    const updated = { ...inputs, equipment: inputs.equipment.filter((e) => e.id !== id) };
    setInputs(updated);
    save(updated);
  };

  return (
    <Box>
      {/* ── Parameters ──────────────────────────────────────────────── */}
      <Grid templateColumns="repeat(5, 1fr)" gap={3} mb={5}>
        <ParamInput
          label="Depth"
          suffix="mm"
          value={inputs.depthMm}
          onChange={(v) => setInputs({ ...inputs, depthMm: v })}
          onBlur={(v) => { const u = { ...inputs, depthMm: v }; setInputs(u); save(u); }}
        />
        <ParamInput
          label="Material"
          prefix="$"
          suffix="/t"
          value={inputs.materialRate}
          onChange={(v) => setInputs({ ...inputs, materialRate: v })}
          onBlur={(v) => { const u = { ...inputs, materialRate: v }; setInputs(u); save(u); }}
        />
        <ParamInput
          label="Truck Rate"
          prefix="$"
          suffix="/hr"
          value={inputs.truckRate}
          onChange={(v) => setInputs({ ...inputs, truckRate: v })}
          onBlur={(v) => { const u = { ...inputs, truckRate: v }; setInputs(u); save(u); }}
        />
        <ParamInput
          label="Round Trip"
          suffix="min"
          value={inputs.roundTripMin}
          onChange={(v) => setInputs({ ...inputs, roundTripMin: v })}
          onBlur={(v) => { const u = { ...inputs, roundTripMin: v }; setInputs(u); save(u); }}
        />
        <ParamInput
          label="Production"
          suffix="t/hr"
          value={inputs.productionRate}
          onChange={(v) => setInputs({ ...inputs, productionRate: v })}
          onBlur={(v) => { const u = { ...inputs, productionRate: v }; setInputs(u); save(u); }}
        />
      </Grid>

      {/* ── Tables ──────────────────────────────────────────────────── */}
      <Grid templateColumns="1fr 1fr" gap={4} mb={5}>
        {/* Labour */}
        <Box>
          <Flex align="center" justify="space-between" mb={2}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.600" textTransform="uppercase" letterSpacing="wide">
              Labour
            </Text>
            <Text fontSize="xs" color="gray.500">${computed.labourRatePerHr.toFixed(2)}/hr</Text>
          </Flex>
          <Box borderWidth={1} borderColor="gray.200" rounded="md" overflow="hidden">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#F7FAFC" }}>
                  <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 500, color: "#718096" }}>Role</th>
                  <th style={{ textAlign: "center", padding: "4px 4px", fontWeight: 500, color: "#718096", width: "40px" }}>Qty</th>
                  <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "70px" }}>$/hr</th>
                  <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "70px" }}>Total</th>
                  <th style={{ width: "28px" }} />
                </tr>
              </thead>
              <tbody>
                {inputs.labour.map((entry) => (
                  <RateRow
                    key={entry.id}
                    entry={entry}
                    onChangeName={(v) => {
                      const u = updateLabourEntry(entry.id, "name", v);
                      save(u);
                    }}
                    onChangeQty={(v) => {
                      const u = updateLabourEntry(entry.id, "qty", v);
                      save(u);
                    }}
                    onChangeRate={(v) => {
                      const u = updateLabourEntry(entry.id, "ratePerHour", v);
                      save(u);
                    }}
                    onDelete={() => removeLabour(entry.id)}
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
            onClick={addLabour}
          >
            Add
          </Button>
        </Box>

        {/* Equipment */}
        <Box>
          <Flex align="center" justify="space-between" mb={2}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.600" textTransform="uppercase" letterSpacing="wide">
              Equipment
            </Text>
            <Text fontSize="xs" color="gray.500">${computed.equipmentRatePerHr.toFixed(2)}/hr</Text>
          </Flex>
          <Box borderWidth={1} borderColor="gray.200" rounded="md" overflow="hidden">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#F7FAFC" }}>
                  <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 500, color: "#718096" }}>Item</th>
                  <th style={{ textAlign: "center", padding: "4px 4px", fontWeight: 500, color: "#718096", width: "40px" }}>Qty</th>
                  <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "70px" }}>$/hr</th>
                  <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "70px" }}>Total</th>
                  <th style={{ width: "28px" }} />
                </tr>
              </thead>
              <tbody>
                {inputs.equipment.map((entry) => (
                  <RateRow
                    key={entry.id}
                    entry={entry}
                    onChangeName={(v) => {
                      const u = updateEquipEntry(entry.id, "name", v);
                      save(u);
                    }}
                    onChangeQty={(v) => {
                      const u = updateEquipEntry(entry.id, "qty", v);
                      save(u);
                    }}
                    onChangeRate={(v) => {
                      const u = updateEquipEntry(entry.id, "ratePerHour", v);
                      save(u);
                    }}
                    onDelete={() => removeEquip(entry.id)}
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
            onClick={addEquip}
          >
            Add
          </Button>
        </Box>
      </Grid>

      {/* ── Cost breakdown ──────────────────────────────────────────── */}
      <Box>
        <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={2}>
          Cost Breakdown ($/m²)
        </Text>
        <Grid templateColumns="repeat(5, 1fr)" gap={0} borderWidth={1} borderColor="gray.200" rounded="lg" overflow="hidden">
          <BreakdownCell label="Material" value={computed.materialPerM2} borderRight />
          <BreakdownCell label="Trucking" value={computed.truckingPerM2} borderRight subValue={`$${computed.truckingPerT.toFixed(2)}/t`} />
          <BreakdownCell label="Labour" value={computed.labourPerM2} borderRight />
          <BreakdownCell label="Equipment" value={computed.equipmentPerM2} borderRight />
          <BreakdownCell label="Unit Price" value={computed.unitPrice} highlight />
        </Grid>
        {quantity > 0 && (
          <Text fontSize="xs" color="gray.400" mt={2}>
            {quantity.toLocaleString()} m² × {computed.tonnesPerM2.toFixed(4)} t/m² = {computed.tonnes.toFixed(1)} t
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default AsphaltCalculator;
