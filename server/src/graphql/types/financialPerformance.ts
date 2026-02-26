/**
 * GraphQL types for the Financial Performance tab on the
 * Jobsite Year Master Report.
 *
 * Per-jobsite: revenue invoices, direct operating costs (employee +
 * vehicle + material + trucking from fact tables), net income,
 * margin %, and T/H data for the residual T/H vs margin scatter.
 */

import { Field, Float, ID, InputType, Int, ObjectType } from "type-graphql";

@InputType()
export class FinancialPerformanceInput {
  @Field(() => Int)
  year!: number;
}

@ObjectType()
export class JobsiteFinancialItem {
  /** MongoDB ID — used for links */
  @Field(() => ID)
  jobsiteId!: string;

  @Field()
  jobsiteName!: string;

  @Field({ nullable: true })
  jobcode?: string;

  // --- Revenue ---
  @Field(() => Float)
  totalRevenue!: number;

  // --- Direct operating costs (from approved daily report fact tables) ---
  @Field(() => Float)
  employeeCost!: number;

  @Field(() => Float)
  vehicleCost!: number;

  @Field(() => Float)
  materialCost!: number;

  @Field(() => Float)
  truckingCost!: number;

  @Field(() => Float)
  totalDirectCost!: number; // sum of the four above

  // --- Net ---
  @Field(() => Float)
  netIncome!: number; // totalRevenue - totalDirectCost

  /** null when totalRevenue === 0 (avoid divide-by-zero) */
  @Field(() => Float, { nullable: true })
  netMarginPercent?: number;

  // --- Productivity (may be 0 if no tonnes data) ---
  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float)
  totalCrewHours!: number;

  /** 0 when no tonnes or crew hours */
  @Field(() => Float)
  tonnesPerHour!: number;

  /** Expected T/H from log regression, 0 if insufficient data */
  @Field(() => Float)
  expectedTonnesPerHour!: number;

  /**
   * (actual T/H - expected T/H) / expected T/H * 100.
   * null when expectedTonnesPerHour === 0.
   */
  @Field(() => Float, { nullable: true })
  residualTonnesPerHourPercent?: number;
}

@ObjectType()
export class FinancialPerformanceReport {
  @Field(() => Int)
  year!: number;

  @Field(() => Float)
  totalRevenue!: number;

  @Field(() => Float)
  totalDirectCost!: number;

  @Field(() => Float)
  totalNetIncome!: number;

  /** Weighted average: totalNetIncome / totalRevenue * 100. null if no revenue. */
  @Field(() => Float, { nullable: true })
  averageNetMarginPercent?: number;

  /** Pearson r between residualTonnesPerHourPercent and netMarginPercent (jobsites with both). */
  @Field(() => Float, { nullable: true })
  correlationResidualThMargin?: number;

  @Field(() => [JobsiteFinancialItem])
  jobsites!: JobsiteFinancialItem[];
}
