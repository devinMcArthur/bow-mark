/**
 * GraphQL types for cross-jobsite productivity benchmarking
 *
 * Compares T/H rates across all jobsites for a given year
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
import { MaterialGrouping } from "./productivityAnalytics";

export enum BenchmarkTarget {
  JOBSITE = "JOBSITE",
  CREW = "CREW",
}

registerEnumType(BenchmarkTarget, { name: "BenchmarkTarget" });

@InputType()
export class ProductivityBenchmarkInput {
  @Field(() => Int)
  year!: number;

  @Field(() => MaterialGrouping, { nullable: true })
  materialGrouping?: MaterialGrouping;

  @Field(() => [String], { nullable: true })
  selectedMaterials?: string[]; // Composite keys like "HL3|Paving" or just "HL3"

  @Field(() => BenchmarkTarget, { nullable: true })
  benchmarkTarget?: BenchmarkTarget; // defaults to JOBSITE
}

@ObjectType()
export class BenchmarkMaterial {
  @Field()
  materialName!: string;

  @Field({ nullable: true })
  crewType?: string;

  @Field({ nullable: true })
  jobTitle?: string;

  @Field()
  key!: string; // Composite key for selection

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Int)
  shipmentCount!: number;
}

@ObjectType()
export class JobsiteBenchmark {
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
  tonnesPerHour!: number;

  @Field(() => Int)
  shipmentCount!: number;

  @Field(() => Float)
  percentFromAverage!: number;

  @Field(() => Float, {
    description: "Expected T/H based on job size: 1.04 + 0.99 * ln(tonnes)",
  })
  expectedTonnesPerHour!: number;

  @Field(() => Float, {
    description: "Percent deviation from size-adjusted expected T/H",
  })
  percentFromExpected!: number;
}

@ObjectType()
export class CrewBenchmark {
  @Field(() => ID)
  crewId!: string;

  @Field()
  crewName!: string;

  @Field()
  crewType!: string;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float)
  totalCrewHours!: number;

  @Field(() => Float)
  tonnesPerHour!: number;

  @Field(() => Int)
  dayCount!: number;

  @Field(() => Int)
  jobsiteCount!: number;

  @Field(() => Float)
  percentFromAverage!: number;
}

@ObjectType()
export class RegressionCoefficients {
  @Field(() => Float, { description: "y-intercept of the regression line" })
  intercept!: number;

  @Field(() => Float, { description: "Slope of the regression line (per ln(tonnes))" })
  slope!: number;
}

@ObjectType()
export class ProductivityBenchmarkReport {
  @Field(() => Int)
  year!: number;

  @Field(() => Float)
  averageTonnesPerHour!: number;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float)
  totalCrewHours!: number;

  @Field(() => Int)
  jobsiteCount!: number;

  @Field(() => [BenchmarkMaterial])
  availableMaterials!: BenchmarkMaterial[];

  @Field(() => [JobsiteBenchmark])
  jobsites!: JobsiteBenchmark[];

  @Field(() => [CrewBenchmark])
  crews!: CrewBenchmark[];

  @Field(() => RegressionCoefficients, {
    description: "Dynamically calculated regression coefficients for T/H vs ln(tonnes)",
  })
  regression!: RegressionCoefficients;
}
