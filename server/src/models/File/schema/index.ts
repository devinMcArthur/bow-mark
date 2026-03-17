import SchemaVersions from "@constants/SchemaVersions";
import { prop } from "@typegoose/typegoose";
import { SupportedMimeTypes } from "@typescript/file";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class FileSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field(() => String, { nullable: false })
  @prop({ required: true, enum: SupportedMimeTypes })
  public mimetype!: SupportedMimeTypes;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;

  @Field({ nullable: false })
  @prop({ required: true, default: SchemaVersions.File })
  public schemaVersion!: number;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now, immutable: true })
  public createdAt!: Date;
}
