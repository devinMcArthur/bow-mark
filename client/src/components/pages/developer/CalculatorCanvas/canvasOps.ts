// client/src/components/pages/developer/CalculatorCanvas/canvasOps.ts
import { v4 as uuidv4 } from "uuid";
import { CanvasDocument, GroupDef, ControllerDef } from "./canvasStorage";
import {
  Position,
  CanvasFormulaStep,
  CanvasParameterDef,
  CanvasTableDef,
  CanvasBreakdownDef,
  OutputDef,
  RateEntry,
} from "../../../../components/TenderPricing/calculators/types";
import { RateBuildupOutputKind } from "../../../../generated/graphql";

// ─── Clipboard ────────────────────────────────────────────────────────────────

export interface ClipboardPayload {
  formulaSteps: CanvasFormulaStep[];
  parameterDefs: CanvasParameterDef[];
  tableDefs: CanvasTableDef[];    // defaultRows carry the default row data
  breakdownDefs: CanvasBreakdownDef[];
  // positions and tableInputs removed — now on each def
}

// ─── Position helpers ─────────────────────────────────────────────────────────

/**
 * Look up the stored position for any canvas node by its canvas-node ID.
 * Table nodes use `${tableId}RatePerHr` as their canvas ID.
 */
export function getNodePosition(id: string, doc: CanvasDocument): Position {
  if (id === "quantity") return doc.specialPositions.quantity;
  if (id === "unitPrice") return doc.specialPositions.unitPrice;
  const p = doc.parameterDefs.find((p) => p.id === id);
  if (p) return p.position;
  // Table canvas-node ID is `${tableId}RatePerHr`
  const t = doc.tableDefs.find((t) => `${t.id}RatePerHr` === id);
  if (t) return t.position;
  const s = doc.formulaSteps.find((s) => s.id === id);
  if (s) return s.position;
  const b = doc.breakdownDefs.find((b) => b.id === id);
  if (b) return b.position;
  const o = doc.outputDefs.find((o) => o.id === id);
  if (o) return o.position;
  const c = doc.controllerDefs.find((c) => c.id === id);
  if (c) return c.position;
  const g = doc.groupDefs.find((g) => g.id === id);
  if (g) return g.position;
  return { x: 0, y: 0 };
}

/**
 * Return a new CanvasDocument with the position of one node updated.
 * Only updates x/y (and w/h if present on newPos). Existing w/h preserved when
 * newPos only has x/y.
 */
export function setNodePosition(
  id: string,
  newPos: Position,
  doc: CanvasDocument
): CanvasDocument {
  if (id === "quantity") {
    return { ...doc, specialPositions: { ...doc.specialPositions, quantity: newPos } };
  }
  if (id === "unitPrice") {
    return { ...doc, specialPositions: { ...doc.specialPositions, unitPrice: newPos } };
  }
  if (doc.parameterDefs.some((p) => p.id === id)) {
    return { ...doc, parameterDefs: doc.parameterDefs.map((p) => p.id === id ? { ...p, position: newPos } : p) };
  }
  const tableNodeMatch = doc.tableDefs.find((t) => `${t.id}RatePerHr` === id);
  if (tableNodeMatch) {
    return { ...doc, tableDefs: doc.tableDefs.map((t) => t.id === tableNodeMatch.id ? { ...t, position: newPos } : t) };
  }
  if (doc.formulaSteps.some((s) => s.id === id)) {
    return { ...doc, formulaSteps: doc.formulaSteps.map((s) => s.id === id ? { ...s, position: newPos } : s) };
  }
  if (doc.breakdownDefs.some((b) => b.id === id)) {
    return { ...doc, breakdownDefs: doc.breakdownDefs.map((b) => b.id === id ? { ...b, position: newPos } : b) };
  }
  if (doc.outputDefs.some((o) => o.id === id)) {
    return { ...doc, outputDefs: doc.outputDefs.map((o) => o.id === id ? { ...o, position: newPos } : o) };
  }
  if (doc.controllerDefs.some((c) => c.id === id)) {
    return { ...doc, controllerDefs: doc.controllerDefs.map((c) => c.id === id ? { ...c, position: newPos } : c) };
  }
  if (doc.groupDefs.some((g) => g.id === id)) {
    return { ...doc, groupDefs: doc.groupDefs.map((g) => g.id === id ? { ...g, position: newPos } : g) };
  }
  return doc;
}

