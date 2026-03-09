import SchemaVersions from "@constants/SchemaVersions";
import { CrewClass, EmployeeDocument, UserClass } from "@models";
import { search_UpdateEmployee } from "@search";
import { post, prop, Ref } from "@typegoose/typegoose";
import { RateClass } from "@typescript/models";
import errorHandler from "@utils/errorHandler";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
@post<EmployeeDocument>("save", async (employee) => {
  try {
    search_UpdateEmployee(employee);
  } catch (e) {
    errorHandler("Employee post save ES error", e);
  }
  try {
    await employee.requestReportUpdate();
  } catch (e) {
    errorHandler("Employee post save report error", e);
  }
})
export class EmployeeSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, minlength: 2, trim: true, unique: true })
  public name!: string;

  @Field({ nullable: true })
  @prop({ trim: true })
  public jobTitle?: string;

  @Field(() => [RateClass], { nullable: false })
  @prop({ type: () => [RateClass], default: [], required: true })
  public rates!: RateClass[];

  @Field()
  @prop({ required: true, default: SchemaVersions.Employee })
  public schemaVersion!: number;

  /**
   * @deprecated user will hold link to employee
   */
  @Field(() => UserClass)
  @prop({ ref: () => UserClass })
  public user?: Ref<UserClass>;

  @Field(() => Date, { nullable: true })
  @prop({ required: false })
  public archivedAt?: Date;

  /**
   * @deprecated crews hold the link to an employee
   */
  @Field(() => [CrewClass])
  @prop({ ref: () => CrewClass })
  public crews!: Ref<CrewClass>[];
}
