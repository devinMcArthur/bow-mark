import {
  InvoiceDocument,
  JobsiteMaterialDocument,
  JobsiteMaterialModel,
} from "@models";
import {
  IJobsiteMaterialCreate,
  IJobsiteMaterialUpdate,
  IRateScenarioData,
} from "@typescript/jobsiteMaterial";
import { GetByIDOptions, Id } from "@typescript/models";
import { ObjectType } from "type-graphql";
import { JobsiteMaterialSchema } from "../schema";
import create from "./create";
import get from "./get";
import remove from "./remove";
import reports from "./reports";
import update from "./update";
import validate from "./validate";

@ObjectType()
export class JobsiteMaterialClass extends JobsiteMaterialSchema {
  /**
   * ----- GET -----
   */

  public static async getById(
    this: JobsiteMaterialModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async getByMaterial(
    this: JobsiteMaterialModel,
    materialId: Id
  ) {
    return get.byMaterial(this, materialId);
  }

  public static async getByCompany(this: JobsiteMaterialModel, companyId: Id) {
    return get.byCompany(this, companyId);
  }

  public async getMaterial(this: JobsiteMaterialDocument) {
    return get.material(this);
  }

  public async getSupplier(this: JobsiteMaterialDocument) {
    return get.supplier(this);
  }

  public async getJobsite(this: JobsiteMaterialDocument) {
    return get.jobsite(this);
  }

  public async getMaterialShipments(this: JobsiteMaterialDocument) {
    return get.materialShipments(this);
  }

  public async getCompletedQuantity(this: JobsiteMaterialDocument) {
    return get.completedQuantity(this);
  }

  public async getRateForTime(this: JobsiteMaterialDocument, date: Date) {
    return get.rateForTime(this, date);
  }

  public async getInvoices(this: JobsiteMaterialDocument) {
    return get.invoices(this);
  }

  public async getInvoiceMonthRate(
    this: JobsiteMaterialDocument,
    dayInMonth: Date
  ) {
    return get.invoiceMonthRate(this, dayInMonth);
  }

  /**
   * ----- Create -----
   */

  public static async createDocument(
    this: JobsiteMaterialModel,
    data: IJobsiteMaterialCreate
  ) {
    return create.document(this, data);
  }

  /**
   * ----- Update -----
   */

  public async updateDocument(
    this: JobsiteMaterialDocument,
    data: IJobsiteMaterialUpdate
  ) {
    return update.document(this, data);
  }

  public async addInvoice(
    this: JobsiteMaterialDocument,
    invoice: InvoiceDocument
  ) {
    return update.addInvoice(this, invoice);
  }

  public async addScenario(
    this: JobsiteMaterialDocument,
    data: IRateScenarioData
  ) {
    return update.addScenario(this, data);
  }

  public async updateScenario(
    this: JobsiteMaterialDocument,
    scenarioId: string,
    data: IRateScenarioData
  ) {
    return update.updateScenario(this, scenarioId, data);
  }

  public async removeScenario(
    this: JobsiteMaterialDocument,
    scenarioId: string
  ) {
    return update.removeScenario(this, scenarioId);
  }

  /**
   * ----- Validate -----
   */

  public async validateDocument(this: JobsiteMaterialDocument) {
    return validate.document(this);
  }

  /**
   * ----- Remove -----
   */

  public async canRemove(this: JobsiteMaterialDocument) {
    return remove.canRemove(this);
  }

  public async removeIfPossible(this: JobsiteMaterialDocument) {
    return remove.ifPossible(this);
  }

  /**
   * ----- Report -----
   */

  public async requestReportUpdate(this: JobsiteMaterialDocument) {
    return reports.requestUpdate(this);
  }
}
