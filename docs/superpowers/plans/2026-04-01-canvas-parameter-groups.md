# Canvas Parameter Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GroupDef system that lets template authors organize params/tables/formula steps into named, nestable containers visible in both the canvas (draggable dashed frames with NodeResizer) and Live Test panel (collapsible sections).

**Architecture:** `groupDefs: GroupDef[]` added to `CanvasDocument` and persisted as a JSON string in MongoDB alongside `nodePositions`. Group nodes are React Flow nodes of type `"group"` rendered behind other nodes using `parentId` for children. Positions for grouped nodes are stored relative to their parent group; ungrouped and group-container nodes store absolute positions. Drag-to-group is detected in `onNodeDragStop` via `reactFlowInstance.getIntersectingNodes`. Live Test panel derives its rendering order from `groupDefs.memberIds`.

**Tech Stack:** React Flow v11 (`NodeResizer`, `getIntersectingNodes`, `parentId`), TypeScript, Chakra UI, Type-GraphQL / Typegoose (server), Apollo / codegen (client).

---

## File Map

| File | Change |
|------|--------|
| `server/src/models/RateBuildupTemplate/schema/index.ts` | Add `groupDefs: string` field |
| `server/src/graphql/resolvers/rateBuildupTemplate/mutations.ts` | Add `groupDefs` to input + save logic |
| `client/src/graphql/fragments/RateBuildupTemplate_Full.graphql` | Add `groupDefs` field |
| `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts` | Add `GroupDef`, extend `CanvasDocument`, update serialisation |
| `client/src/components/pages/developer/CalculatorCanvas/nodeTypes.tsx` | Add `GroupNode` with `NodeResizer` |
| `client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx` | Update `buildNodes`, `handleNodeDragStop`, `handleAutoLayout`, context menu, group resize handler |
| `client/src/components/pages/developer/CalculatorCanvas/canvasOps.ts` | Add `createGroup`, `deleteGroup`, `assignNodeToGroup`, `removeNodeFromGroup`, `getAbsolutePosition`; update `deleteNodes` |
| `client/src/components/pages/developer/CalculatorCanvas/InspectPanel.tsx` | Add `GroupEdit` component; update `detectKind`, `KIND_COLORS`, `KIND_LABELS` |
| `client/src/components/pages/developer/CalculatorCanvas/index.tsx` | Extend `handleCreateNode` to handle `"group"` type |
| `client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx` | Grouped/collapsible sections |

---

## Task 1: Data model and persistence

**Files:**
- Modify: `server/src/models/RateBuildupTemplate/schema/index.ts`
- Modify: `server/src/graphql/resolvers/rateBuildupTemplate/mutations.ts`
- Modify: `client/src/graphql/fragments/RateBuildupTemplate_Full.graphql`
- Modify: `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts`

- [ ] **Step 1: Add `groupDefs` JSON string field to Typegoose schema**

In `server/src/models/RateBuildupTemplate/schema/index.ts`, add after the `nodePositions` field (line 95):

```typescript
  @Field()
  @prop({ required: true, default: '[]' })
  public groupDefs!: string;
```

- [ ] **Step 2: Add `groupDefs` to GraphQL input type and save mutation**

In `server/src/graphql/resolvers/rateBuildupTemplate/mutations.ts`:

Add to `SaveRateBuildupTemplateData` class (after `nodePositions` field):
```typescript
  /** JSON-serialized GroupDef[] */
  @Field() public groupDefs!: string;
```

In the `save` function, add `groupDefs: data.groupDefs` to both the `Object.assign(existing, {...})` block and the `new RateBuildupTemplate({...})` block, alongside `nodePositions`:
```typescript
// update branch (Object.assign):
nodePositions: data.nodePositions,
groupDefs: data.groupDefs,

// create branch (new RateBuildupTemplate):
nodePositions: data.nodePositions,
groupDefs: data.groupDefs,
```

- [ ] **Step 3: Add `groupDefs` to the GraphQL fragment**

In `client/src/graphql/fragments/RateBuildupTemplate_Full.graphql`, add `groupDefs` after `nodePositions`:
```graphql
  defaultInputs
  nodePositions
  groupDefs
  schemaVersion
```

- [ ] **Step 4: Run codegen**

```bash
cd client && npm run codegen
```

Expected: generates updated types including `groupDefs: string` on `RateBuildupTemplateFullSnippetFragment` and `SaveRateBuildupTemplateMutationVariables`.

- [ ] **Step 5: Add `GroupDef` interface and update `CanvasDocument` in canvasStorage.ts**

In `canvasStorage.ts`, add the `GroupDef` interface **above** the `CanvasDocument` interface:

```typescript
export interface GroupDef {
  id: string;
  label: string;
  parentGroupId?: string;
  memberIds: string[]; // ordered list: param/table/formula step/sub-group IDs
}
```

Update `CanvasDocument`:
```typescript
export interface CanvasDocument {
  id: string;
  label: string;
  defaultUnit: string;
  parameterDefs: ParameterDef[];
  tableDefs: TableDef[];
  formulaSteps: FormulaStep[];
  breakdownDefs: BreakdownDef[];
  intermediateDefs: IntermediateDef[];
  defaultInputs: CalculatorInputs;
  nodePositions: Record<string, { x: number; y: number; w?: number; h?: number }>;
  groupDefs: GroupDef[];
}
```

- [ ] **Step 6: Update `fragmentToDoc` to parse `groupDefs`**

In `fragmentToDoc`, add after the `nodePositions` try/catch:
```typescript
  let groupDefs: GroupDef[] = [];
  try { groupDefs = JSON.parse((f as any).groupDefs ?? '[]'); } catch { /* ignore */ }
```

Update the returned object to include `groupDefs`:
```typescript
  return {
    id: f._id,
    label: f.label,
    defaultUnit: f.defaultUnit ?? "unit",
    parameterDefs: (f.parameterDefs ?? []) as ParameterDef[],
    tableDefs: (f.tableDefs ?? []) as TableDef[],
    formulaSteps: (f.formulaSteps ?? []) as FormulaStep[],
    breakdownDefs: (f.breakdownDefs ?? []) as BreakdownDef[],
    intermediateDefs: (f.intermediateDefs ?? []) as IntermediateDef[],
    defaultInputs,
    nodePositions,
    groupDefs,
  };
```

- [ ] **Step 7: Update `docToVariables` to serialise `groupDefs`**

In `docToVariables`, add `groupDefs: JSON.stringify(doc.groupDefs)` alongside `nodePositions`:
```typescript
      defaultInputs: JSON.stringify(doc.defaultInputs),
      nodePositions: JSON.stringify(doc.nodePositions),
      groupDefs: JSON.stringify(doc.groupDefs),
```

