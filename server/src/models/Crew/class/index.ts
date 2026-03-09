import { Types } from "mongoose";

import { CrewDocument, CrewModel, VehicleDocument } from "@models";
import { ICrewCreate, ICrewUpdate } from "@typescript/crew";
import { GetByIDOptions, Id, ISearchOptions } from "@typescript/models";
import { ObjectType } from "type-graphql";
import { CrewSchema } from "../schema";
import create from "./create";
import get from "./get";
import remove from "./remove";
import update from "./update";

@ObjectType()
export class CrewClass extends CrewSchema {
  /**
   * ----- Get -----
   */

  public static async getById(
    this: CrewModel,
    id: Types.ObjectId | string,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async search(
    this: CrewModel,
    searchString: string,
    options?: ISearchOptions
  ) {
    return get.search(this, searchString, options);
  }

  public static async getList(this: CrewModel) {
    return get.list(this);
  }

  public static async getByVehicle(this: CrewModel, vehicle: VehicleDocument) {
    return get.byVehicle(this, vehicle);
  }

  public static async getPlaceholderCrew(this: CrewModel) {
    return get.placeholderCrew(this);
  }

  public static async getCrewLocations(
    this: CrewModel,
    startDate?: Date,
    endDate?: Date
  ) {
    return get.crewLocations(this, startDate, endDate);
  }

  public async getEmployees(this: CrewDocument) {
    return get.employees(this);
  }

  public async getVehicles(this: CrewDocument) {
    return get.vehicles(this);
  }

  public async getJobsites(this: CrewDocument) {
    return get.jobsites(this);
  }

  public async getDailyReports(this: CrewDocument) {
    return get.dailyReports(this);
  }

  public async getDailyReportsByMonth(this: CrewDocument, startOfMonth: Date) {
    return get.dailyReportsByMonth(this, startOfMonth);
  }

  /**
   * ----- Create -----
   */

  public static async createDocument(this: CrewModel, data: ICrewCreate) {
    return create.document(this, data);
  }

  /**
   * ----- Update -----
   */

  public async updateDocument(this: CrewDocument, data: ICrewUpdate) {
    return update.document(this, data);
  }

  public async addEmployee(this: CrewDocument, employeeId: Id) {
    return update.addEmployee(this, employeeId);
  }

  public async addVehicle(this: CrewDocument, vehicleId: Id) {
    return update.addVehicle(this, vehicleId);
  }

  public async archive(this: CrewDocument) {
    return update.archive(this);
  }

  /**
   * ----- Remove -----
   */

  public async removeEmployee(this: CrewDocument, employeeId: Id) {
    return remove.employee(this, employeeId);
  }

  public async removeVehicle(this: CrewDocument, vehicleId: Id) {
    return remove.vehicle(this, vehicleId);
  }
}
