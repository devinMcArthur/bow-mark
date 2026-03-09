export * from "./Company";
export * from "./Crew";
export * from "./DailyReport";
export * from "./Employee";
export * from "./EmployeeWork";
export * from "./File";
export * from "./Invoice";
export * from "./Jobsite";
export * from "./JobsiteDayReport";
export * from "./JobsiteMaterial";
export * from "./JobsiteMonthReport";
export * from "./JobsiteYearMasterReport";
export * from "./JobsiteYearReport";
export * from "./Material";
export * from "./MaterialShipment";
export * from "./OperatorDailyReport";
export * from "./Production";
export * from "./ReportNote";
export * from "./Signup";
export * from "./System";
export * from "./User";
export * from "./Vehicle";
export * from "./VehicleIssue";
export * from "./VehicleWork";

import {
  getModelForClass,
  DocumentType,
  ReturnModelType,
} from "@typegoose/typegoose";

/**
 * ----- Company -----
 */

import { CompanyClass } from "./Company/class";

export type CompanyDocument = DocumentType<CompanyClass>;

export type CompanyModel = ReturnModelType<typeof CompanyClass>;

export const Company = getModelForClass(CompanyClass, {
  schemaOptions: { collection: "companies" },
});

/**
 * ----- Crew -----
 */

import { CrewClass } from "./Crew/class";

export type CrewDocument = DocumentType<CrewClass>;

export type CrewModel = ReturnModelType<typeof CrewClass>;

export const Crew = getModelForClass(CrewClass, {
  schemaOptions: { collection: "crews" },
});

/**
 * ----- Employee -----
 */

import { EmployeeClass } from "./Employee/class";

export type EmployeeDocument = DocumentType<EmployeeClass>;

export type EmployeeModel = ReturnModelType<typeof EmployeeClass>;

export const Employee = getModelForClass(EmployeeClass, {
  schemaOptions: { collection: "employees" },
});

/**
 * ----- Daily Report -----
 */

import { DailyReportClass } from "./DailyReport/class";

export type DailyReportDocument = DocumentType<DailyReportClass>;

export type DailyReportModel = ReturnModelType<typeof DailyReportClass>;

export const DailyReport = getModelForClass(DailyReportClass, {
  schemaOptions: { collection: "dailyreports" },
});

/**
 * ----- Employee Work -----
 */

import { EmployeeWorkClass } from "./EmployeeWork/class";

export type EmployeeWorkDocument = DocumentType<EmployeeWorkClass>;

export type EmployeeWorkModel = ReturnModelType<typeof EmployeeWorkClass>;

export const EmployeeWork = getModelForClass(EmployeeWorkClass, {
  schemaOptions: { collection: "employeeworks" },
});

/**
 * ----- File -----
 */

import { FileClass } from "./File/class";

export type FileDocument = DocumentType<FileClass>;

export type FileModel = ReturnModelType<typeof FileClass>;

export const File = getModelForClass(FileClass, {
  schemaOptions: { collection: "files" },
});

/**
 * ----- Invoice -----
 */

import { InvoiceClass } from "./Invoice/class";

export type InvoiceDocument = DocumentType<InvoiceClass>;

export type InvoiceModel = ReturnModelType<typeof InvoiceClass>;

export const Invoice = getModelForClass(InvoiceClass, {
  schemaOptions: { collection: "invoices" },
});

/**
 * ----- Jobsite -----
 */

import { JobsiteClass } from "./Jobsite/class";

export type JobsiteDocument = DocumentType<JobsiteClass>;

export type JobsiteModel = ReturnModelType<typeof JobsiteClass>;

export const Jobsite = getModelForClass(JobsiteClass, {
  schemaOptions: { collection: "jobsites" },
});

/**
 * ----- Jobsite Day Report -----
 */

import { JobsiteDayReportClass } from "./JobsiteDayReport/class";

export type JobsiteDayReportDocument = DocumentType<JobsiteDayReportClass>;

export type JobsiteDayReportModel = ReturnModelType<
  typeof JobsiteDayReportClass
>;

export const JobsiteDayReport = getModelForClass(JobsiteDayReportClass, {
  schemaOptions: { collection: "jobsiteDayReports" },
});

/**
 * ----- Jobsite Material -----
 */

import { JobsiteMaterialClass } from "./JobsiteMaterial/class";

export type JobsiteMaterialDocument = DocumentType<JobsiteMaterialClass>;

export type JobsiteMaterialModel = ReturnModelType<typeof JobsiteMaterialClass>;

export const JobsiteMaterial = getModelForClass(JobsiteMaterialClass, {
  schemaOptions: { collection: "jobsiteMaterials" },
});

/**
 * ----- Jobsite Month Report -----
 */

import { JobsiteMonthReportClass } from "./JobsiteMonthReport/class";

export type JobsiteMonthReportDocument = DocumentType<JobsiteMonthReportClass>;

export type JobsiteMonthReportModel = ReturnModelType<
  typeof JobsiteMonthReportClass
>;

export const JobsiteMonthReport = getModelForClass(JobsiteMonthReportClass, {
  schemaOptions: { collection: "jobsiteMonthReports" },
});