/**
 * Build a flat position map from all defs in the document.
 * Useful as a starting point for auto-layout position computation.
 */
export function buildPositionMapFromDoc(
  doc: CanvasDocument
): Record<string, { x: number; y: number; w?: number; h?: number }> {
  const positions: Record<string, { x: number; y: number; w?: number; h?: number }> = {
    quantity: doc.specialPositions.quantity,
    unitPrice: doc.specialPositions.unitPrice,
  };
  for (const p of doc.parameterDefs) positions[p.id] = p.position;
  for (const t of doc.tableDefs) positions[`${t.id}RatePerHr`] = t.position;
  for (const s of doc.formulaSteps) positions[s.id] = s.position;
  for (const b of doc.breakdownDefs) positions[b.id] = b.position;
  for (const o of doc.outputDefs) positions[o.id] = o.position;
  for (const c of doc.controllerDefs) positions[c.id] = c.position;
  for (const g of doc.groupDefs) positions[g.id] = g.position;
  return positions;
}

/**
 * Apply a flat position map back to a CanvasDocument, distributing each entry
 * to the appropriate def. Entries for unknown IDs are silently ignored.
 * Only updates x/y (and w/h when present in the map entry).
 */
export function applyPositionMapToDoc(
  doc: CanvasDocument,
  posMap: Record<string, { x: number; y: number; w?: number; h?: number }>
): CanvasDocument {
  let updated = doc;
  for (const [id, pos] of Object.entries(posMap)) {
    const existing = getNodePosition(id, updated);
    const merged: Position = { ...existing, x: pos.x, y: pos.y, ...(pos.w !== undefined ? { w: pos.w, h: pos.h } : {}) };
    updated = setNodePosition(id, merged, updated);
  }
  return updated;
}

// ─── Clipboard helpers ────────────────────────────────────────────────────────

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
// (plus their step deps).
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

  return {
    formulaSteps: [...collectedFormulaIds].map((id) => formulaStepMap.get(id)!),
    parameterDefs: [...collectedParamIds].map((id) => paramMap.get(id)!),
    tableDefs: [...collectedTableIds].map((id) => tableDefMap.get(id)!),
    breakdownDefs: [...collectedBreakdownIds].map((id) => doc.breakdownDefs.find((b) => b.id === id)!),
  };
}

// Merge a clipboard payload into a document. IDs that conflict with existing
// ones are suffixed (_2, _3, …). Formula strings are rewritten to use the new IDs.
// The group is placed so its top-left corner lands at targetPos, preserving relative layout.
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
    ...doc.outputDefs.map((o) => o.id),
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

  // Compute shift so the top-left of the pasted group lands at targetPos
  const allPositions = [
    ...payload.parameterDefs.map((p) => p.position),
    ...payload.tableDefs.map((t) => t.position),
    ...payload.formulaSteps.map((s) => s.position),
    ...payload.breakdownDefs.map((b) => b.position),
  ];
  const topLeft = allPositions.length > 0
    ? { x: Math.min(...allPositions.map((p) => p.x)), y: Math.min(...allPositions.map((p) => p.y)) }
    : targetPos;
  const shift = { x: targetPos.x - topLeft.x, y: targetPos.y - topLeft.y };

  const shifted = (pos: Position): Position => ({ ...pos, x: pos.x + shift.x, y: pos.y + shift.y });

  const newParams: CanvasParameterDef[] = payload.parameterDefs.map((p) => ({
    ...p,
    id: renameMap.get(p.id)!,
    position: shifted(p.position),
  }));
  const newTables: CanvasTableDef[] = payload.tableDefs.map((t) => ({
    ...t,
    id: renameMap.get(t.id)!,
    position: shifted(t.position),
  }));
  const newSteps: CanvasFormulaStep[] = payload.formulaSteps.map((s) => ({
    ...s,
    id: renameMap.get(s.id)!,
    formula: rewriteFormula(s.formula, renameMap),
    position: shifted(s.position),
  }));
  const newBreakdowns: CanvasBreakdownDef[] = payload.breakdownDefs.map((b) => ({
    ...b,
    id: renameMap.get(b.id)!,
    items: (b.items ?? []).map((item) => ({
      ...item,
      stepId: renameMap.get(item.stepId) ?? item.stepId,
    })),
    position: shifted(b.position),
  }));

  return {
    ...doc,
    parameterDefs: [...doc.parameterDefs, ...newParams],
    tableDefs: [...doc.tableDefs, ...newTables],
    formulaSteps: [...doc.formulaSteps, ...newSteps],
    breakdownDefs: [...doc.breakdownDefs, ...newBreakdowns],
  };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

