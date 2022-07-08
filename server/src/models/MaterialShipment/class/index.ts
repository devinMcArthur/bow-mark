import {
  DailyReportDocument,
  JobsiteMaterialDocument,
  MaterialShipmentDocument,
  MaterialShipmentModel,
} from "@models";
import {
  IMaterialShipmentCreate,
  IMaterialShipmentShipmentUpdate,
  IMaterialShipmentUpdate,
} from "@typescript/materialShipment";
import { GetByIDOptions, Id } from "@typescript/models";
import { ObjectType } from "type-graphql";
import { MaterialShipmentSchema } from "..";
import create from "./create";
import get from "./get";
import remove from "./remove";
import reports from "./reports";
import update from "./update";
import validate from "./validate";

@ObjectType()
export class MaterialShipmentClass extends MaterialShipmentSchema {
  /**
   * ----- Get -----
   */

  public static async getById(
    this: MaterialShipmentModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public async getVehicle(this: MaterialShipmentDocument) {
    return get.vehicle(this);
  }

  public async getDailyReport(this: MaterialShipmentDocument) {
    return get.dailyReport(this);
  }

  public async getJobsiteMaterial(this: MaterialShipmentDocument) {
    return get.jobsiteMaterial(this);
  }

  /**
   * ----- Create -----
   */

  public static async createDocument(
    this: MaterialShipmentModel,
    data: IMaterialShipmentCreate
  ) {
    return create.document(this, data);
  }

  /**
   * ----- Update -----
   */

  public async updateDocument(
    this: MaterialShipmentDocument,
    data: IMaterialShipmentUpdate
  ) {
    return update.document(this, data);
  }

  public async updateDate(this: MaterialShipmentDocument, date: Date) {
    return update.date(this, date);
  }

  public async updateJobsiteMaterial(
    this: MaterialShipmentDocument,
    jobsiteMaterial: JobsiteMaterialDocument,
    dailyReport: DailyReportDocument
  ) {
    return update.jobsiteMaterial(this, jobsiteMaterial, dailyReport);
  }

  public async updateShipment(
    this: MaterialShipmentDocument,
    shipment: IMaterialShipmentShipmentUpdate,
    dailyReport: DailyReportDocument
  ) {
    return update.shipment(this, shipment, dailyReport);
  }

  public async archive(this: MaterialShipmentDocument) {
    return update.archive(this);
  }

  /**
   * ----- Validate -----
   */

  public async validateDocument(this: MaterialShipmentDocument) {
    return validate.document(this);
  }

  /**
   * ----- Remove -----
   */

  public async fullDelete(this: MaterialShipmentDocument) {
    return remove.fullDelete(this);
  }

  /**
   * ----- Report -----
   */

  public async requestReportUpdate(this: MaterialShipmentDocument) {
    return reports.requestUpdate(this);
  }
}
