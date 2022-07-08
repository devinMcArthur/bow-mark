import {
  DailyReportDocument,
  EmployeeDocument,
  JobsiteDayReportDocument,
  JobsiteDayReportModel,
  JobsiteDocument,
  VehicleDocument,
} from "@models";
import { Id } from "@typescript/models";
import { ObjectType } from "type-graphql";
import { JobsiteDayReportSchema } from "../schema";
import build from "./build";
import create from "./create";
import generate from "./generate";
import get from "./get";
import update from "./update";

@ObjectType()
export class JobsiteDayReportClass extends JobsiteDayReportSchema {
  /**
   * ----- Get -----
   */

  public static async getByJobsite(
    this: JobsiteDayReportModel,
    jobsite: JobsiteDocument
  ) {
    return get.byJobsite(this, jobsite);
  }

  public static async getByJobsiteAndYear(
    this: JobsiteDayReportModel,
    jobsiteId: Id,
    date: Date
  ) {
    return get.byJobsiteAndYear(this, jobsiteId, date);
  }

  public static async getByJobsiteAndMonth(
    this: JobsiteDayReportModel,
    jobsiteId: Id,
    date: Date
  ) {
    return get.byJobsiteAndMonth(this, jobsiteId, date);
  }

  public static async getByJobsiteAndDay(
    this: JobsiteDayReportModel,
    jobsiteId: Id,
    day: Date
  ) {
    return get.byJobsiteAndDay(this, jobsiteId, day);
  }

  public static async getByDateRange(
    this: JobsiteDayReportModel,
    startTime: Date,
    endTime: Date
  ) {
    return get.byDateRange(this, startTime, endTime);
  }

  public static async getByEmployee(
    this: JobsiteDayReportModel,
    employee: EmployeeDocument
  ) {
    return get.byEmployee(this, employee);
  }

  public static async getByVehicle(
    this: JobsiteDayReportModel,
    vehicle: VehicleDocument
  ) {
    return get.byVehicle(this, vehicle);
  }

  public static async getByUpdateRequested(this: JobsiteDayReportModel) {
    return get.byUpdateRequested(this);
  }

  public static async getByUpdatePending(this: JobsiteDayReportModel) {
    return get.byUpdatePending(this);
  }

  public async getJobsite(this: JobsiteDayReportDocument) {
    return get.jobsite(this);
  }

  /**
   * ----- Build -----
   */

  public static async requestBuildAllForJobsite(
    this: JobsiteDayReportModel,
    jobsite: JobsiteDocument
  ) {
    return build.allForJobsite(this, jobsite);
  }

  public static async requestBuildForJobsiteDay(
    this: JobsiteDayReportModel,
    jobsite: JobsiteDocument,
    day: Date
  ) {
    return build.forJobsiteDay(this, jobsite, day);
  }

  /**
   * ----- Create -----
   */

  public static async createDocument(
    this: JobsiteDayReportModel,
    jobsite: JobsiteDocument,
    date: Date
  ) {
    return create.document(this, jobsite, date);
  }

  /**
   * ----- Update -----
   */

  public async updateAndSaveDocument(this: JobsiteDayReportDocument) {
    return update.document(this);
  }

  public async requestUpdate(this: JobsiteDayReportDocument) {
    return update.requestUpdate(this);
  }

  /**
   * ----- Generate -----
   */

  public async generateReports(this: JobsiteDayReportDocument) {
    return generate.reports(this);
  }

  public async generateEmployeeReports(
    this: JobsiteDayReportDocument,
    dailyReports?: DailyReportDocument[]
  ) {
    return generate.employeeReports(this, dailyReports);
  }

  public async generateVehicleReports(
    this: JobsiteDayReportDocument,
    dailyReports?: DailyReportDocument[]
  ) {
    return generate.vehicleReports(this, dailyReports);
  }

  public async generateMaterialReports(
    this: JobsiteDayReportDocument,
    dailyReports?: DailyReportDocument[]
  ) {
    return generate.materialReports(this, dailyReports);
  }

  public async generateNonCostedMaterialReports(
    this: JobsiteDayReportDocument,
    dailyReports?: DailyReportDocument[]
  ) {
    return generate.nonCostedMaterialReports(this, dailyReports);
  }

  public async generateTruckingReports(
    this: JobsiteDayReportDocument,
    dailyReports?: DailyReportDocument[]
  ) {
    return generate.truckingReports(this, dailyReports);
  }

  public async generateSummaryReports(this: JobsiteDayReportDocument) {
    return generate.summaryReport(this);
  }

  public async generateCrewTypes(this: JobsiteDayReportDocument) {
    return generate.crewTypes(this);
  }
}
