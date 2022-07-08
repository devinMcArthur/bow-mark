import {
  EmployeeClass,
  JobsiteClass,
  JobsiteDayReportClass,
  JobsiteMaterialClass,
  VehicleClass,
} from "@models";
import { DocumentType, modelOptions, prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, Float, ID, ObjectType, registerEnumType } from "type-graphql";
import { CrewTypes } from "./crew";
import { InvoiceReportClass } from "./invoice";
import { Id, UpdateClass } from "./models";

// Keep this for comment
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import ReportIssueFullResolver from "@graphql/resolvers/reportIssueFull";

export interface IJobsiteReportBuild {
  jobsiteId: Id;
  date: Date;
}

@ObjectType()
export class RangeSummaryReportClass {
  @Field(() => ID, { nullable: false })
  public _id?: Types.ObjectId;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public externalExpenseInvoiceValue!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public internalExpenseInvoiceValue!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public accrualExpenseInvoiceValue!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public externalRevenueInvoiceValue!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public internalRevenueInvoiceValue!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public accrualRevenueInvoiceValue!: number;
}

@ObjectType()
export class JobsiteReportBaseClass {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field(() => JobsiteClass, { nullable: false })
  @prop({ ref: () => JobsiteClass, required: true })
  public jobsite!: Ref<JobsiteClass>;

  @Field(() => [JobsiteDayReportClass], { nullable: false })
  @prop({ ref: () => JobsiteDayReportClass, default: [], required: true })
  public dayReports!: Ref<JobsiteDayReportClass>[];

  @Field(() => [InvoiceReportClass], { nullable: false })
  @prop({ type: () => InvoiceReportClass, required: true, default: [] })
  public expenseInvoices!: InvoiceReportClass[];

  @Field(() => [InvoiceReportClass], { nullable: false })
  @prop({ type: () => InvoiceReportClass, required: true, default: [] })
  public revenueInvoices!: InvoiceReportClass[];

  @Field(() => RangeSummaryReportClass, { nullable: false })
  @prop({ type: () => RangeSummaryReportClass, required: true, default: {} })
  public summary!: RangeSummaryReportClass;

  @Field(() => [CrewTypes], { nullable: false })
  @prop({ type: [String], enum: CrewTypes, required: true, default: [] })
  public crewTypes!: CrewTypes[];

  @Field(() => [ReportIssueFullClass])
  @prop({
    type: () => ReportIssueBaseClass,
    discriminators: () => [
      {
        type: ReportIssueEmployeeRateZeroClass,
        value: ReportIssueTypes.EmployeeRateZero,
      },
      {
        type: ReportIssueVehicleRateZeroClass,
        value: ReportIssueTypes.VehicleRateZero,
      },
      {
        type: ReportIssueMaterialRateZeroClass,
        value: ReportIssueTypes.MaterialRateZero,
      },
      {
        type: ReportIssueNonCostedMaterialsClass,
        value: ReportIssueTypes.NonCostedMaterials,
      },
      {
        type: ReportIssueMaterialEstimatedRateClass,
        value: ReportIssueTypes.MaterialEstimatedRate,
      },
    ],
    default: [],
  })
  public issues!: ReportIssueBaseClass[];

  @Field(() => UpdateClass, { nullable: false })
  @prop({ type: () => UpdateClass, required: true, default: {} })
  public update!: UpdateClass;
}

/**
 * ----- Summary -----
 */

@ObjectType()
class SummaryBaseReport {
  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public employeeHours!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public employeeCost!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public vehicleHours!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public vehicleCost!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public materialQuantity!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public materialCost!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public nonCostedMaterialQuantity!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public truckingQuantity!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public truckingHours!: number;

  @Field(() => Float, { nullable: false })
  @prop({ required: true, default: 0 })
  public truckingCost!: number;
}

@ObjectType()
export class OnSiteSummaryReportClass extends SummaryBaseReport {
  @Field(() => ID, { nullable: false })
  public _id?: Types.ObjectId;

  @Field(() => [CrewTypeOnSiteSummaryClass], { nullable: false })
  @prop({ type: () => CrewTypeOnSiteSummaryClass, required: true, default: [] })
  public crewTypeSummaries!: CrewTypeOnSiteSummaryClass[];
}

export type OnSiteSummaryReportDocument =
  DocumentType<OnSiteSummaryReportClass>;