- [ ] **Step 8: Update `blankDocument` to include `groupDefs: []`**

```typescript
function blankDocument(): CanvasDocument {
  return {
    id: `new_${Date.now()}`,
    label: "New Template",
    defaultUnit: "unit",
    parameterDefs: [],
    tableDefs: [],
    formulaSteps: [],
    breakdownDefs: [],
    intermediateDefs: [],
    defaultInputs: { params: {}, tables: {} },
    nodePositions: {
      quantity: { x: 100, y: 200 },
      unitPrice: { x: 700, y: 200 },
    },
    groupDefs: [],
  };
}
```

- [ ] **Step 9: Check the server pod started cleanly**

```bash
kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=30
```

Expected: no TypeScript errors or crash loops.

- [ ] **Step 10: Commit**

```bash
git add server/src/models/RateBuildupTemplate/schema/index.ts \
        server/src/graphql/resolvers/rateBuildupTemplate/mutations.ts \
        client/src/graphql/fragments/RateBuildupTemplate_Full.graphql \
        client/src/generated/ \
        client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts
git commit -m "feat: add GroupDef data model and persistence layer"
```

---

## Task 2: GroupNode component and canvas rendering

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/nodeTypes.tsx`
- Modify: `client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx`

- [ ] **Step 1: Add `GroupNode` to `nodeTypes.tsx`**

Add `NodeResizer` to the import:
```typescript
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
```

Add `GroupNode` component after `OutputNode`:
```typescript
export const GroupNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      borderRadius: 8,
      border: `1px dashed ${selected ? "#818cf8" : "#475569"}`,
      background: "rgba(99, 102, 241, 0.04)",
      position: "relative",
    }}
  >
    <NodeResizer
      isVisible={selected}
      minWidth={200}
      minHeight={120}
      color="#6366f1"
      lineStyle={{ borderColor: "#6366f1" }}
      handleStyle={{ borderColor: "#6366f1", background: "#1e1b4b" }}
      onResizeEnd={(_, params) => data.onResizeEnd?.(params.width, params.height)}
    />
    <div
      style={{
        position: "absolute",
        top: 6,
        left: 10,
        fontSize: 9,
        color: "#818cf8",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 700,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {data.label}
    </div>
  </div>
);
```

Add `group: GroupNode` to the `nodeTypes` export:
```typescript
export const nodeTypes = {
  param: ParamNode,
  table: TableNode,
  quantity: QuantityNode,
  formula: FormulaNode,
  breakdown: BreakdownNode,
  priceOutput: OutputNode,
  group: GroupNode,
};
```

- [ ] **Step 2: Update `buildNodes` signature and body in `CanvasFlow.tsx`**

Replace the entire `buildNodes` function with the version below. Key changes:
- Takes `onGroupResizeEnd` as a new parameter
- Builds a `memberOf` map (nodeId → direct parent groupId)
- Uses `makeNode` helper that sets `parentId` for grouped nodes
- Adds group container nodes at the start (low z-index)
- Positions for grouped nodes are stored **relative** to their parent; `buildNodes` passes them directly

```typescript
function buildNodes(
  doc: CanvasDocument,
  stepDebug: StepDebugInfo[],
  positions: Record<string, { x: number; y: number; w?: number; h?: number }>,
  quantity: number,
  onQuantityChange: (v: number) => void,
  onGroupResizeEnd: (groupId: string, w: number, h: number) => void
): Node[] {
  const debugMap = Object.fromEntries(stepDebug.map((s) => [s.id, s]));
  const nodes: Node[] = [];

  // Build direct-parent map: nodeId → groupId
  const memberOf: Record<string, string> = {};
  for (const g of doc.groupDefs) {
    for (const mid of g.memberIds) {
      memberOf[mid] = g.id;
    }
  }

  // Helper: create a node with parentId if grouped
  const makeNode = (id: string, type: string, data: Record<string, unknown>): Node => {
    const pos = positions[id] ?? { x: 0, y: 0 };
    const parentId = memberOf[id];
    return {
      id,
      type,
      position: { x: pos.x, y: pos.y },
      ...(parentId !== undefined ? { parentId } : {}),
      data,
    };
  };

  // Group container nodes (rendered behind other nodes)
  for (const g of doc.groupDefs) {
    const pos = positions[g.id] ?? { x: 0, y: 0 };
    const w = pos.w ?? 400;
    const h = pos.h ?? 300;
    const parentId = memberOf[g.id];
    nodes.push({
      id: g.id,
      type: "group",
      position: { x: pos.x, y: pos.y },
      ...(parentId !== undefined ? { parentId } : {}),
      style: { width: w, height: h },
      zIndex: -1,
      data: {
        label: g.label,
        onResizeEnd: (newW: number, newH: number) => onGroupResizeEnd(g.id, newW, newH),
      },
    });
  }

  for (const p of doc.parameterDefs) {
    nodes.push(makeNode(p.id, "param", {
      id: p.id,
      label: p.label,
      suffix: p.suffix,
      value: doc.defaultInputs.params[p.id] ?? p.defaultValue,
    }));
  }

  for (const t of doc.tableDefs) {
    const nodeId = `${t.id}RatePerHr`;
    const rows = doc.defaultInputs.tables[t.id] ?? [];
    const ratePerHr = rows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);
    nodes.push(makeNode(nodeId, "table", { id: nodeId, label: t.label, value: ratePerHr }));
  }

  // Singletons — never grouped
  nodes.push({
    id: "quantity",
    type: "quantity",
    position: positions["quantity"] ?? { x: 0, y: 0 },
    data: { value: quantity, onChange: onQuantityChange },
  });

  const labelMap: Record<string, string> = { quantity: "Quantity" };
  for (const p of doc.parameterDefs) labelMap[p.id] = p.label;
  for (const t of doc.tableDefs) labelMap[`${t.id}RatePerHr`] = t.label;
  for (const s of doc.formulaSteps) labelMap[s.id] = s.label ?? s.id;

  for (const step of doc.formulaSteps) {
    const debug = debugMap[step.id];
    nodes.push(makeNode(step.id, "formula", {
      id: step.id,
      label: step.label,
      formula: step.formula,
      labelMap,
      value: debug?.value ?? 0,
      hasError: !!debug?.error,
    }));
  }

  for (const bd of doc.breakdownDefs) {
    const value = (bd.items ?? []).reduce((s, item) => s + (debugMap[item.stepId]?.value ?? 0), 0);
    nodes.push(makeNode(bd.id, "breakdown", { label: bd.label, value }));
  }

  const unitPrice = doc.breakdownDefs.reduce(
    (sum, bd) => sum + (bd.items ?? []).reduce((s, item) => s + (debugMap[item.stepId]?.value ?? 0), 0),
    0
  );
  nodes.push({
    id: "unitPrice",
    type: "priceOutput",
    position: positions["unitPrice"] ?? { x: 0, y: 0 },
    data: { value: unitPrice },
  });

  return nodes;
}
```

- [ ] **Step 3: Add `handleGroupResizeEnd` callback and thread it into `buildNodes` calls in `CanvasFlow.tsx`**

Inside the `CanvasFlow` component body, add this callback (stable reference via `useCallback`):

```typescript
const handleGroupResizeEnd = useCallback(
  (groupId: string, w: number, h: number) => {
    const existing = doc.nodePositions[groupId] ?? { x: 0, y: 0 };
    onUpdateDoc({
      ...doc,
      nodePositions: { ...doc.nodePositions, [groupId]: { ...existing, w, h } },
    });
  },
  [doc, onUpdateDoc]
);
```

Update the initial `useNodesState` call (line ~288) to pass the new argument:
```typescript
const [nodes, setNodes, onNodesChange] = useNodesState(
  buildNodes(doc, stepDebug, doc.nodePositions, quantity, onQuantityChange, handleGroupResizeEnd)
);
```

Update both `setNodes(buildNodes(...))` calls inside the `useEffect` (the doc-switch branch and the content-change branch) to pass `handleGroupResizeEnd`:
```typescript
// doc-switch / positionReset branch:
setNodes(buildNodes(doc, stepDebug, doc.nodePositions, quantity, onQuantityChange, handleGroupResizeEnd));

