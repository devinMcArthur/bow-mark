import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  Select,
  Text,
} from "@chakra-ui/react";
import {
  TenderPricingSheet,
  TenderPricingRow,
  TenderPricingRowType,
} from "./types";
import { TenderFileItem } from "../Tender/types";
import { computeRow, formatCurrency } from "./compute";
import {
  LineItemStatus,
  LINE_ITEM_STATUSES,
  STATUS_COLORS,
  STATUS_BG,
  STATUS_LABELS,
} from "./statusConstants";
import PricingBoardDrawer from "./PricingBoardDrawer";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PricingBoardProps {
  sheet: TenderPricingSheet;
  tenderId: string;
  onUpdate: (updated: TenderPricingSheet) => void;
  onUpdateRow: (rowId: string, data: Record<string, unknown>) => Promise<void>;
  tenderFiles?: TenderFileItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getScheduleForRow(
  row: TenderPricingRow,
  rows: TenderPricingRow[]
): TenderPricingRow | null {
  const idx = rows.indexOf(row);
  for (let i = idx - 1; i >= 0; i--) {
    if (rows[i].type === TenderPricingRowType.Schedule) return rows[i];
  }
  return null;
}

// Empty columns shrink, non-empty columns share space equally
const EMPTY_FLEX = 0.3;
const ACTIVE_FLEX = 1;

// ─── Card ────────────────────────────────────────────────────────────────────

const BoardCard: React.FC<{
  row: TenderPricingRow;
  defaultMarkupPct: number;
  scheduleName?: string;
  onClick: () => void;
}> = ({ row, defaultMarkupPct, scheduleName, onClick }) => {
  const { lineItemTotal } = computeRow(row, defaultMarkupPct);

  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      px={3}
      py={2}
      mb={2}
      cursor="pointer"
      _hover={{ shadow: "sm", borderColor: "gray.300" }}
      onClick={onClick}
    >
      <Flex justify="space-between" align="flex-start" gap={2}>
        <Box flex={1} minW={0}>
          <Text fontSize="xs" fontWeight="semibold" color="gray.800" noOfLines={1}>
            {row.itemNumber ? `${row.itemNumber} — ` : ""}{row.description || "Untitled"}
          </Text>
          <Text fontSize="xs" color="gray.500" mt={0.5}>
            {row.quantity != null ? `${row.quantity} ${row.unit ?? ""}` : "No qty"}
          </Text>
        </Box>
        <Text fontSize="xs" fontWeight="medium" color={lineItemTotal > 0 ? "gray.700" : "gray.400"} flexShrink={0}>
          {lineItemTotal > 0 ? formatCurrency(lineItemTotal) : "—"}
        </Text>
      </Flex>
      {scheduleName && (
        <Text fontSize="9px" color="gray.400" mt={1} noOfLines={1}>{scheduleName}</Text>
      )}
    </Box>
  );
};

// ─── Column ──────────────────────────────────────────────────────────────────

const BoardColumn: React.FC<{
  status: LineItemStatus;
  rows: TenderPricingRow[];
  allRows: TenderPricingRow[];
  defaultMarkupPct: number;
  flexValue: number;
  onCardClick: (row: TenderPricingRow) => void;
}> = ({ status, rows, allRows, defaultMarkupPct, flexValue, onCardClick }) => (
  <Flex
    direction="column"
    flex={flexValue}
    bg={STATUS_BG[status]}
    borderRadius="lg"
    overflow="hidden"
    minW={0}
  >
    <Flex
      px={3}
      py={2}
      align="center"
      gap={2}
      flexShrink={0}
    >
      <Box w="8px" h="8px" borderRadius="full" bg={STATUS_COLORS[status]} flexShrink={0} />
      <Text
        fontSize="10px"
        fontWeight="semibold"
        textTransform="uppercase"
        letterSpacing="wide"
        color="gray.600"
      >
        {STATUS_LABELS[status]}
      </Text>
      <Box
        bg="gray.200"
        borderRadius="full"
        px={1.5}
        py={0}
        fontSize="10px"
        fontWeight="semibold"
        color="gray.600"
      >
        {rows.length}
      </Box>
    </Flex>
    <Box flex={1} overflowY="auto" px={2} pb={2}>
      {rows.map((row) => {
        const sched = getScheduleForRow(row, allRows);
        return (
          <BoardCard
            key={row._id}
            row={row}
            defaultMarkupPct={defaultMarkupPct}
            scheduleName={sched?.description ?? undefined}
            onClick={() => onCardClick(row)}
          />
        );
      })}
    </Box>
  </Flex>
);

