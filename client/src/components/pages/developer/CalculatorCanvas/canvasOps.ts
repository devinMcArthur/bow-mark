// client/src/components/pages/developer/CalculatorCanvas/canvasOps.ts
import { v4 as uuidv4 } from "uuid";
import { CanvasDocument, GroupDef, ControllerDef } from "./canvasStorage";
import {
  FormulaStep,
  ParameterDef,
  TableDef,
  BreakdownDef,
  RateEntry,
} from "../../../../components/TenderPricing/calculators/types";

// ─── Clipboard ────────────────────────────────────────────────────────────────

export interface ClipboardPayload {
  formulaSteps: FormulaStep[];
  parameterDefs: ParameterDef[];
  tableDefs: TableDef[];
  tableInputs: Record<string, RateEntry[]>;
  breakdownDefs: BreakdownDef[];
  // Original node positions from the source document (keyed by original IDs)
  positions: Record<string, { x: number; y: number }>;
}

function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

function rewriteFormula(formula: string, renameMap: Map<string, string>): string {
  return formula.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (m) => renameMap.get(m) ?? m);
}

// Resolve the full dependency subgraph for the given node IDs.
// Pulls in: all transitively-referenced formula steps, the params and table
// aggregates those steps reference, and any breakdown defs in the selection
// (plus their perUnit/subValue step deps).
export function copyNodes(selectedIds: string[], doc: CanvasDocument): ClipboardPayload {
  const formulaStepMap = new Map(doc.formulaSteps.map((s) => [s.id, s]));
  const paramMap = new Map(doc.parameterDefs.map((p) => [p.id, p]));
  const tableNodeToId = new Map(doc.tableDefs.map((t) => [`${t.id}RatePerHr`, t.id]));
  const tableDefMap = new Map(doc.tableDefs.map((t) => [t.id, t]));

  const collectedFormulaIds = new Set<string>();
  const collectedParamIds = new Set<string>();
  const collectedTableIds = new Set<string>();
  const collectedBreakdownIds = new Set<string>();
  const formulaQueue: string[] = [];

  const enqueueFormula = (id: string) => {
    if (!collectedFormulaIds.has(id) && formulaStepMap.has(id)) formulaQueue.push(id);
  };

  for (const id of selectedIds) {
    if (formulaStepMap.has(id)) enqueueFormula(id);
    if (paramMap.has(id)) collectedParamIds.add(id);
    if (tableNodeToId.has(id)) collectedTableIds.add(tableNodeToId.get(id)!);
    const bd = doc.breakdownDefs.find((b) => b.id === id);
    if (bd) {
      collectedBreakdownIds.add(id);
      (bd.items ?? []).forEach((item) => enqueueFormula(item.stepId));
    }
  }

  while (formulaQueue.length > 0) {
    const id = formulaQueue.shift()!;
    if (collectedFormulaIds.has(id)) continue;
    collectedFormulaIds.add(id);
    const step = formulaStepMap.get(id);
    if (!step) continue;
    for (const token of step.formula.split(/[^a-zA-Z0-9_]+/).filter(Boolean)) {
      enqueueFormula(token);
      if (paramMap.has(token)) collectedParamIds.add(token);
      if (tableNodeToId.has(token)) collectedTableIds.add(tableNodeToId.get(token)!);
    }
  }

  // Capture positions for all collected nodes (keyed by their canvas node IDs)
  const positions: Record<string, { x: number; y: number }> = {};
  for (const id of collectedFormulaIds) {
    if (doc.nodePositions[id]) positions[id] = doc.nodePositions[id];
  }
  for (const id of collectedParamIds) {
    if (doc.nodePositions[id]) positions[id] = doc.nodePositions[id];
  }
  for (const tId of collectedTableIds) {
    const nodeId = `${tId}RatePerHr`;
    if (doc.nodePositions[nodeId]) positions[nodeId] = doc.nodePositions[nodeId];
  }
  for (const id of collectedBreakdownIds) {
    if (doc.nodePositions[id]) positions[id] = doc.nodePositions[id];
  }

  return {
    formulaSteps: [...collectedFormulaIds].map((id) => formulaStepMap.get(id)!),
    parameterDefs: [...collectedParamIds].map((id) => paramMap.get(id)!),
    tableDefs: [...collectedTableIds].map((id) => tableDefMap.get(id)!),
    tableInputs: Object.fromEntries(
      [...collectedTableIds].map((id) => [id, doc.defaultInputs.tables[id] ?? []])
    ),
    breakdownDefs: [...collectedBreakdownIds].map((id) => doc.breakdownDefs.find((b) => b.id === id)!),
    positions,
  };
}