// content-change branch:
setNodes((prev) => {
  const positions = {
    ...doc.nodePositions,
    ...Object.fromEntries(prev.map((n) => [n.id, n.position])),
  };
  return buildNodes(doc, stepDebug, positions, quantity, onQuantityChange, handleGroupResizeEnd);
});
```

Note: the content-change branch mixes relative positions (from `prev` for grouped nodes) with absolute positions (from `doc.nodePositions`). For grouped nodes, `prev` already has the correct relative position, so the spread `...Object.fromEntries(prev.map(...))` correctly overrides the stored value. ✓

- [ ] **Step 4: Update `handleAutoLayout` to skip group nodes**

Replace the current `handleAutoLayout`:
```typescript
const handleAutoLayout = useCallback(() => {
  const nonGroupNodes = nodes.filter((n) => n.type !== "group");
  const laidOut = dagreLayout(nonGroupNodes, rawEdges);
  // Merge laid-out positions back into the full nodes array
  const laidOutMap = Object.fromEntries(laidOut.map((n) => [n.id, n.position]));
  setNodes((prev) =>
    prev.map((n) => (laidOutMap[n.id] ? { ...n, position: laidOutMap[n.id] } : n))
  );
  const newPositions = { ...doc.nodePositions };
  for (const n of laidOut) {
    newPositions[n.id] = { ...(newPositions[n.id] ?? {}), ...laidOutMap[n.id] };
  }
  onUpdateDoc({ ...doc, nodePositions: newPositions });
  requestAnimationFrame(() => reactFlowInstance.current?.fitView({ duration: 400 }));
}, [nodes, rawEdges, doc, setNodes, onUpdateDoc]);
```

- [ ] **Step 5: Verify the canvas renders group nodes without crashing**

In the browser, open the Calculator Canvas. The canvas should load without errors. (No groups exist yet — this just confirms the code compiles and renders.)

Check client dev server logs for TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/nodeTypes.tsx \
        client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx
git commit -m "feat: add GroupNode component and update buildNodes for group containers"
```

---

## Task 3: Group create/delete + InspectPanel group support

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/canvasOps.ts`
- Modify: `client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx`
- Modify: `client/src/components/pages/developer/CalculatorCanvas/index.tsx`
- Modify: `client/src/components/pages/developer/CalculatorCanvas/InspectPanel.tsx`

- [ ] **Step 1: Add `GroupDef` import and group operation helpers to `canvasOps.ts`**

Add `GroupDef` to the import from canvasStorage:
```typescript
import { CanvasDocument, GroupDef } from "./canvasStorage";
```

Add the following helper functions after the existing `renameNodeId` function:

```typescript
// ─── Group helpers ────────────────────────────────────────────────────────────

/**
 * Compute the absolute canvas position of a node or group.
 * Positions are stored relative to direct parent; this recursively sums them.
 */
export function getAbsolutePosition(
  id: string,
  doc: CanvasDocument
): { x: number; y: number } {
  const pos = doc.nodePositions[id] ?? { x: 0, y: 0 };
  const parentGroup = doc.groupDefs.find((g) => g.memberIds.includes(id));
  if (!parentGroup) return { x: pos.x, y: pos.y };
  const parentAbs = getAbsolutePosition(parentGroup.id, doc);
  return { x: pos.x + parentAbs.x, y: pos.y + parentAbs.y };
}

/**
 * Remove a node from whichever group it currently belongs to.
 * Converts its stored (relative) position to absolute.
 * No-op if the node is not in any group.
 */
export function removeNodeFromGroup(nodeId: string, doc: CanvasDocument): CanvasDocument {
  const currentGroup = doc.groupDefs.find((g) => g.memberIds.includes(nodeId));
  if (!currentGroup) return doc;

  // Convert relative → absolute
  const groupAbs = getAbsolutePosition(currentGroup.id, doc);
  const nodeRel = doc.nodePositions[nodeId] ?? { x: 0, y: 0 };
  const absPos = {
    x: nodeRel.x + groupAbs.x,
    y: nodeRel.y + groupAbs.y,
    ...(nodeRel.w !== undefined ? { w: nodeRel.w, h: nodeRel.h } : {}),
  };

  return {
    ...doc,
    groupDefs: doc.groupDefs.map((g) => ({
      ...g,
      memberIds: g.memberIds.filter((id) => id !== nodeId),
    })),
    nodePositions: { ...doc.nodePositions, [nodeId]: absPos },
  };
}

/**
 * Assign a node to a target group.
 * Removes it from its current group first (if any), then converts its absolute
 * position to relative and appends it to targetGroup.memberIds.
 */
