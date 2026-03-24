import { TenderPricingSheet } from "@models";
import { TenderPricingSheetClass } from "../../../models/TenderPricingSheet/class";
import { Id } from "@typescript/models";
import {
  Arg,
  Authorized,
  Float,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
} from "type-graphql";
import {
  TenderPricingRowCreateData,
  TenderPricingRowUpdateData,
} from "./mutations";

@Resolver(() => TenderPricingSheetClass)
export default class TenderPricingSheetResolver {
  @Authorized(["ADMIN", "PM"])
  @Query(() => TenderPricingSheetClass, { nullable: true })
  async tenderPricingSheet(@Arg("tenderId", () => ID) tenderId: Id) {
    return TenderPricingSheet.getByTenderId(tenderId);
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
    @Arg("data") data: TenderPricingRowCreateData
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    sheet!.addRow(data);
    await sheet!.save();
    return sheet;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowUpdate(
    @Arg("sheetId", () => ID) sheetId: Id,
    @Arg("rowId", () => ID) rowId: Id,
    @Arg("data") data: TenderPricingRowUpdateData
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    sheet!.updateRow(rowId, data);
    await sheet!.save();
    return sheet;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderPricingSheetClass)
  async tenderPricingRowDelete(
    @Arg("sheetId", () => ID) sheetId: Id,
    @Arg("rowId", () => ID) rowId: Id
  ) {
    const sheet = await TenderPricingSheet.getById(sheetId, { throwError: true });
    sheet!.deleteRow(rowId);
    await sheet!.save();
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
}
