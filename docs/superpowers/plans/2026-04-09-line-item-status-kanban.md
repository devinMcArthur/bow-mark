# Line Item Status & Kanban Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-line-item status tracking with a Kanban board view as an alternative to the existing list view on the tender pricing sheet.

**Architecture:** A `status` field on `TenderPricingRowClass` stores the estimating stage (not_started → in_progress → review → approved). The existing `tenderPricingRowUpdate` mutation handles status changes. A new `PricingBoard` component renders a weighted 4-column Kanban. Status changes generate descriptive audit events via a `statusTo` field on `TenderAuditEventClass`.

**Tech Stack:** Typegoose + Type-GraphQL (server), Apollo Client + Chakra UI (client), ReactFlow not involved.

> **Note on tests:** Write test files as specified but do NOT run `npm run test` during implementation — skip all test-execution steps per project convention.

---

## File Map

**New — client:**
- `client/src/components/TenderPricing/statusConstants.ts` — shared status types, colors, labels
- `client/src/components/TenderPricing/StatusDot.tsx` — clickable dot + popover component
- `client/src/components/TenderPricing/PricingBoard.tsx` — Kanban board view
- `client/src/components/TenderPricing/PricingBoardDrawer.tsx` — detail drawer for board card clicks

**Modified — server:**
- `server/src/models/TenderPricingSheet/schema/index.ts` — add `status` to row schema
- `server/src/typescript/tenderPricingSheet.ts` — add `status` to `ITenderPricingRowUpdate`
- `server/src/models/TenderPricingSheet/class/update.ts` — add `status` to `updateRow` and `duplicateRow`
- `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts` — add `status` to GQL input
- `server/src/typescript/tenderReview.ts` — add `"status"` to tracked fields, add `statusTo` to event interface
- `server/src/models/TenderReview/schema/index.ts` — add `statusTo` field
- `server/src/models/TenderReview/class/update.ts` — accept `statusTo`
- `server/src/graphql/resolvers/tenderPricingSheet/index.ts` — pass `statusTo` in audit event

**Modified — client:**
- `client/src/components/TenderPricing/types.ts` — add `status` to row type
- `client/src/components/TenderPricing/PricingSheet.tsx` — add `status` to GQL fragment
- `client/src/components/TenderPricing/PricingRow.tsx` — add StatusDot to ItemRow
- `client/src/pages/tender/[id]/index.tsx` — add view toggle + conditional PricingBoard rendering, add `status` to GQL fragments
- `client/src/components/Tender/TenderMobilePricingTab.tsx` — add `status` to GQL fragment, add view toggle
- `client/src/components/Tender/TenderReviewTab.tsx` — update `buildActionLabel` for status events

---

### Task 1: Server — add `status` field to pricing row

**Files:**
- Modify: `server/src/models/TenderPricingSheet/schema/index.ts`
- Modify: `server/src/typescript/tenderPricingSheet.ts`
- Modify: `server/src/models/TenderPricingSheet/class/update.ts`
- Modify: `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts`

- [ ] **Step 1: Add `status` prop to `TenderPricingRowClass` in schema**

In `server/src/models/TenderPricingSheet/schema/index.ts`, add after the `docRefs` field (around line 94):

```typescript
  @Field(() => String, { nullable: true })
  @prop({ trim: true, default: "not_started" })
  public status?: string;
```

- [ ] **Step 2: Add `status` to `ITenderPricingRowUpdate` in TypeScript types**

In `server/src/typescript/tenderPricingSheet.ts`, add to the `ITenderPricingRowUpdate` interface:

```typescript
  status?: string;
```

- [ ] **Step 3: Add `status` to `updateRow` in update class**

In `server/src/models/TenderPricingSheet/class/update.ts`, add to the `updateRow` function alongside the other field assignments:

```typescript
  if (data.status !== undefined) row.status = data.status;
```

Also add `status` to the `duplicateRow` function's `newRow` object:

```typescript
  status: src.status,
```

- [ ] **Step 4: Add `status` to GQL input type**

In `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts`, add to `TenderPricingRowUpdateData`:

