import { useState, useCallback, useRef, useEffect } from "react";
import { useApolloClient } from "@apollo/client";
import {
  RateBuildupTemplateFullSnippetFragment,
  RateBuildupTemplatesDocument,
  SaveRateBuildupTemplateDocument,
  DeleteRateBuildupTemplateDocument,
  SaveRateBuildupTemplateMutationVariables,
} from "../../../../generated/graphql";
import {
  Position,
  CanvasParameterDef,
  CanvasTableDef,
  CanvasFormulaStep,
  CanvasBreakdownDef,
  OutputDef,
  SpecialNodePositions,
  RateEntry,
  EvaluatedOutput,
} from "../../../../components/TenderPricing/calculators/types";
import { RateBuildupOutputKind } from "../../../../generated/graphql";
import { evaluateTemplate, evaluateExpression } from "../../../../components/TenderPricing/calculators/evaluate";

// ─── CanvasDocument ───────────────────────────────────────────────────────────

export type {
  GroupActivation,
  ControllerOption,
  UnitVariant,
  ControllerDef,
  GroupDef,
  CanvasDocument,
} from "./canvasTypes";
import type {
  CanvasDocument,
  GroupDef,
  ControllerDef,
  UnitVariant,
} from "./canvasTypes";

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
    // If optionId is not yet set (in-progress authoring), treat as inactive
    return activation.optionId ? selected.includes(activation.optionId) : false;
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

/**
 * Return the set of node IDs (formula steps, params, tables, etc.) that belong
 * to any currently-inactive group, including members of inactive parent groups.
 * Used to zero out those steps in the evaluator.
 */
export function computeInactiveNodeIds(
  doc: CanvasDocument,
  controllers: Record<string, number | boolean | string[]>,
  activeUnit?: string   // canonical code of the line item's unit
): Set<string> {
  // Groups that serve as unit variant branches — their activation is driven by
  // activeUnit, not by controller values.
  const unitVariantGroupIds = new Set((doc.unitVariants ?? []).map((v) => v.activatesGroupId));
  const activeVariantGroupId = activeUnit
    ? (doc.unitVariants ?? []).find((v) => v.unit === activeUnit)?.activatesGroupId
    : undefined;

  const inactiveGroupIds = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const g of doc.groupDefs) {
      if (inactiveGroupIds.has(g.id)) continue;

      let shouldBeInactive: boolean;

      if (unitVariantGroupIds.has(g.id)) {
        // Unit variant group: active only if it's the matching variant
        shouldBeInactive = g.id !== activeVariantGroupId;
      } else {
        // Normal group: use existing controller-based logic
        const directlyInactive = !isGroupActive(g, doc, controllers);
        const parentGroup = doc.groupDefs.find((pg) => pg.memberIds.includes(g.id));
        const parentInactive = parentGroup ? inactiveGroupIds.has(parentGroup.id) : false;
        shouldBeInactive = directlyInactive || parentInactive;
      }

      if (shouldBeInactive) {
        inactiveGroupIds.add(g.id);
        changed = true;
      }
    }
  }

  const inactiveNodeIds = new Set<string>();
  for (const g of doc.groupDefs) {
    if (inactiveGroupIds.has(g.id)) {
      for (const mid of g.memberIds) inactiveNodeIds.add(mid);
    }
  }
  return inactiveNodeIds;
}

// ─── RateBuildupSnapshot ──────────────────────────────────────────────────────

/**
 * A frozen copy of a CanvasDocument attached to a tender pricing row.
 * `params`, `tables`, `controllers` hold job-specific estimator values.
 * `paramNotes` holds estimator context notes keyed by param ID.
 * `sourceTemplateId` is the server _id of the template this was forked from.
 */
/**
 * Resolved per-row output, ready to be saved to TenderPricingRow.rateBuildupOutputs.
 * Combines the template's structural def (unit, kind) + the estimator's pick +
 * the computed per-unit and scaled total values. Exactly one of `materialId`
 * / `crewKindId` is populated depending on `kind`.
 */
export interface PricingRowOutput {
  kind: RateBuildupOutputKind;
  materialId?: string;
  crewKindId?: string;
  unit: string;
  perUnitValue: number;
  totalValue: number;
}

export interface RateBuildupSnapshot extends CanvasDocument {
  sourceTemplateId: string;
  params: Record<string, number>;
  tables: Record<string, RateEntry[]>;
  controllers: Record<string, number | boolean | string[]>;
  paramNotes?: Record<string, string>;
  /**
   * Estimator's per-output selections, keyed by OutputDef.id. At evaluation
   * time these override the template's defaults. Exactly one of `materialId`
   * / `crewKindId` is used per entry, matching the output's `kind`.
   */
  outputs?: Record<string, { materialId?: string; crewKindId?: string }>;
}

