import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { FileClass } from "../../File/class";

@ObjectType()
export class PublicDocumentSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, unique: true, trim: true, lowercase: true, index: true })
  public slug!: string;

  @Field({ nullable: false })
  @prop({ required: true, trim: true })
  public title!: string;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;

  @prop({ ref: () => FileClass, required: true })
  public file!: Ref<FileClass>;

  @Field({ nullable: false })
  @prop({ required: true, default: 0 })
  public viewCount!: number;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now, immutable: true })
  public createdAt!: Date;
}
