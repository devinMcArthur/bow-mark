import { Types } from "mongoose";
import type { CrewKindDocument, CrewKindModel } from "@models";
import { ObjectType } from "type-graphql";
import { CrewKindSchema } from "../schema";
import { GetByIDOptions, IListOptions } from "@typescript/models";
import get from "./get";
import { ICrewKindCreate, ICrewKindUpdate } from "@typescript/crewKind";
import create from "./create";
import remove from "./remove";
import update from "./update";

@ObjectType()
export class CrewKindClass extends CrewKindSchema {
  /**
   * ----- GET -----
   */

  public static async getById(
    this: CrewKindModel,
    id: Types.ObjectId | string,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async getByName(this: CrewKindModel, name: string) {
    return get.byName(this, name);
  }

  public static async getList(
    this: CrewKindModel,
    options?: IListOptions<CrewKindDocument>
  ) {
    return get.list(this, options);
  }

  /**
   * ----- CREATE -----
   */

  public static async createDocument(
    this: CrewKindModel,
    data: ICrewKindCreate
  ) {
    return create.document(this, data);
  }

  /**
   * ----- UPDATE -----
   */

  public async updateDocument(this: CrewKindDocument, data: ICrewKindUpdate) {
    return update.document(this, data);
  }

  public async archive(this: CrewKindDocument) {
    return update.archive(this);
  }

  public async unarchive(this: CrewKindDocument) {
    return update.unarchive(this);
  }

  /**
   * ----- REMOVE -----
   */

  public async removeIfPossible(this: CrewKindDocument) {
    return remove.ifPossible(this);
  }

  public async canRemove(this: CrewKindDocument) {
    return remove.canRemove(this);
  }
}
