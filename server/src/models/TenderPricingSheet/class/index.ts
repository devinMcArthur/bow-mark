import { ObjectType } from "type-graphql";
import { TenderPricingSheetDocument, TenderPricingSheetModel } from "@models";
import { Id, GetByIDOptions } from "@typescript/models";
import {
  ITenderPricingSheetCreate,
  ITenderPricingRowCreate,
  ITenderPricingRowUpdate,
} from "@typescript/tenderPricingSheet";
import { TenderPricingSheetSchema } from "../schema";
import get from "./get";
import create from "./create";
import update from "./update";

@ObjectType()
export class TenderPricingSheetClass extends TenderPricingSheetSchema {
  public static async getById(
    this: TenderPricingSheetModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async getByTenderId(
    this: TenderPricingSheetModel,
    tenderId: Id
  ) {
    return get.byTenderId(this, tenderId);
  }

  public static async createDocument(
    this: TenderPricingSheetModel,
    data: ITenderPricingSheetCreate
  ) {
    return create.document(this, data);
  }

  public async updateDefaultMarkup(
    this: TenderPricingSheetDocument,
    defaultMarkupPct: number
  ) {
    return update.defaultMarkup(this, defaultMarkupPct);
  }

  public async addRow(
    this: TenderPricingSheetDocument,
    data: ITenderPricingRowCreate
  ) {
    return update.addRow(this, data);
  }

  public async updateRow(
    this: TenderPricingSheetDocument,
    rowId: Id,
    data: ITenderPricingRowUpdate
  ) {
    return update.updateRow(this, rowId, data);
  }

  public async deleteRow(
    this: TenderPricingSheetDocument,
    rowId: Id
  ) {
    return update.deleteRow(this, rowId);
  }

  public async reorderRows(
    this: TenderPricingSheetDocument,
    rowIds: string[]
  ) {
    return update.reorderRows(this, rowIds);
  }
}