@ObjectType()
export class CrewTypeOnSiteSummaryClass extends SummaryBaseReport {
  @Field(() => ID, { nullable: false })
  public _id?: Types.ObjectId;

  @Field(() => CrewTypes, { nullable: false })
  @prop({ enum: CrewTypes, required: true })
  public crewType!: CrewTypes;
}

/**
 * ----- Master Report -----
 */

@ObjectType()
export class JobsiteMasterReportItemClass {
  @Field(() => ID, { nullable: false })
  public _id?: Types.ObjectId;

  @Field(() => OnSiteSummaryReportClass, { nullable: false })
  @prop({ required: true, default: {}, type: () => OnSiteSummaryReportClass })
  public summary!: OnSiteSummaryReportClass;
}

/**
 * ----- Issues -----
 */

export enum ReportIssueTypes {
  EmployeeRateZero = "EMPLOYEE_RATE_ZERO",
  VehicleRateZero = "VEHICLE_RATE_ZERO",
  MaterialRateZero = "MATERIAL_RATE_ZERO",
  NonCostedMaterials = "NON_COSTED_MATERIALS",
  MaterialEstimatedRate = "MATERIAL_ESTIMATED_RATE",
}

registerEnumType(ReportIssueTypes, {
  name: "ReportIssueTypes",
});

@ObjectType()
@modelOptions({
  schemaOptions: {
    discriminatorKey: "type",
  },
})
export class ReportIssueBaseClass {
  @Field(() => ID, { nullable: false })
  public _id?: Types.ObjectId;

  @Field(() => ReportIssueTypes, { nullable: false })
  @prop({ enum: ReportIssueTypes, required: true })
  public type!: ReportIssueTypes;
}

@ObjectType()
export class ReportIssueEmployeeRateZeroClass extends ReportIssueBaseClass {
  @prop({ ref: () => EmployeeClass, required: true })
  public employee!: Ref<EmployeeClass>;
}

@ObjectType()
export class ReportIssueVehicleRateZeroClass extends ReportIssueBaseClass {
  @prop({ ref: () => VehicleClass, required: true })
  public vehicle!: Ref<VehicleClass>;
}

@ObjectType()
export class ReportIssueMaterialRateZeroClass extends ReportIssueBaseClass {
  @prop({ ref: () => JobsiteMaterialClass, required: true })
  public jobsiteMaterial!: Ref<JobsiteMaterialClass>;
}

@ObjectType()
export class ReportIssueNonCostedMaterialsClass extends ReportIssueBaseClass {
  @prop({ required: true })
  public amount!: number;
}

@ObjectType()
export class ReportIssueMaterialEstimatedRateClass extends ReportIssueBaseClass {
  @prop({ ref: () => JobsiteMaterialClass, required: true })
  public jobsiteMaterial!: Ref<JobsiteMaterialClass>;
}

/**
 * @desc Only used for GraphQL to recognized the discriminated sub-document
 * @see Resolver {@link ReportIssueFullResolver}
 */

@ObjectType()
export class ReportIssueFullClass extends ReportIssueBaseClass {
  @Field(() => EmployeeClass, { nullable: true })
  public employee!: Ref<EmployeeClass>;

  @Field(() => VehicleClass, { nullable: true })
  public vehicle!: Ref<VehicleClass>;

  @Field(() => JobsiteMaterialClass, { nullable: true })
  public jobsiteMaterial!: Ref<JobsiteMaterialClass>;

  @Field({ nullable: true })
  public amount!: number;
}

export type ReportIssueFullDocument = DocumentType<ReportIssueFullClass>;

export type IssuesGenerationArray =
  | ({
      type: ReportIssueTypes.EmployeeRateZero;
    } & ReportIssueEmployeeRateZeroClass)
  | ({
      type: ReportIssueTypes.VehicleRateZero;
    } & ReportIssueVehicleRateZeroClass)
  | ({
      type: ReportIssueTypes.MaterialRateZero;
    } & ReportIssueMaterialRateZeroClass)
  | ({
      type: ReportIssueTypes.NonCostedMaterials;
    } & ReportIssueNonCostedMaterialsClass)
  | ({
      type: ReportIssueTypes.MaterialEstimatedRate;
    } & ReportIssueMaterialEstimatedRateClass);
