import { ObjectType } from "type-graphql";
import { Types } from "mongoose";

import { EmployeeWorkDocument, EmployeeWorkModel } from "@models";
import { EmployeeWorkSchema } from "..";
import get from "./get";
import { GetByIDOptions, Id } from "@typescript/models";
import update from "./update";
import {
  IEmployeeWorkCreate,
  IEmployeeWorkUpdate,
} from "@typescript/employeeWork";
import remove from "./remove";
import create from "./create";
import reports from "./reports";

@ObjectType()
export class EmployeeWorkClass extends EmployeeWorkSchema {
  /**
   * ----- Get -----
   */

  public static async getById(
    this: EmployeeWorkModel,
    id: Types.ObjectId | string,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public async getEmployee(this: EmployeeWorkDocument) {
    return get.employee(this);
  }

  public async getDailyReport(this: EmployeeWorkDocument) {
    return get.dailyReport(this);
  }

  /**
   * ----- Create -----
   */

  public static async createDocument(
    this: EmployeeWorkModel,
    data: IEmployeeWorkCreate
  ) {
    return create.document(this, data);
  }

  public static async createPerEmployee(
    this: EmployeeWorkModel,
    data: Omit<IEmployeeWorkCreate, "employeeId">,
    employees: Id[]
  ) {
    return create.perEmployee(this, data, employees);
  }

  /**
   * ----- Update -----
   */

  public async updateDocument(
    this: EmployeeWorkDocument,
    data: IEmployeeWorkUpdate
  ) {
    return update.document(this, data);
  }

  public async updateDate(this: EmployeeWorkDocument, date: Date) {
    return update.date(this, date);
  }

  public async archive(this: EmployeeWorkDocument) {
    return update.archive(this);
  }

  /**
   * ----- Remove -----
   */

  public async fullDelete(this: EmployeeWorkDocument) {
    return remove.fullDelete(this);
  }

  /**
   * ----- Reports -----
   */

  public async requestReportUpdate(this: EmployeeWorkDocument) {
    return reports.requestUpdate(this);
  }
}
