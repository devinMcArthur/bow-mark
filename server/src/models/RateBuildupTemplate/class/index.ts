import { ReturnModelType } from "@typegoose/typegoose";
import { ObjectType } from "type-graphql";
import { RateBuildupTemplateSchema } from "../schema";

@ObjectType()
export class RateBuildupTemplateClass extends RateBuildupTemplateSchema {
  public static async getAll(
    this: ReturnModelType<typeof RateBuildupTemplateClass>
  ) {
    return this.find().sort({ updatedAt: -1 });
  }

  public static async getById(
    this: ReturnModelType<typeof RateBuildupTemplateClass>,
    id: string
  ) {
    return this.findById(id);
  }
}
