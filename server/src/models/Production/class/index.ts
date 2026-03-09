import { ProductionDocument, ProductionModel } from "@models";
import { GetByIDOptions, Id } from "@typescript/models";
import { IProductionCreate, IProductionUpdate } from "@typescript/production";
import { ObjectType } from "type-graphql";
import { ProductionSchema } from "..";
import create from "./create";
import get from "./get";
import remove from "./remove";
import update from "./update";

@ObjectType()
export class ProductionClass extends ProductionSchema {
  /**
   * ----- Get -----
   */

  public static async getById(
    this: ProductionModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public async getDailyReport(this: ProductionDocument) {
    return get.dailyReport(this);
  }

  /**
   * ----- Create -----
   */

  public static createDocument(this: ProductionModel, data: IProductionCreate) {
    return create.document(this, data);
  }

  /**
   * ----- Update -----
   */

  public async updateDocument(
    this: ProductionDocument,
    data: IProductionUpdate
  ) {
    return update.document(this, data);
  }

  public async updateDate(this: ProductionDocument, date: Date) {
    return update.date(this, date);
  }

  /**
   * ----- Remove -----
   */

  public async fullDelete(this: ProductionDocument) {
    return remove.fullDelete(this);
  }
}