```typescript
  @Field(() => String, { nullable: true })
  public status?: string;
```

- [ ] **Step 5: Commit**

```bash
git add server/src/models/TenderPricingSheet/schema/index.ts \
        server/src/typescript/tenderPricingSheet.ts \
        server/src/models/TenderPricingSheet/class/update.ts \
        server/src/graphql/resolvers/tenderPricingSheet/mutations.ts
git commit -m "feat: add status field to TenderPricingRow"
```

---

### Task 2: Server — audit trail statusTo support

**Files:**
- Modify: `server/src/typescript/tenderReview.ts`
- Modify: `server/src/models/TenderReview/schema/index.ts`
- Modify: `server/src/models/TenderReview/class/update.ts`
- Modify: `server/src/graphql/resolvers/tenderPricingSheet/index.ts`

- [ ] **Step 1: Add `"status"` to `TRACKED_ROW_FIELDS` and `statusTo` to event interface**

In `server/src/typescript/tenderReview.ts`, add `"status"` to the `TRACKED_ROW_FIELDS` array:

```typescript
export const TRACKED_ROW_FIELDS: string[] = [
  "quantity",
  "unit",
  "unitPrice",
  "markupOverride",
  "rateBuildupSnapshot",
  "extraUnitPrice",
  "extraUnitPriceMemo",
  "description",
  "itemNumber",
  "notes",
  "status",
];
```

Add `statusTo` to `ITenderAuditEventCreate`:

```typescript
export interface ITenderAuditEventCreate {
  rowId: string;
  rowDescription: string;
  action: TenderAuditAction;
  changedFields: string[];
  changedBy: string;
  statusTo?: string;
}
```

- [ ] **Step 2: Add `statusTo` field to `TenderAuditEventClass` schema**

In `server/src/models/TenderReview/schema/index.ts`, add after the `changedAt` field on `TenderAuditEventClass`:

```typescript
  @Field(() => String, { nullable: true })
  @prop({ trim: true })
  public statusTo?: string;
```

- [ ] **Step 3: Accept `statusTo` in `addAuditEvent` update function**

In `server/src/models/TenderReview/class/update.ts`, update the `addAuditEvent` function to include `statusTo`:

```typescript
const addAuditEvent = (
  review: TenderReviewDocument,
  event: ITenderAuditEventCreate
): TenderReviewDocument => {
  (review.auditLog as any).push({
    _id: new Types.ObjectId(),
    rowId: new Types.ObjectId(event.rowId),
    rowDescription: event.rowDescription,
    action: event.action,
    changedFields: event.changedFields,
    changedBy: new Types.ObjectId(event.changedBy),
    changedAt: new Date(),
    ...(event.statusTo ? { statusTo: event.statusTo } : {}),
  });
  review.updatedAt = new Date();
  return review;
};
```

- [ ] **Step 4: Pass `statusTo` in the `tenderPricingRowUpdate` resolver**

In `server/src/graphql/resolvers/tenderPricingSheet/index.ts`, update the audit event creation inside `tenderPricingRowUpdate` to include `statusTo`:

Replace:
```typescript
        await (TenderReview as any).addAuditEvent((sheet!.tender as any).toString(), {
          rowId: rowId.toString(),
          rowDescription: row?.description ?? "",
          action: "row_updated",
          changedFields,
          changedBy: ctx.user._id.toString(),
        });
```

With:
```typescript
        await (TenderReview as any).addAuditEvent((sheet!.tender as any).toString(), {
          rowId: rowId.toString(),
          rowDescription: row?.description ?? "",
          action: "row_updated",
          changedFields,
          changedBy: ctx.user._id.toString(),
          ...(data.status ? { statusTo: data.status } : {}),
        });
```

- [ ] **Step 5: Commit**

```bash
git add server/src/typescript/tenderReview.ts \
        server/src/models/TenderReview/schema/index.ts \
        server/src/models/TenderReview/class/update.ts \
        server/src/graphql/resolvers/tenderPricingSheet/index.ts
git commit -m "feat: audit trail statusTo support for descriptive status change events"
```

