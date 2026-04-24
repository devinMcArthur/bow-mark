import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { DocumentSchema } from "../../Document/schema";
import { FileClass } from "../../File/class";

@ObjectType()
export class EnrichmentSummaryChunkClass {
  @Field() @prop() public startPage!: number;
  @Field() @prop() public endPage!: number;
  @Field() @prop() public overview!: string;
  @Field(() => [String]) @prop({ type: () => [String] }) public keyTopics!: string[];
}

@ObjectType()
export class EnrichmentSummaryClass {
  @Field() @prop() public overview!: string;
  @Field() @prop() public documentType!: string;
  @Field(() => [String]) @prop({ type: () => [String] }) public keyTopics!: string[];
  @Field(() => [EnrichmentSummaryChunkClass], { nullable: true })
  @prop({ type: () => [EnrichmentSummaryChunkClass] })
  public chunks?: EnrichmentSummaryChunkClass[];
}

@ObjectType()
export class EnrichmentPageIndexEntryClass {
  @Field() @prop() public page!: number;
  @Field() @prop() public summary!: string;
}

@ObjectType()
export class EnrichmentProgressClass {
  @Field(() => String) @prop() public phase!: string;
  @Field() @prop() public current!: number;
  @Field() @prop() public total!: number;
  @Field() @prop() public updatedAt!: Date;
}

@ObjectType()
export class EnrichmentSchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => ID)
  @prop({ ref: () => DocumentSchema, required: true })
  public documentId!: Ref<DocumentSchema>;

  @Field(() => ID)
  @prop({ ref: () => FileClass, required: true })
  public fileId!: Ref<FileClass>;

  @Field(() => String)
  @prop({
    required: true,
    enum: ["pending", "processing", "ready", "partial", "failed", "orphaned"],
    default: "pending",
  })
  public status!: "pending" | "processing" | "ready" | "partial" | "failed" | "orphaned";

  @Field()
  @prop({ required: true, default: 0 })
  public attempts!: number;

  @Field()
  @prop({ required: true, default: 1 })
  public processingVersion!: number;

  @Field({ nullable: true })
  @prop()
  public queuedAt?: Date;

  @Field({ nullable: true })
  @prop()
  public processingStartedAt?: Date;

  @Field({ nullable: true })
  @prop({ trim: true })
  public summaryError?: string;

  @Field(() => EnrichmentProgressClass, { nullable: true })
  @prop({ type: () => EnrichmentProgressClass })
  public summaryProgress?: EnrichmentProgressClass;

  @Field({ nullable: true })
  @prop()
  public pageCount?: number;

  @Field(() => [EnrichmentPageIndexEntryClass], { nullable: true })
  @prop({ type: () => [EnrichmentPageIndexEntryClass] })
  public pageIndex?: EnrichmentPageIndexEntryClass[];

  @Field(() => EnrichmentSummaryClass, { nullable: true })
  @prop({ type: () => Object })
  public summary?: EnrichmentSummaryClass;

  @Field({ nullable: true })
  @prop({ trim: true })
  public documentType?: string;

  // Operational: stamped by migrate-file-system so rollback can
  // delete-by-run if needed. Not exposed via GraphQL.
  @prop({ required: false })
  public migrationRunId?: string;
}
