import {
  CompanyClass,
  CrewClass,
  DailyReportClass,
  EmployeeClass,
  JobsiteClass,
  VehicleClass,
} from "@models";
import { Field, Float, ObjectType } from "type-graphql";

@ObjectType()
export class SearchClass {
  @Field(() => Float)
  public score!: number;

  @Field(() => EmployeeClass, { nullable: true })
  public employee?: EmployeeClass;

  @Field(() => VehicleClass, { nullable: true })
  public vehicle?: VehicleClass;

  @Field(() => JobsiteClass, { nullable: true })
  public jobsite?: JobsiteClass;

  @Field(() => DailyReportClass, { nullable: true })
  public dailyReport?: DailyReportClass;

  @Field(() => CrewClass, { nullable: true })
  public crew?: CrewClass;

  @Field(() => CompanyClass, { nullable: true })
  public company?: CompanyClass;
}
