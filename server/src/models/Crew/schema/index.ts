import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { prop, Ref } from "@typegoose/typegoose";
import { CrewTypes } from "@typescript/crew";
import { EmployeeClass, JobsiteClass, VehicleClass } from "@models";

@ObjectType()
export class CrewSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, minlength: 2, trim: true, unique: true })
  public name!: string;

  @Field({ nullable: false })
  @prop({ required: true, enum: CrewTypes })
  public type!: CrewTypes;

  @Field(() => [EmployeeClass])
  @prop({ ref: () => EmployeeClass, default: [] })
  public employees!: Ref<EmployeeClass>[];

  @Field(() => [VehicleClass])
  @prop({ ref: () => VehicleClass, default: [] })
  public vehicles!: Ref<VehicleClass>[];

  /**
   * @deprecated jobsite holds the list of crews
   */
  @Field(() => [JobsiteClass])
  @prop({ ref: () => JobsiteClass })
  public jobsites!: Ref<JobsiteClass>[];
}