import { Types } from "mongoose";
import { DocumentType, prop, Ref } from "@typegoose/typegoose";
import { Field, Float, ID, ObjectType } from "type-graphql";
import { CrewTypes } from "@typescript/crew";
import {
  VehicleClass,
  VehicleWorkClass,
  JobsiteMaterialClass,
  MaterialShipmentClass,
  EmployeeWorkClass,
  EmployeeClass,
} from "@models";
import { TruckingRateTypes } from "@typescript/jobsite";

@ObjectType()
export class EmployeeReportClass {
  @Field(() => ID, { nullable: false })
  public _id?: Types.ObjectId;

  @Field(() => EmployeeClass, { nullable: true })
  @prop({ ref: () => EmployeeClass, required: true })
  public employee!: Ref<EmployeeClass>;

  @Field(() => [EmployeeWorkClass], { nullable: false })
  @prop({
    ref: () => EmployeeWorkClass,
    default: [],
    required: true,
  })
  public employeeWork!: Ref<EmployeeWorkClass>[];

  @Field(() => Float, { nullable: false })
  @prop({ required: true })
  public rate!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true })
  public hours!: number;

  @Field(() => CrewTypes, { nullable: false })
  @prop({ required: true })
  public crewType!: CrewTypes;
}

export type EmployeeReportDocument = DocumentType<EmployeeReportClass>;

@ObjectType()
export class VehicleReportClass {
  @Field(() => ID, { nullable: false })
  public _id?: Types.ObjectId;

  @Field(() => VehicleClass, { nullable: false })
  @prop({ ref: () => VehicleClass, required: true })
  public vehicle!: Ref<VehicleClass>;

  @Field(() => [VehicleWorkClass], { nullable: false })
  @prop({
    ref: () => VehicleWorkClass,
    default: [],
    required: true,
  })
  public vehicleWork!: Ref<VehicleWorkClass>[];

  @Field(() => Float, { nullable: false })
  @prop({ required: true })
  public rate!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true })
  public hours!: number;

  @Field(() => CrewTypes, { nullable: false })
  @prop({ required: true })
  public crewType!: CrewTypes;
}

export type VehicleReportDocument = DocumentType<VehicleReportClass>;

@ObjectType()
export class MaterialReportClass {
  @Field(() => ID, { nullable: false })
  public _id?: Types.ObjectId;

  @Field(() => JobsiteMaterialClass)
  @prop({ ref: () => JobsiteMaterialClass, required: true })
  public jobsiteMaterial!: Ref<JobsiteMaterialClass>;

  @Field(() => ID, { nullable: true })
  @prop({ type: Types.ObjectId, required: false })
  public deliveredRateId?: Types.ObjectId;

  @Field(() => [MaterialShipmentClass], { nullable: false })
  @prop({
    ref: () => MaterialShipmentClass,
    default: [],
    required: true,
  })
  public materialShipments!: Ref<MaterialShipmentClass>[];

  @Field(() => Float, { nullable: false })
  @prop({ required: true })
  public rate!: number;

  @Field({ nullable: false })
  @prop({ required: true, default: false })
  public estimated!: boolean;

  @Field(() => Float, { nullable: false })
  @prop({ required: true })
  public quantity!: number;

  @Field(() => CrewTypes, { nullable: false })
  @prop({ required: true })
  public crewType!: CrewTypes;
}

export type MaterialReportDocument = DocumentType<MaterialReportClass>;

@ObjectType()
export class NonCostedMaterialReportClass {
  @Field(() => ID, { nullable: false })
  public _id?: Types.ObjectId;

  @Field(() => [MaterialShipmentClass], { nullable: false })
  @prop({
    ref: () => MaterialShipmentClass,
    default: [],
    required: true,
  })
  public materialShipments!: Ref<MaterialShipmentClass>[];

  @Field({ nullable: false })
  @prop({ required: true, trim: true })
  public materialName!: string;

  @Field({ nullable: false })
  @prop({ required: true, trim: true })
  public supplierName!: string;

  @Field(() => Float, { nullable: false })
  @prop({ required: true })
  public quantity!: number;

  @Field(() => CrewTypes, { nullable: false })
  @prop({ required: true })
  public crewType!: CrewTypes;
}

export type NonCostedMaterialReportDocument =
  DocumentType<NonCostedMaterialReportClass>;

@ObjectType()
export class TruckingReportClass {
  @Field(() => ID, { nullable: false })
  public _id?: Types.ObjectId;

  @Field(() => [MaterialShipmentClass], { nullable: false })
  @prop({
    ref: () => MaterialShipmentClass,
    default: [],
    required: true,
  })
  public materialShipments!: Ref<MaterialShipmentClass>[];

  @Field({ nullable: false })
  @prop({ required: true, trim: true })
  public truckingType!: string;

  @Field(() => Float, { nullable: false })
  @prop({ required: true })
  public quantity!: number;

  @Field(() => Float, { nullable: true })
  @prop({ required: false })
  public hours?: number;

  @Field(() => TruckingRateTypes, { nullable: false })
  @prop({
    enum: TruckingRateTypes,
    required: true,
  })
  public type!: TruckingRateTypes;

  @Field(() => Float, { nullable: false })
  @prop({ required: true })
  public rate!: number;

  @Field(() => CrewTypes, { nullable: false })
  @prop({ required: true })
  public crewType!: CrewTypes;
}

export type TruckingReportDocument = DocumentType<TruckingReportClass>;
