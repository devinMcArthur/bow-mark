import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { FiPlus } from "react-icons/fi";
import { TenderPricingRow } from "./types";
import {
  GravelCalculatorInputs,
  GravelLabourEntry,
  GravelEquipmentEntry,
  computeGravel,
  parseGravelInputs,
} from "./gravel";
import { ParamInput, RateRow, BreakdownCell } from "./calculatorShared";

interface GravelCalculatorProps {
  row: TenderPricingRow;
  onSave: (data: Record<string, unknown>) => void;
}

const GravelCalculator: React.FC<GravelCalculatorProps> = ({ row, onSave }) => {
  const [inputs, setInputs] = useState<GravelCalculatorInputs>(() =>
    parseGravelInputs(row.calculatorInputsJson)
  );

  useEffect(() => {
    setInputs(parseGravelInputs(row.calculatorInputsJson));
  }, [row._id]);

  const quantity = row.quantity ?? 0;
  const computed = useMemo(() => computeGravel(inputs, quantity), [inputs, quantity]);

  const save = (updated: GravelCalculatorInputs) => {
    onSave({
      calculatorInputsJson: JSON.stringify(updated),
      unitPrice:
        updated.depthMm > 0
          ? parseFloat(computeGravel(updated, quantity).unitPrice.toFixed(4)) || null
          : null,
    });
  };

  // ── Labour ──────────────────────────────────────────────────────────────────

  const updateLabour = (id: string, field: keyof GravelLabourEntry, value: string | number) => {
    const updated = {
      ...inputs,
      labour: inputs.labour.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    };
    setInputs(updated);
    return updated;
  };

  const addLabour = () => {
    const updated = {
      ...inputs,
      labour: [
        ...inputs.labour,
        { id: `gl${Date.now()}`, name: "", qty: 1, ratePerHour: 0 },
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

  // ── Equipment ────────────────────────────────────────────────────────────────

  const updateEquip = (id: string, field: keyof GravelEquipmentEntry, value: string | number) => {
    const updated = {
      ...inputs,
      equipment: inputs.equipment.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    };
    setInputs(updated);
    return updated;
  };

  const addEquip = () => {
    const updated = {
      ...inputs,
      equipment: [
        ...inputs.equipment,
        { id: `ge${Date.now()}`, name: "", qty: 1, ratePerHour: 0 },
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
      {/* ── Top params ──────────────────────────────────────────────── */}
      <Grid templateColumns="repeat(3, 1fr)" gap={3} mb={5}>
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
          label="Production"
          suffix="t/hr"
          value={inputs.productionRate}
          onChange={(v) => setInputs({ ...inputs, productionRate: v })}
          onBlur={(v) => { const u = { ...inputs, productionRate: v }; setInputs(u); save(u); }}
        />
      </Grid>

      {/* ── Trucking ────────────────────────────────────────────────── */}
      <Box mb={5}>
        <Flex align="center" justify="space-between" mb={2}>
          <Text
            fontSize="xs"
            fontWeight="semibold"
            color="gray.600"
            textTransform="uppercase"
            letterSpacing="wide"
          >
            Trucking
          </Text>
          <Text fontSize="xs" color="gray.500">
            {computed.truckingPerT > 0
              ? `$${computed.truckingPerT.toFixed(2)}/t combined`
              : "—"}
          </Text>
        </Flex>
        <Box borderWidth={1} borderColor="gray.200" rounded="md" overflow="hidden">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#F7FAFC" }}>
                <th style={{ textAlign: "left",  padding: "4px 8px", fontWeight: 500, color: "#718096" }}>Type</th>
                <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "130px" }}>Rate ($/hr)</th>
                <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "130px" }}>Round Trip (min)</th>
                <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "80px" }}>$/t</th>
              </tr>
            </thead>
            <tbody>
              <TruckRow
                label="Tandem (13t)"
                rate={inputs.tandemRate}
                roundTrip={inputs.tandemRoundTripMin}
                perT={computed.tandemPerT}
                onChangeRate={(v) => { const u = { ...inputs, tandemRate: v }; setInputs(u); save(u); }}
                onChangeRoundTrip={(v) => { const u = { ...inputs, tandemRoundTripMin: v }; setInputs(u); save(u); }}
              />
              <TruckRow
                label="Truck & Pup (25t)"
                rate={inputs.pupRate}
                roundTrip={inputs.pupRoundTripMin}
                perT={computed.pupPerT}
                onChangeRate={(v) => { const u = { ...inputs, pupRate: v }; setInputs(u); save(u); }}
                onChangeRoundTrip={(v) => { const u = { ...inputs, pupRoundTripMin: v }; setInputs(u); save(u); }}
              />
            </tbody>
          </table>
        </Box>
      </Box>

      {/* ── Labour + Equipment tables ────────────────────────────────── */}
      <Grid templateColumns="1fr 1fr" gap={4} mb={5}>
        {/* Labour */}
        <Box>
          <Flex align="center" justify="space-between" mb={2}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.600" textTransform="uppercase" letterSpacing="wide">
              Labour
            </Text>
            <Text fontSize="xs" color="gray.500">
              ${computed.labourRatePerHr.toFixed(2)}/hr
            </Text>
          </Flex>
          <Box borderWidth={1} borderColor="gray.200" rounded="md" overflow="hidden">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#F7FAFC" }}>
                  <th style={{ textAlign: "left",   padding: "4px 8px", fontWeight: 500, color: "#718096" }}>Role</th>
                  <th style={{ textAlign: "center", padding: "4px 4px", fontWeight: 500, color: "#718096", width: "40px" }}>Qty</th>
                  <th style={{ textAlign: "right",  padding: "4px 8px", fontWeight: 500, color: "#718096", width: "70px" }}>$/hr</th>
                  <th style={{ textAlign: "right",  padding: "4px 8px", fontWeight: 500, color: "#718096", width: "70px" }}>Total</th>
                  <th style={{ width: "28px" }} />
                </tr>
              </thead>
              <tbody>
                {inputs.labour.map((entry) => (
                  <RateRow
                    key={entry.id}
                    entry={entry}
                    onChangeName={(v) => { const u = updateLabour(entry.id, "name", v); save(u); }}
                    onChangeQty={(v)  => { const u = updateLabour(entry.id, "qty", v);  save(u); }}
                    onChangeRate={(v) => { const u = updateLabour(entry.id, "ratePerHour", v); save(u); }}
                    onDelete={() => removeLabour(entry.id)}
                  />
                ))}
              </tbody>
            </table>
          </Box>
          <Button size="xs" variant="ghost" leftIcon={<FiPlus />} mt={1} color="gray.500" onClick={addLabour}>
            Add
          </Button>
        </Box>

        {/* Equipment */}
        <Box>
          <Flex align="center" justify="space-between" mb={2}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.600" textTransform="uppercase" letterSpacing="wide">
              Equipment
            </Text>
            <Text fontSize="xs" color="gray.500">
              ${computed.equipmentRatePerHr.toFixed(2)}/hr
            </Text>
          </Flex>
          <Box borderWidth={1} borderColor="gray.200" rounded="md" overflow="hidden">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#F7FAFC" }}>
                  <th style={{ textAlign: "left",   padding: "4px 8px", fontWeight: 500, color: "#718096" }}>Item</th>
                  <th style={{ textAlign: "center", padding: "4px 4px", fontWeight: 500, color: "#718096", width: "40px" }}>Qty</th>
                  <th style={{ textAlign: "right",  padding: "4px 8px", fontWeight: 500, color: "#718096", width: "70px" }}>$/hr</th>
                  <th style={{ textAlign: "right",  padding: "4px 8px", fontWeight: 500, color: "#718096", width: "70px" }}>Total</th>
                  <th style={{ width: "28px" }} />
                </tr>
              </thead>
              <tbody>
                {inputs.equipment.map((entry) => (
                  <RateRow
                    key={entry.id}
                    entry={entry}
                    onChangeName={(v) => { const u = updateEquip(entry.id, "name", v);          save(u); }}
                    onChangeQty={(v)  => { const u = updateEquip(entry.id, "qty", v);            save(u); }}
                    onChangeRate={(v) => { const u = updateEquip(entry.id, "ratePerHour", v);    save(u); }}
                    onDelete={() => removeEquip(entry.id)}
                  />
                ))}
              </tbody>
            </table>
          </Box>
          <Button size="xs" variant="ghost" leftIcon={<FiPlus />} mt={1} color="gray.500" onClick={addEquip}>
            Add
          </Button>
        </Box>
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
          Cost Breakdown ($/m²)
        </Text>
        <Grid
          templateColumns="repeat(5, 1fr)"
          gap={0}
          borderWidth={1}
          borderColor="gray.200"
          rounded="lg"
          overflow="hidden"
        >
          <BreakdownCell label="Material"  value={computed.materialPerM2}  borderRight />
          <BreakdownCell
            label="Trucking"
            value={computed.truckingPerM2}
            borderRight
            subValue={computed.truckingPerT > 0 ? `$${computed.truckingPerT.toFixed(2)}/t` : undefined}
          />
          <BreakdownCell label="Labour"    value={computed.labourPerM2}    borderRight />
          <BreakdownCell label="Equipment" value={computed.equipmentPerM2} borderRight />
          <BreakdownCell label="Unit Price" value={computed.unitPrice}     highlight />
        </Grid>
        {quantity > 0 && (
          <Text fontSize="xs" color="gray.400" mt={2}>
            {quantity.toLocaleString()} m² × {computed.tonnesPerM2.toFixed(4)} t/m² ={" "}
            {computed.tonnes.toFixed(1)} t
          </Text>
        )}
      </Box>
    </Box>
  );
};

