import React, { useState, useCallback } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  NumberInput,
  NumberInputField,
  Table,
  Tbody,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { FiPlus } from "react-icons/fi";
import { gql, useMutation } from "@apollo/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { TenderPricingSheet as TPricingSheet, TenderPricingRowType } from "./types";
import { computeSheetTotal, formatCurrency } from "./compute";
import { SortableRow } from "./PricingRow";
import ScheduleList from "./ScheduleList";
import LineItemDetail from "./LineItemDetail";

// ─── GQL Mutations ────────────────────────────────────────────────────────────

const ROW_FIELDS = `
  _id
  type
  sortOrder
  itemNumber
  description
  indentLevel
  quantity
  unit
  unitPrice
  notes
  calculatorType
  calculatorInputsJson
  markupOverride
`;

const SHEET_FIELDS = `
  _id
  defaultMarkupPct
  rows {
    ${ROW_FIELDS}
  }
`;

const UPDATE_MARKUP = gql`
  mutation TenderPricingSheetUpdateMarkup($id: ID!, $defaultMarkupPct: Float!) {
    tenderPricingSheetUpdateMarkup(id: $id, defaultMarkupPct: $defaultMarkupPct) {
      ${SHEET_FIELDS}
    }
  }
`;

const ADD_ROW = gql`
  mutation TenderPricingRowCreate($sheetId: ID!, $data: TenderPricingRowCreateData!) {
    tenderPricingRowCreate(sheetId: $sheetId, data: $data) {
      ${SHEET_FIELDS}
    }
  }
`;

const UPDATE_ROW = gql`
  mutation TenderPricingRowUpdate($sheetId: ID!, $rowId: ID!, $data: TenderPricingRowUpdateData!) {
    tenderPricingRowUpdate(sheetId: $sheetId, rowId: $rowId, data: $data) {
      ${SHEET_FIELDS}
    }
  }
`;

const DELETE_ROW = gql`
  mutation TenderPricingRowDelete($sheetId: ID!, $rowId: ID!) {
    tenderPricingRowDelete(sheetId: $sheetId, rowId: $rowId) {
      ${SHEET_FIELDS}
    }
  }
`;

