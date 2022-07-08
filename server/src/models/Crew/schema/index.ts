import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { post, prop, Ref } from "@typegoose/typegoose";
import {
  CrewDocument,
  EmployeeClass,
  JobsiteClass,
  VehicleClass,
} from "@models";
import SchemaVersions from "@constants/SchemaVersions";
import { ES_updateCrew } from "@elasticsearch/helpers/crew";
import { CrewTypes } from "@typescript/crew";

@ObjectType()
@post<CrewDocument>("save", async (crew) => {
  await ES_updateCrew(crew);
})
export class CrewSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, minlength: 2, trim: true, unique: true })
  public name!: string;

  @Field(() => CrewTypes, { nullable: false })
  @prop({ required: true, enum: CrewTypes })
  public type!: CrewTypes;

  @Field(() => [EmployeeClass])
  @prop({ ref: () => EmployeeClass, default: [] })
  public employees!: Ref<EmployeeClass>[];

  @Field(() => [VehicleClass])
  @prop({ ref: () => VehicleClass, default: [] })
  public vehicles!: Ref<VehicleClass>[];

  @Field()
  @prop({ required: true, default: SchemaVersions.Crew })
  public schemaVersion!: number;

  @Field(() => Date, { nullable: true })
  @prop({ required: false })
  public archivedAt!: Date;

  /**
   * @deprecated jobsite holds the list of crews
   */
  @Field(() => [JobsiteClass])
  @prop({ ref: () => JobsiteClass })
  public jobsites!: Ref<JobsiteClass>[];
}
