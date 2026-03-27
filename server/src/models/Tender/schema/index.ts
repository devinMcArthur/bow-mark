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
  public content!: string;

  @Field(() => UserClass, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public savedBy?: Ref<UserClass>;

  @Field()
  public savedAt!: Date;

  @Field()
  public conversationId!: string;
}

@ObjectType()
export class TenderJobSummaryClass {
  @Field()
  public content!: string;

  @Field()
  public generatedAt!: Date;

  @Field()
  public generatedBy!: string;

  @Field(() => [String])
  public generatedFrom!: string[];
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
  @prop({ type: () => [Object], default: [] })
  public notes!: TenderNoteClass[];

  @Field(() => TenderJobSummaryClass, { nullable: true })
  @prop({ type: () => Object, required: false })
  public jobSummary?: TenderJobSummaryClass;

  @Field(() => UserClass)
  @prop({ ref: () => UserClass, required: true })
  public createdBy!: Ref<UserClass>;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public updatedAt!: Date;
}