const REORDER_ROWS = gql`
  mutation TenderPricingRowReorder($sheetId: ID!, $rowIds: [ID!]!) {
    tenderPricingRowReorder(sheetId: $sheetId, rowIds: $rowIds) {
      ${SHEET_FIELDS}
    }
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface PricingSheetProps {
  sheet: TPricingSheet;
  onUpdate: (updated: TPricingSheet) => void;
}

const PricingSheet: React.FC<PricingSheetProps> = ({ sheet, onUpdate }) => {
  const [markupDraft, setMarkupDraft] = useState(String(sheet.defaultMarkupPct));
  const [editingMarkup, setEditingMarkup] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [updateMarkup] = useMutation(UPDATE_MARKUP);
  const [addRow, { loading: addingRow }] = useMutation(ADD_ROW);
  const [updateRow] = useMutation(UPDATE_ROW);
  const [deleteRow] = useMutation(DELETE_ROW);
  const [reorderRows] = useMutation(REORDER_ROWS);

  const sheetTotal = computeSheetTotal(sheet.rows, sheet.defaultMarkupPct);

  const selectedRow = selectedRowId
    ? sheet.rows.find((r) => r._id === selectedRowId) ?? null
    : null;

  const handleUpdateMarkup = async (val: string) => {
    setEditingMarkup(false);
    const n = parseFloat(val);
    if (isNaN(n) || n === sheet.defaultMarkupPct) return;
    const res = await updateMarkup({
      variables: { id: sheet._id, defaultMarkupPct: n },
    });
    onUpdate(res.data.tenderPricingSheetUpdateMarkup);
  };

  const handleAddRow = async (type: TenderPricingRowType) => {
    const sortOrder = sheet.rows.length;
    const indentLevel =
      type === TenderPricingRowType.Schedule
        ? 0
        : type === TenderPricingRowType.Group
        ? 1
        : 2;

    const res = await addRow({
      variables: {
        sheetId: sheet._id,
        data: { type, itemNumber: "", description: "", indentLevel, sortOrder },
      },
    });
    onUpdate(res.data.tenderPricingRowCreate);
  };

  const handleUpdateRow = useCallback(
    async (rowId: string, data: Record<string, unknown>) => {
      const res = await updateRow({
        variables: {
          sheetId: sheet._id,
          rowId,
          data,
        },
      });
      onUpdate(res.data.tenderPricingRowUpdate);
    },
    [sheet._id, updateRow, onUpdate]
  );

  const handleDeleteRow = useCallback(
    async (rowId: string) => {
      if (selectedRowId === rowId) setSelectedRowId(null);
      const res = await deleteRow({
        variables: { sheetId: sheet._id, rowId },
      });
      onUpdate(res.data.tenderPricingRowDelete);
    },
    [sheet._id, deleteRow, onUpdate, selectedRowId]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sheet.rows.findIndex((r) => r._id === active.id);
      const newIndex = sheet.rows.findIndex((r) => r._id === over.id);
      const reordered = arrayMove(sheet.rows, oldIndex, newIndex);

      onUpdate({ ...sheet, rows: reordered });

      const res = await reorderRows({
        variables: {
          sheetId: sheet._id,
          rowIds: reordered.map((r) => r._id),
        },
      });
      onUpdate(res.data.tenderPricingRowReorder);
    },
    [sheet, reorderRows, onUpdate]
  );

  const handleSelect = useCallback((rowId: string) => {
    setSelectedRowId((prev) => (prev === rowId ? null : rowId));
  }, []);

  const isDetailOpen = selectedRow != null && selectedRow.type === TenderPricingRowType.Item;

  return (
    <Box>
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <Flex align="center" justify="space-between" mb={4} wrap="wrap" gap={3}>
        <Flex align="center" gap={2}>
          <ButtonGroup size="sm" variant="outline">
            <Button
              leftIcon={<FiPlus />}
              onClick={() => handleAddRow(TenderPricingRowType.Schedule)}
              isLoading={addingRow}
            >
              Schedule
            </Button>
            <Button
              leftIcon={<FiPlus />}
              onClick={() => handleAddRow(TenderPricingRowType.Group)}
              isLoading={addingRow}
            >
              Group
            </Button>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="blue"
              onClick={() => handleAddRow(TenderPricingRowType.Item)}
              isLoading={addingRow}
            >
              Line Item
            </Button>
          </ButtonGroup>
        </Flex>

        <Flex align="center" gap={4}>
          <Flex align="center" gap={2}>
            <Text fontSize="sm" color="gray.600" whiteSpace="nowrap">
              Default Markup:
            </Text>
            {editingMarkup ? (
              <NumberInput
                size="sm"
                w="80px"
                value={markupDraft}
                onChange={setMarkupDraft}
                onBlur={() => handleUpdateMarkup(markupDraft)}
              >
                <NumberInputField
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdateMarkup(markupDraft);
                    if (e.key === "Escape") setEditingMarkup(false);
                  }}
                />
              </NumberInput>
            ) : (
              <Text
                fontSize="sm"
                fontWeight="semibold"
                cursor="pointer"
                px={2}
                py={1}
                rounded="md"
                _hover={{ bg: "gray.100" }}
                onClick={() => {
                  setMarkupDraft(String(sheet.defaultMarkupPct));
                  setEditingMarkup(true);
                }}
              >
                {sheet.defaultMarkupPct}%
              </Text>
            )}
          </Flex>

          <Box>
            <Text fontSize="sm" color="gray.500">
              Sheet Total
            </Text>
            <Text fontWeight="bold" fontSize="lg" color="blue.700">
              {formatCurrency(sheetTotal)}
            </Text>
          </Box>
        </Flex>
      </Flex>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      {sheet.rows.length === 0 ? (
        <Box
          textAlign="center"
          py={16}
          color="gray.400"
          borderWidth={1}
          borderStyle="dashed"
          rounded="lg"
        >
          <Text fontSize="lg" mb={2}>
            No rows yet
          </Text>
          <Text fontSize="sm">
            Add a Schedule, Group, or Line Item to get started.
          </Text>
        </Box>
      ) : isDetailOpen ? (
        /* ── Split pane: schedule list + detail panel ─────────────────── */
        <Flex
          borderWidth={1}
          borderColor="gray.200"
          rounded="lg"
          overflow="hidden"
          h="calc(100vh - 240px)"
          minH="500px"
        >
          {/* Left: schedule list (20%) */}
          <Box w="20%" minW="180px" flexShrink={0}>
            <ScheduleList
              rows={sheet.rows}
              selectedRowId={selectedRowId}
              onSelect={handleSelect}
            />
          </Box>

          {/* Right: detail panel (80%) */}
          <Box flex={1} overflow="hidden">
            <LineItemDetail
              row={selectedRow!}
              defaultMarkupPct={sheet.defaultMarkupPct}
              onUpdate={handleUpdateRow}
              onClose={() => setSelectedRowId(null)}
            />
          </Box>
        </Flex>
      ) : (
        /* ── Full-width table ─────────────────────────────────────────── */
        <Box>
          <Table size="sm" variant="simple" w="100%">
            <Thead>
              <Tr bg="gray.50">
                <Th w="28px" px={1} />
                <Th whiteSpace="nowrap" w="60px">#</Th>
                <Th>Description</Th>
                <Th isNumeric whiteSpace="nowrap" w="60px">Qty</Th>
                <Th whiteSpace="nowrap" w="70px">Unit</Th>
                <Th isNumeric whiteSpace="nowrap" w="90px">Unit Price</Th>
                <Th textAlign="center" whiteSpace="nowrap" w="90px">Markup</Th>
                <Th isNumeric whiteSpace="nowrap" w="110px">Total</Th>
                <Th w="36px" />
              </Tr>
            </Thead>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sheet.rows.map((r) => r._id)}
                strategy={verticalListSortingStrategy}
              >
                <Tbody>
                  {sheet.rows.map((row, index) => (
                    <SortableRow
                      key={row._id}
                      row={row}
                      rows={sheet.rows}
                      rowIndex={index}
                      defaultMarkupPct={sheet.defaultMarkupPct}
                      selectedRowId={selectedRowId}
                      onUpdate={handleUpdateRow}
                      onDelete={handleDeleteRow}
                      onSelect={handleSelect}
                    />
                  ))}
                </Tbody>
              </SortableContext>
            </DndContext>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default PricingSheet;
