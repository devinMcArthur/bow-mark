import { SignupDocument, SignupModel } from "@models";
import { GetByIDOptions, Id } from "@typescript/models";
import { ObjectType } from "type-graphql";
import { SignupSchema } from "../schema";
import create from "./create";
import get from "./get";
import remove from "./remove";

@ObjectType()
export class SignupClass extends SignupSchema {
  /**
   * ----- Get -----
   */

  public static async getById(
    this: SignupModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async getByEmployee(this: SignupModel, employeeId: Id) {
    return get.byEmployee(this, employeeId);
  }

  public async getEmployee(this: SignupDocument) {
    return get.employee(this);
  }

  /**
   * ----- Create -----
   */

  public static async createDocument(this: SignupModel, employeeId: Id) {
    return create.document(this, employeeId);
  }

  /**
   * ----- Remove -----
   */

  public async removeDocument(this: SignupDocument) {
    return remove.document(this);
  }
}
