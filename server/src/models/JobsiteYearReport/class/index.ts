import {
  JobsiteDayReportDocument,
  JobsiteDocument,
  JobsiteYearReportDocument,
  JobsiteYearReportModel,
} from "@models";
import { IJobsiteReportBuild } from "@typescript/jobsiteReports";
import { GetByIDOptions, Id } from "@typescript/models";
import { ObjectType } from "type-graphql";
import { JobsiteYearReportSchema } from "../schema";
import build from "./build";
import generate from "./generate";
import get from "./get";
import remove from "./remove";
import update from "./update";

@ObjectType()
export class JobsiteYearReportClass extends JobsiteYearReportSchema {
  /**
   * ----- Get -----
   */

  public static async getById(
    this: JobsiteYearReportModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async getByJobsiteAndDate(
    this: JobsiteYearReportModel,
    jobsiteId: Id,
    date: Date
  ) {
    return get.byJobsiteAndDate(this, jobsiteId, date);
  }

  public static async getByJobsite(
    this: JobsiteYearReportModel,
    jobsite: JobsiteDocument
  ) {
    return get.byJobsite(this, jobsite);
  }

  public static async getByDate(this: JobsiteYearReportModel, date: Date) {
    return get.byDate(this, date);
  }

  public static async getByUpdateRequested(this: JobsiteYearReportModel) {
    return get.byUpdateRequested(this);
  }

  public static async getByUpdatePending(this: JobsiteYearReportModel) {
    return get.byUpdatePending(this);
  }

  public static async getByJobsiteDayReport(
    this: JobsiteYearReportModel,
    jobsiteDayReport: JobsiteDayReportDocument
  ) {
    return get.byJobsiteDayReport(this, jobsiteDayReport);
  }

  public async getDayReports(this: JobsiteYearReportDocument) {
    return get.dayReports(this);
  }

  public async getLastDayReport(this: JobsiteYearReportDocument) {
    return get.lastDayReport(this);
  }

  public async getReportNotes(this: JobsiteYearReportDocument) {
    return get.reportNotes(this);
  }

  public async getJobsite(this: JobsiteYearReportDocument) {
    return get.jobsite(this);
  }

  public async getExcelName(this: JobsiteYearReportDocument) {
    return get.excelName(this);
  }

  public async getExcelUrl(this: JobsiteYearReportDocument) {
    return get.excelUrl(this);
  }

  /**
   * ----- Build -----
   */

  public static async requestBuild(
    this: JobsiteYearReportModel,
    data: IJobsiteReportBuild
  ) {
    return build.staticRequestBuild(this, data);
  }

  public async requestBuild(this: JobsiteYearReportDocument) {
    return build.requestBuild(this);
  }

  /**
   * ----- Update -----
   */

  /**
   * @desc generates all reports, should only be used in the worker
   */
  public async updateAndSaveDocument(this: JobsiteYearReportDocument) {
    return update.document(this);
  }

  /**
   * ----- Generate -----
   */

  public async generateExpenseInvoiceReports(this: JobsiteYearReportDocument) {
    return generate.expenseInvoiceReports(this);
  }

  public async generateRevenueInvoiceReports(this: JobsiteYearReportDocument) {
    return generate.revenueInvoiceReports(this);
  }

  public async generateSummary(this: JobsiteYearReportDocument) {
    return generate.summary(this);
  }

  public async generateIssues(this: JobsiteYearReportDocument) {
    return generate.issues(this);
  }

  public async generateExcel(this: JobsiteYearReportDocument) {
    return generate.excel(this);
  }

  /**
   * ----- Remove -----
   */

  public async removeFull(this: JobsiteYearReportDocument) {
    return remove.full(this);
  }

  public async removeDayReport(
    this: JobsiteYearReportDocument,
    jobsiteDayReport: JobsiteDayReportDocument
  ) {
    return remove.dayReport(this, jobsiteDayReport);
  }
}