/**
 * Instantiate a snapshot from a template. Copies all canvas structure.
 * Params are seeded from each ParameterDef.defaultValue.
 * Tables are seeded from each CanvasTableDef.defaultRows.
 * Controllers are seeded from each ControllerDef's default.
 */
export function snapshotFromTemplate(template: CanvasDocument): RateBuildupSnapshot {
  const params: Record<string, number> = {};
  for (const p of template.parameterDefs ?? []) {
    params[p.id] = p.defaultValue;
  }

  const tables: Record<string, RateEntry[]> = {};
  for (const t of template.tableDefs ?? []) {
    tables[t.id] = (t.defaultRows ?? []) as RateEntry[];
  }

  const controllers: Record<string, number | boolean | string[]> = {};
  for (const c of template.controllerDefs ?? []) {
    if (c.type === "percentage")
      controllers[c.id] = typeof c.defaultValue === "number" ? c.defaultValue : 0;
    else if (c.type === "toggle")
      controllers[c.id] = typeof c.defaultValue === "boolean" ? c.defaultValue : false;
    else if (c.type === "selector")
      controllers[c.id] = c.defaultSelected ?? [];
  }

  // Seed output selections from each OutputDef's default, picking the right
  // field based on the output's kind.
  const outputs: Record<string, { materialId?: string; crewKindId?: string }> = {};
  for (const o of template.outputDefs ?? []) {
    outputs[o.id] = o.kind === "CrewHours"
      ? { crewKindId: o.defaultCrewKindId }
      : { materialId: o.defaultMaterialId };
  }

  return {
    ...template,
    sourceTemplateId: template.id,
    params,
    tables,
    controllers,
    outputs,
  };
}

/**
 * Convert a snapshot back to a CanvasDocument for rendering in CalculatorCanvas.
 * Strips the snapshot-specific fields, returning the pure canvas structure.
 */
export function snapshotToCanvasDoc(snapshot: RateBuildupSnapshot): CanvasDocument {
  const {
    sourceTemplateId: _sid,
    params: _p,
    tables: _t,
    controllers: _c,
    paramNotes: _pn,
    outputs: _o,
    ...rest
  } = snapshot;
  // Normalize fields that may be absent on snapshots saved before a schema
  // bump. outputDefs was added later — older snapshots won't have it and
  // every downstream reader assumes it's an array.
  return {
    ...rest,
    outputDefs: rest.outputDefs ?? [],
  };
}

/**
 * Merge an updated CanvasDocument (structural edits) back into a snapshot,
 * preserving params, tables, controllers, and paramNotes from the existing snapshot.
 */
export function canvasDocToSnapshot(
  doc: CanvasDocument,
  existing: RateBuildupSnapshot
): RateBuildupSnapshot {
  return {
    ...doc,
    sourceTemplateId: existing.sourceTemplateId,
    params: existing.params,
    tables: existing.tables,
    controllers: existing.controllers,
    paramNotes: existing.paramNotes,
    outputs: existing.outputs,
  };
}

/**
 * Evaluate a snapshot against a quantity, returning both the unit price and the
 * resolved Output node values. All save paths should call this and persist
 * BOTH values atomically — outputs are derived from the same ctx as unitPrice,
 * so they must stay in sync.
 *
 * Returns `{ unitPrice, outputs }`:
 * - `unitPrice` rounded to 4 decimals (0 on failure)
 * - `outputs[]` with per-unit and scaled totalValue (quantity × perUnitValue),
 *   with `materialId` resolved from snapshot.outputs (estimator pick) falling
 *   back to OutputDef.defaultMaterialId
 */