// ── TruckRow ───────────────────────────────────────────────────────────────────

interface TruckRowProps {
  label: string;
  rate: number;
  roundTrip: number;
  perT: number;
  onChangeRate: (v: number) => void;
  onChangeRoundTrip: (v: number) => void;
}

const TruckRow: React.FC<TruckRowProps> = ({
  label,
  rate,
  roundTrip,
  perT,
  onChangeRate,
  onChangeRoundTrip,
}) => {
  const [draftRate, setDraftRate] = useState(String(rate));
  const [draftRt, setDraftRt] = useState(String(roundTrip));

  useEffect(() => { setDraftRate(String(rate)); }, [rate]);
  useEffect(() => { setDraftRt(String(roundTrip)); }, [roundTrip]);

  const cellStyle: React.CSSProperties = {
    padding: "4px 0",
    borderBottom: "1px solid #EDF2F7",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: "12px",
    padding: "2px 8px",
    color: "#2D3748",
    textAlign: "right",
  };

  return (
    <tr>
      <td style={{ ...cellStyle, padding: "4px 8px", color: "#4A5568", fontSize: "12px" }}>
        {label}
      </td>
      <td style={cellStyle}>
        <input
          style={inputStyle}
          value={draftRate}
          onChange={(e) => setDraftRate(e.target.value)}
          onBlur={() => {
            const n = parseFloat(draftRate);
            onChangeRate(isNaN(n) ? 0 : n);
          }}
        />
      </td>
      <td style={cellStyle}>
        <input
          style={inputStyle}
          value={draftRt}
          onChange={(e) => setDraftRt(e.target.value)}
          onBlur={() => {
            const n = parseFloat(draftRt);
            onChangeRoundTrip(isNaN(n) ? 0 : n);
          }}
        />
      </td>
      <td
        style={{
          ...cellStyle,
          textAlign: "right",
          paddingRight: "8px",
          color: perT > 0 ? "#2D3748" : "#A0AEC0",
          fontWeight: perT > 0 ? 500 : 400,
          fontSize: "12px",
        }}
      >
        {perT > 0 ? `$${perT.toFixed(2)}` : "—"}
      </td>
    </tr>
  );
};

export default GravelCalculator;
