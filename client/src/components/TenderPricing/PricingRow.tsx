import React, { useState, useRef } from "react";
import {
  Flex,
  IconButton,
  Input,
  Text,
  Td,
  Tr,
  Tooltip,
} from "@chakra-ui/react";
import { FiTrash2, FiMenu } from "react-icons/fi";
import { useSystem } from "../../contexts/System";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TenderPricingRow, TenderPricingRowType } from "./types";
import { computeRow, computeSubtotal, formatCurrency, formatMarkup } from "./compute";

// ─── Inline editable cell ─────────────────────────────────────────────────────

interface EditableCellProps {
  value: string | number | null | undefined;
  onSave: (val: string) => void;
  placeholder?: string;
  textAlign?: "left" | "right";
  minW?: string;
  wrap?: boolean;
  hoverBg?: string;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onSave,
  placeholder = "—",
  textAlign = "left",
  minW = "60px",
  wrap = false,
  hoverBg = "blue.50",
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(value != null ? String(value) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    setEditing(false);
    onSave(draft);
  };

  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        variant="unstyled"
        fontSize="sm"
        px={1}
        w="100%"
        textAlign={textAlign}
        borderBottom="1px solid"
        borderColor="blue.400"
        rounded="none"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        autoFocus
      />
    );
  }

  return (
    <Text
      onClick={startEdit}
      cursor="text"
      w="100%"
      textAlign={textAlign}
      color={value == null || value === "" ? "gray.400" : undefined}
      _hover={{ bg: hoverBg, rounded: "sm" }}
      px={1}
      fontSize="sm"
      isTruncated={!wrap}
      whiteSpace={wrap ? "normal" : undefined}
    >
      {value != null && value !== "" ? String(value) : placeholder}
    </Text>
  );
};

// ─── Markup delta cell ────────────────────────────────────────────────────────

interface MarkupCellProps {
  markupOverride: number | null | undefined;
  effectiveMarkup: number;
  onSave: (delta: number | null) => void;
}

const MarkupCell: React.FC<MarkupCellProps> = ({ markupOverride, effectiveMarkup, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const hasOverride = markupOverride != null;
  const label = formatMarkup(markupOverride);

  const startEdit = () => {
    setDraft(hasOverride ? String(markupOverride) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === "+") {
      onSave(null);
    } else {
      const n = parseFloat(trimmed);
      onSave(isNaN(n) || n === 0 ? null : n);
    }
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        variant="unstyled"
        fontSize="xs"
        px={1}
        w="100%"
        textAlign="center"
        borderBottom="1px solid"
        borderColor="blue.400"
        rounded="none"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
      />
    );
  }

  return (
    <Tooltip label={`Effective: ${effectiveMarkup}%`} placement="top">
      <Text
        fontSize="xs"
        cursor="pointer"
        textAlign="center"
        color={hasOverride ? "blue.600" : "gray.400"}
        onClick={startEdit}
        _hover={{ bg: "blue.50", rounded: "sm" }}
        px={1}
      >
        {label}
      </Text>
    </Tooltip>
  );
};

// ─── Unit select cell ─────────────────────────────────────────────────────────

interface UnitCellProps {
  value: string | null | undefined;
  onSave: (val: string) => void;
}

const UnitCell: React.FC<UnitCellProps> = ({ value, onSave }) => {
  const { state: { system } } = useSystem();
  const units = system?.unitDefaults ?? [];

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onSave(e.target.value)}
      style={{
        width: "100%",
        fontSize: "0.875rem",
        background: "transparent",
        border: "none",
        outline: "none",
        cursor: "pointer",
        padding: "0 4px",
        color: value ? "inherit" : "#A0AEC0",
      }}
    >
      <option value="">—</option>
      {units.map((u) => (
        <option key={u} value={u}>{u}</option>
      ))}
    </select>
  );
};

// ─── Sortable row (wraps both header and item variants) ───────────────────────

interface SortableRowProps {
  row: TenderPricingRow;
  rows: TenderPricingRow[];
  rowIndex: number;
  defaultMarkupPct: number;
  selectedRowId: string | null;
  onUpdate: (rowId: string, data: Record<string, unknown>) => void;
  onDelete: (rowId: string) => void;
  onSelect: (rowId: string) => void;
}

