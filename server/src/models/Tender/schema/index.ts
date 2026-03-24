import { EnrichedFileClass } from "../../EnrichedFile/class";
import { JobsiteClass } from "../../Jobsite/class";
import { UserClass } from "../../User/class";
import { TenderStatus } from "@typescript/tender";
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class TenderSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, trim: true })
  public name!: string;

  @Field({ nullable: false })
  @prop({ required: true, trim: true, unique: true })
  public jobcode!: string;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;

  @Field(() => String, { nullable: false })
  @prop({
    required: true,
    enum: ["bidding", "won", "lost"],
    default: "bidding",
  })
  public status!: TenderStatus;

  @Field(() => JobsiteClass, { nullable: true })
  @prop({ ref: () => JobsiteClass, required: false })
  public jobsite?: Ref<JobsiteClass>;

  @Field(() => [EnrichedFileClass])
  @prop({ ref: () => EnrichedFileClass, type: () => [Types.ObjectId], default: [] })
  public files!: Ref<EnrichedFileClass>[];

  @Field(() => UserClass)
  @prop({ ref: () => UserClass, required: true })
  public createdBy!: Ref<UserClass>;

  // pricingSheet ref — not exposed in GraphQL; use tenderPricingSheet(tenderId) query
  @prop({ ref: "TenderPricingSheetClass", required: false })
  public pricingSheet?: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public updatedAt!: Date;
}
