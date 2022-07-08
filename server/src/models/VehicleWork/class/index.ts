import { VehicleWorkDocument, VehicleWorkModel } from "@models";
import { GetByIDOptions, Id } from "@typescript/models";
import {
  IVehicleWorkCreate,
  IVehicleWorkUpdate,
} from "@typescript/vehicleWork";
import { ObjectType } from "type-graphql";
import { VehicleWorkSchema } from "..";
import create from "./create";
import get from "./get";
import remove from "./remove";
import reports from "./reports";
import update from "./update";

@ObjectType()
export class VehicleWorkClass extends VehicleWorkSchema {
  /**
   * ----- Get -----
   */

  public static async getById(
    this: VehicleWorkModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public async getVehicle(this: VehicleWorkDocument) {
    return get.vehicle(this);
  }

  public async getDailyReport(this: VehicleWorkDocument) {
    return get.dailyReport(this);
  }

  /**
   * ----- Create -----
   */

  public static async createDocument(
    this: VehicleWorkModel,
    data: IVehicleWorkCreate
  ) {
    return create.document(this, data);
  }

  public static async createPerVehicle(
    this: VehicleWorkModel,
    data: Omit<IVehicleWorkCreate, "vehicleId">,
    vehicles: Id[]
  ) {
    return create.perVehicle(this, data, vehicles);
  }

  /**
   * ----- Update -----
   */

  public async updateDocument(
    this: VehicleWorkDocument,
    data: IVehicleWorkUpdate
  ) {
    return update.document(this, data);
  }

  public async archive(this: VehicleWorkDocument) {
    return update.archive(this);
  }

  /**
   * ----- Remove -----
   */

  public async fullDelete(this: VehicleWorkDocument) {
    return remove.fullDelete(this);
  }

  /**
   * ----- Reports -----
   */

  public async requestReportUpdate(this: VehicleWorkDocument) {
    return reports.requestUpdate(this);
  }
}
