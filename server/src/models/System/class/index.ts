import { SystemDocument, SystemModel } from "@models";
import { IDefaultRateData } from "@typescript/models";
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

  public async updateUnitDefaults(this: SystemDocument, units: string[]) {
    return update.unitDefaults(this, units);
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

  /**
   * ----- Validate -----
   */

  public static async validateSystem(this: SystemModel) {
    return validate.system(this);
  }
}