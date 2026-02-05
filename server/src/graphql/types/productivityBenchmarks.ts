/**
 * GraphQL types for cross-jobsite productivity benchmarking
 *
 * Compares T/H rates across all jobsites for a given year
 */

import { Field, Float, ID, InputType, Int, ObjectType } from "type-graphql";
import { MaterialGrouping } from "./productivityAnalytics";

@InputType()
export class ProductivityBenchmarkInput {
  @Field(() => Int)
  year!: number;

  @Field(() => MaterialGrouping, { nullable: true })
  materialGrouping?: MaterialGrouping;

  @Field(() => [String], { nullable: true })
  selectedMaterials?: string[]; // Composite keys like "HL3|Paving" or just "HL3"
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
}