export function evaluateSnapshot(
  snapshot: RateBuildupSnapshot,
  rawQuantity: number,
  unit?: string
): { unitPrice: number; outputs: PricingRowOutput[] } {
  const doc = snapshotToCanvasDoc(snapshot);

  // Resolve active unit variant and normalize quantity via conversion formula
  const variant = unit ? (doc.unitVariants ?? []).find((v) => v.unit === unit) : undefined;
  let quantity = rawQuantity;
  if (variant?.conversionFormula) {
    const ctx: Record<string, number> = { quantity: rawQuantity };
    for (const p of doc.parameterDefs) ctx[p.id] = snapshot.params[p.id] ?? p.defaultValue;
    const converted = evaluateExpression(variant.conversionFormula, ctx);
    if (converted !== null && converted > 0) quantity = converted;
  }

  const controllerNumeric: Record<string, number> = {};
  for (const [k, v] of Object.entries(snapshot.controllers ?? {})) {
    if (typeof v === "number") controllerNumeric[k] = v;
    else if (typeof v === "boolean") controllerNumeric[k] = v ? 1 : 0;
  }
  const inactiveNodeIds = computeInactiveNodeIds(doc, snapshot.controllers ?? {}, unit);
  const result = evaluateTemplate(
    doc,
    { params: snapshot.params, tables: snapshot.tables },
    quantity,
    controllerNumeric,
    inactiveNodeIds
  );

  // Resolve each evaluated output: the estimator's snapshot selection overrides
  // the template's default. The field we read depends on the output's kind.
  //
  // IMPORTANT: the formula step's value is already the TOTAL for this row,
  // not a per-unit value. Formulas receive `quantity` directly in the context,
  // so template authors write expressions like `area * depth * 2.4` that
  // produce the full line-item total. We do NOT multiply by quantity again.
  //
  // perUnitValue is kept in the data shape for backwards-compat but mirrors
  // totalValue until we formally remove it.
  const outputs: PricingRowOutput[] = (result.outputs ?? []).map((o: EvaluatedOutput) => {
    const total = parseFloat(o.perUnitValue.toFixed(6));
    const pick = snapshot.outputs?.[o.id];
    if (o.kind === "CrewHours") {
      const crewKindId = pick?.crewKindId ?? o.defaultCrewKindId;
      return {
        kind: RateBuildupOutputKind.CrewHours,
        crewKindId,
        unit: "hr",
        perUnitValue: total,
        totalValue: total,
      };
    }
    const materialId = pick?.materialId ?? o.defaultMaterialId;
    return {
      kind: RateBuildupOutputKind.Material,
      materialId,
      unit: o.unit,
      perUnitValue: total,
      totalValue: total,
    };
  });

  return {
    unitPrice: parseFloat(result.unitPrice.toFixed(4)),
    outputs,
  };
}

/**
 * Back-compat wrapper for callers that only need the unit price. Prefer
 * `evaluateSnapshot` in save paths so the row's `rateBuildupOutputs` stay in
 * sync with the unit price.
 */
export function computeSnapshotUnitPrice(
  snapshot: RateBuildupSnapshot,
  rawQuantity: number,
  unit?: string
): number {
  return evaluateSnapshot(snapshot, rawQuantity, unit).unitPrice;
}

// ─── Serialise / deserialise ──────────────────────────────────────────────────

export function fragmentToDoc(f: RateBuildupTemplateFullSnippetFragment): CanvasDocument {
  const specialPositions: SpecialNodePositions = {
    quantity: { x: 100, y: 200 },
    unitPrice: { x: 700, y: 200 },
  };
  if (f.specialPositions) {
    try {
      const sp = typeof f.specialPositions === "string"
        ? JSON.parse(f.specialPositions)
        : f.specialPositions;
      if (sp?.quantity) specialPositions.quantity = sp.quantity;
      if (sp?.unitPrice) specialPositions.unitPrice = sp.unitPrice;
    } catch { /* ignore */ }
  }

  // groupDefs and controllerDefs arrive as typed sub-docs after server migration;
  // fall back to parsing JSON strings for pre-migration data.
  let groupDefs: GroupDef[] = [];
  if (Array.isArray(f.groupDefs)) {
    groupDefs = f.groupDefs as GroupDef[];
  } else if (typeof f.groupDefs === "string") {
    try { groupDefs = JSON.parse(f.groupDefs); } catch { /* ignore */ }
  }
  // Deduplicate memberIds within each group
  groupDefs = groupDefs.map((g) => ({ ...g, memberIds: [...new Set(g.memberIds)] }));

  let controllerDefs: ControllerDef[] = [];
  if (Array.isArray(f.controllerDefs)) {
    controllerDefs = f.controllerDefs as ControllerDef[];
  } else if (typeof f.controllerDefs === "string") {
    try { controllerDefs = JSON.parse(f.controllerDefs); } catch { /* ignore */ }
  }

  // Deduplicate defs by ID — protects against duplicate entries that may have been
  // saved when the canvas had a bug where content edits didn't visually reflect.
  const dedup = <T extends { id: string }>(arr: T[]): T[] => {
    const seen = new Set<string>();
    return arr.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  return {
    id: f._id,
    label: f.label,
    defaultUnit: f.defaultUnit ?? "unit",
    parameterDefs: dedup((f.parameterDefs ?? []) as CanvasParameterDef[]),
    tableDefs: dedup((f.tableDefs ?? []) as CanvasTableDef[]),
    formulaSteps: dedup((f.formulaSteps ?? []) as CanvasFormulaStep[]),
    breakdownDefs: dedup((f.breakdownDefs ?? []) as CanvasBreakdownDef[]),
    outputDefs: dedup(((f.outputDefs ?? []) as OutputDef[])),
    specialPositions,
    groupDefs,
    controllerDefs,
    unitVariants: (f.unitVariants ?? []).map(({ unit, activatesGroupId, conversionFormula }) => ({ unit, activatesGroupId, conversionFormula: conversionFormula ?? undefined })),
    updatedAt: f.updatedAt ?? undefined,
  };
}

function omitTypename<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(omitTypename) as unknown as T;
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([k]) => k !== "__typename")
        .map(([k, v]) => [k, omitTypename(v)])
    ) as T;
  }
  return obj;
}

