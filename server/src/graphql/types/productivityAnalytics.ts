/**
 * GraphQL types for PostgreSQL-backed productivity analytics
 *
 * These types support:
 * 1. Hours by Labor Type - Time breakdown by job_title
 * 2. Tonnes per Hour (T/H) - Material productivity metrics
 */

import { Field, Float, ID, InputType, Int, ObjectType } from "type-graphql";

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
@ObjectType()
export class MaterialProductivity {
  @Field()
  materialName!: string;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float)
  totalCrewHours!: number;

  @Field(() => Float)
  tonnesPerHour!: number;

  @Field(() => Int)
  shipmentCount!: number;
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
