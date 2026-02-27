import { Field, Float, ID, InputType, Int, ObjectType } from "type-graphql";

// ─── Inputs ──────────────────────────────────────────────────────────────────

@InputType()
export class DashboardInput {
  @Field()
  startDate!: string; // ISO date string e.g. "2026-01-01"

  @Field()
  endDate!: string; // ISO date string e.g. "2026-12-31"
}

@InputType()
export class DashboardProductivityInput extends DashboardInput {
  @Field(() => [String], { nullable: true })
  selectedMaterials?: string[]; // Filter by material name
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
  thChangePercent?: number;

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

  @Field(() => Float, { nullable: true })
  tonnesPerHour?: number;

  @Field(() => Float, { nullable: true })
  percentFromAverage?: number;
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

  @Field()
  key!: string; // same as materialName — used as filter key
}

@ObjectType()
export class DashboardProductivityReport {
  @Field(() => Float, { nullable: true })
  avgTonnesPerHour?: number;

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
}
