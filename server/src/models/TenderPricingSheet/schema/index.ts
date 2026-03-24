import { TenderPricingRowType, TenderWorkType } from "@typescript/tenderPricingSheet";
import { modelOptions, prop, Severity } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, Float, ID, Int, ObjectType } from "type-graphql";

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
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
  public subcontractorUP?: number | null;

  @Field(() => Float, { nullable: true })
  @prop({ default: 0 })
  public truckingUP?: number;

  @Field(() => Float, { nullable: true })
  @prop({ default: 0 })
  public materialUP?: number;

  @Field(() => Float, { nullable: true })
  @prop({ default: 0 })
  public crewUP?: number;

  @Field(() => Float, { nullable: true })
  @prop({ default: 0 })
  public rentalUP?: number;

  @Field(() => Float, { nullable: true })
  @prop()
  public markupOverride?: number | null;

  @Field({ nullable: true })
  @prop({ trim: true })
  public calculatorInputsJson?: string;

  @Field(() => Float, { nullable: true })
  @prop()
  public unitPrice?: number | null;

  @Field({ nullable: true })
  @prop({ trim: true })
  public notes?: string;

  @Field(() => TenderWorkType, { nullable: true })
  @prop({ enum: TenderWorkType })
  public calculatorType?: TenderWorkType;

  @prop({ type: () => Object })
  public calculatorInputs?: Record<string, unknown>;
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
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: Date.now })
  public updatedAt!: Date;
}
