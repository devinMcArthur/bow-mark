import { FileClass } from "../../File/class";
import {
  IEnrichedFileSummary,
  IEnrichedFileSummaryProgress,
  SummaryStatus,
} from "@typescript/enrichedFile";
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
export class EnrichedFileSummaryProgressClass {
  // "summary" while chunked PDF summary is running, "page_index" while the
  // per-page index is being built. Nullable on the doc when neither phase
  // is active (pending / ready / failed / orphaned).
  @Field(() => String) public phase!: string;
  @Field() public current!: number;
  @Field() public total!: number;
  @Field() public updatedAt!: Date;
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

  // State machine:
  //   pending → processing → ready           (normal happy path)
  //   pending → processing → partial         (summary done, pageIndex crash — retriable)
  //   pending → processing → failed          (transient error — retriable via watchdog)
  //   * → orphaned                           (source file missing from storage — terminal)
  @Field(() => String)
  @prop({
    required: true,
    enum: [
      "pending",
      "processing",
      "ready",
      "partial",
      "failed",
      "orphaned",
    ],
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

  // Updated on every publish to the summary queue. Used by watchdog to
  // distinguish files legitimately waiting in the queue (fresh queuedAt)
  // from files whose queue message was dropped (stale queuedAt). Without
  // this, pending files waiting behind a batch get repeatedly republished
  // by the watchdog using createdAt — creating duplicate queue messages.
  @Field({ nullable: true })
  @prop({ required: false })
  public queuedAt?: Date;

  // Incremented each time the handler runs (successfully or otherwise).
  // Used by watchdog to cap retry attempts on persistently failing files.
  @Field({ nullable: true })
  @prop({ required: false, default: 0 })
  public summaryAttempts?: number;

  // Monotonic counter incremented by the atomic ownership claim in the
  // handler. All progress writes (summaryProgress, pageIndex checkpoints)
  // must include this in their update predicate, so stale writes from a
  // dead handler can't clobber the state of a newer claim.
  @Field({ nullable: true })
  @prop({ required: false, default: 0 })
  public processingVersion?: number;

  // Live progress while the handler is running. Cleared on terminal
  // transitions (ready / failed / orphaned). Drives the client progress
  // bar and ETA.
  @Field(() => EnrichedFileSummaryProgressClass, { nullable: true })
  @prop({ type: () => Object, required: false })
  public summaryProgress?: IEnrichedFileSummaryProgress;

  @Field()
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;
}
