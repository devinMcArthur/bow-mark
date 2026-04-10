# Line Item Status & Kanban Board

**Date:** 2026-04-09
**Status:** Approved for implementation

## Overview

Add per-line-item status tracking to the tender pricing sheet, with a Kanban board view as an alternative to the current list view. Estimators can mark items as they progress through pricing (Not Started → In Progress → Review → Approved), switch between list and board views, and open items from the board in a detail drawer. Status changes are recorded in the existing audit trail with descriptive labels.

## Scope

1. Add `status` field to `TenderPricingRowClass`
2. List view: clickable colored status dot on each Item row with popover to change status
3. Board view: weighted 4-column Kanban with Schedule filter and detail drawer on card click
4. Audit trail: descriptive "moved to X" events via `statusTo` field on audit events

---

## Step 1 — Data Model

Add to `TenderPricingRowClass` (server schema):

```
status    "not_started" | "in_progress" | "review" | "approved"    default: "not_started"
```

- Only meaningful on `type === "Item"` rows. Schedules and Groups ignore it.
- Updated via the existing `tenderPricingRowUpdate` mutation — no new mutations needed.
- Add `"status"` to the `TRACKED_ROW_FIELDS` whitelist in `server/src/typescript/tenderReview.ts`.
- Add optional `statusTo?: string` field to `TenderAuditEventClass` — populated only when a status change is part of the update.

**Files to update:**
- `server/src/models/TenderPricingSheet/schema/index.ts` — add `status` prop to `TenderPricingRowClass`
- `server/src/typescript/tenderPricingSheet.ts` — add `status` to `ITenderPricingRowUpdate`
- `server/src/models/TenderPricingSheet/class/update.ts` — add `status` to `updateRow` and `duplicateRow`
- `server/src/graphql/resolvers/tenderPricingSheet/mutations.ts` — add `status` to `TenderPricingRowUpdateData`
- `server/src/typescript/tenderReview.ts` — add `"status"` to `TRACKED_ROW_FIELDS`, add `statusTo` to `ITenderAuditEventCreate`
- `server/src/models/TenderReview/schema/index.ts` — add optional `statusTo` field to `TenderAuditEventClass`
- `server/src/graphql/resolvers/tenderPricingSheet/index.ts` — when `data.status` is present, pass `statusTo` to `addAuditEvent`
- `client/src/components/TenderPricing/types.ts` — add `status` to `TenderPricingRow`
- Client GQL fragments — add `status` field to all pricing sheet queries

---

## Step 2 — List View: Status Dot

Add a small colored dot (8px circle) to the left of the item number on each Item row in the `PricingRow` component.

**Status colors:**
| Status | Color | Hex |
|--------|-------|-----|
| not_started | Grey | #94a3b8 |
| in_progress | Blue | #3b82f6 |
| review | Amber | #ca8a04 |
| approved | Green | #16a34a |

**Interaction:**
- Clicking the dot opens a Chakra `Popover` with the four status options listed vertically
- Each option shows its colored dot + label (e.g. "Not Started", "In Progress", "Ready for Review", "Approved")
- Selecting an option fires `tenderPricingRowUpdate` with the new status and closes the popover
- Schedule and Group rows do not show a status dot

**Files:**
- `client/src/components/TenderPricing/PricingRow.tsx` — add dot + popover
- New shared constant file or inline: status color map and label map (reused by board view)

---

## Step 3 — View Toggle

A small toggle control at the top of the pricing sheet area, next to existing toolbar controls.

- Two options: **List** (default) and **Board**
- Simple segmented button or icon toggle (list icon / grid icon)
- Toggling swaps the entire pricing sheet area between the existing `PricingSheet` component and the new `PricingBoard` component
- The toggle state is local (not persisted) — defaults to List on page load

**Files:**
- `client/src/pages/tender/[id]/index.tsx` — add toggle state and conditional rendering
- `client/src/components/Tender/TenderMobilePricingTab.tsx` — add toggle for mobile (same pattern)

---

## Step 4 — Board View Component

New component `PricingBoard` renders the Kanban board.

**Layout:**
- Four columns: Not Started (`flex: 2`), In Progress (`flex: 1`), Review (`flex: 1`), Approved (`flex: 1`)
- Each column has a colored header with status label and item count badge
- Columns scroll independently when they overflow vertically
- Background colors match the status (light tints): grey-50, blue-50, amber-50, green-50

**Schedule filter:**
- A `Select` dropdown at the top of the board: "All Schedules" (default) + one option per Schedule row
- Filtering shows only Items that belong under that Schedule (based on sort order / indent hierarchy)

**Cards:**
- Only `type === "Item"` rows appear as cards
- Card content: item number (e.g. "A.1.3"), description, quantity + unit (e.g. "500 t"), line item total or "—"
- Cards are sorted by their `sortOrder` within each column
- Clicking a card opens a detail drawer

**Detail drawer:**
- Slides in from the right, overlays the board (similar to `LineItemDetail` on mobile)
- Shows full line item detail: description, quantity, unit, unit price, markup, notes, rate buildup, doc refs
- Status selector at the top of the drawer (same dot + dropdown pattern as list view, but more prominent)
- Close button to return to the board
- Editing fields in the drawer fires the same `tenderPricingRowUpdate` mutations as the list view

**Files:**
- Create: `client/src/components/TenderPricing/PricingBoard.tsx` — board layout + columns + cards
- Create: `client/src/components/TenderPricing/PricingBoardDrawer.tsx` — detail drawer for card click
- Create: `client/src/components/TenderPricing/statusConstants.ts` — shared status colors, labels, types

---

## Step 5 — Audit Trail: Descriptive Status Events

When `tenderPricingRowUpdate` includes a `status` field:

- The audit event includes `statusTo` set to the new status value (e.g. `"in_progress"`)
- The `TenderReviewTab` timeline renders status events as: **"[Name] moved [row description] to In Progress"** instead of the generic "updated — status" format
- The `changedFields` array still includes `"status"` alongside any other fields changed in the same mutation

**Files:**
- `server/src/graphql/resolvers/tenderPricingSheet/index.ts` — extract `data.status` and pass as `statusTo` in the audit event
- `server/src/models/TenderReview/class/update.ts` — accept and store `statusTo`
- `client/src/components/Tender/TenderReviewTab.tsx` — update `buildActionLabel` to render descriptive status change text

---

## Out of Scope

- Drag-and-drop between Kanban columns (click-only for now)
- Swimlanes by Schedule (flat list with filter instead)
- Persisting the view toggle preference (always defaults to List)
- Status on Schedule or Group rows
- Progress bar across the top of the board (can add later)
- Notifications when items move to Review or Approved
