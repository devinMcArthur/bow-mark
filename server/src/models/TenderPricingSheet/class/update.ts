import { Types } from "mongoose";
import { TenderPricingSheetDocument } from "@models";
import {
  ITenderPricingRowCreate,
  ITenderPricingRowUpdate,
} from "@typescript/tenderPricingSheet";
import { Id } from "@typescript/models";

const defaultMarkup = (
  sheet: TenderPricingSheetDocument,
  defaultMarkupPct: number
): TenderPricingSheetDocument => {
  sheet.defaultMarkupPct = defaultMarkupPct;
  sheet.updatedAt = new Date();
  return sheet;
};

const addRow = (
  sheet: TenderPricingSheetDocument,
  data: ITenderPricingRowCreate
): TenderPricingSheetDocument => {
  sheet.rows.push({
    _id: new Types.ObjectId(),
    ...data,
    truckingUP: 0,
    materialUP: 0,
    crewUP: 0,
    rentalUP: 0,
  } as any);
  sheet.updatedAt = new Date();
  return sheet;
};

const updateRow = (
  sheet: TenderPricingSheetDocument,
  rowId: Id,
  data: ITenderPricingRowUpdate
): TenderPricingSheetDocument => {
  const row = sheet.rows.find((r) => r._id.toString() === rowId.toString());
  if (!row) throw new Error(`Row ${rowId} not found`);

  if (data.itemNumber !== undefined) row.itemNumber = data.itemNumber;
  if (data.description !== undefined) row.description = data.description;
  if (data.indentLevel !== undefined) row.indentLevel = data.indentLevel;
  if (data.quantity !== undefined) row.quantity = data.quantity;
  if (data.unit !== undefined) row.unit = data.unit;
  if (data.subcontractorUP !== undefined) row.subcontractorUP = data.subcontractorUP;
  if (data.truckingUP !== undefined) row.truckingUP = data.truckingUP;
  if (data.materialUP !== undefined) row.materialUP = data.materialUP;
  if (data.crewUP !== undefined) row.crewUP = data.crewUP;
  if (data.rentalUP !== undefined) row.rentalUP = data.rentalUP;
  if (data.markupOverride !== undefined) row.markupOverride = data.markupOverride;
  if (data.calculatorInputsJson !== undefined) row.calculatorInputsJson = data.calculatorInputsJson;
  if (data.unitPrice !== undefined) row.unitPrice = data.unitPrice;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.calculatorType !== undefined) row.calculatorType = data.calculatorType;
  if (data.calculatorInputs !== undefined) row.calculatorInputs = data.calculatorInputs as any;

  sheet.updatedAt = new Date();
  return sheet;
};

const deleteRow = (
  sheet: TenderPricingSheetDocument,
  rowId: Id
): TenderPricingSheetDocument => {
  sheet.rows = sheet.rows.filter(
    (r) => r._id.toString() !== rowId.toString()
  ) as any;
  sheet.updatedAt = new Date();
  return sheet;
};

const reorderRows = (
  sheet: TenderPricingSheetDocument,
  rowIds: string[]
): TenderPricingSheetDocument => {
  const rowMap = new Map(sheet.rows.map((r) => [r._id.toString(), r]));
  const reordered = rowIds
    .map((id, index) => {
      const row = rowMap.get(id);
      if (!row) throw new Error(`Row ${id} not found`);
      row.sortOrder = index;
      return row;
    });
  sheet.rows = reordered as any;
  sheet.updatedAt = new Date();
  return sheet;
};

export default { defaultMarkup, addRow, updateRow, deleteRow, reorderRows };
