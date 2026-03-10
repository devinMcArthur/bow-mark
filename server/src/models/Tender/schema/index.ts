import { FileClass } from "../../File/class";
import { JobsiteClass } from "../../Jobsite/class";
import { UserClass } from "../../User/class";
import { IEnrichedFileSummary, SummaryStatus, TenderStatus } from "@typescript/tender";
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class EnrichedFileSummaryClass {
  @Field()
  public overview!: string;

  @Field()
  public documentType!: string;

  @Field(() => [String])
  public keyTopics!: string[];
}

@ObjectType()
export class EnrichedFileClass {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field(() => FileClass)
  @prop({ ref: () => FileClass, required: true })
  public file!: Ref<FileClass>;

  @Field()
  @prop({ required: true, trim: true })
  public documentType!: string;

  @Field(() => EnrichedFileSummaryClass, { nullable: true })
  @prop({ type: () => Object, required: false })
  public summary?: IEnrichedFileSummary;

  @Field()
  @prop({
    required: true,
    enum: ["pending", "processing", "ready", "failed"],
    default: "pending",
  })
  public summaryStatus!: SummaryStatus;

  @Field({ nullable: true })
  @prop({ required: false })
  public pageCount?: number;
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

  @Field({ nullable: false })
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
  @prop({ type: () => [EnrichedFileClass], default: [] })
  public files!: EnrichedFileClass[];

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
