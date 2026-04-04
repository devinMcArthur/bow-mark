import { registerEnumType } from "type-graphql";
import { Types } from "mongoose";

export enum TenderPricingRowType {
  Schedule = "Schedule",
  Group = "Group",
  Item = "Item",
}
registerEnumType(TenderPricingRowType, { name: "TenderPricingRowType" });

export enum TenderWorkType {
  Paving = "Paving",
  Toplift = "Toplift",
  Gravel = "Gravel",
  SubgradePrep = "SubgradePrep",
  CommonExcavation = "CommonExcavation",
  Concrete = "Concrete",
}
registerEnumType(TenderWorkType, { name: "TenderWorkType" });

export interface ITenderCrewEntry {
  role: string;
  quantity: number;
  ratePerHour: number;
}

export interface ITenderEquipEntry {
  name: string;
  quantity: number;
  ratePerHour: number;
}

export interface ITenderCalculatorInputs {
  productionRate?: number;
  crew?: ITenderCrewEntry[];
  equipment?: ITenderEquipEntry[];
  depth_mm?: number;
  density?: number;
  materialCostPerUnit?: number;
  truckingMethod?: "perTonne" | "perHour";
  truckingRatePerTonne?: number;
  numTrucks?: number;
  truckingRatePerHour?: number;
  [key: string]: unknown;
}

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
  calculatorInputsJson?: string;
  unitPrice?: number | null;
  notes?: string;
  calculatorType?: TenderWorkType;
  calculatorInputs?: ITenderCalculatorInputs;
  rateBuildupSnapshot?: string | null;
  extraUnitPrice?: number | null;
  extraUnitPriceMemo?: string | null;
}
