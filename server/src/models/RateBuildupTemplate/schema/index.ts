import { prop } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, Float, ID, ObjectType } from "type-graphql";

// ─── Subdocuments ─────────────────────────────────────────────────────────────

@ObjectType()
export class RateBuildupParameterDef {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public label!: string;
  @Field({ nullable: true }) @prop() public prefix?: string;
  @Field({ nullable: true }) @prop() public suffix?: string;
  @Field(() => Float) @prop({ required: true }) public defaultValue!: number;
}

@ObjectType()
export class RateBuildupTableDef {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public label!: string;
  @Field() @prop({ required: true }) public rowLabel!: string;
}

@ObjectType()
export class RateBuildupFormulaStep {
  @Field() @prop({ required: true }) public id!: string;
  @Field({ nullable: true }) @prop() public label?: string;
  @Field() @prop({ required: true }) public formula!: string;
}

@ObjectType()
export class RateBuildupBreakdownItem {
  @Field() @prop({ required: true }) public stepId!: string;
  @Field() @prop({ required: true }) public label!: string;
}

@ObjectType()
export class RateBuildupBreakdownDef {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public label!: string;
  @Field(() => [RateBuildupBreakdownItem])
  @prop({ type: () => [RateBuildupBreakdownItem], _id: false, default: [] })
  public items!: RateBuildupBreakdownItem[];
}

@ObjectType()
export class RateBuildupIntermediateDef {
  @Field() @prop({ required: true }) public label!: string;
  @Field() @prop({ required: true }) public stepId!: string;
  @Field() @prop({ required: true }) public unit!: string;
}

// ─── Main schema ──────────────────────────────────────────────────────────────

@ObjectType()
export class RateBuildupTemplateSchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field()
  @prop({ required: true, trim: true })
  public label!: string;

  @Field({ nullable: true })
  @prop()
  public defaultUnit?: string;

  @Field(() => [RateBuildupParameterDef])
  @prop({ type: () => [RateBuildupParameterDef], _id: false, default: [] })
  public parameterDefs!: RateBuildupParameterDef[];

  @Field(() => [RateBuildupTableDef])
  @prop({ type: () => [RateBuildupTableDef], _id: false, default: [] })
  public tableDefs!: RateBuildupTableDef[];

  @Field(() => [RateBuildupFormulaStep])
  @prop({ type: () => [RateBuildupFormulaStep], _id: false, default: [] })
  public formulaSteps!: RateBuildupFormulaStep[];

  @Field(() => [RateBuildupBreakdownDef])
  @prop({ type: () => [RateBuildupBreakdownDef], _id: false, default: [] })
  public breakdownDefs!: RateBuildupBreakdownDef[];

  @Field(() => [RateBuildupIntermediateDef])
  @prop({ type: () => [RateBuildupIntermediateDef], _id: false, default: [] })
  public intermediateDefs!: RateBuildupIntermediateDef[];

  // Dynamic-key maps — stored and transmitted as JSON strings to avoid
  // GraphQL's lack of native Map/Record types without a custom scalar.
  @Field()
  @prop({ required: true, default: '{"params":{},"tables":{}}' })
  public defaultInputs!: string;

  @Field()
  @prop({ required: true, default: '{"quantity":{"x":100,"y":200},"unitPrice":{"x":700,"y":200}}' })
  public nodePositions!: string;

  @Field()
  @prop({ required: true, default: 1 })
  public schemaVersion!: number;

  @Field(() => Date)
  @prop({ default: Date.now })
  public createdAt!: Date;

  @Field(() => Date)
  @prop({ default: Date.now })
  public updatedAt!: Date;
}
