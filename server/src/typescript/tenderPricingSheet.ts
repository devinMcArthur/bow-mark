import { registerEnumType } from "type-graphql";
import { Types } from "mongoose";

export enum TenderPricingRowType {
  Schedule = "Schedule",
  Group = "Group",
  Item = "Item",
}
registerEnumType(TenderPricingRowType, { name: "TenderPricingRowType" });

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
  extraUnitPrice?: number | null;
  extraUnitPriceMemo?: string | null;
}
