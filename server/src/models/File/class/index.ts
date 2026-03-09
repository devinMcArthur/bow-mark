import { FileDocument, FileModel } from "@models";
import { IFileCreate } from "@typescript/file";
import { GetByIDOptions, Id } from "@typescript/models";
import { ObjectType } from "type-graphql";
import { FileSchema } from "../schema";
import create from "./create";
import get from "./get";
import remove from "./remove";

@ObjectType()
export class FileClass extends FileSchema {
  /**
   * ----- GET -----
   */

  public static async getById(
    this: FileModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public async getBuffer(this: FileDocument) {
    return get.buffer(this);
  }

  /**
   * ----- CREATE -----
   */

  public static async createDocument(this: FileModel, data: IFileCreate) {
    return create.document(this, data);
  }

  /**
   * ----- REMOVE -----
   */

  public async fullRemove(this: FileDocument) {
    return remove.full(this);
  }

  public static async removeAll(this: FileModel) {
    return remove.all(this);
  }
}
