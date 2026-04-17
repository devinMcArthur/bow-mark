import { registerEnumType } from "type-graphql";
import { Types } from "mongoose";

export enum TenderPricingRowType {
  Schedule = "Schedule",
  Group = "Group",
  Item = "Item",
}
registerEnumType(TenderPricingRowType, { name: "TenderPricingRowType" });

/**
 * Discriminator for RateBuildupOutputDef (template) and RateBuildupOutputClass
 * (pricing row cached demand). Controls which ref field is populated and how
 * the Demand rollup groups values.
 */
export enum RateBuildupOutputKind {
  Material = "Material",
  CrewHours = "CrewHours",
}
registerEnumType(RateBuildupOutputKind, { name: "RateBuildupOutputKind" });

export interface IDocRef {
  enrichedFileId: string | Types.ObjectId;
  page: number;
  description?: string;
}

export interface ITenderPricingSheetCreate {
  tenderId: string | Types.ObjectId;
}

export interface ITenderPricingRowCreate {
  type: TenderPricingRowType;
  itemNumber: string;
  description: string;
  indentLevel: number;
  sortOrder: number;
}

export interface IRateBuildupSnapshotEntry {
  snapshot: string;
  memo?: string;
}

export interface IRateBuildupOutput {
  kind: RateBuildupOutputKind;
  materialId?: string;
  crewKindId?: string;
  unit: string;
  perUnitValue: number;
  totalValue: number;
}

export interface ITenderPricingRowUpdate {
  itemNumber?: string;
  description?: string;
  indentLevel?: number;
  quantity?: number;
  unit?: string;
  markupOverride?: number | null;
  unitPrice?: number | null;
  notes?: string;
  rateBuildupSnapshot?: string | null;
  rateBuildupSnapshots?: IRateBuildupSnapshotEntry[] | null;
  rateBuildupOutputs?: IRateBuildupOutput[] | null;
  extraUnitPrice?: number | null;
  extraUnitPriceMemo?: string | null;
  status?: string;
}