---

### Task 3: Client — status constants + StatusDot component

**Files:**
- Create: `client/src/components/TenderPricing/statusConstants.ts`
- Create: `client/src/components/TenderPricing/StatusDot.tsx`

- [ ] **Step 1: Create `statusConstants.ts`**

```typescript
export type LineItemStatus = "not_started" | "in_progress" | "review" | "approved";

export const LINE_ITEM_STATUSES: LineItemStatus[] = [
  "not_started",
  "in_progress",
  "review",
  "approved",
];

export const STATUS_COLORS: Record<LineItemStatus, string> = {
  not_started: "#94a3b8",
  in_progress: "#3b82f6",
  review: "#ca8a04",
  approved: "#16a34a",
};

export const STATUS_BG: Record<LineItemStatus, string> = {
  not_started: "gray.50",
  in_progress: "blue.50",
  review: "yellow.50",
  approved: "green.50",
};

export const STATUS_LABELS: Record<LineItemStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  review: "Ready for Review",
  approved: "Approved",
};
```

- [ ] **Step 2: Create `StatusDot.tsx`**

```tsx
import React from "react";
import {
  Box,
  Flex,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import {
  LineItemStatus,
  LINE_ITEM_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
} from "./statusConstants";

interface StatusDotProps {
  status: LineItemStatus;
  onChange: (status: LineItemStatus) => void;
}

const StatusDot: React.FC<StatusDotProps> = ({ status, onChange }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Popover isOpen={isOpen} onClose={onClose} placement="bottom-start" isLazy>
      <PopoverTrigger>
        <Box
          as="button"
          w="10px"
          h="10px"
          borderRadius="full"
          bg={STATUS_COLORS[status]}
          flexShrink={0}
          cursor="pointer"
          _hover={{ transform: "scale(1.3)" }}
          transition="transform 0.1s"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onOpen();
          }}
          title={STATUS_LABELS[status]}
        />
      </PopoverTrigger>
      <PopoverContent w="180px" shadow="lg" border="1px solid" borderColor="gray.200">
        <PopoverBody p={1}>
          {LINE_ITEM_STATUSES.map((s) => (
            <Flex
              key={s}
              align="center"
              gap={2}
              px={2}
              py={1.5}
              cursor="pointer"
              borderRadius="sm"
              bg={s === status ? "gray.100" : "transparent"}
              _hover={{ bg: "gray.50" }}
              onClick={(e) => {
                e.stopPropagation();
                onChange(s);
                onClose();
              }}
            >
              <Box
                w="8px"
                h="8px"
                borderRadius="full"
                bg={STATUS_COLORS[s]}
                flexShrink={0}
              />
              <Text fontSize="xs" fontWeight={s === status ? "semibold" : "normal"}>
                {STATUS_LABELS[s]}
              </Text>
            </Flex>
          ))}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default StatusDot;
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/TenderPricing/statusConstants.ts \
        client/src/components/TenderPricing/StatusDot.tsx
git commit -m "feat: status constants + StatusDot popover component"
```

---

### Task 4: Client — add status to types + GQL fragments

**Files:**
- Modify: `client/src/components/TenderPricing/types.ts`
- Modify: `client/src/components/TenderPricing/PricingSheet.tsx`
- Modify: `client/src/pages/tender/[id]/index.tsx`
- Modify: `client/src/components/Tender/TenderMobilePricingTab.tsx`

- [ ] **Step 1: Add `status` to `TenderPricingRow` type**

In `client/src/components/TenderPricing/types.ts`, add after `docRefs`:

```typescript
  status?: string | null;
```

- [ ] **Step 2: Add `status` to `ROW_FIELDS` fragment in `PricingSheet.tsx`**

In `client/src/components/TenderPricing/PricingSheet.tsx`, add `status` to the `ROW_FIELDS` template string (after `extraUnitPriceMemo`):

```
  status
```

- [ ] **Step 3: Add `status` to both GQL fragments in `client/src/pages/tender/[id]/index.tsx`**

