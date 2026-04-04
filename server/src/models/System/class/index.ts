import { SystemDocument, SystemModel } from "@models";
import { IDefaultRateData, IRatesData } from "@typescript/models";
import { ObjectType } from "type-graphql";
import { SystemSchema } from "../schema";
import create from "./create";
import get from "./get";
import update from "./update";
import validate from "./validate";

@ObjectType()
export class SystemClass extends SystemSchema {
  /**
   * ----- Get -----
   */

  public static async getSystem(this: SystemModel) {
    return get.system(this);
  }

  /**
   * ----- Create -----
   */

  public static async createDocument(this: SystemModel) {
    return create.document(this);
  }

  /**
   * ----- Update -----
   */

  public async updateUnitExtras(this: SystemDocument, units: string[]) {
    return update.unitExtras(this, units);
  }

  public async updateLaborTypes(this: SystemDocument, types: string[]) {
    return update.laborTypes(this, types);
  }

  public async updateFluidTypes(this: SystemDocument, types: string[]) {
    return update.fluidTypes(this, types);
  }

  public async updateCompanyVehicleTypeDefaults(
    this: SystemDocument,
    data: IDefaultRateData[]
  ) {
    return update.companyVehicleTypeDefaults(this, data);
  }

  public async updateMaterialShipmentVehicleTypeDefaults(
    this: SystemDocument,
    data: IDefaultRateData[]
  ) {
    return update.materialShipmentVehicleTypeDefaults(this, data);
  }

  public async updateInternalExpenseOverheadRate(
    this: SystemDocument,
    rates: IRatesData[]
  ) {
    return update.internalExpenseOverheadRate(this, rates);
  }

  /**
   * ----- Validate -----
   */

  public static async validateSystem(this: SystemModel) {
    return validate.system(this);
  }
}
