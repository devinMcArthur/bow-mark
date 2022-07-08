import {
  JobsiteYearMasterReportDocument,
  JobsiteYearMasterReportModel,
} from "@models";
import { GetByIDOptions, Id } from "@typescript/models";
import { ObjectType } from "type-graphql";
import { JobsiteYearMasterReportSchema } from "../schema";
import build from "./build";
import generate from "./generate";
import get from "./get";
import update from "./update";

@ObjectType()
export class JobsiteYearMasterReportClass extends JobsiteYearMasterReportSchema {
  /**
   * ----- Get -----
   */

  public static async getById(
    this: JobsiteYearMasterReportModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async getByDate(
    this: JobsiteYearMasterReportModel,
    date: Date
  ) {
    return get.byDate(this, date);
  }

  public static async getByUpdateRequested(this: JobsiteYearMasterReportModel) {
    return get.byUpdateRequested(this);
  }

  public static async getByUpdatePending(this: JobsiteYearMasterReportModel) {
    return get.byUpdatePending(this);
  }

  public async getExcelName(this: JobsiteYearMasterReportDocument) {
    return get.excelName(this);
  }

  public async getExcelUrl(this: JobsiteYearMasterReportDocument) {
    return get.excelUrl(this);
  }

  /**
   * ----- Build -----
   */

  public static async requestBuild(
    this: JobsiteYearMasterReportModel,
    date: Date
  ) {
    return build.requestBuild(this, date);
  }

  /**
   * ----- Update -----
   */

  public async updateAndSaveDocument(this: JobsiteYearMasterReportDocument) {
    return update.document(this);
  }

  /**
   * ----- Generate -----
   */

  public async generateFull(this: JobsiteYearMasterReportDocument) {
    return generate.full(this);
  }

  public async generateExcel(this: JobsiteYearMasterReportDocument) {
    return generate.excel(this);
  }
}
