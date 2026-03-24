import { CompanyDocument, JobsiteDocument, MaterialDocument } from "@models";
import { prop } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType, registerEnumType } from "type-graphql";
import {
  DefaultRateClass,
  IDefaultRateData,
  IRatesData,
  RateClass,
} from "./models";

export interface IJobsiteMaterialCreate {
  jobsite: JobsiteDocument;
  material: MaterialDocument;
  supplier: CompanyDocument;
  quantity: number;
  unit: string;
  rates: IJobsiteMaterialRateData[];
  deliveredRates: IJobsiteMaterialDeliveredRateData[];
  delivered?: boolean;
  costType: JobsiteMaterialCostType;
  // new fields
  costModel?: JobsiteMaterialCostModel;
  scenarios?: IRateScenarioData[];
}

export interface IJobsiteMaterialUpdate {
  supplier: CompanyDocument;
  quantity: number;
  unit: string;
  costType: JobsiteMaterialCostType;
  rates: IJobsiteMaterialRateData[];
  delivered?: boolean;
  deliveredRates: IJobsiteMaterialDeliveredRateData[];
  // new fields
  costModel?: JobsiteMaterialCostModel;
  scenarios?: IRateScenarioData[];
}

export interface IJobsiteMaterialRateData extends IRatesData {
  estimated: boolean;
}

@ObjectType()
export class JobsiteMaterialRateClass extends RateClass {
  @Field({ nullable: true })
  @prop({ required: true, default: false })
  public estimated!: boolean;
}

export interface IJobsiteMaterialDeliveredRateData
  extends Omit<IDefaultRateData, "rates"> {
  rates: IJobsiteMaterialRateData[];
}

@ObjectType()
export class JobsiteMaterialDeliveredRateClass extends DefaultRateClass {
  @Field(() => [JobsiteMaterialRateClass], { nullable: false })
  @prop({
    type: () => [JobsiteMaterialRateClass],
    required: true,
    default: [],
    validate: {
      validator: (val) => val.length > 0,
      message: "must have at least one rate",
    },
  })
  public rates!: JobsiteMaterialRateClass[];
}

export type YearlyQuantity = Record<number, number>;

@ObjectType()
export class YearlyMaterialQuantity {
  @Field()
  year!: number;

  @Field()
  quantity!: number;
}

export enum JobsiteMaterialCostType {
  rate = "rate",
  deliveredRate = "deliveredRate",
  invoice = "invoice",
}
registerEnumType(JobsiteMaterialCostType, {
  name: "JobsiteMaterialCostType",
});

export enum JobsiteMaterialCostModel {
  rate = "rate",
  invoice = "invoice",
}
registerEnumType(JobsiteMaterialCostModel, {
  name: "JobsiteMaterialCostModel",
});

export interface IRateScenarioData {
  label: string;
  delivered: boolean;
  rates: IJobsiteMaterialRateData[];
}

@ObjectType()
export class RateScenarioClass {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field()
  @prop({ required: true })
  public label!: string;

  @Field()
  @prop({ required: true, default: false })
  public delivered!: boolean;

  @Field(() => [JobsiteMaterialRateClass])
  @prop({ type: () => [JobsiteMaterialRateClass], required: true, default: [] })
  public rates!: JobsiteMaterialRateClass[];
}