function docToVariables(
  doc: CanvasDocument,
  idRemap: Map<string, string>
): SaveRateBuildupTemplateMutationVariables {
  const serverId = idRemap.get(doc.id) ?? doc.id;
  const isNew = serverId.startsWith("new_");
  return {
    data: {
      id: isNew ? undefined : serverId,
      label: doc.label,
      defaultUnit: doc.defaultUnit,
      parameterDefs: omitTypename(doc.parameterDefs),
      tableDefs: omitTypename(doc.tableDefs),
      formulaSteps: omitTypename(doc.formulaSteps),
      breakdownDefs: omitTypename(doc.breakdownDefs),
      outputDefs: omitTypename(doc.outputDefs),
      specialPositions: JSON.stringify(doc.specialPositions),
      groupDefs: omitTypename(doc.groupDefs),
      controllerDefs: omitTypename(doc.controllerDefs).map((c) => ({
        ...c,
        defaultValue: typeof c.defaultValue === "boolean" ? (c.defaultValue ? 1 : 0) : c.defaultValue,
      })),
      unitVariants: (doc.unitVariants ?? []).map(({ unit, activatesGroupId, conversionFormula }) => ({
        unit,
        activatesGroupId,
        ...(conversionFormula ? { conversionFormula } : {}),
      })),
    },
  };
}

// ─── Blank document ───────────────────────────────────────────────────────────

