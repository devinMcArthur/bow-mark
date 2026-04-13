import { Types } from "mongoose";
import type { TenderPricingSheetDocument } from "@models";
import {
  IDocRef,
  IRateBuildupOutput,
  ITenderPricingRowCreate,
  ITenderPricingRowUpdate,
  RateBuildupOutputKind,
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
  if (data.unitPrice !== undefined) row.unitPrice = data.unitPrice;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.rateBuildupSnapshot !== undefined) row.rateBuildupSnapshot = data.rateBuildupSnapshot ?? undefined;
  if (data.rateBuildupOutputs !== undefined) {
    // null from "remove buildup" → clear the array. undefined → no-op.
    // Each output is validated for kind↔field consistency.
    const incoming = data.rateBuildupOutputs;
    if (incoming === null) {
      row.rateBuildupOutputs = [] as any;
    } else {
      for (const out of incoming) {
        if (out.kind === RateBuildupOutputKind.Material && out.crewKindId) {
          throw new Error("rateBuildupOutput kind 'Material' cannot have crewKindId");
        }
        if (out.kind === RateBuildupOutputKind.CrewHours && out.materialId) {
          throw new Error("rateBuildupOutput kind 'CrewHours' cannot have materialId");
        }
      }
      row.rateBuildupOutputs = incoming as any;
    }
  }
  if (data.extraUnitPrice !== undefined) row.extraUnitPrice = data.extraUnitPrice;
  if (data.extraUnitPriceMemo !== undefined) row.extraUnitPriceMemo = data.extraUnitPriceMemo ?? undefined;
  if (data.status !== undefined) row.status = data.status;

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
    rateBuildupSnapshot: src.rateBuildupSnapshot,
    rateBuildupOutputs: ((src.rateBuildupOutputs as IRateBuildupOutput[] | undefined) ?? []).filter(
      (out: IRateBuildupOutput) =>
        Object.values(RateBuildupOutputKind).includes(out.kind)
    ),
    extraUnitPrice: src.extraUnitPrice,
    extraUnitPriceMemo: src.extraUnitPriceMemo,
    status: src.status,
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

/**
 * Assign an itemNumber to ONLY the last row in the sheet (typically the row
 * that was just appended by addRow), without touching any existing row
 * numbers. This preserves any hand-typed numbers on prior rows.
 *
 * Implementation: snapshot existing numbers, run full autoNumber to compute
 * the new row's correct position-based number, then restore prior numbers.
 * Reusing the full algorithm avoids duplicating the Schedule/Group/Item
 * hierarchy logic.
 */
const autoNumberLastRow = (
  sheet: TenderPricingSheetDocument
): TenderPricingSheetDocument => {
  if (sheet.rows.length === 0) return sheet;

  const priorNumbers = sheet.rows.map((r) => r.itemNumber ?? "");
  autoNumber(sheet);
  for (let i = 0; i < sheet.rows.length - 1; i++) {
    sheet.rows[i].itemNumber = priorNumbers[i];
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

export default { defaultMarkup, addRow, updateRow, deleteRow, reorderRows, duplicateRow, autoNumber, autoNumberLastRow, addDocRef, removeDocRef, updateDocRef };
