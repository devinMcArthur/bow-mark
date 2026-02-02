/**
 * GraphQL types for PostgreSQL-backed jobsite reports
 *
 * These types mirror the existing MongoDB-based report types but are
 * populated from PostgreSQL views and fact tables. This allows for
 * side-by-side comparison during migration.
 */

import { Field, Float, ID, ObjectType, registerEnumType } from "type-graphql";

/**
 * Crew type enum (mirrors existing CrewTypes)
 */
export enum CrewTypePG {
  Paving = "Paving",
  Concrete = "Concrete",
  Other = "Other",
}

registerEnumType(CrewTypePG, {
  name: "CrewTypePG",
  description: "Type of crew for PostgreSQL reports",
});

/**
 * Base summary metrics - shared between day and period summaries
 */
@ObjectType()
export class SummaryMetricsPG {
  @Field(() => Float)
  employeeHours!: number;

  @Field(() => Float)
  employeeCost!: number;

  @Field(() => Float)
  vehicleHours!: number;

  @Field(() => Float)
  vehicleCost!: number;

  @Field(() => Float)
  materialQuantity!: number;

  @Field(() => Float)
  materialCost!: number;

  @Field(() => Float)
  nonCostedMaterialQuantity!: number;

  @Field(() => Float)
  truckingQuantity!: number;

  @Field(() => Float)
  truckingHours!: number;

  @Field(() => Float)
  truckingCost!: number;
}

/**
 * Crew type breakdown within a summary
 */
@ObjectType()
export class CrewTypeSummaryPG extends SummaryMetricsPG {
  @Field(() => String)
  crewType!: string;
}

/**
 * On-site summary with crew type breakdowns
 */
@ObjectType()
export class OnSiteSummaryPG extends SummaryMetricsPG {
  @Field(() => [CrewTypeSummaryPG])
  crewTypeSummaries!: CrewTypeSummaryPG[];
}

/**
 * Invoice summary for period reports
 */
@ObjectType()
export class InvoiceSummaryPG {
  @Field(() => Float)
  externalExpenseInvoiceValue!: number;

  @Field(() => Float)
  internalExpenseInvoiceValue!: number;

  @Field(() => Float)
  accrualExpenseInvoiceValue!: number;

  @Field(() => Float)
  externalRevenueInvoiceValue!: number;

  @Field(() => Float)
  internalRevenueInvoiceValue!: number;

  @Field(() => Float)
  accrualRevenueInvoiceValue!: number;
}

/**
 * Report issue types
 */
export enum ReportIssueTypePG {
  EmployeeRateZero = "EMPLOYEE_RATE_ZERO",
  VehicleRateZero = "VEHICLE_RATE_ZERO",
  MaterialRateZero = "MATERIAL_RATE_ZERO",
  MaterialEstimatedRate = "MATERIAL_ESTIMATED_RATE",
  NonCostedMaterials = "NON_COSTED_MATERIALS",
}

registerEnumType(ReportIssueTypePG, {
  name: "ReportIssueTypePG",
});

/**
 * Report issue with entity reference
 */
@ObjectType()
export class ReportIssuePG {
  @Field(() => ReportIssueTypePG)
  type!: ReportIssueTypePG;

  @Field(() => ID, { nullable: true })
  entityId?: string;

  @Field({ nullable: true })
  entityName?: string;

  @Field(() => Float)
  count!: number;
}

/**
 * Employee work entry for day reports
 */
@ObjectType()
export class EmployeeReportPG {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  employeeId!: string;

  @Field()
  employeeName!: string;

  @Field(() => Float)
  hours!: number;

  @Field(() => Float)
  cost!: number;

  @Field()
  crewType!: string;
}

/**
 * Vehicle work entry for day reports
 */
@ObjectType()
export class VehicleReportPG {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  vehicleId!: string;

  @Field()
  vehicleName!: string;

  @Field()
  vehicleCode!: string;

  @Field(() => Float)
  hours!: number;

  @Field(() => Float)
  cost!: number;

  @Field()
  crewType!: string;
}

/**
 * Material shipment entry for day reports
 */
@ObjectType()
export class MaterialReportPG {
  @Field(() => ID)
  id!: string;

  @Field()
  materialName!: string;

  @Field()
  supplierName!: string;

  @Field(() => Float)
  quantity!: number;

  @Field()
  unit!: string;

