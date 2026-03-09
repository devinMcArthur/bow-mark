import SchemaVersions from "@constants/SchemaVersions";
import { MaterialDocument } from "@models";
import { search_UpdateMaterial } from "@search";
import { post, prop } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
@post<MaterialDocument>("save", async (material) => {
  await search_UpdateMaterial(material);
})
export class MaterialSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({
    required: true,
    trim: true,
    unique: true,
  })
  public name!: string;

  @Field()
  @prop({ required: true, default: SchemaVersions.Material })
  public schemaVersion!: number;

  @Field(() => Date)
  @prop({ required: false })
  public archivedAt!: Date;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;
}
