import { prop } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, Float, ID, ObjectType } from "type-graphql";

// ─── Position ─────────────────────────────────────────────────────────────────

@ObjectType()
export class RateBuildupPosition {
  @Field(() => Float) @prop({ required: true }) public x!: number;
  @Field(() => Float) @prop({ required: true }) public y!: number;
  @Field(() => Float, { nullable: true }) @prop() public w?: number;
  @Field(() => Float, { nullable: true }) @prop() public h?: number;
}

// ─── Rate entry (table row) ───────────────────────────────────────────────────

@ObjectType()
export class RateBuildupRateEntry {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public name!: string;
  @Field(() => Float) @prop({ required: true }) public qty!: number;
  @Field(() => Float) @prop({ required: true }) public ratePerHour!: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ObjectType()
export class RateBuildupControllerOption {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public label!: string;
}

@ObjectType()
export class RateBuildupControllerDef {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public label!: string;
  /** "percentage" | "toggle" | "selector" */
  @Field() @prop({ required: true }) public type!: string;
  /** Percentage: 0–1. Toggle: 0 or 1. Absent for selector. */
  @Field(() => Float, { nullable: true }) @prop() public defaultValue?: number;
  @Field(() => [RateBuildupControllerOption], { nullable: true })
  @prop({ type: () => [RateBuildupControllerOption], _id: false })
  public options?: RateBuildupControllerOption[];
  @Field(() => [String], { nullable: true })
  @prop({ type: () => [String] })
  public defaultSelected?: string[];
  @Field({ nullable: true }) @prop() public hint?: string;
  @Field(() => RateBuildupPosition)
  @prop({ type: () => RateBuildupPosition, _id: false, required: true })
  public position!: RateBuildupPosition;
}

// ─── Group ────────────────────────────────────────────────────────────────────

@ObjectType()
export class RateBuildupGroupActivation {
  @Field() @prop({ required: true }) public controllerId!: string;
  /** Percentage/toggle: comparison string e.g. "> 0" */
  @Field({ nullable: true }) @prop() public condition?: string;
  /** Selector: which option ID activates this group */
  @Field({ nullable: true }) @prop() public optionId?: string;
}

@ObjectType()
export class RateBuildupGroupDef {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public label!: string;
  @Field({ nullable: true }) @prop() public parentGroupId?: string;
  @Field(() => [String])
  @prop({ type: () => [String], default: [] })
  public memberIds!: string[];
  @Field(() => RateBuildupGroupActivation, { nullable: true })
  @prop({ type: () => RateBuildupGroupActivation, _id: false })
  public activation?: RateBuildupGroupActivation;
  @Field(() => RateBuildupPosition)
  @prop({ type: () => RateBuildupPosition, _id: false, required: true })
  public position!: RateBuildupPosition;
}

// ─── Node defs ────────────────────────────────────────────────────────────────

@ObjectType()
export class RateBuildupParameterDef {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public label!: string;
  @Field({ nullable: true }) @prop() public prefix?: string;
  @Field({ nullable: true }) @prop() public suffix?: string;
  @Field(() => Float) @prop({ required: true }) public defaultValue!: number;
  @Field({ nullable: true }) @prop() public hint?: string;
  @Field(() => RateBuildupPosition)
  @prop({ type: () => RateBuildupPosition, _id: false, required: true })
  public position!: RateBuildupPosition;
}

@ObjectType()
export class RateBuildupTableDef {
  @Field() @prop({ required: true }) public id!: string;
  @Field() @prop({ required: true }) public label!: string;
  @Field() @prop({ required: true }) public rowLabel!: string;
  @Field({ nullable: true }) @prop() public hint?: string;
  @Field(() => RateBuildupPosition)
  @prop({ type: () => RateBuildupPosition, _id: false, required: true })
  public position!: RateBuildupPosition;
  @Field(() => [RateBuildupRateEntry])
  @prop({ type: () => [RateBuildupRateEntry], _id: false, default: [] })
  public defaultRows!: RateBuildupRateEntry[];
}

@ObjectType()
export class RateBuildupFormulaStep {
  @Field() @prop({ required: true }) public id!: string;
  @Field({ nullable: true }) @prop() public label?: string;
  @Field() @prop({ required: true }) public formula!: string;
  @Field(() => RateBuildupPosition)
  @prop({ type: () => RateBuildupPosition, _id: false, required: true })
  public position!: RateBuildupPosition;
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
  @Field(() => RateBuildupPosition)
  @prop({ type: () => RateBuildupPosition, _id: false, required: true })
  public position!: RateBuildupPosition;
}

@ObjectType()
export class RateBuildupIntermediateDef {
  @Field() @prop({ required: true }) public label!: string;
  @Field() @prop({ required: true }) public stepId!: string;
  @Field() @prop({ required: true }) public unit!: string;
}

// ─── Unit variant ─────────────────────────────────────────────────────────────

@ObjectType()
export class RateBuildupUnitVariant {
  @Field() @prop({ required: true }) public unit!: string;
  @Field() @prop({ required: true }) public activatesGroupId!: string;
  @Field({ nullable: true }) @prop() public conversionFormula?: string;
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

  @Field(() => [RateBuildupControllerDef])
  @prop({ type: () => [RateBuildupControllerDef], _id: false, default: [] })
  public controllerDefs!: RateBuildupControllerDef[];

  @Field(() => [RateBuildupGroupDef])
  @prop({ type: () => [RateBuildupGroupDef], _id: false, default: [] })
  public groupDefs!: RateBuildupGroupDef[];

  @Field(() => [RateBuildupUnitVariant], { nullable: true })
  @prop({ type: () => [RateBuildupUnitVariant], _id: false })
  public unitVariants?: RateBuildupUnitVariant[];

  /** JSON string for the two synthetic nodes: { quantity: Position, unitPrice: Position } */
  @Field({ nullable: true })
  @prop()
  public specialPositions?: string;

  @Field()
  @prop({ required: true, default: 2 })
  public schemaVersion!: number;

  @Field(() => Date)
  @prop({ default: Date.now })
  public createdAt!: Date;

  @Field(() => Date)
  @prop({ default: Date.now })
  public updatedAt!: Date;
}
