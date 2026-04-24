# Canvas Controllers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Controller nodes (Percentage, Toggle, Selector) to the Calculator Canvas that govern group activation in both the canvas and the Live Test panel.

**Architecture:** `ControllerDef` and `GroupActivation` live in `canvasStorage.ts` and are stored as a JSON string field `controllerDefs` on the server — identical pattern to `groupDefs`. Controller nodes appear on the canvas like params; group activation is authored in the InspectPanel (group selects which controller activates it and under what condition). The Live Test panel renders controller widgets before the groups they govern, evaluates `isGroupActive` reactively, and collapses+greys inactive groups.

**Tech Stack:** TypeScript, React, Chakra UI, React Flow v11, typegoose/Type-GraphQL (server), expr-eval (formula evaluator)

---

## File Map

| File | Change |
|---|---|
| `server/src/models/RateBuildupTemplate/schema/index.ts` | Add `controllerDefs` string field |
| `server/src/graphql/resolvers/rateBuildupTemplate/mutations.ts` | Add `controllerDefs` to input type + save logic |
| `client/src/graphql/fragments/RateBuildupTemplate_Full.graphql` | Add `controllerDefs` field |
| `client/src/components/TenderPricing/calculators/evaluate.ts` | Add optional `controllerValues` param to both eval functions |
| `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts` | Add `ControllerDef`, `GroupActivation` types; update `GroupDef`; add `isGroupActive`; update ser/de |
| `client/src/components/pages/developer/CalculatorCanvas/canvasOps.ts` | Add `createController`, `deleteController`; update `deleteNodes` |
| `client/src/components/pages/developer/CalculatorCanvas/nodeTypes.tsx` | Add `ControllerNode` + export |
| `client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx` | Add controllers to `buildNodes`, context menu, `labelMap` |
| `client/src/components/pages/developer/CalculatorCanvas/index.tsx` | Add `createController` to `handleCreateNode`; pass controller defaults to `stepDebug` |
| `client/src/components/pages/developer/CalculatorCanvas/InspectPanel.tsx` | Add `ControllerEdit`, `GroupActivationEdit`; update `detectKind` + `availableVars` |
| `client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx` | Add `controllers` state, widgets, `isGroupActive` evaluation, inactive group rendering |

---

## Task 1: Server field + GraphQL + codegen

**Files:**
- Modify: `server/src/models/RateBuildupTemplate/schema/index.ts`
- Modify: `server/src/graphql/resolvers/rateBuildupTemplate/mutations.ts`
- Modify: `client/src/graphql/fragments/RateBuildupTemplate_Full.graphql`

- [ ] **Step 1: Add `controllerDefs` to the Mongoose schema**

In `server/src/models/RateBuildupTemplate/schema/index.ts`, add after the `groupDefs` field:

```typescript
  @Field()
  @prop({ required: true, default: '[]' })
  public controllerDefs!: string;
```

- [ ] **Step 2: Add `controllerDefs` to the GraphQL input type and save logic**

In `server/src/graphql/resolvers/rateBuildupTemplate/mutations.ts`:

Add to `SaveRateBuildupTemplateData`:
```typescript
  /** JSON-serialized ControllerDef[] */
  @Field() public controllerDefs!: string;
```

Add to the `Object.assign(existing, {...})` block in `save`:
```typescript
      controllerDefs: data.controllerDefs,
```

Add to the `new RateBuildupTemplate({...})` block:
```typescript
      controllerDefs: data.controllerDefs,
```

- [ ] **Step 3: Add `controllerDefs` to the GraphQL fragment**

In `client/src/graphql/fragments/RateBuildupTemplate_Full.graphql`, add after `groupDefs`:
```graphql
  controllerDefs
```

- [ ] **Step 4: Regenerate GraphQL types**

```bash
cd client && npm run codegen
```

Expected: `client/src/generated/graphql.tsx` regenerated with `controllerDefs` in `RateBuildupTemplateFullSnippetFragment` and `SaveRateBuildupTemplateMutationVariables`.

- [ ] **Step 5: Commit**

```bash
git add server/src/models/RateBuildupTemplate/schema/index.ts \
        server/src/graphql/resolvers/rateBuildupTemplate/mutations.ts \
        client/src/graphql/fragments/RateBuildupTemplate_Full.graphql \
        client/src/generated/graphql.tsx
git commit -m "feat: add controllerDefs JSON field to RateBuildupTemplate schema + GraphQL"
```

---

## Task 2: Data model — `canvasStorage.ts`

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts`

- [ ] **Step 1: Add `ControllerDef`, `GroupActivation`, update `GroupDef`**

After the existing `GroupDef` interface, add:

```typescript
export interface GroupActivation {
  controllerId: string;
  /** Percentage / Toggle: simple comparison, e.g. "> 0", "< 1", "=== 1" */
  condition?: string;
  /** Selector only: which option ID activates this group */
  optionId?: string;
}

export interface ControllerOption {
  id: string;
  label: string;
}

export interface ControllerDef {
  id: string;
  label: string;
  type: "percentage" | "toggle" | "selector";
  /** Percentage: 0–1 number. Toggle: boolean. Absent for selector. */
  defaultValue?: number | boolean;
  /** Selector only */
  options?: ControllerOption[];
  /** Selector only: option IDs selected by default */
  defaultSelected?: string[];
}
```

Update `GroupDef` to add `activation`:
```typescript
export interface GroupDef {
  id: string;
  label: string;
  parentGroupId?: string;
  memberIds: string[];
  activation?: GroupActivation;   // omitted = always active
}
```

- [ ] **Step 2: Add `controllerDefs` to `CanvasDocument`**

```typescript
export interface CanvasDocument {
  // ...existing fields...
  groupDefs: GroupDef[];
  controllerDefs: ControllerDef[];  // add this line
}
```

- [ ] **Step 3: Add `isGroupActive` utility**

After the interfaces, add:

```typescript
/**
 * Evaluate whether a group is active given the current controller values.
 * Returns true if the group has no activation condition (always active).
 * controllers: keyed by controllerId; values are number (percentage), boolean (toggle),
 *              or string[] (selector selected option IDs).
 */
