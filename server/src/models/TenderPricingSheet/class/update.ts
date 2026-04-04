import { Types } from "mongoose";
import { TenderPricingSheetDocument } from "@models";
import {
  IDocRef,
  ITenderPricingRowCreate,
  ITenderPricingRowUpdate,
  TenderPricingRowType,
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
  if (data.markupOverride !== undefined) row.markupOverride = data.markupOverride;
  if (data.calculatorInputsJson !== undefined) row.calculatorInputsJson = data.calculatorInputsJson;
  if (data.unitPrice !== undefined) row.unitPrice = data.unitPrice;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.calculatorType !== undefined) row.calculatorType = data.calculatorType;
  if (data.calculatorInputs !== undefined) row.calculatorInputs = data.calculatorInputs as any;
  if (data.rateBuildupSnapshot !== undefined) row.rateBuildupSnapshot = data.rateBuildupSnapshot ?? undefined;
  if (data.extraUnitPrice !== undefined) row.extraUnitPrice = data.extraUnitPrice;
  if (data.extraUnitPriceMemo !== undefined) row.extraUnitPriceMemo = data.extraUnitPriceMemo ?? undefined;

  sheet.updatedAt = new Date();
  return sheet;
};

const addDocRef = (
  sheet: TenderPricingSheetDocument,
  rowId: Id,
  data: IDocRef
): TenderPricingSheetDocument => {
  const row = sheet.rows.find((r) => r._id.toString() === rowId.toString()) as any;
  if (!row) throw new Error(`Row ${rowId} not found`);

  const refs: any[] = row.docRefs ?? [];
  const incomingId = data.enrichedFileId.toString();
  const isDuplicate = refs.some(
    (r) => r.enrichedFileId.toString() === incomingId && r.page === data.page
  );
  if (isDuplicate) return sheet; // server-side no-op; client shows message

  row.docRefs = [
    ...refs,
    {
      _id: new Types.ObjectId(),
      enrichedFileId: new Types.ObjectId(incomingId),
      page: data.page,
      ...(data.description !== undefined ? { description: data.description } : {}),
    },
  ];
  sheet.updatedAt = new Date();
  return sheet;
};

const removeDocRef = (
  sheet: TenderPricingSheetDocument,
  rowId: Id,
  docRefId: Id
): TenderPricingSheetDocument => {
  const row = sheet.rows.find((r) => r._id.toString() === rowId.toString()) as any;
  if (!row) throw new Error(`Row ${rowId} not found`);

  row.docRefs = (row.docRefs ?? []).filter(
    (r: any) => r._id.toString() !== docRefId.toString()
  );
  sheet.updatedAt = new Date();
  return sheet;
};

const updateDocRef = (
  sheet: TenderPricingSheetDocument,
  rowId: Id,
  docRefId: Id,
  description: string | null
): TenderPricingSheetDocument => {
  const row = sheet.rows.find((r) => r._id.toString() === rowId.toString()) as any;
  if (!row) throw new Error(`Row ${rowId} not found`);

  const ref = (row.docRefs ?? []).find((r: any) => r._id.toString() === docRefId.toString());
  if (!ref) return sheet;

  ref.description = description ?? undefined;
  sheet.updatedAt = new Date();
  return sheet;
};

const duplicateRow = (
  sheet: TenderPricingSheetDocument,
  rowId: Id
): TenderPricingSheetDocument => {
  const sourceIndex = sheet.rows.findIndex((r) => r._id.toString() === rowId.toString());
  if (sourceIndex === -1) throw new Error(`Row ${rowId} not found`);
  const src = sheet.rows[sourceIndex];

  const newRow: any = {
    _id: new Types.ObjectId(),
    type: src.type,
    sortOrder: 0,
    itemNumber: src.itemNumber,
    description: src.description,
    indentLevel: src.indentLevel,
    quantity: src.quantity,
    unit: src.unit,
    markupOverride: src.markupOverride,
    unitPrice: src.unitPrice,
    notes: src.notes,
    calculatorType: src.calculatorType,
    calculatorInputsJson: src.calculatorInputsJson,
    rateBuildupSnapshot: src.rateBuildupSnapshot,
    extraUnitPrice: src.extraUnitPrice,
    extraUnitPriceMemo: src.extraUnitPriceMemo,
    docRefs: ((src as any).docRefs ?? []).map((r: any) => ({ ...r, _id: new Types.ObjectId() })),
  };

  sheet.rows.splice(sourceIndex + 1, 0, newRow);
  sheet.rows.forEach((r, i) => { r.sortOrder = i; });
  sheet.updatedAt = new Date();
  return sheet;
};

const autoNumber = (
  sheet: TenderPricingSheetDocument
): TenderPricingSheetDocument => {
  let schedIdx = -1;
  let groupIdx = -1;
  let itemIdx = 0;

  for (const row of sheet.rows) {
    if (row.type === TenderPricingRowType.Schedule) {
      schedIdx++;
      groupIdx = -1;
      itemIdx = 0;
      row.itemNumber = String.fromCharCode(65 + schedIdx);
    } else if (row.type === TenderPricingRowType.Group) {
      groupIdx++;
      itemIdx = 0;
      const letter = schedIdx >= 0 ? String.fromCharCode(65 + schedIdx) : "";
      row.itemNumber = letter ? `${letter}.${groupIdx + 1}` : `${groupIdx + 1}`;
    } else {
      itemIdx++;
      const letter = schedIdx >= 0 ? String.fromCharCode(65 + schedIdx) : "";
      const groupPart = groupIdx >= 0 ? `.${groupIdx + 1}` : "";
      const prefix = letter + groupPart;
      row.itemNumber = prefix ? `${prefix}.${itemIdx}` : `${itemIdx}`;
    }
  }

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

export default { defaultMarkup, addRow, updateRow, deleteRow, reorderRows, duplicateRow, autoNumber, addDocRef, removeDocRef, updateDocRef };
