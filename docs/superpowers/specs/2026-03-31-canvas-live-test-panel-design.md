# Canvas Live Test Panel — Design Spec

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Add a collapsible Live Test panel to the left side of the CalculatorCanvas that lets developers test their template with scratch inputs and see live results, without affecting stored template data.

**Context:** This is the first of three planned features (Live Test → Groups → Conditional Params). The Live Test panel is also the prototype for the future end-user pricing UI in the tender sheet — the canvas will be "under the hood" from a user perspective.

---

## Layout

```
[Live Test panel] | drag handle | [canvas flow] | drag handle | [inspect panel]
```

- Live Test is on the **left**, always mounted (scratch state persists while you work)
- Default width: **280px**, resizable via drag handle on its right edge
- Drag handle disappears when collapsed
- **Collapse toggle:** collapses to a **32px strip** with a single `»` chevron button to re-expand
- Expanding restores the previous width and scratch state exactly as left

The existing inspect panel (right side) is unchanged.

---

## Data Model

**Scratch state — never persisted.**

- Initialises from `activeDoc.defaultInputs` when `activeDoc` changes (doc switch or first load)
- All subsequent edits are local React state only — nothing writes back to the doc
- Re-evaluates reactively on every input change (same pattern as `TemplateTestPanel`)
- State resets to `activeDoc.defaultInputs` on doc switch (not on every render)

---

## Component Structure

### New file: `CalculatorCanvas/LiveTestPanel.tsx`

Props:
```typescript
interface Props {
  doc: CanvasDocument;
}
```

- Owns `quantity` (number, default 100), `params` (Record<string, number>), `tables` (Record<string, RateEntry[]>) in local state
- `useEffect` on `doc.id` to reset all three to `doc.defaultInputs`
- Calls `evaluateTemplate` and `debugEvaluateTemplate` via `useMemo` (same as TemplateTestPanel)
- Reuses `BreakdownCell` and `RateRow` from `calculatorShared`
- Sections: Quantity → Parameters → Rate Tables → Summary breakdown → Formula step debug table

**Style note:** This panel is the prototype for the future user-facing tender pricing UI. It should feel like a clean form, not a developer tool — use readable label text, not monospace-heavy debug styling. The formula step debug table can remain technical (it's explicitly a developer aid).

### Modified file: `CalculatorCanvas/index.tsx`

New state:
```typescript
const [liveTestOpen, setLiveTestOpen] = useState(true);
const [liveTestWidth, setLiveTestWidth] = useState(280);
```

Left drag handle: same mechanic as existing inspect drag handle, mirrored. Only rendered when `liveTestOpen` is true.

Collapse strip: when `liveTestOpen` is false, render a 32px wide `Box` containing a `»` icon button that sets `liveTestOpen(true)`. When open, the `LiveTestPanel` header contains a `«` icon button that sets `liveTestOpen(false)`.

Layout order in the flex row:
1. Live Test panel (or 32px strip)
2. Left drag handle (when open)
3. Canvas flow (flex: 1)
4. Right drag handle (when node selected)
5. Inspect panel (when node selected)

---

## What This Does NOT Include

- No "save as defaults" button (can add later)
- No parameter groups or conditional visibility (next phase)
- No persistence of scratch state across page refresh
- No changes to `TemplateTestPanel` in `CalculatorTemplates/` — it stays as-is
