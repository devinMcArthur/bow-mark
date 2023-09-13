import {
  EmployeeDocument,
  OperatorDailyReportDocument,
  OperatorDailyReportModel,
  VehicleDocument,
} from "@models";
import { GetByIDOptions, IListOptions } from "@typescript/models";
import { IOperatorDailyReportCreate } from "@typescript/operatorDailyReport";
import { Types } from "mongoose";
import { ObjectType } from "type-graphql";
import { OperatorDailyReportSchema } from "../schema";
import create from "./create";
import generate from "./generate";
import get from "./get";
import validate from "./validate";

@ObjectType()
export class OperatorDailyReportClass extends OperatorDailyReportSchema {
  /**
   * ----- Get -----
   */

  public static async getById(
    this: OperatorDailyReportModel,
    id: Types.ObjectId | string,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async getList(
    this: OperatorDailyReportModel,
    options?: IListOptions<OperatorDailyReportDocument>
  ) {
    return get.list(this, options);
  }

  public async getVehicle(this: OperatorDailyReportDocument) {
    return get.vehicle(this);
  }

  public async getAuthor(this: OperatorDailyReportDocument) {
    return get.author(this);
  }

  public async getVehicleIssues(this: OperatorDailyReportDocument) {
    return get.vehicleIssues(this);
  }

  /**
   * ----- Create -----
   */

  public static async createDocument(
    this: OperatorDailyReportModel,
    vehicle: VehicleDocument,
    author: EmployeeDocument,
    data: IOperatorDailyReportCreate
  ) {
    return create.document(this, vehicle, author, data);
  }

  /**
   * --- Generate ---
   */

  public async generatePDF(this: OperatorDailyReportDocument) {
    return generate.pdf(this);
  }

  /**
   * ----- Validate -----
   */

  public async validateDocument(this: OperatorDailyReportDocument) {
    return validate.document(this);
  }
}