export function assignNodeToGroup(
  nodeId: string,
  targetGroupId: string,
  doc: CanvasDocument
): CanvasDocument {
  // Remove from current group → position becomes absolute
  const docWithout = removeNodeFromGroup(nodeId, doc);

  // Convert absolute → relative to target group
  const targetGroupAbs = getAbsolutePosition(targetGroupId, docWithout);
  const nodeAbs = docWithout.nodePositions[nodeId] ?? { x: 0, y: 0 };
  const relPos = {
    x: nodeAbs.x - targetGroupAbs.x,
    y: nodeAbs.y - targetGroupAbs.y,
    ...(nodeAbs.w !== undefined ? { w: nodeAbs.w, h: nodeAbs.h } : {}),
  };

  return {
    ...docWithout,
    groupDefs: docWithout.groupDefs.map((g) =>
      g.id === targetGroupId
        ? { ...g, memberIds: [...g.memberIds.filter((id) => id !== nodeId), nodeId] }
        : g
    ),
    nodePositions: { ...docWithout.nodePositions, [nodeId]: relPos },
  };
}

/**
 * Create a new group node at the given canvas position.
 * Returns the updated doc and the new group's ID.
 */
export function createGroup(
  doc: CanvasDocument,
  position: { x: number; y: number }
): { doc: CanvasDocument; newId: string } {
  const takenIds = new Set([
    ...doc.groupDefs.map((g) => g.id),
    ...doc.formulaSteps.map((s) => s.id),
    ...doc.parameterDefs.map((p) => p.id),
    ...doc.tableDefs.map((t) => t.id),
    ...doc.tableDefs.map((t) => `${t.id}RatePerHr`),
    ...doc.breakdownDefs.map((b) => b.id),
    "quantity",
    "unitPrice",
  ]);
  const takenLabels = new Set(doc.groupDefs.map((g) => g.label));
  const label = nextLabel("Group", takenLabels);
  const id = nextSlugId(`grp_${slugify(label)}`, takenIds);
  const newGroup: GroupDef = { id, label, memberIds: [] };
  return {
    newId: id,
    doc: {
      ...doc,
      groupDefs: [...doc.groupDefs, newGroup],
      nodePositions: {
        ...doc.nodePositions,
        [id]: { x: position.x, y: position.y, w: 400, h: 300 },
      },
    },
  };
}

/**
 * Delete a group. Its direct members are un-parented (stay at their current absolute
 * positions). Sub-groups become top-level. Removes the GroupDef and its nodePositions entry.
 */
