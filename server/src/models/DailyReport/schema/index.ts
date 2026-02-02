import SchemaVersions from "@constants/SchemaVersions";
import {
  CrewClass,
  DailyReportDocument,
  EmployeeWorkClass,
  JobsiteClass,
  MaterialShipmentClass,
  ProductionClass,
  ReportNoteClass,
  VehicleWorkClass,
  EmployeeClass,
  VehicleClass,
} from "@models";
import { publishDailyReportChange } from "../../../rabbitmq/publisher";
import { search_UpdateDailyReport } from "@search";
import { post, prop, Ref } from "@typegoose/typegoose";
import errorHandler from "@utils/errorHandler";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
@post<DailyReportDocument>("save", async (dailyReport) => {
  await search_UpdateDailyReport(dailyReport);
  try {
    await dailyReport.requestReportUpdate();
  } catch (e) {
    errorHandler("Daily report post save error", e);
  }

  // Publish to RabbitMQ for PostgreSQL sync
  try {
    await publishDailyReportChange("updated", dailyReport._id.toString());
  } catch (e) {
    errorHandler("Daily report RabbitMQ publish error", e);
  }
})
export class DailyReportSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true })
  public date!: Date;

  @Field(() => JobsiteClass, { nullable: false })
  @prop({ ref: () => JobsiteClass, required: true })
  public jobsite!: Ref<JobsiteClass>;

  @Field(() => CrewClass, { nullable: false })
  @prop({ ref: () => CrewClass, required: true })
  public crew!: Ref<CrewClass>;

  @Field({ nullable: false, name: "jobCostApproved" })
  @prop({ required: true, default: false })
  public approved!: boolean;

  @Field({ nullable: false })
  @prop({ required: true, default: false })
  public payrollComplete!: boolean;

  @Field(() => [EmployeeWorkClass])
  @prop({ ref: () => EmployeeWorkClass, default: [] })
  public employeeWork!: Ref<EmployeeWorkClass>[];

  @Field(() => [VehicleWorkClass])
  @prop({ ref: () => VehicleWorkClass, default: [] })
  public vehicleWork!: Ref<VehicleWorkClass>[];

  @Field(() => [ProductionClass])
  @prop({ ref: () => ProductionClass, default: [] })
  public production!: Ref<ProductionClass>[];

  @Field(() => [MaterialShipmentClass])
  @prop({ ref: () => MaterialShipmentClass, default: [] })
  public materialShipment!: Ref<MaterialShipmentClass>[];

  @Field(() => ReportNoteClass, { nullable: true })
  @prop({ ref: () => ReportNoteClass })
  public reportNote!: Ref<ReportNoteClass>;

  @Field(() => [EmployeeClass])
  @prop({ ref: () => EmployeeClass, default: [] })
  public temporaryEmployees!: Ref<EmployeeClass>[];

  @Field(() => [VehicleClass])
  @prop({ ref: () => VehicleClass, default: [] })
  public temporaryVehicles!: Ref<VehicleClass>[];

  @Field(() => Boolean)
  @prop({ required: true, default: false })
  public archived!: boolean;

  @Field()
  @prop({ required: true, default: SchemaVersions.DailyReport })
  public schemaVersion!: number;
}
