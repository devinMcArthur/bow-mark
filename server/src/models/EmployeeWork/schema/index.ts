import SchemaVersions from "@constants/SchemaVersions";
import { DailyReportClass, EmployeeClass, EmployeeWorkDocument } from "@models";
import { post, prop, Ref } from "@typegoose/typegoose";
import errorHandler from "@utils/errorHandler";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
@post<EmployeeWorkDocument>("save", async (employeeWork) => {
  try {
    await employeeWork.requestReportUpdate();
  } catch (e) {
    errorHandler("Employee work post save error", e);
  }
})
@post<EmployeeWorkDocument>("remove", async (employeeWork) => {
  try {
    await employeeWork.requestReportUpdate();
  } catch (e) {
    errorHandler("Employee work post remove error", e);
  }
})
export class EmployeeWorkSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true })
  public startTime!: Date;

  @Field({ nullable: false })
  @prop({ required: true })
  public endTime!: Date;

  @Field({ nullable: false })
  @prop({ required: true })
  public jobTitle!: string;

  @Field(() => EmployeeClass, { nullable: false })
  @prop({ ref: () => EmployeeClass, required: true })
  public employee!: Ref<EmployeeClass>;

  @Field(() => Date, { nullable: true })
  @prop({ required: false })
  public archivedAt!: Date;

  @Field()
  @prop({ required: true, default: SchemaVersions.EmployeeWork })
  public schemaVersion!: number;

  /**
   * @deprecated link to this document held in DailyReport documents
   */
  @Field(() => DailyReportClass)
  @prop({ ref: () => DailyReportClass })
  public dailyReport!: Ref<DailyReportClass>;
}
