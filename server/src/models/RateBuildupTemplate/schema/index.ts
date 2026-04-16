import { prop, Ref } from "@typegoose/typegoose";
// Value imports needed: ts-node-dev resolves ref: () => MaterialClass at compile
// time. Load order in models/index.ts MUST keep Material + CrewKind before
// RateBuildupTemplate — do not reorder those exports.
import { MaterialClass, CrewKindClass } from "@models";
import { RateBuildupOutputKind } from "@typescript/tenderPricingSheet";
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
  /** "percentage" | "toggle" | "selector" | "singleSelect" */
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

// ─── Output node ──────────────────────────────────────────────────────────────
// Surfaces a secondary per-unit value (tonnes of material, crew hours, etc.)
// from a formula step. Canvas node with a label, optional material whitelist,
// and a default. Estimator picks the specific material in RateBuildupInputs.
//
// Following the same pattern as BreakdownDef.items[].stepId — the consumer node
// stores a string reference to its source formula step. Edges are derived, not
// stored separately.

@ObjectType()
export class RateBuildupOutputDef {
  @Field() @prop({ required: true }) public id!: string;

  /**
   * Discriminator. `"material"` references the Material catalog; `"crewHours"`
   * references the CrewKind catalog (unit implicitly "hr").
   */
  @Field(() => RateBuildupOutputKind)
  @prop({ required: true, enum: RateBuildupOutputKind })
  public kind!: RateBuildupOutputKind;

  /**
   * ID of the formula step whose computed value this output exposes (per-unit).
   * May be empty when the template author has just dropped a fresh Output node
   * on the canvas but hasn't yet picked a source step. Such outputs contribute
   * zero demand until wired up.
   */
  @Field() @prop({ required: true, default: "" }) public sourceStepId!: string;

  /**
   * Canonical unit code (t, m3, ...) for material outputs. For `crewHours`
   * outputs the unit is implicitly "hr" and this field is ignored.
   */
  @Field() @prop({ required: true, default: "" }) public unit!: string;

  /** Optional display label, e.g. "Asphalt" or "Operator". */
  @Field({ nullable: true }) @prop() public label?: string;

  /**
   * MATERIAL kind: whitelist of Material IDs the estimator can pick. Empty or
   * absent = any material allowed. Prevents nonsensical pairings.
   */
  @Field(() => [ID], { nullable: true })
  @prop({ ref: () => MaterialClass, type: () => [Types.ObjectId] })
  public allowedMaterialIds?: Ref<MaterialClass>[];

  /** MATERIAL kind: optional default selection (must be in whitelist if one is set). */
  @Field(() => ID, { nullable: true })
  @prop({ ref: () => MaterialClass, type: () => Types.ObjectId })
  public defaultMaterialId?: Ref<MaterialClass>;

  /**
   * CREW HOURS kind: whitelist of CrewKind IDs the estimator can pick.
   * Empty or absent = any crew kind allowed.
   */
  @Field(() => [ID], { nullable: true })
  @prop({ ref: () => CrewKindClass, type: () => [Types.ObjectId] })
  public allowedCrewKindIds?: Ref<CrewKindClass>[];

  /** CREW HOURS kind: optional default crew kind (must be in whitelist if one is set). */
  @Field(() => ID, { nullable: true })
  @prop({ ref: () => CrewKindClass, type: () => Types.ObjectId })
  public defaultCrewKindId?: Ref<CrewKindClass>;

  @Field(() => RateBuildupPosition)
  @prop({ type: () => RateBuildupPosition, _id: false, required: true })
  public position!: RateBuildupPosition;
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
  @prop({ required: true, trim: true, unique: true })
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

  @Field(() => [RateBuildupOutputDef])
  @prop({ type: () => [RateBuildupOutputDef], _id: false, default: [] })
  public outputDefs!: RateBuildupOutputDef[];

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
  @prop({ required: true, default: 3 })
  public schemaVersion!: number;

  @Field(() => Date)
  @prop({ default: Date.now })
  public createdAt!: Date;

  @Field(() => Date)
  @prop({ default: Date.now })
  public updatedAt!: Date;
}