export const SortableRow: React.FC<SortableRowProps> = ({
  row,
  rows,
  rowIndex,
  defaultMarkupPct,
  selectedRowId,
  onUpdate,
  onDelete,
  onSelect,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row._id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: isDragging ? "relative" : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  const isHeader =
    row.type === TenderPricingRowType.Schedule ||
    row.type === TenderPricingRowType.Group;

  if (isHeader) {
    return (
      <HeaderRow
        row={row}
        rows={rows}
        rowIndex={rowIndex}
        defaultMarkupPct={defaultMarkupPct}
        onUpdate={onUpdate}
        onDelete={onDelete}
        nodeRef={setNodeRef}
        style={style}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    );
  }

  return (
    <ItemRow
      row={row}
      defaultMarkupPct={defaultMarkupPct}
      isSelected={row._id === selectedRowId}
      onDelete={onDelete}
      onSelect={onSelect}
      nodeRef={setNodeRef}
      style={style}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
};

// ─── Drag handle cell ─────────────────────────────────────────────────────────

const DragHandle: React.FC<Record<string, unknown>> = (props) => (
  <Td w="28px" px={1}>
    <Text
      as="span"
      color="gray.300"
      cursor="grab"
      _hover={{ color: "gray.500" }}
      display="flex"
      alignItems="center"
      {...props}
    >
      <FiMenu size={14} />
    </Text>
  </Td>
);

// ─── Schedule / Group header row ─────────────────────────────────────────────

interface HeaderRowProps {
  row: TenderPricingRow;
  rows: TenderPricingRow[];
  rowIndex: number;
  defaultMarkupPct: number;
  onUpdate: (rowId: string, data: Record<string, unknown>) => void;
  onDelete: (rowId: string) => void;
  nodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  dragHandleProps?: Record<string, unknown>;
}

const HeaderRow: React.FC<HeaderRowProps> = ({
  row,
  rows,
  rowIndex,
  defaultMarkupPct,
  onUpdate,
  onDelete,
  nodeRef,
  style,
  dragHandleProps,
}) => {
  const subtotal = computeSubtotal(rows, rowIndex, defaultMarkupPct);
  const isSchedule = row.type === TenderPricingRowType.Schedule;

  return (
    <Tr
      ref={nodeRef as any}
      style={style}
      bg={isSchedule ? "gray.700" : "gray.100"}
      color={isSchedule ? "white" : "gray.800"}
    >
      <DragHandle {...dragHandleProps} />
      <Td px={1}>
        {isSchedule ? (
          <Text fontSize="xs" color="gray.300">
            {row.itemNumber || ""}
          </Text>
        ) : (
          <EditableCell
            value={row.itemNumber}
            placeholder="#"
            onSave={(v) => onUpdate(row._id, { itemNumber: v })}
          />
        )}
      </Td>
      <Td colSpan={5}>
        <EditableCell
          value={row.description}
          placeholder="Description"
          onSave={(v) => onUpdate(row._id, { description: v })}
          wrap
          hoverBg={isSchedule ? "whiteAlpha.200" : "blue.50"}
        />
      </Td>
      <Td textAlign="right" fontWeight="semibold" pr={3}>
        <Text fontSize="sm">
          {subtotal.lineItemTotal > 0 ? formatCurrency(subtotal.lineItemTotal) : "—"}
        </Text>
      </Td>
      <Td>
        <IconButton
          aria-label="Delete row"
          icon={<FiTrash2 />}
          size="xs"
          variant="ghost"
          colorScheme={isSchedule ? "whiteAlpha" : "red"}
          onClick={() => onDelete(row._id)}
        />
      </Td>
    </Tr>
  );
};

// ─── Item row (display only — click row to open detail panel) ────────────────

interface ItemRowProps {
  row: TenderPricingRow;
  defaultMarkupPct: number;
  isSelected: boolean;
  onDelete: (rowId: string) => void;
  onSelect: (rowId: string) => void;
  nodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  dragHandleProps?: Record<string, unknown>;
}

const ItemRow: React.FC<ItemRowProps> = ({
  row,
  defaultMarkupPct,
  isSelected,
  onDelete,
  onSelect,
  nodeRef,
  style,
  dragHandleProps,
}) => {
  const { effectiveMarkup, lineItemTotal } = computeRow(row, defaultMarkupPct);

  return (
    <Tr
      ref={nodeRef as any}
      style={style}
      bg={isSelected ? "blue.50" : undefined}
      borderLeft={isSelected ? "3px solid" : "3px solid transparent"}
      borderLeftColor={isSelected ? "blue.400" : "transparent"}
      _hover={{ bg: isSelected ? "blue.50" : "gray.50" }}
      fontSize="sm"
      cursor="pointer"
      onClick={() => onSelect(row._id)}
    >
      <DragHandle {...(dragHandleProps as any)} />
      <Td px={2} whiteSpace="nowrap">
        <Text fontSize="sm" color={row.itemNumber ? "gray.800" : "gray.400"}>
          {row.itemNumber || "—"}
        </Text>
      </Td>
      <Td>
        <Text fontSize="sm" color={row.description ? "gray.800" : "gray.400"} noOfLines={1}>
          {row.description || "Untitled"}
        </Text>
      </Td>
      <Td isNumeric whiteSpace="nowrap">
        <Text fontSize="sm" color={row.quantity != null ? "gray.800" : "gray.400"}>
          {row.quantity != null ? row.quantity : "—"}
        </Text>
      </Td>
      <Td whiteSpace="nowrap">
        <Text fontSize="sm" color={row.unit ? "gray.800" : "gray.400"}>
          {row.unit || "—"}
        </Text>
      </Td>
      <Td isNumeric whiteSpace="nowrap">
        <Text fontSize="sm" color={row.unitPrice != null ? "gray.800" : "gray.400"}>
          {row.unitPrice != null ? `$${row.unitPrice.toFixed(2)}` : "—"}
        </Text>
      </Td>
      <Td textAlign="center" whiteSpace="nowrap">
        <Text
          fontSize="xs"
          color={row.markupOverride != null ? "blue.600" : "gray.400"}
        >
          {formatMarkup(row.markupOverride)}
        </Text>
      </Td>
      <Td isNumeric whiteSpace="nowrap" fontWeight="semibold">
        <Text fontSize="sm" color={lineItemTotal > 0 ? "gray.800" : "gray.400"}>
          {lineItemTotal > 0 ? formatCurrency(lineItemTotal) : "—"}
        </Text>
      </Td>
      <Td onClick={(e) => e.stopPropagation()}>
        <IconButton
          aria-label="Delete row"
          icon={<FiTrash2 />}
          size="xs"
          variant="ghost"
          colorScheme="red"
          onClick={() => onDelete(row._id)}
        />
      </Td>
    </Tr>
  );
};
