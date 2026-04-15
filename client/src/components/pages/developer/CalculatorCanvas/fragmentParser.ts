import { RateBuildupTemplateFullSnippetFragment } from "../../../../generated/graphql";
import {
  CanvasParameterDef,
  CanvasTableDef,
  CanvasFormulaStep,
  CanvasBreakdownDef,
  OutputDef,
  SpecialNodePositions,
} from "../../../../components/TenderPricing/calculators/types";
import type {
  CanvasDocument,
  GroupDef,
  ControllerDef,
} from "./canvasTypes";

/**
 * Convert a GraphQL RateBuildupTemplate fragment into a CanvasDocument.
 *
 * Handles:
 * - specialPositions arriving as JSON string OR typed object (fallback to defaults on parse error)
 * - groupDefs / controllerDefs arriving as typed sub-docs (post-migration) OR legacy JSON strings
 * - Deduplication of canvas defs by id, and memberIds within groups (protects against historic
 *   save bugs that duplicated entries)
 */
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

  let groupDefs: GroupDef[] = [];
  if (Array.isArray(f.groupDefs)) {
    groupDefs = f.groupDefs as GroupDef[];
  } else if (typeof f.groupDefs === "string") {
    try { groupDefs = JSON.parse(f.groupDefs); } catch { /* ignore */ }
  }
  groupDefs = groupDefs.map((g) => ({ ...g, memberIds: [...new Set(g.memberIds)] }));

  let controllerDefs: ControllerDef[] = [];
  if (Array.isArray(f.controllerDefs)) {
    controllerDefs = f.controllerDefs as ControllerDef[];
  } else if (typeof f.controllerDefs === "string") {
    try { controllerDefs = JSON.parse(f.controllerDefs); } catch { /* ignore */ }
  }

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
    unitVariants: (f.unitVariants ?? []).map(({ unit, activatesGroupId, conversionFormula }) => ({
      unit,
      activatesGroupId,
      conversionFormula: conversionFormula ?? undefined,
    })),
    updatedAt: f.updatedAt ?? undefined,
  };
}
