import { Types } from "mongoose";
import { ObjectType } from "type-graphql";

import { EmployeeDocument, EmployeeModel } from "@models";
import { EmployeeSchema } from "../schema";
import get from "./get";
import { GetByIDOptions, IRatesData, ISearchOptions } from "@typescript/models";
import { IEmployeeCreate, IEmployeeUpdate } from "@typescript/employee";
import create from "./create";
import update from "./update";
import reports from "./reports";

@ObjectType()
export class EmployeeClass extends EmployeeSchema {
  /**
   * ----- Get -----
   */

  public static async getById(
    this: EmployeeModel,
    id: Types.ObjectId | string,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async search(
    this: EmployeeModel,
    searchString: string,
    options?: ISearchOptions
  ) {
    return get.search(this, searchString, options);
  }

  public static async getByName(this: EmployeeModel, name: string) {
    return get.byName(this, name);
  }

  public static async getList(this: EmployeeModel) {
    return get.list(this);
  }

  public async getUser(this: EmployeeDocument) {
    return get.user(this);
  }

  public async getCrews(this: EmployeeDocument) {
    return get.crews(this);
  }

  public async getSignup(this: EmployeeDocument) {
    return get.signup(this);
  }

  public async getRateForTime(this: EmployeeDocument, date: Date) {
    return get.rateForTime(this, date);
  }

  public async getHourReports(
    this: EmployeeDocument,
    startTime: Date,
    endTime: Date
  ) {
    return get.employeeHourReports(this, startTime, endTime);
  }

  /**
   * ----- Create -----
   */

  public static async createDocument(
    this: EmployeeModel,
    data: IEmployeeCreate
  ) {
    return create.document(this, data);
  }

  /**
   * ----- Update -----
   */

  public async updateDocument(this: EmployeeDocument, data: IEmployeeUpdate) {
    return update.document(this, data);
  }

  public async updateRates(this: EmployeeDocument, data: IRatesData[]) {
    return update.rates(this, data);
  }

  public async archive(this: EmployeeDocument) {
    return update.archive(this);
  }

  /**
   * ----- Reports -----
   */

  public async requestReportUpdate(this: EmployeeDocument) {
    return reports.requestUpdate(this);
  }
}
