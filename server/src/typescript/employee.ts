import { EmployeeDocument } from "@models";
import { Field, Float, ObjectType } from "type-graphql";

export interface IEmployeeCreate {
  name: string;
  jobTitle?: string;
}

export type IEmployeeUpdate = IEmployeeCreate;

export interface IEmployeeSearchObject {
  score: number;
  employee: EmployeeDocument;
}

@ObjectType()
class EmployeeHourReport {
  @Field(() => Float, { nullable: false })
  public hours!: number;

  @Field(() => Date, { nullable: false })
  public date!: Date;
}

@ObjectType()
export class EmployeeHoursReport {
  @Field(() => [EmployeeHourReport], { nullable: false })
  public days!: EmployeeHourReport[];
}