export function deleteGroup(groupId: string, doc: CanvasDocument): CanvasDocument {
  const group = doc.groupDefs.find((g) => g.id === groupId);
  if (!group) return doc;

  // Un-parent all direct members: convert their positions from relative → absolute
  let updatedDoc = doc;
  for (const memberId of group.memberIds) {
    // Only convert non-group members here (sub-groups handle themselves below)
    const isSubGroup = doc.groupDefs.some((g) => g.id === memberId);
    if (!isSubGroup) {
      updatedDoc = removeNodeFromGroup(memberId, updatedDoc);
    }
  }

  // Remove the group from all groupDefs:
  // - Remove the GroupDef itself
  // - Remove it from parent group's memberIds (if any)
  // - Clear parentGroupId on any sub-groups that listed this group as parent
  const newGroupDefs = updatedDoc.groupDefs
    .filter((g) => g.id !== groupId)
    .map((g) => ({
      ...g,
      memberIds: g.memberIds.filter((mid) => mid !== groupId),
    }));

  // Convert sub-group positions from relative to absolute before removing membership
  let finalGroupDefs = newGroupDefs;
  for (const memberId of group.memberIds) {
    const isSubGroup = doc.groupDefs.some((g) => g.id === memberId);
    if (isSubGroup) {
      const groupAbs = getAbsolutePosition(groupId, updatedDoc);
      const subPos = updatedDoc.nodePositions[memberId] ?? { x: 0, y: 0 };
      const absPos = {
        x: subPos.x + groupAbs.x,
        y: subPos.y + groupAbs.y,
        ...(subPos.w !== undefined ? { w: subPos.w, h: subPos.h } : {}),
      };
      updatedDoc = { ...updatedDoc, nodePositions: { ...updatedDoc.nodePositions, [memberId]: absPos } };
    }
  }

  const newPositions = { ...updatedDoc.nodePositions };
  delete newPositions[groupId];

  return { ...updatedDoc, groupDefs: finalGroupDefs, nodePositions: newPositions };
}
```

- [ ] **Step 2: Update `deleteNodes` in `canvasOps.ts` to handle group nodes**

The existing `deleteNodes` function handles param/table/formula/breakdown nodes. Update it to also handle group IDs and clean up group membership:

Replace the `deleteNodes` function body. Insert group handling after `const toDelete = ...`:

```typescript
export function deleteNodes(nodeIds: string[], doc: CanvasDocument): CanvasDocument {
  const toDelete = new Set(nodeIds.filter((id) => !SINGLETONS.has(id)));
  if (toDelete.size === 0) return doc;

  // Handle group deletions first (un-parents their members)
  let workingDoc = doc;
  for (const id of toDelete) {
    if (workingDoc.groupDefs.some((g) => g.id === id)) {
      workingDoc = deleteGroup(id, workingDoc);
    }
  }

  // Remove regular nodes from any group membership
  for (const id of toDelete) {
    if (workingDoc.groupDefs.some((g) => g.memberIds.includes(id))) {
      workingDoc = removeNodeFromGroup(id, workingDoc);
    }
  }

  const newFormulas = workingDoc.formulaSteps.filter((s) => !toDelete.has(s.id));
  const newParams = workingDoc.parameterDefs.filter((p) => !toDelete.has(p.id));
  const newTables = workingDoc.tableDefs.filter(
    (t) => !toDelete.has(t.id) && !toDelete.has(`${t.id}RatePerHr`)
  );
  const newBreakdowns = workingDoc.breakdownDefs.filter((b) => !toDelete.has(b.id));

  const newParamInputs = { ...workingDoc.defaultInputs.params };
  for (const p of workingDoc.parameterDefs) {
    if (toDelete.has(p.id)) delete newParamInputs[p.id];
  }
  const newTableInputs = { ...workingDoc.defaultInputs.tables };
  for (const t of workingDoc.tableDefs) {
    if (toDelete.has(t.id) || toDelete.has(`${t.id}RatePerHr`)) {
      delete newTableInputs[t.id];
    }
  }

  const newPositions = { ...workingDoc.nodePositions };
  for (const id of toDelete) delete newPositions[id];

  return {
    ...workingDoc,
    parameterDefs: newParams,
    tableDefs: newTables,
    formulaSteps: newFormulas,
    breakdownDefs: newBreakdowns,
    defaultInputs: { params: newParamInputs, tables: newTableInputs },
    nodePositions: newPositions,
  };
}
```

- [ ] **Step 3: Update the `ContextMenu` in `CanvasFlow.tsx` to include "Add Group"**

The `ContextMenu` component's `onCreate` prop type currently is:
```typescript
onCreate: (type: "formula" | "param" | "table" | "breakdown", pos: { x: number; y: number }) => void;
```

Change it to:
```typescript
onCreate: (type: "formula" | "param" | "table" | "breakdown" | "group", pos: { x: number; y: number }) => void;
```

Also update `ContextMenuProps` interface accordingly.

In the pane menu items array, change:
```typescript
{(["formula", "param", "table", "breakdown"] as const).map((type) => (
```
to:
```typescript
{(["formula", "param", "table", "breakdown", "group"] as const).map((type) => (
```

Change the label logic:
```typescript
Add {type === "formula" ? "Formula Step"
   : type === "param" ? "Parameter"
   : type === "table" ? "Rate Table"
   : type === "breakdown" ? "Summary"
   : "Group"}
```

- [ ] **Step 4: Update `onCreateNode` type and handler in `index.tsx`**

In `index.tsx`, update the `handleCreateNode` callback to handle `"group"`:

```typescript
const handleCreateNode = useCallback(
  (type: "formula" | "param" | "table" | "breakdown" | "group", position: { x: number; y: number }) => {
    if (!activeDoc) return;
    if (type === "group") {
      const { doc, newId } = createGroup(activeDoc, position);
      saveDocument(doc);
      setSelectedNodeId(newId);
      setPositionResetKey((k) => k + 1);
    } else {
      const { doc: updatedDoc, newId } = createNode(type, activeDoc, position);
      saveDocument(updatedDoc);
      setSelectedNodeId(newId);
      setPositionResetKey((k) => k + 1);
    }
  },
  [activeDoc, saveDocument]
);
```

Also update the import line for `canvasOps` to include `createGroup`:
```typescript
import { ClipboardPayload, copyNodes, pasteNodes, deleteNodes, createNode, createGroup } from "./canvasOps";
```

- [ ] **Step 5: Add group support to `InspectPanel.tsx`**

First, import `GroupDef` from canvasStorage:
```typescript
import { CanvasDocument, GroupDef } from "./canvasStorage";
```

Add `"group"` to the `NodeKind` type:
```typescript
type NodeKind = "param" | "table" | "quantity" | "formula" | "breakdown" | "output" | "group" | "unknown";
```

Add to `KIND_COLORS`:
```typescript
group: "purple",
```

Add to `KIND_LABELS`:
```typescript
group: "Group",
```

Update `detectKind` to check `groupDefs` before the `"unknown"` fallback:
```typescript
function detectKind(nodeId: string, template: CanvasDocument): NodeKind {
  if (nodeId === "quantity") return "quantity";
  if (nodeId === "unitPrice") return "output";
  if (template.parameterDefs.some((p) => p.id === nodeId)) return "param";
  if (template.tableDefs.some((t) => `${t.id}RatePerHr` === nodeId)) return "table";
  if (template.formulaSteps.some((s) => s.id === nodeId)) return "formula";
  if (template.breakdownDefs.some((b) => b.id === nodeId)) return "breakdown";
  if (template.groupDefs.some((g) => g.id === nodeId)) return "group";
  return "unknown";
}
```

Add a `GroupEdit` component (after `BreakdownEdit`, before `TableLabelEdit`):
```typescript
const GroupEdit: React.FC<{
  doc: CanvasDocument;
  nodeId: string;
  onUpdateDoc: (doc: CanvasDocument) => void;
}> = ({ doc, nodeId, onUpdateDoc }) => {
  const group = doc.groupDefs.find((g) => g.id === nodeId)!;

  const saveLabel = (newLabel: string) => {
    onUpdateDoc({
      ...doc,
      groupDefs: doc.groupDefs.map((g) => g.id === nodeId ? { ...g, label: newLabel } : g),
    });
  };

  return (
    <EditField label="Label" value={group.label} onBlur={saveLabel} />
  );
};
```

Add the `GroupEdit` render branch in the main `InspectPanel` component, after the `breakdown` case:
```typescript
{kind === "group" && (
  <GroupEdit doc={template} nodeId={selectedNodeId} onUpdateDoc={onUpdateDoc} />
)}
```

Also, suppress the "Receives from / Feeds into" dependency section for group nodes (they have no edges). After the `<Divider mb={4} />`, add a guard:
```typescript
{kind !== "group" && (
  <>
    {/* Receives from */}
    ...existing receives-from/feeds-into JSX...
  </>
)}
```

- [ ] **Step 6: Test group creation and deletion**

In the browser:
1. Right-click empty canvas → "Add Group" → a dashed rectangle should appear
2. Select the group → InspectPanel shows "Group" badge + label input
3. Edit the label → group header updates
4. Select group → press Delete → group disappears cleanly

- [ ] **Step 7: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/canvasOps.ts \
        client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx \
        client/src/components/pages/developer/CalculatorCanvas/index.tsx \
        client/src/components/pages/developer/CalculatorCanvas/InspectPanel.tsx
git commit -m "feat: group create/delete/rename via context menu and InspectPanel"
```

---

## Task 4: Drag-to-group assignment

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx`

This task replaces `handleNodeDragStop` with a version that detects group intersection changes and updates `groupDefs` accordingly.

**Key position storage contract:**
- Group container nodes: position stored **absolute**
- Nodes in a group: position stored **relative to direct parent group**
- Ungrouped nodes: position stored **absolute**

React Flow gives `node.position` in the node's own coordinate space (relative for children, absolute for ungrouped). We store these positions as-is.

- [ ] **Step 1: Add `assignNodeToGroup` and `removeNodeFromGroup` to the import in `CanvasFlow.tsx`**

Update the `canvasOps` import:
```typescript
import {
  ClipboardPayload, SINGLETONS,
  copyNodes, pasteNodes, deleteNodes, createNode, createGroup,
  assignNodeToGroup, removeNodeFromGroup,
} from "./canvasOps";
```

Also add `ReactFlowInstance` is already imported via the existing `useRef<ReactFlowInstance | null>(null)`.

- [ ] **Step 2: Replace `handleNodeDragStop` in `CanvasFlow.tsx`**

Replace the existing `handleNodeDragStop` (currently ~line 391-400):

```typescript
const handleNodeDragStop: NodeDragStopHandler = useCallback(
  (_, draggedNode) => {
    // node.position is in the correct coordinate space already:
    //   - absolute for ungrouped nodes and group containers
    //   - relative to parent for grouped nodes (React Flow gives relative for parentId children)
    const existingEntry = doc.nodePositions[draggedNode.id] ?? {};
    const newPositions = {
      ...doc.nodePositions,
      [draggedNode.id]: {
        ...existingEntry,
        x: draggedNode.position.x,
        y: draggedNode.position.y,
      },
    };

    // For non-group nodes: detect whether group membership changed
    if (draggedNode.type !== "group") {
      const intersecting = reactFlowInstance.current?.getIntersectingNodes(draggedNode) ?? [];
      const intersectingGroups = intersecting.filter((n) => n.type === "group");

      // Pick the innermost (smallest-area) intersecting group
      const targetGroup =
        intersectingGroups.length > 0
          ? intersectingGroups.reduce((best, g) =>
              (g.width ?? 400) * (g.height ?? 300) < (best.width ?? 400) * (best.height ?? 300)
                ? g
                : best
            )
          : null;

      const currentGroupId =
        doc.groupDefs.find((g) => g.memberIds.includes(draggedNode.id))?.id ?? null;
      const targetGroupId = targetGroup?.id ?? null;

      if (targetGroupId !== currentGroupId) {
        // Membership changed: use helpers that handle absolute↔relative conversion
        let updatedDoc = { ...doc, nodePositions: newPositions };
        if (targetGroupId) {
          updatedDoc = assignNodeToGroup(draggedNode.id, targetGroupId, updatedDoc);
        } else {
          updatedDoc = removeNodeFromGroup(draggedNode.id, updatedDoc);
        }
        onUpdateDoc(updatedDoc);
        return;
      }
    }

    onUpdateDoc({ ...doc, nodePositions: newPositions });
  },
  [doc, onUpdateDoc]
);
```

Note: `nodes` is no longer in the deps array (we no longer iterate all nodes on every drag stop).

- [ ] **Step 3: Test drag-to-group**

In the browser:
1. Create a group (right-click → "Add Group")
2. Create a param node (right-click → "Add Parameter")
3. Drag the param node on top of the group container — it should snap inside (parentId set, dashed border indicates group membership)
4. Drag the param node back outside the group — it should return to ungrouped state
5. Select the group → Delete → param node remains on canvas as ungrouped

- [ ] **Step 4: Test nested groups**

1. Create two groups (Group 1 and Group 2)
2. Drag Group 2 on top of Group 1 → Group 2 should appear nested inside Group 1
3. Add a param node inside Group 2 by dragging

- [ ] **Step 5: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx
git commit -m "feat: drag-to-group assignment with parentId and position conversion"
```

---

## Task 5: LiveTestPanel grouped sections

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx`

The Live Test panel renders params and tables in order. This task refactors it to group them into collapsible sections following `doc.groupDefs`.

**Rendering order:**
1. Ungrouped params/tables at the top (no header)
2. Top-level groups as collapsible sections (indigo heading)
3. Sub-groups as collapsible sub-sections (violet heading, indented)
4. Formula steps are skipped (canvas org only)
5. Groups with no visible content (only formula steps) are not rendered

- [ ] **Step 1: Replace `LiveTestPanel.tsx` with the grouped version**

Full replacement of the file:

```tsx
// client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Grid, Input, Text } from "@chakra-ui/react";
import { v4 as uuidv4 } from "uuid";
import { FiChevronDown, FiChevronRight, FiPlus } from "react-icons/fi";
import { CanvasDocument, GroupDef } from "./canvasStorage";
import { RateEntry } from "../../../../components/TenderPricing/calculators/types";
import {
  evaluateTemplate,
  debugEvaluateTemplate,
} from "../../../../components/TenderPricing/calculators/evaluate";
import {
  BreakdownCell,
  RateRow,
} from "../../../../components/TenderPricing/calculatorShared";

interface Props {
  doc: CanvasDocument;
  onCollapse: () => void;
}

const copyTables = (tables: Record<string, RateEntry[]>) =>
  Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, [...v]]));

// ─── Param row ────────────────────────────────────────────────────────────────

const ParamRow: React.FC<{
  paramId: string;
  doc: CanvasDocument;
  value: number;
  onChange: (id: string, v: number) => void;
}> = ({ paramId, doc, value, onChange }) => {
  const p = doc.parameterDefs.find((p) => p.id === paramId);
  if (!p) return null;
  return (
    <React.Fragment key={p.id}>
      <Text fontSize="sm" color="gray.700">
        {p.label}
        {p.suffix && (
          <Text as="span" fontSize="xs" color="gray.400">
            {" "}({p.suffix})
          </Text>
        )}
      </Text>
      <Input
        size="sm"
        type="number"
        textAlign="right"
        value={value ?? p.defaultValue}
        onChange={(e) => onChange(p.id, parseFloat(e.target.value) || 0)}
      />
    </React.Fragment>
  );
};

// ─── Table section ────────────────────────────────────────────────────────────

const TableSection: React.FC<{
  tableId: string;
  doc: CanvasDocument;
  rows: RateEntry[];
  onUpdateRow: (tableId: string, rowId: string, field: keyof RateEntry, value: string | number) => void;
  onAddRow: (tableId: string) => void;
  onRemoveRow: (tableId: string, rowId: string) => void;
}> = ({ tableId, doc, rows, onUpdateRow, onAddRow, onRemoveRow }) => {
  const t = doc.tableDefs.find((t) => t.id === tableId);
  if (!t) return null;
  const ratePerHr = rows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);
  return (
    <Box mb={4}>
      <Flex align="center" justify="space-between" mb={1}>
        <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide">
          {t.label}
        </Text>
        <Text fontSize="xs" color="gray.500">${ratePerHr.toFixed(2)}/hr</Text>
      </Flex>
      <Box borderWidth={1} borderColor="gray.200" rounded="md" overflow="hidden">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#F7FAFC" }}>
              <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 500, color: "#718096" }}>{t.rowLabel}</th>
              <th style={{ textAlign: "center", padding: "4px 4px", fontWeight: 500, color: "#718096", width: "40px" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "64px" }}>$/hr</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "64px" }}>Total</th>
              <th style={{ width: "28px" }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <RateRow
                key={row.id}
                entry={row}
                onChangeName={(v) => onUpdateRow(tableId, row.id, "name", v)}
                onChangeQty={(v) => onUpdateRow(tableId, row.id, "qty", v)}
                onChangeRate={(v) => onUpdateRow(tableId, row.id, "ratePerHour", v)}
                onDelete={() => onRemoveRow(tableId, row.id)}
              />
            ))}
          </tbody>
        </table>
      </Box>
      <Button size="xs" variant="ghost" leftIcon={<FiPlus />} mt={1} color="gray.500" onClick={() => onAddRow(tableId)}>
        Add
      </Button>
    </Box>
  );
};

