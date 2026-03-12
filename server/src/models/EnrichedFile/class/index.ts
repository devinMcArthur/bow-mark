import { ObjectType } from "type-graphql";
import { EnrichedFileDocument, EnrichedFileModel } from "@models";
import { Id, GetByIDOptions } from "@typescript/models";
import { EnrichedFileSchema } from "../schema";
import get from "./get";
import create from "./create";

@ObjectType()
export class EnrichedFileClass extends EnrichedFileSchema {
  public static async getById(
    this: EnrichedFileModel,
    id: Id,
    options?: GetByIDOptions
  ): Promise<EnrichedFileDocument | null> {
    return get.byId(this, id, options);
  }

  public static async getByIds(
    this: EnrichedFileModel,
    ids: Id[]
  ): Promise<EnrichedFileDocument[]> {
    return get.byIds(this, ids);
  }

  public static async createDocument(
    this: EnrichedFileModel,
    fileId: string,
    documentType?: string
  ): Promise<EnrichedFileDocument> {
    return create.document(this, fileId, documentType);
  }
}

