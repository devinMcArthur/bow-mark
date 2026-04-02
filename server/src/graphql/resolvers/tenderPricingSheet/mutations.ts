import { Field, Float, ID, InputType, Int } from "type-graphql";
import { TenderPricingRowType, TenderWorkType } from "@typescript/tenderPricingSheet";

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
  public subcontractorUP?: number | null;

  @Field(() => Float, { nullable: true })
  public truckingUP?: number;

  @Field(() => Float, { nullable: true })
  public materialUP?: number;

  @Field(() => Float, { nullable: true })
  public crewUP?: number;

  @Field(() => Float, { nullable: true })
  public rentalUP?: number;

  @Field(() => Float, { nullable: true })
  public markupOverride?: number | null;

  @Field({ nullable: true })
  public calculatorInputsJson?: string;

  @Field(() => Float, { nullable: true })
  public unitPrice?: number | null;

  @Field({ nullable: true })
  public notes?: string;

  @Field(() => TenderWorkType, { nullable: true })
  public calculatorType?: TenderWorkType;

  @Field({ nullable: true })
  public rateBuildupSnapshot?: string | null;
}