// ─── Group section (recursive) ────────────────────────────────────────────────

interface GroupSectionProps {
  group: GroupDef;
  depth: number;
  doc: CanvasDocument;
  params: Record<string, number>;
  tables: Record<string, RateEntry[]>;
  onParamChange: (id: string, v: number) => void;
  onUpdateRow: (tableId: string, rowId: string, field: keyof RateEntry, value: string | number) => void;
  onAddRow: (tableId: string) => void;
  onRemoveRow: (tableId: string, rowId: string) => void;
}

const GroupSection: React.FC<GroupSectionProps> = ({
  group, depth, doc, params, tables, onParamChange, onUpdateRow, onAddRow, onRemoveRow,
}) => {
  const [open, setOpen] = useState(true);

  // Collect visible members: params, tables, sub-groups (skip formula steps)
  const paramIds = group.memberIds.filter((id) => doc.parameterDefs.some((p) => p.id === id));
  const tableIds = group.memberIds.filter((id) => doc.tableDefs.some((t) => t.id === id));
  const subGroupIds = group.memberIds.filter((id) => doc.groupDefs.some((g) => g.id === id));

  const hasVisibleContent = paramIds.length > 0 || tableIds.length > 0 || subGroupIds.length > 0;
  if (!hasVisibleContent) return null;

  const headingColor = depth === 0 ? "indigo.600" : "purple.500";
  const headingColorVal = depth === 0 ? "#4338ca" : "#8b5cf6";
  const indent = depth * 12;

  return (
    <Box mb={3} ml={`${indent}px`}>
      {/* Section heading */}
      <Flex
        align="center"
        gap={1}
        mb={open ? 2 : 0}
        borderBottom={open ? "1px solid" : "none"}
        borderColor={depth === 0 ? "indigo.100" : "purple.100"}
        pb={open ? 1 : 0}
        cursor="pointer"
        onClick={() => setOpen((o) => !o)}
        _hover={{ opacity: 0.8 }}
      >
        <Box color={headingColorVal} fontSize="10px">
          {open ? <FiChevronDown /> : <FiChevronRight />}
        </Box>
        <Text
          fontSize="xs"
          fontWeight="bold"
          color={headingColorVal}
          textTransform="uppercase"
          letterSpacing="wider"
        >
          {group.label}
        </Text>
      </Flex>

      {open && (
        <>
          {/* Params in this group */}
          {paramIds.length > 0 && (
            <Grid templateColumns="1fr 80px" gap={2} alignItems="center" mb={2}>
              {paramIds.map((id) => (
                <ParamRow
                  key={id}
                  paramId={id}
                  doc={doc}
                  value={params[id]}
                  onChange={onParamChange}
                />
              ))}
            </Grid>
          )}

          {/* Tables in this group */}
          {tableIds.map((id) => (
            <TableSection
              key={id}
              tableId={id}
              doc={doc}
              rows={tables[id] ?? []}
              onUpdateRow={onUpdateRow}
              onAddRow={onAddRow}
              onRemoveRow={onRemoveRow}
            />
          ))}

          {/* Sub-groups */}
          {subGroupIds.map((id) => {
            const subGroup = doc.groupDefs.find((g) => g.id === id)!;
            return (
              <GroupSection
                key={id}
                group={subGroup}
                depth={depth + 1}
                doc={doc}
                params={params}
                tables={tables}
                onParamChange={onParamChange}
                onUpdateRow={onUpdateRow}
                onAddRow={onAddRow}
                onRemoveRow={onRemoveRow}
              />
            );
          })}
        </>
      )}
    </Box>
  );
};