  @Field(() => Float)
  rate!: number;

  @Field(() => Float)
  cost!: number;

  @Field()
  estimated!: boolean;

  @Field()
  crewType!: string;
}

/**
 * Non-costed material entry
 */
@ObjectType()
export class NonCostedMaterialReportPG {
  @Field(() => ID)
  id!: string;

  @Field()
  materialName!: string;

  @Field()
  supplierName!: string;

  @Field(() => Float)
  quantity!: number;

  @Field({ nullable: true })
  unit?: string;

  @Field()
  crewType!: string;
}

/**
 * Trucking entry
 */
@ObjectType()
export class TruckingReportPG {
  @Field(() => ID)
  id!: string;

  @Field()
  truckingType!: string;

  @Field(() => Float)
  quantity!: number;

  @Field(() => Float, { nullable: true })
  hours?: number;

  @Field(() => Float)
  rate!: number;

  @Field()
  rateType!: string;

  @Field(() => Float)
  cost!: number;

  @Field()
  crewType!: string;
}

/**
 * Invoice entry
 */
@ObjectType()
export class InvoiceReportPG {
  @Field(() => ID)
  id!: string;

  @Field()
  invoiceNumber!: string;

  @Field()
  companyName!: string;

  @Field(() => Float)
  amount!: number;

  @Field({ nullable: true })
  description?: string;

  @Field()
  invoiceType!: string;

  @Field(() => Date)
  date!: Date;
}

/**
 * Daily report from PostgreSQL
 */
@ObjectType()
export class JobsiteDayReportPG {
  @Field(() => ID)
  id!: string;

  @Field(() => Date)
  date!: Date;

  @Field(() => [String])
  crewTypes!: string[];

  @Field(() => OnSiteSummaryPG)
  summary!: OnSiteSummaryPG;

  @Field(() => [EmployeeReportPG])
  employees!: EmployeeReportPG[];

  @Field(() => [VehicleReportPG])
  vehicles!: VehicleReportPG[];

  @Field(() => [MaterialReportPG])
  materials!: MaterialReportPG[];

  @Field(() => [NonCostedMaterialReportPG])
  nonCostedMaterials!: NonCostedMaterialReportPG[];

  @Field(() => [TruckingReportPG])
  trucking!: TruckingReportPG[];
}

/**
 * Jobsite info for reports
 */
@ObjectType()
export class JobsiteInfoPG {
  @Field(() => ID)
  _id!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  jobcode?: string;
}

/**
 * Year report from PostgreSQL
 */
@ObjectType()
export class JobsiteYearReportPG {
  @Field(() => ID)
  _id!: string;

  @Field(() => JobsiteInfoPG)
  jobsite!: JobsiteInfoPG;

  @Field(() => Date)
  startOfYear!: Date;

  @Field(() => [String])
  crewTypes!: string[];

  @Field(() => InvoiceSummaryPG)
  summary!: InvoiceSummaryPG;

  @Field(() => [JobsiteDayReportPG])
  dayReports!: JobsiteDayReportPG[];

  @Field(() => [InvoiceReportPG])
  expenseInvoices!: InvoiceReportPG[];

  @Field(() => [InvoiceReportPG])
  revenueInvoices!: InvoiceReportPG[];

  @Field(() => [ReportIssuePG])
  issues!: ReportIssuePG[];
}

/**
 * Master report jobsite item - per-jobsite summary for master reports
 */
@ObjectType()
export class MasterReportJobsiteItemPG {
  @Field(() => ID)
  jobsiteId!: string;

  @Field()
  jobsiteName!: string;

  @Field({ nullable: true })
  jobcode?: string;

  @Field(() => OnSiteSummaryPG)
  summary!: OnSiteSummaryPG;

  @Field(() => InvoiceSummaryPG)
  invoiceSummary!: InvoiceSummaryPG;
}

/**
 * Year master report from PostgreSQL - aggregates all jobsites
 */
@ObjectType()
export class JobsiteYearMasterReportPG {
  @Field(() => ID)
  _id!: string;

  @Field(() => Date)
  startOfYear!: Date;

  @Field(() => [String])
  crewTypes!: string[];

  @Field(() => InvoiceSummaryPG)
  summary!: InvoiceSummaryPG;

  @Field(() => [MasterReportJobsiteItemPG])
  jobsites!: MasterReportJobsiteItemPG[];
}
