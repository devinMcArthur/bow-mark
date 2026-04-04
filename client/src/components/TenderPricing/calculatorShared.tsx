import React, { useEffect, useState } from "react";
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftAddon,
  Text,
} from "@chakra-ui/react";

// ── ParamInput ─────────────────────────────────────────────────────────────────

interface ParamInputProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  onChange: (v: number) => void;
  onBlur: (v: number) => void;
}

export const ParamInput: React.FC<ParamInputProps> = ({
  label,
  value,
  prefix,
  suffix,
  onChange,
  onBlur,
}) => {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);

  return (
    <FormControl>
      <FormLabel fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>
        {label}
      </FormLabel>
      <InputGroup size="sm">
        {prefix && <InputLeftAddon>{prefix}</InputLeftAddon>}
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = parseFloat(e.target.value);
            if (!isNaN(n)) onChange(n);
          }}
          onBlur={() => {
            const n = parseFloat(draft);
            onBlur(isNaN(n) ? 0 : n);
          }}
          textAlign="right"
        />
        {suffix && (
          <Box
            display="flex"
            alignItems="center"
            px={2}
            fontSize="xs"
            color="gray.500"
            bg="gray.50"
            border="1px solid"
            borderColor="gray.200"
            borderLeft="none"
            roundedRight="md"
            whiteSpace="nowrap"
          >
            {suffix}
          </Box>
        )}
      </InputGroup>
    </FormControl>
  );
};

// ── RateRow ────────────────────────────────────────────────────────────────────

interface RateRowProps {
  entry: { id: string; name: string; qty: number; ratePerHour: number };
  onChangeName: (v: string) => void;
  onChangeQty: (v: number) => void;
  onChangeRate: (v: number) => void;
  onDelete: () => void;
}

export const RateRow: React.FC<RateRowProps> = ({
  entry,
  onChangeName,
  onChangeQty,
  onChangeRate,
  onDelete,
}) => {
  const [name, setName] = useState(entry.name);
  const [qty, setQty] = useState(String(entry.qty));
  const [rate, setRate] = useState(String(entry.ratePerHour));

  useEffect(() => { setName(entry.name); }, [entry.name]);
  useEffect(() => { setQty(String(entry.qty)); }, [entry.qty]);
  useEffect(() => { setRate(String(entry.ratePerHour)); }, [entry.ratePerHour]);

  const total = entry.qty * entry.ratePerHour;

  const cellStyle: React.CSSProperties = {
    padding: "3px 0",
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
  };

  return (
    <tr>
      <td style={cellStyle}>
        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => onChangeName(name)}
          placeholder="Name"
        />
      </td>
      <td style={{ ...cellStyle, textAlign: "center" }}>
        <input
          style={{ ...inputStyle, textAlign: "center", width: "40px" }}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onBlur={() => {
            const n = parseFloat(qty);
            onChangeQty(isNaN(n) ? 0 : n);
          }}
        />
      </td>
      <td style={{ ...cellStyle, textAlign: "right" }}>
        <input
          style={{ ...inputStyle, textAlign: "right" }}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          onBlur={() => {
            const n = parseFloat(rate);
            onChangeRate(isNaN(n) ? 0 : n);
          }}
        />
      </td>
      <td
        style={{
          ...cellStyle,
          textAlign: "right",
          paddingRight: "8px",
          color: "#4A5568",
          fontWeight: 500,
        }}
      >
        ${total.toFixed(2)}
      </td>
      <td style={{ ...cellStyle, textAlign: "center" }}>
        <button
          onClick={onDelete}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#FC8181",
            padding: "0 4px",
          }}
        >
          ×
        </button>
      </td>
    </tr>
  );
};

// ── BreakdownCell ──────────────────────────────────────────────────────────────

interface BreakdownCellProps {
  label: string;
  value: number;
  subValue?: string;
  borderRight?: boolean;
  highlight?: boolean;
}

export const BreakdownCell: React.FC<BreakdownCellProps> = ({
  label,
  value,
  subValue,
  borderRight,
  highlight,
}) => (
  <Box
    px={3}
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
    <Text fontSize="md" fontWeight="bold" color={highlight ? "white" : "gray.800"}>
      {value > 0 ? `$${value.toFixed(2)}` : "—"}
    </Text>
    {subValue && (
      <Text fontSize="xs" color={highlight ? "blue.200" : "gray.400"} mt={0.5}>
        {subValue}
      </Text>
    )}
  </Box>
);
