import { Types } from "mongoose";
import { ObjectType } from "type-graphql";

import {
  CrewDocument,
  InvoiceDocument,
  JobsiteDocument,
  JobsiteMaterialDocument,
  JobsiteModel,
  SystemDocument,
} from "@models";
import {
  IJobsiteContract,
  IJobsiteCreate,
  IJobsiteFileObject,
  IJobsiteUpdate,
  ITruckingTypeRateData,
} from "@typescript/jobsite";
import {
  GetByIDOptions,
  Id,
  IListOptions,
  ISearchOptions,
} from "@typescript/models";
import { JobsiteSchema } from "..";
import create from "./create";
import get, {
  IJobsiteGetDailyReportOptions,
  IJobsiteGetInvoicesOptions,
} from "./get";
import interact from "./interact";
import remove from "./remove";
import update from "./update";

@ObjectType()
export class JobsiteClass extends JobsiteSchema {
  /**
   * ----- Get -----
   */

  public static async getById(
    this: JobsiteModel,
    id: Types.ObjectId | string,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async search(
    this: JobsiteModel,
    searchString: string,
    options?: ISearchOptions
  ) {
    return get.search(this, searchString, options);
  }

  public static async getList(
    this: JobsiteModel,
    options?: IListOptions<JobsiteDocument>
  ) {
    return get.list(this, options);
  }

  public static async getByCrew(this: JobsiteModel, crew: CrewDocument) {
    return get.byCrew(this, crew);
  }

  public async getCrews(this: JobsiteDocument) {
    return get.crews(this);
  }

  public async getDailyReports(
    this: JobsiteDocument,
    options?: IJobsiteGetDailyReportOptions
  ) {
    return get.dailyReports(this, options);
  }

  public async getMaterials(this: JobsiteDocument) {
    return get.materials(this);
  }

  public async getExpenseInvoices(
    this: JobsiteDocument,
    options?: IJobsiteGetInvoicesOptions
  ) {
    return get.expenseInvoices(this, options);
  }

  public async getRevenueInvoices(
    this: JobsiteDocument,
    options?: IJobsiteGetInvoicesOptions
  ) {
    return get.revenueInvoices(this, options);
  }

  public async getNonCostedMaterialShipments(
    this: JobsiteDocument,
    dateRange?: { startTime: Date; endTime: Date }
  ) {
    return get.nonCostedMaterialShipments(this, dateRange);
  }

  public async getDayReports(this: JobsiteDocument) {
    return get.dayReports(this);
  }

  public async getMonthReports(this: JobsiteDocument) {
    return get.monthReports(this);
  }

  public async getYearReports(this: JobsiteDocument) {
    return get.yearReports(this);
  }

  /**
   * ----- Create -----
   */

  public static async createDocument(this: JobsiteModel, data: IJobsiteCreate) {
    return create.document(this, data);
  }

  /**
   * ----- Update -----
   */

  public async updateDocument(this: JobsiteDocument, data: IJobsiteUpdate) {
    return update.document(this, data);
  }

  public async addMaterial(
    this: JobsiteDocument,
    jobsiteMaterial: JobsiteMaterialDocument
  ) {
    return update.addMaterial(this, jobsiteMaterial);
  }

  public async addExpenseInvoice(
    this: JobsiteDocument,
    invoice: InvoiceDocument
  ) {
    return update.addExpenseInvoice(this, invoice);
  }

  public async addRevenueInvoice(
    this: JobsiteDocument,
    invoice: InvoiceDocument
  ) {
    return update.addRevenueInvoice(this, invoice);
  }

  public async updateContract(
    this: JobsiteDocument,
    contractData: IJobsiteContract
  ) {
    return update.contract(this, contractData);
  }

  public async updateWorkOnHand(this: JobsiteDocument) {
    return update.workOnHand(this);
  }

  public async setTruckingRates(
    this: JobsiteDocument,
    truckingRates: ITruckingTypeRateData[]
  ) {
    return update.truckingRates(this, truckingRates);
  }

  public async setTruckingRatesToDefault(
    this: JobsiteDocument,
    system: SystemDocument
  ) {
    return update.setTruckingRatesToDefault(this, system);
  }

  public static async setAllEmptyTruckingRates(this: JobsiteModel) {
    return update.setAllEmptyTruckingRates(this);
  }

  public static async addTruckingRateToAll(
    this: JobsiteModel,
    systemItemIndex: number,
    systemRateIndex: number
  ) {
    return update.addTruckingRateToAll(this, systemItemIndex, systemRateIndex);
  }

  public async addFileObject(
    this: JobsiteDocument,
    fileObject: IJobsiteFileObject
  ) {
    return update.addFileObject(this, fileObject);
  }

  public async archive(this: JobsiteDocument) {
    return update.archive(this);
  }

  public async unarchive(this: JobsiteDocument) {
    return update.unarchive(this);
  }

  /**
   * ----- Remove -----
   */

  public async removeDocument(this: JobsiteDocument, transferJobsiteId?: Id) {
    return remove.document(this, transferJobsiteId);
  }

  public async removeFileObject(this: JobsiteDocument, fileObjectId: Id) {
    return remove.fileObject(this, fileObjectId);
  }

  /**
   * ----- Interact -----
   */

  public async requestGenerateDayReports(this: JobsiteDocument) {
    return interact.requestGenerateDayReports(this);
  }

  public async requestGenerateMonthReports(this: JobsiteDocument) {
    return interact.requestGenerateMonthReports(this);
  }

  public async requestGenerateYearReports(this: JobsiteDocument) {
    return interact.requestGenerateYearReports(this);
  }
}