// Nodes that cannot be deleted or copied — exported so CanvasFlow can import
// the same set rather than maintaining a duplicate definition.
export const SINGLETONS = new Set(["quantity", "unitPrice"]);

// Remove nodes by their canvas node IDs. Singletons are silently ignored.
export function deleteNodes(nodeIds: string[], doc: CanvasDocument): CanvasDocument {
  const toDelete = new Set(nodeIds.filter((id) => !SINGLETONS.has(id)));
  if (toDelete.size === 0) return doc;

  // Handle group deletions first
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

  // Remove the actual defs — positions travel with the defs, so no separate cleanup needed
  return {
    ...workingDoc,
    formulaSteps: workingDoc.formulaSteps.filter((s) => !toDelete.has(s.id)),
    parameterDefs: workingDoc.parameterDefs.filter((p) => !toDelete.has(p.id)),
    tableDefs: workingDoc.tableDefs.filter(
      (t) => !toDelete.has(t.id) && !toDelete.has(`${t.id}RatePerHr`)
    ),
    breakdownDefs: workingDoc.breakdownDefs.filter((b) => !toDelete.has(b.id)),
    outputDefs: workingDoc.outputDefs.filter((o) => !toDelete.has(o.id)),
  };
}

// ─── Slug helpers ─────────────────────────────────────────────────────────────

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
// formula expressions, breakdown item references, and def ids.
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

  // Output nodes store `sourceStepId` — rewrite when its source step is renamed.
  // Also rewrite the output's own id if it's what we're renaming.
  const newOutputDefs = doc.outputDefs.map((o) => ({
    ...o,
    id: o.id === oldId ? newId : o.id,
    sourceStepId: o.sourceStepId === oldId ? newId : o.sourceStepId,
  }));

  const newControllerDefs = (doc.controllerDefs ?? []).map((c) =>
    c.id === oldId ? { ...c, id: newId } : c
  );

  const newGroupDefs = (doc.groupDefs ?? []).map((g) => ({
    ...g,
    memberIds: g.memberIds.map((mid) => (mid === oldId ? newId : mid)),
    ...(g.activation?.controllerId === oldId
      ? { activation: { ...g.activation, controllerId: newId } }
      : {}),
  }));

  return {
    ...doc,
    formulaSteps: newFormulas,
    parameterDefs: newParams,
    tableDefs: newTables,
    breakdownDefs: newBreakdowns,
    outputDefs: newOutputDefs,
    controllerDefs: newControllerDefs,
    groupDefs: newGroupDefs,
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
  const pos = getNodePosition(id, doc);
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
  const nodeRel = getNodePosition(nodeId, doc);
  const absPos: Position = {
    x: nodeRel.x + groupAbs.x,
    y: nodeRel.y + groupAbs.y,
    ...(nodeRel.w !== undefined ? { w: nodeRel.w, h: nodeRel.h } : {}),
  };

  let updated = { ...doc, groupDefs: doc.groupDefs.map((g) => ({
    ...g,
    memberIds: g.memberIds.filter((id) => id !== nodeId),
  })) };
  updated = setNodePosition(nodeId, absPos, updated);
  return updated;
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
  const nodeAbs = getNodePosition(nodeId, docWithout);
  const relPos: Position = {
    x: nodeAbs.x - targetGroupAbs.x,
    y: nodeAbs.y - targetGroupAbs.y,
    ...(nodeAbs.w !== undefined ? { w: nodeAbs.w, h: nodeAbs.h } : {}),
  };

  let updated = setNodePosition(nodeId, relPos, docWithout);
  updated = { ...updated, groupDefs: updated.groupDefs.map((g) =>
    g.id === targetGroupId
      ? { ...g, memberIds: [...g.memberIds.filter((id) => id !== nodeId), nodeId] }
      : g
  )};
  return updated;
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
    ...doc.outputDefs.map((o) => o.id),
    "quantity",
    "unitPrice",
  ]);
  const takenLabels = new Set(doc.groupDefs.map((g) => g.label));
  const label = nextLabel("Group", takenLabels);
  const id = nextSlugId(`grp_${slugify(label)}`, takenIds);
  const newGroup: GroupDef = {
    id,
    label,
    memberIds: [],
    position: { x: position.x, y: position.y, w: 400, h: 300 },
  };
  return {
    newId: id,
    doc: { ...doc, groupDefs: [...doc.groupDefs, newGroup] },
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
    ...doc.outputDefs.map((o) => o.id),
    "quantity", "unitPrice",
  ]);
  const takenLabels = new Set(doc.controllerDefs.map((c) => c.label));
  const baseLabel = type === "percentage" ? "Percentage" : type === "toggle" ? "Toggle" : "Selector";
  const label = nextLabel(baseLabel, takenLabels);
  const id = nextSlugId(`${slugify(label)}_${type}`, takenIds);

  const newController: ControllerDef = {
    id,
    label,
    type,
    position: { x: position.x, y: position.y },
    ...(type === "percentage" ? { defaultValue: 0.5 } : {}),
    ...(type === "toggle" ? { defaultValue: false } : {}),
    ...(type === "selector" ? { options: [], defaultSelected: [] } : {}),
  };

  return {
    newId: id,
    doc: { ...doc, controllerDefs: [...doc.controllerDefs, newController] },
  };
}

