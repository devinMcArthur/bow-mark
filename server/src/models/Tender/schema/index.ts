import { EnrichedFileClass } from "../../EnrichedFile/class";
import { JobsiteClass } from "../../Jobsite/class";
import { UserClass } from "../../User/class";
import { TenderStatus } from "@typescript/tender";
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class TenderNoteClass {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field()
  @prop({ required: true })
  public content!: string;

  @Field(() => UserClass, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public savedBy?: Ref<UserClass>;

  @Field()
  @prop({ required: true })
  public savedAt!: Date;

  @Field()
  @prop({ required: true })
  public conversationId!: string;
}

@ObjectType()
export class TenderJobSummaryClass {
  @Field()
  @prop({ required: true })
  public content!: string;

  @Field()
  @prop({ required: true })
  public generatedAt!: Date;

  @Field()
  @prop({ required: true })
  public generatedBy!: string;

  @Field(() => [String])
  @prop({ type: () => [String], required: true, default: [] })
  public generatedFrom!: string[];
}

@ObjectType()
export class TenderFileCategoryClass {
  // Stable ID — survives category renames and prompts. Generated when the
  // category is first created by the categorizer.
  @Field(() => ID)
  public _id!: Types.ObjectId;

  // Human label ("Drawings", "Specifications", "Schedule of Quantities", …).
  @Field()
  @prop({ required: true, trim: true })
  public name!: string;

  // Display order among categories. 0 = first. Claude picks this based on
  // typical-access-frequency for a tender estimation workflow (drawings
  // and schedules of quantities tend to rank earlier than addenda).
  @Field()
  @prop({ required: true, default: 0 })
  public order!: number;

  // Denormalized — EnrichedFile IDs that belong to this category. Lets
  // the UI render "files in folder X" without iterating every tender
  // file to check ownership.
  @Field(() => [ID])
  @prop({ type: () => [Types.ObjectId], required: true, default: [] })
  public fileIds!: Types.ObjectId[];
}

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

  @Field(() => [TenderNoteClass])
  @prop({ type: () => [TenderNoteClass], default: [] })
  public notes!: TenderNoteClass[];

  // AI-generated document folders. Populated by the categorizer
  // (lib/categorizeTenderFiles) — a 60s-debounced full re-categorization
  // that runs after any file in this tender reaches "ready" status.
  // Files not present in any category's fileIds list are shown as
  // "Uncategorized" in the UI (covers in-flight uploads and anything
  // that arrived between categorization passes).
  @Field(() => [TenderFileCategoryClass], { nullable: true })
  @prop({ type: () => [TenderFileCategoryClass], default: [] })
  public fileCategories?: TenderFileCategoryClass[];

  @Field(() => TenderJobSummaryClass, { nullable: true })
  @prop({ type: () => TenderJobSummaryClass, required: false })
  public jobSummary?: TenderJobSummaryClass;

  @Field({ nullable: false })
  @prop({ required: true, default: false })
  public summaryGenerating!: boolean;

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