export function isGroupActive(
  group: GroupDef,
  doc: CanvasDocument,
  controllers: Record<string, number | boolean | string[]>
): boolean {
  const { activation } = group;
  if (!activation) return true;
  const ctrl = doc.controllerDefs.find((c) => c.id === activation.controllerId);
  if (!ctrl) return true; // controller deleted — treat as always active

  if (ctrl.type === "selector") {
    const selected = (controllers[activation.controllerId] as string[] | undefined)
      ?? ctrl.defaultSelected ?? [];
    return activation.optionId ? selected.includes(activation.optionId) : true;
  }

  // percentage or toggle → numeric comparison
  const raw = controllers[activation.controllerId];
  const numVal =
    raw === undefined
      ? ctrl.type === "toggle"
        ? (ctrl.defaultValue ? 1 : 0)
        : (typeof ctrl.defaultValue === "number" ? ctrl.defaultValue : 0)
      : typeof raw === "boolean"
      ? raw ? 1 : 0
      : (raw as number);

  if (!activation.condition) return true;
  const m = activation.condition.trim().match(/^([><=!]{1,3})\s*(-?[\d.]+)$/);
  if (!m) return true;
  const rhs = parseFloat(m[2]);
  switch (m[1]) {
    case ">":   return numVal > rhs;
    case ">=":  return numVal >= rhs;
    case "<":   return numVal < rhs;
    case "<=":  return numVal <= rhs;
    case "===": case "==": return numVal === rhs;
    case "!==": case "!=": return numVal !== rhs;
    default:    return true;
  }
}
```

- [ ] **Step 4: Update `fragmentToDoc` to parse `controllerDefs`**

```typescript
function fragmentToDoc(f: RateBuildupTemplateFullSnippetFragment): CanvasDocument {
  // ...existing parsing...
  let controllerDefs: ControllerDef[] = [];
  try { controllerDefs = JSON.parse(f.controllerDefs ?? '[]'); } catch { /* ignore */ }
  return {
    // ...existing fields...
    groupDefs,
    controllerDefs,
  };
}
```

- [ ] **Step 5: Update `docToVariables` to serialise `controllerDefs`**

```typescript
function docToVariables(doc: CanvasDocument, idRemap: Map<string, string>) {
  // ...existing code...
  return {
    data: {
      // ...existing fields...
      groupDefs: JSON.stringify(doc.groupDefs),
      controllerDefs: JSON.stringify(doc.controllerDefs),
    },
  };
}
```

- [ ] **Step 6: Update `blankDocument` to include `controllerDefs: []`**

```typescript
function blankDocument(): CanvasDocument {
  return {
    // ...existing fields...
    groupDefs: [],
    controllerDefs: [],
  };
}
```

- [ ] **Step 7: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/canvasStorage.ts
git commit -m "feat: add ControllerDef types, GroupActivation, isGroupActive to canvasStorage"
```

---

## Task 3: Formula evaluation — `evaluate.ts`

**Files:**
- Modify: `client/src/components/TenderPricing/calculators/evaluate.ts`

- [ ] **Step 1: Add `controllerValues` to `evaluateTemplate`**

Change the signature and add injection after the params loop:

```typescript
export function evaluateTemplate(
  template: CalculatorTemplate,
  inputs: CalculatorInputs,
  quantity: number,
  controllerValues?: Record<string, number>   // add this param
): CalculatorResult {
  const ctx: Record<string, number> = { quantity };

  for (const p of template.parameterDefs) {
    ctx[p.id] = inputs.params[p.id] ?? p.defaultValue;
  }

  for (const t of template.tableDefs) {
    ctx[`${t.id}RatePerHr`] = (inputs.tables[t.id] ?? []).reduce(
      (s, r) => s + r.qty * r.ratePerHour, 0
    );
  }

  // Inject controller values (percentage/toggle) — formula steps may reference them by ID
  for (const [id, val] of Object.entries(controllerValues ?? {})) {
    ctx[id] = val;
  }

  // rest of function unchanged...
```

- [ ] **Step 2: Add `controllerValues` to `debugEvaluateTemplate`**

```typescript
export function debugEvaluateTemplate(
  template: CalculatorTemplate,
  inputs: CalculatorInputs,
  quantity: number,
  controllerValues?: Record<string, number>   // add this param
): StepDebugInfo[] {
  const ctx: Record<string, number> = { quantity };

  for (const p of template.parameterDefs) {
    ctx[p.id] = inputs.params[p.id] ?? p.defaultValue;
  }

  for (const t of template.tableDefs) {
    ctx[`${t.id}RatePerHr`] = (inputs.tables[t.id] ?? []).reduce(
      (s, r) => s + r.qty * r.ratePerHour, 0
    );
  }

  // Inject controller values
  for (const [id, val] of Object.entries(controllerValues ?? {})) {
    ctx[id] = val;
  }

  // rest of function unchanged...
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/TenderPricing/calculators/evaluate.ts
git commit -m "feat: inject controller values into formula evaluation context"
```

---

## Task 4: Canvas ops — `canvasOps.ts`

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/canvasOps.ts`

- [ ] **Step 1: Import `ControllerDef` from canvasStorage**

```typescript
import { CanvasDocument, GroupDef, ControllerDef } from "./canvasStorage";
```

- [ ] **Step 2: Add `createController`**

After `createGroup`, add:

```typescript
/**
 * Create a new Controller node at the given canvas position.
 * Returns the updated doc and the new controller's ID.
 */
