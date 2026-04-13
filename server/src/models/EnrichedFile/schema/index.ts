import { FileClass } from "../../File/class";
import { IEnrichedFileSummary, SummaryStatus } from "@typescript/enrichedFile";
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class EnrichedFileSummaryChunkClass {
  @Field() public startPage!: number;
  @Field() public endPage!: number;
  @Field() public overview!: string;
  @Field(() => [String]) public keyTopics!: string[];
}

@ObjectType()
export class EnrichedFileSummaryClass {
  @Field() public overview!: string;
  @Field() public documentType!: string;
  @Field(() => [String]) public keyTopics!: string[];
  @Field(() => [EnrichedFileSummaryChunkClass], { nullable: true })
  public chunks?: EnrichedFileSummaryChunkClass[];
}

@ObjectType()
export class EnrichedFilePageIndexEntryClass {
  @Field() public page!: number;
  @Field() public summary!: string;
}

@ObjectType()
export class EnrichedFileSchema {
  @Field(() => ID) public _id!: Types.ObjectId;

  @Field(() => FileClass)
  @prop({ ref: () => FileClass, required: true })
  public file!: Ref<FileClass>;

  @Field({ nullable: true })
  @prop({ trim: true })
  public documentType?: string;

  @Field(() => EnrichedFileSummaryClass, { nullable: true })
  @prop({ type: () => Object, required: false })
  public summary?: IEnrichedFileSummary;

  @Field(() => String)
  @prop({
    required: true,
    enum: ["pending", "processing", "ready", "failed"],
    default: "pending",
  })
  public summaryStatus!: SummaryStatus;

  @Field({ nullable: true })
  @prop({ required: false })
  public pageCount?: number;

  @Field(() => [EnrichedFilePageIndexEntryClass], { nullable: true })
  @prop({ type: () => [Object], required: false })
  public pageIndex?: EnrichedFilePageIndexEntryClass[];

  @Field({ nullable: true })
  @prop({ trim: true })
  public summaryError?: string;

  // Set when status transitions to "processing". Used by watchdog to
  // detect handlers that have exceeded their processing window.
  @Field({ nullable: true })
  @prop({ required: false })
  public processingStartedAt?: Date;

  // Incremented each time the handler runs (successfully or otherwise).
  // Used by watchdog to cap retry attempts on persistently failing files.
  @Field({ nullable: true })
  @prop({ required: false, default: 0 })
  public summaryAttempts?: number;

  @Field()
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;
}
