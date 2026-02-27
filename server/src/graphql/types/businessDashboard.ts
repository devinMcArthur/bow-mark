/**
 * GraphQL types for the Business Dashboard page (/dashboard).
 * Covers three query shapes: Overview, Financial, and Productivity,
 * each accepting a date range (startDate + endDate) as input.
 */

import { Field, Float, ID, InputType, Int, ObjectType } from "type-graphql";
import { MaterialGrouping } from "./productivityAnalytics";
import { RegressionCoefficients } from "./productivityBenchmarks";

// ─── Inputs ──────────────────────────────────────────────────────────────────

@InputType()
export class DashboardInput {
  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;
}

@InputType()
export class DashboardProductivityInput extends DashboardInput {
  @Field(() => MaterialGrouping, { nullable: true })
  materialGrouping?: MaterialGrouping;

  @Field(() => [String], { nullable: true })
  selectedMaterials?: string[]; // Composite keys like "HL3|Paving" or just "HL3"
}

// ─── Overview ────────────────────────────────────────────────────────────────

@ObjectType()
export class DashboardOverviewItem {
  @Field(() => ID)
  jobsiteId!: string; // MongoDB ID for client-side links

  @Field()
  jobsiteName!: string;

  @Field({ nullable: true })
  jobcode?: string;

  @Field(() => Float)
  totalRevenue!: number;

  @Field(() => Float)
  totalDirectCost!: number;

  @Field(() => Float)
  netIncome!: number;

  @Field(() => Float, { nullable: true })
  netMarginPercent?: number; // null when revenue is 0

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float, { nullable: true })
  tonnesPerHour?: number; // null when crew hours is 0
}

@ObjectType()
export class DashboardOverviewReport {
  @Field(() => Float)
  totalRevenue!: number;

  @Field(() => Float)
  totalNetIncome!: number;

  @Field(() => Float, { nullable: true })
  avgNetMarginPercent?: number;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float, { nullable: true })
  avgTonnesPerHour?: number;

  // Year-over-year % change (null if no prior period data)
  @Field(() => Float, { nullable: true })
  revenueChangePercent?: number;

  @Field(() => Float, { nullable: true })
  netIncomeChangePercent?: number;

  @Field(() => Float, { nullable: true })
  tonnesChangePercent?: number;

  @Field(() => Float, { nullable: true })
  tonnesPerHourChangePercent?: number;

  @Field(() => [DashboardOverviewItem])
  jobsites!: DashboardOverviewItem[];
}

// ─── Financial ───────────────────────────────────────────────────────────────

@ObjectType()
export class DashboardFinancialItem {
  @Field(() => ID)
  jobsiteId!: string;

  @Field()
  jobsiteName!: string;

  @Field({ nullable: true })
  jobcode?: string;

  @Field(() => Float)
  totalRevenue!: number;

  @Field(() => Float)
  employeeCost!: number;

  @Field(() => Float)
  vehicleCost!: number;

  @Field(() => Float)
  materialCost!: number;

  @Field(() => Float)
  truckingCost!: number;

  @Field(() => Float)
  expenseInvoiceCost!: number;

  @Field(() => Float)
  totalDirectCost!: number;

  @Field(() => Float)
  netIncome!: number;

  @Field(() => Float, { nullable: true })
  netMarginPercent?: number;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float, { nullable: true })
  tonnesPerHour?: number;
}

@ObjectType()
export class DashboardFinancialReport {
  @Field(() => Float)
  totalRevenue!: number;

  @Field(() => Float)
  totalDirectCost!: number;

  @Field(() => Float)
  totalNetIncome!: number;

  @Field(() => Float, { nullable: true })
  avgNetMarginPercent?: number;

  @Field(() => [DashboardFinancialItem])
  jobsites!: DashboardFinancialItem[];
}

// ─── Productivity ─────────────────────────────────────────────────────────────

@ObjectType()
export class DashboardProductivityJobsiteItem {
  @Field(() => ID)
  jobsiteId!: string;

  @Field()
  jobsiteName!: string;

  @Field({ nullable: true })
  jobcode?: string;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float)
  totalCrewHours!: number;

  @Field(() => Float)
  tonnesPerHour!: number; // non-nullable: only included when > 0

  @Field(() => Int)
  shipmentCount!: number;

  @Field(() => Float)
  percentFromAverage!: number;

  @Field(() => Float, {
    description: "Expected T/H based on job size via log-linear regression",
  })
  expectedTonnesPerHour!: number;

  @Field(() => Float, {
    description: "Percent deviation from size-adjusted expected T/H",
  })
  percentFromExpected!: number;
}

@ObjectType()
export class DashboardProductivityCrewItem {
  @Field(() => ID)
  crewId!: string; // PG UUID — used as React key

  @Field()
  crewName!: string;

  @Field()
  crewType!: string;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float)
  totalCrewHours!: number;

  @Field(() => Float, { nullable: true })
  tonnesPerHour?: number;

  @Field(() => Int)
  dayCount!: number;

  @Field(() => Int)
  jobsiteCount!: number;

  @Field(() => Float, { nullable: true })
  percentFromAverage?: number;
}

@ObjectType()
export class DashboardMaterialOption {
  @Field()
  materialName!: string;

  @Field({ nullable: true })
  crewType?: string;

  @Field({ nullable: true })
  jobTitle?: string;

  @Field()
  key!: string; // Composite key for selection (matches BenchmarkMaterial)

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Int)
  shipmentCount!: number;
}

@ObjectType()
export class DashboardProductivityReport {
  @Field(() => Float)
  averageTonnesPerHour!: number;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float)
  totalCrewHours!: number;

  @Field(() => Int)
  jobsiteCount!: number;

  @Field(() => [DashboardMaterialOption])
  availableMaterials!: DashboardMaterialOption[];

  @Field(() => [DashboardProductivityJobsiteItem])
  jobsites!: DashboardProductivityJobsiteItem[];

  @Field(() => [DashboardProductivityCrewItem])
  crews!: DashboardProductivityCrewItem[];

  @Field(() => RegressionCoefficients)
  regression!: RegressionCoefficients;
}