// Merge a clipboard payload into a document. IDs that conflict with existing
// ones are suffixed (_2, _3, …). Formula strings are rewritten to use the new IDs.
// The group is placed so its centroid lands at targetPos, preserving relative layout.
export function pasteNodes(
  payload: ClipboardPayload,
  doc: CanvasDocument,
  targetPos: { x: number; y: number }
): CanvasDocument {
  const takenIds = new Set([
    ...doc.parameterDefs.map((p) => p.id),
    ...doc.tableDefs.map((t) => t.id),
    ...doc.tableDefs.map((t) => `${t.id}RatePerHr`),
    ...doc.formulaSteps.map((s) => s.id),
    ...doc.breakdownDefs.map((b) => b.id),
    "quantity",
    "unitPrice",
  ]);

  const renameMap = new Map<string, string>();

  for (const p of payload.parameterDefs) {
    const newId = uniqueId(p.id, takenIds);
    renameMap.set(p.id, newId);
    takenIds.add(newId);
  }
  for (const t of payload.tableDefs) {
    const newId = uniqueId(t.id, takenIds);
    renameMap.set(t.id, newId);
    renameMap.set(`${t.id}RatePerHr`, `${newId}RatePerHr`);
    takenIds.add(newId);
    takenIds.add(`${newId}RatePerHr`);
  }
  for (const s of payload.formulaSteps) {
    const newId = uniqueId(s.id, takenIds);
    renameMap.set(s.id, newId);
    takenIds.add(newId);
  }
  for (const b of payload.breakdownDefs) {
    const newId = uniqueId(b.id, takenIds);
    renameMap.set(b.id, newId);
    takenIds.add(newId);
  }

  const newParams = payload.parameterDefs.map((p) => ({
    ...p,
    id: renameMap.get(p.id)!,
  }));
  const newTables = payload.tableDefs.map((t) => ({
    ...t,
    id: renameMap.get(t.id)!,
  }));
  const newSteps = payload.formulaSteps.map((s) => ({
    ...s,
    id: renameMap.get(s.id)!,
    formula: rewriteFormula(s.formula, renameMap),
  }));
  const newBreakdowns = payload.breakdownDefs.map((b) => ({
    ...b,
    id: renameMap.get(b.id)!,
    items: (b.items ?? []).map((item) => ({
      ...item,
      stepId: renameMap.get(item.stepId) ?? item.stepId,
    })),
  }));

  const newParamInputs = { ...doc.defaultInputs.params };
  for (const p of payload.parameterDefs) {
    newParamInputs[renameMap.get(p.id)!] = p.defaultValue;
  }
  const newTableInputs = { ...doc.defaultInputs.tables };
  for (const t of payload.tableDefs) {
    newTableInputs[renameMap.get(t.id)!] = payload.tableInputs[t.id] ?? [];
  }

  // Shift the group so its top-left corner lands at targetPos.
  const recordedPositions = Object.values(payload.positions);
  const topLeft = recordedPositions.length > 0
    ? {
        x: Math.min(...recordedPositions.map((p) => p.x)),
        y: Math.min(...recordedPositions.map((p) => p.y)),
      }
    : targetPos;
  const shift = { x: targetPos.x - topLeft.x, y: targetPos.y - topLeft.y };

  const newPositions = { ...doc.nodePositions };
  for (const [origId, newId] of renameMap.entries()) {
    const origPos = payload.positions[origId];
    newPositions[newId] = origPos
      ? { x: origPos.x + shift.x, y: origPos.y + shift.y }
      : targetPos;
  }

  return {
    ...doc,
    parameterDefs: [...doc.parameterDefs, ...newParams],
    tableDefs: [...doc.tableDefs, ...newTables],
    formulaSteps: [...doc.formulaSteps, ...newSteps],
    breakdownDefs: [...doc.breakdownDefs, ...newBreakdowns],
    defaultInputs: { params: newParamInputs, tables: newTableInputs },
    nodePositions: newPositions,
  };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

// Nodes that cannot be deleted or copied — exported so CanvasFlow can import
// the same set rather than maintaining a duplicate definition.
export const SINGLETONS = new Set(["quantity", "unitPrice"]);

// Remove nodes by their canvas node IDs. Singletons are silently ignored.
// Formula steps whose perUnit reference is deleted are left intact (they'll
// show $0) — the user can re-point them in the panel.
export function deleteNodes(nodeIds: string[], doc: CanvasDocument): CanvasDocument {
  const toDelete = new Set(nodeIds.filter((id) => !SINGLETONS.has(id)));
  if (toDelete.size === 0) return doc;

  // Handle group deletions first, chaining through workingDoc so each deleteGroup
  // sees the result of prior deletions. Note: if toDelete contains nested groups
  // (parent + child), the parent deletion will also un-parent the child; the
  // subsequent child deleteGroup call becomes a no-op (group not found) and is safe.
  let workingDoc = doc;
  for (const id of toDelete) {
    if (workingDoc.groupDefs.some((g) => g.id === id)) {
      workingDoc = deleteGroup(id, workingDoc);
    }
  }

  // Handle controller deletions
  for (const id of toDelete) {
    if (workingDoc.controllerDefs.some((c) => c.id === id)) {
      workingDoc = deleteController(id, workingDoc);
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

// ─── Slug helpers ─────────────────────────────────────────────────────────────

// Convert a human-readable label to a valid variable name used as the node ID.
// "Labour Cost" → "labour_cost", "  FOO  " → "foo", "123abc" → "n_123abc"
export function slugify(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!slug) return "node";
  return /^[a-z]/.test(slug) ? slug : `n_${slug}`;
}

// Rewrite every reference to oldId → newId throughout the document:
// formula expressions, breakdown perUnit/subValue references, defaultInputs keys,
// and nodePositions. Returns a new CanvasDocument (pure function).
export function renameNodeId(
  oldId: string,
  newId: string,
  doc: CanvasDocument
): CanvasDocument {
  if (oldId === newId) return doc;

  const renameMap = new Map([[oldId, newId]]);

  const newFormulas = doc.formulaSteps.map((s) =>
    s.id === oldId
      ? { ...s, id: newId, formula: rewriteFormula(s.formula, renameMap) }
      : { ...s, formula: rewriteFormula(s.formula, renameMap) }
  );

  const newParams = doc.parameterDefs.map((p) =>
    p.id === oldId ? { ...p, id: newId } : p
  );

  // Tables are identified by their base id; the canvas node id is `${id}RatePerHr`.
  const isTableNode = oldId.endsWith("RatePerHr");
  const tableBaseOld = isTableNode ? oldId.replace(/RatePerHr$/, "") : null;
  const tableBaseNew = isTableNode ? newId.replace(/RatePerHr$/, "") : null;
  const newTables = doc.tableDefs.map((t) =>
    tableBaseOld && t.id === tableBaseOld ? { ...t, id: tableBaseNew! } : t
  );

  const newBreakdowns = doc.breakdownDefs.map((b) => ({
    ...b,
    id: b.id === oldId ? newId : b.id,
    items: (b.items ?? []).map((item) => ({
      ...item,
      stepId: item.stepId === oldId ? newId : item.stepId,
    })),
  }));

  const newParamInputs: Record<string, number> = {};
  for (const [k, v] of Object.entries(doc.defaultInputs.params)) {
    newParamInputs[k === oldId ? newId : k] = v;
  }

  const newTableInputs: Record<string, RateEntry[]> = {};
  for (const [k, v] of Object.entries(doc.defaultInputs.tables)) {
    const effectiveOld = tableBaseOld ?? oldId;
    const effectiveNew = tableBaseNew ?? newId;
    newTableInputs[k === effectiveOld ? effectiveNew : k] = v;
  }

  const newPositions: Record<string, { x: number; y: number }> = {};
  for (const [k, v] of Object.entries(doc.nodePositions)) {
    newPositions[k === oldId ? newId : k] = v;
  }

  return {
    ...doc,
    formulaSteps: newFormulas,
    parameterDefs: newParams,
    tableDefs: newTables,
    breakdownDefs: newBreakdowns,
    defaultInputs: { params: newParamInputs, tables: newTableInputs },
    nodePositions: newPositions,
  };
}

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
  const id = nextSlugId(`ctrl_${slugify(label)}`, takenIds);

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
  const newGroupDefs = updatedDoc.groupDefs
    .filter((g) => g.id !== groupId)
    .map((g) => ({
      ...g,
      memberIds: g.memberIds.filter((mid) => mid !== groupId),
    }));

  // Convert sub-group positions from relative to absolute before removing membership
  // Resolve the deleted group's absolute position once, against the original doc
  // (before any groupDef mutations). This avoids relying on updatedDoc's mutation state.
  const groupAbsPos = getAbsolutePosition(groupId, doc);
  for (const memberId of group.memberIds) {
    const isSubGroup = doc.groupDefs.some((g) => g.id === memberId);
    if (isSubGroup) {
      const groupAbs = groupAbsPos;
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

  return { ...updatedDoc, groupDefs: newGroupDefs, nodePositions: newPositions };
}

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

// ─── Create ───────────────────────────────────────────────────────────────────

function nextLabel(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

function nextSlugId(slug: string, taken: Set<string>): string {
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}_${n}`)) n++;
  return `${slug}_${n}`;
}

export function createNode(
  type: "formula" | "param" | "table" | "breakdown",
  doc: CanvasDocument,
  position: { x: number; y: number }
): { doc: CanvasDocument; newId: string } {
  const takenIds = new Set([
    ...doc.formulaSteps.map((s) => s.id),
    ...doc.parameterDefs.map((p) => p.id),
    ...doc.tableDefs.map((t) => t.id),
    ...doc.tableDefs.map((t) => `${t.id}RatePerHr`),
    ...doc.breakdownDefs.map((b) => b.id),
    "quantity",
    "unitPrice",
  ]);

  switch (type) {
    case "formula": {
      const takenLabels = new Set(doc.formulaSteps.map((s) => s.label ?? s.id));
      const label = nextLabel("Step", takenLabels);
      const id = nextSlugId(slugify(label), takenIds);
      return {
        newId: id,
        doc: {
          ...doc,
          formulaSteps: [...doc.formulaSteps, { id, label, formula: "" }],
          nodePositions: { ...doc.nodePositions, [id]: position },
        },
      };
    }
    case "param": {
      const takenLabels = new Set(doc.parameterDefs.map((p) => p.label));
      const label = nextLabel("Parameter", takenLabels);
      const id = nextSlugId(slugify(label), takenIds);
      return {
        newId: id,
        doc: {
          ...doc,
          parameterDefs: [...doc.parameterDefs, { id, label, defaultValue: 0 }],
          defaultInputs: {
            ...doc.defaultInputs,
            params: { ...doc.defaultInputs.params, [id]: 0 },
          },
          nodePositions: { ...doc.nodePositions, [id]: position },
        },
      };
    }
    case "table": {
      const takenLabels = new Set(doc.tableDefs.map((t) => t.label));
      const label = nextLabel("Rate Table", takenLabels);
      const id = nextSlugId(slugify(label), takenIds);
      const nodeId = `${id}RatePerHr`;
      const defaultRow: RateEntry = { id: uuidv4(), name: "New Item", qty: 1, ratePerHour: 0 };
      return {
        newId: nodeId,
        doc: {
          ...doc,
          tableDefs: [...doc.tableDefs, { id, label, rowLabel: "Item" }],
          defaultInputs: {
            ...doc.defaultInputs,
            tables: { ...doc.defaultInputs.tables, [id]: [defaultRow] },
          },
          nodePositions: { ...doc.nodePositions, [nodeId]: position },
        },
      };
    }
    case "breakdown": {
      const takenLabels = new Set(doc.breakdownDefs.map((b) => b.label));
      const label = nextLabel("Breakdown", takenLabels);
      const id = nextSlugId(slugify(label), takenIds);
      return {
        newId: id,
        doc: {
          ...doc,
          breakdownDefs: [...doc.breakdownDefs, { id, label, items: [] }],
          nodePositions: { ...doc.nodePositions, [id]: position },
        },
      };
    }
  }
}
