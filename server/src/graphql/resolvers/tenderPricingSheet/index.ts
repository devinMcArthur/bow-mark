import { TenderPricingSheet, TenderReview } from "@models";
import { TenderPricingSheetClass } from "../../../models/TenderPricingSheet/class";
import { Id } from "@typescript/models";
import {
  Arg,
  Authorized,
  Ctx,
  Float,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
} from "type-graphql";
import {
  TenderPricingRowCreateData,
  TenderPricingRowDocRefAddData,
  TenderPricingRowUpdateData,
} from "./mutations";
import { IContext } from "@typescript/graphql";
import { TRACKED_ROW_FIELDS } from "@typescript/tenderReview";

@Resolver(() => TenderPricingSheetClass)
export default class TenderPricingSheetResolver {
  @Authorized(["ADMIN", "PM"])
  @Query(() => TenderPricingSheetClass, { nullable: true })
  async tenderPricingSheet(@Arg("tenderId", () => ID) tenderId: Id) {
    return TenderPricingSheet.getByTenderId(tenderId);
  }

  @Authorized(["ADMIN", "PM"])
  @Query(() => String, { nullable: true })
  async tenderPricingRowSnapshot(
    @Arg("sheetId", () => ID) sheetId: Id,
    @Arg("rowId", () => ID) rowId: Id
  ): Promise<string | null> {
    const sheet = await TenderPricingSheet.findById(sheetId, { rows: { $elemMatch: { _id: rowId } } });
    const row = sheet?.rows?.[0];
    return row?.rateBuildupSnapshot ?? null;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingSheetCreate(@Arg("tenderId", () => ID) tenderId: Id) {
    const existing = await TenderPricingSheet.getByTenderId(tenderId);
    if (existing) return existing;

    const sheet = await TenderPricingSheet.createDocument({ tenderId });
    await sheet.save();
    return sheet;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingSheetUpdateMarkup(
    @Arg("id", () => ID) id: Id,
    @Arg("defaultMarkupPct", () => Float) defaultMarkupPct: number
  ) {
    const sheet = await TenderPricingSheet.getById(id, { throwError: true });
    sheet!.updateDefaultMarkup(defaultMarkupPct);
    await sheet!.save();
    return sheet;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowCreate(
    @Arg("sheetId", () => ID) sheetId: Id,
    @Arg("data") data: TenderPricingRowCreateData,
    @Ctx() ctx: IContext
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    sheet!.addRow(data);
    await sheet!.save();

    if (ctx.user) {
      const newRow = sheet!.rows[sheet!.rows.length - 1];
      await (TenderReview as any).addAuditEvent((sheet!.tender as any).toString(), {
        rowId: newRow._id.toString(),
        rowDescription: newRow.description ?? "",
        action: "row_added",
        changedFields: [],
        changedBy: ctx.user._id.toString(),
      });
    }

    return sheet;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowUpdate(
    @Arg("sheetId", () => ID) sheetId: Id,
    @Arg("rowId", () => ID) rowId: Id,
    @Arg("data") data: TenderPricingRowUpdateData,
    @Ctx() ctx: IContext
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    const row = sheet!.rows.find((r) => r._id.toString() === rowId.toString());
    sheet!.updateRow(rowId, data);
    await sheet!.save();

    if (ctx.user) {
      const changedFields = TRACKED_ROW_FIELDS.filter(
        (f) => (data as any)[f] !== undefined
      );
      if (changedFields.length > 0) {
        await (TenderReview as any).addAuditEvent((sheet!.tender as any).toString(), {
          rowId: rowId.toString(),
          rowDescription: row?.description ?? "",
          action: "row_updated",
          changedFields,
          changedBy: ctx.user._id.toString(),
          ...(((data as any).status) ? { statusTo: (data as any).status } : {}),
        });
      }
    }

    return sheet;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowDelete(
    @Arg("sheetId", () => ID) sheetId: Id,
    @Arg("rowId", () => ID) rowId: Id,
    @Ctx() ctx: IContext
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    const row = sheet!.rows.find((r) => r._id.toString() === rowId.toString());
    sheet!.deleteRow(rowId);
    await sheet!.save();

    if (ctx.user) {
      await (TenderReview as any).addAuditEvent((sheet!.tender as any).toString(), {
        rowId: rowId.toString(),
        rowDescription: row?.description ?? "",
        action: "row_deleted",
        changedFields: [],
        changedBy: ctx.user._id.toString(),
      });
    }

    return sheet;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowReorder(
    @Arg("sheetId", () => ID) sheetId: Id,
    @Arg("rowIds", () => [ID]) rowIds: string[]
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    sheet!.reorderRows(rowIds);
    await sheet!.save();
    return sheet;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowDuplicate(
    @Arg("sheetId", () => ID) sheetId: Id,
    @Arg("rowId", () => ID) rowId: Id
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    sheet!.duplicateRow(rowId);
    await sheet!.save();
    return sheet;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingSheetAutoNumber(
    @Arg("sheetId", () => ID) sheetId: Id
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    sheet!.autoNumber();
    await sheet!.save();
    return sheet;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowDocRefAdd(
    @Arg("sheetId", () => ID) sheetId: Id,
    @Arg("rowId", () => ID) rowId: Id,
    @Arg("data") data: TenderPricingRowDocRefAddData
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    sheet!.addDocRef(rowId, data);
    await sheet!.save();
    return sheet;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowDocRefRemove(
    @Arg("sheetId", () => ID) sheetId: Id,
    @Arg("rowId", () => ID) rowId: Id,
    @Arg("docRefId", () => ID) docRefId: Id
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    sheet!.removeDocRef(rowId, docRefId);
    await sheet!.save();
    return sheet;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowDocRefUpdate(
    @Arg("sheetId", () => ID) sheetId: Id,
    @Arg("rowId", () => ID) rowId: Id,
    @Arg("docRefId", () => ID) docRefId: Id,
    @Arg("description", () => String, { nullable: true }) description: string | null
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    sheet!.updateDocRef(rowId, docRefId, description);
    await sheet!.save();
    return sheet;
  }
}
