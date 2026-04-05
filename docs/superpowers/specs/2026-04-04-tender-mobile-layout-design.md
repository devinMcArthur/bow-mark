# Tender Page — Mobile Layout Design

**Date:** 2026-04-04
**Status:** Approved

## Overview

The tender detail page (`/tender/[id]`) is a desktop workbench (split pricing sheet + document panel) that is unusable on mobile. This spec adds a responsive mobile layout that surfaces the same data in a phone-friendly design. Desktop experience is unchanged.

## Guiding Principle

Phone = review/read mode with occasional edits. Deep work (adding/deleting rows, drag-to-reorder, attaching buildup templates, editing formulas/structure) stays desktop-only.

## Breakpoint Branch

In `pages/tender/[id]/index.tsx`, add:

```ts
const isMobile = useBreakpointValue({ base: true, md: false });
```

When `isMobile` is true, render `<TenderMobileLayout>` instead of the existing desktop layout. All GQL queries, sheet state, and data fetching remain in the page component and are passed down as props — no duplication.

`useBreakpointValue` returns `undefined` during SSR. Default to `false` (desktop) to avoid a flash: `const isMobile = useBreakpointValue({ base: true, md: false }) ?? false`.

## New File

`client/src/components/Tender/TenderMobileLayout.tsx`

Receives props:
- `tender: TenderDetail`
- `sheet: TenderPricingSheet | null`
- `onSheetUpdate: (sheet: TenderPricingSheet) => void`
- `tenderId: string`

Owns internally: active tab state, selected file state, line item drawer state.

## Layout Structure

```
┌─────────────────────────┐
│ Top bar (fixed)         │  ← back chevron | tender name | jobcode + status badge
├─────────────────────────┤
│                         │
│   Active tab content    │  ← full height, scrollable
│                         │
├─────────────────────────┤
│ Bottom tab bar (fixed)  │  ← Pricing | Documents | Notes | Summary
└─────────────────────────┘
```

### Top Bar
- Back chevron (`FiChevronLeft`) → navigates to `/tenders`
- Tender name (truncated) + jobcode
- Status badge (uses existing `tenderStatusColor`)

### Bottom Tab Bar
Four tabs with icon + label:
| Tab | Icon | Label |
|-----|------|-------|
| pricing | FiList | Pricing |
| documents | FiFileText | Documents |
| notes | FiMessageSquare | Notes |
| summary | FiAlignLeft | Summary |

## Tab: Pricing

### Summary Strip
Slim bar below the top bar (not scrollable). Shows:
- Sheet total (formatted currency)
- Default markup %

### Line Item List
Scrollable list. Two row types:

**Section/header rows** — gray divider with section label. Not tappable.

**Line item rows** — card showing:
- Item number (monospace, small)
- Description
- Quantity + unit
- Unit price (right-aligned)

Tapping a line item row opens the **Line Item Drawer**.

### Line Item Drawer
Chakra `Drawer` with `placement="bottom"`, height ~85vh.

- Header: item number + description (read-only), close button
- Body: renders the existing `LineItemDetail` component verbatim with full scroll
- All rate buildup input editing (params, tables, controllers) works via LineItemDetail as-is
- Rate entry tables scroll horizontally within the drawer if needed
- Doc ref callbacks (`onDocRefAdd`, `onDocRefRemove`, `onDocRefUpdate`) are not passed → LineItemDetail renders doc refs read-only and omits add/remove controls automatically

Excluded on mobile (drawer does not surface):
- Add row / delete row
- Drag-to-reorder
- Attach new buildup template

## Tab: Documents

### File List (default state)
Scrollable list. Each item:
- Document type badge
- Filename
- Summary status: spinner if processing, one-line summary preview if available

Tapping a file transitions to the File Viewer.

### File Viewer (full-screen takeover)
Replaces the file list entirely (not a modal).

- Top bar: back chevron → return to list | filename (truncated) | download button
- Body: existing `PdfViewer` component fills remaining height
- Non-PDF fallback: "Preview not available" + Open File button (same as desktop)

## Tab: Notes

Read-only scrollable list of note cards. Each card shows:
- Note content (pre-wrap)
- Author name + date

No add or edit functionality on mobile.

## Tab: Summary

Renders the existing `TenderSummaryTab` component as-is. Already a read-only scrollable view.

## Chat

The existing `ChatDrawer` and its floating trigger button are unchanged. No mobile-specific modifications.

## Reused Components (no changes)

| Component | Used in |
|-----------|---------|
| `LineItemDetail` | Line Item Drawer |
| `PdfViewer` | Documents → File Viewer |
| `TenderSummaryTab` | Summary tab |
| `RateBuildupInputs` | Via LineItemDetail (no direct import) |

## Out of Scope

- Adding/deleting pricing rows on mobile
- Drag-to-reorder on mobile
- Attaching new rate buildup templates on mobile
- Editing notes on mobile
- The pricing row detail page (`/tender/[id]/pricing/row/[rowId]`) — not addressed here
