import { CompanyDocument, CompanyModel } from "@models";
import { ICompanyCreate } from "@typescript/company";
import {
  GetByIDOptions,
  IListOptions,
  ISearchOptions,
} from "@typescript/models";
import { Types } from "mongoose";
import { ObjectType } from "type-graphql";
import { CompanySchema } from "../schema";
import create from "./create";
import get from "./get";

@ObjectType()
export class CompanyClass extends CompanySchema {
  /**
   * ----- GET -----
   */

  public static async getById(
    this: CompanyModel,
    id: Types.ObjectId | string,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async getByName(this: CompanyModel, name: string) {
    return get.byName(this, name);
  }

  public static async search(
    this: CompanyModel,
    searchString: string,
    options?: ISearchOptions
  ) {
    return get.search(this, searchString, options);
  }

  public static async getList(
    this: CompanyModel,
    options?: IListOptions<CompanyDocument>
  ) {
    return get.list(this, options);
  }

  /**
   * ----- CREATE -----
   */

  public static async createDocument(this: CompanyModel, data: ICompanyCreate) {
    return create.document(this, data);
  }
}