function blankDocument(): CanvasDocument {
  return {
    id: `new_${Date.now()}`,
    label: "New Template",
    defaultUnit: "unit",
    parameterDefs: [],
    tableDefs: [],
    formulaSteps: [],
    breakdownDefs: [],
    outputDefs: [],
    specialPositions: {
      quantity: { x: 100, y: 200 },
      unitPrice: { x: 700, y: 200 },
    },
    groupDefs: [],
    controllerDefs: [],
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const HISTORY_LIMIT = 50;
const DEBOUNCE_MS = 1500;

export function useCanvasDocuments() {
  const client = useApolloClient();
  const [docs, setDocs] = useState<CanvasDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Per-doc undo/redo stacks keyed by doc ID
  const undoStacks = useRef<Map<string, CanvasDocument[]>>(new Map());
  const redoStacks = useRef<Map<string, CanvasDocument[]>>(new Map());
  const [historyVersion, setHistoryVersion] = useState(0);
  const bumpVersion = () => setHistoryVersion((v) => v + 1);

  // Pending debounce timers keyed by doc ID
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Track temp-id → real-id after first server save
  const idRemap = useRef<Map<string, string>>(new Map());

  // ── Initial load from server ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    client
      .query({ query: RateBuildupTemplatesDocument, fetchPolicy: "network-only" })
      .then(({ data }) => {
        if (cancelled) return;
        const serverDocs = (data?.rateBuildupTemplates ?? []).map(fragmentToDoc);
        setDocs(serverDocs.length > 0 ? serverDocs : [blankDocument()]);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setDocs([blankDocument()]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Background save (debounced) ─────────────────────────────────────────────
  const scheduleSave = useCallback(
    (doc: CanvasDocument) => {
      const existing = saveTimers.current.get(doc.id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(async () => {
        saveTimers.current.delete(doc.id);
        try {
          const result = await client.mutate({
            mutation: SaveRateBuildupTemplateDocument,
            variables: docToVariables(doc, idRemap.current),
          });
          const saved = result.data?.saveRateBuildupTemplate;
          if (!saved) return;
          const realId = saved._id;
          // Record the temp→real mapping so future saves use the correct server ID.
          // We do NOT remap in state — the temp ID stays as the stable in-memory key.
          if (doc.id !== realId) {
            idRemap.current.set(doc.id, realId);
          }
        } catch (err) {
          console.error("[canvasStorage] save failed", err);
        }
      }, DEBOUNCE_MS);
      saveTimers.current.set(doc.id, timer);
    },
    [client]
  );

  // ── Public API ──────────────────────────────────────────────────────────────

  const canUndo = useCallback(
    (docId: string) => (undoStacks.current.get(docId)?.length ?? 0) > 0,
    [historyVersion] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const canRedo = useCallback(
    (docId: string) => (redoStacks.current.get(docId)?.length ?? 0) > 0,
    [historyVersion] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const saveDocument = useCallback(
    (updated: CanvasDocument) => {
      setDocs((prev) => {
        const current = prev.find((d) => d.id === updated.id);
        if (current) {
          const stack = undoStacks.current.get(updated.id) ?? [];
          undoStacks.current.set(updated.id, [
            ...stack.slice(-(HISTORY_LIMIT - 1)),
            current,
          ]);
          redoStacks.current.set(updated.id, []);
        }
        const next = prev.map((d) => (d.id === updated.id ? updated : d));
        scheduleSave(updated);
        return next;
      });
      bumpVersion();
    },
    [scheduleSave]
  );

  const createDocument = useCallback(async (): Promise<string> => {
    const doc = blankDocument();
    // Save immediately (not debounced) so we get the real server ID back.
    const result = await client.mutate({
      mutation: SaveRateBuildupTemplateDocument,
      variables: docToVariables(doc, idRemap.current),
    });
    const saved = result.data?.saveRateBuildupTemplate;
    const realId = saved?._id ?? doc.id;
    if (realId !== doc.id) {
      idRemap.current.set(doc.id, realId);
    }
    setDocs((prev) => [...prev, doc]);
    return realId;
  }, [client]);

  const forkDocument = useCallback(
    async (sourceId: string): Promise<string | null> => {
      const source = docs.find((d) => d.id === sourceId);
      if (!source) return null;
      const forked: CanvasDocument = {
        ...source,
        id: `new_${Date.now()}`,
        label: `${source.label} (copy)`,
      };
      // Save immediately so we get the real server ID back.
      const result = await client.mutate({
        mutation: SaveRateBuildupTemplateDocument,
        variables: docToVariables(forked, idRemap.current),
      });
      const saved = result.data?.saveRateBuildupTemplate;
      const realId = saved?._id ?? forked.id;
      if (realId !== forked.id) {
        idRemap.current.set(forked.id, realId);
      }
      setDocs((prev) => [...prev, forked]);
      return realId;
    },
    [docs, client]
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      setDocs((prev) => {
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d.id !== id);
      });
      const timer = saveTimers.current.get(id);
      if (timer) { clearTimeout(timer); saveTimers.current.delete(id); }
      const serverId = idRemap.current.get(id) ?? id;
      if (!serverId.startsWith("new_")) {
        try {
          await client.mutate({
            mutation: DeleteRateBuildupTemplateDocument,
            variables: { id: serverId },
          });
        } catch (err) {
          console.error("[canvasStorage] delete failed", err);
        }
      }
    },
    [client]
  );

  const undo = useCallback(
    (docId: string) => {
      const stack = undoStacks.current.get(docId) ?? [];
      if (stack.length === 0) return;
      const previous = stack[stack.length - 1];
      undoStacks.current.set(docId, stack.slice(0, -1));
      setDocs((prev) => {
        const current = prev.find((d) => d.id === docId);
        if (current) {
          const redoStack = redoStacks.current.get(docId) ?? [];
          redoStacks.current.set(docId, [...redoStack, current]);
        }
        const next = prev.map((d) => (d.id === docId ? previous : d));
        scheduleSave(previous);
        return next;
      });
      bumpVersion();
    },
    [scheduleSave]
  );

  const redo = useCallback(
    (docId: string) => {
      const stack = redoStacks.current.get(docId) ?? [];
      if (stack.length === 0) return;
      const nextState = stack[stack.length - 1];
      redoStacks.current.set(docId, stack.slice(0, -1));
      setDocs((prev) => {
        const current = prev.find((d) => d.id === docId);
        if (current) {
          const undoStack = undoStacks.current.get(docId) ?? [];
          undoStacks.current.set(docId, [...undoStack, current]);
        }
        const next = prev.map((d) => (d.id === docId ? nextState : d));
        scheduleSave(nextState);
        return next;
      });
      bumpVersion();
    },
    [scheduleSave]
  );

  return {
    docs,
    loading,
    saveDocument,
    createDocument,
    forkDocument,
    deleteDocument,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
