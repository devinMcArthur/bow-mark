import { ObjectType } from "type-graphql";
import { PublicDocumentDocument, PublicDocumentModel } from "@models";
import { PublicDocumentSchema } from "../schema";

@ObjectType()
export class PublicDocumentClass extends PublicDocumentSchema {
  public static async getAll(this: PublicDocumentModel) {
    return this.find().populate("file").sort({ createdAt: -1 });
  }

  public static async getBySlug(
    this: PublicDocumentModel,
    slug: string
  ): Promise<PublicDocumentDocument | null> {
    return this.findOne({ slug }).populate("file");
  }
}