export function createController(
  doc: CanvasDocument,
  position: { x: number; y: number },
  type: "percentage" | "toggle" | "selector" = "percentage"
): { doc: CanvasDocument; newId: string } {
  const takenIds = new Set([
    ...doc.controllerDefs.map((c) => c.id),
    ...doc.groupDefs.map((g) => g.id),
    ...doc.formulaSteps.map((s) => s.id),
    ...doc.parameterDefs.map((p) => p.id),
    ...doc.tableDefs.map((t) => t.id),
    ...doc.tableDefs.map((t) => `${t.id}RatePerHr`),
    ...doc.breakdownDefs.map((b) => b.id),
    "quantity", "unitPrice",
  ]);
  const takenLabels = new Set(doc.controllerDefs.map((c) => c.label));
  const baseLabel = type === "percentage" ? "Percentage" : type === "toggle" ? "Toggle" : "Selector";
  const label = nextLabel(baseLabel, takenLabels);
  const id = nextSlugId(slugify(label), takenIds);

  const newController: ControllerDef = {
    id,
    label,
    type,
    ...(type === "percentage" ? { defaultValue: 0.5 } : {}),
    ...(type === "toggle" ? { defaultValue: false } : {}),
    ...(type === "selector" ? { options: [], defaultSelected: [] } : {}),
  };

  return {
    newId: id,
    doc: {
      ...doc,
      controllerDefs: [...doc.controllerDefs, newController],
      nodePositions: { ...doc.nodePositions, [id]: position },
    },
  };
}
```

- [ ] **Step 3: Add `deleteController`**

After `deleteGroup`, add:

```typescript
/**
 * Delete a controller. Clears `activation` from any groups that reference it.
 * Removes the ControllerDef and its nodePositions entry.
 */
export function deleteController(controllerId: string, doc: CanvasDocument): CanvasDocument {
  const newPositions = { ...doc.nodePositions };
  delete newPositions[controllerId];

  return {
    ...doc,
    controllerDefs: doc.controllerDefs.filter((c) => c.id !== controllerId),
    groupDefs: doc.groupDefs.map((g) =>
      g.activation?.controllerId === controllerId
        ? { ...g, activation: undefined }
        : g
    ),
    nodePositions: newPositions,
  };
}
```

- [ ] **Step 4: Update `deleteNodes` to handle controller deletions**

In `deleteNodes`, after the group deletion loop, add:

```typescript
  // Handle controller deletions
  for (const id of toDelete) {
    if (workingDoc.controllerDefs.some((c) => c.id === id)) {
      workingDoc = deleteController(id, workingDoc);
    }
  }
```

- [ ] **Step 5: Update `createNode` type signature**

The existing `createNode` type union does not need to change — controllers are created via the new `createController` function.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/canvasOps.ts
git commit -m "feat: add createController, deleteController; handle controller deletion in deleteNodes"
```

---

