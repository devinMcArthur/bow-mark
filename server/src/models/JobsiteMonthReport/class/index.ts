import { JobsiteMonthReportDocument, JobsiteMonthReportModel } from "@models";
import { IJobsiteMonthReportBuild } from "@typescript/jobsiteMonthReport";
import { GetByIDOptions, Id } from "@typescript/models";
import { ObjectType } from "type-graphql";
import { JobsiteMonthReportSchema } from "../schema";
import build from "./build";
import generate from "./generate";
import get from "./get";
import update from "./update";

@ObjectType()
export class JobsiteMonthReportClass extends JobsiteMonthReportSchema {
  /**
   * ----- Get -----
   */

  public static async getById(
    this: JobsiteMonthReportModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async getByJobsiteAndDate(
    this: JobsiteMonthReportModel,
    jobsiteId: Id,
    date: Date
  ) {
    return get.byJobsiteAndDate(this, jobsiteId, date);
  }

  public static async getByDate(this: JobsiteMonthReportModel, date: Date) {
    return get.byDate(this, date);
  }

  public static async getByUpdateRequested(this: JobsiteMonthReportModel) {
    return get.byUpdateRequested(this);
  }

  public static async getByUpdatePending(this: JobsiteMonthReportModel) {
    return get.byUpdatePending(this);
  }

  public async getDayReports(this: JobsiteMonthReportDocument) {
    return get.dayReports(this);
  }

  public async getJobsite(this: JobsiteMonthReportDocument) {
    return get.jobsite(this);
  }

  public async getExcelName(this: JobsiteMonthReportDocument) {
    return get.excelName(this);
  }

  public async getExcelUrl(this: JobsiteMonthReportDocument) {
    return get.excelUrl(this);
  }

  /**
   * ----- Build -----
   */

  public static async requestBuild(
    this: JobsiteMonthReportModel,
    data: IJobsiteMonthReportBuild
  ) {
    return build.requestBuild(this, data);
  }

  /**
   * ----- Update -----
   */

  /**
   * @desc generates all reports, should only be used in the worker
   */
  public async updateAndSaveDocument(this: JobsiteMonthReportDocument) {
    return update.document(this);
  }

  /**
   * ----- Generate -----
   */

  public async generateExpenseInvoiceReports(this: JobsiteMonthReportDocument) {
    return generate.expenseInvoiceReports(this);
  }

  public async generateRevenueInvoiceReports(this: JobsiteMonthReportDocument) {
    return generate.revenueInvoiceReports(this);
  }

  public async generateSummary(this: JobsiteMonthReportDocument) {
    return generate.summary(this);
  }

  public async generateIssues(this: JobsiteMonthReportDocument) {
    return generate.issues(this);
  }

  public async generateExcel(this: JobsiteMonthReportDocument) {
    return generate.excel(this);
  }
}