Add `status` to the `SHEET_QUERY` rows fragment and the `CREATE_SHEET` rows fragment (same location as other row fields like `extraUnitPriceMemo`).

- [ ] **Step 4: Add `status` to GQL fragment in `TenderMobilePricingTab.tsx`**

Add `status` to the `ROW_FIELDS` template string.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/TenderPricing/types.ts \
        client/src/components/TenderPricing/PricingSheet.tsx \
        "client/src/pages/tender/[id]/index.tsx" \
        client/src/components/Tender/TenderMobilePricingTab.tsx
git commit -m "feat: add status field to client types and GQL fragments"
```

---

### Task 5: Client — add StatusDot to ItemRow in PricingRow

**Files:**
- Modify: `client/src/components/TenderPricing/PricingRow.tsx`

- [ ] **Step 1: Add StatusDot to the ItemRow component**

Import StatusDot and LineItemStatus at the top of `PricingRow.tsx`:

```typescript
import StatusDot from "./StatusDot";
import { LineItemStatus } from "./statusConstants";
```

Add `onUpdate` to `ItemRowProps` (it's already on `SortableRowProps` and passed through — the `ItemRow` needs it to fire status changes):

In `ItemRowProps` interface, add:
```typescript
  onUpdate: (rowId: string, data: Record<string, unknown>) => void;
```

Pass `onUpdate` through from `SortableRow` to `ItemRow`.

In the `ItemRow` component's render, add the StatusDot as the first cell content, before the item number `<Td>`. Insert a new `<Td>` after the `DragHandle`:

```tsx
      <Td px={1} w="24px" onClick={(e) => e.stopPropagation()}>
        <StatusDot
          status={(row.status as LineItemStatus) ?? "not_started"}
          onChange={(s) => onUpdate(row._id, { status: s })}
        />
      </Td>
```

Also add a corresponding `<Th>` in the table header (in `PricingSheet.tsx` where the header row is rendered) — a thin empty header for the status column.

- [ ] **Step 2: Add status column header to the `<Thead>` in PricingSheet.tsx**

In `PricingSheet.tsx`, find the `<Thead>` row and add an empty `<Th w="24px" px={1} />` after the drag handle header column.

- [ ] **Step 3: Add an empty `<Td>` in `HeaderRow` for Schedule/Group rows**

In `PricingRow.tsx`, in the `HeaderRow` component, add an empty `<Td w="24px" px={1} />` after the `DragHandle` to keep column alignment.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/TenderPricing/PricingRow.tsx \
        client/src/components/TenderPricing/PricingSheet.tsx
git commit -m "feat: add StatusDot to pricing row items in list view"
```

---

### Task 6: Client — PricingBoard component

**Files:**
- Create: `client/src/components/TenderPricing/PricingBoard.tsx`

- [ ] **Step 1: Create `PricingBoard.tsx`**

```tsx
import React, { useMemo, useState } from "react";
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

const COLUMN_FLEX: Record<LineItemStatus, number> = {
  not_started: 2,
  in_progress: 1,
  review: 1,
  approved: 1,
};

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
  onCardClick: (row: TenderPricingRow) => void;
}> = ({ status, rows, allRows, defaultMarkupPct, onCardClick }) => (
  <Flex
    direction="column"
    flex={COLUMN_FLEX[status]}
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
            scheduleName={sched?.description}
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
        {LINE_ITEM_STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            rows={columns[status]}
            allRows={sheet.rows}
            defaultMarkupPct={sheet.defaultMarkupPct}
            onCardClick={setSelectedRow}
          />
        ))}
      </Flex>

      {/* Drawer */}
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
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/TenderPricing/PricingBoard.tsx
git commit -m "feat: PricingBoard Kanban component"
```

---

### Task 7: Client — PricingBoardDrawer component

**Files:**
- Create: `client/src/components/TenderPricing/PricingBoardDrawer.tsx`

- [ ] **Step 1: Create `PricingBoardDrawer.tsx`**

