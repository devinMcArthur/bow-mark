import SchemaVersions from "@constants/SchemaVersions";
import { EmployeeClass } from "@models";
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class SignupSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field(() => EmployeeClass, { nullable: false })
  @prop({ ref: () => EmployeeClass, required: true, trim: true })
  public employee!: Ref<EmployeeClass>;

  @Field({ nullable: false })
  @prop({ required: true, default: Date.now })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: SchemaVersions.ReportNote })
  public schemaVersion!: number;
}