/**
 * Delete a group. Its direct members are un-parented (stay at their current absolute
 * positions). Sub-groups become top-level. Removes the GroupDef.
 */
export function deleteGroup(groupId: string, doc: CanvasDocument): CanvasDocument {
  const group = doc.groupDefs.find((g) => g.id === groupId);
  if (!group) return doc;

  // Resolve the deleted group's absolute position before any mutations
  const groupAbsPos = getAbsolutePosition(groupId, doc);

  // Un-parent all direct non-group members (convert relative → absolute)
  let updatedDoc = doc;
  for (const memberId of group.memberIds) {
    const isSubGroup = doc.groupDefs.some((g) => g.id === memberId);
    if (!isSubGroup) {
      updatedDoc = removeNodeFromGroup(memberId, updatedDoc);
    }
  }

  // Convert sub-group positions from relative to absolute
  for (const memberId of group.memberIds) {
    const isSubGroup = doc.groupDefs.some((g) => g.id === memberId);
    if (isSubGroup) {
      const subPos = getNodePosition(memberId, updatedDoc);
      const absPos: Position = {
        x: subPos.x + groupAbsPos.x,
        y: subPos.y + groupAbsPos.y,
        ...(subPos.w !== undefined ? { w: subPos.w, h: subPos.h } : {}),
      };
      updatedDoc = setNodePosition(memberId, absPos, updatedDoc);
    }
  }

  // Remove the GroupDef itself and remove it from any parent group's memberIds
  const newGroupDefs = updatedDoc.groupDefs
    .filter((g) => g.id !== groupId)
    .map((g) => ({
      ...g,
      memberIds: g.memberIds.filter((mid) => mid !== groupId),
    }));

  return { ...updatedDoc, groupDefs: newGroupDefs };
}

