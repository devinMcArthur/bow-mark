# Canvas Parameter Groups — Design Spec

**Date:** 2026-03-31
**Status:** Approved

---

## Overview

Add a grouping system to the Calculator Canvas that lets template authors organize params, tables, and formula steps into named, nestable groups. Groups are visible in two places:

1. **Canvas** — as resizable, draggable container nodes that visually wrap their members
2. **Live Test panel** — as collapsible sections and sub-sections that mirror the group hierarchy

Formula steps may be added to groups for canvas organization only; they are not surfaced in the Live Test panel.

---

## Data Model

Two additions to the `CanvasDocument` type:

```typescript
interface GroupDef {
  id: string;
  label: string;
  parentGroupId?: string;   // omitted = top-level group
  memberIds: string[];      // ordered list of member IDs (param, table, formula step, or sub-group IDs)
}
```

```typescript
interface CanvasDocument {
  // ...existing fields...
  groupDefs: GroupDef[];
  nodePositions: Record<string, { x: number; y: number; w?: number; h?: number }>;
  //                                                        ^^^^^^^^^^^^^^^^^^^
  //                                        w/h added for group container sizing
}
```

### Membership rules

- A node (param, table, formula step, or group) can belong to at most one group at a time.
- A group may be a member of another group (unlimited nesting depth).
- `memberIds` is ordered; the order controls rendering order within the group's canvas container and within the Live Test panel section.
- Nodes not referenced in any `GroupDef.memberIds` are "ungrouped" and rendered as today.

### Persistence

`groupDefs` and the extended `nodePositions` (with `w`/`h`) are persisted in the same `CanvasDocument` JSON blob used for all other canvas state. No new storage primitives required.

---

## Canvas Behaviour

### GroupNode

A new React Flow node type: `group`.

- Rendered as a dashed rounded-rect container behind all other nodes (`zIndex` lower than param/table/formula nodes).
- Shows the group label in the top-left corner.
- No connection handles (groups don't participate in the formula graph).
- Resizable via React Flow's `NodeResizer` component. Default initial size: 400 × 300. Min size: 200 × 120. Saved to `nodePositions[groupId].{ w, h }`.
- Draggable — moving the container moves all children with it (React Flow `parentId` handles this automatically).

### Creating a group

Right-click on empty canvas space → context menu item **"Add Group"**. A new `GroupDef` is created with a generated ID and default label "Group". The group node appears at the click position.

### Assigning nodes to a group

Drag a param, table, formula step, or group node onto a group container. On drop:

1. Use `getIntersectingNodes` to detect which group container the node was dropped on. If multiple groups intersect, pick the topmost (largest z-index / smallest container).
2. Remove the node from its current group's `memberIds` if it was already in one.
3. Add the node's ID to the target group's `memberIds`.
4. Set React Flow `parentId` on the node to the group node's ID.
5. Convert the node's absolute canvas position to a position relative to the group container origin (required by React Flow `parentId` semantics).

### Removing nodes from a group

Drag a node outside its parent container. On drop (when `getIntersectingNodes` returns no group match):

1. Remove the node from the parent group's `memberIds`.
2. Clear `parentId` on the node.
3. Convert the node's position back to absolute canvas coordinates.

### Renaming a group

Select the group node → InspectPanel shows a text field for the label. Editing updates `GroupDef.label`.

### Deleting a group

Select the group node → Delete key or InspectPanel delete button. The group's `memberIds` nodes are un-parented (keep their current absolute positions) and the `GroupDef` is removed. If the group was itself a member of a parent group, it is removed from that parent's `memberIds`.

### Nested groups in the canvas

A group node with `parentGroupId` set is a child node of its parent group container. React Flow handles the rendering hierarchy via `parentId`. Dragging a group node inside another group works identically to dragging a param node inside a group.

---

## Live Test Panel Behaviour

### Rendering order

1. **Ungrouped nodes first** — params and tables not in any group, rendered in `nodePositions` / document order, with no section header.
2. **Top-level groups** — each rendered as a collapsible section (bold indigo heading + horizontal rule). Within each top-level group, `memberIds` order is followed.
3. **Sub-groups** — rendered as collapsible sub-sections (lighter violet heading, indented 12 px). Unlimited nesting depth, each level indented an additional 12 px.
4. **Formula steps** — skipped entirely in the Live Test panel. If a group contains only formula steps (and no params, tables, or sub-groups with params/tables), the group section is not rendered.

### Collapsible state

Each group section has an expand/collapse toggle (chevron icon). Collapsed state is local to the Live Test panel's React state (not persisted). Groups are expanded by default.

### Member rendering inside a group section

Params and tables inside a group are rendered exactly as ungrouped params/tables are today — same input grid layout, same table UI. The only difference is they appear under their group heading instead of at the top level.

---

## Out of Scope

- No "drag to reorder" within a group in this iteration — `memberIds` order is set by drag-in order.
- No group visibility toggle on the canvas (all groups always visible).
- No per-group collapse state persistence (collapse is scratch state only).
- No conditional visibility based on group membership.
- Groups do not affect formula evaluation — they are purely organizational.

---

## Future Considerations (not in this spec)

- Conditional params tied to group visibility (a separate feature).
- Drag-to-reorder `memberIds` within a group.
- Exporting groups as labelled sections in the tender sheet.
