# Timeline Prototype Design

**Date:** 2026-02-20
**Context:** DailyReport Playground — Prototype 4 (Timeline)

## Problem

The existing form-based Hours-First prototype (Prototype 1) requires too much tapping and typing. The foreman's hypothesis is that a drag-based timeline — where you sweep across employees to bulk-set their hours — could be substantially faster on a phone. This prototype tests that hypothesis.

## Placement

Fourth tab in the existing `/playground` page, labeled "Timeline". The three existing prototypes are unchanged.

## Layout

- **Left column** (fixed ~90px): employee names, tap-to-select, "Select All" button at top
- **Right area** (horizontally scrollable): time grid + blocks
  - Time range: 5:00am–8:00pm (15 hours)
  - Snap: 30-minute increments → 30 slots
  - Slot width: 32px → 960px total scrollable width
  - Row height: 48px per employee
  - Top: time axis ruler with hour labels
  - Background: alternating light-gray / white hour bands
- **Bottom strip**: summary — "N selected · X–Y hrs"

## Interaction Model

### Step 1 — Select employees

Tapping a name in the left column toggles that person selected (blue highlight on name, subtle tint on their timeline row). "Select All" at the top toggles everyone. Selected count shown in the summary strip.

### Step 2 — Drag to set hours

With ≥1 person selected, drag horizontally in the timeline area:

- `touchstart` / `mousedown` → record start slot
- `touchmove` / `mousemove` → render a semi-transparent preview block from start → current slot
- `touchend` / `mouseup` → commit block to all selected employees, clear selection

Each committed block renders as a solid blue bar with the time range label (e.g. "7:00–5:00"). Dragging a new block over selected employees overwrites their existing block.

**Convenience shortcut:** If no employees are selected and you start a drag on a row that has no block, that single employee gets a block.

### Step 3 — Add activities (tap to add from list)

Tapping an existing block opens an inline expanded card below that row:
- List of existing activities (colored label + time range)
- "Add Activity" button → compact inline form: labor type `<select>`, start/end time pickers, Save/Cancel
- Activities render as proportionally-sized colored strips inside the block

### Clearing a block

Long-press a block (500ms) → delete it. Red tint flash as feedback.

## State Shape

```ts
type TimelineActivity = {
  id: string;
  laborType: string;
  startSlot: number;  // 30-min slot index from 5:00am
  endSlot: number;
};

type TimelineBlock = {
  employeeId: string;
  startSlot: number;
  endSlot: number;
  activities: TimelineActivity[];
};

// Component state
selectedIds: Set<string>
blocks: Record<string, TimelineBlock>   // keyed by employeeId
dragPreview: { startSlot: number; endSlot: number } | null
expandedEmployeeId: string | null       // for activity panel
```

## Implementation Notes

- Mouse and touch events both required (desktop Chrome DevTools + real phone)
- `useRef` on the timeline container to calculate slot from clientX
- Long-press via `setTimeout` on `touchstart`, cancelled on `touchmove` or `touchend`
- Activity colors: cycle through a fixed palette (blue, green, orange, purple, pink)
- No GraphQL, no backend — mock data only (`MOCK_CREW`, `MOCK_LABOR_TYPES`)
- New file: `client/src/components/pages/playground/TimelinePrototype.tsx`
- Add fourth tab to `client/src/components/pages/playground/index.tsx`