// ─── Board ───────────────────────────────────────────────────────────────────

const PricingBoard: React.FC<PricingBoardProps> = ({
  sheet,
  tenderId,
  onUpdate,
  onUpdateRow,
  tenderFiles,
}) => {
  const [selectedRow, setSelectedRow] = useState<TenderPricingRow | null>(null);
  const [scheduleFilter, setScheduleFilter] = useState<string>("all");

  const schedules = useMemo(
    () => sheet.rows.filter((r) => r.type === TenderPricingRowType.Schedule),
    [sheet.rows]
  );

  const items = useMemo(() => {
    let rows = sheet.rows.filter((r) => r.type === TenderPricingRowType.Item);
    if (scheduleFilter !== "all") {
      const schedIdx = sheet.rows.findIndex((r) => r._id === scheduleFilter);
      if (schedIdx >= 0) {
        const nextSchedIdx = sheet.rows.findIndex(
          (r, i) => i > schedIdx && r.type === TenderPricingRowType.Schedule
        );
        const endIdx = nextSchedIdx >= 0 ? nextSchedIdx : sheet.rows.length;
        const schedRowIds = new Set(
          sheet.rows.slice(schedIdx, endIdx).map((r) => r._id)
        );
        rows = rows.filter((r) => schedRowIds.has(r._id));
      }
    }
    return rows;
  }, [sheet.rows, scheduleFilter]);

  const columns = useMemo(() => {
    const map: Record<LineItemStatus, TenderPricingRow[]> = {
      not_started: [],
      in_progress: [],
      review: [],
      approved: [],
    };
    for (const row of items) {
      const status = (row.status as LineItemStatus) ?? "not_started";
      map[status].push(row);
    }
    return map;
  }, [items]);

  // Keep selectedRow in sync with sheet data
  const activeRow = useMemo(() => {
    if (!selectedRow) return null;
    return sheet.rows.find((r) => r._id === selectedRow._id) ?? null;
  }, [selectedRow, sheet.rows]);

  // Escape closes the detail drawer.
  useEffect(() => {
    if (!selectedRow) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedRow(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedRow]);

  return (
    <Flex direction="column" h="100%" overflow="hidden">
      {/* Filter bar */}
      {schedules.length > 0 && (
        <Flex px={4} py={2} flexShrink={0} borderBottom="1px solid" borderColor="gray.200">
          <Select
            size="sm"
            w="200px"
            value={scheduleFilter}
            onChange={(e) => setScheduleFilter(e.target.value)}
          >
            <option value="all">All Schedules</option>
            {schedules.map((s) => (
              <option key={s._id} value={s._id}>
                {s.itemNumber ? `${s.itemNumber} — ` : ""}{s.description || "Untitled"}
              </option>
            ))}
          </Select>
        </Flex>
      )}

      {/* Columns */}
      <Flex flex={1} gap={3} p={3} overflow="hidden">
        {LINE_ITEM_STATUSES.map((status) => {
          const count = columns[status].length;
          return (
            <BoardColumn
              key={status}
              status={status}
              rows={columns[status]}
              allRows={sheet.rows}
              defaultMarkupPct={sheet.defaultMarkupPct}
              flexValue={count > 0 ? ACTIVE_FLEX : EMPTY_FLEX}
              onCardClick={setSelectedRow}
            />
          );
        })}
      </Flex>

      {/* Bottom drawer */}
      <PricingBoardDrawer
        row={activeRow}
        sheet={sheet}
        tenderId={tenderId}
        onClose={() => setSelectedRow(null)}
        onUpdateRow={onUpdateRow}
        tenderFiles={tenderFiles}
      />
    </Flex>
  );
};

export default PricingBoard;