```tsx
import React from "react";
import {
  Box,
  CloseButton,
  Divider,
  Flex,
  Text,
} from "@chakra-ui/react";
import { TenderPricingRow, TenderPricingSheet } from "./types";
import { TenderFileItem } from "../Tender/types";
import { computeRow, formatCurrency } from "./compute";
import { EditableCell } from "./PricingRow";
import StatusDot from "./StatusDot";
import { LineItemStatus, STATUS_LABELS } from "./statusConstants";

interface PricingBoardDrawerProps {
  row: TenderPricingRow | null;
  sheet: TenderPricingSheet;
  tenderId: string;
  onClose: () => void;
  onUpdateRow: (rowId: string, data: Record<string, unknown>) => Promise<void>;
  tenderFiles?: TenderFileItem[];
}

const PricingBoardDrawer: React.FC<PricingBoardDrawerProps> = ({
  row,
  sheet,
  onClose,
  onUpdateRow,
}) => {
  if (!row) return null;

  const status = (row.status as LineItemStatus) ?? "not_started";
  const { effectiveMarkup, suggestedBidUP, lineItemTotal } = computeRow(row, sheet.defaultMarkupPct);
  const costUP = (row.unitPrice ?? 0) + (row.extraUnitPrice ?? 0);

  return (
    <Box
      position="fixed"
      right={0}
      top={0}
      bottom={0}
      w="400px"
      maxW="100vw"
      bg="white"
      boxShadow="-4px 0 16px rgba(0,0,0,0.1)"
      zIndex={20}
      display="flex"
      flexDir="column"
      overflowY="auto"
    >
      {/* Header */}
      <Flex px={4} py={3} align="center" justify="space-between" borderBottom="1px solid" borderColor="gray.200" flexShrink={0}>
        <Flex align="center" gap={3}>
          <StatusDot status={status} onChange={(s) => onUpdateRow(row._id, { status: s })} />
          <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
            {row.itemNumber ? `${row.itemNumber} — ` : ""}{row.description || "Untitled"}
          </Text>
        </Flex>
        <CloseButton size="sm" onClick={onClose} />
      </Flex>

      {/* Status label */}
      <Box px={4} py={2} bg="gray.50" borderBottom="1px solid" borderColor="gray.100">
        <Text fontSize="xs" color="gray.500">{STATUS_LABELS[status]}</Text>
      </Box>

      {/* Fields */}
      <Box px={4} py={4} flex={1}>
        <Box mb={4}>
          <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Description
          </Text>
          <EditableCell
            value={row.description}
            onSave={(v) => onUpdateRow(row._id, { description: v })}
            placeholder="Enter description"
            wrap
          />
        </Box>

        <Flex gap={4} mb={4}>
          <Box flex={1}>
            <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
              Quantity
            </Text>
            <EditableCell
              value={row.quantity}
              onSave={(v) => onUpdateRow(row._id, { quantity: parseFloat(v) || null })}
              placeholder="—"
            />
          </Box>
          <Box flex={1}>
            <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
              Unit
            </Text>
            <EditableCell
              value={row.unit}
              onSave={(v) => onUpdateRow(row._id, { unit: v || null })}
              placeholder="—"
            />
          </Box>
        </Flex>

        <Divider mb={4} />

        <Flex gap={4} mb={4}>
          <Box flex={1}>
            <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
              Cost Unit Price
            </Text>
            <Text fontSize="sm" color={costUP > 0 ? "gray.800" : "gray.400"}>
              {costUP > 0 ? `$${costUP.toFixed(2)}` : "—"}
            </Text>
          </Box>
          <Box flex={1}>
            <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
              Bid Unit Price
            </Text>
            <Text fontSize="sm" fontWeight="medium" color={suggestedBidUP > 0 ? "blue.700" : "gray.400"}>
              {suggestedBidUP > 0 ? `$${suggestedBidUP.toFixed(2)}` : "—"}
            </Text>
          </Box>
        </Flex>

        <Box mb={4}>
          <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Line Item Total
          </Text>
          <Text fontSize="md" fontWeight="semibold" color={lineItemTotal > 0 ? "gray.800" : "gray.400"}>
            {lineItemTotal > 0 ? formatCurrency(lineItemTotal) : "—"}
          </Text>
        </Box>

        <Divider mb={4} />

        <Box mb={4}>
          <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Notes
          </Text>
          <EditableCell
            value={row.notes}
            onSave={(v) => onUpdateRow(row._id, { notes: v || null })}
            placeholder="Add notes..."
            wrap
          />
        </Box>
      </Box>
    </Box>
  );
};

export default PricingBoardDrawer;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/TenderPricing/PricingBoardDrawer.tsx
git commit -m "feat: PricingBoardDrawer detail drawer for board card clicks"
```