/**
 * Delete a controller. Clears `activation` from any groups that reference it.
 * Removes the ControllerDef.
 */
export function deleteController(controllerId: string, doc: CanvasDocument): CanvasDocument {
  return {
    ...doc,
    controllerDefs: doc.controllerDefs.filter((c) => c.id !== controllerId),
    groupDefs: doc.groupDefs.map((g) =>
      g.activation?.controllerId === controllerId
        ? { ...g, activation: undefined }
        : g
    ),
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

function nextLabel(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

export function nextSlugId(slug: string, taken: Set<string>): string {
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}_${n}`)) n++;
  return `${slug}_${n}`;
}

export function createNode(
  type: "formula" | "param" | "table" | "breakdown" | "output",
  doc: CanvasDocument,
  position: { x: number; y: number }
): { doc: CanvasDocument; newId: string } {
  const takenIds = new Set([
    ...doc.formulaSteps.map((s) => s.id),
    ...doc.parameterDefs.map((p) => p.id),
    ...doc.tableDefs.map((t) => t.id),
    ...doc.tableDefs.map((t) => `${t.id}RatePerHr`),
    ...doc.breakdownDefs.map((b) => b.id),
    ...doc.outputDefs.map((o) => o.id),
    "quantity",
    "unitPrice",
  ]);

  switch (type) {
    case "formula": {
      const takenLabels = new Set(doc.formulaSteps.map((s) => s.label ?? s.id));
      const label = nextLabel("Step", takenLabels);
      const id = nextSlugId(slugify(label), takenIds);
      const newStep: CanvasFormulaStep = { id, label, formula: "", position: { x: position.x, y: position.y } };
      return {
        newId: id,
        doc: { ...doc, formulaSteps: [...doc.formulaSteps, newStep] },
      };
    }
    case "param": {
      const takenLabels = new Set(doc.parameterDefs.map((p) => p.label));
      const label = nextLabel("Parameter", takenLabels);
      const id = nextSlugId(slugify(label), takenIds);
      const newParam: CanvasParameterDef = { id, label, defaultValue: 0, position: { x: position.x, y: position.y } };
      return {
        newId: id,
        doc: { ...doc, parameterDefs: [...doc.parameterDefs, newParam] },
      };
    }
    case "table": {
      const takenLabels = new Set(doc.tableDefs.map((t) => t.label));
      const label = nextLabel("Rate Table", takenLabels);
      const id = nextSlugId(slugify(label), takenIds);
      const nodeId = `${id}RatePerHr`;
      const defaultRow: RateEntry = { id: uuidv4(), name: "New Item", qty: 1, ratePerHour: 0 };
      const newTable: CanvasTableDef = {
        id,
        label,
        rowLabel: "Item",
        defaultRows: [defaultRow],
        position: { x: position.x, y: position.y },
      };
      return {
        newId: nodeId,
        doc: { ...doc, tableDefs: [...doc.tableDefs, newTable] },
      };
    }
    case "breakdown": {
      const takenLabels = new Set(doc.breakdownDefs.map((b) => b.label));
      const label = nextLabel("Breakdown", takenLabels);
      const id = nextSlugId(slugify(label), takenIds);
      const newBreakdown: CanvasBreakdownDef = { id, label, items: [], position: { x: position.x, y: position.y } };
      return {
        newId: id,
        doc: { ...doc, breakdownDefs: [...doc.breakdownDefs, newBreakdown] },
      };
    }
    case "output": {
      const takenLabels = new Set(doc.outputDefs.map((o) => o.label ?? o.id));
      const label = nextLabel("Output", takenLabels);
      const id = nextSlugId(`out_${slugify(label)}`, takenIds);
      const newOutput: OutputDef = {
        id,
        kind: RateBuildupOutputKind.Material,
        sourceStepId: "",
        unit: "t",
        label,
        position: { x: position.x, y: position.y },
      };
      return {
        newId: id,
        doc: { ...doc, outputDefs: [...doc.outputDefs, newOutput] },
      };
    }
  }
}
