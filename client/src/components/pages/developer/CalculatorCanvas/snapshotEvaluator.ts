import { RateBuildupOutputKind } from "../../../../generated/graphql";
import {
  RateEntry,
  EvaluatedOutput,
  CalculatorResult,
} from "../../../../components/TenderPricing/calculators/types";
import {
  evaluateTemplate,
  evaluateExpression,
} from "../../../../components/TenderPricing/calculators/evaluate";
import type {
  CanvasDocument,
  GroupDef,
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

  if (ctrl.type === "selector" || ctrl.type === "singleSelect") {
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
    else if (c.type === "selector" || c.type === "singleSelect")
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
 * Core evaluator shared by both the save path (evaluateSnapshot) and the live
 * preview path (RateBuildupInputs). Takes the decomposed pieces of a snapshot
 * rather than a RateBuildupSnapshot so that RateBuildupInputs — which holds
 * the pieces in local React state and has no snapshot to pass — can call it
 * without round-tripping through a snapshot object.
 *
 * Centralising this logic is deliberate: the two code paths used to duplicate
 * the quantity normalization, controller-context construction, and inactive
 * node computation. A prior divergence (empty `snapshot.controllers` combined
 * with a formula that referenced a controller id) caused the saved unit price
 * to silently differ from the displayed one — exactly the class of bug that
 * a single shared helper makes impossible by construction.
 *
 * Returns the CalculatorResult plus the intermediate values the preview path
 * needs for its debug panel and output rendering.
 */
export function evaluateCanvasDoc(
  doc: CanvasDocument,
  params: Record<string, number>,
  tables: Record<string, RateEntry[]>,
  controllers: Record<string, number | boolean | string[]>,
  rawQuantity: number,
  unit?: string
): {
  result: CalculatorResult;
  normalizedQuantity: number;
  controllerNumeric: Record<string, number>;
  inactiveNodeIds: Set<string>;
} {
  // 1. Normalize quantity via unit variant conversion formula (if any).
  //    Uses params[p.id] falling back to each param's defaultValue, matching
  //    the formula evaluation context defaults.
  let normalizedQuantity = rawQuantity;
  const variant = unit
    ? (doc.unitVariants ?? []).find((v) => v.unit === unit)
    : undefined;
  if (variant?.conversionFormula) {
    const ctx: Record<string, number> = { quantity: rawQuantity };
    for (const p of doc.parameterDefs) {
      ctx[p.id] = params[p.id] ?? p.defaultValue;
    }
    const converted = evaluateExpression(variant.conversionFormula, ctx);
    if (converted !== null && converted > 0) normalizedQuantity = converted;
  }

  // 2. Build controller numeric context from the template's controllerDefs.
  //    Every defined percentage/toggle controller gets a numeric entry, even
  //    when the caller's `controllers` map has no value for it — otherwise
  //    formula steps that reference the controller id by name crash inside
  //    expr-eval and safeEval collapses the whole step to 0. Unset entries
  //    fall back to the def's own defaultValue (not a hardcoded 0), matching
  //    how isGroupActive treats missing controllers.
  const controllerNumeric: Record<string, number> = {};
  for (const c of doc.controllerDefs ?? []) {
    const v = controllers[c.id];
    if (typeof v === "number") {
      controllerNumeric[c.id] = v;
    } else if (typeof v === "boolean") {
      controllerNumeric[c.id] = v ? 1 : 0;
    } else if (c.type === "percentage") {
      controllerNumeric[c.id] =
        typeof c.defaultValue === "number" ? c.defaultValue : 0;
    } else if (c.type === "toggle") {
      controllerNumeric[c.id] = c.defaultValue ? 1 : 0;
    }
    // selector/singleSelect controllers aren't numeric — skip. Their
    // activation is evaluated separately via isGroupActive.
  }

  // 3. Which nodes are inactive (inside groups whose activation evaluates
  //    to false, or on the wrong branch of a unit variant).
  const inactiveNodeIds = computeInactiveNodeIds(doc, controllers, unit);

  // 4. Evaluate the full template.
  const result = evaluateTemplate(
    doc,
    { params, tables },
    normalizedQuantity,
    controllerNumeric,
    inactiveNodeIds
  );

  return { result, normalizedQuantity, controllerNumeric, inactiveNodeIds };
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
  const { result } = evaluateCanvasDoc(
    doc,
    snapshot.params,
    snapshot.tables,
    snapshot.controllers ?? {},
    rawQuantity,
    unit
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
