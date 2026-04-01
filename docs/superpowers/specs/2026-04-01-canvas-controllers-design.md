# Canvas Controllers — Design Spec

**Date:** 2026-04-01
**Status:** Draft

---

## Overview

Introduce a **Controller** node to the Calculator Canvas. Controllers are a distinct node type that govern which groups are active in a given estimate context. They are the *only* mechanism by which group visibility can be controlled — regular params have no structural side effects.

Controllers serve two purposes simultaneously:
1. **Structural** — determine whether connected groups are shown in the Tender Form
2. **Mathematical** (Percentage and Toggle only) — output a numeric/boolean value that formula steps can reference

---

## Motivation

Two concrete use cases drive this design:

**Hand Pour / Machine Pour split** — A `handPourPct` percentage determines what fraction of concrete is poured by hand vs. machine. When `handPourPct = 1`, Machine Pour contributes nothing and should not appear in the Tender Form. When `handPourPct = 0`, Hand Pour should not appear.

**Rebar spec selection** — A concrete structure may require any combination of rebar configurations (each way, ties, U-bars, spiral ties, etc.). The estimator selects which specs apply; only the selected specs appear as fillable sections in the Tender Form.

Both cases share the same underlying shape: a control that determines which groups are live. They differ only in widget type and condition mechanism.

---

## Data Model

### `ControllerDef`

```typescript
interface ControllerDef {
  id: string;
  label: string;
  type: "percentage" | "toggle" | "selector";

  // Percentage and Toggle: numeric/boolean value available to formula steps
  // defaultValue type matches controller type:
  //   percentage → number (0–1)
  //   toggle     → boolean
  defaultValue?: number | boolean;

  // Selector only: the list of named options
  options?: { id: string; label: string }[];

  // Selector only: which option IDs are selected by default
  defaultSelected?: string[];
}
```

### `GroupActivation` (added to `GroupDef`)

```typescript
interface GroupActivation {
  controllerId: string;

  // Percentage / Toggle: simple comparison expression evaluated against
  // the controller's current value. Examples: "> 0", "< 1", "=== true"
  condition?: string;

  // Selector only: the option ID whose selection activates this group
  optionId?: string;
}

// One of condition or optionId is always set; never both.
```

### `GroupDef` (updated)

```typescript
interface GroupDef {
  id: string;
  label: string;
  parentGroupId?: string;
  memberIds: string[];
  activation?: GroupActivation;   // omitted = always active
}
```

### `CanvasDocument` (updated)

```typescript
interface CanvasDocument {
  // ...existing fields...
  controllerDefs: ControllerDef[];
}
```

---

## Controller Types

### Percentage

- Value range: 0–1 (rendered as 0–100% in the Tender Form)
- Outputs a numeric value into the formula graph — formula steps can reference it by `controllerId`
- Typically governs two complementary groups: one active when `> 0`, one active when `< 1`
- The data model supports N groups with independent conditions; the canvas UX optimises for the two-group complementary case

### Toggle

- Value: `true` / `false`
- Outputs a boolean into the formula graph
- Governs one or more groups; each group declares `condition: "=== true"` or `"=== false"`

### Selector

- Holds a list of labelled options defined by the template author
- No numeric output — purely structural
- Each option maps to at most one group via the group's `activation.optionId`
- Multiple options can be selected simultaneously (multi-select)

---

## Canvas Behaviour

### Controller node appearance

Controllers render as a distinct node type (visually differentiated from params, tables, and formula steps). Each type has an appropriate inline widget:

- **Percentage** — numeric input showing the default value
- **Toggle** — checkbox showing the default state
- **Selector** — list of labelled checkboxes showing `defaultSelected`

Controllers have two classes of connection handles:
- **Formula output handle** (right edge, same as param nodes) — connects to formula steps that consume the controller's value. Present on Percentage and Toggle only; absent on Selector.
- **Activation handle** (bottom edge, visually distinct colour/style) — connects to the group containers it governs. These edges are dashed or a different colour to distinguish them from formula graph edges.

### Creating a controller

Right-click on empty canvas space → context menu includes **Add Controller** with a sub-menu for type selection. The controller node appears at the click position with a generated ID and a default label.

### Connecting a controller to a group

Draw an edge from the controller's activation handle to a group container. On connect:

1. The InspectPanel for the target group gains a **Controlled by** section showing the controller label.
2. For **Percentage / Toggle**: an expression field appears pre-filled with a sensible default (`> 0` for the first connection, `< 1` for the second on a Percentage controller). The template author can edit it.
3. For **Selector**: a dropdown appears listing the controller's options. The template author picks which option activates this group.

### Disconnecting a controller from a group

Delete the activation edge. The group's `activation` is cleared and it becomes always-active.

### Authoring Selector options

Selecting a Selector controller node opens the InspectPanel with an editable list of options (label + auto-generated ID). Options can be added, renamed, and removed. Removing an option that is referenced by a group's `activation.optionId` clears that group's activation.

### Canvas warning: default leaves all groups inactive

If a controller's `defaultValue` / `defaultSelected` results in all its connected groups being inactive simultaneously, the controller node displays a warning indicator. This prevents templates from being published with a state where no relevant groups are visible.

### Controller nodes in the formula graph

Percentage and Toggle controllers participate in the formula graph on the output side only — they act as source nodes (like params). Formula steps reference them by `controllerId`. They do not consume inputs from other nodes.

Selector controllers have no formula graph presence.

---

## Tender Form Behaviour

### Controller widget rendering

Within any section (top-level or within a group), controllers render **before** the groups they govern. This makes the form read naturally: configure what applies first, then fill in the details for what is active.

| Type | Widget |
|---|---|
| Percentage | Labelled number input (0–100%) |
| Toggle | Labelled checkbox / on-off switch |
| Selector | Labelled list of checkboxes, one per option |

### Reactive group visibility

As the estimator adjusts a controller, governed groups show and hide immediately — no confirmation step. The activation condition is evaluated live against the controller's current value.

### Inactive groups

Groups whose activation condition is not met are **collapsed and greyed out** in the Tender Form — the section header remains visible but dimmed, with a small "inactive" badge, and the section body is collapsed. They do not contribute to formula evaluation. The group remains visible (not hidden) so the estimator can see the full structure of the estimate and understand what is and isn't applying.

### Rendering order within a section

1. Ungrouped params and tables (as today)
2. Controllers (in the order they appear in `controllerDefs`)
3. Active groups governed by those controllers (in `memberIds` order)
4. Always-active groups (no `activation` set)

---

## What Controllers Replace

- No `disabledWhen` expression field on `GroupDef` — all activation logic goes through Controllers
- Regular params retain zero structural capability — they feed formulas only
- The "all outputs === 0" auto-hide heuristic is not implemented — explicit Controllers replace it entirely

---

## Out of Scope

- Complex multi-variable condition expressions on activations (only simple comparisons: `> n`, `< n`, `=== value`)
- Controller-to-controller dependencies (a controller whose value depends on another controller)
- Drag-to-reorder selector options within a controller
- Drag-to-reorder selector options within a controller
- Conditional visibility of params within a group based on controller state (groups are the unit of activation, not individual params)

---

## Future Considerations

- Per-tender persistence of controller state (estimator's selections saved with the tender)
- A **Stepper** controller type (discrete numeric with multiple threshold conditions)
- Controller values as dependencies for other controllers (e.g. a derived toggle)
- Exporting active group labels as section headers in the tender sheet