## Task 5: Controller canvas node — `nodeTypes.tsx`

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/nodeTypes.tsx`

- [ ] **Step 1: Add `ControllerNode` component**

Add after `QuantityNode` and before the KaTeX section:

```typescript
export const ControllerNode: React.FC<NodeProps> = ({ data, selected }) => {
  const isSelector = data.controllerType === "selector";
  const isToggle = data.controllerType === "toggle";

  return (
    <div style={{
      ...baseStyle,
      background: "#134e4a",
      border: `1.5px solid ${selected ? "#5eead4" : "#0d9488"}`,
      borderTop: `3px solid #0d9488`,
      boxShadow: selected ? "0 0 0 2px #0d948840, 0 4px 12px #00000060" : "0 2px 8px #00000050",
      minWidth: isSelector ? 180 : 160,
    }}>
      {/* Percentage and Toggle output to formula graph */}
      {!isSelector && (
        <Handle type="source" position={Position.Right} isConnectable={false}
          style={{ background: "#0d9488", border: "2px solid #134e4a", width: 10, height: 10 }} />
      )}
      <TypeBadge label={data.controllerType} color="#5eead4" />
      <div style={labelStyle}>{data.label}</div>

      {/* Percentage widget */}
      {data.controllerType === "percentage" && (
        <div style={{ ...valueStyle, color: "#99f6e4" }}>
          {((data.defaultValue as number ?? 0) * 100).toFixed(0)}%
        </div>
      )}

      {/* Toggle widget */}
      {isToggle && (
        <div style={{ ...valueStyle, color: "#99f6e4" }}>
          {data.defaultValue ? "ON" : "OFF"}
        </div>
      )}

      {/* Selector widget */}
      {isSelector && (
        <div style={{ marginTop: 4 }}>
          {(data.options as { id: string; label: string }[] ?? []).map((opt) => (
            <div key={opt.id} style={{
              fontSize: 10,
              color: (data.defaultSelected as string[] ?? []).includes(opt.id) ? "#5eead4" : "#64748b",
              fontFamily: "monospace",
              lineHeight: "1.6",
            }}>
              {(data.defaultSelected as string[] ?? []).includes(opt.id) ? "☑" : "☐"} {opt.label}
            </div>
          ))}
          {(data.options as { id: string; label: string }[] ?? []).length === 0 && (
            <div style={{ ...slugStyle, color: "#0f766e", fontStyle: "italic" }}>no options</div>
          )}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Add `controller` to `nodeTypes` export**

```typescript
export const nodeTypes = {
  param: ParamNode,
  table: TableNode,
  quantity: QuantityNode,
  formula: FormulaNode,
  breakdown: BreakdownNode,
  priceOutput: OutputNode,
  group: GroupNode,
  controller: ControllerNode,   // add this
};
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/nodeTypes.tsx
git commit -m "feat: add ControllerNode (percentage/toggle/selector) to canvas node types"
```

---

## Task 6: Canvas integration — `CanvasFlow.tsx` + `index.tsx`

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx`
- Modify: `client/src/components/pages/developer/CalculatorCanvas/index.tsx`

- [ ] **Step 1: Add `createController` to `CanvasFlow.tsx` imports**

```typescript
import {
  ClipboardPayload, SINGLETONS,
  copyNodes, pasteNodes, deleteNodes, createNode, createGroup, createController,
  assignNodeToGroup, removeNodeFromGroup,
} from "./canvasOps";
```

- [ ] **Step 2: Add controllers to `buildNodes`**

In the `buildNodes` function, after the group container loop and before the param loop, add:

```typescript
  // Controller nodes
  for (const c of doc.controllerDefs) {
    nodes.push(makeNode(c.id, "controller", {
      id: c.id,
      label: c.label,
      controllerType: c.type,
      defaultValue: c.defaultValue,
      defaultSelected: c.defaultSelected,
      options: c.options,
    }));
  }
```

- [ ] **Step 3: Add controller IDs to `labelMap` in `buildNodes`**

After the existing `labelMap` entries, add:

```typescript
  for (const c of doc.controllerDefs) labelMap[c.id] = c.label;
```

- [ ] **Step 4: Extend `onCreateNode` prop type in `CanvasFlow.tsx`**

In the `Props` interface, change:

```typescript
  onCreateNode: (type: "formula" | "param" | "table" | "breakdown" | "group" | "controller", position: { x: number; y: number }) => void;
```

- [ ] **Step 5: Add "Add Controller" to the context menu**

In the canvas context menu map, change the type array to include `"controller"`:

```typescript
{(["formula", "param", "table", "breakdown", "group", "controller"] as const).map((type) => (
  <div
    key={type}
    style={MENU_ITEM}
    onMouseDown={(e) => {
      e.stopPropagation();
      onCreate(type, menu.flowPos);
      onDismiss();
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
  >
    Add {
      type === "formula" ? "Formula Step" :
      type === "param" ? "Parameter" :
      type === "table" ? "Rate Table" :
      type === "breakdown" ? "Summary" :
      type === "group" ? "Group" :
      "Controller"
    }
  </div>
))}
```

- [ ] **Step 6: Update `index.tsx` — add `createController` import**

```typescript
import { ClipboardPayload, copyNodes, pasteNodes, deleteNodes, createNode, createGroup, createController } from "./canvasOps";
```

- [ ] **Step 7: Update `handleCreateNode` in `index.tsx`**

```typescript
  const handleCreateNode = useCallback(
    (type: "formula" | "param" | "table" | "breakdown" | "group" | "controller", position: { x: number; y: number }) => {
      if (!activeDoc) return;
      if (type === "group") {
        const { doc: newDoc, newId } = createGroup(activeDoc, position);
        saveDocument(newDoc);
        setSelectedNodeId(newId);
      } else if (type === "controller") {
        const { doc: newDoc, newId } = createController(activeDoc, position);
        saveDocument(newDoc);
        setSelectedNodeId(newId);
      } else {
        const { doc: newDoc, newId } = createNode(type, activeDoc, position);
        saveDocument(newDoc);
        setSelectedNodeId(newId);
      }
    },
    [activeDoc, saveDocument]
  );
```

- [ ] **Step 8: Update `stepDebug` in `index.tsx` to pass controller defaults**

```typescript
  const controllerDefaults = useMemo(() => {
    if (!activeDoc) return {};
    const result: Record<string, number> = {};
    for (const c of activeDoc.controllerDefs) {
      if (c.type === "percentage") result[c.id] = typeof c.defaultValue === "number" ? c.defaultValue : 0;
      if (c.type === "toggle") result[c.id] = c.defaultValue ? 1 : 0;
    }
    return result;
  }, [activeDoc]);

  const stepDebug = useMemo(
    () =>
      activeDoc
        ? debugEvaluateTemplate(activeDoc, activeDoc.defaultInputs, quantity, controllerDefaults)
        : [],
    [activeDoc, quantity, controllerDefaults]
  );
```

- [ ] **Step 9: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/CanvasFlow.tsx \
        client/src/components/pages/developer/CalculatorCanvas/index.tsx
git commit -m "feat: wire controller nodes into canvas — buildNodes, context menu, stepDebug"
```

---

## Task 7: Inspect panel — `InspectPanel.tsx`

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/InspectPanel.tsx`

- [ ] **Step 1: Import `ControllerDef` and `ControllerOption`**

```typescript
import { CanvasDocument, GroupDef, ControllerDef, ControllerOption } from "./canvasStorage";
```

- [ ] **Step 2: Update `detectKind` to handle `controller`**

```typescript
type NodeKind = "param" | "table" | "quantity" | "formula" | "breakdown" | "output" | "group" | "controller" | "unknown";

const KIND_COLORS: Record<NodeKind, string> = {
  param: "blue", table: "green", quantity: "yellow",
  formula: "purple", breakdown: "teal", output: "cyan",
  group: "purple", controller: "teal", unknown: "gray",
};
const KIND_LABELS: Record<NodeKind, string> = {
  param: "Parameter", table: "Table Aggregate", quantity: "Quantity (test input)",
  formula: "Formula Step", breakdown: "Summary", output: "Unit Price Output",
  group: "Group", controller: "Controller", unknown: "Unknown",
};

function detectKind(nodeId: string, template: CanvasDocument): NodeKind {
  if (nodeId === "quantity") return "quantity";
  if (nodeId === "unitPrice") return "output";
  if (template.parameterDefs.some((p) => p.id === nodeId)) return "param";
  if (template.tableDefs.some((t) => `${t.id}RatePerHr` === nodeId)) return "table";
  if (template.formulaSteps.some((s) => s.id === nodeId)) return "formula";
  if (template.breakdownDefs.some((b) => b.id === nodeId)) return "breakdown";
  if (template.groupDefs.some((g) => g.id === nodeId)) return "group";
  if ((template.controllerDefs ?? []).some((c) => c.id === nodeId)) return "controller";
  return "unknown";
}
```

- [ ] **Step 3: Update `availableVars` in `FormulaEdit` to include controller IDs**

In `FormulaEdit`, after the existing `availableVars` array:

```typescript
  const availableVars = [
    ...doc.parameterDefs.map((p) => p.id),
    ...doc.tableDefs.map((t) => `${t.id}RatePerHr`),
    "quantity",
    ...doc.formulaSteps.filter((s) => s.id !== nodeId).map((s) => s.id),
    // Percentage and Toggle controllers output a numeric value usable in formulas
    ...(doc.controllerDefs ?? [])
      .filter((c) => c.type === "percentage" || c.type === "toggle")
      .map((c) => c.id),
  ];
```

Also add controller labels to `labelMap` in `FormulaEdit`:

```typescript
  const labelMap: Record<string, string> = useMemo(() => {
    const m: Record<string, string> = { quantity: "Quantity" };
    for (const p of doc.parameterDefs) m[p.id] = p.label;
    for (const t of doc.tableDefs) m[`${t.id}RatePerHr`] = t.label;
    for (const s of doc.formulaSteps) m[s.id] = s.label ?? s.id;
    for (const c of (doc.controllerDefs ?? [])) m[c.id] = c.label;
    return m;
  }, [doc]);
```

- [ ] **Step 4: Add `ControllerEdit` component**

Add before the `GroupEdit` component:

```typescript
const ControllerEdit: React.FC<{
  doc: CanvasDocument;
  nodeId: string;
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}> = ({ doc, nodeId, onUpdateDoc }) => {
  const ctrl = (doc.controllerDefs ?? []).find((c) => c.id === nodeId)!;
  const [newOptionLabel, setNewOptionLabel] = useState("");

  const updateCtrl = (updates: Partial<ControllerDef>) => {
    onUpdateDoc({
      ...doc,
      controllerDefs: doc.controllerDefs.map((c) =>
        c.id === nodeId ? { ...c, ...updates } : c
      ),
    });
  };

  return (
    <>
      <EditField
        label="Label"
        value={ctrl.label}
        onBlur={(v) => updateCtrl({ label: v })}
      />

      <Box mb={3}>
        <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
          Type
        </Text>
        <Text fontSize="sm" fontFamily="mono" color="teal.600">{ctrl.type}</Text>
      </Box>

      {/* Percentage default value */}
      {ctrl.type === "percentage" && (
        <EditField
          label="Default Value (0–1)"
          value={String(ctrl.defaultValue ?? 0.5)}
          type="number"
          mono
          onBlur={(v) => updateCtrl({ defaultValue: Math.min(1, Math.max(0, parseFloat(v) || 0)) })}
        />
      )}

      {/* Toggle default */}
      {ctrl.type === "toggle" && (
        <Box mb={3}>
          <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Default
          </Text>
          <Select
            size="sm"
            value={ctrl.defaultValue ? "true" : "false"}
            onChange={(e) => updateCtrl({ defaultValue: e.target.value === "true" })}
          >
            <option value="false">OFF (false)</option>
            <option value="true">ON (true)</option>
          </Select>
        </Box>
      )}

      {/* Selector options */}
      {ctrl.type === "selector" && (
        <Box mb={3}>
          <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={2}>
            Options
          </Text>
          {(ctrl.options ?? []).map((opt) => (
            <Flex key={opt.id} align="center" gap={1} mb={1}>
              <Input
                size="xs"
                flex={1}
                value={opt.label}
                onChange={(e) => {
                  const newOptions = (ctrl.options ?? []).map((o) =>
                    o.id === opt.id ? { ...o, label: e.target.value } : o
                  );
                  updateCtrl({ options: newOptions });
                }}
              />
              <IconButton
                aria-label="Remove option"
                icon={<span style={{ fontSize: 10 }}>✕</span>}
                size="xs"
                variant="ghost"
                colorScheme="red"
                minW="18px"
                h="18px"
                onClick={() => {
                  const newOptions = (ctrl.options ?? []).filter((o) => o.id !== opt.id);
                  const newSelected = (ctrl.defaultSelected ?? []).filter((id) => id !== opt.id);
                  updateCtrl({ options: newOptions, defaultSelected: newSelected });
                }}
              />
            </Flex>
          ))}
          <Flex gap={1} mt={1}>
            <Input
              size="xs"
              flex={1}
              placeholder="New option label"
              value={newOptionLabel}
              onChange={(e) => setNewOptionLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newOptionLabel.trim()) {
                  const newOpt: ControllerOption = {
                    id: slugify(newOptionLabel) + "_" + Date.now(),
                    label: newOptionLabel.trim(),
                  };
                  updateCtrl({ options: [...(ctrl.options ?? []), newOpt] });
                  setNewOptionLabel("");
                }
              }}
            />
            <Button
              size="xs"
              colorScheme="teal"
              variant="ghost"
              onClick={() => {
                if (!newOptionLabel.trim()) return;
                const newOpt: ControllerOption = {
                  id: slugify(newOptionLabel) + "_" + Date.now(),
                  label: newOptionLabel.trim(),
                };
                updateCtrl({ options: [...(ctrl.options ?? []), newOpt] });
                setNewOptionLabel("");
              }}
            >
              Add
            </Button>
          </Flex>

          {/* Default selected */}
          {(ctrl.options ?? []).length > 0 && (
            <Box mt={3}>
              <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
                Default Selected
              </Text>
              {(ctrl.options ?? []).map((opt) => {
                const isSelected = (ctrl.defaultSelected ?? []).includes(opt.id);
                return (
                  <Flex key={opt.id} align="center" gap={2} mb={1} cursor="pointer"
                    onClick={() => {
                      const newSelected = isSelected
                        ? (ctrl.defaultSelected ?? []).filter((id) => id !== opt.id)
                        : [...(ctrl.defaultSelected ?? []), opt.id];
                      updateCtrl({ defaultSelected: newSelected });
                    }}
                  >
                    <Box w={3} h={3} border="1px solid" borderColor={isSelected ? "teal.400" : "gray.300"}
                      bg={isSelected ? "teal.400" : "transparent"} rounded="sm" />
                    <Text fontSize="xs" color="gray.600">{opt.label}</Text>
                  </Flex>
                );
              })}
            </Box>
          )}
        </Box>
      )}
    </>
  );
};
```

- [ ] **Step 5: Update `GroupEdit` to include `GroupActivationEdit`**

Replace the existing `GroupEdit` component:

```typescript
const GroupEdit: React.FC<{
  doc: CanvasDocument;
  nodeId: string;
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}> = ({ doc, nodeId, onUpdateDoc }) => {
  const group = doc.groupDefs.find((g) => g.id === nodeId)!;
  const controllers = doc.controllerDefs ?? [];

  const saveLabel = (newLabel: string) => {
    onUpdateDoc({
      ...doc,
      groupDefs: doc.groupDefs.map((g) => g.id === nodeId ? { ...g, label: newLabel } : g),
    });
  };

  const setActivation = (activation: typeof group.activation) => {
    onUpdateDoc({
      ...doc,
      groupDefs: doc.groupDefs.map((g) => g.id === nodeId ? { ...g, activation } : g),
    });
  };

  const ctrl = group.activation
    ? controllers.find((c) => c.id === group.activation!.controllerId)
    : undefined;

  return (
    <>
      <EditField label="Label" value={group.label} onBlur={saveLabel} />

      <Divider mb={3} />

      <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={2}>
        Controlled By
      </Text>

      <Box mb={3}>
        <Text fontSize="10px" color="gray.400" mb={1}>Controller</Text>
        <Select
          size="sm"
          value={group.activation?.controllerId ?? ""}
          onChange={(e) => {
            if (!e.target.value) {
              setActivation(undefined);
            } else {
              setActivation({ controllerId: e.target.value });
            }
          }}
        >
          <option value="">— None (always active) —</option>
          {controllers.map((c) => (
            <option key={c.id} value={c.id}>{c.label} ({c.type})</option>
          ))}
        </Select>
      </Box>

      {/* Condition field for percentage/toggle */}
      {ctrl && (ctrl.type === "percentage" || ctrl.type === "toggle") && (
        <Box mb={3}>
          <Text fontSize="10px" color="gray.400" mb={1}>
            Active when (e.g. {ctrl.type === "percentage" ? "> 0" : "=== 1"})
          </Text>
          <Input
            size="sm"
            fontFamily="mono"
            placeholder={ctrl.type === "percentage" ? "> 0" : "=== 1"}
            value={group.activation?.condition ?? ""}
            onChange={(e) =>
              setActivation({ ...group.activation!, condition: e.target.value })
            }
          />
        </Box>
      )}

      {/* Option selector for selector type */}
      {ctrl && ctrl.type === "selector" && (
        <Box mb={3}>
          <Text fontSize="10px" color="gray.400" mb={1}>Active when option</Text>
          <Select
            size="sm"
            value={group.activation?.optionId ?? ""}
            onChange={(e) =>
              setActivation({ ...group.activation!, optionId: e.target.value || undefined })
            }
          >
            <option value="">— Pick option —</option>
            {(ctrl.options ?? []).map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </Select>
        </Box>
      )}
    </>
  );
};
```

- [ ] **Step 6: Add `ControllerEdit` to main panel render**

In `InspectPanel`, after `{kind === "group" && ...}`, add:

```typescript
      {kind === "controller" && (
        <ControllerEdit doc={template} nodeId={selectedNodeId} onUpdateDoc={onUpdateDoc} />
      )}
```

Also suppress the "Receives from / Feeds into" section for controllers (similar to groups):

```typescript
      {kind !== "group" && kind !== "controller" && (
        <>
          <Divider mb={4} />
          {/* ...existing receives/feeds section... */}
        </>
      )}
```

- [ ] **Step 7: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/InspectPanel.tsx
git commit -m "feat: add ControllerEdit, GroupActivationEdit, controller kind detection to InspectPanel"
```

---

## Task 8: Live Test panel — `LiveTestPanel.tsx`

**Files:**
- Modify: `client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx`

- [ ] **Step 1: Import `ControllerDef`, `isGroupActive`**

```typescript
import { CanvasDocument, GroupDef, ControllerDef, isGroupActive } from "./canvasStorage";
```

- [ ] **Step 2: Add `controllers` state and reset on doc change**

In the `LiveTestPanel` component, after the `tables` state:

```typescript
  const [controllers, setControllers] = useState<Record<string, number | boolean | string[]>>(
    () => buildControllerDefaults(doc)
  );
```

Add this helper outside the component (above `LiveTestPanel`):

```typescript
function buildControllerDefaults(doc: CanvasDocument): Record<string, number | boolean | string[]> {
  return Object.fromEntries(
    (doc.controllerDefs ?? []).map((c) => [
      c.id,
      c.type === "selector"
        ? (c.defaultSelected ?? [])
        : c.type === "toggle"
        ? (c.defaultValue as boolean ?? false)
        : (c.defaultValue as number ?? 0),
    ])
  );
}
```

In the `useEffect` that resets on `doc.id` change, add:

```typescript
    setControllers(buildControllerDefaults(doc));
```

- [ ] **Step 3: Compute `controllerValues` for formula evaluation**

After the `inputs` memo:

```typescript
  const controllerValues = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    for (const c of (doc.controllerDefs ?? [])) {
      if (c.type === "percentage") result[c.id] = controllers[c.id] as number ?? 0;
      if (c.type === "toggle") result[c.id] = (controllers[c.id] as boolean) ? 1 : 0;
    }
    return result;
  }, [doc.controllerDefs, controllers]);
```

Update `result` and `stepDebug` to pass `controllerValues`:

```typescript
  const result = useMemo(
    () => evaluateTemplate(doc, inputs, quantity, controllerValues),
    [doc, inputs, quantity, controllerValues]
  );
  const stepDebug = useMemo(
    () => debugEvaluateTemplate(doc, inputs, quantity, controllerValues),
    [doc, inputs, quantity, controllerValues]
  );
```

- [ ] **Step 4: Add `ControllerWidget` component**

Add above `GroupSection`:

```typescript
const ControllerWidget: React.FC<{
  ctrl: ControllerDef;
  value: number | boolean | string[];
  onChange: (id: string, v: number | boolean | string[]) => void;
}> = ({ ctrl, value, onChange }) => {
  if (ctrl.type === "percentage") {
    const pct = (value as number) * 100;
    return (
      <Flex align="center" gap={2} mb={3}>
        <Text fontSize="sm" color="gray.700" flex={1}>
          {ctrl.label}
          <Text as="span" fontSize="xs" color="gray.400"> (%)</Text>
        </Text>
        <Input
          size="sm"
          type="number"
          w="80px"
          min={0}
          max={100}
          textAlign="right"
          value={pct}
          onChange={(e) => onChange(ctrl.id, Math.min(1, Math.max(0, (parseFloat(e.target.value) || 0) / 100)))}
        />
      </Flex>
    );
  }

  if (ctrl.type === "toggle") {
    return (
      <Flex align="center" gap={2} mb={3} cursor="pointer"
        onClick={() => onChange(ctrl.id, !(value as boolean))}
      >
        <Box
          w={4} h={4}
          border="1.5px solid"
          borderColor={(value as boolean) ? "teal.400" : "gray.300"}
          bg={(value as boolean) ? "teal.400" : "transparent"}
          rounded="sm"
        />
        <Text fontSize="sm" color="gray.700">{ctrl.label}</Text>
      </Flex>
    );
  }

  // selector
  const selected = value as string[];
  return (
    <Box mb={3}>
      <Text fontSize="xs" fontWeight="semibold" color="teal.600" textTransform="uppercase" letterSpacing="wide" mb={1}>
        {ctrl.label}
      </Text>
      {(ctrl.options ?? []).map((opt) => {
        const isSelected = selected.includes(opt.id);
        return (
          <Flex key={opt.id} align="center" gap={2} mb={1} cursor="pointer"
            onClick={() => {
              const next = isSelected
                ? selected.filter((id) => id !== opt.id)
                : [...selected, opt.id];
              onChange(ctrl.id, next);
            }}
          >
            <Box
              w={3.5} h={3.5}
              border="1px solid"
              borderColor={isSelected ? "teal.400" : "gray.300"}
              bg={isSelected ? "teal.400" : "transparent"}
              rounded="sm"
              flexShrink={0}
            />
            <Text fontSize="sm" color="gray.700">{opt.label}</Text>
          </Flex>
        );
      })}
    </Box>
  );
};
```

- [ ] **Step 5: Update `GroupSection` to accept `controllers` and render inactive state**

Update `GroupSectionProps` to add `controllers`:

```typescript
interface GroupSectionProps {
  group: GroupDef;
  depth: number;
  doc: CanvasDocument;
  params: Record<string, number>;
  tables: Record<string, RateEntry[]>;
  controllers: Record<string, number | boolean | string[]>;
  onParamChange: (id: string, v: number) => void;
  onUpdateRow: (tableId: string, rowId: string, field: keyof RateEntry, value: string | number) => void;
  onAddRow: (tableId: string) => void;
  onRemoveRow: (tableId: string, rowId: string) => void;
}
```

Update `GroupSection` component:

```typescript
const GroupSection: React.FC<GroupSectionProps> = ({
  group, depth, doc, params, tables, controllers, onParamChange, onUpdateRow, onAddRow, onRemoveRow,
}) => {
  const active = isGroupActive(group, doc, controllers);
  const [open, setOpen] = useState(true);

  // Auto-collapse when group becomes inactive
  useEffect(() => {
    if (!active) setOpen(false);
  }, [active]);

  // Collect visible members: controllers in group, params, tables, sub-groups (skip formula steps)
  const controllerIds = group.memberIds.filter((id) => (doc.controllerDefs ?? []).some((c) => c.id === id));
  const paramIds = group.memberIds.filter((id) => doc.parameterDefs.some((p) => p.id === id));
  const tableIds = group.memberIds
    .filter((id) => id.endsWith("RatePerHr") && doc.tableDefs.some((t) => `${t.id}RatePerHr` === id))
    .map((id) => id.replace(/RatePerHr$/, ""));
  const subGroupIds = group.memberIds.filter((id) => doc.groupDefs.some((g) => g.id === id));

  const hasVisibleContent = controllerIds.length > 0 || paramIds.length > 0 || tableIds.length > 0 || subGroupIds.length > 0;
  if (!hasVisibleContent) return null;

  const headingColorVal = active
    ? (depth === 0 ? "#4338ca" : "#8b5cf6")
    : "#94a3b8";
  const indent = depth * 12;

  return (
    <Box mb={3} ml={`${indent}px`} opacity={active ? 1 : 0.5}>
      {/* Section heading */}
      <Flex
        align="center"
        gap={1}
        mb={open && active ? 2 : 0}
        borderBottom={open && active ? "1px solid" : "none"}
        borderColor={depth === 0 ? "indigo.100" : "purple.100"}
        pb={open && active ? 1 : 0}
        cursor={active ? "pointer" : "default"}
        onClick={() => { if (active) setOpen((o) => !o); }}
        _hover={active ? { opacity: 0.8 } : {}}
      >
        <Box color={headingColorVal} fontSize="10px">
          {open && active ? <FiChevronDown /> : <FiChevronRight />}
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
        {!active && (
          <Text fontSize="9px" fontWeight="semibold" color="gray.400"
            bg="gray.100" px={1} py={0.5} rounded="sm" ml={1} textTransform="uppercase">
            inactive
          </Text>
        )}
      </Flex>

      {open && active && (
        <>
          {/* Controllers in this group */}
          {controllerIds.map((id) => {
            const ctrl = (doc.controllerDefs ?? []).find((c) => c.id === id)!;
            return (
              <ControllerWidget
                key={id}
                ctrl={ctrl}
                value={controllers[id] ?? (ctrl.type === "selector" ? [] : ctrl.type === "toggle" ? false : 0)}
                onChange={(cid, v) => setControllers((prev) => ({ ...prev, [cid]: v }))}
              />
            );
          })}

          {/* Params in this group */}
          {paramIds.length > 0 && (
            <Grid templateColumns="1fr 80px" gap={2} alignItems="center" mb={2}>
              {paramIds.map((id) => (
                <ParamRow key={id} paramId={id} doc={doc} value={params[id]} onChange={onParamChange} />
              ))}
            </Grid>
          )}

          {/* Tables in this group */}
          {tableIds.map((id) => (
            <TableSection key={id} tableId={id} doc={doc} rows={tables[id] ?? []}
              onUpdateRow={onUpdateRow} onAddRow={onAddRow} onRemoveRow={onRemoveRow} />
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
                controllers={controllers}
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
```

Note: `setControllers` is used inside `GroupSection` but it's defined in the parent. Pass it as a prop:

Add `onControllerChange: (id: string, v: number | boolean | string[]) => void` to `GroupSectionProps` and use it instead of `setControllers` directly.

- [ ] **Step 6: Add ungrouped controller rendering and pass `controllers` down**

In `LiveTestPanel` render body, add before the ungrouped params section:

```typescript
        {/* Ungrouped controllers */}
        {ungroupedControllers.length > 0 && (
          <Box mb={4}>
            {ungroupedControllers.map((c) => (
              <ControllerWidget
                key={c.id}
                ctrl={c}
                value={controllers[c.id] ?? (c.type === "selector" ? [] : c.type === "toggle" ? false : 0)}
                onChange={(id, v) => setControllers((prev) => ({ ...prev, [id]: v }))}
              />
            ))}
          </Box>
        )}
```

Add `ungroupedControllers` to the `useMemo`:

```typescript
  const { ungroupedParams, ungroupedTables, topLevelGroups, ungroupedControllers } = useMemo(() => {
    const allMemberIds = new Set(doc.groupDefs.flatMap((g) => g.memberIds));
    return {
      ungroupedParams: doc.parameterDefs.filter((p) => !allMemberIds.has(p.id)),
      ungroupedTables: doc.tableDefs.filter((t) => !allMemberIds.has(`${t.id}RatePerHr`)),
      topLevelGroups: doc.groupDefs.filter((g) => !allMemberIds.has(g.id)),
      ungroupedControllers: (doc.controllerDefs ?? []).filter((c) => !allMemberIds.has(c.id)),
    };
  }, [doc]);
```

Update all `GroupSection` usages in the render to pass `controllers` and `onControllerChange`:

```typescript
        {topLevelGroups.map((g) => (
          <GroupSection
            key={g.id}
            group={g}
            depth={0}
            doc={doc}
            params={params}
            tables={tables}
            controllers={controllers}
            onParamChange={updateParam}
            onUpdateRow={updateRow}
            onAddRow={addRow}
            onRemoveRow={removeRow}
            onControllerChange={(id, v) => setControllers((prev) => ({ ...prev, [id]: v }))}
          />
        ))}
```

- [ ] **Step 7: Commit**

```bash
git add client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx
git commit -m "feat: add controller widgets, isGroupActive, inactive group rendering to LiveTestPanel"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `ControllerDef` with type/defaultValue/options/defaultSelected | Task 2 |
| `GroupActivation` with controllerId/condition/optionId | Task 2 |
| `isGroupActive` utility function | Task 2 |
| `controllerDefs` persisted as JSON string on server | Task 1 |
| Controller node on canvas (Percentage/Toggle/Selector visuals) | Task 5 |
| "Add Controller" in context menu | Task 6 |
| InspectPanel — ControllerEdit (label, type, defaultValue, options) | Task 7 |
| InspectPanel — GroupActivationEdit (controller dropdown, condition/optionId) | Task 7 |
| Controller IDs available as formula variables (Percentage/Toggle) | Task 7 (availableVars) |
| Controller values injected into formula evaluation | Task 3 |
| Controller widgets in Live Test panel (percentage input, toggle, checkboxes) | Task 8 |
| Inactive groups collapse and grey out | Task 8 |
| Inactive groups show "inactive" badge | Task 8 |
| Ungrouped controllers render before groups in Live Test panel | Task 8 |
| Grouped controllers render within their group section | Task 8 |
| deleteController clears group activations | Task 4 |
| Canvas warning for default leaving all groups inactive | **Not implemented** — deferred; not critical for MVP |

**Type consistency check:** `ControllerDef`, `GroupActivation`, `ControllerOption` defined once in `canvasStorage.ts` and imported everywhere. `isGroupActive` signature is consistent with how it's called in `LiveTestPanel.tsx`. The `controllerValues` param is `Record<string, number>` in `evaluate.ts` and computed as such in both `index.tsx` and `LiveTestPanel.tsx`.
