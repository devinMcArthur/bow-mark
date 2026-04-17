import { TenderPricingRowType, RateBuildupOutputKind } from "@typescript/tenderPricingSheet";
import { prop, Ref } from "@typegoose/typegoose";
import { MaterialClass, CrewKindClass } from "@models";
import { Types } from "mongoose";
import { Field, Float, ID, Int, ObjectType } from "type-graphql";

// ─── Rate buildup output (per-row, captured at snapshot evaluation) ───────────
// Each element represents one resolved Output node from the row's rate buildup.
// `perUnitValue` is the formula step's computed value for one unit of the row's
// quantity; `totalValue` is scaled by the row's quantity and cached for easy
// cross-tender aggregation (e.g. "total A Mix Asphalt across all won tenders"
// or "total Base Crew hours by month").

@ObjectType()
export class RateBuildupOutputClass {
  @Field(() => RateBuildupOutputKind)
  @prop({ required: true, enum: RateBuildupOutputKind })
  public kind!: RateBuildupOutputKind;

  /** Populated when kind === "material". */
  @Field(() => ID, { nullable: true })
  @prop({ ref: () => MaterialClass, type: () => Types.ObjectId })
  public materialId?: Ref<MaterialClass>;

  /** Populated when kind === "crewHours". */
  @Field(() => ID, { nullable: true })
  @prop({ ref: () => CrewKindClass, type: () => Types.ObjectId })
  public crewKindId?: Ref<CrewKindClass>;

  @Field()
  @prop({ required: true })
  public unit!: string;

  @Field(() => Float)
  @prop({ required: true })
  public perUnitValue!: number;

  @Field(() => Float)
  @prop({ required: true })
  public totalValue!: number;
}

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
export class RateBuildupSnapshotEntryClass {
  @Field()
  @prop({ required: true })
  public snapshot!: string;

  @Field({ nullable: true })
  @prop({ trim: true })
  public memo?: string;
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

  // itemNumber and description are free-text user labels. They're nullable at
  // the GraphQL level so historical rows with missing fields load cleanly —
  // mongoose `default: ""` only applies at document *creation* time, not when
  // loading an older sub-doc that was persisted before the field existed.
  @Field({ nullable: true })
  @prop({ trim: true, default: "" })
  public itemNumber?: string;

  @Field({ nullable: true })
  @prop({ trim: true, default: "" })
  public description?: string;

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

  @Field(() => [RateBuildupSnapshotEntryClass])
  @prop({ type: () => [RateBuildupSnapshotEntryClass], _id: false, default: [] })
  public rateBuildupSnapshots!: RateBuildupSnapshotEntryClass[];

  @Field(() => [RateBuildupOutputClass], { nullable: true })
  @prop({ type: () => [RateBuildupOutputClass], default: undefined })
  public rateBuildupOutputs?: RateBuildupOutputClass[];

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
