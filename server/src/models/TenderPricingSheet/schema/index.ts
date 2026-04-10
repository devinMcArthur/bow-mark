import { TenderPricingRowType } from "@typescript/tenderPricingSheet";
import { prop } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, Float, ID, Int, ObjectType } from "type-graphql";

@ObjectType()
export class DocRefClass {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => ID)
  @prop({ ref: "EnrichedFileClass", required: true })
  public enrichedFileId!: Types.ObjectId;

  @Field(() => Int)
  @prop({ required: true })
  public page!: number;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;
}

@ObjectType()
export class TenderPricingRowClass {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => TenderPricingRowType)
  @prop({ required: true, enum: TenderPricingRowType })
  public type!: TenderPricingRowType;

  @Field()
  @prop({ required: true, default: 0 })
  public sortOrder!: number;

  @Field()
  @prop({ trim: true, default: "" })
  public itemNumber!: string;

  @Field()
  @prop({ trim: true, default: "" })
  public description!: string;

  @Field(() => Int)
  @prop({ required: true, default: 0 })
  public indentLevel!: number;

  // Pricing fields — only meaningful on type === "item"
  @Field(() => Float, { nullable: true })
  @prop()
  public quantity?: number;

  @Field({ nullable: true })
  @prop({ trim: true })
  public unit?: string;

  @Field(() => Float, { nullable: true })
  @prop()
  public markupOverride?: number | null;

  @Field(() => Float, { nullable: true })
  @prop()
  public unitPrice?: number | null;

  @Field({ nullable: true })
  @prop({ trim: true })
  public notes?: string;

  @Field({ nullable: true })
  @prop({ trim: true })
  public rateBuildupSnapshot?: string;

  @Field(() => Float, { nullable: true })
  @prop()
  public extraUnitPrice?: number | null;

  @Field(() => String, { nullable: true })
  @prop({ trim: true })
  public extraUnitPriceMemo?: string;

  @Field(() => [DocRefClass])
  @prop({ type: () => [DocRefClass], default: [] })
  public docRefs!: DocRefClass[];

  @Field(() => String, { nullable: true })
  @prop({ trim: true, default: "not_started" })
  public status?: string;
}

@ObjectType()
export class TenderPricingSheetSchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  // Not exposed as a GraphQL field — queried via tenderPricingSheet(tenderId) resolver
  @prop({ ref: "TenderClass", required: true })
  public tender!: Types.ObjectId;

  @Field(() => Float)
  @prop({ required: true, default: 15 })
  public defaultMarkupPct!: number;

  @Field(() => [TenderPricingRowClass])
  @prop({ type: () => [TenderPricingRowClass], default: [] })
  public rows!: TenderPricingRowClass[];

  @Field()
  @prop({ required: true, default: 1 })
  public schemaVersion!: number;

  @Field()
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: Date.now })
  public updatedAt!: Date;
}
