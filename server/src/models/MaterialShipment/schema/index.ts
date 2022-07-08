import SchemaVersions from "@constants/SchemaVersions";
import {
  DailyReportClass,
  VehicleClass,
  JobsiteMaterialClass,
  MaterialShipmentDocument,
} from "@models";
import { post, prop, Ref } from "@typegoose/typegoose";
import errorHandler from "@utils/errorHandler";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { VehicleObjectClass } from "./subDocuments";

@ObjectType()
@post<MaterialShipmentDocument>("save", async (materialShipment) => {
  try {
    await materialShipment.requestReportUpdate();
  } catch (e) {
    errorHandler("Jobsite Material post save error", e);
  }
})
@post<MaterialShipmentDocument>("remove", async (materialShipment) => {
  try {
    await materialShipment.requestReportUpdate();
  } catch (e) {
    errorHandler("Jobsite Material post remove error", e);
  }
})
export class MaterialShipmentSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: true })
  @prop({ required: false })
  public shipmentType?: string;

  @Field({ nullable: true })
  @prop({ trim: true })
  public supplier?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  public unit?: string;

  @Field({ nullable: false })
  @prop({ required: true })
  public quantity!: number;

  /**
   * @version 2
   */
  @Field(() => JobsiteMaterialClass, { nullable: true })
  @prop({ ref: () => JobsiteMaterialClass, required: false })
  public jobsiteMaterial?: Ref<JobsiteMaterialClass>;

  /**
   * @version 2
   * @desc if true, will utilize 'shipmentType', 'supplier', 'unit'
   */
  @Field({ nullable: true })
  @prop({ required: true, default: false })
  public noJobsiteMaterial!: boolean;

  @Field({ nullable: true })
  @prop()
  public startTime?: Date;

  @Field({ nullable: true })
  @prop()
  public endTime?: Date;

  @Field(() => VehicleClass, { nullable: true })
  @prop({ ref: () => VehicleClass })
  public vehicle?: Ref<VehicleClass>;

  @Field(() => VehicleObjectClass, { nullable: true })
  @prop({ type: () => VehicleObjectClass })
  public vehicleObject?: VehicleObjectClass;

  @Field(() => Date, { nullable: true })
  @prop({ required: false })
  public archivedAt!: Date;

  @Field()
  @prop({ required: true, default: SchemaVersions.MaterialShipment })
  public schemaVersion!: number;

  /**
   * @deprecated link is already held in DailyReport document
   */
  @Field(() => DailyReportClass)
  @prop({ ref: () => DailyReportClass })
  public dailyReport!: Ref<DailyReportClass>;
}