---

### Task 8: Client — view toggle + wire PricingBoard into tender page

**Files:**
- Modify: `client/src/pages/tender/[id]/index.tsx`
- Modify: `client/src/components/TenderPricing/PricingSheet.tsx`

- [ ] **Step 1: Export `handleUpdateRow` from PricingSheet so the board can reuse it**

In `client/src/components/TenderPricing/PricingSheet.tsx`, the `handleUpdateRow` callback is already defined. We need to expose it. Add a new prop to `PricingSheetProps`:

```typescript
  viewMode?: "list" | "board";
  onViewModeChange?: (mode: "list" | "board") => void;
```

At the top of the PricingSheet component render (before the table), add a toolbar row with the view toggle:

```tsx
      <Flex align="center" gap={2} mb={3} flexShrink={0}>
        <ButtonGroup size="xs" isAttached variant="outline">
          <Button
            onClick={() => onViewModeChange?.("list")}
            colorScheme={viewMode !== "board" ? "blue" : "gray"}
            variant={viewMode !== "board" ? "solid" : "outline"}
          >
            List
          </Button>
          <Button
            onClick={() => onViewModeChange?.("board")}
            colorScheme={viewMode === "board" ? "blue" : "gray"}
            variant={viewMode === "board" ? "solid" : "outline"}
          >
            Board
          </Button>
        </ButtonGroup>
        {/* Existing markup controls stay here */}
      </Flex>
```

When `viewMode === "board"`, render `PricingBoard` instead of the table/DnD area. Import `PricingBoard` at the top:

```typescript
import PricingBoard from "./PricingBoard";
```

In the render, wrap the existing table in a `viewMode !== "board"` check, and add:

```tsx
      {viewMode === "board" && (
        <PricingBoard
          sheet={sheet}
          tenderId={tenderId}
          onUpdate={onUpdate}
          onUpdateRow={handleUpdateRow}
          tenderFiles={tenderFiles}
        />
      )}
```

- [ ] **Step 2: Add view toggle state to the tender page**

In `client/src/pages/tender/[id]/index.tsx`, add state:

```typescript
const [pricingViewMode, setPricingViewMode] = useState<"list" | "board">("list");
```

Pass to `PricingSheet`:

```tsx
<PricingSheet
  sheet={sheet}
  tenderId={tenderId}
  onUpdate={setSheet}
  tenderFiles={tender?.files ?? []}
  activeDocFile={selectedFile?._id}
  activeDocPage={selectedFilePage}
  onDocRefClick={handleDocRefClick}
  viewMode={pricingViewMode}
  onViewModeChange={setPricingViewMode}
/>
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/TenderPricing/PricingSheet.tsx \
        "client/src/pages/tender/[id]/index.tsx"
git commit -m "feat: view toggle — list/board switch on pricing sheet"
```

---

### Task 9: Client — mobile view toggle

**Files:**
- Modify: `client/src/components/Tender/TenderMobilePricingTab.tsx`

- [ ] **Step 1: Add the same view toggle to the mobile pricing tab**

The mobile tab has its own simpler rendering. Add a `viewMode` state and a `ButtonGroup` toggle at the top. When `viewMode === "board"`, render `PricingBoard` instead of the row list.

Import `PricingBoard`, `ButtonGroup`, `Button` from Chakra, and add:

```typescript
const [viewMode, setViewMode] = useState<"list" | "board">("list");
```

Add the toggle before the row list, and conditionally render the board:

```tsx
<ButtonGroup size="xs" isAttached variant="outline" mb={2}>
  <Button
    onClick={() => setViewMode("list")}
    colorScheme={viewMode === "list" ? "blue" : "gray"}
    variant={viewMode === "list" ? "solid" : "outline"}
  >
    List
  </Button>
  <Button
    onClick={() => setViewMode("board")}
    colorScheme={viewMode === "board" ? "blue" : "gray"}
    variant={viewMode === "board" ? "solid" : "outline"}
  >
    Board
  </Button>
</ButtonGroup>

{viewMode === "board" ? (
  <PricingBoard
    sheet={sheet}
    tenderId={tenderId}
    onUpdate={onSheetUpdate}
    onUpdateRow={handleUpdateRow}
    tenderFiles={tenderFiles}
  />
) : (
  /* existing row list rendering */
)}
```

The mobile `handleUpdateRow` already exists — pass it through to PricingBoard.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Tender/TenderMobilePricingTab.tsx
git commit -m "feat: add board view toggle to mobile pricing tab"
```

---

### Task 10: Client — descriptive status events in Review tab

**Files:**
- Modify: `client/src/components/Tender/TenderReviewTab.tsx`

- [ ] **Step 1: Add `statusTo` to the GQL query**

In `TenderReviewTab.tsx`, add `statusTo` to the `auditLog` fragment in `TENDER_REVIEW_QUERY`:

```graphql
      auditLog {
        _id
        rowId
        rowDescription
        action
        changedFields
        statusTo
        changedBy {
          _id
          name
        }
        changedAt
      }
```

Also add `statusTo` to the `AuditEvent` interface:

```typescript
interface AuditEvent {
  __typename: "TenderAuditEventClass";
  _id: string;
  rowDescription: string;
  action: "row_added" | "row_deleted" | "row_updated";
  changedFields: string[];
  statusTo?: string | null;
  changedBy?: { _id: string; name: string } | null;
  changedAt: string;
}
```

- [ ] **Step 2: Update `buildActionLabel` for descriptive status events**

Import `STATUS_LABELS` from statusConstants:

```typescript
import { STATUS_LABELS, LineItemStatus } from "../TenderPricing/statusConstants";
```

Update `buildActionLabel`:

```typescript
function buildActionLabel(event: AuditEvent): string {
  const actor = event.changedBy?.name ?? "Someone";
  if (event.action === "row_added") return `${actor} added row "${event.rowDescription}"`;
  if (event.action === "row_deleted") return `${actor} deleted row "${event.rowDescription}"`;

  // Status-only change — descriptive label
  if (event.statusTo && event.changedFields.length === 1 && event.changedFields[0] === "status") {
    const label = STATUS_LABELS[event.statusTo as LineItemStatus] ?? event.statusTo;
    return `${actor} moved "${event.rowDescription}" to ${label}`;
  }

  // Status change alongside other fields
  if (event.statusTo) {
    const label = STATUS_LABELS[event.statusTo as LineItemStatus] ?? event.statusTo;
    const otherFields = event.changedFields.filter((f) => f !== "status").join(", ");
    return `${actor} updated "${event.rowDescription}" — ${otherFields}, moved to ${label}`;
  }

  const fields = event.changedFields.join(", ");
  return `${actor} updated "${event.rowDescription}" — ${fields}`;
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Tender/TenderReviewTab.tsx
git commit -m "feat: descriptive status change events in Review tab timeline"
```

---

## Self-Review Checklist

After all tasks are complete, verify:

- [ ] Server starts without TypeScript errors
- [ ] New rows default to `not_started` status
- [ ] Clicking the status dot in list view opens popover and changes status
- [ ] Board view shows items in correct columns based on status
- [ ] Schedule filter works on the board
- [ ] Clicking a board card opens the detail drawer
- [ ] Changing status in the drawer updates the card's column
- [ ] Status changes appear in the Review tab as "moved [row] to [status]"
- [ ] Mobile view toggle works
- [ ] `tenderPricingRowUpdate` with `status` field triggers audit event with `statusTo`