/**
 * ----- Jobsite Year Master Report -----
 */

import { JobsiteYearMasterReportClass } from "./JobsiteYearMasterReport/class";

export type JobsiteYearMasterReportDocument =
  DocumentType<JobsiteYearMasterReportClass>;

export type JobsiteYearMasterReportModel = ReturnModelType<
  typeof JobsiteYearMasterReportClass
>;

export const JobsiteYearMasterReport = getModelForClass(
  JobsiteYearMasterReportClass,
  {
    schemaOptions: { collection: "jobsiteYearMasterReports" },
  }
);

/**
 * ----- Jobsite Year Report -----
 */

import { JobsiteYearReportClass } from "./JobsiteYearReport/class";

export type JobsiteYearReportDocument = DocumentType<JobsiteYearReportClass>;

export type JobsiteYearReportModel = ReturnModelType<
  typeof JobsiteYearReportClass
>;

export const JobsiteYearReport = getModelForClass(JobsiteYearReportClass, {
  schemaOptions: { collection: "jobsiteYearReports" },
});

/**
 * ----- Material -----
 */

import { MaterialClass } from "./Material/class";

export type MaterialDocument = DocumentType<MaterialClass>;

export type MaterialModel = ReturnModelType<typeof MaterialClass>;

export const Material = getModelForClass(MaterialClass, {
  schemaOptions: { collection: "materials" },
});

/**
 * ----- Material Shipment -----
 */

import { MaterialShipmentClass } from "./MaterialShipment/class";

export type MaterialShipmentDocument = DocumentType<MaterialShipmentClass>;

export type MaterialShipmentModel = ReturnModelType<
  typeof MaterialShipmentClass
>;

export const MaterialShipment = getModelForClass(MaterialShipmentClass, {
  schemaOptions: { collection: "materialshipments" },
});

/**
 * ----- Operator Daily Report -----
 */

import { OperatorDailyReportClass } from "./OperatorDailyReport/class";

export type OperatorDailyReportDocument =
  DocumentType<OperatorDailyReportClass>;

export type OperatorDailyReportModel = ReturnModelType<
  typeof OperatorDailyReportClass
>;

export const OperatorDailyReport = getModelForClass(OperatorDailyReportClass, {
  schemaOptions: { collection: "operatordailyreports" },
});

/**
 * ----- Production -----
 */

import { ProductionClass } from "./Production/class";

export type ProductionDocument = DocumentType<ProductionClass>;

export type ProductionModel = ReturnModelType<typeof ProductionClass>;

export const Production = getModelForClass(ProductionClass, {
  schemaOptions: { collection: "productions" },
});

/**
 * ----- Report Note -----
 */

import { ReportNoteClass } from "./ReportNote/class";

export type ReportNoteDocument = DocumentType<ReportNoteClass>;

export type ReportNoteModel = ReturnModelType<typeof ReportNoteClass>;

export const ReportNote = getModelForClass(ReportNoteClass, {
  schemaOptions: { collection: "reportnotes" },
});

/**
 * ----- Signup -----
 */

import { SignupClass } from "./Signup/class";

export type SignupDocument = DocumentType<SignupClass>;

export type SignupModel = ReturnModelType<typeof SignupClass>;

export const Signup = getModelForClass(SignupClass, {
  schemaOptions: { collection: "signups" },
});

/**
 * ----- System -----
 */

import { SystemClass } from "./System/class";

export type SystemDocument = DocumentType<SystemClass>;

export type SystemModel = ReturnModelType<typeof SystemClass>;

export const System = getModelForClass(SystemClass, {
  schemaOptions: { collection: "systems" },
});

/**
 * ----- User -----
 */

import { UserClass } from "./User/class";

export type UserDocument = DocumentType<UserClass>;

export type UserModel = ReturnModelType<typeof UserClass>;

export const User = getModelForClass(UserClass, {
  schemaOptions: { collection: "users" },
});

/**
 * ----- Vehicle -----
 */

import { VehicleClass } from "./Vehicle/class";

export type VehicleDocument = DocumentType<VehicleClass>;

export type VehicleModel = ReturnModelType<typeof VehicleClass>;

export const Vehicle = getModelForClass(VehicleClass, {
  schemaOptions: { collection: "vehicles" },
});

/**
 * ----- Vehicle Issue -----
 */

import { VehicleIssueClass } from "./VehicleIssue/class";

export type VehicleIssueDocument = DocumentType<VehicleIssueClass>;

export type VehicleIssueModel = ReturnModelType<typeof VehicleIssueClass>;

export const VehicleIssue = getModelForClass(VehicleIssueClass, {
  schemaOptions: { collection: "vehicleissues" },
});

/**
 * ----- Vehicle Work -----
 */

import { VehicleWorkClass } from "./VehicleWork/class";

export type VehicleWorkDocument = DocumentType<VehicleWorkClass>;

export type VehicleWorkModel = ReturnModelType<typeof VehicleWorkClass>;

export const VehicleWork = getModelForClass(VehicleWorkClass, {
  schemaOptions: { collection: "vehicleworks" },
});

export * from "./ChatConversation";
