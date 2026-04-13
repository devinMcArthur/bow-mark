import { Field, Float, ID, InputType, Int } from "type-graphql";
import { TenderPricingRowType, RateBuildupOutputKind } from "@typescript/tenderPricingSheet";

@InputType()
export class RateBuildupOutputInput {
  @Field(() => RateBuildupOutputKind)
  public kind!: RateBuildupOutputKind;

  /** Populated when kind === "material" */
  @Field(() => ID, { nullable: true })
  public materialId?: string;

  /** Populated when kind === "crewHours" */
  @Field(() => ID, { nullable: true })
  public crewKindId?: string;

  @Field()
  public unit!: string;

  @Field(() => Float)
  public perUnitValue!: number;

  @Field(() => Float)
  public totalValue!: number;
}

@InputType()
export class TenderPricingRowCreateData {
  @Field(() => TenderPricingRowType)
  public type!: TenderPricingRowType;

  @Field()
  public itemNumber!: string;

  @Field()
  public description!: string;

  @Field(() => Int)
  public indentLevel!: number;

  @Field(() => Int)
  public sortOrder!: number;
}

@InputType()
export class TenderPricingRowUpdateData {
  @Field({ nullable: true })
  public itemNumber?: string;

  @Field({ nullable: true })
  public description?: string;

  @Field(() => Int, { nullable: true })
  public indentLevel?: number;

  @Field(() => Float, { nullable: true })
  public quantity?: number;

  @Field({ nullable: true })
  public unit?: string;

  @Field(() => Float, { nullable: true })
  public markupOverride?: number | null;

  @Field(() => Float, { nullable: true })
  public unitPrice?: number | null;

  @Field({ nullable: true })
  public notes?: string;

  @Field(() => String, { nullable: true })
  public rateBuildupSnapshot?: string | null;

  /**
   * Per-row rate buildup outputs captured at snapshot evaluation time.
   * Each entry = one resolved Output node (material + unit + per-unit value,
   * already scaled into totalValue by quantity). Used by per-tender and
   * cross-tender demand rollups.
   */
  @Field(() => [RateBuildupOutputInput], { nullable: true })
  public rateBuildupOutputs?: RateBuildupOutputInput[] | null;

  @Field(() => Float, { nullable: true })
  public extraUnitPrice?: number | null;

  @Field(() => String, { nullable: true })
  public extraUnitPriceMemo?: string | null;

  @Field(() => String, { nullable: true })
  public status?: string;
}

@InputType()
export class TenderPricingRowDocRefAddData {
  @Field(() => ID)
  public enrichedFileId!: string;

  @Field(() => Int)
  public page!: number;

  @Field(() => String, { nullable: true })
  public description?: string;
}
