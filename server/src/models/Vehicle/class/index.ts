import { Types } from "mongoose";
import { ObjectType } from "type-graphql";

import { VehicleDocument, VehicleModel } from "@models";
import { VehicleSchema } from "..";
import {
  GetByIDOptions,
  IListOptions,
  IRatesData,
  ISearchOptions,
} from "@typescript/models";
import get from "./get";
import { IVehicleCreate, IVehicleUpdate } from "@typescript/vehicle";
import create from "./create";
import update from "./update";
import reports from "./reports";

@ObjectType()
export class VehicleClass extends VehicleSchema {
  /**
   * ----- Get -----
   */

  public static async getById(
    this: VehicleModel,
    id: Types.ObjectId | string,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async search(
    this: VehicleModel,
    searchString: string,
    options?: ISearchOptions
  ) {
    return get.search(this, searchString, options);
  }

  public static async getByCode(this: VehicleModel, code: string) {
    return get.byCode(this, code);
  }

  public static async getList(
    this: VehicleModel,
    options?: IListOptions<VehicleDocument>
  ) {
    return get.list(this, options);
  }

  public async getCrews(this: VehicleDocument) {
    return get.crews(this);
  }

  public async getRateForTime(this: VehicleDocument, date: Date) {
    return get.rateForTime(this, date);
  }

  public async getOperatorDailyReports(this: VehicleDocument) {
    return get.operatorDailyReports(this);
  }

  public async getVehicleIssues(this: VehicleDocument) {
    return get.vehicleIssues(this);
  }

  public async getVehicleHourReports(this: VehicleDocument) {
    return get.vehicleHourReports(this);
  }

  /**
   * ----- Create -----
   */

  public static async createDocument(this: VehicleModel, data: IVehicleCreate) {
    return create.document(this, data);
  }

  /**
   * ----- Update -----
   */

  public async updateDocument(this: VehicleDocument, data: IVehicleUpdate) {
    return update.document(this, data);
  }

  public async updateRates(this: VehicleDocument, data: IRatesData[]) {
    return update.rates(this, data);
  }

  public async archive(this: VehicleDocument) {
    return update.archive(this);
  }

  public async unarchive(this: VehicleDocument) {
    return update.unarchive(this);
  }

  /**
   * ----- Reports -----
   */

  public async requestReportUpdate(this: VehicleDocument) {
    return reports.requestUpdate(this);
  }
}
