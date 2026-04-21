import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { FileClass } from "../../File/class";
import { UserClass } from "../../User/class";

@ObjectType()
export class DocumentSchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => FileClass)
  @prop({ ref: () => FileClass, required: true })
  public currentFileId!: Ref<FileClass>;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;

  @Field()
  @prop({ required: true, default: false })
  public enrichmentLocked!: boolean;

  @Field(() => ID, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public createdBy?: Ref<UserClass>;

  @Field()
  @prop({ required: true, default: () => new Date() })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: () => new Date() })
  public updatedAt!: Date;
}
