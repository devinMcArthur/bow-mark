import { ObjectType } from "type-graphql";
import { TenderDocument, TenderModel } from "@models";
import { Id, GetByIDOptions } from "@typescript/models";
import { ITenderCreate, ITenderUpdate } from "@typescript/tender";
import { TenderSchema } from "../schema";
import create from "./create";
import get from "./get";
import update from "./update";

@ObjectType()
export class TenderClass extends TenderSchema {
  public static async getById(
    this: TenderModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public static async getList(this: TenderModel) {
    return get.list(this);
  }

  public static async createDocument(this: TenderModel, data: ITenderCreate) {
    return create.document(this, data);
  }

  public async updateFields(this: TenderDocument, data: ITenderUpdate) {
    return update.fields(this, data);
  }
}
