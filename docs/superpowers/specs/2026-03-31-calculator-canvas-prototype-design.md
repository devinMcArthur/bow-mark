# Calculator Canvas Prototype — Design Spec

**Date:** 2026-03-31
**Status:** Approved

## Goal

Add a read-only "Canvas" tab to `/developer` that renders any calculator template as an interactive node graph. Nodes are draggable, edges are auto-wired from formula string parsing, and clicking a node opens an inspect panel showing its formula, computed value, and dependency relationships. The prototype validates the flow-based programming model before committing to formula editing in the canvas.

## Background

The current `Calculator Templates` tab on `/developer` uses a form-based editor. While functional, it is considered cumbersome for the eventual estimator audience. A node canvas approach — where each formula step is a visible node and data flow is explicit via wires — may be more approachable and could eventually support "tender-level forks" (estimators adjusting calculator internals for a specific tender without modifying the global template).

This spec covers only the prototype: a read-only canvas with draggable nodes. Formula editing within the canvas is out of scope.

---

## Architecture

### New directory

```
client/src/components/pages/developer/CalculatorCanvas/
├── index.tsx          # Canvas tab root
├── CanvasFlow.tsx     # React Flow wrapper
├── nodeTypes.tsx      # Six custom node components
├── edgeParser.ts      # Formula → Edge[] derivation
├── layoutEngine.ts    # Default column/row node positions
├── canvasStorage.ts   # localStorage position persistence
└── InspectPanel.tsx   # Right-side inspect panel
```

### Modified file

- `client/src/pages/developer/index.tsx` — add "Canvas" as the third Chakra tab

---

## Components

### `index.tsx` — Canvas Tab Root

Loads the active template via `useCalculatorTemplates()`, evaluates it with `debugEvaluateTemplate()` to get per-step computed values, and renders `CanvasFlow` on the left and `InspectPanel` on the right. Maintains `selectedNodeId` in local state.

A template picker dropdown at the top lets the developer switch between templates.

### `CanvasFlow.tsx` — React Flow Wrapper

Builds `nodes[]` and `edges[]` from the active template on each render:

- **Nodes** are derived from `parameterDefs`, `tableDefs`, the implicit `quantity` input, `formulaSteps`, `breakdownDefs`, and a single `unitPrice` output node.
- **Edges** come from `edgeParser.ts` (see below).
- Node positions: loaded from `canvasStorage.ts` for the active template, falling back to `layoutEngine.ts` defaults.
- `onNodeDragStop` → merges updated position into localStorage.
- `onNodeClick` → lifts `selectedNodeId` to parent.

### `nodeTypes.tsx` — Custom Node Components

Six node types, each with a consistent color palette:

| Type | Color | Sources |
|------|-------|---------|
| Param | Blue (`#2563eb` border) | `parameterDefs` |
| Table aggregate | Green (`#059669` border) | `tableDefs` |
| Quantity | Amber (`#ca8a04` border) | Implicit `quantity` input |
| Formula step | Purple (`#7c3aed` border) | `formulaSteps` |
| Breakdown | Dark green (`#16a34a` border) | `breakdownDefs` |
| Output | Blue bright (`#3b82f6` border, 2px) | Derived unit price |

Each node displays: node ID, a short label/subtitle, and the computed value. Formula nodes also show the formula string in smaller monospace text. When `selected` (React Flow prop), the node border brightens and incoming edges highlight.

### `edgeParser.ts` — Edge Auto-Generation

```typescript
export function parseEdges(template: CalculatorTemplate): Edge[]
```

Algorithm:

1. Build `sourceSet`: all param ids + `{tableId}RatePerHr` for each table def + `"quantity"` + all formula step ids (in declaration order).
2. For each `formulaStep`: tokenize `step.formula` by splitting on `[^a-zA-Z0-9_]`, filter tokens that exist in `sourceSet`, emit `{ id, source: token, target: step.id }` for each match.
3. For each `breakdownDef`: emit `{ source: breakdownDef.perUnit, target: breakdownDef.id }`.
4. For each `breakdownDef`: emit `{ source: breakdownDef.id, target: "unitPrice" }`.

No manual wiring. Edges are entirely derived from the template document. A formula referencing an undefined variable simply has no incoming edge for that token (not an error in the canvas — the formula step debug panel in the test tab handles that).

### `layoutEngine.ts` — Default Positions

```typescript
export function initialLayout(template: CalculatorTemplate): Record<string, {x: number, y: number}>
```

Five columns, left to right:

| Column | x offset | Contents |
|--------|----------|---------|
| 0 | 0 | Param nodes + table aggregate nodes + quantity node |
| 1 | 220 | First half of formula steps |
| 2 | 440 | Second half of formula steps |
| 3 | 660 | Breakdown nodes |
| 4 | 880 | Unit price output node |

Rows are distributed evenly within each column (80px vertical gap). The split between column 1 and 2 is at the midpoint of `formulaSteps.length`.

### `canvasStorage.ts` — Position Persistence

```typescript
const KEY = (templateId: string) => `bow-mark:canvas:${templateId}:positions`;

export function loadPositions(templateId: string): Record<string, {x: number, y: number}> | null
export function savePositions(templateId: string, positions: Record<string, {x: number, y: number}>): void
```

On `onNodeDragStop`: load existing positions, merge the updated node's position, save back. Switching templates triggers a fresh load for the new template ID.

### `InspectPanel.tsx` — Inspect Panel

Displayed on the right side of the canvas tab. Shows nothing when no node is selected ("Click a node to inspect").

When a node is selected:

- **Node ID** in monospace, large
- **Type badge** — color-coded to match the node color
- **Formula** (formula nodes only) — full formula string in a monospace code block
- **Computed value** — from `debugEvaluateTemplate()` output, formatted with units where available
- **Receives from** — list of source node IDs (incoming edges) with their computed values
- **Feeds into** — list of target node IDs (outgoing edges)

No editing controls. Read-only.

---

## Data Flow

```
useCalculatorTemplates()
    → active template (CalculatorTemplate)
    → evaluateTemplate() → { unitPrice, breakdown, intermediates }
    → debugEvaluateTemplate() → StepDebugInfo[] (per-step values + errors)

active template
    → edgeParser.parseEdges() → Edge[]
    → layoutEngine.initialLayout() → default positions
    → canvasStorage.loadPositions() → saved positions (overrides defaults)
    → CanvasFlow renders React Flow <ReactFlow nodes={...} edges={...} />

node click → selectedNodeId → InspectPanel reads from debugEvaluateTemplate output
node drag stop → canvasStorage.savePositions()
```

---

## Dependencies

- **`reactflow`** (MIT, ~90kb gzipped) — provides drag, pan, zoom, edge routing
- No other new dependencies

---

## Out of Scope (Prototype Only)

- Formula editing within the canvas
- Adding/removing nodes from the canvas
- Tender-level template forks (design validated by this prototype; implementation is a future feature)
- Connecting nodes by dragging pins

---

## Future Direction

Once the prototype validates the visual model, the next step is **tender-level forks**: an estimator can fork a global template for a specific tender, adjusting formula steps for that job only. All line items on that tender use the fork; the global template is untouched. The fork lives on the `TenderSheet` document, not the global template store.