// ─── Main panel ───────────────────────────────────────────────────────────────

const LiveTestPanel: React.FC<Props> = ({ doc, onCollapse }) => {
  const [quantity, setQuantity] = useState(100);
  const [params, setParams] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      doc.parameterDefs.map((p) => [p.id, doc.defaultInputs.params[p.id] ?? p.defaultValue])
    )
  );
  const [tables, setTables] = useState<Record<string, RateEntry[]>>(
    () => copyTables(doc.defaultInputs.tables)
  );

  useEffect(() => {
    setQuantity(100);
    setParams(
      Object.fromEntries(
        doc.parameterDefs.map((p) => [p.id, doc.defaultInputs.params[p.id] ?? p.defaultValue])
      )
    );
    setTables(copyTables(doc.defaultInputs.tables));
  }, [doc.id]);

  const inputs = useMemo(() => ({ params, tables }), [params, tables]);
  const result = useMemo(() => evaluateTemplate(doc, inputs, quantity), [doc, inputs, quantity]);
  const stepDebug = useMemo(() => debugEvaluateTemplate(doc, inputs, quantity), [doc, inputs, quantity]);

  const updateRow = (tableId: string, rowId: string, field: keyof RateEntry, value: string | number) => {
    setTables((prev) => ({
      ...prev,
      [tableId]: (prev[tableId] ?? []).map((r) => r.id === rowId ? { ...r, [field]: value } : r),
    }));
  };
  const addRow = (tableId: string) => {
    setTables((prev) => ({
      ...prev,
      [tableId]: [...(prev[tableId] ?? []), { id: uuidv4(), name: "", qty: 1, ratePerHour: 0 }],
    }));
  };
  const removeRow = (tableId: string, rowId: string) => {
    setTables((prev) => ({
      ...prev,
      [tableId]: (prev[tableId] ?? []).filter((r) => r.id !== rowId),
    }));
  };

  // Determine which params/tables are in any group (member of at least one groupDef)
  const allMemberIds = new Set(doc.groupDefs.flatMap((g) => g.memberIds));
  const ungroupedParams = doc.parameterDefs.filter((p) => !allMemberIds.has(p.id));
  const ungroupedTables = doc.tableDefs.filter((t) => !allMemberIds.has(t.id));
  const topLevelGroups = doc.groupDefs.filter((g) => !allMemberIds.has(g.id));

  return (
    <Box h="100%" overflowY="auto" bg="white">
      {/* Sticky header */}
      <Flex
        align="center"
        justify="space-between"
        px={3}
        py={2}
        borderBottom="1px solid"
        borderColor="gray.100"
        position="sticky"
        top={0}
        bg="white"
        zIndex={1}
      >
        <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
          Live Test
        </Text>
        <Button
          size="xs"
          variant="ghost"
          onClick={onCollapse}
          aria-label="Collapse live test panel"
          px={1}
          minW="auto"
          color="gray.400"
          _hover={{ color: "gray.600" }}
        >
          «
        </Button>
      </Flex>

      <Box px={3} py={3}>
        {/* Quantity */}
        <Flex align="center" gap={2} mb={4}>
          <Text fontSize="sm" color="gray.600" flex={1}>Quantity</Text>
          <Input
            size="sm"
            type="number"
            w="80px"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            textAlign="right"
          />
          <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">{doc.defaultUnit}</Text>
        </Flex>

        {/* Ungrouped params */}
        {ungroupedParams.length > 0 && (
          <Grid templateColumns="1fr 80px" gap={2} alignItems="center" mb={4}>
            {ungroupedParams.map((p) => (
              <ParamRow
                key={p.id}
                paramId={p.id}
                doc={doc}
                value={params[p.id]}
                onChange={(id, v) => setParams((prev) => ({ ...prev, [id]: v }))}
              />
            ))}
          </Grid>
        )}

        {/* Ungrouped tables */}
        {ungroupedTables.map((t) => (
          <TableSection
            key={t.id}
            tableId={t.id}
            doc={doc}
            rows={tables[t.id] ?? []}
            onUpdateRow={updateRow}
            onAddRow={addRow}
            onRemoveRow={removeRow}
          />
        ))}

        {/* Top-level groups */}
        {topLevelGroups.map((g) => (
          <GroupSection
            key={g.id}
            group={g}
            depth={0}
            doc={doc}
            params={params}
            tables={tables}
            onParamChange={(id, v) => setParams((prev) => ({ ...prev, [id]: v }))}
            onUpdateRow={updateRow}
            onAddRow={addRow}
            onRemoveRow={removeRow}
          />
        ))}

        {/* Summary breakdown */}
        {result.breakdown.length > 0 && (
          <>
            <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={2}>
              Summary
            </Text>
            <Grid
              templateColumns={`repeat(${result.breakdown.length + 1}, 1fr)`}
              gap={0}
              borderWidth={1}
              borderColor="gray.200"
              rounded="lg"
              overflow="hidden"
              mb={3}
            >
              {result.breakdown.map((cat) => (
                <BreakdownCell key={cat.id} label={cat.label} value={cat.value} borderRight />
              ))}
              <BreakdownCell label="Unit Price" value={result.unitPrice} highlight />
            </Grid>
          </>
        )}

        {/* Formula step debug */}
        {stepDebug.length > 0 && (
          <Box mt={2}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={2}>
              Formula Steps
            </Text>
            <Box borderWidth={1} borderColor="gray.200" rounded="md" overflow="hidden">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ background: "#F7FAFC" }}>
                    <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 600, color: "#718096", fontFamily: "monospace" }}>id</th>
                    <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 600, color: "#718096", fontFamily: "monospace" }}>formula</th>
                    <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600, color: "#718096", width: "80px" }}>value</th>
                  </tr>
                </thead>
                <tbody>
                  {stepDebug.map((s) => (
                    <tr key={s.id} style={{ background: s.error ? "#FFF5F5" : "white", borderTop: "1px solid #EDF2F7" }}>
                      <td style={{ padding: "4px 8px", fontFamily: "monospace", color: s.error ? "#C53030" : "#4A5568" }}>{s.id}</td>
                      <td style={{ padding: "4px 8px", fontFamily: "monospace", color: "#805AD5" }}>
                        {s.formula}
                        {s.error && <span style={{ color: "#C53030", marginLeft: 8, fontFamily: "sans-serif" }}>⚠ {s.error}</span>}
                      </td>
                      <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 600, color: s.error ? "#C53030" : "#1A202C" }}>
                        {s.error ? "—" : s.value.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default LiveTestPanel;
```

- [ ] **Step 2: Test Live Test panel with groups**

In the browser:
1. Create a group "Pour" and assign a param and a table to it
2. Open Live Test panel — "Pour" section should appear with the param and table inside, collapsed/expanded by clicking the section header
3. Create a sub-group "Machine Pour" inside "Pour" and assign a param to it
4. Live Test should show "Pour" section with "Machine Pour" sub-section (indented) inside it
5. Click group headers to collapse/expand — other inputs should remain unaffected

- [ ] **Step 3: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx
git commit -m "feat: Live Test panel grouped collapsible sections"
```

---

## Self-Review

**Spec coverage check:**
- ✅ GroupDef data model with `id`, `label`, `parentGroupId?`, `memberIds[]` — Task 1
- ✅ `nodePositions` extended with `w?`, `h?` for group sizing — Task 1
- ✅ `groupDefs` persisted as JSON string in MongoDB — Task 1
- ✅ `GroupNode` with dashed border, `NodeResizer`, `onResizeEnd` callback — Task 2
- ✅ `buildNodes` adds group container nodes with `parentId` on members — Task 2
- ✅ Right-click → "Add Group" — Task 3
- ✅ Group delete un-parents all members, cleans up `groupDefs` — Task 3
- ✅ Group rename via InspectPanel — Task 3
- ✅ `handleNodeDragStop` uses `getIntersectingNodes` for drag-to-group — Task 4
- ✅ `assignNodeToGroup` / `removeNodeFromGroup` with abs↔rel position conversion — Task 4
- ✅ Nested groups in canvas via React Flow `parentId` cascade — Tasks 2 + 4
- ✅ Live Test panel: ungrouped first, then groups as collapsible sections — Task 5
- ✅ Sub-groups indented 12px per nesting level — Task 5
- ✅ Formula steps skipped in Live Test panel — Task 5
- ✅ Groups with no params/tables/sub-groups not rendered in Live Test — Task 5
- ✅ `deleteNodes` handles group IDs — Task 3

**Type consistency:**
- `GroupDef` exported from `canvasStorage.ts`, imported everywhere it's needed
- `createGroup`, `deleteGroup`, `assignNodeToGroup`, `removeNodeFromGroup`, `getAbsolutePosition` all exported from `canvasOps.ts`
- `onGroupResizeEnd(groupId: string, w: number, h: number)` threaded from `CanvasFlow` → `buildNodes` → `GroupNode.data.onResizeEnd`
- `"group"` added to the create-node type union throughout: `ContextMenuProps.onCreate`, `handleCreateNode` in `index.tsx`
- `NodeKind` union extended in `InspectPanel.tsx` with `"group"`

**No placeholders — all code is complete.**
