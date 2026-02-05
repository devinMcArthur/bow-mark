/**
 * GraphQL types for PostgreSQL-backed productivity analytics
 *
 * These types support:
 * 1. Hours by Labor Type - Time breakdown by job_title
 * 2. Tonnes per Hour (T/H) - Material productivity metrics
 */

import {
  Field,
  Float,
  ID,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from "type-graphql";

/**
 * Material grouping dimension for productivity analysis
 *
 * - MATERIAL_ONLY: Group by material name only (current behavior)
 * - CREW_TYPE: Group by material + crew type (separates Paving/Patch/Base)
 * - JOB_TITLE: Group by material + dominant job title (separates Subgrade Prep/Gravel Work)
 */
export enum MaterialGrouping {
  MATERIAL_ONLY = "MATERIAL_ONLY",
  CREW_TYPE = "CREW_TYPE",
  JOB_TITLE = "JOB_TITLE",
}

registerEnumType(MaterialGrouping, {
  name: "MaterialGrouping",
  description: "How to group materials for productivity analysis",
});

/**
 * Date range input for filtering productivity queries
 */
@InputType()
export class DateRangeInput {
  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;
}

/**
 * Labor type hours breakdown
 * Shows hours worked by each job_title, grouped by crew type
 */
@ObjectType()
export class LaborTypeHours {
  @Field()
  jobTitle!: string;

  @Field()
  crewType!: string;

  @Field(() => Float)
  totalManHours!: number;

  @Field(() => Float)
  avgHoursPerDay!: number;

  @Field(() => Int)
  dayCount!: number;

  @Field(() => Int)
  employeeCount!: number;
}

/**
 * Material productivity metrics
 * Shows tonnes and T/H breakdown by material name
 *
 * Note: When multiple materials are delivered on the same day, crew hours
 * are split proportionally by tonnes to estimate per-material T/H.
 */
/**
 * Reference to a daily report for linking purposes
 */
@ObjectType()
export class DailyReportReference {
  @Field()
  id!: string;

  @Field(() => Date)
  date!: Date;
}

/**
 * Daily productivity breakdown for a single material on a single day
 */
@ObjectType()
export class MaterialDailyBreakdown {
  @Field(() => Date)
  date!: Date;

  @Field()
  dailyReportId!: string;

  @Field(() => Float)
  tonnes!: number;

  @Field(() => Float)
  crewHours!: number;

  @Field(() => Float)
  tonnesPerHour!: number;
}

@ObjectType()
export class MaterialProductivity {
  @Field()
  materialName!: string;

  @Field({ nullable: true })
  crewType?: string;

  @Field({ nullable: true })
  jobTitle?: string;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float)
  totalCrewHours!: number;

  @Field(() => Float)
  tonnesPerHour!: number;

  @Field(() => Int)
  shipmentCount!: number;

  @Field(() => [DailyReportReference])
  dailyReports!: DailyReportReference[];

  @Field(() => [MaterialDailyBreakdown])
  dailyBreakdown!: MaterialDailyBreakdown[];
}

/**
 * Optional detailed crew hours breakdown per day
 */
@ObjectType()
export class CrewHoursDetail {
  @Field(() => Date)
  date!: Date;

  @Field()
  crewType!: string;

  @Field(() => Float)
  avgCrewHours!: number;

  @Field(() => Float)
  totalManHours!: number;

  @Field(() => Int)
  totalEmployees!: number;

  @Field(() => Int)
  crewCount!: number;
}

/**
 * Complete jobsite productivity report
 */
@ObjectType()
export class JobsiteProductivityReport {
  @Field(() => ID)
  jobsiteId!: string;

  @Field()
  jobsiteName!: string;

  @Field({ nullable: true })
  jobcode?: string;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;

  @Field(() => [LaborTypeHours])
  laborTypeHours!: LaborTypeHours[];

  @Field(() => [MaterialProductivity])
  materialProductivity!: MaterialProductivity[];

  @Field(() => Float)
  overallTonnesPerHour!: number;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float)
  totalCrewHours!: number;

  @Field(() => [CrewHoursDetail], { nullable: true })
  crewHoursDetail?: CrewHoursDetail[];
}
