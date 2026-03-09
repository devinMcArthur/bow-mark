import { Types } from "mongoose";
import { MaterialDocument, MaterialModel } from "@models";
import { ObjectType } from "type-graphql";
import { MaterialSchema } from "../schema";
import {
  GetByIDOptions,
  IListOptions,
  ISearchOptions,
} from "@typescript/models";
import get from "./get";
import { IMaterialCreate, IMaterialUpdate } from "@typescript/material";
import create from "./create";
import remove from "./remove";
import update from "./update";

@ObjectType()
export class MaterialClass extends MaterialSchema {
  /**
   * ----- GET -----
   */

  public static async getById(
    this: MaterialModel,
    id: Types.ObjectId | string,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async getByName(this: MaterialModel, name: string) {
    return get.byName(this, name);
  }

  public static async search(
    this: MaterialModel,
    searchString: string,
    options?: ISearchOptions
  ) {
    return get.search(this, searchString, options);
  }

  public static async getList(
    this: MaterialModel,
    options?: IListOptions<MaterialDocument>
  ) {
    return get.list(this, options);
  }

  /**
   * ----- CREATE -----
   */

  public static async createDocument(
    this: MaterialModel,
    data: IMaterialCreate
  ) {
    return create.document(this, data);
  }

  /**
   * ----- Update -----
   */

  public async updateDocument(this: MaterialDocument, data: IMaterialUpdate) {
    return update.document(this, data);
  }

  public async archive(this: MaterialDocument) {
    return update.archive(this);
  }

  /**
   * ----- REMOVE -----
   */

  public async removeIfPossible(this: MaterialDocument) {
    return remove.ifPossible(this);
  }

  public async canRemove(this: MaterialDocument) {
    return remove.canRemove(this);
  }
}
