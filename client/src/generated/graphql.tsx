import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** The javascript `Date` as string. Type represents date and time as the ISO Date string. */
  DateTime: any;
  /** The `Upload` scalar type represents a file upload. */
  Upload: any;
};

export type CompanyClass = {
  __typename?: "CompanyClass";
  _id: Scalars["ID"];
  createdAt: Scalars["DateTime"];
  isBowMarkConcrete: Scalars["Boolean"];
  isBowMarkPaving: Scalars["Boolean"];
  name: Scalars["String"];
  schemaVersion: Scalars["Float"];
};

export type CompanyCreateData = {
  name: Scalars["String"];
};

export type CrewClass = {
  __typename?: "CrewClass";
  _id: Scalars["ID"];
  archivedAt?: Maybe<Scalars["DateTime"]>;
  dailyReports: Array<DailyReportClass>;
  employees: Array<EmployeeClass>;
  jobsites: Array<JobsiteClass>;
  name: Scalars["String"];
  schemaVersion: Scalars["Float"];
  type: CrewTypes;
  vehicles: Array<VehicleClass>;
};

export type CrewCreateData = {
  name: Scalars["String"];
  type: CrewTypes;
};

export type CrewTypeOnSiteSummaryClass = {
  __typename?: "CrewTypeOnSiteSummaryClass";
  _id: Scalars["ID"];
  crewType: CrewTypes;
  employeeCost: Scalars["Float"];
  employeeHours: Scalars["Float"];
  materialCost: Scalars["Float"];
  materialQuantity: Scalars["Float"];
  nonCostedMaterialQuantity: Scalars["Float"];
  truckingCost: Scalars["Float"];
  truckingHours: Scalars["Float"];
  truckingQuantity: Scalars["Float"];
  vehicleCost: Scalars["Float"];
  vehicleHours: Scalars["Float"];
};

export enum CrewTypes {
  Base = "Base",
  BasePrep = "BasePrep",
  BreakoutCb = "BreakoutCB",
  FormLineSetting = "FormLineSetting",
  FormTruck = "FormTruck",
  Other = "Other",
  Patch = "Patch",
  Paving = "Paving",
  Pour = "Pour",
  Shop = "Shop",
  Tech = "Tech",
}

export type CrewUpdateData = {
  name: Scalars["String"];
};

export type DailyReportClass = {
  __typename?: "DailyReportClass";
  _id: Scalars["ID"];
  archived: Scalars["Boolean"];
  crew: CrewClass;
  date: Scalars["DateTime"];
  employeeWork: Array<EmployeeWorkClass>;
  jobCostApproved: Scalars["Boolean"];
  jobsite: JobsiteClass;
  materialShipment: Array<MaterialShipmentClass>;
  materialShipments: Array<MaterialShipmentClass>;
  payrollComplete: Scalars["Boolean"];
  production: Array<ProductionClass>;
  productions: Array<ProductionClass>;
  reportNote?: Maybe<ReportNoteClass>;
  schemaVersion: Scalars["Float"];
  temporaryEmployees: Array<EmployeeClass>;
  temporaryVehicles: Array<VehicleClass>;
  vehicleWork: Array<VehicleWorkClass>;
};

export type DailyReportCreateData = {
  crewId: Scalars["String"];
  date: Scalars["DateTime"];
  jobsiteId: Scalars["String"];
};

export type DailyReportListOptionData = {
  crews?: InputMaybe<Array<Scalars["String"]>>;
  offset?: InputMaybe<Scalars["Float"]>;
  pageLimit?: InputMaybe<Scalars["Float"]>;
};

export type DailyReportNoteUpdateData = {
  note: Scalars["String"];
};

export type DailyReportUpdateData = {
  date: Scalars["DateTime"];
  jobsiteId: Scalars["ID"];
};

export type DefaultRateClass = {
  __typename?: "DefaultRateClass";
  _id?: Maybe<Scalars["ID"]>;
  rates: Array<RateClass>;
  title: Scalars["String"];
};

export type DefaultRateData = {
  _id?: InputMaybe<Scalars["ID"]>;
  rates: Array<RatesData>;
  title: Scalars["String"];
};

export type EmployeeClass = {
  __typename?: "EmployeeClass";
  _id: Scalars["ID"];
  archivedAt: Scalars["DateTime"];
  crews: Array<CrewClass>;
  jobTitle?: Maybe<Scalars["String"]>;
  name: Scalars["String"];
  rates: Array<RateClass>;
  schemaVersion: Scalars["Float"];
  signup?: Maybe<SignupClass>;
  user?: Maybe<UserClass>;
};

export type EmployeeCreateData = {
  jobTitle: Scalars["String"];
  name: Scalars["String"];
};

export type EmployeeHourReport = {
  __typename?: "EmployeeHourReport";
  date: Scalars["DateTime"];
  hours: Scalars["Float"];
};

export type EmployeeHoursReport = {
  __typename?: "EmployeeHoursReport";
  days: Array<EmployeeHourReport>;
};

export type EmployeeReportClass = {
  __typename?: "EmployeeReportClass";
  _id: Scalars["ID"];
  crewType: CrewTypes;
  employee?: Maybe<EmployeeClass>;
  employeeWork: Array<EmployeeWorkClass>;
  hours: Scalars["Float"];
  rate: Scalars["Float"];
};

export type EmployeeUpdateData = {
  jobTitle: Scalars["String"];
  name: Scalars["String"];
};

export type EmployeeWorkClass = {
  __typename?: "EmployeeWorkClass";
  _id: Scalars["ID"];
  archivedAt?: Maybe<Scalars["DateTime"]>;
  dailyReport: DailyReportClass;
  employee: EmployeeClass;
  endTime: Scalars["DateTime"];
  jobTitle: Scalars["String"];
  schemaVersion: Scalars["Float"];
  startTime: Scalars["DateTime"];
};

export type EmployeeWorkCreateData = {
  employees: Array<Scalars["String"]>;
  jobs: Array<EmployeeWorkJobData>;
};

export type EmployeeWorkJobData = {
  endTime?: InputMaybe<Scalars["DateTime"]>;
  jobTitle: Scalars["String"];
  startTime: Scalars["DateTime"];
};

export type EmployeeWorkUpdateData = {
  endTime: Scalars["DateTime"];
  jobTitle: Scalars["String"];
  startTime: Scalars["DateTime"];
};

export type FileClass = {
  __typename?: "FileClass";
  _id: Scalars["ID"];
  buffer: Scalars["String"];
  createdAt: Scalars["DateTime"];
  description?: Maybe<Scalars["String"]>;
  downloadUrl: Scalars["String"];
  mimetype: Scalars["String"];
  schemaVersion: Scalars["Float"];
};

export type FileCreateData = {
  description?: InputMaybe<Scalars["String"]>;
  file: Scalars["Upload"];
};

export type InvoiceClass = {
  __typename?: "InvoiceClass";
  _id: Scalars["ID"];
  accrual: Scalars["Boolean"];
  company: CompanyClass;
  cost: Scalars["Float"];
  createdAt: Scalars["DateTime"];
  date: Scalars["DateTime"];
  description?: Maybe<Scalars["String"]>;
  internal: Scalars["Boolean"];
  invoiceNumber: Scalars["String"];
  schemaVersion: Scalars["Float"];
};

export type InvoiceData = {
  accrual: Scalars["Boolean"];
  companyId: Scalars["String"];
  cost: Scalars["Float"];
  date: Scalars["DateTime"];
  description?: InputMaybe<Scalars["String"]>;
  internal: Scalars["Boolean"];
  invoiceNumber: Scalars["String"];
};

export type InvoiceReportClass = {
  __typename?: "InvoiceReportClass";
  _id: Scalars["ID"];
  accrual: Scalars["Boolean"];
  internal: Scalars["Boolean"];
  invoice: InvoiceClass;
  value: Scalars["Float"];
};

export type JobsiteClass = {
  __typename?: "JobsiteClass";
  _id: Scalars["ID"];
  active: Scalars["Boolean"];
  createdAt: Scalars["DateTime"];
  crews: Array<CrewClass>;
  dailyReports: Array<DailyReportClass>;
  dayReports: Array<JobsiteDayReportClass>;
  description?: Maybe<Scalars["String"]>;
  expenseInvoices: Array<InvoiceClass>;
  fileObjects: Array<JobsiteFileObjectClass>;
  jobcode?: Maybe<Scalars["String"]>;
  location_url?: Maybe<Scalars["String"]>;
  materials: Array<JobsiteMaterialClass>;
  monthReports: Array<JobsiteMonthReportClass>;
  name: Scalars["String"];
  nonCostedMaterialShipments: Array<MaterialShipmentClass>;
  revenueInvoices: Array<InvoiceClass>;
  schemaVersion: Scalars["Float"];
  truckingRates: Array<TruckingTypeRateClass>;
  yearReports: Array<JobsiteYearReportClass>;
};

export type JobsiteCreateData = {
  description?: InputMaybe<Scalars["String"]>;
  jobcode: Scalars["String"];
  name: Scalars["String"];
};

export type JobsiteDayReportClass = {
  __typename?: "JobsiteDayReportClass";
  _id: Scalars["ID"];
  crewTypes: Array<CrewTypes>;
  dailyReports: Array<DailyReportClass>;
  date: Scalars["DateTime"];
  employees: Array<EmployeeReportClass>;
  jobsite: JobsiteClass;
  materials: Array<MaterialReportClass>;
  nonCostedMaterials: Array<NonCostedMaterialReportClass>;
  schemaVersion: Scalars["Float"];
  summary: OnSiteSummaryReportClass;
  trucking: Array<TruckingReportClass>;
  update: UpdateClass;
  vehicles: Array<VehicleReportClass>;
};

export type JobsiteFileObjectClass = {
  __typename?: "JobsiteFileObjectClass";
  _id?: Maybe<Scalars["ID"]>;
  file: FileClass;
  minRole: UserRoles;
};

export type JobsiteFileObjectData = {
  file: FileCreateData;
};

export type JobsiteMaterialClass = {
  __typename?: "JobsiteMaterialClass";
  _id: Scalars["ID"];
  canRemove: Scalars["Boolean"];
  completedQuantity: Scalars["Float"];
  costType: JobsiteMaterialCostType;
  createdAt: Scalars["DateTime"];
  delivered?: Maybe<Scalars["Boolean"]>;
  deliveredRates: Array<JobsiteMaterialDeliveredRateClass>;
  invoices?: Maybe<Array<InvoiceClass>>;
  jobsite: JobsiteClass;
  material: MaterialClass;
  quantity: Scalars["Float"];
  rates: Array<JobsiteMaterialRateClass>;
  schemaVersion: Scalars["Float"];
  supplier: CompanyClass;
  unit: Scalars["String"];
};

export enum JobsiteMaterialCostType {
  DeliveredRate = "deliveredRate",
  Invoice = "invoice",
  Rate = "rate",
}

export type JobsiteMaterialCreateData = {
  costType: JobsiteMaterialCostType;
  delivered?: InputMaybe<Scalars["Boolean"]>;
  deliveredRates?: InputMaybe<Array<JobsiteMaterialDeliveredRateData>>;
  materialId: Scalars["String"];
  quantity: Scalars["Float"];
  rates?: InputMaybe<Array<JobsiteMaterialRateData>>;
  supplierId: Scalars["String"];
  unit: Scalars["String"];
};

export type JobsiteMaterialDeliveredRateClass = {
  __typename?: "JobsiteMaterialDeliveredRateClass";
  _id?: Maybe<Scalars["ID"]>;
  rates: Array<JobsiteMaterialRateClass>;
  title: Scalars["String"];
};

export type JobsiteMaterialDeliveredRateData = {
  _id?: InputMaybe<Scalars["ID"]>;
  rates: Array<JobsiteMaterialRateData>;
  title: Scalars["String"];
};

export type JobsiteMaterialRateClass = {
  __typename?: "JobsiteMaterialRateClass";
  _id?: Maybe<Scalars["ID"]>;
  date: Scalars["DateTime"];
  estimated?: Maybe<Scalars["Boolean"]>;
  rate: Scalars["Float"];
};

export type JobsiteMaterialRateData = {
  _id?: InputMaybe<Scalars["ID"]>;
  date: Scalars["DateTime"];
  estimated: Scalars["Boolean"];
  rate: Scalars["Float"];
};

export type JobsiteMaterialUpdateData = {
  costType: JobsiteMaterialCostType;
  delivered?: InputMaybe<Scalars["Boolean"]>;
  deliveredRates?: InputMaybe<Array<JobsiteMaterialDeliveredRateData>>;
  quantity: Scalars["Float"];
  rates: Array<JobsiteMaterialRateData>;
  supplierId: Scalars["String"];
  unit: Scalars["String"];
};

export type JobsiteMonthReportClass = {
  __typename?: "JobsiteMonthReportClass";
  _id: Scalars["ID"];
  crewTypes: Array<CrewTypes>;
  dayReports: Array<JobsiteDayReportClass>;
  excelDownloadUrl?: Maybe<Scalars["String"]>;
  expenseInvoices: Array<InvoiceReportClass>;
  issues: Array<ReportIssueFullClass>;
  jobsite: JobsiteClass;
  revenueInvoices: Array<InvoiceReportClass>;
  schemaVersion: Scalars["Float"];
  startOfMonth: Scalars["DateTime"];
  summary: RangeSummaryReportClass;
  update: UpdateClass;
};

export type JobsiteUpdateData = {
  name: Scalars["String"];
};

export type JobsiteYearMasterReportClass = {
  __typename?: "JobsiteYearMasterReportClass";
  _id: Scalars["ID"];
  crewTypes: Array<CrewTypes>;
  excelDownloadUrl?: Maybe<Scalars["String"]>;
  reports: Array<JobsiteYearMasterReportItemClass>;
  schemaVersion: Scalars["Float"];
  startOfYear: Scalars["DateTime"];
  summary: RangeSummaryReportClass;
  update: UpdateClass;
};

export type JobsiteYearMasterReportItemClass = {
  __typename?: "JobsiteYearMasterReportItemClass";
  _id: Scalars["ID"];
  report: JobsiteYearReportClass;
  summary: OnSiteSummaryReportClass;
};

export type JobsiteYearReportClass = {
  __typename?: "JobsiteYearReportClass";
  _id: Scalars["ID"];
  crewTypes: Array<CrewTypes>;
  dayReports: Array<JobsiteDayReportClass>;
  excelDownloadUrl?: Maybe<Scalars["String"]>;
  expenseInvoices: Array<InvoiceReportClass>;
  issues: Array<ReportIssueFullClass>;
  jobsite: JobsiteClass;
  revenueInvoices: Array<InvoiceReportClass>;
  schemaVersion: Scalars["Float"];
  startOfYear: Scalars["DateTime"];
  summary: RangeSummaryReportClass;
  update: UpdateClass;
};

export type ListOptionData = {
  offset?: InputMaybe<Scalars["Float"]>;
  pageLimit?: InputMaybe<Scalars["Float"]>;
};

export type LoginData = {
  email: Scalars["String"];
  password: Scalars["String"];
  rememberMe: Scalars["Boolean"];
};

export type MaterialClass = {
  __typename?: "MaterialClass";
  _id: Scalars["ID"];
  canRemove: Scalars["Boolean"];
  createdAt: Scalars["DateTime"];
  name: Scalars["String"];
  schemaVersion: Scalars["Float"];
};

export type MaterialCreateData = {
  name: Scalars["String"];
};

export type MaterialReportClass = {
  __typename?: "MaterialReportClass";
  _id: Scalars["ID"];
  crewType: CrewTypes;
  deliveredRateId?: Maybe<Scalars["ID"]>;
  estimated: Scalars["Boolean"];
  jobsiteMaterial: JobsiteMaterialClass;
  materialShipments: Array<MaterialShipmentClass>;
  quantity: Scalars["Float"];
  rate: Scalars["Float"];
};

export type MaterialShipmentClass = {
  __typename?: "MaterialShipmentClass";
  _id: Scalars["ID"];
  archivedAt?: Maybe<Scalars["DateTime"]>;
  dailyReport: DailyReportClass;
  endTime?: Maybe<Scalars["DateTime"]>;
  jobsiteMaterial?: Maybe<JobsiteMaterialClass>;
  noJobsiteMaterial?: Maybe<Scalars["Boolean"]>;
  quantity: Scalars["Float"];
  schemaVersion: Scalars["Float"];
  shipmentType?: Maybe<Scalars["String"]>;
  startTime?: Maybe<Scalars["DateTime"]>;
  supplier?: Maybe<Scalars["String"]>;
  unit?: Maybe<Scalars["String"]>;
  vehicle?: Maybe<VehicleClass>;
  vehicleObject?: Maybe<VehicleObjectClass>;
};

export type MaterialShipmentCreateData = {
  shipments: Array<MaterialShipmentShipmentData>;
  vehicleObject?: InputMaybe<MaterialShipmentVehicleObjectData>;
};

export type MaterialShipmentShipmentData = {
  endTime?: InputMaybe<Scalars["DateTime"]>;
  jobsiteMaterialId?: InputMaybe<Scalars["String"]>;
  noJobsiteMaterial: Scalars["Boolean"];
  quantity: Scalars["Float"];
  shipmentType?: InputMaybe<Scalars["String"]>;
  startTime?: InputMaybe<Scalars["DateTime"]>;
  supplier?: InputMaybe<Scalars["String"]>;
  unit?: InputMaybe<Scalars["String"]>;
};

export type MaterialShipmentUpdateData = {
  endTime?: InputMaybe<Scalars["DateTime"]>;
  jobsiteMaterialId?: InputMaybe<Scalars["String"]>;
  noJobsiteMaterial: Scalars["Boolean"];
  quantity: Scalars["Float"];
  shipmentType?: InputMaybe<Scalars["String"]>;
  startTime?: InputMaybe<Scalars["DateTime"]>;
  supplier?: InputMaybe<Scalars["String"]>;
  unit?: InputMaybe<Scalars["String"]>;
  vehicleObject?: InputMaybe<MaterialShipmentVehicleObjectData>;
};

export type MaterialShipmentVehicleObjectData = {
  deliveredRateId?: InputMaybe<Scalars["String"]>;
  source: Scalars["String"];
  truckingRateId?: InputMaybe<Scalars["String"]>;
  vehicleCode: Scalars["String"];
  vehicleType: Scalars["String"];
};

export type MaterialUpdateData = {
  name: Scalars["String"];
};

export type Mutation = {
  __typename?: "Mutation";
  companyCreate: CompanyClass;
  crewAddEmployee: CrewClass;
  crewAddVehicle: CrewClass;
  crewArchive: CrewClass;
  crewCreate: CrewClass;
  crewRemoveEmployee: CrewClass;
  crewRemoveVehicle: CrewClass;
  crewUpdate: CrewClass;
  dailyReportAddNoteFile: DailyReportClass;
  dailyReportAddTemporaryEmployee: DailyReportClass;
  dailyReportAddTemporaryVehicle: DailyReportClass;
  dailyReportArchive: DailyReportClass;
  dailyReportCreate: DailyReportClass;
  dailyReportJobCostApprovalUpdate: DailyReportClass;
  dailyReportNoteUpdate: DailyReportClass;
  dailyReportPayrollCompleteUpdate: DailyReportClass;
  dailyReportUpdate: DailyReportClass;
  employeeArchive: EmployeeClass;
  employeeCreate: EmployeeClass;
  employeeUpdate: EmployeeClass;
  employeeUpdateRates: EmployeeClass;
  employeeWorkCreate: Array<EmployeeWorkClass>;
  employeeWorkDelete: Scalars["String"];
  employeeWorkUpdate: EmployeeWorkClass;
  invoiceRemove: Scalars["Boolean"];
  invoiceUpdateForJobsite: InvoiceClass;
  invoiceUpdateForJobsiteMaterial: InvoiceClass;
  jobsiteAddDefaultTruckingRateToAll: Array<JobsiteClass>;
  jobsiteAddExpenseInvoice: JobsiteClass;
  jobsiteAddFileObject: JobsiteClass;
  jobsiteAddMaterial: JobsiteClass;
  jobsiteAddRevenueInvoice: JobsiteClass;
  jobsiteCreate: JobsiteClass;
  jobsiteGenerateDayReports: JobsiteClass;
  jobsiteMaterialAddInvoice: JobsiteMaterialClass;
  jobsiteMaterialRemove: Scalars["Boolean"];
  jobsiteMaterialUpdate: JobsiteMaterialClass;
  jobsiteRemoveFileObject: JobsiteClass;
  jobsiteRequestReportGeneration: JobsiteClass;
  jobsiteSetAllEmptyTruckingRates: Array<JobsiteClass>;
  jobsiteSetTruckingRates: JobsiteClass;
  jobsiteUpdate: JobsiteClass;
  login: Scalars["String"];
  materialCreate: MaterialClass;
  materialRemove: Scalars["Boolean"];
  materialShipmentCreate: Array<MaterialShipmentClass>;
  materialShipmentDelete: Scalars["String"];
  materialShipmentUpdate: MaterialShipmentClass;
  materialUpdate: MaterialClass;
  productionCreate: ProductionClass;
  productionDelete: Scalars["String"];
  productionUpdate: ProductionClass;
  reportNoteRemoveFile: ReportNoteClass;
  signup: Scalars["String"];
  signupCreate: SignupClass;
  systemUpdateCompanyVehicleTypeDefaults: SystemClass;
  systemUpdateInternalExpenseOverheadRate: SystemClass;
  systemUpdateLaborTypes: SystemClass;
  systemUpdateMaterialShipmentVehicleTypeDefaults: SystemClass;
  systemUpdateUnitDefaults: SystemClass;
  userPasswordReset: Scalars["Boolean"];
  userPasswordResetRequest: Scalars["Boolean"];
  userUpdateHomeView: UserClass;
  userUpdateRole: UserClass;
  vehicleArchive: VehicleClass;
  vehicleCreate: VehicleClass;
  vehicleUpdate: VehicleClass;
  vehicleUpdateRates: VehicleClass;
  vehicleWorkCreate: Array<VehicleWorkClass>;
  vehicleWorkDelete: Scalars["String"];
  vehicleWorkUpdate: VehicleWorkClass;
};

export type MutationCompanyCreateArgs = {
  data: CompanyCreateData;
};

export type MutationCrewAddEmployeeArgs = {
  crewId: Scalars["String"];
  employeeId: Scalars["String"];
};

export type MutationCrewAddVehicleArgs = {
  crewId: Scalars["String"];
  vehicleId: Scalars["String"];
};

export type MutationCrewArchiveArgs = {
  id: Scalars["ID"];
};

export type MutationCrewCreateArgs = {
  data: CrewCreateData;
};

export type MutationCrewRemoveEmployeeArgs = {
  crewId: Scalars["String"];
  employeeId: Scalars["String"];
};

export type MutationCrewRemoveVehicleArgs = {
  crewId: Scalars["String"];
  vehicleId: Scalars["String"];
};

export type MutationCrewUpdateArgs = {
  data: CrewUpdateData;
  id: Scalars["ID"];
};

export type MutationDailyReportAddNoteFileArgs = {
  data: FileCreateData;
  id: Scalars["String"];
};

export type MutationDailyReportAddTemporaryEmployeeArgs = {
  employeeId: Scalars["String"];
  id: Scalars["String"];
};

export type MutationDailyReportAddTemporaryVehicleArgs = {
  id: Scalars["String"];
  vehicleId: Scalars["String"];
};

export type MutationDailyReportArchiveArgs = {
  id: Scalars["ID"];
};

export type MutationDailyReportCreateArgs = {
  data: DailyReportCreateData;
};

export type MutationDailyReportJobCostApprovalUpdateArgs = {
  approved: Scalars["Boolean"];
  id: Scalars["String"];
};

export type MutationDailyReportNoteUpdateArgs = {
  data: DailyReportNoteUpdateData;
  id: Scalars["String"];
};

export type MutationDailyReportPayrollCompleteUpdateArgs = {
  complete: Scalars["Boolean"];
  id: Scalars["String"];
};

export type MutationDailyReportUpdateArgs = {
  data: DailyReportUpdateData;
  id: Scalars["String"];
};

export type MutationEmployeeArchiveArgs = {
  id: Scalars["ID"];
};

export type MutationEmployeeCreateArgs = {
  crewId?: InputMaybe<Scalars["String"]>;
  data: EmployeeCreateData;
};

export type MutationEmployeeUpdateArgs = {
  data: EmployeeUpdateData;
  id: Scalars["ID"];
};

export type MutationEmployeeUpdateRatesArgs = {
  data: Array<RatesData>;
  id: Scalars["String"];
};

export type MutationEmployeeWorkCreateArgs = {
  dailyReportId: Scalars["String"];
  data: Array<EmployeeWorkCreateData>;
};

export type MutationEmployeeWorkDeleteArgs = {
  id: Scalars["String"];
};

export type MutationEmployeeWorkUpdateArgs = {
  data: EmployeeWorkUpdateData;
  id: Scalars["String"];
};

export type MutationInvoiceRemoveArgs = {
  id: Scalars["ID"];
};

export type MutationInvoiceUpdateForJobsiteArgs = {
  data: InvoiceData;
  id: Scalars["String"];
  jobsiteId: Scalars["ID"];
};

export type MutationInvoiceUpdateForJobsiteMaterialArgs = {
  data: InvoiceData;
  id: Scalars["String"];
  jobsiteMaterialId: Scalars["ID"];
};

export type MutationJobsiteAddDefaultTruckingRateToAllArgs = {
  systemRateIndex: Scalars["Int"];
  systemRateItemIndex: Scalars["Int"];
};

export type MutationJobsiteAddExpenseInvoiceArgs = {
  data: InvoiceData;
  jobsiteId: Scalars["String"];
};

export type MutationJobsiteAddFileObjectArgs = {
  data: JobsiteFileObjectData;
  id: Scalars["ID"];
};

export type MutationJobsiteAddMaterialArgs = {
  data: JobsiteMaterialCreateData;
  jobsiteId: Scalars["String"];
};

export type MutationJobsiteAddRevenueInvoiceArgs = {
  data: InvoiceData;
  jobsiteId: Scalars["String"];
};

export type MutationJobsiteCreateArgs = {
  data: JobsiteCreateData;
};

export type MutationJobsiteGenerateDayReportsArgs = {
  id: Scalars["String"];
};

export type MutationJobsiteMaterialAddInvoiceArgs = {
  data: InvoiceData;
  jobsiteMaterialId: Scalars["ID"];
};

export type MutationJobsiteMaterialRemoveArgs = {
  id: Scalars["ID"];
};

export type MutationJobsiteMaterialUpdateArgs = {
  data: JobsiteMaterialUpdateData;
  id: Scalars["String"];
};

export type MutationJobsiteRemoveFileObjectArgs = {
  fileObjectId: Scalars["ID"];
  id: Scalars["ID"];
};

export type MutationJobsiteRequestReportGenerationArgs = {
  id: Scalars["ID"];
};

export type MutationJobsiteSetTruckingRatesArgs = {
  data: Array<TruckingTypeRateData>;
  id: Scalars["String"];
};

export type MutationJobsiteUpdateArgs = {
  data: JobsiteUpdateData;
  id: Scalars["ID"];
};

export type MutationLoginArgs = {
  data: LoginData;
};

export type MutationMaterialCreateArgs = {
  data: MaterialCreateData;
};

export type MutationMaterialRemoveArgs = {
  id: Scalars["ID"];
};

export type MutationMaterialShipmentCreateArgs = {
  dailyReportId: Scalars["String"];
  data: Array<MaterialShipmentCreateData>;
};

export type MutationMaterialShipmentDeleteArgs = {
  id: Scalars["String"];
};

export type MutationMaterialShipmentUpdateArgs = {
  data: MaterialShipmentUpdateData;
  id: Scalars["String"];
};

export type MutationMaterialUpdateArgs = {
  data: MaterialUpdateData;
  id: Scalars["ID"];
};

export type MutationProductionCreateArgs = {
  dailyReportId: Scalars["String"];
  data: ProductionCreateData;
};

export type MutationProductionDeleteArgs = {
  id: Scalars["String"];
};

export type MutationProductionUpdateArgs = {
  data: ProductionUpdateData;
  id: Scalars["String"];
};

export type MutationReportNoteRemoveFileArgs = {
  fileId: Scalars["String"];
  reportNoteId: Scalars["String"];
};

export type MutationSignupArgs = {
  data: SignupData;
  signupId: Scalars["String"];
};

export type MutationSignupCreateArgs = {
  employeeId: Scalars["String"];
};

export type MutationSystemUpdateCompanyVehicleTypeDefaultsArgs = {
  data: Array<DefaultRateData>;
};

export type MutationSystemUpdateInternalExpenseOverheadRateArgs = {
  value: Scalars["Float"];
};

export type MutationSystemUpdateLaborTypesArgs = {
  data: Array<Scalars["String"]>;
};

export type MutationSystemUpdateMaterialShipmentVehicleTypeDefaultsArgs = {
  data: Array<DefaultRateData>;
};

export type MutationSystemUpdateUnitDefaultsArgs = {
  data: Array<Scalars["String"]>;
};

export type MutationUserPasswordResetArgs = {
  password: Scalars["String"];
  token: Scalars["String"];
};

export type MutationUserPasswordResetRequestArgs = {
  email: Scalars["String"];
};

export type MutationUserUpdateHomeViewArgs = {
  homeView: UserHomeViewSettings;
};

export type MutationUserUpdateRoleArgs = {
  id: Scalars["String"];
  role: UserRoles;
};

export type MutationVehicleArchiveArgs = {
  id: Scalars["ID"];
};

export type MutationVehicleCreateArgs = {
  crewId?: InputMaybe<Scalars["String"]>;
  data: VehicleCreateData;
};

export type MutationVehicleUpdateArgs = {
  data: VehicleUpdateData;
  id: Scalars["ID"];
};

export type MutationVehicleUpdateRatesArgs = {
  data: Array<RatesData>;
  id: Scalars["String"];
};

export type MutationVehicleWorkCreateArgs = {
  dailyReportId: Scalars["String"];
  data: Array<VehicleWorkCreateData>;
};

export type MutationVehicleWorkDeleteArgs = {
  id: Scalars["String"];
};

export type MutationVehicleWorkUpdateArgs = {
  data: VehicleWorkUpdateData;
  id: Scalars["String"];
};

export type NonCostedMaterialReportClass = {
  __typename?: "NonCostedMaterialReportClass";
  _id: Scalars["ID"];
  crewType: CrewTypes;
  materialName: Scalars["String"];
  materialShipments: Array<MaterialShipmentClass>;
  quantity: Scalars["Float"];
  supplierName: Scalars["String"];
};

export type OnSiteSummaryReportClass = {
  __typename?: "OnSiteSummaryReportClass";
  _id: Scalars["ID"];
  crewTypeSummaries: Array<CrewTypeOnSiteSummaryClass>;
  employeeCost: Scalars["Float"];
  employeeHours: Scalars["Float"];
  materialCost: Scalars["Float"];
  materialQuantity: Scalars["Float"];
  nonCostedMaterialQuantity: Scalars["Float"];
  truckingCost: Scalars["Float"];
  truckingHours: Scalars["Float"];
  truckingQuantity: Scalars["Float"];
  vehicleCost: Scalars["Float"];
  vehicleHours: Scalars["Float"];
};

export type ProductionClass = {
  __typename?: "ProductionClass";
  _id: Scalars["ID"];
  dailyReport: DailyReportClass;
  description?: Maybe<Scalars["String"]>;
  endTime: Scalars["DateTime"];
  jobTitle: Scalars["String"];
  quantity: Scalars["Float"];
  schemaVersion: Scalars["Float"];
  startTime: Scalars["DateTime"];
  unit: Scalars["String"];
};

export type ProductionCreateData = {
  description?: InputMaybe<Scalars["String"]>;
  endTime: Scalars["DateTime"];
  jobTitle: Scalars["String"];
  quantity: Scalars["Float"];
  startTime: Scalars["DateTime"];
  unit: Scalars["String"];
};

export type ProductionUpdateData = {
  description?: InputMaybe<Scalars["String"]>;
  endTime: Scalars["DateTime"];
  jobTitle: Scalars["String"];
  quantity: Scalars["Float"];
  startTime: Scalars["DateTime"];
  unit: Scalars["String"];
};

export type Query = {
  __typename?: "Query";
  companies: Array<CompanyClass>;
  company: CompanyClass;
  companySearch: Array<CompanyClass>;
  crew: CrewClass;
  crewList: Array<CrewClass>;
  crewSearch: Array<CrewClass>;
  currentUser: UserClass;
  dailyReport: DailyReportClass;
  dailyReports: Array<DailyReportClass>;
  dailyReportSearch: Array<DailyReportClass>;
  dailyReportsForJobsite: Array<DailyReportClass>;
  employee: EmployeeClass;
  employeeHourReports: EmployeeHoursReport;
  employeeSearch: Array<EmployeeClass>;
  file: FileClass;
  jobsite: JobsiteClass;
  jobsiteMasterExcelReportByDate: Scalars["String"];
  jobsiteMonthReport?: Maybe<JobsiteMonthReportClass>;
  jobsites: Array<JobsiteClass>;
  jobsiteSearch: Array<JobsiteClass>;
  jobsiteYearMasterReport?: Maybe<JobsiteYearMasterReportClass>;
  jobsiteYearMasterReportCurrent: JobsiteYearMasterReportClass;
  jobsiteYearMasterReports: Array<JobsiteYearMasterReportClass>;
  jobsiteYearReport?: Maybe<JobsiteYearReportClass>;
  material: MaterialClass;
  materials: Array<MaterialClass>;
  materialSearch: Array<MaterialClass>;
  search: Array<SearchClass>;
  signup: SignupClass;
  system: SystemClass;
  user?: Maybe<UserClass>;
  users: Array<UserClass>;
  vehicle: VehicleClass;
  vehicleSearch: Array<VehicleClass>;
};

export type QueryCompaniesArgs = {
  options?: InputMaybe<ListOptionData>;
};

export type QueryCompanyArgs = {
  id: Scalars["String"];
};

export type QueryCompanySearchArgs = {
  options?: InputMaybe<SearchOptions>;
  searchString: Scalars["String"];
};

export type QueryCrewArgs = {
  id: Scalars["String"];
};

export type QueryCrewSearchArgs = {
  options?: InputMaybe<SearchOptions>;
  searchString: Scalars["String"];
};

export type QueryDailyReportArgs = {
  id: Scalars["String"];
};

export type QueryDailyReportsArgs = {
  options?: InputMaybe<DailyReportListOptionData>;
};

export type QueryDailyReportSearchArgs = {
  options?: InputMaybe<SearchOptions>;
  searchString: Scalars["String"];
};

export type QueryDailyReportsForJobsiteArgs = {
  jobsiteId: Scalars["ID"];
  options?: InputMaybe<DailyReportListOptionData>;
};

export type QueryEmployeeArgs = {
  id: Scalars["String"];
};

export type QueryEmployeeHourReportsArgs = {
  endTime: Scalars["DateTime"];
  id: Scalars["ID"];
  startTime: Scalars["DateTime"];
};

export type QueryEmployeeSearchArgs = {
  options?: InputMaybe<SearchOptions>;
  searchString: Scalars["String"];
};

export type QueryFileArgs = {
  id: Scalars["String"];
};

export type QueryJobsiteArgs = {
  id: Scalars["String"];
};

export type QueryJobsiteMasterExcelReportByDateArgs = {
  endTime: Scalars["DateTime"];
  startTime: Scalars["DateTime"];
};

export type QueryJobsiteMonthReportArgs = {
  id: Scalars["ID"];
};

export type QueryJobsitesArgs = {
  options?: InputMaybe<ListOptionData>;
};

export type QueryJobsiteSearchArgs = {
  options?: InputMaybe<SearchOptions>;
  searchString: Scalars["String"];
};

export type QueryJobsiteYearMasterReportArgs = {
  id: Scalars["ID"];
};

export type QueryJobsiteYearReportArgs = {
  id: Scalars["ID"];
};

export type QueryMaterialArgs = {
  id: Scalars["String"];
};

export type QueryMaterialsArgs = {
  options?: InputMaybe<ListOptionData>;
};

export type QueryMaterialSearchArgs = {
  options?: InputMaybe<SearchOptions>;
  searchString: Scalars["String"];
};

export type QuerySearchArgs = {
  searchString: Scalars["String"];
};

export type QuerySignupArgs = {
  id: Scalars["String"];
};

export type QueryUserArgs = {
  query: UserQuery;
};

export type QueryUsersArgs = {
  options?: InputMaybe<ListOptionData>;
};

export type QueryVehicleArgs = {
  id: Scalars["String"];
};

export type QueryVehicleSearchArgs = {
  options?: InputMaybe<SearchOptions>;
  searchString: Scalars["String"];
};

export type RangeSummaryReportClass = {
  __typename?: "RangeSummaryReportClass";
  _id: Scalars["ID"];
  accrualExpenseInvoiceValue: Scalars["Float"];
  accrualRevenueInvoiceValue: Scalars["Float"];
  externalExpenseInvoiceValue: Scalars["Float"];
  externalRevenueInvoiceValue: Scalars["Float"];
  internalExpenseInvoiceValue: Scalars["Float"];
  internalRevenueInvoiceValue: Scalars["Float"];
};

export type RateClass = {
  __typename?: "RateClass";
  _id?: Maybe<Scalars["ID"]>;
  date: Scalars["DateTime"];
  rate: Scalars["Float"];
};

export type RatesData = {
  _id?: InputMaybe<Scalars["ID"]>;
  date: Scalars["DateTime"];
  rate: Scalars["Float"];
};

export type ReportIssueFullClass = {
  __typename?: "ReportIssueFullClass";
  _id: Scalars["ID"];
  amount?: Maybe<Scalars["Float"]>;
  employee?: Maybe<EmployeeClass>;
  jobsiteMaterial?: Maybe<JobsiteMaterialClass>;
  type: ReportIssueTypes;
  vehicle?: Maybe<VehicleClass>;
};

export enum ReportIssueTypes {
  EmployeeRateZero = "EmployeeRateZero",
  MaterialEstimatedRate = "MaterialEstimatedRate",
  MaterialRateZero = "MaterialRateZero",
  NonCostedMaterials = "NonCostedMaterials",
  VehicleRateZero = "VehicleRateZero",
}

export type ReportNoteClass = {
  __typename?: "ReportNoteClass";
  _id: Scalars["ID"];
  dailyReport: DailyReportClass;
  files: Array<FileClass>;
  note: Scalars["String"];
  schemaVersion: Scalars["Float"];
};

export type SearchClass = {
  __typename?: "SearchClass";
  crew?: Maybe<CrewClass>;
  dailyReport?: Maybe<DailyReportClass>;
  employee?: Maybe<EmployeeClass>;
  jobsite?: Maybe<JobsiteClass>;
  score: Scalars["Float"];
  vehicle?: Maybe<VehicleClass>;
};

export type SearchOptions = {
  blacklistedIds?: InputMaybe<Array<Scalars["String"]>>;
  limit?: InputMaybe<Scalars["Float"]>;
};

export type SignupClass = {
  __typename?: "SignupClass";
  _id: Scalars["ID"];
  createdAt: Scalars["DateTime"];
  employee: EmployeeClass;
  schemaVersion: Scalars["Float"];
};

export type SignupData = {
  email: Scalars["String"];
  name: Scalars["String"];
  password: Scalars["String"];
};

export type Subscription = {
  __typename?: "Subscription";
  jobsiteMonthReportSub?: Maybe<JobsiteMonthReportClass>;
  jobsiteYearMasterReportSub?: Maybe<JobsiteYearMasterReportClass>;
  jobsiteYearReportSub?: Maybe<JobsiteYearReportClass>;
};

export type SubscriptionJobsiteMonthReportSubArgs = {
  id: Scalars["ID"];
};

export type SubscriptionJobsiteYearMasterReportSubArgs = {
  id: Scalars["ID"];
};

export type SubscriptionJobsiteYearReportSubArgs = {
  id: Scalars["ID"];
};

export type SystemClass = {
  __typename?: "SystemClass";
  _id: Scalars["ID"];
  companyVehicleTypeDefaults: Array<DefaultRateClass>;
  createdAt: Scalars["DateTime"];
  /** Percent overhead to be added to internal expenses when calculating total expenses */
  internalExpenseOverheadRate: Scalars["Float"];
  laborTypes: Array<Scalars["String"]>;
  materialShipmentVehicleTypeDefaults: Array<DefaultRateClass>;
  schemaVersion: Scalars["Float"];
  timezone: Scalars["String"];
  unitDefaults: Array<Scalars["String"]>;
};

export type TruckingRateClass = {
  __typename?: "TruckingRateClass";
  _id?: Maybe<Scalars["ID"]>;
  date: Scalars["DateTime"];
  rate: Scalars["Float"];
  type: TruckingRateTypes;
};

export type TruckingRateData = {
  _id?: InputMaybe<Scalars["ID"]>;
  date: Scalars["DateTime"];
  rate: Scalars["Float"];
  type: TruckingRateTypes;
};

export enum TruckingRateTypes {
  Hour = "Hour",
  Quantity = "Quantity",
}

export type TruckingReportClass = {
  __typename?: "TruckingReportClass";
  _id: Scalars["ID"];
  crewType: CrewTypes;
  hours?: Maybe<Scalars["Float"]>;
  materialShipments: Array<MaterialShipmentClass>;
  quantity: Scalars["Float"];
  rate: Scalars["Float"];
  truckingType: Scalars["String"];
  type: TruckingRateTypes;
};

export type TruckingTypeRateClass = {
  __typename?: "TruckingTypeRateClass";
  _id?: Maybe<Scalars["ID"]>;
  rates: Array<TruckingRateClass>;
  title: Scalars["String"];
};

export type TruckingTypeRateData = {
  _id?: InputMaybe<Scalars["ID"]>;
  rates: Array<TruckingRateData>;
  title: Scalars["String"];
};

export type UpdateClass = {
  __typename?: "UpdateClass";
  _id?: Maybe<Scalars["ID"]>;
  lastUpdatedAt?: Maybe<Scalars["DateTime"]>;
  status: UpdateStatus;
};

export enum UpdateStatus {
  Pending = "Pending",
  Requested = "Requested",
  Updated = "Updated",
}

export type UserClass = {
  __typename?: "UserClass";
  _id: Scalars["ID"];
  admin: Scalars["Boolean"];
  email: Scalars["String"];
  employee: EmployeeClass;
  name: Scalars["String"];
  password: Scalars["String"];
  projectManager: Scalars["Boolean"];
  resetPasswordExpires: Scalars["DateTime"];
  resetPasswordToken?: Maybe<Scalars["String"]>;
  role: UserRoles;
  schemaVersion: Scalars["Float"];
  settings: UserSettings;
};

export enum UserHomeViewSettings {
  DailyReports = "DailyReports",
  GeneralReports = "GeneralReports",
}

export type UserQuery = {
  id?: InputMaybe<Scalars["String"]>;
  resetPasswordToken?: InputMaybe<Scalars["String"]>;
};

export enum UserRoles {
  Admin = "Admin",
  ProjectManager = "ProjectManager",
  User = "User",
}

export type UserSettings = {
  __typename?: "UserSettings";
  homeView: UserHomeViewSettings;
};

export type VehicleClass = {
  __typename?: "VehicleClass";
  _id: Scalars["ID"];
  archivedAt: Scalars["DateTime"];
  crews: Array<CrewClass>;
  currentRate: Scalars["Float"];
  name: Scalars["String"];
  rates: Array<RateClass>;
  rental: Scalars["Boolean"];
  schemaVersion: Scalars["Float"];
  sourceCompany: Scalars["String"];
  vehicleCode: Scalars["String"];
  vehicleType: Scalars["String"];
};

export type VehicleCreateData = {
  name: Scalars["String"];
  rental?: InputMaybe<Scalars["Boolean"]>;
  sourceCompany?: InputMaybe<Scalars["String"]>;
  vehicleCode: Scalars["String"];
  vehicleType: Scalars["String"];
};

export type VehicleObjectClass = {
  __typename?: "VehicleObjectClass";
  deliveredRateId?: Maybe<Scalars["ID"]>;
  source?: Maybe<Scalars["String"]>;
  truckingRateId?: Maybe<Scalars["ID"]>;
  vehicleCode?: Maybe<Scalars["String"]>;
  vehicleType?: Maybe<Scalars["String"]>;
};

export type VehicleReportClass = {
  __typename?: "VehicleReportClass";
  _id: Scalars["ID"];
  crewType: CrewTypes;
  hours: Scalars["Float"];
  rate: Scalars["Float"];
  vehicle: VehicleClass;
  vehicleWork: Array<VehicleWorkClass>;
};

export type VehicleUpdateData = {
  name: Scalars["String"];
  vehicleType: Scalars["String"];
};

export type VehicleWorkClass = {
  __typename?: "VehicleWorkClass";
  _id: Scalars["ID"];
  archivedAt?: Maybe<Scalars["DateTime"]>;
  dailyReport: DailyReportClass;
  endTime?: Maybe<Scalars["DateTime"]>;
  hours: Scalars["Float"];
  jobTitle?: Maybe<Scalars["String"]>;
  schemaVersion: Scalars["Float"];
  startTime?: Maybe<Scalars["DateTime"]>;
  vehicle?: Maybe<VehicleClass>;
};

export type VehicleWorkCreateData = {
  jobs: Array<VehicleWorkJobData>;
  vehicles: Array<Scalars["String"]>;
};

export type VehicleWorkJobData = {
  hours: Scalars["Float"];
  jobTitle?: InputMaybe<Scalars["String"]>;
};

export type VehicleWorkUpdateData = {
  hours: Scalars["Float"];
  jobTitle?: InputMaybe<Scalars["String"]>;
};

export type CompanyCardSnippetFragment = {
  __typename?: "CompanyClass";
  _id: string;
  name: string;
};

export type CrewCardSnippetFragment = {
  __typename?: "CrewClass";
  _id: string;
  name: string;
};

export type CrewFullSnippetFragment = {
  __typename?: "CrewClass";
  _id: string;
  name: string;
  type: CrewTypes;
  employees: Array<{
    __typename?: "EmployeeClass";
    _id: string;
    name: string;
    jobTitle?: string | null;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  }>;
  vehicles: Array<{
    __typename?: "VehicleClass";
    _id: string;
    name: string;
    vehicleCode: string;
    vehicleType: string;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  }>;
  dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
};

export type CrewSsrSnippetFragment = {
  __typename?: "CrewClass";
  _id: string;
  name: string;
  type: CrewTypes;
};

export type DailyReportCardSnippetFragment = {
  __typename?: "DailyReportClass";
  _id: string;
  date: any;
  jobCostApproved: boolean;
  payrollComplete: boolean;
  jobsite: { __typename?: "JobsiteClass"; _id: string; name: string };
  crew: { __typename?: "CrewClass"; _id: string; name: string };
};

export type DailyReportFullSnippetFragment = {
  __typename?: "DailyReportClass";
  _id: string;
  date: any;
  jobCostApproved: boolean;
  payrollComplete: boolean;
  jobsite: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    materials: Array<{
      __typename?: "JobsiteMaterialClass";
      _id: string;
      quantity: number;
      completedQuantity: number;
      unit: string;
      costType: JobsiteMaterialCostType;
      delivered?: boolean | null;
      canRemove: boolean;
      material: { __typename?: "MaterialClass"; _id: string; name: string };
      supplier: { __typename?: "CompanyClass"; _id: string; name: string };
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
      deliveredRates: Array<{
        __typename?: "JobsiteMaterialDeliveredRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
      }>;
      invoices?: Array<{
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      }> | null;
    }>;
    truckingRates: Array<{
      __typename?: "TruckingTypeRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "TruckingRateClass";
        rate: number;
        date: any;
        type: TruckingRateTypes;
      }>;
    }>;
  };
  crew: {
    __typename?: "CrewClass";
    _id: string;
    name: string;
    type: CrewTypes;
    employees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    vehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
  };
  employeeWork: Array<{
    __typename?: "EmployeeWorkClass";
    _id: string;
    jobTitle: string;
    startTime: any;
    endTime: any;
    employee: { __typename?: "EmployeeClass"; _id: string; name: string };
  }>;
  vehicleWork: Array<{
    __typename?: "VehicleWorkClass";
    _id: string;
    hours: number;
    jobTitle?: string | null;
    vehicle?: { __typename?: "VehicleClass"; _id: string; name: string } | null;
  }>;
  productions: Array<{
    __typename?: "ProductionClass";
    _id: string;
    jobTitle: string;
    quantity: number;
    unit: string;
    startTime: any;
    endTime: any;
    description?: string | null;
  }>;
  materialShipments: Array<{
    __typename?: "MaterialShipmentClass";
    _id: string;
    shipmentType?: string | null;
    supplier?: string | null;
    quantity: number;
    unit?: string | null;
    startTime?: any | null;
    endTime?: any | null;
    noJobsiteMaterial?: boolean | null;
    schemaVersion: number;
    jobsiteMaterial?: {
      __typename?: "JobsiteMaterialClass";
      _id: string;
      quantity: number;
      completedQuantity: number;
      unit: string;
      costType: JobsiteMaterialCostType;
      delivered?: boolean | null;
      canRemove: boolean;
      material: { __typename?: "MaterialClass"; _id: string; name: string };
      supplier: { __typename?: "CompanyClass"; _id: string; name: string };
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
      deliveredRates: Array<{
        __typename?: "JobsiteMaterialDeliveredRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
      }>;
      invoices?: Array<{
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      }> | null;
    } | null;
    vehicleObject?: {
      __typename?: "VehicleObjectClass";
      source?: string | null;
      vehicleType?: string | null;
      vehicleCode?: string | null;
      truckingRateId?: string | null;
      deliveredRateId?: string | null;
    } | null;
  }>;
  reportNote?: {
    __typename?: "ReportNoteClass";
    _id: string;
    note: string;
    files: Array<{
      __typename?: "FileClass";
      _id: string;
      mimetype: string;
      description?: string | null;
    }>;
  } | null;
  temporaryEmployees: Array<{
    __typename?: "EmployeeClass";
    _id: string;
    name: string;
    jobTitle?: string | null;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  }>;
  temporaryVehicles: Array<{
    __typename?: "VehicleClass";
    _id: string;
    name: string;
    vehicleCode: string;
    vehicleType: string;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  }>;
};

export type DailyReportForMaterialShipmentSnippetFragment = {
  __typename?: "DailyReportClass";
  _id: string;
  date: any;
  jobsite: {
    __typename?: "JobsiteClass";
    materials: Array<{
      __typename?: "JobsiteMaterialClass";
      _id: string;
      quantity: number;
      completedQuantity: number;
      unit: string;
      costType: JobsiteMaterialCostType;
      delivered?: boolean | null;
      canRemove: boolean;
      material: { __typename?: "MaterialClass"; _id: string; name: string };
      supplier: { __typename?: "CompanyClass"; _id: string; name: string };
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
      deliveredRates: Array<{
        __typename?: "JobsiteMaterialDeliveredRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
      }>;
      invoices?: Array<{
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      }> | null;
    }>;
    truckingRates: Array<{
      __typename?: "TruckingTypeRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "TruckingRateClass";
        rate: number;
        date: any;
        type: TruckingRateTypes;
      }>;
    }>;
  };
};

export type DailyReportPdfSnippetFragment = {
  __typename?: "DailyReportClass";
  date: any;
  crew: { __typename?: "CrewClass"; name: string };
  jobsite: {
    __typename?: "JobsiteClass";
    name: string;
    jobcode?: string | null;
  };
  employeeWork: Array<{
    __typename?: "EmployeeWorkClass";
    _id: string;
    jobTitle: string;
    startTime: any;
    endTime: any;
    employee: { __typename?: "EmployeeClass"; _id: string; name: string };
  }>;
  vehicleWork: Array<{
    __typename?: "VehicleWorkClass";
    _id: string;
    hours: number;
    jobTitle?: string | null;
    vehicle?: { __typename?: "VehicleClass"; _id: string; name: string } | null;
  }>;
  productions: Array<{
    __typename?: "ProductionClass";
    _id: string;
    jobTitle: string;
    quantity: number;
    unit: string;
    startTime: any;
    endTime: any;
    description?: string | null;
  }>;
  materialShipments: Array<{
    __typename?: "MaterialShipmentClass";
    _id: string;
    shipmentType?: string | null;
    supplier?: string | null;
    quantity: number;
    unit?: string | null;
    startTime?: any | null;
    endTime?: any | null;
    noJobsiteMaterial?: boolean | null;
    schemaVersion: number;
    jobsiteMaterial?: {
      __typename?: "JobsiteMaterialClass";
      _id: string;
      quantity: number;
      completedQuantity: number;
      unit: string;
      costType: JobsiteMaterialCostType;
      delivered?: boolean | null;
      canRemove: boolean;
      material: { __typename?: "MaterialClass"; _id: string; name: string };
      supplier: { __typename?: "CompanyClass"; _id: string; name: string };
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
      deliveredRates: Array<{
        __typename?: "JobsiteMaterialDeliveredRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
      }>;
      invoices?: Array<{
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      }> | null;
    } | null;
    vehicleObject?: {
      __typename?: "VehicleObjectClass";
      source?: string | null;
      vehicleType?: string | null;
      vehicleCode?: string | null;
      truckingRateId?: string | null;
      deliveredRateId?: string | null;
    } | null;
  }>;
  reportNote?: {
    __typename?: "ReportNoteClass";
    _id: string;
    note: string;
    files: Array<{
      __typename?: "FileClass";
      _id: string;
      mimetype: string;
      description?: string | null;
    }>;
  } | null;
};

export type DailyReportSsrSnippetFragment = {
  __typename?: "DailyReportClass";
  _id: string;
  jobsite: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
  };
  crew: { __typename?: "CrewClass"; _id: string; name: string };
};

export type DefaultRateSnippetFragment = {
  __typename?: "DefaultRateClass";
  _id?: string | null;
  title: string;
  rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
};

export type EmployeeWorkCardSnippetFragment = {
  __typename?: "EmployeeWorkClass";
  _id: string;
  jobTitle: string;
  startTime: any;
  endTime: any;
  employee: { __typename?: "EmployeeClass"; _id: string; name: string };
};

export type EmployeeCardSnippetFragment = {
  __typename?: "EmployeeClass";
  _id: string;
  name: string;
  jobTitle?: string | null;
  rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
};

export type EmployeeFullSnippetFragment = {
  __typename?: "EmployeeClass";
  _id: string;
  name: string;
  jobTitle?: string | null;
  user?: {
    __typename?: "UserClass";
    _id: string;
    name: string;
    email: string;
    role: UserRoles;
    admin: boolean;
    projectManager: boolean;
  } | null;
  crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
  signup?: { __typename?: "SignupClass"; _id: string } | null;
  rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
};

export type EmployeeSsrSnippetFragment = {
  __typename?: "EmployeeClass";
  _id: string;
  name: string;
  jobTitle?: string | null;
};

export type EmployeeSearchSnippetFragment = {
  __typename?: "EmployeeClass";
  _id: string;
  name: string;
};

export type FileFullSnippetFragment = {
  __typename?: "FileClass";
  buffer: string;
  downloadUrl: string;
  _id: string;
  mimetype: string;
  description?: string | null;
};

export type FilePreloadSnippetFragment = {
  __typename?: "FileClass";
  _id: string;
  mimetype: string;
  description?: string | null;
};

export type InvoiceCardSnippetFragment = {
  __typename?: "InvoiceClass";
  _id: string;
  date: any;
  invoiceNumber: string;
  cost: number;
  description?: string | null;
  internal: boolean;
  accrual: boolean;
  company: { __typename?: "CompanyClass"; _id: string; name: string };
};

export type JobsiteDayReportEmployeeSnippetFragment = {
  __typename?: "EmployeeReportClass";
  _id: string;
  rate: number;
  hours: number;
  crewType: CrewTypes;
  employee?: {
    __typename?: "EmployeeClass";
    _id: string;
    name: string;
    jobTitle?: string | null;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  } | null;
  employeeWork: Array<{ __typename?: "EmployeeWorkClass"; jobTitle: string }>;
};

export type JobsiteDayReportInvoiceSnippetFragment = {
  __typename?: "InvoiceReportClass";
  _id: string;
  value: number;
  internal: boolean;
  accrual: boolean;
  invoice: {
    __typename?: "InvoiceClass";
    _id: string;
    date: any;
    invoiceNumber: string;
    cost: number;
    description?: string | null;
    internal: boolean;
    accrual: boolean;
    company: { __typename?: "CompanyClass"; _id: string; name: string };
  };
};

export type JobsiteDayReportMaterialSnippetFragment = {
  __typename?: "MaterialReportClass";
  _id: string;
  deliveredRateId?: string | null;
  rate: number;
  quantity: number;
  crewType: CrewTypes;
  jobsiteMaterial: {
    __typename?: "JobsiteMaterialClass";
    _id: string;
    quantity: number;
    completedQuantity: number;
    unit: string;
    costType: JobsiteMaterialCostType;
    delivered?: boolean | null;
    canRemove: boolean;
    material: { __typename?: "MaterialClass"; _id: string; name: string };
    supplier: { __typename?: "CompanyClass"; _id: string; name: string };
    rates: Array<{
      __typename?: "JobsiteMaterialRateClass";
      _id?: string | null;
      rate: number;
      date: any;
      estimated?: boolean | null;
    }>;
    deliveredRates: Array<{
      __typename?: "JobsiteMaterialDeliveredRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
    }>;
    invoices?: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }> | null;
  };
};

export type JobsiteDayReportNonCostedMaterialSnippetFragment = {
  __typename?: "NonCostedMaterialReportClass";
  _id: string;
  materialName: string;
  supplierName: string;
  quantity: number;
  crewType: CrewTypes;
};

export type JobsiteDayReportTruckingSnippetFragment = {
  __typename?: "TruckingReportClass";
  _id: string;
  truckingType: string;
  quantity: number;
  hours?: number | null;
  type: TruckingRateTypes;
  rate: number;
  crewType: CrewTypes;
};

export type JobsiteDayReportVehicleSnippetFragment = {
  __typename?: "VehicleReportClass";
  _id: string;
  rate: number;
  hours: number;
  crewType: CrewTypes;
  vehicle: {
    __typename?: "VehicleClass";
    _id: string;
    name: string;
    vehicleCode: string;
    vehicleType: string;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  };
  vehicleWork: Array<{
    __typename?: "VehicleWorkClass";
    jobTitle?: string | null;
  }>;
};

export type JobsiteDayReportFullSnippetFragment = {
  __typename?: "JobsiteDayReportClass";
  _id: string;
  date: any;
  crewTypes: Array<CrewTypes>;
  employees: Array<{
    __typename?: "EmployeeReportClass";
    _id: string;
    rate: number;
    hours: number;
    crewType: CrewTypes;
    employee?: {
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    } | null;
    employeeWork: Array<{ __typename?: "EmployeeWorkClass"; jobTitle: string }>;
  }>;
  vehicles: Array<{
    __typename?: "VehicleReportClass";
    _id: string;
    rate: number;
    hours: number;
    crewType: CrewTypes;
    vehicle: {
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    };
    vehicleWork: Array<{
      __typename?: "VehicleWorkClass";
      jobTitle?: string | null;
    }>;
  }>;
  materials: Array<{
    __typename?: "MaterialReportClass";
    _id: string;
    deliveredRateId?: string | null;
    rate: number;
    quantity: number;
    crewType: CrewTypes;
    jobsiteMaterial: {
      __typename?: "JobsiteMaterialClass";
      _id: string;
      quantity: number;
      completedQuantity: number;
      unit: string;
      costType: JobsiteMaterialCostType;
      delivered?: boolean | null;
      canRemove: boolean;
      material: { __typename?: "MaterialClass"; _id: string; name: string };
      supplier: { __typename?: "CompanyClass"; _id: string; name: string };
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
      deliveredRates: Array<{
        __typename?: "JobsiteMaterialDeliveredRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
      }>;
      invoices?: Array<{
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      }> | null;
    };
  }>;
  nonCostedMaterials: Array<{
    __typename?: "NonCostedMaterialReportClass";
    _id: string;
    materialName: string;
    supplierName: string;
    quantity: number;
    crewType: CrewTypes;
  }>;
  trucking: Array<{
    __typename?: "TruckingReportClass";
    _id: string;
    truckingType: string;
    quantity: number;
    hours?: number | null;
    type: TruckingRateTypes;
    rate: number;
    crewType: CrewTypes;
  }>;
  summary: {
    __typename?: "OnSiteSummaryReportClass";
    employeeHours: number;
    employeeCost: number;
    vehicleHours: number;
    vehicleCost: number;
    materialQuantity: number;
    materialCost: number;
    nonCostedMaterialQuantity: number;
    truckingQuantity: number;
    truckingHours: number;
    truckingCost: number;
    crewTypeSummaries: Array<{
      __typename?: "CrewTypeOnSiteSummaryClass";
      crewType: CrewTypes;
      employeeHours: number;
      employeeCost: number;
      vehicleHours: number;
      vehicleCost: number;
      materialQuantity: number;
      materialCost: number;
      nonCostedMaterialQuantity: number;
      truckingQuantity: number;
      truckingHours: number;
      truckingCost: number;
    }>;
  };
};

export type JobsiteMaterialDeliveredRateSnippetFragment = {
  __typename?: "JobsiteMaterialDeliveredRateClass";
  _id?: string | null;
  title: string;
  rates: Array<{
    __typename?: "JobsiteMaterialRateClass";
    _id?: string | null;
    rate: number;
    date: any;
    estimated?: boolean | null;
  }>;
};

export type JobsiteMaterialRateSnippetFragment = {
  __typename?: "JobsiteMaterialRateClass";
  _id?: string | null;
  rate: number;
  date: any;
  estimated?: boolean | null;
};

export type JobsiteMaterialCardSnippetFragment = {
  __typename?: "JobsiteMaterialClass";
  _id: string;
  quantity: number;
  completedQuantity: number;
  unit: string;
  costType: JobsiteMaterialCostType;
  delivered?: boolean | null;
  canRemove: boolean;
  material: { __typename?: "MaterialClass"; _id: string; name: string };
  supplier: { __typename?: "CompanyClass"; _id: string; name: string };
  rates: Array<{
    __typename?: "JobsiteMaterialRateClass";
    _id?: string | null;
    rate: number;
    date: any;
    estimated?: boolean | null;
  }>;
  deliveredRates: Array<{
    __typename?: "JobsiteMaterialDeliveredRateClass";
    _id?: string | null;
    title: string;
    rates: Array<{
      __typename?: "JobsiteMaterialRateClass";
      _id?: string | null;
      rate: number;
      date: any;
      estimated?: boolean | null;
    }>;
  }>;
  invoices?: Array<{
    __typename?: "InvoiceClass";
    _id: string;
    date: any;
    invoiceNumber: string;
    cost: number;
    description?: string | null;
    internal: boolean;
    accrual: boolean;
    company: { __typename?: "CompanyClass"; _id: string; name: string };
  }> | null;
};

export type JobsiteMonthReportCardSnippetFragment = {
  __typename?: "JobsiteMonthReportClass";
  _id: string;
  startOfMonth: any;
  update: {
    __typename?: "UpdateClass";
    status: UpdateStatus;
    lastUpdatedAt?: any | null;
  };
  jobsite: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
  };
};

export type JobsiteMonthReportFullSnippetFragment = {
  __typename?: "JobsiteMonthReportClass";
  crewTypes: Array<CrewTypes>;
  excelDownloadUrl?: string | null;
  _id: string;
  startOfMonth: any;
  dayReports: Array<{
    __typename?: "JobsiteDayReportClass";
    _id: string;
    date: any;
    crewTypes: Array<CrewTypes>;
    employees: Array<{
      __typename?: "EmployeeReportClass";
      _id: string;
      rate: number;
      hours: number;
      crewType: CrewTypes;
      employee?: {
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      } | null;
      employeeWork: Array<{
        __typename?: "EmployeeWorkClass";
        jobTitle: string;
      }>;
    }>;
    vehicles: Array<{
      __typename?: "VehicleReportClass";
      _id: string;
      rate: number;
      hours: number;
      crewType: CrewTypes;
      vehicle: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      };
      vehicleWork: Array<{
        __typename?: "VehicleWorkClass";
        jobTitle?: string | null;
      }>;
    }>;
    materials: Array<{
      __typename?: "MaterialReportClass";
      _id: string;
      deliveredRateId?: string | null;
      rate: number;
      quantity: number;
      crewType: CrewTypes;
      jobsiteMaterial: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      };
    }>;
    nonCostedMaterials: Array<{
      __typename?: "NonCostedMaterialReportClass";
      _id: string;
      materialName: string;
      supplierName: string;
      quantity: number;
      crewType: CrewTypes;
    }>;
    trucking: Array<{
      __typename?: "TruckingReportClass";
      _id: string;
      truckingType: string;
      quantity: number;
      hours?: number | null;
      type: TruckingRateTypes;
      rate: number;
      crewType: CrewTypes;
    }>;
    summary: {
      __typename?: "OnSiteSummaryReportClass";
      employeeHours: number;
      employeeCost: number;
      vehicleHours: number;
      vehicleCost: number;
      materialQuantity: number;
      materialCost: number;
      nonCostedMaterialQuantity: number;
      truckingQuantity: number;
      truckingHours: number;
      truckingCost: number;
      crewTypeSummaries: Array<{
        __typename?: "CrewTypeOnSiteSummaryClass";
        crewType: CrewTypes;
        employeeHours: number;
        employeeCost: number;
        vehicleHours: number;
        vehicleCost: number;
        materialQuantity: number;
        materialCost: number;
        nonCostedMaterialQuantity: number;
        truckingQuantity: number;
        truckingHours: number;
        truckingCost: number;
      }>;
    };
  }>;
  expenseInvoices: Array<{
    __typename?: "InvoiceReportClass";
    _id: string;
    value: number;
    internal: boolean;
    accrual: boolean;
    invoice: {
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    };
  }>;
  revenueInvoices: Array<{
    __typename?: "InvoiceReportClass";
    _id: string;
    value: number;
    internal: boolean;
    accrual: boolean;
    invoice: {
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    };
  }>;
  summary: {
    __typename?: "RangeSummaryReportClass";
    externalExpenseInvoiceValue: number;
    internalExpenseInvoiceValue: number;
    accrualExpenseInvoiceValue: number;
    externalRevenueInvoiceValue: number;
    internalRevenueInvoiceValue: number;
    accrualRevenueInvoiceValue: number;
  };
  issues: Array<{
    __typename?: "ReportIssueFullClass";
    _id: string;
    type: ReportIssueTypes;
    amount?: number | null;
    employee?: {
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    } | null;
    vehicle?: {
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    } | null;
    jobsiteMaterial?: {
      __typename?: "JobsiteMaterialClass";
      _id: string;
      quantity: number;
      completedQuantity: number;
      unit: string;
      costType: JobsiteMaterialCostType;
      delivered?: boolean | null;
      canRemove: boolean;
      jobsite: { __typename?: "JobsiteClass"; _id: string };
      material: { __typename?: "MaterialClass"; _id: string; name: string };
      supplier: { __typename?: "CompanyClass"; _id: string; name: string };
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
      deliveredRates: Array<{
        __typename?: "JobsiteMaterialDeliveredRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
      }>;
      invoices?: Array<{
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      }> | null;
    } | null;
  }>;
  update: {
    __typename?: "UpdateClass";
    status: UpdateStatus;
    lastUpdatedAt?: any | null;
  };
  jobsite: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
  };
};

export type JobsiteYearMasterReportItemSnippetFragment = {
  __typename?: "JobsiteYearMasterReportItemClass";
  _id: string;
  report: { __typename?: "JobsiteYearReportClass"; _id: string };
  summary: {
    __typename?: "OnSiteSummaryReportClass";
    employeeHours: number;
    employeeCost: number;
    vehicleHours: number;
    vehicleCost: number;
    materialQuantity: number;
    materialCost: number;
    nonCostedMaterialQuantity: number;
    truckingQuantity: number;
    truckingHours: number;
    truckingCost: number;
    crewTypeSummaries: Array<{
      __typename?: "CrewTypeOnSiteSummaryClass";
      crewType: CrewTypes;
      employeeHours: number;
      employeeCost: number;
      vehicleHours: number;
      vehicleCost: number;
      materialQuantity: number;
      materialCost: number;
      nonCostedMaterialQuantity: number;
      truckingQuantity: number;
      truckingHours: number;
      truckingCost: number;
    }>;
  };
};

export type JobsiteYearMasterReportCardSnippetFragment = {
  __typename?: "JobsiteYearMasterReportClass";
  _id: string;
  startOfYear: any;
  update: {
    __typename?: "UpdateClass";
    status: UpdateStatus;
    lastUpdatedAt?: any | null;
  };
};

export type JobsiteYearMasterReportFullSnippetFragment = {
  __typename?: "JobsiteYearMasterReportClass";
  crewTypes: Array<CrewTypes>;
  excelDownloadUrl?: string | null;
  _id: string;
  startOfYear: any;
  reports: Array<{
    __typename?: "JobsiteYearMasterReportItemClass";
    _id: string;
    report: { __typename?: "JobsiteYearReportClass"; _id: string };
    summary: {
      __typename?: "OnSiteSummaryReportClass";
      employeeHours: number;
      employeeCost: number;
      vehicleHours: number;
      vehicleCost: number;
      materialQuantity: number;
      materialCost: number;
      nonCostedMaterialQuantity: number;
      truckingQuantity: number;
      truckingHours: number;
      truckingCost: number;
      crewTypeSummaries: Array<{
        __typename?: "CrewTypeOnSiteSummaryClass";
        crewType: CrewTypes;
        employeeHours: number;
        employeeCost: number;
        vehicleHours: number;
        vehicleCost: number;
        materialQuantity: number;
        materialCost: number;
        nonCostedMaterialQuantity: number;
        truckingQuantity: number;
        truckingHours: number;
        truckingCost: number;
      }>;
    };
  }>;
  summary: {
    __typename?: "RangeSummaryReportClass";
    externalExpenseInvoiceValue: number;
    internalExpenseInvoiceValue: number;
    accrualExpenseInvoiceValue: number;
    externalRevenueInvoiceValue: number;
    internalRevenueInvoiceValue: number;
    accrualRevenueInvoiceValue: number;
  };
  update: {
    __typename?: "UpdateClass";
    status: UpdateStatus;
    lastUpdatedAt?: any | null;
  };
};

export type JobsiteYearReportCardSnippetFragment = {
  __typename?: "JobsiteYearReportClass";
  _id: string;
  startOfYear: any;
  update: {
    __typename?: "UpdateClass";
    status: UpdateStatus;
    lastUpdatedAt?: any | null;
  };
  jobsite: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
  };
};

export type JobsiteYearReportFullSnippetFragment = {
  __typename?: "JobsiteYearReportClass";
  crewTypes: Array<CrewTypes>;
  excelDownloadUrl?: string | null;
  _id: string;
  startOfYear: any;
  dayReports: Array<{
    __typename?: "JobsiteDayReportClass";
    _id: string;
    date: any;
    crewTypes: Array<CrewTypes>;
    employees: Array<{
      __typename?: "EmployeeReportClass";
      _id: string;
      rate: number;
      hours: number;
      crewType: CrewTypes;
      employee?: {
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      } | null;
      employeeWork: Array<{
        __typename?: "EmployeeWorkClass";
        jobTitle: string;
      }>;
    }>;
    vehicles: Array<{
      __typename?: "VehicleReportClass";
      _id: string;
      rate: number;
      hours: number;
      crewType: CrewTypes;
      vehicle: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      };
      vehicleWork: Array<{
        __typename?: "VehicleWorkClass";
        jobTitle?: string | null;
      }>;
    }>;
    materials: Array<{
      __typename?: "MaterialReportClass";
      _id: string;
      deliveredRateId?: string | null;
      rate: number;
      quantity: number;
      crewType: CrewTypes;
      jobsiteMaterial: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      };
    }>;
    nonCostedMaterials: Array<{
      __typename?: "NonCostedMaterialReportClass";
      _id: string;
      materialName: string;
      supplierName: string;
      quantity: number;
      crewType: CrewTypes;
    }>;
    trucking: Array<{
      __typename?: "TruckingReportClass";
      _id: string;
      truckingType: string;
      quantity: number;
      hours?: number | null;
      type: TruckingRateTypes;
      rate: number;
      crewType: CrewTypes;
    }>;
    summary: {
      __typename?: "OnSiteSummaryReportClass";
      employeeHours: number;
      employeeCost: number;
      vehicleHours: number;
      vehicleCost: number;
      materialQuantity: number;
      materialCost: number;
      nonCostedMaterialQuantity: number;
      truckingQuantity: number;
      truckingHours: number;
      truckingCost: number;
      crewTypeSummaries: Array<{
        __typename?: "CrewTypeOnSiteSummaryClass";
        crewType: CrewTypes;
        employeeHours: number;
        employeeCost: number;
        vehicleHours: number;
        vehicleCost: number;
        materialQuantity: number;
        materialCost: number;
        nonCostedMaterialQuantity: number;
        truckingQuantity: number;
        truckingHours: number;
        truckingCost: number;
      }>;
    };
  }>;
  expenseInvoices: Array<{
    __typename?: "InvoiceReportClass";
    _id: string;
    value: number;
    internal: boolean;
    accrual: boolean;
    invoice: {
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    };
  }>;
  revenueInvoices: Array<{
    __typename?: "InvoiceReportClass";
    _id: string;
    value: number;
    internal: boolean;
    accrual: boolean;
    invoice: {
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    };
  }>;
  summary: {
    __typename?: "RangeSummaryReportClass";
    externalExpenseInvoiceValue: number;
    internalExpenseInvoiceValue: number;
    accrualExpenseInvoiceValue: number;
    externalRevenueInvoiceValue: number;
    internalRevenueInvoiceValue: number;
    accrualRevenueInvoiceValue: number;
  };
  issues: Array<{
    __typename?: "ReportIssueFullClass";
    _id: string;
    type: ReportIssueTypes;
    amount?: number | null;
    employee?: {
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    } | null;
    vehicle?: {
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    } | null;
    jobsiteMaterial?: {
      __typename?: "JobsiteMaterialClass";
      _id: string;
      quantity: number;
      completedQuantity: number;
      unit: string;
      costType: JobsiteMaterialCostType;
      delivered?: boolean | null;
      canRemove: boolean;
      jobsite: { __typename?: "JobsiteClass"; _id: string };
      material: { __typename?: "MaterialClass"; _id: string; name: string };
      supplier: { __typename?: "CompanyClass"; _id: string; name: string };
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
      deliveredRates: Array<{
        __typename?: "JobsiteMaterialDeliveredRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
      }>;
      invoices?: Array<{
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      }> | null;
    } | null;
  }>;
  update: {
    __typename?: "UpdateClass";
    status: UpdateStatus;
    lastUpdatedAt?: any | null;
  };
  jobsite: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
  };
};

export type JobsiteYearReportSummarySnippetFragment = {
  __typename?: "JobsiteYearReportClass";
  crewTypes: Array<CrewTypes>;
  _id: string;
  startOfYear: any;
  summary: {
    __typename?: "RangeSummaryReportClass";
    externalExpenseInvoiceValue: number;
    internalExpenseInvoiceValue: number;
    accrualExpenseInvoiceValue: number;
    externalRevenueInvoiceValue: number;
    internalRevenueInvoiceValue: number;
    accrualRevenueInvoiceValue: number;
  };
  issues: Array<{
    __typename?: "ReportIssueFullClass";
    _id: string;
    type: ReportIssueTypes;
    amount?: number | null;
    employee?: {
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    } | null;
    vehicle?: {
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    } | null;
    jobsiteMaterial?: {
      __typename?: "JobsiteMaterialClass";
      _id: string;
      quantity: number;
      completedQuantity: number;
      unit: string;
      costType: JobsiteMaterialCostType;
      delivered?: boolean | null;
      canRemove: boolean;
      jobsite: { __typename?: "JobsiteClass"; _id: string };
      material: { __typename?: "MaterialClass"; _id: string; name: string };
      supplier: { __typename?: "CompanyClass"; _id: string; name: string };
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
      deliveredRates: Array<{
        __typename?: "JobsiteMaterialDeliveredRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
      }>;
      invoices?: Array<{
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      }> | null;
    } | null;
  }>;
  update: {
    __typename?: "UpdateClass";
    status: UpdateStatus;
    lastUpdatedAt?: any | null;
  };
  jobsite: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
  };
};

export type JobsiteCardSnippetFragment = {
  __typename?: "JobsiteClass";
  _id: string;
  name: string;
  jobcode?: string | null;
};

export type JobsiteForDailyReportSnippetFragment = {
  __typename?: "JobsiteClass";
  _id: string;
  name: string;
  materials: Array<{
    __typename?: "JobsiteMaterialClass";
    _id: string;
    quantity: number;
    completedQuantity: number;
    unit: string;
    costType: JobsiteMaterialCostType;
    delivered?: boolean | null;
    canRemove: boolean;
    material: { __typename?: "MaterialClass"; _id: string; name: string };
    supplier: { __typename?: "CompanyClass"; _id: string; name: string };
    rates: Array<{
      __typename?: "JobsiteMaterialRateClass";
      _id?: string | null;
      rate: number;
      date: any;
      estimated?: boolean | null;
    }>;
    deliveredRates: Array<{
      __typename?: "JobsiteMaterialDeliveredRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
    }>;
    invoices?: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }> | null;
  }>;
  truckingRates: Array<{
    __typename?: "TruckingTypeRateClass";
    _id?: string | null;
    title: string;
    rates: Array<{
      __typename?: "TruckingRateClass";
      rate: number;
      date: any;
      type: TruckingRateTypes;
    }>;
  }>;
};

export type JobsiteFullSnippetFragment = {
  __typename?: "JobsiteClass";
  _id: string;
  name: string;
  jobcode?: string | null;
  description?: string | null;
  location_url?: string | null;
  active: boolean;
  crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
  monthReports: Array<{
    __typename?: "JobsiteMonthReportClass";
    _id: string;
    startOfMonth: any;
    update: {
      __typename?: "UpdateClass";
      status: UpdateStatus;
      lastUpdatedAt?: any | null;
    };
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      jobcode?: string | null;
    };
  }>;
  yearReports: Array<{
    __typename?: "JobsiteYearReportClass";
    _id: string;
    startOfYear: any;
    update: {
      __typename?: "UpdateClass";
      status: UpdateStatus;
      lastUpdatedAt?: any | null;
    };
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      jobcode?: string | null;
    };
  }>;
  dailyReports: Array<{
    __typename?: "DailyReportClass";
    _id: string;
    date: any;
    jobCostApproved: boolean;
    payrollComplete: boolean;
    jobsite: { __typename?: "JobsiteClass"; _id: string; name: string };
    crew: { __typename?: "CrewClass"; _id: string; name: string };
  }>;
  expenseInvoices: Array<{
    __typename?: "InvoiceClass";
    _id: string;
    date: any;
    invoiceNumber: string;
    cost: number;
    description?: string | null;
    internal: boolean;
    accrual: boolean;
    company: { __typename?: "CompanyClass"; _id: string; name: string };
  }>;
  revenueInvoices: Array<{
    __typename?: "InvoiceClass";
    _id: string;
    date: any;
    invoiceNumber: string;
    cost: number;
    description?: string | null;
    internal: boolean;
    accrual: boolean;
    company: { __typename?: "CompanyClass"; _id: string; name: string };
  }>;
  truckingRates: Array<{
    __typename?: "TruckingTypeRateClass";
    _id?: string | null;
    title: string;
    rates: Array<{
      __typename?: "TruckingRateClass";
      rate: number;
      date: any;
      type: TruckingRateTypes;
    }>;
  }>;
  fileObjects: Array<{
    __typename?: "JobsiteFileObjectClass";
    _id?: string | null;
    minRole: UserRoles;
    file: {
      __typename?: "FileClass";
      _id: string;
      mimetype: string;
      description?: string | null;
    };
  }>;
};

export type JobsiteMaterialsSnippetFragment = {
  __typename?: "JobsiteClass";
  _id: string;
  materials: Array<{
    __typename?: "JobsiteMaterialClass";
    _id: string;
    quantity: number;
    completedQuantity: number;
    unit: string;
    costType: JobsiteMaterialCostType;
    delivered?: boolean | null;
    canRemove: boolean;
    material: { __typename?: "MaterialClass"; _id: string; name: string };
    supplier: { __typename?: "CompanyClass"; _id: string; name: string };
    rates: Array<{
      __typename?: "JobsiteMaterialRateClass";
      _id?: string | null;
      rate: number;
      date: any;
      estimated?: boolean | null;
    }>;
    deliveredRates: Array<{
      __typename?: "JobsiteMaterialDeliveredRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
    }>;
    invoices?: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }> | null;
  }>;
};

export type JobsiteNonCostedMaterialsSnippetFragment = {
  __typename?: "JobsiteClass";
  _id: string;
  nonCostedMaterialShipments: Array<{
    __typename?: "MaterialShipmentClass";
    _id: string;
    shipmentType?: string | null;
    supplier?: string | null;
    quantity: number;
    unit?: string | null;
    startTime?: any | null;
    endTime?: any | null;
    noJobsiteMaterial?: boolean | null;
    schemaVersion: number;
    dailyReport: {
      __typename?: "DailyReportClass";
      _id: string;
      date: any;
      jobsite: {
        __typename?: "JobsiteClass";
        materials: Array<{
          __typename?: "JobsiteMaterialClass";
          _id: string;
          quantity: number;
          completedQuantity: number;
          unit: string;
          costType: JobsiteMaterialCostType;
          delivered?: boolean | null;
          canRemove: boolean;
          material: { __typename?: "MaterialClass"; _id: string; name: string };
          supplier: { __typename?: "CompanyClass"; _id: string; name: string };
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
          deliveredRates: Array<{
            __typename?: "JobsiteMaterialDeliveredRateClass";
            _id?: string | null;
            title: string;
            rates: Array<{
              __typename?: "JobsiteMaterialRateClass";
              _id?: string | null;
              rate: number;
              date: any;
              estimated?: boolean | null;
            }>;
          }>;
          invoices?: Array<{
            __typename?: "InvoiceClass";
            _id: string;
            date: any;
            invoiceNumber: string;
            cost: number;
            description?: string | null;
            internal: boolean;
            accrual: boolean;
            company: { __typename?: "CompanyClass"; _id: string; name: string };
          }> | null;
        }>;
        truckingRates: Array<{
          __typename?: "TruckingTypeRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "TruckingRateClass";
            rate: number;
            date: any;
            type: TruckingRateTypes;
          }>;
        }>;
      };
    };
    jobsiteMaterial?: {
      __typename?: "JobsiteMaterialClass";
      _id: string;
      quantity: number;
      completedQuantity: number;
      unit: string;
      costType: JobsiteMaterialCostType;
      delivered?: boolean | null;
      canRemove: boolean;
      material: { __typename?: "MaterialClass"; _id: string; name: string };
      supplier: { __typename?: "CompanyClass"; _id: string; name: string };
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
      deliveredRates: Array<{
        __typename?: "JobsiteMaterialDeliveredRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
      }>;
      invoices?: Array<{
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      }> | null;
    } | null;
    vehicleObject?: {
      __typename?: "VehicleObjectClass";
      source?: string | null;
      vehicleType?: string | null;
      vehicleCode?: string | null;
      truckingRateId?: string | null;
      deliveredRateId?: string | null;
    } | null;
  }>;
};

export type JobsiteSsrSnippetFragment = {
  __typename?: "JobsiteClass";
  _id: string;
  name: string;
  jobcode?: string | null;
};

export type JobsiteSearchSnippetFragment = {
  __typename?: "JobsiteClass";
  _id: string;
  name: string;
  jobcode?: string | null;
};

export type JobsiteTruckingRatesSnippetFragment = {
  __typename?: "JobsiteClass";
  _id: string;
  name: string;
  jobcode?: string | null;
  truckingRates: Array<{
    __typename?: "TruckingTypeRateClass";
    _id?: string | null;
    title: string;
    rates: Array<{
      __typename?: "TruckingRateClass";
      rate: number;
      date: any;
      type: TruckingRateTypes;
    }>;
  }>;
};

export type MaterialShipmentCardSnippetFragment = {
  __typename?: "MaterialShipmentClass";
  _id: string;
  shipmentType?: string | null;
  supplier?: string | null;
  quantity: number;
  unit?: string | null;
  startTime?: any | null;
  endTime?: any | null;
  noJobsiteMaterial?: boolean | null;
  schemaVersion: number;
  jobsiteMaterial?: {
    __typename?: "JobsiteMaterialClass";
    _id: string;
    quantity: number;
    completedQuantity: number;
    unit: string;
    costType: JobsiteMaterialCostType;
    delivered?: boolean | null;
    canRemove: boolean;
    material: { __typename?: "MaterialClass"; _id: string; name: string };
    supplier: { __typename?: "CompanyClass"; _id: string; name: string };
    rates: Array<{
      __typename?: "JobsiteMaterialRateClass";
      _id?: string | null;
      rate: number;
      date: any;
      estimated?: boolean | null;
    }>;
    deliveredRates: Array<{
      __typename?: "JobsiteMaterialDeliveredRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
    }>;
    invoices?: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }> | null;
  } | null;
  vehicleObject?: {
    __typename?: "VehicleObjectClass";
    source?: string | null;
    vehicleType?: string | null;
    vehicleCode?: string | null;
    truckingRateId?: string | null;
    deliveredRateId?: string | null;
  } | null;
};

export type MaterialShipmentNonCostedSnippetFragment = {
  __typename?: "MaterialShipmentClass";
  _id: string;
  shipmentType?: string | null;
  supplier?: string | null;
  quantity: number;
  unit?: string | null;
  startTime?: any | null;
  endTime?: any | null;
  noJobsiteMaterial?: boolean | null;
  schemaVersion: number;
  dailyReport: {
    __typename?: "DailyReportClass";
    _id: string;
    date: any;
    jobsite: {
      __typename?: "JobsiteClass";
      materials: Array<{
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      }>;
      truckingRates: Array<{
        __typename?: "TruckingTypeRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "TruckingRateClass";
          rate: number;
          date: any;
          type: TruckingRateTypes;
        }>;
      }>;
    };
  };
  jobsiteMaterial?: {
    __typename?: "JobsiteMaterialClass";
    _id: string;
    quantity: number;
    completedQuantity: number;
    unit: string;
    costType: JobsiteMaterialCostType;
    delivered?: boolean | null;
    canRemove: boolean;
    material: { __typename?: "MaterialClass"; _id: string; name: string };
    supplier: { __typename?: "CompanyClass"; _id: string; name: string };
    rates: Array<{
      __typename?: "JobsiteMaterialRateClass";
      _id?: string | null;
      rate: number;
      date: any;
      estimated?: boolean | null;
    }>;
    deliveredRates: Array<{
      __typename?: "JobsiteMaterialDeliveredRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
    }>;
    invoices?: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }> | null;
  } | null;
  vehicleObject?: {
    __typename?: "VehicleObjectClass";
    source?: string | null;
    vehicleType?: string | null;
    vehicleCode?: string | null;
    truckingRateId?: string | null;
    deliveredRateId?: string | null;
  } | null;
};

export type MaterialCardSnippetFragment = {
  __typename?: "MaterialClass";
  _id: string;
  name: string;
};

export type MaterialFullSnippetFragment = {
  __typename?: "MaterialClass";
  canRemove: boolean;
  _id: string;
  name: string;
};

export type OnSiteSummaryReportSnippetFragment = {
  __typename?: "OnSiteSummaryReportClass";
  employeeHours: number;
  employeeCost: number;
  vehicleHours: number;
  vehicleCost: number;
  materialQuantity: number;
  materialCost: number;
  nonCostedMaterialQuantity: number;
  truckingQuantity: number;
  truckingHours: number;
  truckingCost: number;
  crewTypeSummaries: Array<{
    __typename?: "CrewTypeOnSiteSummaryClass";
    crewType: CrewTypes;
    employeeHours: number;
    employeeCost: number;
    vehicleHours: number;
    vehicleCost: number;
    materialQuantity: number;
    materialCost: number;
    nonCostedMaterialQuantity: number;
    truckingQuantity: number;
    truckingHours: number;
    truckingCost: number;
  }>;
};

export type ProductionCardSnippetFragment = {
  __typename?: "ProductionClass";
  _id: string;
  jobTitle: string;
  quantity: number;
  unit: string;
  startTime: any;
  endTime: any;
  description?: string | null;
};

export type RateSnippetFragment = {
  __typename?: "RateClass";
  date: any;
  rate: number;
};

export type ReportIssueSnippetFragment = {
  __typename?: "ReportIssueFullClass";
  _id: string;
  type: ReportIssueTypes;
  amount?: number | null;
  employee?: {
    __typename?: "EmployeeClass";
    _id: string;
    name: string;
    jobTitle?: string | null;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  } | null;
  vehicle?: {
    __typename?: "VehicleClass";
    _id: string;
    name: string;
    vehicleCode: string;
    vehicleType: string;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  } | null;
  jobsiteMaterial?: {
    __typename?: "JobsiteMaterialClass";
    _id: string;
    quantity: number;
    completedQuantity: number;
    unit: string;
    costType: JobsiteMaterialCostType;
    delivered?: boolean | null;
    canRemove: boolean;
    jobsite: { __typename?: "JobsiteClass"; _id: string };
    material: { __typename?: "MaterialClass"; _id: string; name: string };
    supplier: { __typename?: "CompanyClass"; _id: string; name: string };
    rates: Array<{
      __typename?: "JobsiteMaterialRateClass";
      _id?: string | null;
      rate: number;
      date: any;
      estimated?: boolean | null;
    }>;
    deliveredRates: Array<{
      __typename?: "JobsiteMaterialDeliveredRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
    }>;
    invoices?: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }> | null;
  } | null;
};

export type ReportNoteFullSnippetFragment = {
  __typename?: "ReportNoteClass";
  _id: string;
  note: string;
  files: Array<{
    __typename?: "FileClass";
    _id: string;
    mimetype: string;
    description?: string | null;
  }>;
};

export type SearchSnippetFragment = {
  __typename?: "SearchClass";
  score: number;
  employee?: {
    __typename?: "EmployeeClass";
    _id: string;
    name: string;
    jobTitle?: string | null;
  } | null;
  vehicle?: {
    __typename?: "VehicleClass";
    _id: string;
    name: string;
    vehicleType: string;
    vehicleCode: string;
  } | null;
  jobsite?: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
  } | null;
  dailyReport?: {
    __typename?: "DailyReportClass";
    _id: string;
    date: any;
    jobCostApproved: boolean;
    payrollComplete: boolean;
    jobsite: { __typename?: "JobsiteClass"; _id: string; name: string };
    crew: { __typename?: "CrewClass"; _id: string; name: string };
  } | null;
  crew?: { __typename?: "CrewClass"; _id: string; name: string } | null;
};

export type SignupFullSnippetFragment = {
  __typename?: "SignupClass";
  _id: string;
  employee: { __typename?: "EmployeeClass"; _id: string; name: string };
};

export type SystemSnippetFragment = {
  __typename?: "SystemClass";
  unitDefaults: Array<string>;
  laborTypes: Array<string>;
  internalExpenseOverheadRate: number;
  companyVehicleTypeDefaults: Array<{
    __typename?: "DefaultRateClass";
    _id?: string | null;
    title: string;
    rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
  }>;
  materialShipmentVehicleTypeDefaults: Array<{
    __typename?: "DefaultRateClass";
    _id?: string | null;
    title: string;
    rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
  }>;
};

export type TruckingRateSnippetFragment = {
  __typename?: "TruckingRateClass";
  rate: number;
  date: any;
  type: TruckingRateTypes;
};

export type TruckingTypeRateSnippetFragment = {
  __typename?: "TruckingTypeRateClass";
  _id?: string | null;
  title: string;
  rates: Array<{
    __typename?: "TruckingRateClass";
    rate: number;
    date: any;
    type: TruckingRateTypes;
  }>;
};

export type UpdateSnippetFragment = {
  __typename?: "UpdateClass";
  status: UpdateStatus;
  lastUpdatedAt?: any | null;
};

export type UserCardSnippetFragment = {
  __typename?: "UserClass";
  _id: string;
  name: string;
  email: string;
  role: UserRoles;
  admin: boolean;
  projectManager: boolean;
};

export type FullUserSnippetFragment = {
  __typename?: "UserClass";
  _id: string;
  name: string;
  email: string;
  role: UserRoles;
  admin: boolean;
  projectManager: boolean;
  employee: {
    __typename?: "EmployeeClass";
    _id: string;
    name: string;
    jobTitle?: string | null;
    crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
  };
  settings: { __typename?: "UserSettings"; homeView: UserHomeViewSettings };
};

export type VehicleWorkCardSnippetFragment = {
  __typename?: "VehicleWorkClass";
  _id: string;
  hours: number;
  jobTitle?: string | null;
  vehicle?: { __typename?: "VehicleClass"; _id: string; name: string } | null;
};

export type VehicleCardSnippetFragment = {
  __typename?: "VehicleClass";
  _id: string;
  name: string;
  vehicleCode: string;
  vehicleType: string;
  rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
};

export type VehicleFullSnippetFragment = {
  __typename?: "VehicleClass";
  currentRate: number;
  _id: string;
  name: string;
  vehicleCode: string;
  vehicleType: string;
  crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
  rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
};

export type VehicleSsrSnippetFragment = {
  __typename?: "VehicleClass";
  _id: string;
  name: string;
  vehicleCode: string;
  vehicleType: string;
};

export type VehicleSearchSnippetFragment = {
  __typename?: "VehicleClass";
  _id: string;
  name: string;
  vehicleCode: string;
  vehicleType: string;
};

export type CompanyCreateMutationVariables = Exact<{
  data: CompanyCreateData;
}>;

export type CompanyCreateMutation = {
  __typename?: "Mutation";
  companyCreate: { __typename?: "CompanyClass"; _id: string; name: string };
};

export type CrewAddEmployeeMutationVariables = Exact<{
  crewId: Scalars["String"];
  employeeId: Scalars["String"];
}>;

export type CrewAddEmployeeMutation = {
  __typename?: "Mutation";
  crewAddEmployee: {
    __typename?: "CrewClass";
    _id: string;
    name: string;
    type: CrewTypes;
    employees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    vehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
  };
};

export type CrewAddVehicleMutationVariables = Exact<{
  crewId: Scalars["String"];
  vehicleId: Scalars["String"];
}>;

export type CrewAddVehicleMutation = {
  __typename?: "Mutation";
  crewAddVehicle: {
    __typename?: "CrewClass";
    _id: string;
    name: string;
    type: CrewTypes;
    employees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    vehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
  };
};

export type CrewArchiveMutationVariables = Exact<{
  id: Scalars["ID"];
}>;

export type CrewArchiveMutation = {
  __typename?: "Mutation";
  crewArchive: { __typename?: "CrewClass"; _id: string };
};

export type CrewCreateMutationVariables = Exact<{
  data: CrewCreateData;
}>;

export type CrewCreateMutation = {
  __typename?: "Mutation";
  crewCreate: {
    __typename?: "CrewClass";
    _id: string;
    name: string;
    type: CrewTypes;
    employees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    vehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
  };
};

export type CrewRemoveEmployeeMutationVariables = Exact<{
  crewId: Scalars["String"];
  employeeId: Scalars["String"];
}>;

export type CrewRemoveEmployeeMutation = {
  __typename?: "Mutation";
  crewRemoveEmployee: {
    __typename?: "CrewClass";
    _id: string;
    name: string;
    type: CrewTypes;
    employees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    vehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
  };
};

export type CrewRemoveVehicleMutationVariables = Exact<{
  crewId: Scalars["String"];
  vehicleId: Scalars["String"];
}>;

export type CrewRemoveVehicleMutation = {
  __typename?: "Mutation";
  crewRemoveVehicle: {
    __typename?: "CrewClass";
    _id: string;
    name: string;
    type: CrewTypes;
    employees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    vehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
  };
};

export type CrewUpdateMutationVariables = Exact<{
  id: Scalars["ID"];
  data: CrewUpdateData;
}>;

export type CrewUpdateMutation = {
  __typename?: "Mutation";
  crewUpdate: {
    __typename?: "CrewClass";
    _id: string;
    name: string;
    type: CrewTypes;
    employees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    vehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
  };
};

export type DailyReportAddNoteFileMutationVariables = Exact<{
  dailyReportId: Scalars["String"];
  data: FileCreateData;
}>;

export type DailyReportAddNoteFileMutation = {
  __typename?: "Mutation";
  dailyReportAddNoteFile: {
    __typename?: "DailyReportClass";
    _id: string;
    date: any;
    jobCostApproved: boolean;
    payrollComplete: boolean;
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      materials: Array<{
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      }>;
      truckingRates: Array<{
        __typename?: "TruckingTypeRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "TruckingRateClass";
          rate: number;
          date: any;
          type: TruckingRateTypes;
        }>;
      }>;
    };
    crew: {
      __typename?: "CrewClass";
      _id: string;
      name: string;
      type: CrewTypes;
      employees: Array<{
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      vehicles: Array<{
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
    };
    employeeWork: Array<{
      __typename?: "EmployeeWorkClass";
      _id: string;
      jobTitle: string;
      startTime: any;
      endTime: any;
      employee: { __typename?: "EmployeeClass"; _id: string; name: string };
    }>;
    vehicleWork: Array<{
      __typename?: "VehicleWorkClass";
      _id: string;
      hours: number;
      jobTitle?: string | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
      } | null;
    }>;
    productions: Array<{
      __typename?: "ProductionClass";
      _id: string;
      jobTitle: string;
      quantity: number;
      unit: string;
      startTime: any;
      endTime: any;
      description?: string | null;
    }>;
    materialShipments: Array<{
      __typename?: "MaterialShipmentClass";
      _id: string;
      shipmentType?: string | null;
      supplier?: string | null;
      quantity: number;
      unit?: string | null;
      startTime?: any | null;
      endTime?: any | null;
      noJobsiteMaterial?: boolean | null;
      schemaVersion: number;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
      vehicleObject?: {
        __typename?: "VehicleObjectClass";
        source?: string | null;
        vehicleType?: string | null;
        vehicleCode?: string | null;
        truckingRateId?: string | null;
        deliveredRateId?: string | null;
      } | null;
    }>;
    reportNote?: {
      __typename?: "ReportNoteClass";
      _id: string;
      note: string;
      files: Array<{
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      }>;
    } | null;
    temporaryEmployees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    temporaryVehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
  };
};

export type DailyReportAddTemporaryEmployeeMutationVariables = Exact<{
  id: Scalars["String"];
  employeeId: Scalars["String"];
}>;

export type DailyReportAddTemporaryEmployeeMutation = {
  __typename?: "Mutation";
  dailyReportAddTemporaryEmployee: {
    __typename?: "DailyReportClass";
    _id: string;
    date: any;
    jobCostApproved: boolean;
    payrollComplete: boolean;
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      materials: Array<{
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      }>;
      truckingRates: Array<{
        __typename?: "TruckingTypeRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "TruckingRateClass";
          rate: number;
          date: any;
          type: TruckingRateTypes;
        }>;
      }>;
    };
    crew: {
      __typename?: "CrewClass";
      _id: string;
      name: string;
      type: CrewTypes;
      employees: Array<{
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      vehicles: Array<{
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
    };
    employeeWork: Array<{
      __typename?: "EmployeeWorkClass";
      _id: string;
      jobTitle: string;
      startTime: any;
      endTime: any;
      employee: { __typename?: "EmployeeClass"; _id: string; name: string };
    }>;
    vehicleWork: Array<{
      __typename?: "VehicleWorkClass";
      _id: string;
      hours: number;
      jobTitle?: string | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
      } | null;
    }>;
    productions: Array<{
      __typename?: "ProductionClass";
      _id: string;
      jobTitle: string;
      quantity: number;
      unit: string;
      startTime: any;
      endTime: any;
      description?: string | null;
    }>;
    materialShipments: Array<{
      __typename?: "MaterialShipmentClass";
      _id: string;
      shipmentType?: string | null;
      supplier?: string | null;
      quantity: number;
      unit?: string | null;
      startTime?: any | null;
      endTime?: any | null;
      noJobsiteMaterial?: boolean | null;
      schemaVersion: number;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
      vehicleObject?: {
        __typename?: "VehicleObjectClass";
        source?: string | null;
        vehicleType?: string | null;
        vehicleCode?: string | null;
        truckingRateId?: string | null;
        deliveredRateId?: string | null;
      } | null;
    }>;
    reportNote?: {
      __typename?: "ReportNoteClass";
      _id: string;
      note: string;
      files: Array<{
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      }>;
    } | null;
    temporaryEmployees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    temporaryVehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
  };
};

export type DailyReportAddTemporaryVehicleMutationVariables = Exact<{
  id: Scalars["String"];
  vehicleId: Scalars["String"];
}>;

export type DailyReportAddTemporaryVehicleMutation = {
  __typename?: "Mutation";
  dailyReportAddTemporaryVehicle: {
    __typename?: "DailyReportClass";
    _id: string;
    date: any;
    jobCostApproved: boolean;
    payrollComplete: boolean;
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      materials: Array<{
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      }>;
      truckingRates: Array<{
        __typename?: "TruckingTypeRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "TruckingRateClass";
          rate: number;
          date: any;
          type: TruckingRateTypes;
        }>;
      }>;
    };
    crew: {
      __typename?: "CrewClass";
      _id: string;
      name: string;
      type: CrewTypes;
      employees: Array<{
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      vehicles: Array<{
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
    };
    employeeWork: Array<{
      __typename?: "EmployeeWorkClass";
      _id: string;
      jobTitle: string;
      startTime: any;
      endTime: any;
      employee: { __typename?: "EmployeeClass"; _id: string; name: string };
    }>;
    vehicleWork: Array<{
      __typename?: "VehicleWorkClass";
      _id: string;
      hours: number;
      jobTitle?: string | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
      } | null;
    }>;
    productions: Array<{
      __typename?: "ProductionClass";
      _id: string;
      jobTitle: string;
      quantity: number;
      unit: string;
      startTime: any;
      endTime: any;
      description?: string | null;
    }>;
    materialShipments: Array<{
      __typename?: "MaterialShipmentClass";
      _id: string;
      shipmentType?: string | null;
      supplier?: string | null;
      quantity: number;
      unit?: string | null;
      startTime?: any | null;
      endTime?: any | null;
      noJobsiteMaterial?: boolean | null;
      schemaVersion: number;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
      vehicleObject?: {
        __typename?: "VehicleObjectClass";
        source?: string | null;
        vehicleType?: string | null;
        vehicleCode?: string | null;
        truckingRateId?: string | null;
        deliveredRateId?: string | null;
      } | null;
    }>;
    reportNote?: {
      __typename?: "ReportNoteClass";
      _id: string;
      note: string;
      files: Array<{
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      }>;
    } | null;
    temporaryEmployees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    temporaryVehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
  };
};

export type DailyReportArchiveMutationVariables = Exact<{
  id: Scalars["ID"];
}>;

export type DailyReportArchiveMutation = {
  __typename?: "Mutation";
  dailyReportArchive: { __typename?: "DailyReportClass"; _id: string };
};

export type DailyReportCreateMutationVariables = Exact<{
  data: DailyReportCreateData;
}>;

export type DailyReportCreateMutation = {
  __typename?: "Mutation";
  dailyReportCreate: {
    __typename?: "DailyReportClass";
    _id: string;
    date: any;
    jobCostApproved: boolean;
    payrollComplete: boolean;
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      materials: Array<{
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      }>;
      truckingRates: Array<{
        __typename?: "TruckingTypeRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "TruckingRateClass";
          rate: number;
          date: any;
          type: TruckingRateTypes;
        }>;
      }>;
    };
    crew: {
      __typename?: "CrewClass";
      _id: string;
      name: string;
      type: CrewTypes;
      employees: Array<{
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      vehicles: Array<{
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
    };
    employeeWork: Array<{
      __typename?: "EmployeeWorkClass";
      _id: string;
      jobTitle: string;
      startTime: any;
      endTime: any;
      employee: { __typename?: "EmployeeClass"; _id: string; name: string };
    }>;
    vehicleWork: Array<{
      __typename?: "VehicleWorkClass";
      _id: string;
      hours: number;
      jobTitle?: string | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
      } | null;
    }>;
    productions: Array<{
      __typename?: "ProductionClass";
      _id: string;
      jobTitle: string;
      quantity: number;
      unit: string;
      startTime: any;
      endTime: any;
      description?: string | null;
    }>;
    materialShipments: Array<{
      __typename?: "MaterialShipmentClass";
      _id: string;
      shipmentType?: string | null;
      supplier?: string | null;
      quantity: number;
      unit?: string | null;
      startTime?: any | null;
      endTime?: any | null;
      noJobsiteMaterial?: boolean | null;
      schemaVersion: number;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
      vehicleObject?: {
        __typename?: "VehicleObjectClass";
        source?: string | null;
        vehicleType?: string | null;
        vehicleCode?: string | null;
        truckingRateId?: string | null;
        deliveredRateId?: string | null;
      } | null;
    }>;
    reportNote?: {
      __typename?: "ReportNoteClass";
      _id: string;
      note: string;
      files: Array<{
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      }>;
    } | null;
    temporaryEmployees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    temporaryVehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
  };
};

export type DailyReportJobCostApprovalUpdateMutationVariables = Exact<{
  id: Scalars["String"];
  approved: Scalars["Boolean"];
}>;

export type DailyReportJobCostApprovalUpdateMutation = {
  __typename?: "Mutation";
  dailyReportJobCostApprovalUpdate: {
    __typename?: "DailyReportClass";
    _id: string;
    date: any;
    jobCostApproved: boolean;
    payrollComplete: boolean;
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      materials: Array<{
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      }>;
      truckingRates: Array<{
        __typename?: "TruckingTypeRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "TruckingRateClass";
          rate: number;
          date: any;
          type: TruckingRateTypes;
        }>;
      }>;
    };
    crew: {
      __typename?: "CrewClass";
      _id: string;
      name: string;
      type: CrewTypes;
      employees: Array<{
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      vehicles: Array<{
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
    };
    employeeWork: Array<{
      __typename?: "EmployeeWorkClass";
      _id: string;
      jobTitle: string;
      startTime: any;
      endTime: any;
      employee: { __typename?: "EmployeeClass"; _id: string; name: string };
    }>;
    vehicleWork: Array<{
      __typename?: "VehicleWorkClass";
      _id: string;
      hours: number;
      jobTitle?: string | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
      } | null;
    }>;
    productions: Array<{
      __typename?: "ProductionClass";
      _id: string;
      jobTitle: string;
      quantity: number;
      unit: string;
      startTime: any;
      endTime: any;
      description?: string | null;
    }>;
    materialShipments: Array<{
      __typename?: "MaterialShipmentClass";
      _id: string;
      shipmentType?: string | null;
      supplier?: string | null;
      quantity: number;
      unit?: string | null;
      startTime?: any | null;
      endTime?: any | null;
      noJobsiteMaterial?: boolean | null;
      schemaVersion: number;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
      vehicleObject?: {
        __typename?: "VehicleObjectClass";
        source?: string | null;
        vehicleType?: string | null;
        vehicleCode?: string | null;
        truckingRateId?: string | null;
        deliveredRateId?: string | null;
      } | null;
    }>;
    reportNote?: {
      __typename?: "ReportNoteClass";
      _id: string;
      note: string;
      files: Array<{
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      }>;
    } | null;
    temporaryEmployees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    temporaryVehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
  };
};

export type DailyReportNoteUpdateMutationVariables = Exact<{
  id: Scalars["String"];
  data: DailyReportNoteUpdateData;
}>;

export type DailyReportNoteUpdateMutation = {
  __typename?: "Mutation";
  dailyReportNoteUpdate: {
    __typename?: "DailyReportClass";
    _id: string;
    date: any;
    jobCostApproved: boolean;
    payrollComplete: boolean;
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      materials: Array<{
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      }>;
      truckingRates: Array<{
        __typename?: "TruckingTypeRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "TruckingRateClass";
          rate: number;
          date: any;
          type: TruckingRateTypes;
        }>;
      }>;
    };
    crew: {
      __typename?: "CrewClass";
      _id: string;
      name: string;
      type: CrewTypes;
      employees: Array<{
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      vehicles: Array<{
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
    };
    employeeWork: Array<{
      __typename?: "EmployeeWorkClass";
      _id: string;
      jobTitle: string;
      startTime: any;
      endTime: any;
      employee: { __typename?: "EmployeeClass"; _id: string; name: string };
    }>;
    vehicleWork: Array<{
      __typename?: "VehicleWorkClass";
      _id: string;
      hours: number;
      jobTitle?: string | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
      } | null;
    }>;
    productions: Array<{
      __typename?: "ProductionClass";
      _id: string;
      jobTitle: string;
      quantity: number;
      unit: string;
      startTime: any;
      endTime: any;
      description?: string | null;
    }>;
    materialShipments: Array<{
      __typename?: "MaterialShipmentClass";
      _id: string;
      shipmentType?: string | null;
      supplier?: string | null;
      quantity: number;
      unit?: string | null;
      startTime?: any | null;
      endTime?: any | null;
      noJobsiteMaterial?: boolean | null;
      schemaVersion: number;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
      vehicleObject?: {
        __typename?: "VehicleObjectClass";
        source?: string | null;
        vehicleType?: string | null;
        vehicleCode?: string | null;
        truckingRateId?: string | null;
        deliveredRateId?: string | null;
      } | null;
    }>;
    reportNote?: {
      __typename?: "ReportNoteClass";
      _id: string;
      note: string;
      files: Array<{
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      }>;
    } | null;
    temporaryEmployees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    temporaryVehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
  };
};

export type DailyReportPayrollCompleteUpdateMutationVariables = Exact<{
  id: Scalars["String"];
  complete: Scalars["Boolean"];
}>;

export type DailyReportPayrollCompleteUpdateMutation = {
  __typename?: "Mutation";
  dailyReportPayrollCompleteUpdate: {
    __typename?: "DailyReportClass";
    _id: string;
    date: any;
    jobCostApproved: boolean;
    payrollComplete: boolean;
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      materials: Array<{
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      }>;
      truckingRates: Array<{
        __typename?: "TruckingTypeRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "TruckingRateClass";
          rate: number;
          date: any;
          type: TruckingRateTypes;
        }>;
      }>;
    };
    crew: {
      __typename?: "CrewClass";
      _id: string;
      name: string;
      type: CrewTypes;
      employees: Array<{
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      vehicles: Array<{
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
    };
    employeeWork: Array<{
      __typename?: "EmployeeWorkClass";
      _id: string;
      jobTitle: string;
      startTime: any;
      endTime: any;
      employee: { __typename?: "EmployeeClass"; _id: string; name: string };
    }>;
    vehicleWork: Array<{
      __typename?: "VehicleWorkClass";
      _id: string;
      hours: number;
      jobTitle?: string | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
      } | null;
    }>;
    productions: Array<{
      __typename?: "ProductionClass";
      _id: string;
      jobTitle: string;
      quantity: number;
      unit: string;
      startTime: any;
      endTime: any;
      description?: string | null;
    }>;
    materialShipments: Array<{
      __typename?: "MaterialShipmentClass";
      _id: string;
      shipmentType?: string | null;
      supplier?: string | null;
      quantity: number;
      unit?: string | null;
      startTime?: any | null;
      endTime?: any | null;
      noJobsiteMaterial?: boolean | null;
      schemaVersion: number;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
      vehicleObject?: {
        __typename?: "VehicleObjectClass";
        source?: string | null;
        vehicleType?: string | null;
        vehicleCode?: string | null;
        truckingRateId?: string | null;
        deliveredRateId?: string | null;
      } | null;
    }>;
    reportNote?: {
      __typename?: "ReportNoteClass";
      _id: string;
      note: string;
      files: Array<{
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      }>;
    } | null;
    temporaryEmployees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    temporaryVehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
  };
};

export type DailyReportUpdateMutationVariables = Exact<{
  id: Scalars["String"];
  data: DailyReportUpdateData;
}>;

export type DailyReportUpdateMutation = {
  __typename?: "Mutation";
  dailyReportUpdate: {
    __typename?: "DailyReportClass";
    _id: string;
    date: any;
    jobCostApproved: boolean;
    payrollComplete: boolean;
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      materials: Array<{
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      }>;
      truckingRates: Array<{
        __typename?: "TruckingTypeRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "TruckingRateClass";
          rate: number;
          date: any;
          type: TruckingRateTypes;
        }>;
      }>;
    };
    crew: {
      __typename?: "CrewClass";
      _id: string;
      name: string;
      type: CrewTypes;
      employees: Array<{
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      vehicles: Array<{
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
    };
    employeeWork: Array<{
      __typename?: "EmployeeWorkClass";
      _id: string;
      jobTitle: string;
      startTime: any;
      endTime: any;
      employee: { __typename?: "EmployeeClass"; _id: string; name: string };
    }>;
    vehicleWork: Array<{
      __typename?: "VehicleWorkClass";
      _id: string;
      hours: number;
      jobTitle?: string | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
      } | null;
    }>;
    productions: Array<{
      __typename?: "ProductionClass";
      _id: string;
      jobTitle: string;
      quantity: number;
      unit: string;
      startTime: any;
      endTime: any;
      description?: string | null;
    }>;
    materialShipments: Array<{
      __typename?: "MaterialShipmentClass";
      _id: string;
      shipmentType?: string | null;
      supplier?: string | null;
      quantity: number;
      unit?: string | null;
      startTime?: any | null;
      endTime?: any | null;
      noJobsiteMaterial?: boolean | null;
      schemaVersion: number;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
      vehicleObject?: {
        __typename?: "VehicleObjectClass";
        source?: string | null;
        vehicleType?: string | null;
        vehicleCode?: string | null;
        truckingRateId?: string | null;
        deliveredRateId?: string | null;
      } | null;
    }>;
    reportNote?: {
      __typename?: "ReportNoteClass";
      _id: string;
      note: string;
      files: Array<{
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      }>;
    } | null;
    temporaryEmployees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    temporaryVehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
  };
};

export type EmployeeArchiveMutationVariables = Exact<{
  id: Scalars["ID"];
}>;

export type EmployeeArchiveMutation = {
  __typename?: "Mutation";
  employeeArchive: { __typename?: "EmployeeClass"; _id: string };
};

export type EmployeeCreateMutationVariables = Exact<{
  data: EmployeeCreateData;
  crewId?: InputMaybe<Scalars["String"]>;
}>;

export type EmployeeCreateMutation = {
  __typename?: "Mutation";
  employeeCreate: {
    __typename?: "EmployeeClass";
    _id: string;
    name: string;
    jobTitle?: string | null;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  };
};

export type EmployeeUpdateMutationVariables = Exact<{
  id: Scalars["ID"];
  data: EmployeeUpdateData;
}>;

export type EmployeeUpdateMutation = {
  __typename?: "Mutation";
  employeeUpdate: {
    __typename?: "EmployeeClass";
    _id: string;
    name: string;
    jobTitle?: string | null;
    user?: {
      __typename?: "UserClass";
      _id: string;
      name: string;
      email: string;
      role: UserRoles;
      admin: boolean;
      projectManager: boolean;
    } | null;
    crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
    signup?: { __typename?: "SignupClass"; _id: string } | null;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  };
};

export type EmployeeUpdateRatesMutationVariables = Exact<{
  id: Scalars["String"];
  data: Array<RatesData> | RatesData;
}>;

export type EmployeeUpdateRatesMutation = {
  __typename?: "Mutation";
  employeeUpdateRates: {
    __typename?: "EmployeeClass";
    _id: string;
    name: string;
    jobTitle?: string | null;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  };
};

export type EmployeeWorkCreateMutationVariables = Exact<{
  dailyReportId: Scalars["String"];
  data: Array<EmployeeWorkCreateData> | EmployeeWorkCreateData;
}>;

export type EmployeeWorkCreateMutation = {
  __typename?: "Mutation";
  employeeWorkCreate: Array<{
    __typename?: "EmployeeWorkClass";
    _id: string;
    jobTitle: string;
    startTime: any;
    endTime: any;
    employee: { __typename?: "EmployeeClass"; _id: string; name: string };
  }>;
};

export type EmployeeWorkDeleteMutationVariables = Exact<{
  id: Scalars["String"];
}>;

export type EmployeeWorkDeleteMutation = {
  __typename?: "Mutation";
  employeeWorkDelete: string;
};

export type EmployeeWorkUpdateMutationVariables = Exact<{
  id: Scalars["String"];
  data: EmployeeWorkUpdateData;
}>;

export type EmployeeWorkUpdateMutation = {
  __typename?: "Mutation";
  employeeWorkUpdate: {
    __typename?: "EmployeeWorkClass";
    _id: string;
    jobTitle: string;
    startTime: any;
    endTime: any;
    employee: { __typename?: "EmployeeClass"; _id: string; name: string };
  };
};

export type InvoiceRemoveMutationVariables = Exact<{
  id: Scalars["ID"];
}>;

export type InvoiceRemoveMutation = {
  __typename?: "Mutation";
  invoiceRemove: boolean;
};

export type InvoiceUpdateForJobsiteMutationVariables = Exact<{
  id: Scalars["String"];
  jobsiteId: Scalars["ID"];
  data: InvoiceData;
}>;

export type InvoiceUpdateForJobsiteMutation = {
  __typename?: "Mutation";
  invoiceUpdateForJobsite: {
    __typename?: "InvoiceClass";
    _id: string;
    date: any;
    invoiceNumber: string;
    cost: number;
    description?: string | null;
    internal: boolean;
    accrual: boolean;
    company: { __typename?: "CompanyClass"; _id: string; name: string };
  };
};

export type InvoiceUpdateForJobsiteMaterialMutationVariables = Exact<{
  id: Scalars["String"];
  jobsiteMaterialId: Scalars["ID"];
  data: InvoiceData;
}>;

export type InvoiceUpdateForJobsiteMaterialMutation = {
  __typename?: "Mutation";
  invoiceUpdateForJobsiteMaterial: {
    __typename?: "InvoiceClass";
    _id: string;
    date: any;
    invoiceNumber: string;
    cost: number;
    description?: string | null;
    internal: boolean;
    accrual: boolean;
    company: { __typename?: "CompanyClass"; _id: string; name: string };
  };
};

export type JobsiteAddDefaultTruckingRateToAllMutationVariables = Exact<{
  itemIndex: Scalars["Int"];
  rateIndex: Scalars["Int"];
}>;

export type JobsiteAddDefaultTruckingRateToAllMutation = {
  __typename?: "Mutation";
  jobsiteAddDefaultTruckingRateToAll: Array<{
    __typename?: "JobsiteClass";
    _id: string;
  }>;
};

export type JobsiteAddExpenseInvoiceMutationVariables = Exact<{
  jobsiteId: Scalars["String"];
  data: InvoiceData;
}>;

export type JobsiteAddExpenseInvoiceMutation = {
  __typename?: "Mutation";
  jobsiteAddExpenseInvoice: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
    description?: string | null;
    location_url?: string | null;
    active: boolean;
    crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
    monthReports: Array<{
      __typename?: "JobsiteMonthReportClass";
      _id: string;
      startOfMonth: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    yearReports: Array<{
      __typename?: "JobsiteYearReportClass";
      _id: string;
      startOfYear: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    dailyReports: Array<{
      __typename?: "DailyReportClass";
      _id: string;
      date: any;
      jobCostApproved: boolean;
      payrollComplete: boolean;
      jobsite: { __typename?: "JobsiteClass"; _id: string; name: string };
      crew: { __typename?: "CrewClass"; _id: string; name: string };
    }>;
    expenseInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    revenueInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    truckingRates: Array<{
      __typename?: "TruckingTypeRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "TruckingRateClass";
        rate: number;
        date: any;
        type: TruckingRateTypes;
      }>;
    }>;
    fileObjects: Array<{
      __typename?: "JobsiteFileObjectClass";
      _id?: string | null;
      minRole: UserRoles;
      file: {
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      };
    }>;
  };
};

export type JobsiteAddFileObjectMutationVariables = Exact<{
  id: Scalars["ID"];
  data: JobsiteFileObjectData;
}>;

export type JobsiteAddFileObjectMutation = {
  __typename?: "Mutation";
  jobsiteAddFileObject: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
    description?: string | null;
    location_url?: string | null;
    active: boolean;
    crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
    monthReports: Array<{
      __typename?: "JobsiteMonthReportClass";
      _id: string;
      startOfMonth: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    yearReports: Array<{
      __typename?: "JobsiteYearReportClass";
      _id: string;
      startOfYear: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    dailyReports: Array<{
      __typename?: "DailyReportClass";
      _id: string;
      date: any;
      jobCostApproved: boolean;
      payrollComplete: boolean;
      jobsite: { __typename?: "JobsiteClass"; _id: string; name: string };
      crew: { __typename?: "CrewClass"; _id: string; name: string };
    }>;
    expenseInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    revenueInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    truckingRates: Array<{
      __typename?: "TruckingTypeRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "TruckingRateClass";
        rate: number;
        date: any;
        type: TruckingRateTypes;
      }>;
    }>;
    fileObjects: Array<{
      __typename?: "JobsiteFileObjectClass";
      _id?: string | null;
      minRole: UserRoles;
      file: {
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      };
    }>;
  };
};

export type JobsiteAddMaterialMutationVariables = Exact<{
  jobsiteId: Scalars["String"];
  data: JobsiteMaterialCreateData;
}>;

export type JobsiteAddMaterialMutation = {
  __typename?: "Mutation";
  jobsiteAddMaterial: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
    description?: string | null;
    location_url?: string | null;
    active: boolean;
    crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
    monthReports: Array<{
      __typename?: "JobsiteMonthReportClass";
      _id: string;
      startOfMonth: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    yearReports: Array<{
      __typename?: "JobsiteYearReportClass";
      _id: string;
      startOfYear: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    dailyReports: Array<{
      __typename?: "DailyReportClass";
      _id: string;
      date: any;
      jobCostApproved: boolean;
      payrollComplete: boolean;
      jobsite: { __typename?: "JobsiteClass"; _id: string; name: string };
      crew: { __typename?: "CrewClass"; _id: string; name: string };
    }>;
    expenseInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    revenueInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    truckingRates: Array<{
      __typename?: "TruckingTypeRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "TruckingRateClass";
        rate: number;
        date: any;
        type: TruckingRateTypes;
      }>;
    }>;
    fileObjects: Array<{
      __typename?: "JobsiteFileObjectClass";
      _id?: string | null;
      minRole: UserRoles;
      file: {
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      };
    }>;
  };
};

export type JobsiteAddRevenueInvoiceMutationVariables = Exact<{
  jobsiteId: Scalars["String"];
  data: InvoiceData;
}>;

export type JobsiteAddRevenueInvoiceMutation = {
  __typename?: "Mutation";
  jobsiteAddRevenueInvoice: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
    description?: string | null;
    location_url?: string | null;
    active: boolean;
    crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
    monthReports: Array<{
      __typename?: "JobsiteMonthReportClass";
      _id: string;
      startOfMonth: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    yearReports: Array<{
      __typename?: "JobsiteYearReportClass";
      _id: string;
      startOfYear: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    dailyReports: Array<{
      __typename?: "DailyReportClass";
      _id: string;
      date: any;
      jobCostApproved: boolean;
      payrollComplete: boolean;
      jobsite: { __typename?: "JobsiteClass"; _id: string; name: string };
      crew: { __typename?: "CrewClass"; _id: string; name: string };
    }>;
    expenseInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    revenueInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    truckingRates: Array<{
      __typename?: "TruckingTypeRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "TruckingRateClass";
        rate: number;
        date: any;
        type: TruckingRateTypes;
      }>;
    }>;
    fileObjects: Array<{
      __typename?: "JobsiteFileObjectClass";
      _id?: string | null;
      minRole: UserRoles;
      file: {
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      };
    }>;
  };
};

export type JobsiteCreateMutationVariables = Exact<{
  data: JobsiteCreateData;
}>;

export type JobsiteCreateMutation = {
  __typename?: "Mutation";
  jobsiteCreate: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
    description?: string | null;
    location_url?: string | null;
    active: boolean;
    crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
    monthReports: Array<{
      __typename?: "JobsiteMonthReportClass";
      _id: string;
      startOfMonth: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    yearReports: Array<{
      __typename?: "JobsiteYearReportClass";
      _id: string;
      startOfYear: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    dailyReports: Array<{
      __typename?: "DailyReportClass";
      _id: string;
      date: any;
      jobCostApproved: boolean;
      payrollComplete: boolean;
      jobsite: { __typename?: "JobsiteClass"; _id: string; name: string };
      crew: { __typename?: "CrewClass"; _id: string; name: string };
    }>;
    expenseInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    revenueInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    truckingRates: Array<{
      __typename?: "TruckingTypeRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "TruckingRateClass";
        rate: number;
        date: any;
        type: TruckingRateTypes;
      }>;
    }>;
    fileObjects: Array<{
      __typename?: "JobsiteFileObjectClass";
      _id?: string | null;
      minRole: UserRoles;
      file: {
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      };
    }>;
  };
};

export type JobsiteMaterialAddInvoiceMutationVariables = Exact<{
  id: Scalars["ID"];
  data: InvoiceData;
}>;

export type JobsiteMaterialAddInvoiceMutation = {
  __typename?: "Mutation";
  jobsiteMaterialAddInvoice: {
    __typename?: "JobsiteMaterialClass";
    _id: string;
    quantity: number;
    completedQuantity: number;
    unit: string;
    costType: JobsiteMaterialCostType;
    delivered?: boolean | null;
    canRemove: boolean;
    material: { __typename?: "MaterialClass"; _id: string; name: string };
    supplier: { __typename?: "CompanyClass"; _id: string; name: string };
    rates: Array<{
      __typename?: "JobsiteMaterialRateClass";
      _id?: string | null;
      rate: number;
      date: any;
      estimated?: boolean | null;
    }>;
    deliveredRates: Array<{
      __typename?: "JobsiteMaterialDeliveredRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
    }>;
    invoices?: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }> | null;
  };
};

export type JobsiteMaterialRemoveMutationVariables = Exact<{
  id: Scalars["ID"];
}>;

export type JobsiteMaterialRemoveMutation = {
  __typename?: "Mutation";
  jobsiteMaterialRemove: boolean;
};

export type JobsiteMaterialUpdateMutationVariables = Exact<{
  id: Scalars["String"];
  data: JobsiteMaterialUpdateData;
}>;

export type JobsiteMaterialUpdateMutation = {
  __typename?: "Mutation";
  jobsiteMaterialUpdate: {
    __typename?: "JobsiteMaterialClass";
    _id: string;
    quantity: number;
    completedQuantity: number;
    unit: string;
    costType: JobsiteMaterialCostType;
    delivered?: boolean | null;
    canRemove: boolean;
    material: { __typename?: "MaterialClass"; _id: string; name: string };
    supplier: { __typename?: "CompanyClass"; _id: string; name: string };
    rates: Array<{
      __typename?: "JobsiteMaterialRateClass";
      _id?: string | null;
      rate: number;
      date: any;
      estimated?: boolean | null;
    }>;
    deliveredRates: Array<{
      __typename?: "JobsiteMaterialDeliveredRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
    }>;
    invoices?: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }> | null;
  };
};

export type JobsiteRemoveFileObjectMutationVariables = Exact<{
  id: Scalars["ID"];
  fileObjectId: Scalars["ID"];
}>;

export type JobsiteRemoveFileObjectMutation = {
  __typename?: "Mutation";
  jobsiteRemoveFileObject: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
    description?: string | null;
    location_url?: string | null;
    active: boolean;
    crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
    monthReports: Array<{
      __typename?: "JobsiteMonthReportClass";
      _id: string;
      startOfMonth: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    yearReports: Array<{
      __typename?: "JobsiteYearReportClass";
      _id: string;
      startOfYear: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    dailyReports: Array<{
      __typename?: "DailyReportClass";
      _id: string;
      date: any;
      jobCostApproved: boolean;
      payrollComplete: boolean;
      jobsite: { __typename?: "JobsiteClass"; _id: string; name: string };
      crew: { __typename?: "CrewClass"; _id: string; name: string };
    }>;
    expenseInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    revenueInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    truckingRates: Array<{
      __typename?: "TruckingTypeRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "TruckingRateClass";
        rate: number;
        date: any;
        type: TruckingRateTypes;
      }>;
    }>;
    fileObjects: Array<{
      __typename?: "JobsiteFileObjectClass";
      _id?: string | null;
      minRole: UserRoles;
      file: {
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      };
    }>;
  };
};

export type JobsiteRequestReportGenerationMutationVariables = Exact<{
  id: Scalars["ID"];
}>;

export type JobsiteRequestReportGenerationMutation = {
  __typename?: "Mutation";
  jobsiteRequestReportGeneration: { __typename?: "JobsiteClass"; _id: string };
};

export type JobsiteSetAllEmptyTruckingRatesMutationVariables = Exact<{
  [key: string]: never;
}>;

export type JobsiteSetAllEmptyTruckingRatesMutation = {
  __typename?: "Mutation";
  jobsiteSetAllEmptyTruckingRates: Array<{
    __typename?: "JobsiteClass";
    _id: string;
  }>;
};

export type JobsiteSetTruckingRatesMutationVariables = Exact<{
  id: Scalars["String"];
  data: Array<TruckingTypeRateData> | TruckingTypeRateData;
}>;

export type JobsiteSetTruckingRatesMutation = {
  __typename?: "Mutation";
  jobsiteSetTruckingRates: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
    description?: string | null;
    location_url?: string | null;
    active: boolean;
    crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
    monthReports: Array<{
      __typename?: "JobsiteMonthReportClass";
      _id: string;
      startOfMonth: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    yearReports: Array<{
      __typename?: "JobsiteYearReportClass";
      _id: string;
      startOfYear: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    dailyReports: Array<{
      __typename?: "DailyReportClass";
      _id: string;
      date: any;
      jobCostApproved: boolean;
      payrollComplete: boolean;
      jobsite: { __typename?: "JobsiteClass"; _id: string; name: string };
      crew: { __typename?: "CrewClass"; _id: string; name: string };
    }>;
    expenseInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    revenueInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    truckingRates: Array<{
      __typename?: "TruckingTypeRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "TruckingRateClass";
        rate: number;
        date: any;
        type: TruckingRateTypes;
      }>;
    }>;
    fileObjects: Array<{
      __typename?: "JobsiteFileObjectClass";
      _id?: string | null;
      minRole: UserRoles;
      file: {
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      };
    }>;
  };
};

export type JobsiteUpdateMutationVariables = Exact<{
  id: Scalars["ID"];
  data: JobsiteUpdateData;
}>;

export type JobsiteUpdateMutation = {
  __typename?: "Mutation";
  jobsiteUpdate: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
  };
};

export type LoginMutationVariables = Exact<{
  data: LoginData;
}>;

export type LoginMutation = { __typename?: "Mutation"; login: string };

export type MaterialCreateMutationVariables = Exact<{
  data: MaterialCreateData;
}>;

export type MaterialCreateMutation = {
  __typename?: "Mutation";
  materialCreate: {
    __typename?: "MaterialClass";
    canRemove: boolean;
    _id: string;
    name: string;
  };
};

export type MaterialRemoveMutationVariables = Exact<{
  id: Scalars["ID"];
}>;

export type MaterialRemoveMutation = {
  __typename?: "Mutation";
  materialRemove: boolean;
};

export type MaterialShipmentCreateMutationVariables = Exact<{
  dailyReportId: Scalars["String"];
  data: Array<MaterialShipmentCreateData> | MaterialShipmentCreateData;
}>;

export type MaterialShipmentCreateMutation = {
  __typename?: "Mutation";
  materialShipmentCreate: Array<{
    __typename?: "MaterialShipmentClass";
    _id: string;
    shipmentType?: string | null;
    supplier?: string | null;
    quantity: number;
    unit?: string | null;
    startTime?: any | null;
    endTime?: any | null;
    noJobsiteMaterial?: boolean | null;
    schemaVersion: number;
    jobsiteMaterial?: {
      __typename?: "JobsiteMaterialClass";
      _id: string;
      quantity: number;
      completedQuantity: number;
      unit: string;
      costType: JobsiteMaterialCostType;
      delivered?: boolean | null;
      canRemove: boolean;
      material: { __typename?: "MaterialClass"; _id: string; name: string };
      supplier: { __typename?: "CompanyClass"; _id: string; name: string };
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
      deliveredRates: Array<{
        __typename?: "JobsiteMaterialDeliveredRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
      }>;
      invoices?: Array<{
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      }> | null;
    } | null;
    vehicleObject?: {
      __typename?: "VehicleObjectClass";
      source?: string | null;
      vehicleType?: string | null;
      vehicleCode?: string | null;
      truckingRateId?: string | null;
      deliveredRateId?: string | null;
    } | null;
  }>;
};

export type MaterialShipmentDeleteMutationVariables = Exact<{
  id: Scalars["String"];
}>;

export type MaterialShipmentDeleteMutation = {
  __typename?: "Mutation";
  materialShipmentDelete: string;
};

export type MaterialShipmentUpdateMutationVariables = Exact<{
  id: Scalars["String"];
  data: MaterialShipmentUpdateData;
}>;

export type MaterialShipmentUpdateMutation = {
  __typename?: "Mutation";
  materialShipmentUpdate: {
    __typename?: "MaterialShipmentClass";
    _id: string;
    shipmentType?: string | null;
    supplier?: string | null;
    quantity: number;
    unit?: string | null;
    startTime?: any | null;
    endTime?: any | null;
    noJobsiteMaterial?: boolean | null;
    schemaVersion: number;
    jobsiteMaterial?: {
      __typename?: "JobsiteMaterialClass";
      _id: string;
      quantity: number;
      completedQuantity: number;
      unit: string;
      costType: JobsiteMaterialCostType;
      delivered?: boolean | null;
      canRemove: boolean;
      material: { __typename?: "MaterialClass"; _id: string; name: string };
      supplier: { __typename?: "CompanyClass"; _id: string; name: string };
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
      deliveredRates: Array<{
        __typename?: "JobsiteMaterialDeliveredRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
      }>;
      invoices?: Array<{
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      }> | null;
    } | null;
    vehicleObject?: {
      __typename?: "VehicleObjectClass";
      source?: string | null;
      vehicleType?: string | null;
      vehicleCode?: string | null;
      truckingRateId?: string | null;
      deliveredRateId?: string | null;
    } | null;
  };
};

export type MaterialUpdateMutationVariables = Exact<{
  id: Scalars["ID"];
  data: MaterialUpdateData;
}>;

export type MaterialUpdateMutation = {
  __typename?: "Mutation";
  materialUpdate: {
    __typename?: "MaterialClass";
    canRemove: boolean;
    _id: string;
    name: string;
  };
};

export type ProductionCreateMutationVariables = Exact<{
  dailyReportId: Scalars["String"];
  data: ProductionCreateData;
}>;

export type ProductionCreateMutation = {
  __typename?: "Mutation";
  productionCreate: {
    __typename?: "ProductionClass";
    _id: string;
    jobTitle: string;
    quantity: number;
    unit: string;
    startTime: any;
    endTime: any;
    description?: string | null;
  };
};

export type ProductionDeleteMutationVariables = Exact<{
  id: Scalars["String"];
}>;

export type ProductionDeleteMutation = {
  __typename?: "Mutation";
  productionDelete: string;
};

export type ProductionUpdateMutationVariables = Exact<{
  id: Scalars["String"];
  data: ProductionUpdateData;
}>;

export type ProductionUpdateMutation = {
  __typename?: "Mutation";
  productionUpdate: {
    __typename?: "ProductionClass";
    _id: string;
    jobTitle: string;
    quantity: number;
    unit: string;
    startTime: any;
    endTime: any;
    description?: string | null;
  };
};

export type ReportNoteRemoveFileMutationVariables = Exact<{
  reportNoteId: Scalars["String"];
  fileId: Scalars["String"];
}>;

export type ReportNoteRemoveFileMutation = {
  __typename?: "Mutation";
  reportNoteRemoveFile: {
    __typename?: "ReportNoteClass";
    _id: string;
    note: string;
    files: Array<{
      __typename?: "FileClass";
      _id: string;
      mimetype: string;
      description?: string | null;
    }>;
  };
};

export type SignupMutationVariables = Exact<{
  signupId: Scalars["String"];
  data: SignupData;
}>;

export type SignupMutation = { __typename?: "Mutation"; signup: string };

export type SignupCreateMutationVariables = Exact<{
  employeeId: Scalars["String"];
}>;

export type SignupCreateMutation = {
  __typename?: "Mutation";
  signupCreate: { __typename?: "SignupClass"; _id: string };
};

export type SystemUpdateCompanyVehicleTypeDefaultsMutationVariables = Exact<{
  data: Array<DefaultRateData> | DefaultRateData;
}>;

export type SystemUpdateCompanyVehicleTypeDefaultsMutation = {
  __typename?: "Mutation";
  systemUpdateCompanyVehicleTypeDefaults: {
    __typename?: "SystemClass";
    unitDefaults: Array<string>;
    laborTypes: Array<string>;
    internalExpenseOverheadRate: number;
    companyVehicleTypeDefaults: Array<{
      __typename?: "DefaultRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
    }>;
    materialShipmentVehicleTypeDefaults: Array<{
      __typename?: "DefaultRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
    }>;
  };
};

export type SystemUpdateInternalExpenseOverheadRateMutationVariables = Exact<{
  value: Scalars["Float"];
}>;

export type SystemUpdateInternalExpenseOverheadRateMutation = {
  __typename?: "Mutation";
  systemUpdateInternalExpenseOverheadRate: {
    __typename?: "SystemClass";
    unitDefaults: Array<string>;
    laborTypes: Array<string>;
    internalExpenseOverheadRate: number;
    companyVehicleTypeDefaults: Array<{
      __typename?: "DefaultRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
    }>;
    materialShipmentVehicleTypeDefaults: Array<{
      __typename?: "DefaultRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
    }>;
  };
};

export type SystemUpdateLaborTypesMutationVariables = Exact<{
  data: Array<Scalars["String"]> | Scalars["String"];
}>;

export type SystemUpdateLaborTypesMutation = {
  __typename?: "Mutation";
  systemUpdateLaborTypes: {
    __typename?: "SystemClass";
    unitDefaults: Array<string>;
    laborTypes: Array<string>;
    internalExpenseOverheadRate: number;
    companyVehicleTypeDefaults: Array<{
      __typename?: "DefaultRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
    }>;
    materialShipmentVehicleTypeDefaults: Array<{
      __typename?: "DefaultRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
    }>;
  };
};

export type SystemUpdateMaterialShipmentVehicleTypeDefaultsMutationVariables =
  Exact<{
    data: Array<DefaultRateData> | DefaultRateData;
  }>;

export type SystemUpdateMaterialShipmentVehicleTypeDefaultsMutation = {
  __typename?: "Mutation";
  systemUpdateMaterialShipmentVehicleTypeDefaults: {
    __typename?: "SystemClass";
    unitDefaults: Array<string>;
    laborTypes: Array<string>;
    internalExpenseOverheadRate: number;
    companyVehicleTypeDefaults: Array<{
      __typename?: "DefaultRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
    }>;
    materialShipmentVehicleTypeDefaults: Array<{
      __typename?: "DefaultRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
    }>;
  };
};

export type SystemUpdateUnitDefaultsMutationVariables = Exact<{
  data: Array<Scalars["String"]> | Scalars["String"];
}>;

export type SystemUpdateUnitDefaultsMutation = {
  __typename?: "Mutation";
  systemUpdateUnitDefaults: {
    __typename?: "SystemClass";
    unitDefaults: Array<string>;
    laborTypes: Array<string>;
    internalExpenseOverheadRate: number;
    companyVehicleTypeDefaults: Array<{
      __typename?: "DefaultRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
    }>;
    materialShipmentVehicleTypeDefaults: Array<{
      __typename?: "DefaultRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
    }>;
  };
};

export type UserPasswordResetMutationVariables = Exact<{
  password: Scalars["String"];
  token: Scalars["String"];
}>;

export type UserPasswordResetMutation = {
  __typename?: "Mutation";
  userPasswordReset: boolean;
};

export type UserPasswordResetRequestMutationVariables = Exact<{
  email: Scalars["String"];
}>;

export type UserPasswordResetRequestMutation = {
  __typename?: "Mutation";
  userPasswordResetRequest: boolean;
};

export type UserUpdateHomeViewMutationVariables = Exact<{
  homeView: UserHomeViewSettings;
}>;

export type UserUpdateHomeViewMutation = {
  __typename?: "Mutation";
  userUpdateHomeView: { __typename?: "UserClass"; _id: string };
};

export type UserUpdateRoleMutationVariables = Exact<{
  id: Scalars["String"];
  role: UserRoles;
}>;

export type UserUpdateRoleMutation = {
  __typename?: "Mutation";
  userUpdateRole: {
    __typename?: "UserClass";
    _id: string;
    name: string;
    email: string;
    role: UserRoles;
    admin: boolean;
    projectManager: boolean;
  };
};

export type VehicleArchiveMutationVariables = Exact<{
  id: Scalars["ID"];
}>;

export type VehicleArchiveMutation = {
  __typename?: "Mutation";
  vehicleArchive: { __typename?: "VehicleClass"; _id: string };
};

export type VehicleCreateMutationVariables = Exact<{
  data: VehicleCreateData;
  crewId?: InputMaybe<Scalars["String"]>;
}>;

export type VehicleCreateMutation = {
  __typename?: "Mutation";
  vehicleCreate: {
    __typename?: "VehicleClass";
    _id: string;
    name: string;
    vehicleCode: string;
    vehicleType: string;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  };
};

export type VehicleUpdateMutationVariables = Exact<{
  id: Scalars["ID"];
  data: VehicleUpdateData;
}>;

export type VehicleUpdateMutation = {
  __typename?: "Mutation";
  vehicleUpdate: {
    __typename?: "VehicleClass";
    currentRate: number;
    _id: string;
    name: string;
    vehicleCode: string;
    vehicleType: string;
    crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  };
};

export type VehicleUpdateRatesMutationVariables = Exact<{
  id: Scalars["String"];
  data: Array<RatesData> | RatesData;
}>;

export type VehicleUpdateRatesMutation = {
  __typename?: "Mutation";
  vehicleUpdateRates: {
    __typename?: "VehicleClass";
    _id: string;
    name: string;
    vehicleCode: string;
    vehicleType: string;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  };
};

export type VehicleWorkCreateMutationVariables = Exact<{
  dailyReportId: Scalars["String"];
  data: Array<VehicleWorkCreateData> | VehicleWorkCreateData;
}>;

export type VehicleWorkCreateMutation = {
  __typename?: "Mutation";
  vehicleWorkCreate: Array<{
    __typename?: "VehicleWorkClass";
    _id: string;
    hours: number;
    jobTitle?: string | null;
    vehicle?: { __typename?: "VehicleClass"; _id: string; name: string } | null;
  }>;
};

export type VehicleWorkDeleteMutationVariables = Exact<{
  id: Scalars["String"];
}>;

export type VehicleWorkDeleteMutation = {
  __typename?: "Mutation";
  vehicleWorkDelete: string;
};

export type VehicleWorkUpdateMutationVariables = Exact<{
  id: Scalars["String"];
  data: VehicleWorkUpdateData;
}>;

export type VehicleWorkUpdateMutation = {
  __typename?: "Mutation";
  vehicleWorkUpdate: {
    __typename?: "VehicleWorkClass";
    _id: string;
    hours: number;
    jobTitle?: string | null;
    vehicle?: { __typename?: "VehicleClass"; _id: string; name: string } | null;
  };
};

export type CompaniesQueryVariables = Exact<{
  options?: InputMaybe<ListOptionData>;
}>;

export type CompaniesQuery = {
  __typename?: "Query";
  companies: Array<{ __typename?: "CompanyClass"; _id: string; name: string }>;
};

export type CompanySearchQueryVariables = Exact<{
  searchString: Scalars["String"];
  options?: InputMaybe<SearchOptions>;
}>;

export type CompanySearchQuery = {
  __typename?: "Query";
  companySearch: Array<{
    __typename?: "CompanyClass";
    _id: string;
    name: string;
  }>;
};

export type CompanyCardQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type CompanyCardQuery = {
  __typename?: "Query";
  company: { __typename?: "CompanyClass"; _id: string; name: string };
};

export type CrewSearchQueryVariables = Exact<{
  searchString: Scalars["String"];
  options?: InputMaybe<SearchOptions>;
}>;

export type CrewSearchQuery = {
  __typename?: "Query";
  crewSearch: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
};

export type CrewCardQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type CrewCardQuery = {
  __typename?: "Query";
  crew: { __typename?: "CrewClass"; _id: string; name: string };
};

export type CrewFullQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type CrewFullQuery = {
  __typename?: "Query";
  crew: {
    __typename?: "CrewClass";
    _id: string;
    name: string;
    type: CrewTypes;
    employees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    vehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
  };
};

export type CrewSsrQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type CrewSsrQuery = {
  __typename?: "Query";
  crew: {
    __typename?: "CrewClass";
    _id: string;
    name: string;
    type: CrewTypes;
  };
};

export type CurrentUserQueryVariables = Exact<{ [key: string]: never }>;

export type CurrentUserQuery = {
  __typename?: "Query";
  currentUser: {
    __typename?: "UserClass";
    _id: string;
    name: string;
    email: string;
    role: UserRoles;
    admin: boolean;
    projectManager: boolean;
    employee: {
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
    };
    settings: { __typename?: "UserSettings"; homeView: UserHomeViewSettings };
  };
};

export type DailyReportCardQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type DailyReportCardQuery = {
  __typename?: "Query";
  dailyReport: {
    __typename?: "DailyReportClass";
    _id: string;
    date: any;
    jobCostApproved: boolean;
    payrollComplete: boolean;
    jobsite: { __typename?: "JobsiteClass"; _id: string; name: string };
    crew: { __typename?: "CrewClass"; _id: string; name: string };
  };
};

export type DailyReportFullQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type DailyReportFullQuery = {
  __typename?: "Query";
  dailyReport: {
    __typename?: "DailyReportClass";
    _id: string;
    date: any;
    jobCostApproved: boolean;
    payrollComplete: boolean;
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      materials: Array<{
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      }>;
      truckingRates: Array<{
        __typename?: "TruckingTypeRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "TruckingRateClass";
          rate: number;
          date: any;
          type: TruckingRateTypes;
        }>;
      }>;
    };
    crew: {
      __typename?: "CrewClass";
      _id: string;
      name: string;
      type: CrewTypes;
      employees: Array<{
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      vehicles: Array<{
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      }>;
      dailyReports: Array<{ __typename?: "DailyReportClass"; _id: string }>;
    };
    employeeWork: Array<{
      __typename?: "EmployeeWorkClass";
      _id: string;
      jobTitle: string;
      startTime: any;
      endTime: any;
      employee: { __typename?: "EmployeeClass"; _id: string; name: string };
    }>;
    vehicleWork: Array<{
      __typename?: "VehicleWorkClass";
      _id: string;
      hours: number;
      jobTitle?: string | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
      } | null;
    }>;
    productions: Array<{
      __typename?: "ProductionClass";
      _id: string;
      jobTitle: string;
      quantity: number;
      unit: string;
      startTime: any;
      endTime: any;
      description?: string | null;
    }>;
    materialShipments: Array<{
      __typename?: "MaterialShipmentClass";
      _id: string;
      shipmentType?: string | null;
      supplier?: string | null;
      quantity: number;
      unit?: string | null;
      startTime?: any | null;
      endTime?: any | null;
      noJobsiteMaterial?: boolean | null;
      schemaVersion: number;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
      vehicleObject?: {
        __typename?: "VehicleObjectClass";
        source?: string | null;
        vehicleType?: string | null;
        vehicleCode?: string | null;
        truckingRateId?: string | null;
        deliveredRateId?: string | null;
      } | null;
    }>;
    reportNote?: {
      __typename?: "ReportNoteClass";
      _id: string;
      note: string;
      files: Array<{
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      }>;
    } | null;
    temporaryEmployees: Array<{
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
    temporaryVehicles: Array<{
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleCode: string;
      vehicleType: string;
      rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
    }>;
  };
};

export type DailyReportPdfQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type DailyReportPdfQuery = {
  __typename?: "Query";
  dailyReport: {
    __typename?: "DailyReportClass";
    date: any;
    crew: { __typename?: "CrewClass"; name: string };
    jobsite: {
      __typename?: "JobsiteClass";
      name: string;
      jobcode?: string | null;
    };
    employeeWork: Array<{
      __typename?: "EmployeeWorkClass";
      _id: string;
      jobTitle: string;
      startTime: any;
      endTime: any;
      employee: { __typename?: "EmployeeClass"; _id: string; name: string };
    }>;
    vehicleWork: Array<{
      __typename?: "VehicleWorkClass";
      _id: string;
      hours: number;
      jobTitle?: string | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
      } | null;
    }>;
    productions: Array<{
      __typename?: "ProductionClass";
      _id: string;
      jobTitle: string;
      quantity: number;
      unit: string;
      startTime: any;
      endTime: any;
      description?: string | null;
    }>;
    materialShipments: Array<{
      __typename?: "MaterialShipmentClass";
      _id: string;
      shipmentType?: string | null;
      supplier?: string | null;
      quantity: number;
      unit?: string | null;
      startTime?: any | null;
      endTime?: any | null;
      noJobsiteMaterial?: boolean | null;
      schemaVersion: number;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
      vehicleObject?: {
        __typename?: "VehicleObjectClass";
        source?: string | null;
        vehicleType?: string | null;
        vehicleCode?: string | null;
        truckingRateId?: string | null;
        deliveredRateId?: string | null;
      } | null;
    }>;
    reportNote?: {
      __typename?: "ReportNoteClass";
      _id: string;
      note: string;
      files: Array<{
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      }>;
    } | null;
  };
};

export type DailyReportSsrQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type DailyReportSsrQuery = {
  __typename?: "Query";
  dailyReport: {
    __typename?: "DailyReportClass";
    _id: string;
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      jobcode?: string | null;
    };
    crew: { __typename?: "CrewClass"; _id: string; name: string };
  };
};

export type DailyReportsQueryVariables = Exact<{
  options?: InputMaybe<DailyReportListOptionData>;
}>;

export type DailyReportsQuery = {
  __typename?: "Query";
  dailyReports: Array<{
    __typename?: "DailyReportClass";
    _id: string;
    date: any;
    jobCostApproved: boolean;
    payrollComplete: boolean;
    jobsite: { __typename?: "JobsiteClass"; _id: string; name: string };
    crew: { __typename?: "CrewClass"; _id: string; name: string };
  }>;
};

export type DailyReportsForJobsiteQueryVariables = Exact<{
  jobsiteId: Scalars["ID"];
  options?: InputMaybe<DailyReportListOptionData>;
}>;

export type DailyReportsForJobsiteQuery = {
  __typename?: "Query";
  dailyReportsForJobsite: Array<{
    __typename?: "DailyReportClass";
    _id: string;
  }>;
};

export type EmployeeHourReportsQueryVariables = Exact<{
  id: Scalars["ID"];
  startTime: Scalars["DateTime"];
  endTime: Scalars["DateTime"];
}>;

export type EmployeeHourReportsQuery = {
  __typename?: "Query";
  employeeHourReports: {
    __typename?: "EmployeeHoursReport";
    days: Array<{
      __typename?: "EmployeeHourReport";
      date: any;
      hours: number;
    }>;
  };
};

export type EmployeeSearchQueryVariables = Exact<{
  searchString: Scalars["String"];
  options?: InputMaybe<SearchOptions>;
}>;

export type EmployeeSearchQuery = {
  __typename?: "Query";
  employeeSearch: Array<{
    __typename?: "EmployeeClass";
    _id: string;
    name: string;
    jobTitle?: string | null;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  }>;
};

export type EmployeeFullQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type EmployeeFullQuery = {
  __typename?: "Query";
  employee: {
    __typename?: "EmployeeClass";
    _id: string;
    name: string;
    jobTitle?: string | null;
    user?: {
      __typename?: "UserClass";
      _id: string;
      name: string;
      email: string;
      role: UserRoles;
      admin: boolean;
      projectManager: boolean;
    } | null;
    crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
    signup?: { __typename?: "SignupClass"; _id: string } | null;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  };
};

export type EmployeeSsrQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type EmployeeSsrQuery = {
  __typename?: "Query";
  employee: {
    __typename?: "EmployeeClass";
    _id: string;
    name: string;
    jobTitle?: string | null;
  };
};

export type EmployeeFetchSearchQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type EmployeeFetchSearchQuery = {
  __typename?: "Query";
  employee: { __typename?: "EmployeeClass"; _id: string; name: string };
};

export type FileFullQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type FileFullQuery = {
  __typename?: "Query";
  file: {
    __typename?: "FileClass";
    buffer: string;
    downloadUrl: string;
    _id: string;
    mimetype: string;
    description?: string | null;
  };
};

export type JobsiteMasterExcelReportByDateQueryVariables = Exact<{
  startTime: Scalars["DateTime"];
  endTime: Scalars["DateTime"];
}>;

export type JobsiteMasterExcelReportByDateQuery = {
  __typename?: "Query";
  jobsiteMasterExcelReportByDate: string;
};

export type JobsiteMonthReportCardQueryVariables = Exact<{
  id: Scalars["ID"];
}>;

export type JobsiteMonthReportCardQuery = {
  __typename?: "Query";
  jobsiteMonthReport?: {
    __typename?: "JobsiteMonthReportClass";
    _id: string;
    startOfMonth: any;
    update: {
      __typename?: "UpdateClass";
      status: UpdateStatus;
      lastUpdatedAt?: any | null;
    };
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      jobcode?: string | null;
    };
  } | null;
};

export type JobsiteMonthReportFullQueryVariables = Exact<{
  id: Scalars["ID"];
}>;

export type JobsiteMonthReportFullQuery = {
  __typename?: "Query";
  jobsiteMonthReport?: {
    __typename?: "JobsiteMonthReportClass";
    crewTypes: Array<CrewTypes>;
    excelDownloadUrl?: string | null;
    _id: string;
    startOfMonth: any;
    dayReports: Array<{
      __typename?: "JobsiteDayReportClass";
      _id: string;
      date: any;
      crewTypes: Array<CrewTypes>;
      employees: Array<{
        __typename?: "EmployeeReportClass";
        _id: string;
        rate: number;
        hours: number;
        crewType: CrewTypes;
        employee?: {
          __typename?: "EmployeeClass";
          _id: string;
          name: string;
          jobTitle?: string | null;
          rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
        } | null;
        employeeWork: Array<{
          __typename?: "EmployeeWorkClass";
          jobTitle: string;
        }>;
      }>;
      vehicles: Array<{
        __typename?: "VehicleReportClass";
        _id: string;
        rate: number;
        hours: number;
        crewType: CrewTypes;
        vehicle: {
          __typename?: "VehicleClass";
          _id: string;
          name: string;
          vehicleCode: string;
          vehicleType: string;
          rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
        };
        vehicleWork: Array<{
          __typename?: "VehicleWorkClass";
          jobTitle?: string | null;
        }>;
      }>;
      materials: Array<{
        __typename?: "MaterialReportClass";
        _id: string;
        deliveredRateId?: string | null;
        rate: number;
        quantity: number;
        crewType: CrewTypes;
        jobsiteMaterial: {
          __typename?: "JobsiteMaterialClass";
          _id: string;
          quantity: number;
          completedQuantity: number;
          unit: string;
          costType: JobsiteMaterialCostType;
          delivered?: boolean | null;
          canRemove: boolean;
          material: { __typename?: "MaterialClass"; _id: string; name: string };
          supplier: { __typename?: "CompanyClass"; _id: string; name: string };
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
          deliveredRates: Array<{
            __typename?: "JobsiteMaterialDeliveredRateClass";
            _id?: string | null;
            title: string;
            rates: Array<{
              __typename?: "JobsiteMaterialRateClass";
              _id?: string | null;
              rate: number;
              date: any;
              estimated?: boolean | null;
            }>;
          }>;
          invoices?: Array<{
            __typename?: "InvoiceClass";
            _id: string;
            date: any;
            invoiceNumber: string;
            cost: number;
            description?: string | null;
            internal: boolean;
            accrual: boolean;
            company: { __typename?: "CompanyClass"; _id: string; name: string };
          }> | null;
        };
      }>;
      nonCostedMaterials: Array<{
        __typename?: "NonCostedMaterialReportClass";
        _id: string;
        materialName: string;
        supplierName: string;
        quantity: number;
        crewType: CrewTypes;
      }>;
      trucking: Array<{
        __typename?: "TruckingReportClass";
        _id: string;
        truckingType: string;
        quantity: number;
        hours?: number | null;
        type: TruckingRateTypes;
        rate: number;
        crewType: CrewTypes;
      }>;
      summary: {
        __typename?: "OnSiteSummaryReportClass";
        employeeHours: number;
        employeeCost: number;
        vehicleHours: number;
        vehicleCost: number;
        materialQuantity: number;
        materialCost: number;
        nonCostedMaterialQuantity: number;
        truckingQuantity: number;
        truckingHours: number;
        truckingCost: number;
        crewTypeSummaries: Array<{
          __typename?: "CrewTypeOnSiteSummaryClass";
          crewType: CrewTypes;
          employeeHours: number;
          employeeCost: number;
          vehicleHours: number;
          vehicleCost: number;
          materialQuantity: number;
          materialCost: number;
          nonCostedMaterialQuantity: number;
          truckingQuantity: number;
          truckingHours: number;
          truckingCost: number;
        }>;
      };
    }>;
    expenseInvoices: Array<{
      __typename?: "InvoiceReportClass";
      _id: string;
      value: number;
      internal: boolean;
      accrual: boolean;
      invoice: {
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      };
    }>;
    revenueInvoices: Array<{
      __typename?: "InvoiceReportClass";
      _id: string;
      value: number;
      internal: boolean;
      accrual: boolean;
      invoice: {
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      };
    }>;
    summary: {
      __typename?: "RangeSummaryReportClass";
      externalExpenseInvoiceValue: number;
      internalExpenseInvoiceValue: number;
      accrualExpenseInvoiceValue: number;
      externalRevenueInvoiceValue: number;
      internalRevenueInvoiceValue: number;
      accrualRevenueInvoiceValue: number;
    };
    issues: Array<{
      __typename?: "ReportIssueFullClass";
      _id: string;
      type: ReportIssueTypes;
      amount?: number | null;
      employee?: {
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      } | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      } | null;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        jobsite: { __typename?: "JobsiteClass"; _id: string };
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
    }>;
    update: {
      __typename?: "UpdateClass";
      status: UpdateStatus;
      lastUpdatedAt?: any | null;
    };
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      jobcode?: string | null;
    };
  } | null;
};

export type JobsiteSearchQueryVariables = Exact<{
  searchString: Scalars["String"];
  options?: InputMaybe<SearchOptions>;
}>;

export type JobsiteSearchQuery = {
  __typename?: "Query";
  jobsiteSearch: Array<{
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
  }>;
};

export type JobsiteYearMasterReportCurrentQueryVariables = Exact<{
  [key: string]: never;
}>;

export type JobsiteYearMasterReportCurrentQuery = {
  __typename?: "Query";
  jobsiteYearMasterReportCurrent: {
    __typename?: "JobsiteYearMasterReportClass";
    _id: string;
    startOfYear: any;
    update: {
      __typename?: "UpdateClass";
      status: UpdateStatus;
      lastUpdatedAt?: any | null;
    };
  };
};

export type JobsiteYearMasterReportCardQueryVariables = Exact<{
  id: Scalars["ID"];
}>;

export type JobsiteYearMasterReportCardQuery = {
  __typename?: "Query";
  jobsiteYearMasterReport?: {
    __typename?: "JobsiteYearMasterReportClass";
    _id: string;
    startOfYear: any;
    update: {
      __typename?: "UpdateClass";
      status: UpdateStatus;
      lastUpdatedAt?: any | null;
    };
  } | null;
};

export type JobsiteYearMasterReportFullQueryVariables = Exact<{
  id: Scalars["ID"];
}>;

export type JobsiteYearMasterReportFullQuery = {
  __typename?: "Query";
  jobsiteYearMasterReport?: {
    __typename?: "JobsiteYearMasterReportClass";
    crewTypes: Array<CrewTypes>;
    excelDownloadUrl?: string | null;
    _id: string;
    startOfYear: any;
    reports: Array<{
      __typename?: "JobsiteYearMasterReportItemClass";
      _id: string;
      report: { __typename?: "JobsiteYearReportClass"; _id: string };
      summary: {
        __typename?: "OnSiteSummaryReportClass";
        employeeHours: number;
        employeeCost: number;
        vehicleHours: number;
        vehicleCost: number;
        materialQuantity: number;
        materialCost: number;
        nonCostedMaterialQuantity: number;
        truckingQuantity: number;
        truckingHours: number;
        truckingCost: number;
        crewTypeSummaries: Array<{
          __typename?: "CrewTypeOnSiteSummaryClass";
          crewType: CrewTypes;
          employeeHours: number;
          employeeCost: number;
          vehicleHours: number;
          vehicleCost: number;
          materialQuantity: number;
          materialCost: number;
          nonCostedMaterialQuantity: number;
          truckingQuantity: number;
          truckingHours: number;
          truckingCost: number;
        }>;
      };
    }>;
    summary: {
      __typename?: "RangeSummaryReportClass";
      externalExpenseInvoiceValue: number;
      internalExpenseInvoiceValue: number;
      accrualExpenseInvoiceValue: number;
      externalRevenueInvoiceValue: number;
      internalRevenueInvoiceValue: number;
      accrualRevenueInvoiceValue: number;
    };
    update: {
      __typename?: "UpdateClass";
      status: UpdateStatus;
      lastUpdatedAt?: any | null;
    };
  } | null;
};

export type JobsiteYearMasterReportsQueryVariables = Exact<{
  [key: string]: never;
}>;

export type JobsiteYearMasterReportsQuery = {
  __typename?: "Query";
  jobsiteYearMasterReports: Array<{
    __typename?: "JobsiteYearMasterReportClass";
    _id: string;
    startOfYear: any;
    update: {
      __typename?: "UpdateClass";
      status: UpdateStatus;
      lastUpdatedAt?: any | null;
    };
  }>;
};

export type JobsiteYearReportCardQueryVariables = Exact<{
  id: Scalars["ID"];
}>;

export type JobsiteYearReportCardQuery = {
  __typename?: "Query";
  jobsiteYearReport?: {
    __typename?: "JobsiteYearReportClass";
    _id: string;
    startOfYear: any;
    update: {
      __typename?: "UpdateClass";
      status: UpdateStatus;
      lastUpdatedAt?: any | null;
    };
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      jobcode?: string | null;
    };
  } | null;
};

export type JobsiteYearReportFullQueryVariables = Exact<{
  id: Scalars["ID"];
}>;

export type JobsiteYearReportFullQuery = {
  __typename?: "Query";
  jobsiteYearReport?: {
    __typename?: "JobsiteYearReportClass";
    crewTypes: Array<CrewTypes>;
    excelDownloadUrl?: string | null;
    _id: string;
    startOfYear: any;
    dayReports: Array<{
      __typename?: "JobsiteDayReportClass";
      _id: string;
      date: any;
      crewTypes: Array<CrewTypes>;
      employees: Array<{
        __typename?: "EmployeeReportClass";
        _id: string;
        rate: number;
        hours: number;
        crewType: CrewTypes;
        employee?: {
          __typename?: "EmployeeClass";
          _id: string;
          name: string;
          jobTitle?: string | null;
          rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
        } | null;
        employeeWork: Array<{
          __typename?: "EmployeeWorkClass";
          jobTitle: string;
        }>;
      }>;
      vehicles: Array<{
        __typename?: "VehicleReportClass";
        _id: string;
        rate: number;
        hours: number;
        crewType: CrewTypes;
        vehicle: {
          __typename?: "VehicleClass";
          _id: string;
          name: string;
          vehicleCode: string;
          vehicleType: string;
          rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
        };
        vehicleWork: Array<{
          __typename?: "VehicleWorkClass";
          jobTitle?: string | null;
        }>;
      }>;
      materials: Array<{
        __typename?: "MaterialReportClass";
        _id: string;
        deliveredRateId?: string | null;
        rate: number;
        quantity: number;
        crewType: CrewTypes;
        jobsiteMaterial: {
          __typename?: "JobsiteMaterialClass";
          _id: string;
          quantity: number;
          completedQuantity: number;
          unit: string;
          costType: JobsiteMaterialCostType;
          delivered?: boolean | null;
          canRemove: boolean;
          material: { __typename?: "MaterialClass"; _id: string; name: string };
          supplier: { __typename?: "CompanyClass"; _id: string; name: string };
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
          deliveredRates: Array<{
            __typename?: "JobsiteMaterialDeliveredRateClass";
            _id?: string | null;
            title: string;
            rates: Array<{
              __typename?: "JobsiteMaterialRateClass";
              _id?: string | null;
              rate: number;
              date: any;
              estimated?: boolean | null;
            }>;
          }>;
          invoices?: Array<{
            __typename?: "InvoiceClass";
            _id: string;
            date: any;
            invoiceNumber: string;
            cost: number;
            description?: string | null;
            internal: boolean;
            accrual: boolean;
            company: { __typename?: "CompanyClass"; _id: string; name: string };
          }> | null;
        };
      }>;
      nonCostedMaterials: Array<{
        __typename?: "NonCostedMaterialReportClass";
        _id: string;
        materialName: string;
        supplierName: string;
        quantity: number;
        crewType: CrewTypes;
      }>;
      trucking: Array<{
        __typename?: "TruckingReportClass";
        _id: string;
        truckingType: string;
        quantity: number;
        hours?: number | null;
        type: TruckingRateTypes;
        rate: number;
        crewType: CrewTypes;
      }>;
      summary: {
        __typename?: "OnSiteSummaryReportClass";
        employeeHours: number;
        employeeCost: number;
        vehicleHours: number;
        vehicleCost: number;
        materialQuantity: number;
        materialCost: number;
        nonCostedMaterialQuantity: number;
        truckingQuantity: number;
        truckingHours: number;
        truckingCost: number;
        crewTypeSummaries: Array<{
          __typename?: "CrewTypeOnSiteSummaryClass";
          crewType: CrewTypes;
          employeeHours: number;
          employeeCost: number;
          vehicleHours: number;
          vehicleCost: number;
          materialQuantity: number;
          materialCost: number;
          nonCostedMaterialQuantity: number;
          truckingQuantity: number;
          truckingHours: number;
          truckingCost: number;
        }>;
      };
    }>;
    expenseInvoices: Array<{
      __typename?: "InvoiceReportClass";
      _id: string;
      value: number;
      internal: boolean;
      accrual: boolean;
      invoice: {
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      };
    }>;
    revenueInvoices: Array<{
      __typename?: "InvoiceReportClass";
      _id: string;
      value: number;
      internal: boolean;
      accrual: boolean;
      invoice: {
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      };
    }>;
    summary: {
      __typename?: "RangeSummaryReportClass";
      externalExpenseInvoiceValue: number;
      internalExpenseInvoiceValue: number;
      accrualExpenseInvoiceValue: number;
      externalRevenueInvoiceValue: number;
      internalRevenueInvoiceValue: number;
      accrualRevenueInvoiceValue: number;
    };
    issues: Array<{
      __typename?: "ReportIssueFullClass";
      _id: string;
      type: ReportIssueTypes;
      amount?: number | null;
      employee?: {
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      } | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      } | null;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        jobsite: { __typename?: "JobsiteClass"; _id: string };
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
    }>;
    update: {
      __typename?: "UpdateClass";
      status: UpdateStatus;
      lastUpdatedAt?: any | null;
    };
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      jobcode?: string | null;
    };
  } | null;
};

export type JobsiteYearReportSummaryQueryVariables = Exact<{
  id: Scalars["ID"];
}>;

export type JobsiteYearReportSummaryQuery = {
  __typename?: "Query";
  jobsiteYearReport?: {
    __typename?: "JobsiteYearReportClass";
    crewTypes: Array<CrewTypes>;
    _id: string;
    startOfYear: any;
    summary: {
      __typename?: "RangeSummaryReportClass";
      externalExpenseInvoiceValue: number;
      internalExpenseInvoiceValue: number;
      accrualExpenseInvoiceValue: number;
      externalRevenueInvoiceValue: number;
      internalRevenueInvoiceValue: number;
      accrualRevenueInvoiceValue: number;
    };
    issues: Array<{
      __typename?: "ReportIssueFullClass";
      _id: string;
      type: ReportIssueTypes;
      amount?: number | null;
      employee?: {
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      } | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      } | null;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        jobsite: { __typename?: "JobsiteClass"; _id: string };
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
    }>;
    update: {
      __typename?: "UpdateClass";
      status: UpdateStatus;
      lastUpdatedAt?: any | null;
    };
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      jobcode?: string | null;
    };
  } | null;
};

export type JobsiteFullQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type JobsiteFullQuery = {
  __typename?: "Query";
  jobsite: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
    description?: string | null;
    location_url?: string | null;
    active: boolean;
    crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
    monthReports: Array<{
      __typename?: "JobsiteMonthReportClass";
      _id: string;
      startOfMonth: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    yearReports: Array<{
      __typename?: "JobsiteYearReportClass";
      _id: string;
      startOfYear: any;
      update: {
        __typename?: "UpdateClass";
        status: UpdateStatus;
        lastUpdatedAt?: any | null;
      };
      jobsite: {
        __typename?: "JobsiteClass";
        _id: string;
        name: string;
        jobcode?: string | null;
      };
    }>;
    dailyReports: Array<{
      __typename?: "DailyReportClass";
      _id: string;
      date: any;
      jobCostApproved: boolean;
      payrollComplete: boolean;
      jobsite: { __typename?: "JobsiteClass"; _id: string; name: string };
      crew: { __typename?: "CrewClass"; _id: string; name: string };
    }>;
    expenseInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    revenueInvoices: Array<{
      __typename?: "InvoiceClass";
      _id: string;
      date: any;
      invoiceNumber: string;
      cost: number;
      description?: string | null;
      internal: boolean;
      accrual: boolean;
      company: { __typename?: "CompanyClass"; _id: string; name: string };
    }>;
    truckingRates: Array<{
      __typename?: "TruckingTypeRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "TruckingRateClass";
        rate: number;
        date: any;
        type: TruckingRateTypes;
      }>;
    }>;
    fileObjects: Array<{
      __typename?: "JobsiteFileObjectClass";
      _id?: string | null;
      minRole: UserRoles;
      file: {
        __typename?: "FileClass";
        _id: string;
        mimetype: string;
        description?: string | null;
      };
    }>;
  };
};

export type JobsitesMaterialsQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type JobsitesMaterialsQuery = {
  __typename?: "Query";
  jobsite: {
    __typename?: "JobsiteClass";
    _id: string;
    materials: Array<{
      __typename?: "JobsiteMaterialClass";
      _id: string;
      quantity: number;
      completedQuantity: number;
      unit: string;
      costType: JobsiteMaterialCostType;
      delivered?: boolean | null;
      canRemove: boolean;
      material: { __typename?: "MaterialClass"; _id: string; name: string };
      supplier: { __typename?: "CompanyClass"; _id: string; name: string };
      rates: Array<{
        __typename?: "JobsiteMaterialRateClass";
        _id?: string | null;
        rate: number;
        date: any;
        estimated?: boolean | null;
      }>;
      deliveredRates: Array<{
        __typename?: "JobsiteMaterialDeliveredRateClass";
        _id?: string | null;
        title: string;
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
      }>;
      invoices?: Array<{
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      }> | null;
    }>;
  };
};

export type JobsitesNonCostedMaterialsQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type JobsitesNonCostedMaterialsQuery = {
  __typename?: "Query";
  jobsite: {
    __typename?: "JobsiteClass";
    _id: string;
    nonCostedMaterialShipments: Array<{
      __typename?: "MaterialShipmentClass";
      _id: string;
      shipmentType?: string | null;
      supplier?: string | null;
      quantity: number;
      unit?: string | null;
      startTime?: any | null;
      endTime?: any | null;
      noJobsiteMaterial?: boolean | null;
      schemaVersion: number;
      dailyReport: {
        __typename?: "DailyReportClass";
        _id: string;
        date: any;
        jobsite: {
          __typename?: "JobsiteClass";
          materials: Array<{
            __typename?: "JobsiteMaterialClass";
            _id: string;
            quantity: number;
            completedQuantity: number;
            unit: string;
            costType: JobsiteMaterialCostType;
            delivered?: boolean | null;
            canRemove: boolean;
            material: {
              __typename?: "MaterialClass";
              _id: string;
              name: string;
            };
            supplier: {
              __typename?: "CompanyClass";
              _id: string;
              name: string;
            };
            rates: Array<{
              __typename?: "JobsiteMaterialRateClass";
              _id?: string | null;
              rate: number;
              date: any;
              estimated?: boolean | null;
            }>;
            deliveredRates: Array<{
              __typename?: "JobsiteMaterialDeliveredRateClass";
              _id?: string | null;
              title: string;
              rates: Array<{
                __typename?: "JobsiteMaterialRateClass";
                _id?: string | null;
                rate: number;
                date: any;
                estimated?: boolean | null;
              }>;
            }>;
            invoices?: Array<{
              __typename?: "InvoiceClass";
              _id: string;
              date: any;
              invoiceNumber: string;
              cost: number;
              description?: string | null;
              internal: boolean;
              accrual: boolean;
              company: {
                __typename?: "CompanyClass";
                _id: string;
                name: string;
              };
            }> | null;
          }>;
          truckingRates: Array<{
            __typename?: "TruckingTypeRateClass";
            _id?: string | null;
            title: string;
            rates: Array<{
              __typename?: "TruckingRateClass";
              rate: number;
              date: any;
              type: TruckingRateTypes;
            }>;
          }>;
        };
      };
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
      vehicleObject?: {
        __typename?: "VehicleObjectClass";
        source?: string | null;
        vehicleType?: string | null;
        vehicleCode?: string | null;
        truckingRateId?: string | null;
        deliveredRateId?: string | null;
      } | null;
    }>;
  };
};

export type JobsiteSsrQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type JobsiteSsrQuery = {
  __typename?: "Query";
  jobsite: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
  };
};

export type JobsiteFetchSearchQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type JobsiteFetchSearchQuery = {
  __typename?: "Query";
  jobsite: {
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
  };
};

export type JobsitesQueryVariables = Exact<{
  options?: InputMaybe<ListOptionData>;
}>;

export type JobsitesQuery = {
  __typename?: "Query";
  jobsites: Array<{
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
  }>;
};

export type JobsitesTruckingRateQueryVariables = Exact<{
  options?: InputMaybe<ListOptionData>;
}>;

export type JobsitesTruckingRateQuery = {
  __typename?: "Query";
  jobsites: Array<{
    __typename?: "JobsiteClass";
    _id: string;
    name: string;
    jobcode?: string | null;
    truckingRates: Array<{
      __typename?: "TruckingTypeRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{
        __typename?: "TruckingRateClass";
        rate: number;
        date: any;
        type: TruckingRateTypes;
      }>;
    }>;
  }>;
};

export type MaterialSearchQueryVariables = Exact<{
  searchString: Scalars["String"];
  options?: InputMaybe<SearchOptions>;
}>;

export type MaterialSearchQuery = {
  __typename?: "Query";
  materialSearch: Array<{
    __typename?: "MaterialClass";
    _id: string;
    name: string;
  }>;
};

export type MaterialCardQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type MaterialCardQuery = {
  __typename?: "Query";
  material: { __typename?: "MaterialClass"; _id: string; name: string };
};

export type MaterialsCardQueryVariables = Exact<{
  options?: InputMaybe<ListOptionData>;
}>;

export type MaterialsCardQuery = {
  __typename?: "Query";
  materials: Array<{ __typename?: "MaterialClass"; _id: string; name: string }>;
};

export type MaterialsFullQueryVariables = Exact<{
  options?: InputMaybe<ListOptionData>;
}>;

export type MaterialsFullQuery = {
  __typename?: "Query";
  materials: Array<{
    __typename?: "MaterialClass";
    canRemove: boolean;
    _id: string;
    name: string;
  }>;
};

export type SearchQueryVariables = Exact<{
  searchString: Scalars["String"];
}>;

export type SearchQuery = {
  __typename?: "Query";
  search: Array<{
    __typename?: "SearchClass";
    score: number;
    employee?: {
      __typename?: "EmployeeClass";
      _id: string;
      name: string;
      jobTitle?: string | null;
    } | null;
    vehicle?: {
      __typename?: "VehicleClass";
      _id: string;
      name: string;
      vehicleType: string;
      vehicleCode: string;
    } | null;
    jobsite?: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      jobcode?: string | null;
    } | null;
    dailyReport?: {
      __typename?: "DailyReportClass";
      _id: string;
      date: any;
      jobCostApproved: boolean;
      payrollComplete: boolean;
      jobsite: { __typename?: "JobsiteClass"; _id: string; name: string };
      crew: { __typename?: "CrewClass"; _id: string; name: string };
    } | null;
    crew?: { __typename?: "CrewClass"; _id: string; name: string } | null;
  }>;
};

export type SignupSsrQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type SignupSsrQuery = {
  __typename?: "Query";
  signup: {
    __typename?: "SignupClass";
    _id: string;
    employee: { __typename?: "EmployeeClass"; _id: string; name: string };
  };
};

export type SystemQueryVariables = Exact<{ [key: string]: never }>;

export type SystemQuery = {
  __typename?: "Query";
  system: {
    __typename?: "SystemClass";
    unitDefaults: Array<string>;
    laborTypes: Array<string>;
    internalExpenseOverheadRate: number;
    companyVehicleTypeDefaults: Array<{
      __typename?: "DefaultRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
    }>;
    materialShipmentVehicleTypeDefaults: Array<{
      __typename?: "DefaultRateClass";
      _id?: string | null;
      title: string;
      rates: Array<{ __typename?: "RateClass"; rate: number; date: any }>;
    }>;
  };
};

export type UserForPasswordResetQueryVariables = Exact<{
  query: UserQuery;
}>;

export type UserForPasswordResetQuery = {
  __typename?: "Query";
  user?: { __typename?: "UserClass"; _id: string; name: string } | null;
};

export type UsersQueryVariables = Exact<{
  options?: InputMaybe<ListOptionData>;
}>;

export type UsersQuery = {
  __typename?: "Query";
  users: Array<{
    __typename?: "UserClass";
    _id: string;
    name: string;
    email: string;
    role: UserRoles;
    admin: boolean;
    projectManager: boolean;
  }>;
};

export type VehicleSearchQueryVariables = Exact<{
  searchString: Scalars["String"];
  options?: InputMaybe<SearchOptions>;
}>;

export type VehicleSearchQuery = {
  __typename?: "Query";
  vehicleSearch: Array<{
    __typename?: "VehicleClass";
    _id: string;
    name: string;
    vehicleCode: string;
    vehicleType: string;
  }>;
};

export type VehicleFullQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type VehicleFullQuery = {
  __typename?: "Query";
  vehicle: {
    __typename?: "VehicleClass";
    currentRate: number;
    _id: string;
    name: string;
    vehicleCode: string;
    vehicleType: string;
    crews: Array<{ __typename?: "CrewClass"; _id: string; name: string }>;
    rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
  };
};

export type VehicleSsrQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type VehicleSsrQuery = {
  __typename?: "Query";
  vehicle: {
    __typename?: "VehicleClass";
    _id: string;
    name: string;
    vehicleCode: string;
    vehicleType: string;
  };
};

export type VehicleFetchSearchQueryVariables = Exact<{
  id: Scalars["String"];
}>;

export type VehicleFetchSearchQuery = {
  __typename?: "Query";
  vehicle: {
    __typename?: "VehicleClass";
    _id: string;
    name: string;
    vehicleCode: string;
    vehicleType: string;
  };
};

export type JobsiteMonthReportSubSubscriptionVariables = Exact<{
  id: Scalars["ID"];
}>;

export type JobsiteMonthReportSubSubscription = {
  __typename?: "Subscription";
  jobsiteMonthReportSub?: {
    __typename?: "JobsiteMonthReportClass";
    crewTypes: Array<CrewTypes>;
    excelDownloadUrl?: string | null;
    _id: string;
    startOfMonth: any;
    dayReports: Array<{
      __typename?: "JobsiteDayReportClass";
      _id: string;
      date: any;
      crewTypes: Array<CrewTypes>;
      employees: Array<{
        __typename?: "EmployeeReportClass";
        _id: string;
        rate: number;
        hours: number;
        crewType: CrewTypes;
        employee?: {
          __typename?: "EmployeeClass";
          _id: string;
          name: string;
          jobTitle?: string | null;
          rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
        } | null;
        employeeWork: Array<{
          __typename?: "EmployeeWorkClass";
          jobTitle: string;
        }>;
      }>;
      vehicles: Array<{
        __typename?: "VehicleReportClass";
        _id: string;
        rate: number;
        hours: number;
        crewType: CrewTypes;
        vehicle: {
          __typename?: "VehicleClass";
          _id: string;
          name: string;
          vehicleCode: string;
          vehicleType: string;
          rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
        };
        vehicleWork: Array<{
          __typename?: "VehicleWorkClass";
          jobTitle?: string | null;
        }>;
      }>;
      materials: Array<{
        __typename?: "MaterialReportClass";
        _id: string;
        deliveredRateId?: string | null;
        rate: number;
        quantity: number;
        crewType: CrewTypes;
        jobsiteMaterial: {
          __typename?: "JobsiteMaterialClass";
          _id: string;
          quantity: number;
          completedQuantity: number;
          unit: string;
          costType: JobsiteMaterialCostType;
          delivered?: boolean | null;
          canRemove: boolean;
          material: { __typename?: "MaterialClass"; _id: string; name: string };
          supplier: { __typename?: "CompanyClass"; _id: string; name: string };
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
          deliveredRates: Array<{
            __typename?: "JobsiteMaterialDeliveredRateClass";
            _id?: string | null;
            title: string;
            rates: Array<{
              __typename?: "JobsiteMaterialRateClass";
              _id?: string | null;
              rate: number;
              date: any;
              estimated?: boolean | null;
            }>;
          }>;
          invoices?: Array<{
            __typename?: "InvoiceClass";
            _id: string;
            date: any;
            invoiceNumber: string;
            cost: number;
            description?: string | null;
            internal: boolean;
            accrual: boolean;
            company: { __typename?: "CompanyClass"; _id: string; name: string };
          }> | null;
        };
      }>;
      nonCostedMaterials: Array<{
        __typename?: "NonCostedMaterialReportClass";
        _id: string;
        materialName: string;
        supplierName: string;
        quantity: number;
        crewType: CrewTypes;
      }>;
      trucking: Array<{
        __typename?: "TruckingReportClass";
        _id: string;
        truckingType: string;
        quantity: number;
        hours?: number | null;
        type: TruckingRateTypes;
        rate: number;
        crewType: CrewTypes;
      }>;
      summary: {
        __typename?: "OnSiteSummaryReportClass";
        employeeHours: number;
        employeeCost: number;
        vehicleHours: number;
        vehicleCost: number;
        materialQuantity: number;
        materialCost: number;
        nonCostedMaterialQuantity: number;
        truckingQuantity: number;
        truckingHours: number;
        truckingCost: number;
        crewTypeSummaries: Array<{
          __typename?: "CrewTypeOnSiteSummaryClass";
          crewType: CrewTypes;
          employeeHours: number;
          employeeCost: number;
          vehicleHours: number;
          vehicleCost: number;
          materialQuantity: number;
          materialCost: number;
          nonCostedMaterialQuantity: number;
          truckingQuantity: number;
          truckingHours: number;
          truckingCost: number;
        }>;
      };
    }>;
    expenseInvoices: Array<{
      __typename?: "InvoiceReportClass";
      _id: string;
      value: number;
      internal: boolean;
      accrual: boolean;
      invoice: {
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      };
    }>;
    revenueInvoices: Array<{
      __typename?: "InvoiceReportClass";
      _id: string;
      value: number;
      internal: boolean;
      accrual: boolean;
      invoice: {
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      };
    }>;
    summary: {
      __typename?: "RangeSummaryReportClass";
      externalExpenseInvoiceValue: number;
      internalExpenseInvoiceValue: number;
      accrualExpenseInvoiceValue: number;
      externalRevenueInvoiceValue: number;
      internalRevenueInvoiceValue: number;
      accrualRevenueInvoiceValue: number;
    };
    issues: Array<{
      __typename?: "ReportIssueFullClass";
      _id: string;
      type: ReportIssueTypes;
      amount?: number | null;
      employee?: {
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      } | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      } | null;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        jobsite: { __typename?: "JobsiteClass"; _id: string };
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
    }>;
    update: {
      __typename?: "UpdateClass";
      status: UpdateStatus;
      lastUpdatedAt?: any | null;
    };
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      jobcode?: string | null;
    };
  } | null;
};

export type JobsiteYearMasterReportSubSubscriptionVariables = Exact<{
  id: Scalars["ID"];
}>;

export type JobsiteYearMasterReportSubSubscription = {
  __typename?: "Subscription";
  jobsiteYearMasterReportSub?: {
    __typename?: "JobsiteYearMasterReportClass";
    crewTypes: Array<CrewTypes>;
    excelDownloadUrl?: string | null;
    _id: string;
    startOfYear: any;
    reports: Array<{
      __typename?: "JobsiteYearMasterReportItemClass";
      _id: string;
      report: { __typename?: "JobsiteYearReportClass"; _id: string };
      summary: {
        __typename?: "OnSiteSummaryReportClass";
        employeeHours: number;
        employeeCost: number;
        vehicleHours: number;
        vehicleCost: number;
        materialQuantity: number;
        materialCost: number;
        nonCostedMaterialQuantity: number;
        truckingQuantity: number;
        truckingHours: number;
        truckingCost: number;
        crewTypeSummaries: Array<{
          __typename?: "CrewTypeOnSiteSummaryClass";
          crewType: CrewTypes;
          employeeHours: number;
          employeeCost: number;
          vehicleHours: number;
          vehicleCost: number;
          materialQuantity: number;
          materialCost: number;
          nonCostedMaterialQuantity: number;
          truckingQuantity: number;
          truckingHours: number;
          truckingCost: number;
        }>;
      };
    }>;
    summary: {
      __typename?: "RangeSummaryReportClass";
      externalExpenseInvoiceValue: number;
      internalExpenseInvoiceValue: number;
      accrualExpenseInvoiceValue: number;
      externalRevenueInvoiceValue: number;
      internalRevenueInvoiceValue: number;
      accrualRevenueInvoiceValue: number;
    };
    update: {
      __typename?: "UpdateClass";
      status: UpdateStatus;
      lastUpdatedAt?: any | null;
    };
  } | null;
};

export type JobsiteYearReportSubSubscriptionVariables = Exact<{
  id: Scalars["ID"];
}>;

export type JobsiteYearReportSubSubscription = {
  __typename?: "Subscription";
  jobsiteYearReportSub?: {
    __typename?: "JobsiteYearReportClass";
    crewTypes: Array<CrewTypes>;
    excelDownloadUrl?: string | null;
    _id: string;
    startOfYear: any;
    dayReports: Array<{
      __typename?: "JobsiteDayReportClass";
      _id: string;
      date: any;
      crewTypes: Array<CrewTypes>;
      employees: Array<{
        __typename?: "EmployeeReportClass";
        _id: string;
        rate: number;
        hours: number;
        crewType: CrewTypes;
        employee?: {
          __typename?: "EmployeeClass";
          _id: string;
          name: string;
          jobTitle?: string | null;
          rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
        } | null;
        employeeWork: Array<{
          __typename?: "EmployeeWorkClass";
          jobTitle: string;
        }>;
      }>;
      vehicles: Array<{
        __typename?: "VehicleReportClass";
        _id: string;
        rate: number;
        hours: number;
        crewType: CrewTypes;
        vehicle: {
          __typename?: "VehicleClass";
          _id: string;
          name: string;
          vehicleCode: string;
          vehicleType: string;
          rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
        };
        vehicleWork: Array<{
          __typename?: "VehicleWorkClass";
          jobTitle?: string | null;
        }>;
      }>;
      materials: Array<{
        __typename?: "MaterialReportClass";
        _id: string;
        deliveredRateId?: string | null;
        rate: number;
        quantity: number;
        crewType: CrewTypes;
        jobsiteMaterial: {
          __typename?: "JobsiteMaterialClass";
          _id: string;
          quantity: number;
          completedQuantity: number;
          unit: string;
          costType: JobsiteMaterialCostType;
          delivered?: boolean | null;
          canRemove: boolean;
          material: { __typename?: "MaterialClass"; _id: string; name: string };
          supplier: { __typename?: "CompanyClass"; _id: string; name: string };
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
          deliveredRates: Array<{
            __typename?: "JobsiteMaterialDeliveredRateClass";
            _id?: string | null;
            title: string;
            rates: Array<{
              __typename?: "JobsiteMaterialRateClass";
              _id?: string | null;
              rate: number;
              date: any;
              estimated?: boolean | null;
            }>;
          }>;
          invoices?: Array<{
            __typename?: "InvoiceClass";
            _id: string;
            date: any;
            invoiceNumber: string;
            cost: number;
            description?: string | null;
            internal: boolean;
            accrual: boolean;
            company: { __typename?: "CompanyClass"; _id: string; name: string };
          }> | null;
        };
      }>;
      nonCostedMaterials: Array<{
        __typename?: "NonCostedMaterialReportClass";
        _id: string;
        materialName: string;
        supplierName: string;
        quantity: number;
        crewType: CrewTypes;
      }>;
      trucking: Array<{
        __typename?: "TruckingReportClass";
        _id: string;
        truckingType: string;
        quantity: number;
        hours?: number | null;
        type: TruckingRateTypes;
        rate: number;
        crewType: CrewTypes;
      }>;
      summary: {
        __typename?: "OnSiteSummaryReportClass";
        employeeHours: number;
        employeeCost: number;
        vehicleHours: number;
        vehicleCost: number;
        materialQuantity: number;
        materialCost: number;
        nonCostedMaterialQuantity: number;
        truckingQuantity: number;
        truckingHours: number;
        truckingCost: number;
        crewTypeSummaries: Array<{
          __typename?: "CrewTypeOnSiteSummaryClass";
          crewType: CrewTypes;
          employeeHours: number;
          employeeCost: number;
          vehicleHours: number;
          vehicleCost: number;
          materialQuantity: number;
          materialCost: number;
          nonCostedMaterialQuantity: number;
          truckingQuantity: number;
          truckingHours: number;
          truckingCost: number;
        }>;
      };
    }>;
    expenseInvoices: Array<{
      __typename?: "InvoiceReportClass";
      _id: string;
      value: number;
      internal: boolean;
      accrual: boolean;
      invoice: {
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      };
    }>;
    revenueInvoices: Array<{
      __typename?: "InvoiceReportClass";
      _id: string;
      value: number;
      internal: boolean;
      accrual: boolean;
      invoice: {
        __typename?: "InvoiceClass";
        _id: string;
        date: any;
        invoiceNumber: string;
        cost: number;
        description?: string | null;
        internal: boolean;
        accrual: boolean;
        company: { __typename?: "CompanyClass"; _id: string; name: string };
      };
    }>;
    summary: {
      __typename?: "RangeSummaryReportClass";
      externalExpenseInvoiceValue: number;
      internalExpenseInvoiceValue: number;
      accrualExpenseInvoiceValue: number;
      externalRevenueInvoiceValue: number;
      internalRevenueInvoiceValue: number;
      accrualRevenueInvoiceValue: number;
    };
    issues: Array<{
      __typename?: "ReportIssueFullClass";
      _id: string;
      type: ReportIssueTypes;
      amount?: number | null;
      employee?: {
        __typename?: "EmployeeClass";
        _id: string;
        name: string;
        jobTitle?: string | null;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      } | null;
      vehicle?: {
        __typename?: "VehicleClass";
        _id: string;
        name: string;
        vehicleCode: string;
        vehicleType: string;
        rates: Array<{ __typename?: "RateClass"; date: any; rate: number }>;
      } | null;
      jobsiteMaterial?: {
        __typename?: "JobsiteMaterialClass";
        _id: string;
        quantity: number;
        completedQuantity: number;
        unit: string;
        costType: JobsiteMaterialCostType;
        delivered?: boolean | null;
        canRemove: boolean;
        jobsite: { __typename?: "JobsiteClass"; _id: string };
        material: { __typename?: "MaterialClass"; _id: string; name: string };
        supplier: { __typename?: "CompanyClass"; _id: string; name: string };
        rates: Array<{
          __typename?: "JobsiteMaterialRateClass";
          _id?: string | null;
          rate: number;
          date: any;
          estimated?: boolean | null;
        }>;
        deliveredRates: Array<{
          __typename?: "JobsiteMaterialDeliveredRateClass";
          _id?: string | null;
          title: string;
          rates: Array<{
            __typename?: "JobsiteMaterialRateClass";
            _id?: string | null;
            rate: number;
            date: any;
            estimated?: boolean | null;
          }>;
        }>;
        invoices?: Array<{
          __typename?: "InvoiceClass";
          _id: string;
          date: any;
          invoiceNumber: string;
          cost: number;
          description?: string | null;
          internal: boolean;
          accrual: boolean;
          company: { __typename?: "CompanyClass"; _id: string; name: string };
        }> | null;
      } | null;
    }>;
    update: {
      __typename?: "UpdateClass";
      status: UpdateStatus;
      lastUpdatedAt?: any | null;
    };
    jobsite: {
      __typename?: "JobsiteClass";
      _id: string;
      name: string;
      jobcode?: string | null;
    };
  } | null;
};

export const MaterialCardSnippetFragmentDoc = gql`
  fragment MaterialCardSnippet on MaterialClass {
    _id
    name
  }
`;
export const CompanyCardSnippetFragmentDoc = gql`
  fragment CompanyCardSnippet on CompanyClass {
    _id
    name
  }
`;
export const JobsiteMaterialRateSnippetFragmentDoc = gql`
  fragment JobsiteMaterialRateSnippet on JobsiteMaterialRateClass {
    _id
    rate
    date
    estimated
  }
`;
export const JobsiteMaterialDeliveredRateSnippetFragmentDoc = gql`
  fragment JobsiteMaterialDeliveredRateSnippet on JobsiteMaterialDeliveredRateClass {
    _id
    title
    rates {
      ...JobsiteMaterialRateSnippet
    }
  }
  ${JobsiteMaterialRateSnippetFragmentDoc}
`;
export const InvoiceCardSnippetFragmentDoc = gql`
  fragment InvoiceCardSnippet on InvoiceClass {
    _id
    company {
      ...CompanyCardSnippet
    }
    date
    invoiceNumber
    cost
    description
    internal
    accrual
  }
  ${CompanyCardSnippetFragmentDoc}
`;
export const JobsiteMaterialCardSnippetFragmentDoc = gql`
  fragment JobsiteMaterialCardSnippet on JobsiteMaterialClass {
    _id
    material {
      ...MaterialCardSnippet
    }
    supplier {
      ...CompanyCardSnippet
    }
    quantity
    completedQuantity
    unit
    costType
    delivered
    rates {
      ...JobsiteMaterialRateSnippet
    }
    deliveredRates {
      ...JobsiteMaterialDeliveredRateSnippet
    }
    invoices {
      ...InvoiceCardSnippet
    }
    canRemove
  }
  ${MaterialCardSnippetFragmentDoc}
  ${CompanyCardSnippetFragmentDoc}
  ${JobsiteMaterialRateSnippetFragmentDoc}
  ${JobsiteMaterialDeliveredRateSnippetFragmentDoc}
  ${InvoiceCardSnippetFragmentDoc}
`;
export const TruckingRateSnippetFragmentDoc = gql`
  fragment TruckingRateSnippet on TruckingRateClass {
    rate
    date
    type
  }
`;
export const TruckingTypeRateSnippetFragmentDoc = gql`
  fragment TruckingTypeRateSnippet on TruckingTypeRateClass {
    _id
    title
    rates {
      ...TruckingRateSnippet
    }
  }
  ${TruckingRateSnippetFragmentDoc}
`;
export const JobsiteForDailyReportSnippetFragmentDoc = gql`
  fragment JobsiteForDailyReportSnippet on JobsiteClass {
    _id
    name
    materials {
      ...JobsiteMaterialCardSnippet
    }
    truckingRates {
      ...TruckingTypeRateSnippet
    }
  }
  ${JobsiteMaterialCardSnippetFragmentDoc}
  ${TruckingTypeRateSnippetFragmentDoc}
`;
export const CrewSsrSnippetFragmentDoc = gql`
  fragment CrewSSRSnippet on CrewClass {
    _id
    name
    type
  }
`;
export const RateSnippetFragmentDoc = gql`
  fragment RateSnippet on RateClass {
    date
    rate
  }
`;
export const EmployeeCardSnippetFragmentDoc = gql`
  fragment EmployeeCardSnippet on EmployeeClass {
    _id
    name
    jobTitle
    rates {
      ...RateSnippet
    }
  }
  ${RateSnippetFragmentDoc}
`;
export const VehicleCardSnippetFragmentDoc = gql`
  fragment VehicleCardSnippet on VehicleClass {
    _id
    name
    vehicleCode
    vehicleType
    rates {
      ...RateSnippet
    }
  }
  ${RateSnippetFragmentDoc}
`;
export const CrewFullSnippetFragmentDoc = gql`
  fragment CrewFullSnippet on CrewClass {
    ...CrewSSRSnippet
    employees {
      ...EmployeeCardSnippet
    }
    vehicles {
      ...VehicleCardSnippet
    }
    dailyReports {
      _id
    }
  }
  ${CrewSsrSnippetFragmentDoc}
  ${EmployeeCardSnippetFragmentDoc}
  ${VehicleCardSnippetFragmentDoc}
`;
export const EmployeeWorkCardSnippetFragmentDoc = gql`
  fragment EmployeeWorkCardSnippet on EmployeeWorkClass {
    _id
    jobTitle
    employee {
      _id
      name
    }
    startTime
    endTime
  }
`;
export const VehicleWorkCardSnippetFragmentDoc = gql`
  fragment VehicleWorkCardSnippet on VehicleWorkClass {
    _id
    hours
    jobTitle
    vehicle {
      _id
      name
    }
  }
`;
export const ProductionCardSnippetFragmentDoc = gql`
  fragment ProductionCardSnippet on ProductionClass {
    _id
    jobTitle
    quantity
    unit
    startTime
    endTime
    description
  }
`;
export const MaterialShipmentCardSnippetFragmentDoc = gql`
  fragment MaterialShipmentCardSnippet on MaterialShipmentClass {
    _id
    shipmentType
    supplier
    quantity
    unit
    startTime
    endTime
    noJobsiteMaterial
    jobsiteMaterial {
      ...JobsiteMaterialCardSnippet
    }
    vehicleObject {
      source
      vehicleType
      vehicleCode
      truckingRateId
      deliveredRateId
    }
    schemaVersion
  }
  ${JobsiteMaterialCardSnippetFragmentDoc}
`;
export const FilePreloadSnippetFragmentDoc = gql`
  fragment FilePreloadSnippet on FileClass {
    _id
    mimetype
    description
  }
`;
export const ReportNoteFullSnippetFragmentDoc = gql`
  fragment ReportNoteFullSnippet on ReportNoteClass {
    _id
    note
    files {
      ...FilePreloadSnippet
    }
  }
  ${FilePreloadSnippetFragmentDoc}
`;
export const DailyReportFullSnippetFragmentDoc = gql`
  fragment DailyReportFullSnippet on DailyReportClass {
    _id
    date
    jobCostApproved
    payrollComplete
    jobsite {
      ...JobsiteForDailyReportSnippet
    }
    crew {
      ...CrewFullSnippet
    }
    employeeWork {
      ...EmployeeWorkCardSnippet
    }
    vehicleWork {
      ...VehicleWorkCardSnippet
    }
    productions {
      ...ProductionCardSnippet
    }
    materialShipments {
      ...MaterialShipmentCardSnippet
    }
    reportNote {
      ...ReportNoteFullSnippet
    }
    temporaryEmployees {
      ...EmployeeCardSnippet
    }
    temporaryVehicles {
      ...VehicleCardSnippet
    }
  }
  ${JobsiteForDailyReportSnippetFragmentDoc}
  ${CrewFullSnippetFragmentDoc}
  ${EmployeeWorkCardSnippetFragmentDoc}
  ${VehicleWorkCardSnippetFragmentDoc}
  ${ProductionCardSnippetFragmentDoc}
  ${MaterialShipmentCardSnippetFragmentDoc}
  ${ReportNoteFullSnippetFragmentDoc}
  ${EmployeeCardSnippetFragmentDoc}
  ${VehicleCardSnippetFragmentDoc}
`;
export const DailyReportPdfSnippetFragmentDoc = gql`
  fragment DailyReportPDFSnippet on DailyReportClass {
    date
    crew {
      name
    }
    jobsite {
      name
      jobcode
    }
    employeeWork {
      ...EmployeeWorkCardSnippet
    }
    vehicleWork {
      ...VehicleWorkCardSnippet
    }
    productions {
      ...ProductionCardSnippet
    }
    materialShipments {
      ...MaterialShipmentCardSnippet
    }
    reportNote {
      ...ReportNoteFullSnippet
    }
  }
  ${EmployeeWorkCardSnippetFragmentDoc}
  ${VehicleWorkCardSnippetFragmentDoc}
  ${ProductionCardSnippetFragmentDoc}
  ${MaterialShipmentCardSnippetFragmentDoc}
  ${ReportNoteFullSnippetFragmentDoc}
`;
export const DailyReportSsrSnippetFragmentDoc = gql`
  fragment DailyReportSSRSnippet on DailyReportClass {
    _id
    jobsite {
      _id
      name
      jobcode
    }
    crew {
      _id
      name
    }
  }
`;
export const UserCardSnippetFragmentDoc = gql`
  fragment UserCardSnippet on UserClass {
    _id
    name
    email
    role
    admin
    projectManager
  }
`;
export const EmployeeFullSnippetFragmentDoc = gql`
  fragment EmployeeFullSnippet on EmployeeClass {
    ...EmployeeCardSnippet
    user {
      ...UserCardSnippet
    }
    crews {
      _id
      name
    }
    signup {
      _id
    }
  }
  ${EmployeeCardSnippetFragmentDoc}
  ${UserCardSnippetFragmentDoc}
`;
export const EmployeeSsrSnippetFragmentDoc = gql`
  fragment EmployeeSSRSnippet on EmployeeClass {
    _id
    name
    jobTitle
  }
`;
export const EmployeeSearchSnippetFragmentDoc = gql`
  fragment EmployeeSearchSnippet on EmployeeClass {
    _id
    name
  }
`;
export const FileFullSnippetFragmentDoc = gql`
  fragment FileFullSnippet on FileClass {
    ...FilePreloadSnippet
    buffer
    downloadUrl
  }
  ${FilePreloadSnippetFragmentDoc}
`;
export const UpdateSnippetFragmentDoc = gql`
  fragment UpdateSnippet on UpdateClass {
    status
    lastUpdatedAt
  }
`;
export const JobsiteCardSnippetFragmentDoc = gql`
  fragment JobsiteCardSnippet on JobsiteClass {
    _id
    name
    jobcode
  }
`;
export const JobsiteMonthReportCardSnippetFragmentDoc = gql`
  fragment JobsiteMonthReportCardSnippet on JobsiteMonthReportClass {
    _id
    startOfMonth
    update {
      ...UpdateSnippet
    }
    jobsite {
      ...JobsiteCardSnippet
    }
  }
  ${UpdateSnippetFragmentDoc}
  ${JobsiteCardSnippetFragmentDoc}
`;
export const JobsiteDayReportEmployeeSnippetFragmentDoc = gql`
  fragment JobsiteDayReportEmployeeSnippet on EmployeeReportClass {
    _id
    employee {
      ...EmployeeCardSnippet
    }
    employeeWork {
      jobTitle
    }
    rate
    hours
    crewType
  }
  ${EmployeeCardSnippetFragmentDoc}
`;
export const JobsiteDayReportVehicleSnippetFragmentDoc = gql`
  fragment JobsiteDayReportVehicleSnippet on VehicleReportClass {
    _id
    vehicle {
      ...VehicleCardSnippet
    }
    vehicleWork {
      jobTitle
    }
    rate
    hours
    crewType
  }
  ${VehicleCardSnippetFragmentDoc}
`;
export const JobsiteDayReportMaterialSnippetFragmentDoc = gql`
  fragment JobsiteDayReportMaterialSnippet on MaterialReportClass {
    _id
    jobsiteMaterial {
      ...JobsiteMaterialCardSnippet
    }
    deliveredRateId
    rate
    quantity
    crewType
  }
  ${JobsiteMaterialCardSnippetFragmentDoc}
`;
export const JobsiteDayReportNonCostedMaterialSnippetFragmentDoc = gql`
  fragment JobsiteDayReportNonCostedMaterialSnippet on NonCostedMaterialReportClass {
    _id
    materialName
    supplierName
    quantity
    crewType
  }
`;
export const JobsiteDayReportTruckingSnippetFragmentDoc = gql`
  fragment JobsiteDayReportTruckingSnippet on TruckingReportClass {
    _id
    truckingType
    quantity
    hours
    type
    rate
    crewType
  }
`;
export const OnSiteSummaryReportSnippetFragmentDoc = gql`
  fragment OnSiteSummaryReportSnippet on OnSiteSummaryReportClass {
    crewTypeSummaries {
      crewType
      employeeHours
      employeeCost
      vehicleHours
      vehicleCost
      materialQuantity
      materialCost
      nonCostedMaterialQuantity
      truckingQuantity
      truckingHours
      truckingCost
    }
    employeeHours
    employeeCost
    vehicleHours
    vehicleCost
    materialQuantity
    materialCost
    nonCostedMaterialQuantity
    truckingQuantity
    truckingHours
    truckingCost
  }
`;
export const JobsiteDayReportFullSnippetFragmentDoc = gql`
  fragment JobsiteDayReportFullSnippet on JobsiteDayReportClass {
    _id
    date
    crewTypes
    employees {
      ...JobsiteDayReportEmployeeSnippet
    }
    vehicles {
      ...JobsiteDayReportVehicleSnippet
    }
    materials {
      ...JobsiteDayReportMaterialSnippet
    }
    nonCostedMaterials {
      ...JobsiteDayReportNonCostedMaterialSnippet
    }
    trucking {
      ...JobsiteDayReportTruckingSnippet
    }
    summary {
      ...OnSiteSummaryReportSnippet
    }
  }
  ${JobsiteDayReportEmployeeSnippetFragmentDoc}
  ${JobsiteDayReportVehicleSnippetFragmentDoc}
  ${JobsiteDayReportMaterialSnippetFragmentDoc}
  ${JobsiteDayReportNonCostedMaterialSnippetFragmentDoc}
  ${JobsiteDayReportTruckingSnippetFragmentDoc}
  ${OnSiteSummaryReportSnippetFragmentDoc}
`;
export const JobsiteDayReportInvoiceSnippetFragmentDoc = gql`
  fragment JobsiteDayReportInvoiceSnippet on InvoiceReportClass {
    _id
    invoice {
      ...InvoiceCardSnippet
    }
    value
    internal
    accrual
  }
  ${InvoiceCardSnippetFragmentDoc}
`;
export const ReportIssueSnippetFragmentDoc = gql`
  fragment ReportIssueSnippet on ReportIssueFullClass {
    _id
    type
    employee {
      ...EmployeeCardSnippet
    }
    vehicle {
      ...VehicleCardSnippet
    }
    jobsiteMaterial {
      ...JobsiteMaterialCardSnippet
      jobsite {
        _id
      }
    }
    amount
  }
  ${EmployeeCardSnippetFragmentDoc}
  ${VehicleCardSnippetFragmentDoc}
  ${JobsiteMaterialCardSnippetFragmentDoc}
`;
export const JobsiteMonthReportFullSnippetFragmentDoc = gql`
  fragment JobsiteMonthReportFullSnippet on JobsiteMonthReportClass {
    ...JobsiteMonthReportCardSnippet
    crewTypes
    dayReports {
      ...JobsiteDayReportFullSnippet
    }
    expenseInvoices {
      ...JobsiteDayReportInvoiceSnippet
    }
    revenueInvoices {
      ...JobsiteDayReportInvoiceSnippet
    }
    summary {
      externalExpenseInvoiceValue
      internalExpenseInvoiceValue
      accrualExpenseInvoiceValue
      externalRevenueInvoiceValue
      internalRevenueInvoiceValue
      accrualRevenueInvoiceValue
    }
    issues {
      ...ReportIssueSnippet
    }
    excelDownloadUrl
  }
  ${JobsiteMonthReportCardSnippetFragmentDoc}
  ${JobsiteDayReportFullSnippetFragmentDoc}
  ${JobsiteDayReportInvoiceSnippetFragmentDoc}
  ${ReportIssueSnippetFragmentDoc}
`;
export const JobsiteYearMasterReportCardSnippetFragmentDoc = gql`
  fragment JobsiteYearMasterReportCardSnippet on JobsiteYearMasterReportClass {
    _id
    startOfYear
    update {
      ...UpdateSnippet
    }
  }
  ${UpdateSnippetFragmentDoc}
`;
export const JobsiteYearMasterReportItemSnippetFragmentDoc = gql`
  fragment JobsiteYearMasterReportItemSnippet on JobsiteYearMasterReportItemClass {
    _id
    report {
      _id
    }
    summary {
      ...OnSiteSummaryReportSnippet
    }
  }
  ${OnSiteSummaryReportSnippetFragmentDoc}
`;
export const JobsiteYearMasterReportFullSnippetFragmentDoc = gql`
  fragment JobsiteYearMasterReportFullSnippet on JobsiteYearMasterReportClass {
    ...JobsiteYearMasterReportCardSnippet
    reports {
      ...JobsiteYearMasterReportItemSnippet
    }
    crewTypes
    summary {
      externalExpenseInvoiceValue
      internalExpenseInvoiceValue
      accrualExpenseInvoiceValue
      externalRevenueInvoiceValue
      internalRevenueInvoiceValue
      accrualRevenueInvoiceValue
    }
    excelDownloadUrl
  }
  ${JobsiteYearMasterReportCardSnippetFragmentDoc}
  ${JobsiteYearMasterReportItemSnippetFragmentDoc}
`;
export const JobsiteYearReportCardSnippetFragmentDoc = gql`
  fragment JobsiteYearReportCardSnippet on JobsiteYearReportClass {
    _id
    startOfYear
    update {
      ...UpdateSnippet
    }
    jobsite {
      ...JobsiteCardSnippet
    }
  }
  ${UpdateSnippetFragmentDoc}
  ${JobsiteCardSnippetFragmentDoc}
`;
export const JobsiteYearReportFullSnippetFragmentDoc = gql`
  fragment JobsiteYearReportFullSnippet on JobsiteYearReportClass {
    ...JobsiteYearReportCardSnippet
    crewTypes
    dayReports {
      ...JobsiteDayReportFullSnippet
    }
    expenseInvoices {
      ...JobsiteDayReportInvoiceSnippet
    }
    revenueInvoices {
      ...JobsiteDayReportInvoiceSnippet
    }
    summary {
      externalExpenseInvoiceValue
      internalExpenseInvoiceValue
      accrualExpenseInvoiceValue
      externalRevenueInvoiceValue
      internalRevenueInvoiceValue
      accrualRevenueInvoiceValue
    }
    issues {
      ...ReportIssueSnippet
    }
    excelDownloadUrl
  }
  ${JobsiteYearReportCardSnippetFragmentDoc}
  ${JobsiteDayReportFullSnippetFragmentDoc}
  ${JobsiteDayReportInvoiceSnippetFragmentDoc}
  ${ReportIssueSnippetFragmentDoc}
`;
export const JobsiteYearReportSummarySnippetFragmentDoc = gql`
  fragment JobsiteYearReportSummarySnippet on JobsiteYearReportClass {
    ...JobsiteYearReportCardSnippet
    crewTypes
    summary {
      externalExpenseInvoiceValue
      internalExpenseInvoiceValue
      accrualExpenseInvoiceValue
      externalRevenueInvoiceValue
      internalRevenueInvoiceValue
      accrualRevenueInvoiceValue
    }
    issues {
      ...ReportIssueSnippet
    }
  }
  ${JobsiteYearReportCardSnippetFragmentDoc}
  ${ReportIssueSnippetFragmentDoc}
`;
export const CrewCardSnippetFragmentDoc = gql`
  fragment CrewCardSnippet on CrewClass {
    _id
    name
  }
`;
export const DailyReportCardSnippetFragmentDoc = gql`
  fragment DailyReportCardSnippet on DailyReportClass {
    _id
    date
    jobCostApproved
    payrollComplete
    jobsite {
      _id
      name
    }
    crew {
      _id
      name
    }
  }
`;
export const JobsiteFullSnippetFragmentDoc = gql`
  fragment JobsiteFullSnippet on JobsiteClass {
    _id
    name
    jobcode
    description
    location_url
    active
    crews {
      ...CrewCardSnippet
    }
    monthReports {
      ...JobsiteMonthReportCardSnippet
    }
    yearReports {
      ...JobsiteYearReportCardSnippet
    }
    dailyReports {
      ...DailyReportCardSnippet
    }
    expenseInvoices {
      ...InvoiceCardSnippet
    }
    revenueInvoices {
      ...InvoiceCardSnippet
    }
    truckingRates {
      ...TruckingTypeRateSnippet
    }
    fileObjects {
      _id
      minRole
      file {
        ...FilePreloadSnippet
      }
    }
  }
  ${CrewCardSnippetFragmentDoc}
  ${JobsiteMonthReportCardSnippetFragmentDoc}
  ${JobsiteYearReportCardSnippetFragmentDoc}
  ${DailyReportCardSnippetFragmentDoc}
  ${InvoiceCardSnippetFragmentDoc}
  ${TruckingTypeRateSnippetFragmentDoc}
  ${FilePreloadSnippetFragmentDoc}
`;
export const JobsiteMaterialsSnippetFragmentDoc = gql`
  fragment JobsiteMaterialsSnippet on JobsiteClass {
    _id
    materials {
      ...JobsiteMaterialCardSnippet
    }
  }
  ${JobsiteMaterialCardSnippetFragmentDoc}
`;
export const DailyReportForMaterialShipmentSnippetFragmentDoc = gql`
  fragment DailyReportForMaterialShipmentSnippet on DailyReportClass {
    _id
    date
    jobsite {
      materials {
        ...JobsiteMaterialCardSnippet
      }
      truckingRates {
        ...TruckingTypeRateSnippet
      }
    }
  }
  ${JobsiteMaterialCardSnippetFragmentDoc}
  ${TruckingTypeRateSnippetFragmentDoc}
`;
export const MaterialShipmentNonCostedSnippetFragmentDoc = gql`
  fragment MaterialShipmentNonCostedSnippet on MaterialShipmentClass {
    dailyReport {
      ...DailyReportForMaterialShipmentSnippet
    }
    ...MaterialShipmentCardSnippet
  }
  ${DailyReportForMaterialShipmentSnippetFragmentDoc}
  ${MaterialShipmentCardSnippetFragmentDoc}
`;
export const JobsiteNonCostedMaterialsSnippetFragmentDoc = gql`
  fragment JobsiteNonCostedMaterialsSnippet on JobsiteClass {
    _id
    nonCostedMaterialShipments {
      ...MaterialShipmentNonCostedSnippet
    }
  }
  ${MaterialShipmentNonCostedSnippetFragmentDoc}
`;
export const JobsiteSsrSnippetFragmentDoc = gql`
  fragment JobsiteSSRSnippet on JobsiteClass {
    _id
    name
    jobcode
  }
`;
export const JobsiteSearchSnippetFragmentDoc = gql`
  fragment JobsiteSearchSnippet on JobsiteClass {
    _id
    name
    jobcode
  }
`;
export const JobsiteTruckingRatesSnippetFragmentDoc = gql`
  fragment JobsiteTruckingRatesSnippet on JobsiteClass {
    ...JobsiteCardSnippet
    truckingRates {
      ...TruckingTypeRateSnippet
    }
  }
  ${JobsiteCardSnippetFragmentDoc}
  ${TruckingTypeRateSnippetFragmentDoc}
`;
export const MaterialFullSnippetFragmentDoc = gql`
  fragment MaterialFullSnippet on MaterialClass {
    ...MaterialCardSnippet
    canRemove
  }
  ${MaterialCardSnippetFragmentDoc}
`;
export const SearchSnippetFragmentDoc = gql`
  fragment SearchSnippet on SearchClass {
    score
    employee {
      _id
      name
      jobTitle
    }
    vehicle {
      _id
      name
      vehicleType
      vehicleCode
    }
    jobsite {
      ...JobsiteCardSnippet
    }
    dailyReport {
      ...DailyReportCardSnippet
    }
    crew {
      ...CrewCardSnippet
    }
  }
  ${JobsiteCardSnippetFragmentDoc}
  ${DailyReportCardSnippetFragmentDoc}
  ${CrewCardSnippetFragmentDoc}
`;
export const SignupFullSnippetFragmentDoc = gql`
  fragment SignupFullSnippet on SignupClass {
    _id
    employee {
      _id
      name
    }
  }
`;
export const DefaultRateSnippetFragmentDoc = gql`
  fragment DefaultRateSnippet on DefaultRateClass {
    _id
    title
    rates {
      rate
      date
    }
  }
`;
export const SystemSnippetFragmentDoc = gql`
  fragment SystemSnippet on SystemClass {
    unitDefaults
    laborTypes
    companyVehicleTypeDefaults {
      ...DefaultRateSnippet
    }
    materialShipmentVehicleTypeDefaults {
      ...DefaultRateSnippet
    }
    internalExpenseOverheadRate
  }
  ${DefaultRateSnippetFragmentDoc}
`;
export const FullUserSnippetFragmentDoc = gql`
  fragment FullUserSnippet on UserClass {
    ...UserCardSnippet
    employee {
      _id
      name
      jobTitle
      crews {
        ...CrewCardSnippet
      }
    }
    settings {
      homeView
    }
  }
  ${UserCardSnippetFragmentDoc}
  ${CrewCardSnippetFragmentDoc}
`;
export const VehicleFullSnippetFragmentDoc = gql`
  fragment VehicleFullSnippet on VehicleClass {
    ...VehicleCardSnippet
    currentRate
    crews {
      ...CrewCardSnippet
    }
  }
  ${VehicleCardSnippetFragmentDoc}
  ${CrewCardSnippetFragmentDoc}
`;
export const VehicleSsrSnippetFragmentDoc = gql`
  fragment VehicleSSRSnippet on VehicleClass {
    _id
    name
    vehicleCode
    vehicleType
  }
`;
export const VehicleSearchSnippetFragmentDoc = gql`
  fragment VehicleSearchSnippet on VehicleClass {
    _id
    name
    vehicleCode
    vehicleType
  }
`;
export const CompanyCreateDocument = gql`
  mutation CompanyCreate($data: CompanyCreateData!) {
    companyCreate(data: $data) {
      ...CompanyCardSnippet
    }
  }
  ${CompanyCardSnippetFragmentDoc}
`;
export type CompanyCreateMutationFn = Apollo.MutationFunction<
  CompanyCreateMutation,
  CompanyCreateMutationVariables
>;

/**
 * __useCompanyCreateMutation__
 *
 * To run a mutation, you first call `useCompanyCreateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCompanyCreateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [companyCreateMutation, { data, loading, error }] = useCompanyCreateMutation({
 *   variables: {
 *      data: // value for 'data'
 *   },
 * });
 */
export function useCompanyCreateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CompanyCreateMutation,
    CompanyCreateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    CompanyCreateMutation,
    CompanyCreateMutationVariables
  >(CompanyCreateDocument, options);
}
export type CompanyCreateMutationHookResult = ReturnType<
  typeof useCompanyCreateMutation
>;
export type CompanyCreateMutationResult =
  Apollo.MutationResult<CompanyCreateMutation>;
export type CompanyCreateMutationOptions = Apollo.BaseMutationOptions<
  CompanyCreateMutation,
  CompanyCreateMutationVariables
>;
export const CrewAddEmployeeDocument = gql`
  mutation CrewAddEmployee($crewId: String!, $employeeId: String!) {
    crewAddEmployee(crewId: $crewId, employeeId: $employeeId) {
      ...CrewFullSnippet
    }
  }
  ${CrewFullSnippetFragmentDoc}
`;
export type CrewAddEmployeeMutationFn = Apollo.MutationFunction<
  CrewAddEmployeeMutation,
  CrewAddEmployeeMutationVariables
>;

/**
 * __useCrewAddEmployeeMutation__
 *
 * To run a mutation, you first call `useCrewAddEmployeeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCrewAddEmployeeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [crewAddEmployeeMutation, { data, loading, error }] = useCrewAddEmployeeMutation({
 *   variables: {
 *      crewId: // value for 'crewId'
 *      employeeId: // value for 'employeeId'
 *   },
 * });
 */
export function useCrewAddEmployeeMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CrewAddEmployeeMutation,
    CrewAddEmployeeMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    CrewAddEmployeeMutation,
    CrewAddEmployeeMutationVariables
  >(CrewAddEmployeeDocument, options);
}
export type CrewAddEmployeeMutationHookResult = ReturnType<
  typeof useCrewAddEmployeeMutation
>;
export type CrewAddEmployeeMutationResult =
  Apollo.MutationResult<CrewAddEmployeeMutation>;
export type CrewAddEmployeeMutationOptions = Apollo.BaseMutationOptions<
  CrewAddEmployeeMutation,
  CrewAddEmployeeMutationVariables
>;
export const CrewAddVehicleDocument = gql`
  mutation CrewAddVehicle($crewId: String!, $vehicleId: String!) {
    crewAddVehicle(crewId: $crewId, vehicleId: $vehicleId) {
      ...CrewFullSnippet
    }
  }
  ${CrewFullSnippetFragmentDoc}
`;
export type CrewAddVehicleMutationFn = Apollo.MutationFunction<
  CrewAddVehicleMutation,
  CrewAddVehicleMutationVariables
>;

/**
 * __useCrewAddVehicleMutation__
 *
 * To run a mutation, you first call `useCrewAddVehicleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCrewAddVehicleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [crewAddVehicleMutation, { data, loading, error }] = useCrewAddVehicleMutation({
 *   variables: {
 *      crewId: // value for 'crewId'
 *      vehicleId: // value for 'vehicleId'
 *   },
 * });
 */
export function useCrewAddVehicleMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CrewAddVehicleMutation,
    CrewAddVehicleMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    CrewAddVehicleMutation,
    CrewAddVehicleMutationVariables
  >(CrewAddVehicleDocument, options);
}
export type CrewAddVehicleMutationHookResult = ReturnType<
  typeof useCrewAddVehicleMutation
>;
export type CrewAddVehicleMutationResult =
  Apollo.MutationResult<CrewAddVehicleMutation>;
export type CrewAddVehicleMutationOptions = Apollo.BaseMutationOptions<
  CrewAddVehicleMutation,
  CrewAddVehicleMutationVariables
>;
export const CrewArchiveDocument = gql`
  mutation CrewArchive($id: ID!) {
    crewArchive(id: $id) {
      _id
    }
  }
`;
export type CrewArchiveMutationFn = Apollo.MutationFunction<
  CrewArchiveMutation,
  CrewArchiveMutationVariables
>;

/**
 * __useCrewArchiveMutation__
 *
 * To run a mutation, you first call `useCrewArchiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCrewArchiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [crewArchiveMutation, { data, loading, error }] = useCrewArchiveMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useCrewArchiveMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CrewArchiveMutation,
    CrewArchiveMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<CrewArchiveMutation, CrewArchiveMutationVariables>(
    CrewArchiveDocument,
    options
  );
}
export type CrewArchiveMutationHookResult = ReturnType<
  typeof useCrewArchiveMutation
>;
export type CrewArchiveMutationResult =
  Apollo.MutationResult<CrewArchiveMutation>;
export type CrewArchiveMutationOptions = Apollo.BaseMutationOptions<
  CrewArchiveMutation,
  CrewArchiveMutationVariables
>;
export const CrewCreateDocument = gql`
  mutation CrewCreate($data: CrewCreateData!) {
    crewCreate(data: $data) {
      ...CrewFullSnippet
    }
  }
  ${CrewFullSnippetFragmentDoc}
`;
export type CrewCreateMutationFn = Apollo.MutationFunction<
  CrewCreateMutation,
  CrewCreateMutationVariables
>;

/**
 * __useCrewCreateMutation__
 *
 * To run a mutation, you first call `useCrewCreateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCrewCreateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [crewCreateMutation, { data, loading, error }] = useCrewCreateMutation({
 *   variables: {
 *      data: // value for 'data'
 *   },
 * });
 */
export function useCrewCreateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CrewCreateMutation,
    CrewCreateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<CrewCreateMutation, CrewCreateMutationVariables>(
    CrewCreateDocument,
    options
  );
}
export type CrewCreateMutationHookResult = ReturnType<
  typeof useCrewCreateMutation
>;
export type CrewCreateMutationResult =
  Apollo.MutationResult<CrewCreateMutation>;
export type CrewCreateMutationOptions = Apollo.BaseMutationOptions<
  CrewCreateMutation,
  CrewCreateMutationVariables
>;
export const CrewRemoveEmployeeDocument = gql`
  mutation CrewRemoveEmployee($crewId: String!, $employeeId: String!) {
    crewRemoveEmployee(crewId: $crewId, employeeId: $employeeId) {
      ...CrewFullSnippet
    }
  }
  ${CrewFullSnippetFragmentDoc}
`;
export type CrewRemoveEmployeeMutationFn = Apollo.MutationFunction<
  CrewRemoveEmployeeMutation,
  CrewRemoveEmployeeMutationVariables
>;

/**
 * __useCrewRemoveEmployeeMutation__
 *
 * To run a mutation, you first call `useCrewRemoveEmployeeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCrewRemoveEmployeeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [crewRemoveEmployeeMutation, { data, loading, error }] = useCrewRemoveEmployeeMutation({
 *   variables: {
 *      crewId: // value for 'crewId'
 *      employeeId: // value for 'employeeId'
 *   },
 * });
 */
export function useCrewRemoveEmployeeMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CrewRemoveEmployeeMutation,
    CrewRemoveEmployeeMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    CrewRemoveEmployeeMutation,
    CrewRemoveEmployeeMutationVariables
  >(CrewRemoveEmployeeDocument, options);
}
export type CrewRemoveEmployeeMutationHookResult = ReturnType<
  typeof useCrewRemoveEmployeeMutation
>;
export type CrewRemoveEmployeeMutationResult =
  Apollo.MutationResult<CrewRemoveEmployeeMutation>;
export type CrewRemoveEmployeeMutationOptions = Apollo.BaseMutationOptions<
  CrewRemoveEmployeeMutation,
  CrewRemoveEmployeeMutationVariables
>;
export const CrewRemoveVehicleDocument = gql`
  mutation CrewRemoveVehicle($crewId: String!, $vehicleId: String!) {
    crewRemoveVehicle(crewId: $crewId, vehicleId: $vehicleId) {
      ...CrewFullSnippet
    }
  }
  ${CrewFullSnippetFragmentDoc}
`;
export type CrewRemoveVehicleMutationFn = Apollo.MutationFunction<
  CrewRemoveVehicleMutation,
  CrewRemoveVehicleMutationVariables
>;

/**
 * __useCrewRemoveVehicleMutation__
 *
 * To run a mutation, you first call `useCrewRemoveVehicleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCrewRemoveVehicleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [crewRemoveVehicleMutation, { data, loading, error }] = useCrewRemoveVehicleMutation({
 *   variables: {
 *      crewId: // value for 'crewId'
 *      vehicleId: // value for 'vehicleId'
 *   },
 * });
 */
export function useCrewRemoveVehicleMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CrewRemoveVehicleMutation,
    CrewRemoveVehicleMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    CrewRemoveVehicleMutation,
    CrewRemoveVehicleMutationVariables
  >(CrewRemoveVehicleDocument, options);
}
export type CrewRemoveVehicleMutationHookResult = ReturnType<
  typeof useCrewRemoveVehicleMutation
>;
export type CrewRemoveVehicleMutationResult =
  Apollo.MutationResult<CrewRemoveVehicleMutation>;
export type CrewRemoveVehicleMutationOptions = Apollo.BaseMutationOptions<
  CrewRemoveVehicleMutation,
  CrewRemoveVehicleMutationVariables
>;
export const CrewUpdateDocument = gql`
  mutation CrewUpdate($id: ID!, $data: CrewUpdateData!) {
    crewUpdate(id: $id, data: $data) {
      ...CrewFullSnippet
    }
  }
  ${CrewFullSnippetFragmentDoc}
`;
export type CrewUpdateMutationFn = Apollo.MutationFunction<
  CrewUpdateMutation,
  CrewUpdateMutationVariables
>;

/**
 * __useCrewUpdateMutation__
 *
 * To run a mutation, you first call `useCrewUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCrewUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [crewUpdateMutation, { data, loading, error }] = useCrewUpdateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useCrewUpdateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CrewUpdateMutation,
    CrewUpdateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<CrewUpdateMutation, CrewUpdateMutationVariables>(
    CrewUpdateDocument,
    options
  );
}
export type CrewUpdateMutationHookResult = ReturnType<
  typeof useCrewUpdateMutation
>;
export type CrewUpdateMutationResult =
  Apollo.MutationResult<CrewUpdateMutation>;
export type CrewUpdateMutationOptions = Apollo.BaseMutationOptions<
  CrewUpdateMutation,
  CrewUpdateMutationVariables
>;
export const DailyReportAddNoteFileDocument = gql`
  mutation DailyReportAddNoteFile(
    $dailyReportId: String!
    $data: FileCreateData!
  ) {
    dailyReportAddNoteFile(id: $dailyReportId, data: $data) {
      ...DailyReportFullSnippet
    }
  }
  ${DailyReportFullSnippetFragmentDoc}
`;
export type DailyReportAddNoteFileMutationFn = Apollo.MutationFunction<
  DailyReportAddNoteFileMutation,
  DailyReportAddNoteFileMutationVariables
>;

/**
 * __useDailyReportAddNoteFileMutation__
 *
 * To run a mutation, you first call `useDailyReportAddNoteFileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDailyReportAddNoteFileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dailyReportAddNoteFileMutation, { data, loading, error }] = useDailyReportAddNoteFileMutation({
 *   variables: {
 *      dailyReportId: // value for 'dailyReportId'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useDailyReportAddNoteFileMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DailyReportAddNoteFileMutation,
    DailyReportAddNoteFileMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DailyReportAddNoteFileMutation,
    DailyReportAddNoteFileMutationVariables
  >(DailyReportAddNoteFileDocument, options);
}
export type DailyReportAddNoteFileMutationHookResult = ReturnType<
  typeof useDailyReportAddNoteFileMutation
>;
export type DailyReportAddNoteFileMutationResult =
  Apollo.MutationResult<DailyReportAddNoteFileMutation>;
export type DailyReportAddNoteFileMutationOptions = Apollo.BaseMutationOptions<
  DailyReportAddNoteFileMutation,
  DailyReportAddNoteFileMutationVariables
>;
export const DailyReportAddTemporaryEmployeeDocument = gql`
  mutation DailyReportAddTemporaryEmployee($id: String!, $employeeId: String!) {
    dailyReportAddTemporaryEmployee(id: $id, employeeId: $employeeId) {
      ...DailyReportFullSnippet
    }
  }
  ${DailyReportFullSnippetFragmentDoc}
`;
export type DailyReportAddTemporaryEmployeeMutationFn = Apollo.MutationFunction<
  DailyReportAddTemporaryEmployeeMutation,
  DailyReportAddTemporaryEmployeeMutationVariables
>;

/**
 * __useDailyReportAddTemporaryEmployeeMutation__
 *
 * To run a mutation, you first call `useDailyReportAddTemporaryEmployeeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDailyReportAddTemporaryEmployeeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dailyReportAddTemporaryEmployeeMutation, { data, loading, error }] = useDailyReportAddTemporaryEmployeeMutation({
 *   variables: {
 *      id: // value for 'id'
 *      employeeId: // value for 'employeeId'
 *   },
 * });
 */
export function useDailyReportAddTemporaryEmployeeMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DailyReportAddTemporaryEmployeeMutation,
    DailyReportAddTemporaryEmployeeMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DailyReportAddTemporaryEmployeeMutation,
    DailyReportAddTemporaryEmployeeMutationVariables
  >(DailyReportAddTemporaryEmployeeDocument, options);
}
export type DailyReportAddTemporaryEmployeeMutationHookResult = ReturnType<
  typeof useDailyReportAddTemporaryEmployeeMutation
>;
export type DailyReportAddTemporaryEmployeeMutationResult =
  Apollo.MutationResult<DailyReportAddTemporaryEmployeeMutation>;
export type DailyReportAddTemporaryEmployeeMutationOptions =
  Apollo.BaseMutationOptions<
    DailyReportAddTemporaryEmployeeMutation,
    DailyReportAddTemporaryEmployeeMutationVariables
  >;
export const DailyReportAddTemporaryVehicleDocument = gql`
  mutation DailyReportAddTemporaryVehicle($id: String!, $vehicleId: String!) {
    dailyReportAddTemporaryVehicle(id: $id, vehicleId: $vehicleId) {
      ...DailyReportFullSnippet
    }
  }
  ${DailyReportFullSnippetFragmentDoc}
`;
export type DailyReportAddTemporaryVehicleMutationFn = Apollo.MutationFunction<
  DailyReportAddTemporaryVehicleMutation,
  DailyReportAddTemporaryVehicleMutationVariables
>;

/**
 * __useDailyReportAddTemporaryVehicleMutation__
 *
 * To run a mutation, you first call `useDailyReportAddTemporaryVehicleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDailyReportAddTemporaryVehicleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dailyReportAddTemporaryVehicleMutation, { data, loading, error }] = useDailyReportAddTemporaryVehicleMutation({
 *   variables: {
 *      id: // value for 'id'
 *      vehicleId: // value for 'vehicleId'
 *   },
 * });
 */
export function useDailyReportAddTemporaryVehicleMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DailyReportAddTemporaryVehicleMutation,
    DailyReportAddTemporaryVehicleMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DailyReportAddTemporaryVehicleMutation,
    DailyReportAddTemporaryVehicleMutationVariables
  >(DailyReportAddTemporaryVehicleDocument, options);
}
export type DailyReportAddTemporaryVehicleMutationHookResult = ReturnType<
  typeof useDailyReportAddTemporaryVehicleMutation
>;
export type DailyReportAddTemporaryVehicleMutationResult =
  Apollo.MutationResult<DailyReportAddTemporaryVehicleMutation>;
export type DailyReportAddTemporaryVehicleMutationOptions =
  Apollo.BaseMutationOptions<
    DailyReportAddTemporaryVehicleMutation,
    DailyReportAddTemporaryVehicleMutationVariables
  >;
export const DailyReportArchiveDocument = gql`
  mutation DailyReportArchive($id: ID!) {
    dailyReportArchive(id: $id) {
      _id
    }
  }
`;
export type DailyReportArchiveMutationFn = Apollo.MutationFunction<
  DailyReportArchiveMutation,
  DailyReportArchiveMutationVariables
>;

/**
 * __useDailyReportArchiveMutation__
 *
 * To run a mutation, you first call `useDailyReportArchiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDailyReportArchiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dailyReportArchiveMutation, { data, loading, error }] = useDailyReportArchiveMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDailyReportArchiveMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DailyReportArchiveMutation,
    DailyReportArchiveMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DailyReportArchiveMutation,
    DailyReportArchiveMutationVariables
  >(DailyReportArchiveDocument, options);
}
export type DailyReportArchiveMutationHookResult = ReturnType<
  typeof useDailyReportArchiveMutation
>;
export type DailyReportArchiveMutationResult =
  Apollo.MutationResult<DailyReportArchiveMutation>;
export type DailyReportArchiveMutationOptions = Apollo.BaseMutationOptions<
  DailyReportArchiveMutation,
  DailyReportArchiveMutationVariables
>;
export const DailyReportCreateDocument = gql`
  mutation DailyReportCreate($data: DailyReportCreateData!) {
    dailyReportCreate(data: $data) {
      ...DailyReportFullSnippet
    }
  }
  ${DailyReportFullSnippetFragmentDoc}
`;
export type DailyReportCreateMutationFn = Apollo.MutationFunction<
  DailyReportCreateMutation,
  DailyReportCreateMutationVariables
>;

/**
 * __useDailyReportCreateMutation__
 *
 * To run a mutation, you first call `useDailyReportCreateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDailyReportCreateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dailyReportCreateMutation, { data, loading, error }] = useDailyReportCreateMutation({
 *   variables: {
 *      data: // value for 'data'
 *   },
 * });
 */
export function useDailyReportCreateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DailyReportCreateMutation,
    DailyReportCreateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DailyReportCreateMutation,
    DailyReportCreateMutationVariables
  >(DailyReportCreateDocument, options);
}
export type DailyReportCreateMutationHookResult = ReturnType<
  typeof useDailyReportCreateMutation
>;
export type DailyReportCreateMutationResult =
  Apollo.MutationResult<DailyReportCreateMutation>;
export type DailyReportCreateMutationOptions = Apollo.BaseMutationOptions<
  DailyReportCreateMutation,
  DailyReportCreateMutationVariables
>;
export const DailyReportJobCostApprovalUpdateDocument = gql`
  mutation DailyReportJobCostApprovalUpdate($id: String!, $approved: Boolean!) {
    dailyReportJobCostApprovalUpdate(id: $id, approved: $approved) {
      ...DailyReportFullSnippet
    }
  }
  ${DailyReportFullSnippetFragmentDoc}
`;
export type DailyReportJobCostApprovalUpdateMutationFn =
  Apollo.MutationFunction<
    DailyReportJobCostApprovalUpdateMutation,
    DailyReportJobCostApprovalUpdateMutationVariables
  >;

/**
 * __useDailyReportJobCostApprovalUpdateMutation__
 *
 * To run a mutation, you first call `useDailyReportJobCostApprovalUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDailyReportJobCostApprovalUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dailyReportJobCostApprovalUpdateMutation, { data, loading, error }] = useDailyReportJobCostApprovalUpdateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      approved: // value for 'approved'
 *   },
 * });
 */
export function useDailyReportJobCostApprovalUpdateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DailyReportJobCostApprovalUpdateMutation,
    DailyReportJobCostApprovalUpdateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DailyReportJobCostApprovalUpdateMutation,
    DailyReportJobCostApprovalUpdateMutationVariables
  >(DailyReportJobCostApprovalUpdateDocument, options);
}
export type DailyReportJobCostApprovalUpdateMutationHookResult = ReturnType<
  typeof useDailyReportJobCostApprovalUpdateMutation
>;
export type DailyReportJobCostApprovalUpdateMutationResult =
  Apollo.MutationResult<DailyReportJobCostApprovalUpdateMutation>;
export type DailyReportJobCostApprovalUpdateMutationOptions =
  Apollo.BaseMutationOptions<
    DailyReportJobCostApprovalUpdateMutation,
    DailyReportJobCostApprovalUpdateMutationVariables
  >;
export const DailyReportNoteUpdateDocument = gql`
  mutation DailyReportNoteUpdate(
    $id: String!
    $data: DailyReportNoteUpdateData!
  ) {
    dailyReportNoteUpdate(id: $id, data: $data) {
      ...DailyReportFullSnippet
    }
  }
  ${DailyReportFullSnippetFragmentDoc}
`;
export type DailyReportNoteUpdateMutationFn = Apollo.MutationFunction<
  DailyReportNoteUpdateMutation,
  DailyReportNoteUpdateMutationVariables
>;

/**
 * __useDailyReportNoteUpdateMutation__
 *
 * To run a mutation, you first call `useDailyReportNoteUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDailyReportNoteUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dailyReportNoteUpdateMutation, { data, loading, error }] = useDailyReportNoteUpdateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useDailyReportNoteUpdateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DailyReportNoteUpdateMutation,
    DailyReportNoteUpdateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DailyReportNoteUpdateMutation,
    DailyReportNoteUpdateMutationVariables
  >(DailyReportNoteUpdateDocument, options);
}
export type DailyReportNoteUpdateMutationHookResult = ReturnType<
  typeof useDailyReportNoteUpdateMutation
>;
export type DailyReportNoteUpdateMutationResult =
  Apollo.MutationResult<DailyReportNoteUpdateMutation>;
export type DailyReportNoteUpdateMutationOptions = Apollo.BaseMutationOptions<
  DailyReportNoteUpdateMutation,
  DailyReportNoteUpdateMutationVariables
>;
export const DailyReportPayrollCompleteUpdateDocument = gql`
  mutation DailyReportPayrollCompleteUpdate($id: String!, $complete: Boolean!) {
    dailyReportPayrollCompleteUpdate(id: $id, complete: $complete) {
      ...DailyReportFullSnippet
    }
  }
  ${DailyReportFullSnippetFragmentDoc}
`;
export type DailyReportPayrollCompleteUpdateMutationFn =
  Apollo.MutationFunction<
    DailyReportPayrollCompleteUpdateMutation,
    DailyReportPayrollCompleteUpdateMutationVariables
  >;

/**
 * __useDailyReportPayrollCompleteUpdateMutation__
 *
 * To run a mutation, you first call `useDailyReportPayrollCompleteUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDailyReportPayrollCompleteUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dailyReportPayrollCompleteUpdateMutation, { data, loading, error }] = useDailyReportPayrollCompleteUpdateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      complete: // value for 'complete'
 *   },
 * });
 */
export function useDailyReportPayrollCompleteUpdateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DailyReportPayrollCompleteUpdateMutation,
    DailyReportPayrollCompleteUpdateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DailyReportPayrollCompleteUpdateMutation,
    DailyReportPayrollCompleteUpdateMutationVariables
  >(DailyReportPayrollCompleteUpdateDocument, options);
}
export type DailyReportPayrollCompleteUpdateMutationHookResult = ReturnType<
  typeof useDailyReportPayrollCompleteUpdateMutation
>;
export type DailyReportPayrollCompleteUpdateMutationResult =
  Apollo.MutationResult<DailyReportPayrollCompleteUpdateMutation>;
export type DailyReportPayrollCompleteUpdateMutationOptions =
  Apollo.BaseMutationOptions<
    DailyReportPayrollCompleteUpdateMutation,
    DailyReportPayrollCompleteUpdateMutationVariables
  >;
export const DailyReportUpdateDocument = gql`
  mutation DailyReportUpdate($id: String!, $data: DailyReportUpdateData!) {
    dailyReportUpdate(id: $id, data: $data) {
      ...DailyReportFullSnippet
    }
  }
  ${DailyReportFullSnippetFragmentDoc}
`;
export type DailyReportUpdateMutationFn = Apollo.MutationFunction<
  DailyReportUpdateMutation,
  DailyReportUpdateMutationVariables
>;

/**
 * __useDailyReportUpdateMutation__
 *
 * To run a mutation, you first call `useDailyReportUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDailyReportUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dailyReportUpdateMutation, { data, loading, error }] = useDailyReportUpdateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useDailyReportUpdateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DailyReportUpdateMutation,
    DailyReportUpdateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DailyReportUpdateMutation,
    DailyReportUpdateMutationVariables
  >(DailyReportUpdateDocument, options);
}
export type DailyReportUpdateMutationHookResult = ReturnType<
  typeof useDailyReportUpdateMutation
>;
export type DailyReportUpdateMutationResult =
  Apollo.MutationResult<DailyReportUpdateMutation>;
export type DailyReportUpdateMutationOptions = Apollo.BaseMutationOptions<
  DailyReportUpdateMutation,
  DailyReportUpdateMutationVariables
>;
export const EmployeeArchiveDocument = gql`
  mutation EmployeeArchive($id: ID!) {
    employeeArchive(id: $id) {
      _id
    }
  }
`;
export type EmployeeArchiveMutationFn = Apollo.MutationFunction<
  EmployeeArchiveMutation,
  EmployeeArchiveMutationVariables
>;

/**
 * __useEmployeeArchiveMutation__
 *
 * To run a mutation, you first call `useEmployeeArchiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEmployeeArchiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [employeeArchiveMutation, { data, loading, error }] = useEmployeeArchiveMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useEmployeeArchiveMutation(
  baseOptions?: Apollo.MutationHookOptions<
    EmployeeArchiveMutation,
    EmployeeArchiveMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    EmployeeArchiveMutation,
    EmployeeArchiveMutationVariables
  >(EmployeeArchiveDocument, options);
}
export type EmployeeArchiveMutationHookResult = ReturnType<
  typeof useEmployeeArchiveMutation
>;
export type EmployeeArchiveMutationResult =
  Apollo.MutationResult<EmployeeArchiveMutation>;
export type EmployeeArchiveMutationOptions = Apollo.BaseMutationOptions<
  EmployeeArchiveMutation,
  EmployeeArchiveMutationVariables
>;
export const EmployeeCreateDocument = gql`
  mutation EmployeeCreate($data: EmployeeCreateData!, $crewId: String) {
    employeeCreate(data: $data, crewId: $crewId) {
      ...EmployeeCardSnippet
    }
  }
  ${EmployeeCardSnippetFragmentDoc}
`;
export type EmployeeCreateMutationFn = Apollo.MutationFunction<
  EmployeeCreateMutation,
  EmployeeCreateMutationVariables
>;

/**
 * __useEmployeeCreateMutation__
 *
 * To run a mutation, you first call `useEmployeeCreateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEmployeeCreateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [employeeCreateMutation, { data, loading, error }] = useEmployeeCreateMutation({
 *   variables: {
 *      data: // value for 'data'
 *      crewId: // value for 'crewId'
 *   },
 * });
 */
export function useEmployeeCreateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    EmployeeCreateMutation,
    EmployeeCreateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    EmployeeCreateMutation,
    EmployeeCreateMutationVariables
  >(EmployeeCreateDocument, options);
}
export type EmployeeCreateMutationHookResult = ReturnType<
  typeof useEmployeeCreateMutation
>;
export type EmployeeCreateMutationResult =
  Apollo.MutationResult<EmployeeCreateMutation>;
export type EmployeeCreateMutationOptions = Apollo.BaseMutationOptions<
  EmployeeCreateMutation,
  EmployeeCreateMutationVariables
>;
export const EmployeeUpdateDocument = gql`
  mutation EmployeeUpdate($id: ID!, $data: EmployeeUpdateData!) {
    employeeUpdate(id: $id, data: $data) {
      ...EmployeeFullSnippet
    }
  }
  ${EmployeeFullSnippetFragmentDoc}
`;
export type EmployeeUpdateMutationFn = Apollo.MutationFunction<
  EmployeeUpdateMutation,
  EmployeeUpdateMutationVariables
>;

/**
 * __useEmployeeUpdateMutation__
 *
 * To run a mutation, you first call `useEmployeeUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEmployeeUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [employeeUpdateMutation, { data, loading, error }] = useEmployeeUpdateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useEmployeeUpdateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    EmployeeUpdateMutation,
    EmployeeUpdateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    EmployeeUpdateMutation,
    EmployeeUpdateMutationVariables
  >(EmployeeUpdateDocument, options);
}
export type EmployeeUpdateMutationHookResult = ReturnType<
  typeof useEmployeeUpdateMutation
>;
export type EmployeeUpdateMutationResult =
  Apollo.MutationResult<EmployeeUpdateMutation>;
export type EmployeeUpdateMutationOptions = Apollo.BaseMutationOptions<
  EmployeeUpdateMutation,
  EmployeeUpdateMutationVariables
>;
export const EmployeeUpdateRatesDocument = gql`
  mutation EmployeeUpdateRates($id: String!, $data: [RatesData!]!) {
    employeeUpdateRates(id: $id, data: $data) {
      ...EmployeeCardSnippet
    }
  }
  ${EmployeeCardSnippetFragmentDoc}
`;
export type EmployeeUpdateRatesMutationFn = Apollo.MutationFunction<
  EmployeeUpdateRatesMutation,
  EmployeeUpdateRatesMutationVariables
>;

/**
 * __useEmployeeUpdateRatesMutation__
 *
 * To run a mutation, you first call `useEmployeeUpdateRatesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEmployeeUpdateRatesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [employeeUpdateRatesMutation, { data, loading, error }] = useEmployeeUpdateRatesMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useEmployeeUpdateRatesMutation(
  baseOptions?: Apollo.MutationHookOptions<
    EmployeeUpdateRatesMutation,
    EmployeeUpdateRatesMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    EmployeeUpdateRatesMutation,
    EmployeeUpdateRatesMutationVariables
  >(EmployeeUpdateRatesDocument, options);
}
export type EmployeeUpdateRatesMutationHookResult = ReturnType<
  typeof useEmployeeUpdateRatesMutation
>;
export type EmployeeUpdateRatesMutationResult =
  Apollo.MutationResult<EmployeeUpdateRatesMutation>;
export type EmployeeUpdateRatesMutationOptions = Apollo.BaseMutationOptions<
  EmployeeUpdateRatesMutation,
  EmployeeUpdateRatesMutationVariables
>;
export const EmployeeWorkCreateDocument = gql`
  mutation EmployeeWorkCreate(
    $dailyReportId: String!
    $data: [EmployeeWorkCreateData!]!
  ) {
    employeeWorkCreate(dailyReportId: $dailyReportId, data: $data) {
      ...EmployeeWorkCardSnippet
    }
  }
  ${EmployeeWorkCardSnippetFragmentDoc}
`;
export type EmployeeWorkCreateMutationFn = Apollo.MutationFunction<
  EmployeeWorkCreateMutation,
  EmployeeWorkCreateMutationVariables
>;

/**
 * __useEmployeeWorkCreateMutation__
 *
 * To run a mutation, you first call `useEmployeeWorkCreateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEmployeeWorkCreateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [employeeWorkCreateMutation, { data, loading, error }] = useEmployeeWorkCreateMutation({
 *   variables: {
 *      dailyReportId: // value for 'dailyReportId'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useEmployeeWorkCreateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    EmployeeWorkCreateMutation,
    EmployeeWorkCreateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    EmployeeWorkCreateMutation,
    EmployeeWorkCreateMutationVariables
  >(EmployeeWorkCreateDocument, options);
}
export type EmployeeWorkCreateMutationHookResult = ReturnType<
  typeof useEmployeeWorkCreateMutation
>;
export type EmployeeWorkCreateMutationResult =
  Apollo.MutationResult<EmployeeWorkCreateMutation>;
export type EmployeeWorkCreateMutationOptions = Apollo.BaseMutationOptions<
  EmployeeWorkCreateMutation,
  EmployeeWorkCreateMutationVariables
>;
export const EmployeeWorkDeleteDocument = gql`
  mutation EmployeeWorkDelete($id: String!) {
    employeeWorkDelete(id: $id)
  }
`;
export type EmployeeWorkDeleteMutationFn = Apollo.MutationFunction<
  EmployeeWorkDeleteMutation,
  EmployeeWorkDeleteMutationVariables
>;

/**
 * __useEmployeeWorkDeleteMutation__
 *
 * To run a mutation, you first call `useEmployeeWorkDeleteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEmployeeWorkDeleteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [employeeWorkDeleteMutation, { data, loading, error }] = useEmployeeWorkDeleteMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useEmployeeWorkDeleteMutation(
  baseOptions?: Apollo.MutationHookOptions<
    EmployeeWorkDeleteMutation,
    EmployeeWorkDeleteMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    EmployeeWorkDeleteMutation,
    EmployeeWorkDeleteMutationVariables
  >(EmployeeWorkDeleteDocument, options);
}
export type EmployeeWorkDeleteMutationHookResult = ReturnType<
  typeof useEmployeeWorkDeleteMutation
>;
export type EmployeeWorkDeleteMutationResult =
  Apollo.MutationResult<EmployeeWorkDeleteMutation>;
export type EmployeeWorkDeleteMutationOptions = Apollo.BaseMutationOptions<
  EmployeeWorkDeleteMutation,
  EmployeeWorkDeleteMutationVariables
>;
export const EmployeeWorkUpdateDocument = gql`
  mutation EmployeeWorkUpdate($id: String!, $data: EmployeeWorkUpdateData!) {
    employeeWorkUpdate(id: $id, data: $data) {
      ...EmployeeWorkCardSnippet
    }
  }
  ${EmployeeWorkCardSnippetFragmentDoc}
`;
export type EmployeeWorkUpdateMutationFn = Apollo.MutationFunction<
  EmployeeWorkUpdateMutation,
  EmployeeWorkUpdateMutationVariables
>;

/**
 * __useEmployeeWorkUpdateMutation__
 *
 * To run a mutation, you first call `useEmployeeWorkUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEmployeeWorkUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [employeeWorkUpdateMutation, { data, loading, error }] = useEmployeeWorkUpdateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useEmployeeWorkUpdateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    EmployeeWorkUpdateMutation,
    EmployeeWorkUpdateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    EmployeeWorkUpdateMutation,
    EmployeeWorkUpdateMutationVariables
  >(EmployeeWorkUpdateDocument, options);
}
export type EmployeeWorkUpdateMutationHookResult = ReturnType<
  typeof useEmployeeWorkUpdateMutation
>;
export type EmployeeWorkUpdateMutationResult =
  Apollo.MutationResult<EmployeeWorkUpdateMutation>;
export type EmployeeWorkUpdateMutationOptions = Apollo.BaseMutationOptions<
  EmployeeWorkUpdateMutation,
  EmployeeWorkUpdateMutationVariables
>;
export const InvoiceRemoveDocument = gql`
  mutation InvoiceRemove($id: ID!) {
    invoiceRemove(id: $id)
  }
`;
export type InvoiceRemoveMutationFn = Apollo.MutationFunction<
  InvoiceRemoveMutation,
  InvoiceRemoveMutationVariables
>;

/**
 * __useInvoiceRemoveMutation__
 *
 * To run a mutation, you first call `useInvoiceRemoveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useInvoiceRemoveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [invoiceRemoveMutation, { data, loading, error }] = useInvoiceRemoveMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useInvoiceRemoveMutation(
  baseOptions?: Apollo.MutationHookOptions<
    InvoiceRemoveMutation,
    InvoiceRemoveMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    InvoiceRemoveMutation,
    InvoiceRemoveMutationVariables
  >(InvoiceRemoveDocument, options);
}
export type InvoiceRemoveMutationHookResult = ReturnType<
  typeof useInvoiceRemoveMutation
>;
export type InvoiceRemoveMutationResult =
  Apollo.MutationResult<InvoiceRemoveMutation>;
export type InvoiceRemoveMutationOptions = Apollo.BaseMutationOptions<
  InvoiceRemoveMutation,
  InvoiceRemoveMutationVariables
>;
export const InvoiceUpdateForJobsiteDocument = gql`
  mutation InvoiceUpdateForJobsite(
    $id: String!
    $jobsiteId: ID!
    $data: InvoiceData!
  ) {
    invoiceUpdateForJobsite(id: $id, jobsiteId: $jobsiteId, data: $data) {
      ...InvoiceCardSnippet
    }
  }
  ${InvoiceCardSnippetFragmentDoc}
`;
export type InvoiceUpdateForJobsiteMutationFn = Apollo.MutationFunction<
  InvoiceUpdateForJobsiteMutation,
  InvoiceUpdateForJobsiteMutationVariables
>;

/**
 * __useInvoiceUpdateForJobsiteMutation__
 *
 * To run a mutation, you first call `useInvoiceUpdateForJobsiteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useInvoiceUpdateForJobsiteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [invoiceUpdateForJobsiteMutation, { data, loading, error }] = useInvoiceUpdateForJobsiteMutation({
 *   variables: {
 *      id: // value for 'id'
 *      jobsiteId: // value for 'jobsiteId'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useInvoiceUpdateForJobsiteMutation(
  baseOptions?: Apollo.MutationHookOptions<
    InvoiceUpdateForJobsiteMutation,
    InvoiceUpdateForJobsiteMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    InvoiceUpdateForJobsiteMutation,
    InvoiceUpdateForJobsiteMutationVariables
  >(InvoiceUpdateForJobsiteDocument, options);
}
export type InvoiceUpdateForJobsiteMutationHookResult = ReturnType<
  typeof useInvoiceUpdateForJobsiteMutation
>;
export type InvoiceUpdateForJobsiteMutationResult =
  Apollo.MutationResult<InvoiceUpdateForJobsiteMutation>;
export type InvoiceUpdateForJobsiteMutationOptions = Apollo.BaseMutationOptions<
  InvoiceUpdateForJobsiteMutation,
  InvoiceUpdateForJobsiteMutationVariables
>;
export const InvoiceUpdateForJobsiteMaterialDocument = gql`
  mutation InvoiceUpdateForJobsiteMaterial(
    $id: String!
    $jobsiteMaterialId: ID!
    $data: InvoiceData!
  ) {
    invoiceUpdateForJobsiteMaterial(
      id: $id
      jobsiteMaterialId: $jobsiteMaterialId
      data: $data
    ) {
      ...InvoiceCardSnippet
    }
  }
  ${InvoiceCardSnippetFragmentDoc}
`;
export type InvoiceUpdateForJobsiteMaterialMutationFn = Apollo.MutationFunction<
  InvoiceUpdateForJobsiteMaterialMutation,
  InvoiceUpdateForJobsiteMaterialMutationVariables
>;

/**
 * __useInvoiceUpdateForJobsiteMaterialMutation__
 *
 * To run a mutation, you first call `useInvoiceUpdateForJobsiteMaterialMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useInvoiceUpdateForJobsiteMaterialMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [invoiceUpdateForJobsiteMaterialMutation, { data, loading, error }] = useInvoiceUpdateForJobsiteMaterialMutation({
 *   variables: {
 *      id: // value for 'id'
 *      jobsiteMaterialId: // value for 'jobsiteMaterialId'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useInvoiceUpdateForJobsiteMaterialMutation(
  baseOptions?: Apollo.MutationHookOptions<
    InvoiceUpdateForJobsiteMaterialMutation,
    InvoiceUpdateForJobsiteMaterialMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    InvoiceUpdateForJobsiteMaterialMutation,
    InvoiceUpdateForJobsiteMaterialMutationVariables
  >(InvoiceUpdateForJobsiteMaterialDocument, options);
}
export type InvoiceUpdateForJobsiteMaterialMutationHookResult = ReturnType<
  typeof useInvoiceUpdateForJobsiteMaterialMutation
>;
export type InvoiceUpdateForJobsiteMaterialMutationResult =
  Apollo.MutationResult<InvoiceUpdateForJobsiteMaterialMutation>;
export type InvoiceUpdateForJobsiteMaterialMutationOptions =
  Apollo.BaseMutationOptions<
    InvoiceUpdateForJobsiteMaterialMutation,
    InvoiceUpdateForJobsiteMaterialMutationVariables
  >;
export const JobsiteAddDefaultTruckingRateToAllDocument = gql`
  mutation JobsiteAddDefaultTruckingRateToAll(
    $itemIndex: Int!
    $rateIndex: Int!
  ) {
    jobsiteAddDefaultTruckingRateToAll(
      systemRateItemIndex: $itemIndex
      systemRateIndex: $rateIndex
    ) {
      _id
    }
  }
`;
export type JobsiteAddDefaultTruckingRateToAllMutationFn =
  Apollo.MutationFunction<
    JobsiteAddDefaultTruckingRateToAllMutation,
    JobsiteAddDefaultTruckingRateToAllMutationVariables
  >;

/**
 * __useJobsiteAddDefaultTruckingRateToAllMutation__
 *
 * To run a mutation, you first call `useJobsiteAddDefaultTruckingRateToAllMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJobsiteAddDefaultTruckingRateToAllMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [jobsiteAddDefaultTruckingRateToAllMutation, { data, loading, error }] = useJobsiteAddDefaultTruckingRateToAllMutation({
 *   variables: {
 *      itemIndex: // value for 'itemIndex'
 *      rateIndex: // value for 'rateIndex'
 *   },
 * });
 */
export function useJobsiteAddDefaultTruckingRateToAllMutation(
  baseOptions?: Apollo.MutationHookOptions<
    JobsiteAddDefaultTruckingRateToAllMutation,
    JobsiteAddDefaultTruckingRateToAllMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    JobsiteAddDefaultTruckingRateToAllMutation,
    JobsiteAddDefaultTruckingRateToAllMutationVariables
  >(JobsiteAddDefaultTruckingRateToAllDocument, options);
}
export type JobsiteAddDefaultTruckingRateToAllMutationHookResult = ReturnType<
  typeof useJobsiteAddDefaultTruckingRateToAllMutation
>;
export type JobsiteAddDefaultTruckingRateToAllMutationResult =
  Apollo.MutationResult<JobsiteAddDefaultTruckingRateToAllMutation>;
export type JobsiteAddDefaultTruckingRateToAllMutationOptions =
  Apollo.BaseMutationOptions<
    JobsiteAddDefaultTruckingRateToAllMutation,
    JobsiteAddDefaultTruckingRateToAllMutationVariables
  >;
export const JobsiteAddExpenseInvoiceDocument = gql`
  mutation JobsiteAddExpenseInvoice($jobsiteId: String!, $data: InvoiceData!) {
    jobsiteAddExpenseInvoice(jobsiteId: $jobsiteId, data: $data) {
      ...JobsiteFullSnippet
    }
  }
  ${JobsiteFullSnippetFragmentDoc}
`;
export type JobsiteAddExpenseInvoiceMutationFn = Apollo.MutationFunction<
  JobsiteAddExpenseInvoiceMutation,
  JobsiteAddExpenseInvoiceMutationVariables
>;

/**
 * __useJobsiteAddExpenseInvoiceMutation__
 *
 * To run a mutation, you first call `useJobsiteAddExpenseInvoiceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJobsiteAddExpenseInvoiceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [jobsiteAddExpenseInvoiceMutation, { data, loading, error }] = useJobsiteAddExpenseInvoiceMutation({
 *   variables: {
 *      jobsiteId: // value for 'jobsiteId'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useJobsiteAddExpenseInvoiceMutation(
  baseOptions?: Apollo.MutationHookOptions<
    JobsiteAddExpenseInvoiceMutation,
    JobsiteAddExpenseInvoiceMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    JobsiteAddExpenseInvoiceMutation,
    JobsiteAddExpenseInvoiceMutationVariables
  >(JobsiteAddExpenseInvoiceDocument, options);
}
export type JobsiteAddExpenseInvoiceMutationHookResult = ReturnType<
  typeof useJobsiteAddExpenseInvoiceMutation
>;
export type JobsiteAddExpenseInvoiceMutationResult =
  Apollo.MutationResult<JobsiteAddExpenseInvoiceMutation>;
export type JobsiteAddExpenseInvoiceMutationOptions =
  Apollo.BaseMutationOptions<
    JobsiteAddExpenseInvoiceMutation,
    JobsiteAddExpenseInvoiceMutationVariables
  >;
export const JobsiteAddFileObjectDocument = gql`
  mutation JobsiteAddFileObject($id: ID!, $data: JobsiteFileObjectData!) {
    jobsiteAddFileObject(id: $id, data: $data) {
      ...JobsiteFullSnippet
    }
  }
  ${JobsiteFullSnippetFragmentDoc}
`;
export type JobsiteAddFileObjectMutationFn = Apollo.MutationFunction<
  JobsiteAddFileObjectMutation,
  JobsiteAddFileObjectMutationVariables
>;

/**
 * __useJobsiteAddFileObjectMutation__
 *
 * To run a mutation, you first call `useJobsiteAddFileObjectMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJobsiteAddFileObjectMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [jobsiteAddFileObjectMutation, { data, loading, error }] = useJobsiteAddFileObjectMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useJobsiteAddFileObjectMutation(
  baseOptions?: Apollo.MutationHookOptions<
    JobsiteAddFileObjectMutation,
    JobsiteAddFileObjectMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    JobsiteAddFileObjectMutation,
    JobsiteAddFileObjectMutationVariables
  >(JobsiteAddFileObjectDocument, options);
}
export type JobsiteAddFileObjectMutationHookResult = ReturnType<
  typeof useJobsiteAddFileObjectMutation
>;
export type JobsiteAddFileObjectMutationResult =
  Apollo.MutationResult<JobsiteAddFileObjectMutation>;
export type JobsiteAddFileObjectMutationOptions = Apollo.BaseMutationOptions<
  JobsiteAddFileObjectMutation,
  JobsiteAddFileObjectMutationVariables
>;
export const JobsiteAddMaterialDocument = gql`
  mutation JobsiteAddMaterial(
    $jobsiteId: String!
    $data: JobsiteMaterialCreateData!
  ) {
    jobsiteAddMaterial(jobsiteId: $jobsiteId, data: $data) {
      ...JobsiteFullSnippet
    }
  }
  ${JobsiteFullSnippetFragmentDoc}
`;
export type JobsiteAddMaterialMutationFn = Apollo.MutationFunction<
  JobsiteAddMaterialMutation,
  JobsiteAddMaterialMutationVariables
>;

/**
 * __useJobsiteAddMaterialMutation__
 *
 * To run a mutation, you first call `useJobsiteAddMaterialMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJobsiteAddMaterialMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [jobsiteAddMaterialMutation, { data, loading, error }] = useJobsiteAddMaterialMutation({
 *   variables: {
 *      jobsiteId: // value for 'jobsiteId'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useJobsiteAddMaterialMutation(
  baseOptions?: Apollo.MutationHookOptions<
    JobsiteAddMaterialMutation,
    JobsiteAddMaterialMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    JobsiteAddMaterialMutation,
    JobsiteAddMaterialMutationVariables
  >(JobsiteAddMaterialDocument, options);
}
export type JobsiteAddMaterialMutationHookResult = ReturnType<
  typeof useJobsiteAddMaterialMutation
>;
export type JobsiteAddMaterialMutationResult =
  Apollo.MutationResult<JobsiteAddMaterialMutation>;
export type JobsiteAddMaterialMutationOptions = Apollo.BaseMutationOptions<
  JobsiteAddMaterialMutation,
  JobsiteAddMaterialMutationVariables
>;
export const JobsiteAddRevenueInvoiceDocument = gql`
  mutation JobsiteAddRevenueInvoice($jobsiteId: String!, $data: InvoiceData!) {
    jobsiteAddRevenueInvoice(jobsiteId: $jobsiteId, data: $data) {
      ...JobsiteFullSnippet
    }
  }
  ${JobsiteFullSnippetFragmentDoc}
`;
export type JobsiteAddRevenueInvoiceMutationFn = Apollo.MutationFunction<
  JobsiteAddRevenueInvoiceMutation,
  JobsiteAddRevenueInvoiceMutationVariables
>;

/**
 * __useJobsiteAddRevenueInvoiceMutation__
 *
 * To run a mutation, you first call `useJobsiteAddRevenueInvoiceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJobsiteAddRevenueInvoiceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [jobsiteAddRevenueInvoiceMutation, { data, loading, error }] = useJobsiteAddRevenueInvoiceMutation({
 *   variables: {
 *      jobsiteId: // value for 'jobsiteId'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useJobsiteAddRevenueInvoiceMutation(
  baseOptions?: Apollo.MutationHookOptions<
    JobsiteAddRevenueInvoiceMutation,
    JobsiteAddRevenueInvoiceMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    JobsiteAddRevenueInvoiceMutation,
    JobsiteAddRevenueInvoiceMutationVariables
  >(JobsiteAddRevenueInvoiceDocument, options);
}
export type JobsiteAddRevenueInvoiceMutationHookResult = ReturnType<
  typeof useJobsiteAddRevenueInvoiceMutation
>;
export type JobsiteAddRevenueInvoiceMutationResult =
  Apollo.MutationResult<JobsiteAddRevenueInvoiceMutation>;
export type JobsiteAddRevenueInvoiceMutationOptions =
  Apollo.BaseMutationOptions<
    JobsiteAddRevenueInvoiceMutation,
    JobsiteAddRevenueInvoiceMutationVariables
  >;
export const JobsiteCreateDocument = gql`
  mutation JobsiteCreate($data: JobsiteCreateData!) {
    jobsiteCreate(data: $data) {
      ...JobsiteFullSnippet
    }
  }
  ${JobsiteFullSnippetFragmentDoc}
`;
export type JobsiteCreateMutationFn = Apollo.MutationFunction<
  JobsiteCreateMutation,
  JobsiteCreateMutationVariables
>;

/**
 * __useJobsiteCreateMutation__
 *
 * To run a mutation, you first call `useJobsiteCreateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJobsiteCreateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [jobsiteCreateMutation, { data, loading, error }] = useJobsiteCreateMutation({
 *   variables: {
 *      data: // value for 'data'
 *   },
 * });
 */
export function useJobsiteCreateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    JobsiteCreateMutation,
    JobsiteCreateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    JobsiteCreateMutation,
    JobsiteCreateMutationVariables
  >(JobsiteCreateDocument, options);
}
export type JobsiteCreateMutationHookResult = ReturnType<
  typeof useJobsiteCreateMutation
>;
export type JobsiteCreateMutationResult =
  Apollo.MutationResult<JobsiteCreateMutation>;
export type JobsiteCreateMutationOptions = Apollo.BaseMutationOptions<
  JobsiteCreateMutation,
  JobsiteCreateMutationVariables
>;
export const JobsiteMaterialAddInvoiceDocument = gql`
  mutation JobsiteMaterialAddInvoice($id: ID!, $data: InvoiceData!) {
    jobsiteMaterialAddInvoice(jobsiteMaterialId: $id, data: $data) {
      ...JobsiteMaterialCardSnippet
    }
  }
  ${JobsiteMaterialCardSnippetFragmentDoc}
`;
export type JobsiteMaterialAddInvoiceMutationFn = Apollo.MutationFunction<
  JobsiteMaterialAddInvoiceMutation,
  JobsiteMaterialAddInvoiceMutationVariables
>;

/**
 * __useJobsiteMaterialAddInvoiceMutation__
 *
 * To run a mutation, you first call `useJobsiteMaterialAddInvoiceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJobsiteMaterialAddInvoiceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [jobsiteMaterialAddInvoiceMutation, { data, loading, error }] = useJobsiteMaterialAddInvoiceMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useJobsiteMaterialAddInvoiceMutation(
  baseOptions?: Apollo.MutationHookOptions<
    JobsiteMaterialAddInvoiceMutation,
    JobsiteMaterialAddInvoiceMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    JobsiteMaterialAddInvoiceMutation,
    JobsiteMaterialAddInvoiceMutationVariables
  >(JobsiteMaterialAddInvoiceDocument, options);
}
export type JobsiteMaterialAddInvoiceMutationHookResult = ReturnType<
  typeof useJobsiteMaterialAddInvoiceMutation
>;
export type JobsiteMaterialAddInvoiceMutationResult =
  Apollo.MutationResult<JobsiteMaterialAddInvoiceMutation>;
export type JobsiteMaterialAddInvoiceMutationOptions =
  Apollo.BaseMutationOptions<
    JobsiteMaterialAddInvoiceMutation,
    JobsiteMaterialAddInvoiceMutationVariables
  >;
export const JobsiteMaterialRemoveDocument = gql`
  mutation JobsiteMaterialRemove($id: ID!) {
    jobsiteMaterialRemove(id: $id)
  }
`;
export type JobsiteMaterialRemoveMutationFn = Apollo.MutationFunction<
  JobsiteMaterialRemoveMutation,
  JobsiteMaterialRemoveMutationVariables
>;

/**
 * __useJobsiteMaterialRemoveMutation__
 *
 * To run a mutation, you first call `useJobsiteMaterialRemoveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJobsiteMaterialRemoveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [jobsiteMaterialRemoveMutation, { data, loading, error }] = useJobsiteMaterialRemoveMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteMaterialRemoveMutation(
  baseOptions?: Apollo.MutationHookOptions<
    JobsiteMaterialRemoveMutation,
    JobsiteMaterialRemoveMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    JobsiteMaterialRemoveMutation,
    JobsiteMaterialRemoveMutationVariables
  >(JobsiteMaterialRemoveDocument, options);
}
export type JobsiteMaterialRemoveMutationHookResult = ReturnType<
  typeof useJobsiteMaterialRemoveMutation
>;
export type JobsiteMaterialRemoveMutationResult =
  Apollo.MutationResult<JobsiteMaterialRemoveMutation>;
export type JobsiteMaterialRemoveMutationOptions = Apollo.BaseMutationOptions<
  JobsiteMaterialRemoveMutation,
  JobsiteMaterialRemoveMutationVariables
>;
export const JobsiteMaterialUpdateDocument = gql`
  mutation JobsiteMaterialUpdate(
    $id: String!
    $data: JobsiteMaterialUpdateData!
  ) {
    jobsiteMaterialUpdate(id: $id, data: $data) {
      ...JobsiteMaterialCardSnippet
    }
  }
  ${JobsiteMaterialCardSnippetFragmentDoc}
`;
export type JobsiteMaterialUpdateMutationFn = Apollo.MutationFunction<
  JobsiteMaterialUpdateMutation,
  JobsiteMaterialUpdateMutationVariables
>;

/**
 * __useJobsiteMaterialUpdateMutation__
 *
 * To run a mutation, you first call `useJobsiteMaterialUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJobsiteMaterialUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [jobsiteMaterialUpdateMutation, { data, loading, error }] = useJobsiteMaterialUpdateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useJobsiteMaterialUpdateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    JobsiteMaterialUpdateMutation,
    JobsiteMaterialUpdateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    JobsiteMaterialUpdateMutation,
    JobsiteMaterialUpdateMutationVariables
  >(JobsiteMaterialUpdateDocument, options);
}
export type JobsiteMaterialUpdateMutationHookResult = ReturnType<
  typeof useJobsiteMaterialUpdateMutation
>;
export type JobsiteMaterialUpdateMutationResult =
  Apollo.MutationResult<JobsiteMaterialUpdateMutation>;
export type JobsiteMaterialUpdateMutationOptions = Apollo.BaseMutationOptions<
  JobsiteMaterialUpdateMutation,
  JobsiteMaterialUpdateMutationVariables
>;
export const JobsiteRemoveFileObjectDocument = gql`
  mutation JobsiteRemoveFileObject($id: ID!, $fileObjectId: ID!) {
    jobsiteRemoveFileObject(id: $id, fileObjectId: $fileObjectId) {
      ...JobsiteFullSnippet
    }
  }
  ${JobsiteFullSnippetFragmentDoc}
`;
export type JobsiteRemoveFileObjectMutationFn = Apollo.MutationFunction<
  JobsiteRemoveFileObjectMutation,
  JobsiteRemoveFileObjectMutationVariables
>;

/**
 * __useJobsiteRemoveFileObjectMutation__
 *
 * To run a mutation, you first call `useJobsiteRemoveFileObjectMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJobsiteRemoveFileObjectMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [jobsiteRemoveFileObjectMutation, { data, loading, error }] = useJobsiteRemoveFileObjectMutation({
 *   variables: {
 *      id: // value for 'id'
 *      fileObjectId: // value for 'fileObjectId'
 *   },
 * });
 */
export function useJobsiteRemoveFileObjectMutation(
  baseOptions?: Apollo.MutationHookOptions<
    JobsiteRemoveFileObjectMutation,
    JobsiteRemoveFileObjectMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    JobsiteRemoveFileObjectMutation,
    JobsiteRemoveFileObjectMutationVariables
  >(JobsiteRemoveFileObjectDocument, options);
}
export type JobsiteRemoveFileObjectMutationHookResult = ReturnType<
  typeof useJobsiteRemoveFileObjectMutation
>;
export type JobsiteRemoveFileObjectMutationResult =
  Apollo.MutationResult<JobsiteRemoveFileObjectMutation>;
export type JobsiteRemoveFileObjectMutationOptions = Apollo.BaseMutationOptions<
  JobsiteRemoveFileObjectMutation,
  JobsiteRemoveFileObjectMutationVariables
>;
export const JobsiteRequestReportGenerationDocument = gql`
  mutation JobsiteRequestReportGeneration($id: ID!) {
    jobsiteRequestReportGeneration(id: $id) {
      _id
    }
  }
`;
export type JobsiteRequestReportGenerationMutationFn = Apollo.MutationFunction<
  JobsiteRequestReportGenerationMutation,
  JobsiteRequestReportGenerationMutationVariables
>;

/**
 * __useJobsiteRequestReportGenerationMutation__
 *
 * To run a mutation, you first call `useJobsiteRequestReportGenerationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJobsiteRequestReportGenerationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [jobsiteRequestReportGenerationMutation, { data, loading, error }] = useJobsiteRequestReportGenerationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteRequestReportGenerationMutation(
  baseOptions?: Apollo.MutationHookOptions<
    JobsiteRequestReportGenerationMutation,
    JobsiteRequestReportGenerationMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    JobsiteRequestReportGenerationMutation,
    JobsiteRequestReportGenerationMutationVariables
  >(JobsiteRequestReportGenerationDocument, options);
}
export type JobsiteRequestReportGenerationMutationHookResult = ReturnType<
  typeof useJobsiteRequestReportGenerationMutation
>;
export type JobsiteRequestReportGenerationMutationResult =
  Apollo.MutationResult<JobsiteRequestReportGenerationMutation>;
export type JobsiteRequestReportGenerationMutationOptions =
  Apollo.BaseMutationOptions<
    JobsiteRequestReportGenerationMutation,
    JobsiteRequestReportGenerationMutationVariables
  >;
export const JobsiteSetAllEmptyTruckingRatesDocument = gql`
  mutation JobsiteSetAllEmptyTruckingRates {
    jobsiteSetAllEmptyTruckingRates {
      _id
    }
  }
`;
export type JobsiteSetAllEmptyTruckingRatesMutationFn = Apollo.MutationFunction<
  JobsiteSetAllEmptyTruckingRatesMutation,
  JobsiteSetAllEmptyTruckingRatesMutationVariables
>;

/**
 * __useJobsiteSetAllEmptyTruckingRatesMutation__
 *
 * To run a mutation, you first call `useJobsiteSetAllEmptyTruckingRatesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJobsiteSetAllEmptyTruckingRatesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [jobsiteSetAllEmptyTruckingRatesMutation, { data, loading, error }] = useJobsiteSetAllEmptyTruckingRatesMutation({
 *   variables: {
 *   },
 * });
 */
export function useJobsiteSetAllEmptyTruckingRatesMutation(
  baseOptions?: Apollo.MutationHookOptions<
    JobsiteSetAllEmptyTruckingRatesMutation,
    JobsiteSetAllEmptyTruckingRatesMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    JobsiteSetAllEmptyTruckingRatesMutation,
    JobsiteSetAllEmptyTruckingRatesMutationVariables
  >(JobsiteSetAllEmptyTruckingRatesDocument, options);
}
export type JobsiteSetAllEmptyTruckingRatesMutationHookResult = ReturnType<
  typeof useJobsiteSetAllEmptyTruckingRatesMutation
>;
export type JobsiteSetAllEmptyTruckingRatesMutationResult =
  Apollo.MutationResult<JobsiteSetAllEmptyTruckingRatesMutation>;
export type JobsiteSetAllEmptyTruckingRatesMutationOptions =
  Apollo.BaseMutationOptions<
    JobsiteSetAllEmptyTruckingRatesMutation,
    JobsiteSetAllEmptyTruckingRatesMutationVariables
  >;
export const JobsiteSetTruckingRatesDocument = gql`
  mutation JobsiteSetTruckingRates(
    $id: String!
    $data: [TruckingTypeRateData!]!
  ) {
    jobsiteSetTruckingRates(id: $id, data: $data) {
      ...JobsiteFullSnippet
    }
  }
  ${JobsiteFullSnippetFragmentDoc}
`;
export type JobsiteSetTruckingRatesMutationFn = Apollo.MutationFunction<
  JobsiteSetTruckingRatesMutation,
  JobsiteSetTruckingRatesMutationVariables
>;

/**
 * __useJobsiteSetTruckingRatesMutation__
 *
 * To run a mutation, you first call `useJobsiteSetTruckingRatesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJobsiteSetTruckingRatesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [jobsiteSetTruckingRatesMutation, { data, loading, error }] = useJobsiteSetTruckingRatesMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useJobsiteSetTruckingRatesMutation(
  baseOptions?: Apollo.MutationHookOptions<
    JobsiteSetTruckingRatesMutation,
    JobsiteSetTruckingRatesMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    JobsiteSetTruckingRatesMutation,
    JobsiteSetTruckingRatesMutationVariables
  >(JobsiteSetTruckingRatesDocument, options);
}
export type JobsiteSetTruckingRatesMutationHookResult = ReturnType<
  typeof useJobsiteSetTruckingRatesMutation
>;
export type JobsiteSetTruckingRatesMutationResult =
  Apollo.MutationResult<JobsiteSetTruckingRatesMutation>;
export type JobsiteSetTruckingRatesMutationOptions = Apollo.BaseMutationOptions<
  JobsiteSetTruckingRatesMutation,
  JobsiteSetTruckingRatesMutationVariables
>;
export const JobsiteUpdateDocument = gql`
  mutation JobsiteUpdate($id: ID!, $data: JobsiteUpdateData!) {
    jobsiteUpdate(id: $id, data: $data) {
      ...JobsiteCardSnippet
    }
  }
  ${JobsiteCardSnippetFragmentDoc}
`;
export type JobsiteUpdateMutationFn = Apollo.MutationFunction<
  JobsiteUpdateMutation,
  JobsiteUpdateMutationVariables
>;

/**
 * __useJobsiteUpdateMutation__
 *
 * To run a mutation, you first call `useJobsiteUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJobsiteUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [jobsiteUpdateMutation, { data, loading, error }] = useJobsiteUpdateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useJobsiteUpdateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    JobsiteUpdateMutation,
    JobsiteUpdateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    JobsiteUpdateMutation,
    JobsiteUpdateMutationVariables
  >(JobsiteUpdateDocument, options);
}
export type JobsiteUpdateMutationHookResult = ReturnType<
  typeof useJobsiteUpdateMutation
>;
export type JobsiteUpdateMutationResult =
  Apollo.MutationResult<JobsiteUpdateMutation>;
export type JobsiteUpdateMutationOptions = Apollo.BaseMutationOptions<
  JobsiteUpdateMutation,
  JobsiteUpdateMutationVariables
>;
export const LoginDocument = gql`
  mutation Login($data: LoginData!) {
    login(data: $data)
  }
`;
export type LoginMutationFn = Apollo.MutationFunction<
  LoginMutation,
  LoginMutationVariables
>;

/**
 * __useLoginMutation__
 *
 * To run a mutation, you first call `useLoginMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLoginMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [loginMutation, { data, loading, error }] = useLoginMutation({
 *   variables: {
 *      data: // value for 'data'
 *   },
 * });
 */
export function useLoginMutation(
  baseOptions?: Apollo.MutationHookOptions<
    LoginMutation,
    LoginMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<LoginMutation, LoginMutationVariables>(
    LoginDocument,
    options
  );
}
export type LoginMutationHookResult = ReturnType<typeof useLoginMutation>;
export type LoginMutationResult = Apollo.MutationResult<LoginMutation>;
export type LoginMutationOptions = Apollo.BaseMutationOptions<
  LoginMutation,
  LoginMutationVariables
>;
export const MaterialCreateDocument = gql`
  mutation MaterialCreate($data: MaterialCreateData!) {
    materialCreate(data: $data) {
      ...MaterialFullSnippet
    }
  }
  ${MaterialFullSnippetFragmentDoc}
`;
export type MaterialCreateMutationFn = Apollo.MutationFunction<
  MaterialCreateMutation,
  MaterialCreateMutationVariables
>;

/**
 * __useMaterialCreateMutation__
 *
 * To run a mutation, you first call `useMaterialCreateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMaterialCreateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [materialCreateMutation, { data, loading, error }] = useMaterialCreateMutation({
 *   variables: {
 *      data: // value for 'data'
 *   },
 * });
 */
export function useMaterialCreateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    MaterialCreateMutation,
    MaterialCreateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    MaterialCreateMutation,
    MaterialCreateMutationVariables
  >(MaterialCreateDocument, options);
}
export type MaterialCreateMutationHookResult = ReturnType<
  typeof useMaterialCreateMutation
>;
export type MaterialCreateMutationResult =
  Apollo.MutationResult<MaterialCreateMutation>;
export type MaterialCreateMutationOptions = Apollo.BaseMutationOptions<
  MaterialCreateMutation,
  MaterialCreateMutationVariables
>;
export const MaterialRemoveDocument = gql`
  mutation MaterialRemove($id: ID!) {
    materialRemove(id: $id)
  }
`;
export type MaterialRemoveMutationFn = Apollo.MutationFunction<
  MaterialRemoveMutation,
  MaterialRemoveMutationVariables
>;

/**
 * __useMaterialRemoveMutation__
 *
 * To run a mutation, you first call `useMaterialRemoveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMaterialRemoveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [materialRemoveMutation, { data, loading, error }] = useMaterialRemoveMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useMaterialRemoveMutation(
  baseOptions?: Apollo.MutationHookOptions<
    MaterialRemoveMutation,
    MaterialRemoveMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    MaterialRemoveMutation,
    MaterialRemoveMutationVariables
  >(MaterialRemoveDocument, options);
}
export type MaterialRemoveMutationHookResult = ReturnType<
  typeof useMaterialRemoveMutation
>;
export type MaterialRemoveMutationResult =
  Apollo.MutationResult<MaterialRemoveMutation>;
export type MaterialRemoveMutationOptions = Apollo.BaseMutationOptions<
  MaterialRemoveMutation,
  MaterialRemoveMutationVariables
>;
export const MaterialShipmentCreateDocument = gql`
  mutation MaterialShipmentCreate(
    $dailyReportId: String!
    $data: [MaterialShipmentCreateData!]!
  ) {
    materialShipmentCreate(dailyReportId: $dailyReportId, data: $data) {
      ...MaterialShipmentCardSnippet
    }
  }
  ${MaterialShipmentCardSnippetFragmentDoc}
`;
export type MaterialShipmentCreateMutationFn = Apollo.MutationFunction<
  MaterialShipmentCreateMutation,
  MaterialShipmentCreateMutationVariables
>;

/**
 * __useMaterialShipmentCreateMutation__
 *
 * To run a mutation, you first call `useMaterialShipmentCreateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMaterialShipmentCreateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [materialShipmentCreateMutation, { data, loading, error }] = useMaterialShipmentCreateMutation({
 *   variables: {
 *      dailyReportId: // value for 'dailyReportId'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useMaterialShipmentCreateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    MaterialShipmentCreateMutation,
    MaterialShipmentCreateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    MaterialShipmentCreateMutation,
    MaterialShipmentCreateMutationVariables
  >(MaterialShipmentCreateDocument, options);
}
export type MaterialShipmentCreateMutationHookResult = ReturnType<
  typeof useMaterialShipmentCreateMutation
>;
export type MaterialShipmentCreateMutationResult =
  Apollo.MutationResult<MaterialShipmentCreateMutation>;
export type MaterialShipmentCreateMutationOptions = Apollo.BaseMutationOptions<
  MaterialShipmentCreateMutation,
  MaterialShipmentCreateMutationVariables
>;
export const MaterialShipmentDeleteDocument = gql`
  mutation MaterialShipmentDelete($id: String!) {
    materialShipmentDelete(id: $id)
  }
`;
export type MaterialShipmentDeleteMutationFn = Apollo.MutationFunction<
  MaterialShipmentDeleteMutation,
  MaterialShipmentDeleteMutationVariables
>;

/**
 * __useMaterialShipmentDeleteMutation__
 *
 * To run a mutation, you first call `useMaterialShipmentDeleteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMaterialShipmentDeleteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [materialShipmentDeleteMutation, { data, loading, error }] = useMaterialShipmentDeleteMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useMaterialShipmentDeleteMutation(
  baseOptions?: Apollo.MutationHookOptions<
    MaterialShipmentDeleteMutation,
    MaterialShipmentDeleteMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    MaterialShipmentDeleteMutation,
    MaterialShipmentDeleteMutationVariables
  >(MaterialShipmentDeleteDocument, options);
}
export type MaterialShipmentDeleteMutationHookResult = ReturnType<
  typeof useMaterialShipmentDeleteMutation
>;
export type MaterialShipmentDeleteMutationResult =
  Apollo.MutationResult<MaterialShipmentDeleteMutation>;
export type MaterialShipmentDeleteMutationOptions = Apollo.BaseMutationOptions<
  MaterialShipmentDeleteMutation,
  MaterialShipmentDeleteMutationVariables
>;
export const MaterialShipmentUpdateDocument = gql`
  mutation MaterialShipmentUpdate(
    $id: String!
    $data: MaterialShipmentUpdateData!
  ) {
    materialShipmentUpdate(id: $id, data: $data) {
      ...MaterialShipmentCardSnippet
    }
  }
  ${MaterialShipmentCardSnippetFragmentDoc}
`;
export type MaterialShipmentUpdateMutationFn = Apollo.MutationFunction<
  MaterialShipmentUpdateMutation,
  MaterialShipmentUpdateMutationVariables
>;

/**
 * __useMaterialShipmentUpdateMutation__
 *
 * To run a mutation, you first call `useMaterialShipmentUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMaterialShipmentUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [materialShipmentUpdateMutation, { data, loading, error }] = useMaterialShipmentUpdateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useMaterialShipmentUpdateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    MaterialShipmentUpdateMutation,
    MaterialShipmentUpdateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    MaterialShipmentUpdateMutation,
    MaterialShipmentUpdateMutationVariables
  >(MaterialShipmentUpdateDocument, options);
}
export type MaterialShipmentUpdateMutationHookResult = ReturnType<
  typeof useMaterialShipmentUpdateMutation
>;
export type MaterialShipmentUpdateMutationResult =
  Apollo.MutationResult<MaterialShipmentUpdateMutation>;
export type MaterialShipmentUpdateMutationOptions = Apollo.BaseMutationOptions<
  MaterialShipmentUpdateMutation,
  MaterialShipmentUpdateMutationVariables
>;
export const MaterialUpdateDocument = gql`
  mutation MaterialUpdate($id: ID!, $data: MaterialUpdateData!) {
    materialUpdate(id: $id, data: $data) {
      ...MaterialFullSnippet
    }
  }
  ${MaterialFullSnippetFragmentDoc}
`;
export type MaterialUpdateMutationFn = Apollo.MutationFunction<
  MaterialUpdateMutation,
  MaterialUpdateMutationVariables
>;

/**
 * __useMaterialUpdateMutation__
 *
 * To run a mutation, you first call `useMaterialUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMaterialUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [materialUpdateMutation, { data, loading, error }] = useMaterialUpdateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useMaterialUpdateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    MaterialUpdateMutation,
    MaterialUpdateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    MaterialUpdateMutation,
    MaterialUpdateMutationVariables
  >(MaterialUpdateDocument, options);
}
export type MaterialUpdateMutationHookResult = ReturnType<
  typeof useMaterialUpdateMutation
>;
export type MaterialUpdateMutationResult =
  Apollo.MutationResult<MaterialUpdateMutation>;
export type MaterialUpdateMutationOptions = Apollo.BaseMutationOptions<
  MaterialUpdateMutation,
  MaterialUpdateMutationVariables
>;
export const ProductionCreateDocument = gql`
  mutation ProductionCreate(
    $dailyReportId: String!
    $data: ProductionCreateData!
  ) {
    productionCreate(dailyReportId: $dailyReportId, data: $data) {
      ...ProductionCardSnippet
    }
  }
  ${ProductionCardSnippetFragmentDoc}
`;
export type ProductionCreateMutationFn = Apollo.MutationFunction<
  ProductionCreateMutation,
  ProductionCreateMutationVariables
>;

/**
 * __useProductionCreateMutation__
 *
 * To run a mutation, you first call `useProductionCreateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useProductionCreateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [productionCreateMutation, { data, loading, error }] = useProductionCreateMutation({
 *   variables: {
 *      dailyReportId: // value for 'dailyReportId'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useProductionCreateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    ProductionCreateMutation,
    ProductionCreateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    ProductionCreateMutation,
    ProductionCreateMutationVariables
  >(ProductionCreateDocument, options);
}
export type ProductionCreateMutationHookResult = ReturnType<
  typeof useProductionCreateMutation
>;
export type ProductionCreateMutationResult =
  Apollo.MutationResult<ProductionCreateMutation>;
export type ProductionCreateMutationOptions = Apollo.BaseMutationOptions<
  ProductionCreateMutation,
  ProductionCreateMutationVariables
>;
export const ProductionDeleteDocument = gql`
  mutation ProductionDelete($id: String!) {
    productionDelete(id: $id)
  }
`;
export type ProductionDeleteMutationFn = Apollo.MutationFunction<
  ProductionDeleteMutation,
  ProductionDeleteMutationVariables
>;

/**
 * __useProductionDeleteMutation__
 *
 * To run a mutation, you first call `useProductionDeleteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useProductionDeleteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [productionDeleteMutation, { data, loading, error }] = useProductionDeleteMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useProductionDeleteMutation(
  baseOptions?: Apollo.MutationHookOptions<
    ProductionDeleteMutation,
    ProductionDeleteMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    ProductionDeleteMutation,
    ProductionDeleteMutationVariables
  >(ProductionDeleteDocument, options);
}
export type ProductionDeleteMutationHookResult = ReturnType<
  typeof useProductionDeleteMutation
>;
export type ProductionDeleteMutationResult =
  Apollo.MutationResult<ProductionDeleteMutation>;
export type ProductionDeleteMutationOptions = Apollo.BaseMutationOptions<
  ProductionDeleteMutation,
  ProductionDeleteMutationVariables
>;
export const ProductionUpdateDocument = gql`
  mutation ProductionUpdate($id: String!, $data: ProductionUpdateData!) {
    productionUpdate(id: $id, data: $data) {
      ...ProductionCardSnippet
    }
  }
  ${ProductionCardSnippetFragmentDoc}
`;
export type ProductionUpdateMutationFn = Apollo.MutationFunction<
  ProductionUpdateMutation,
  ProductionUpdateMutationVariables
>;

/**
 * __useProductionUpdateMutation__
 *
 * To run a mutation, you first call `useProductionUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useProductionUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [productionUpdateMutation, { data, loading, error }] = useProductionUpdateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useProductionUpdateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    ProductionUpdateMutation,
    ProductionUpdateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    ProductionUpdateMutation,
    ProductionUpdateMutationVariables
  >(ProductionUpdateDocument, options);
}
export type ProductionUpdateMutationHookResult = ReturnType<
  typeof useProductionUpdateMutation
>;
export type ProductionUpdateMutationResult =
  Apollo.MutationResult<ProductionUpdateMutation>;
export type ProductionUpdateMutationOptions = Apollo.BaseMutationOptions<
  ProductionUpdateMutation,
  ProductionUpdateMutationVariables
>;
export const ReportNoteRemoveFileDocument = gql`
  mutation ReportNoteRemoveFile($reportNoteId: String!, $fileId: String!) {
    reportNoteRemoveFile(reportNoteId: $reportNoteId, fileId: $fileId) {
      ...ReportNoteFullSnippet
    }
  }
  ${ReportNoteFullSnippetFragmentDoc}
`;
export type ReportNoteRemoveFileMutationFn = Apollo.MutationFunction<
  ReportNoteRemoveFileMutation,
  ReportNoteRemoveFileMutationVariables
>;

/**
 * __useReportNoteRemoveFileMutation__
 *
 * To run a mutation, you first call `useReportNoteRemoveFileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReportNoteRemoveFileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reportNoteRemoveFileMutation, { data, loading, error }] = useReportNoteRemoveFileMutation({
 *   variables: {
 *      reportNoteId: // value for 'reportNoteId'
 *      fileId: // value for 'fileId'
 *   },
 * });
 */
export function useReportNoteRemoveFileMutation(
  baseOptions?: Apollo.MutationHookOptions<
    ReportNoteRemoveFileMutation,
    ReportNoteRemoveFileMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    ReportNoteRemoveFileMutation,
    ReportNoteRemoveFileMutationVariables
  >(ReportNoteRemoveFileDocument, options);
}
export type ReportNoteRemoveFileMutationHookResult = ReturnType<
  typeof useReportNoteRemoveFileMutation
>;
export type ReportNoteRemoveFileMutationResult =
  Apollo.MutationResult<ReportNoteRemoveFileMutation>;
export type ReportNoteRemoveFileMutationOptions = Apollo.BaseMutationOptions<
  ReportNoteRemoveFileMutation,
  ReportNoteRemoveFileMutationVariables
>;
export const SignupDocument = gql`
  mutation Signup($signupId: String!, $data: SignupData!) {
    signup(signupId: $signupId, data: $data)
  }
`;
export type SignupMutationFn = Apollo.MutationFunction<
  SignupMutation,
  SignupMutationVariables
>;

/**
 * __useSignupMutation__
 *
 * To run a mutation, you first call `useSignupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSignupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [signupMutation, { data, loading, error }] = useSignupMutation({
 *   variables: {
 *      signupId: // value for 'signupId'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useSignupMutation(
  baseOptions?: Apollo.MutationHookOptions<
    SignupMutation,
    SignupMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<SignupMutation, SignupMutationVariables>(
    SignupDocument,
    options
  );
}
export type SignupMutationHookResult = ReturnType<typeof useSignupMutation>;
export type SignupMutationResult = Apollo.MutationResult<SignupMutation>;
export type SignupMutationOptions = Apollo.BaseMutationOptions<
  SignupMutation,
  SignupMutationVariables
>;
export const SignupCreateDocument = gql`
  mutation SignupCreate($employeeId: String!) {
    signupCreate(employeeId: $employeeId) {
      _id
    }
  }
`;
export type SignupCreateMutationFn = Apollo.MutationFunction<
  SignupCreateMutation,
  SignupCreateMutationVariables
>;

/**
 * __useSignupCreateMutation__
 *
 * To run a mutation, you first call `useSignupCreateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSignupCreateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [signupCreateMutation, { data, loading, error }] = useSignupCreateMutation({
 *   variables: {
 *      employeeId: // value for 'employeeId'
 *   },
 * });
 */
export function useSignupCreateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    SignupCreateMutation,
    SignupCreateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    SignupCreateMutation,
    SignupCreateMutationVariables
  >(SignupCreateDocument, options);
}
export type SignupCreateMutationHookResult = ReturnType<
  typeof useSignupCreateMutation
>;
export type SignupCreateMutationResult =
  Apollo.MutationResult<SignupCreateMutation>;
export type SignupCreateMutationOptions = Apollo.BaseMutationOptions<
  SignupCreateMutation,
  SignupCreateMutationVariables
>;
export const SystemUpdateCompanyVehicleTypeDefaultsDocument = gql`
  mutation SystemUpdateCompanyVehicleTypeDefaults($data: [DefaultRateData!]!) {
    systemUpdateCompanyVehicleTypeDefaults(data: $data) {
      ...SystemSnippet
    }
  }
  ${SystemSnippetFragmentDoc}
`;
export type SystemUpdateCompanyVehicleTypeDefaultsMutationFn =
  Apollo.MutationFunction<
    SystemUpdateCompanyVehicleTypeDefaultsMutation,
    SystemUpdateCompanyVehicleTypeDefaultsMutationVariables
  >;

/**
 * __useSystemUpdateCompanyVehicleTypeDefaultsMutation__
 *
 * To run a mutation, you first call `useSystemUpdateCompanyVehicleTypeDefaultsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSystemUpdateCompanyVehicleTypeDefaultsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [systemUpdateCompanyVehicleTypeDefaultsMutation, { data, loading, error }] = useSystemUpdateCompanyVehicleTypeDefaultsMutation({
 *   variables: {
 *      data: // value for 'data'
 *   },
 * });
 */
export function useSystemUpdateCompanyVehicleTypeDefaultsMutation(
  baseOptions?: Apollo.MutationHookOptions<
    SystemUpdateCompanyVehicleTypeDefaultsMutation,
    SystemUpdateCompanyVehicleTypeDefaultsMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    SystemUpdateCompanyVehicleTypeDefaultsMutation,
    SystemUpdateCompanyVehicleTypeDefaultsMutationVariables
  >(SystemUpdateCompanyVehicleTypeDefaultsDocument, options);
}
export type SystemUpdateCompanyVehicleTypeDefaultsMutationHookResult =
  ReturnType<typeof useSystemUpdateCompanyVehicleTypeDefaultsMutation>;
export type SystemUpdateCompanyVehicleTypeDefaultsMutationResult =
  Apollo.MutationResult<SystemUpdateCompanyVehicleTypeDefaultsMutation>;
export type SystemUpdateCompanyVehicleTypeDefaultsMutationOptions =
  Apollo.BaseMutationOptions<
    SystemUpdateCompanyVehicleTypeDefaultsMutation,
    SystemUpdateCompanyVehicleTypeDefaultsMutationVariables
  >;
export const SystemUpdateInternalExpenseOverheadRateDocument = gql`
  mutation SystemUpdateInternalExpenseOverheadRate($value: Float!) {
    systemUpdateInternalExpenseOverheadRate(value: $value) {
      ...SystemSnippet
    }
  }
  ${SystemSnippetFragmentDoc}
`;
export type SystemUpdateInternalExpenseOverheadRateMutationFn =
  Apollo.MutationFunction<
    SystemUpdateInternalExpenseOverheadRateMutation,
    SystemUpdateInternalExpenseOverheadRateMutationVariables
  >;

/**
 * __useSystemUpdateInternalExpenseOverheadRateMutation__
 *
 * To run a mutation, you first call `useSystemUpdateInternalExpenseOverheadRateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSystemUpdateInternalExpenseOverheadRateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [systemUpdateInternalExpenseOverheadRateMutation, { data, loading, error }] = useSystemUpdateInternalExpenseOverheadRateMutation({
 *   variables: {
 *      value: // value for 'value'
 *   },
 * });
 */
export function useSystemUpdateInternalExpenseOverheadRateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    SystemUpdateInternalExpenseOverheadRateMutation,
    SystemUpdateInternalExpenseOverheadRateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    SystemUpdateInternalExpenseOverheadRateMutation,
    SystemUpdateInternalExpenseOverheadRateMutationVariables
  >(SystemUpdateInternalExpenseOverheadRateDocument, options);
}
export type SystemUpdateInternalExpenseOverheadRateMutationHookResult =
  ReturnType<typeof useSystemUpdateInternalExpenseOverheadRateMutation>;
export type SystemUpdateInternalExpenseOverheadRateMutationResult =
  Apollo.MutationResult<SystemUpdateInternalExpenseOverheadRateMutation>;
export type SystemUpdateInternalExpenseOverheadRateMutationOptions =
  Apollo.BaseMutationOptions<
    SystemUpdateInternalExpenseOverheadRateMutation,
    SystemUpdateInternalExpenseOverheadRateMutationVariables
  >;
export const SystemUpdateLaborTypesDocument = gql`
  mutation SystemUpdateLaborTypes($data: [String!]!) {
    systemUpdateLaborTypes(data: $data) {
      ...SystemSnippet
    }
  }
  ${SystemSnippetFragmentDoc}
`;
export type SystemUpdateLaborTypesMutationFn = Apollo.MutationFunction<
  SystemUpdateLaborTypesMutation,
  SystemUpdateLaborTypesMutationVariables
>;

/**
 * __useSystemUpdateLaborTypesMutation__
 *
 * To run a mutation, you first call `useSystemUpdateLaborTypesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSystemUpdateLaborTypesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [systemUpdateLaborTypesMutation, { data, loading, error }] = useSystemUpdateLaborTypesMutation({
 *   variables: {
 *      data: // value for 'data'
 *   },
 * });
 */
export function useSystemUpdateLaborTypesMutation(
  baseOptions?: Apollo.MutationHookOptions<
    SystemUpdateLaborTypesMutation,
    SystemUpdateLaborTypesMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    SystemUpdateLaborTypesMutation,
    SystemUpdateLaborTypesMutationVariables
  >(SystemUpdateLaborTypesDocument, options);
}
export type SystemUpdateLaborTypesMutationHookResult = ReturnType<
  typeof useSystemUpdateLaborTypesMutation
>;
export type SystemUpdateLaborTypesMutationResult =
  Apollo.MutationResult<SystemUpdateLaborTypesMutation>;
export type SystemUpdateLaborTypesMutationOptions = Apollo.BaseMutationOptions<
  SystemUpdateLaborTypesMutation,
  SystemUpdateLaborTypesMutationVariables
>;
export const SystemUpdateMaterialShipmentVehicleTypeDefaultsDocument = gql`
  mutation SystemUpdateMaterialShipmentVehicleTypeDefaults(
    $data: [DefaultRateData!]!
  ) {
    systemUpdateMaterialShipmentVehicleTypeDefaults(data: $data) {
      ...SystemSnippet
    }
  }
  ${SystemSnippetFragmentDoc}
`;
export type SystemUpdateMaterialShipmentVehicleTypeDefaultsMutationFn =
  Apollo.MutationFunction<
    SystemUpdateMaterialShipmentVehicleTypeDefaultsMutation,
    SystemUpdateMaterialShipmentVehicleTypeDefaultsMutationVariables
  >;

/**
 * __useSystemUpdateMaterialShipmentVehicleTypeDefaultsMutation__
 *
 * To run a mutation, you first call `useSystemUpdateMaterialShipmentVehicleTypeDefaultsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSystemUpdateMaterialShipmentVehicleTypeDefaultsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [systemUpdateMaterialShipmentVehicleTypeDefaultsMutation, { data, loading, error }] = useSystemUpdateMaterialShipmentVehicleTypeDefaultsMutation({
 *   variables: {
 *      data: // value for 'data'
 *   },
 * });
 */
export function useSystemUpdateMaterialShipmentVehicleTypeDefaultsMutation(
  baseOptions?: Apollo.MutationHookOptions<
    SystemUpdateMaterialShipmentVehicleTypeDefaultsMutation,
    SystemUpdateMaterialShipmentVehicleTypeDefaultsMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    SystemUpdateMaterialShipmentVehicleTypeDefaultsMutation,
    SystemUpdateMaterialShipmentVehicleTypeDefaultsMutationVariables
  >(SystemUpdateMaterialShipmentVehicleTypeDefaultsDocument, options);
}
export type SystemUpdateMaterialShipmentVehicleTypeDefaultsMutationHookResult =
  ReturnType<typeof useSystemUpdateMaterialShipmentVehicleTypeDefaultsMutation>;
export type SystemUpdateMaterialShipmentVehicleTypeDefaultsMutationResult =
  Apollo.MutationResult<SystemUpdateMaterialShipmentVehicleTypeDefaultsMutation>;
export type SystemUpdateMaterialShipmentVehicleTypeDefaultsMutationOptions =
  Apollo.BaseMutationOptions<
    SystemUpdateMaterialShipmentVehicleTypeDefaultsMutation,
    SystemUpdateMaterialShipmentVehicleTypeDefaultsMutationVariables
  >;
export const SystemUpdateUnitDefaultsDocument = gql`
  mutation SystemUpdateUnitDefaults($data: [String!]!) {
    systemUpdateUnitDefaults(data: $data) {
      ...SystemSnippet
    }
  }
  ${SystemSnippetFragmentDoc}
`;
export type SystemUpdateUnitDefaultsMutationFn = Apollo.MutationFunction<
  SystemUpdateUnitDefaultsMutation,
  SystemUpdateUnitDefaultsMutationVariables
>;

/**
 * __useSystemUpdateUnitDefaultsMutation__
 *
 * To run a mutation, you first call `useSystemUpdateUnitDefaultsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSystemUpdateUnitDefaultsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [systemUpdateUnitDefaultsMutation, { data, loading, error }] = useSystemUpdateUnitDefaultsMutation({
 *   variables: {
 *      data: // value for 'data'
 *   },
 * });
 */
export function useSystemUpdateUnitDefaultsMutation(
  baseOptions?: Apollo.MutationHookOptions<
    SystemUpdateUnitDefaultsMutation,
    SystemUpdateUnitDefaultsMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    SystemUpdateUnitDefaultsMutation,
    SystemUpdateUnitDefaultsMutationVariables
  >(SystemUpdateUnitDefaultsDocument, options);
}
export type SystemUpdateUnitDefaultsMutationHookResult = ReturnType<
  typeof useSystemUpdateUnitDefaultsMutation
>;
export type SystemUpdateUnitDefaultsMutationResult =
  Apollo.MutationResult<SystemUpdateUnitDefaultsMutation>;
export type SystemUpdateUnitDefaultsMutationOptions =
  Apollo.BaseMutationOptions<
    SystemUpdateUnitDefaultsMutation,
    SystemUpdateUnitDefaultsMutationVariables
  >;
export const UserPasswordResetDocument = gql`
  mutation UserPasswordReset($password: String!, $token: String!) {
    userPasswordReset(password: $password, token: $token)
  }
`;
export type UserPasswordResetMutationFn = Apollo.MutationFunction<
  UserPasswordResetMutation,
  UserPasswordResetMutationVariables
>;

/**
 * __useUserPasswordResetMutation__
 *
 * To run a mutation, you first call `useUserPasswordResetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUserPasswordResetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [userPasswordResetMutation, { data, loading, error }] = useUserPasswordResetMutation({
 *   variables: {
 *      password: // value for 'password'
 *      token: // value for 'token'
 *   },
 * });
 */
export function useUserPasswordResetMutation(
  baseOptions?: Apollo.MutationHookOptions<
    UserPasswordResetMutation,
    UserPasswordResetMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    UserPasswordResetMutation,
    UserPasswordResetMutationVariables
  >(UserPasswordResetDocument, options);
}
export type UserPasswordResetMutationHookResult = ReturnType<
  typeof useUserPasswordResetMutation
>;
export type UserPasswordResetMutationResult =
  Apollo.MutationResult<UserPasswordResetMutation>;
export type UserPasswordResetMutationOptions = Apollo.BaseMutationOptions<
  UserPasswordResetMutation,
  UserPasswordResetMutationVariables
>;
export const UserPasswordResetRequestDocument = gql`
  mutation UserPasswordResetRequest($email: String!) {
    userPasswordResetRequest(email: $email)
  }
`;
export type UserPasswordResetRequestMutationFn = Apollo.MutationFunction<
  UserPasswordResetRequestMutation,
  UserPasswordResetRequestMutationVariables
>;

/**
 * __useUserPasswordResetRequestMutation__
 *
 * To run a mutation, you first call `useUserPasswordResetRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUserPasswordResetRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [userPasswordResetRequestMutation, { data, loading, error }] = useUserPasswordResetRequestMutation({
 *   variables: {
 *      email: // value for 'email'
 *   },
 * });
 */
export function useUserPasswordResetRequestMutation(
  baseOptions?: Apollo.MutationHookOptions<
    UserPasswordResetRequestMutation,
    UserPasswordResetRequestMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    UserPasswordResetRequestMutation,
    UserPasswordResetRequestMutationVariables
  >(UserPasswordResetRequestDocument, options);
}
export type UserPasswordResetRequestMutationHookResult = ReturnType<
  typeof useUserPasswordResetRequestMutation
>;
export type UserPasswordResetRequestMutationResult =
  Apollo.MutationResult<UserPasswordResetRequestMutation>;
export type UserPasswordResetRequestMutationOptions =
  Apollo.BaseMutationOptions<
    UserPasswordResetRequestMutation,
    UserPasswordResetRequestMutationVariables
  >;
export const UserUpdateHomeViewDocument = gql`
  mutation UserUpdateHomeView($homeView: UserHomeViewSettings!) {
    userUpdateHomeView(homeView: $homeView) {
      _id
    }
  }
`;
export type UserUpdateHomeViewMutationFn = Apollo.MutationFunction<
  UserUpdateHomeViewMutation,
  UserUpdateHomeViewMutationVariables
>;

/**
 * __useUserUpdateHomeViewMutation__
 *
 * To run a mutation, you first call `useUserUpdateHomeViewMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUserUpdateHomeViewMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [userUpdateHomeViewMutation, { data, loading, error }] = useUserUpdateHomeViewMutation({
 *   variables: {
 *      homeView: // value for 'homeView'
 *   },
 * });
 */
export function useUserUpdateHomeViewMutation(
  baseOptions?: Apollo.MutationHookOptions<
    UserUpdateHomeViewMutation,
    UserUpdateHomeViewMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    UserUpdateHomeViewMutation,
    UserUpdateHomeViewMutationVariables
  >(UserUpdateHomeViewDocument, options);
}
export type UserUpdateHomeViewMutationHookResult = ReturnType<
  typeof useUserUpdateHomeViewMutation
>;
export type UserUpdateHomeViewMutationResult =
  Apollo.MutationResult<UserUpdateHomeViewMutation>;
export type UserUpdateHomeViewMutationOptions = Apollo.BaseMutationOptions<
  UserUpdateHomeViewMutation,
  UserUpdateHomeViewMutationVariables
>;
export const UserUpdateRoleDocument = gql`
  mutation UserUpdateRole($id: String!, $role: UserRoles!) {
    userUpdateRole(id: $id, role: $role) {
      ...UserCardSnippet
    }
  }
  ${UserCardSnippetFragmentDoc}
`;
export type UserUpdateRoleMutationFn = Apollo.MutationFunction<
  UserUpdateRoleMutation,
  UserUpdateRoleMutationVariables
>;

/**
 * __useUserUpdateRoleMutation__
 *
 * To run a mutation, you first call `useUserUpdateRoleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUserUpdateRoleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [userUpdateRoleMutation, { data, loading, error }] = useUserUpdateRoleMutation({
 *   variables: {
 *      id: // value for 'id'
 *      role: // value for 'role'
 *   },
 * });
 */
export function useUserUpdateRoleMutation(
  baseOptions?: Apollo.MutationHookOptions<
    UserUpdateRoleMutation,
    UserUpdateRoleMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    UserUpdateRoleMutation,
    UserUpdateRoleMutationVariables
  >(UserUpdateRoleDocument, options);
}
export type UserUpdateRoleMutationHookResult = ReturnType<
  typeof useUserUpdateRoleMutation
>;
export type UserUpdateRoleMutationResult =
  Apollo.MutationResult<UserUpdateRoleMutation>;
export type UserUpdateRoleMutationOptions = Apollo.BaseMutationOptions<
  UserUpdateRoleMutation,
  UserUpdateRoleMutationVariables
>;
export const VehicleArchiveDocument = gql`
  mutation VehicleArchive($id: ID!) {
    vehicleArchive(id: $id) {
      _id
    }
  }
`;
export type VehicleArchiveMutationFn = Apollo.MutationFunction<
  VehicleArchiveMutation,
  VehicleArchiveMutationVariables
>;

/**
 * __useVehicleArchiveMutation__
 *
 * To run a mutation, you first call `useVehicleArchiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useVehicleArchiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [vehicleArchiveMutation, { data, loading, error }] = useVehicleArchiveMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useVehicleArchiveMutation(
  baseOptions?: Apollo.MutationHookOptions<
    VehicleArchiveMutation,
    VehicleArchiveMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    VehicleArchiveMutation,
    VehicleArchiveMutationVariables
  >(VehicleArchiveDocument, options);
}
export type VehicleArchiveMutationHookResult = ReturnType<
  typeof useVehicleArchiveMutation
>;
export type VehicleArchiveMutationResult =
  Apollo.MutationResult<VehicleArchiveMutation>;
export type VehicleArchiveMutationOptions = Apollo.BaseMutationOptions<
  VehicleArchiveMutation,
  VehicleArchiveMutationVariables
>;
export const VehicleCreateDocument = gql`
  mutation VehicleCreate($data: VehicleCreateData!, $crewId: String) {
    vehicleCreate(data: $data, crewId: $crewId) {
      ...VehicleCardSnippet
    }
  }
  ${VehicleCardSnippetFragmentDoc}
`;
export type VehicleCreateMutationFn = Apollo.MutationFunction<
  VehicleCreateMutation,
  VehicleCreateMutationVariables
>;

/**
 * __useVehicleCreateMutation__
 *
 * To run a mutation, you first call `useVehicleCreateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useVehicleCreateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [vehicleCreateMutation, { data, loading, error }] = useVehicleCreateMutation({
 *   variables: {
 *      data: // value for 'data'
 *      crewId: // value for 'crewId'
 *   },
 * });
 */
export function useVehicleCreateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    VehicleCreateMutation,
    VehicleCreateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    VehicleCreateMutation,
    VehicleCreateMutationVariables
  >(VehicleCreateDocument, options);
}
export type VehicleCreateMutationHookResult = ReturnType<
  typeof useVehicleCreateMutation
>;
export type VehicleCreateMutationResult =
  Apollo.MutationResult<VehicleCreateMutation>;
export type VehicleCreateMutationOptions = Apollo.BaseMutationOptions<
  VehicleCreateMutation,
  VehicleCreateMutationVariables
>;
export const VehicleUpdateDocument = gql`
  mutation VehicleUpdate($id: ID!, $data: VehicleUpdateData!) {
    vehicleUpdate(id: $id, data: $data) {
      ...VehicleFullSnippet
    }
  }
  ${VehicleFullSnippetFragmentDoc}
`;
export type VehicleUpdateMutationFn = Apollo.MutationFunction<
  VehicleUpdateMutation,
  VehicleUpdateMutationVariables
>;

/**
 * __useVehicleUpdateMutation__
 *
 * To run a mutation, you first call `useVehicleUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useVehicleUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [vehicleUpdateMutation, { data, loading, error }] = useVehicleUpdateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useVehicleUpdateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    VehicleUpdateMutation,
    VehicleUpdateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    VehicleUpdateMutation,
    VehicleUpdateMutationVariables
  >(VehicleUpdateDocument, options);
}
export type VehicleUpdateMutationHookResult = ReturnType<
  typeof useVehicleUpdateMutation
>;
export type VehicleUpdateMutationResult =
  Apollo.MutationResult<VehicleUpdateMutation>;
export type VehicleUpdateMutationOptions = Apollo.BaseMutationOptions<
  VehicleUpdateMutation,
  VehicleUpdateMutationVariables
>;
export const VehicleUpdateRatesDocument = gql`
  mutation VehicleUpdateRates($id: String!, $data: [RatesData!]!) {
    vehicleUpdateRates(id: $id, data: $data) {
      ...VehicleCardSnippet
    }
  }
  ${VehicleCardSnippetFragmentDoc}
`;
export type VehicleUpdateRatesMutationFn = Apollo.MutationFunction<
  VehicleUpdateRatesMutation,
  VehicleUpdateRatesMutationVariables
>;

/**
 * __useVehicleUpdateRatesMutation__
 *
 * To run a mutation, you first call `useVehicleUpdateRatesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useVehicleUpdateRatesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [vehicleUpdateRatesMutation, { data, loading, error }] = useVehicleUpdateRatesMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useVehicleUpdateRatesMutation(
  baseOptions?: Apollo.MutationHookOptions<
    VehicleUpdateRatesMutation,
    VehicleUpdateRatesMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    VehicleUpdateRatesMutation,
    VehicleUpdateRatesMutationVariables
  >(VehicleUpdateRatesDocument, options);
}
export type VehicleUpdateRatesMutationHookResult = ReturnType<
  typeof useVehicleUpdateRatesMutation
>;
export type VehicleUpdateRatesMutationResult =
  Apollo.MutationResult<VehicleUpdateRatesMutation>;
export type VehicleUpdateRatesMutationOptions = Apollo.BaseMutationOptions<
  VehicleUpdateRatesMutation,
  VehicleUpdateRatesMutationVariables
>;
export const VehicleWorkCreateDocument = gql`
  mutation VehicleWorkCreate(
    $dailyReportId: String!
    $data: [VehicleWorkCreateData!]!
  ) {
    vehicleWorkCreate(dailyReportId: $dailyReportId, data: $data) {
      ...VehicleWorkCardSnippet
    }
  }
  ${VehicleWorkCardSnippetFragmentDoc}
`;
export type VehicleWorkCreateMutationFn = Apollo.MutationFunction<
  VehicleWorkCreateMutation,
  VehicleWorkCreateMutationVariables
>;

/**
 * __useVehicleWorkCreateMutation__
 *
 * To run a mutation, you first call `useVehicleWorkCreateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useVehicleWorkCreateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [vehicleWorkCreateMutation, { data, loading, error }] = useVehicleWorkCreateMutation({
 *   variables: {
 *      dailyReportId: // value for 'dailyReportId'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useVehicleWorkCreateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    VehicleWorkCreateMutation,
    VehicleWorkCreateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    VehicleWorkCreateMutation,
    VehicleWorkCreateMutationVariables
  >(VehicleWorkCreateDocument, options);
}
export type VehicleWorkCreateMutationHookResult = ReturnType<
  typeof useVehicleWorkCreateMutation
>;
export type VehicleWorkCreateMutationResult =
  Apollo.MutationResult<VehicleWorkCreateMutation>;
export type VehicleWorkCreateMutationOptions = Apollo.BaseMutationOptions<
  VehicleWorkCreateMutation,
  VehicleWorkCreateMutationVariables
>;
export const VehicleWorkDeleteDocument = gql`
  mutation VehicleWorkDelete($id: String!) {
    vehicleWorkDelete(id: $id)
  }
`;
export type VehicleWorkDeleteMutationFn = Apollo.MutationFunction<
  VehicleWorkDeleteMutation,
  VehicleWorkDeleteMutationVariables
>;

/**
 * __useVehicleWorkDeleteMutation__
 *
 * To run a mutation, you first call `useVehicleWorkDeleteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useVehicleWorkDeleteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [vehicleWorkDeleteMutation, { data, loading, error }] = useVehicleWorkDeleteMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useVehicleWorkDeleteMutation(
  baseOptions?: Apollo.MutationHookOptions<
    VehicleWorkDeleteMutation,
    VehicleWorkDeleteMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    VehicleWorkDeleteMutation,
    VehicleWorkDeleteMutationVariables
  >(VehicleWorkDeleteDocument, options);
}
export type VehicleWorkDeleteMutationHookResult = ReturnType<
  typeof useVehicleWorkDeleteMutation
>;
export type VehicleWorkDeleteMutationResult =
  Apollo.MutationResult<VehicleWorkDeleteMutation>;
export type VehicleWorkDeleteMutationOptions = Apollo.BaseMutationOptions<
  VehicleWorkDeleteMutation,
  VehicleWorkDeleteMutationVariables
>;
export const VehicleWorkUpdateDocument = gql`
  mutation VehicleWorkUpdate($id: String!, $data: VehicleWorkUpdateData!) {
    vehicleWorkUpdate(id: $id, data: $data) {
      ...VehicleWorkCardSnippet
    }
  }
  ${VehicleWorkCardSnippetFragmentDoc}
`;
export type VehicleWorkUpdateMutationFn = Apollo.MutationFunction<
  VehicleWorkUpdateMutation,
  VehicleWorkUpdateMutationVariables
>;

/**
 * __useVehicleWorkUpdateMutation__
 *
 * To run a mutation, you first call `useVehicleWorkUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useVehicleWorkUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [vehicleWorkUpdateMutation, { data, loading, error }] = useVehicleWorkUpdateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useVehicleWorkUpdateMutation(
  baseOptions?: Apollo.MutationHookOptions<
    VehicleWorkUpdateMutation,
    VehicleWorkUpdateMutationVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    VehicleWorkUpdateMutation,
    VehicleWorkUpdateMutationVariables
  >(VehicleWorkUpdateDocument, options);
}
export type VehicleWorkUpdateMutationHookResult = ReturnType<
  typeof useVehicleWorkUpdateMutation
>;
export type VehicleWorkUpdateMutationResult =
  Apollo.MutationResult<VehicleWorkUpdateMutation>;
export type VehicleWorkUpdateMutationOptions = Apollo.BaseMutationOptions<
  VehicleWorkUpdateMutation,
  VehicleWorkUpdateMutationVariables
>;
export const CompaniesDocument = gql`
  query Companies($options: ListOptionData) {
    companies(options: $options) {
      ...CompanyCardSnippet
    }
  }
  ${CompanyCardSnippetFragmentDoc}
`;

/**
 * __useCompaniesQuery__
 *
 * To run a query within a React component, call `useCompaniesQuery` and pass it any options that fit your needs.
 * When your component renders, `useCompaniesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCompaniesQuery({
 *   variables: {
 *      options: // value for 'options'
 *   },
 * });
 */
export function useCompaniesQuery(
  baseOptions?: Apollo.QueryHookOptions<CompaniesQuery, CompaniesQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<CompaniesQuery, CompaniesQueryVariables>(
    CompaniesDocument,
    options
  );
}
export function useCompaniesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    CompaniesQuery,
    CompaniesQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<CompaniesQuery, CompaniesQueryVariables>(
    CompaniesDocument,
    options
  );
}
export type CompaniesQueryHookResult = ReturnType<typeof useCompaniesQuery>;
export type CompaniesLazyQueryHookResult = ReturnType<
  typeof useCompaniesLazyQuery
>;
export type CompaniesQueryResult = Apollo.QueryResult<
  CompaniesQuery,
  CompaniesQueryVariables
>;
export const CompanySearchDocument = gql`
  query CompanySearch($searchString: String!, $options: SearchOptions) {
    companySearch(searchString: $searchString, options: $options) {
      ...CompanyCardSnippet
    }
  }
  ${CompanyCardSnippetFragmentDoc}
`;

/**
 * __useCompanySearchQuery__
 *
 * To run a query within a React component, call `useCompanySearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useCompanySearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCompanySearchQuery({
 *   variables: {
 *      searchString: // value for 'searchString'
 *      options: // value for 'options'
 *   },
 * });
 */
export function useCompanySearchQuery(
  baseOptions: Apollo.QueryHookOptions<
    CompanySearchQuery,
    CompanySearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<CompanySearchQuery, CompanySearchQueryVariables>(
    CompanySearchDocument,
    options
  );
}
export function useCompanySearchLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    CompanySearchQuery,
    CompanySearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<CompanySearchQuery, CompanySearchQueryVariables>(
    CompanySearchDocument,
    options
  );
}
export type CompanySearchQueryHookResult = ReturnType<
  typeof useCompanySearchQuery
>;
export type CompanySearchLazyQueryHookResult = ReturnType<
  typeof useCompanySearchLazyQuery
>;
export type CompanySearchQueryResult = Apollo.QueryResult<
  CompanySearchQuery,
  CompanySearchQueryVariables
>;
export const CompanyCardDocument = gql`
  query CompanyCard($id: String!) {
    company(id: $id) {
      ...CompanyCardSnippet
    }
  }
  ${CompanyCardSnippetFragmentDoc}
`;

/**
 * __useCompanyCardQuery__
 *
 * To run a query within a React component, call `useCompanyCardQuery` and pass it any options that fit your needs.
 * When your component renders, `useCompanyCardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCompanyCardQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useCompanyCardQuery(
  baseOptions: Apollo.QueryHookOptions<
    CompanyCardQuery,
    CompanyCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<CompanyCardQuery, CompanyCardQueryVariables>(
    CompanyCardDocument,
    options
  );
}
export function useCompanyCardLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    CompanyCardQuery,
    CompanyCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<CompanyCardQuery, CompanyCardQueryVariables>(
    CompanyCardDocument,
    options
  );
}
export type CompanyCardQueryHookResult = ReturnType<typeof useCompanyCardQuery>;
export type CompanyCardLazyQueryHookResult = ReturnType<
  typeof useCompanyCardLazyQuery
>;
export type CompanyCardQueryResult = Apollo.QueryResult<
  CompanyCardQuery,
  CompanyCardQueryVariables
>;
export const CrewSearchDocument = gql`
  query CrewSearch($searchString: String!, $options: SearchOptions) {
    crewSearch(searchString: $searchString, options: $options) {
      ...CrewCardSnippet
    }
  }
  ${CrewCardSnippetFragmentDoc}
`;

/**
 * __useCrewSearchQuery__
 *
 * To run a query within a React component, call `useCrewSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useCrewSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCrewSearchQuery({
 *   variables: {
 *      searchString: // value for 'searchString'
 *      options: // value for 'options'
 *   },
 * });
 */
export function useCrewSearchQuery(
  baseOptions: Apollo.QueryHookOptions<
    CrewSearchQuery,
    CrewSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<CrewSearchQuery, CrewSearchQueryVariables>(
    CrewSearchDocument,
    options
  );
}
export function useCrewSearchLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    CrewSearchQuery,
    CrewSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<CrewSearchQuery, CrewSearchQueryVariables>(
    CrewSearchDocument,
    options
  );
}
export type CrewSearchQueryHookResult = ReturnType<typeof useCrewSearchQuery>;
export type CrewSearchLazyQueryHookResult = ReturnType<
  typeof useCrewSearchLazyQuery
>;
export type CrewSearchQueryResult = Apollo.QueryResult<
  CrewSearchQuery,
  CrewSearchQueryVariables
>;
export const CrewCardDocument = gql`
  query CrewCard($id: String!) {
    crew(id: $id) {
      ...CrewCardSnippet
    }
  }
  ${CrewCardSnippetFragmentDoc}
`;

/**
 * __useCrewCardQuery__
 *
 * To run a query within a React component, call `useCrewCardQuery` and pass it any options that fit your needs.
 * When your component renders, `useCrewCardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCrewCardQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useCrewCardQuery(
  baseOptions: Apollo.QueryHookOptions<CrewCardQuery, CrewCardQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<CrewCardQuery, CrewCardQueryVariables>(
    CrewCardDocument,
    options
  );
}
export function useCrewCardLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    CrewCardQuery,
    CrewCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<CrewCardQuery, CrewCardQueryVariables>(
    CrewCardDocument,
    options
  );
}
export type CrewCardQueryHookResult = ReturnType<typeof useCrewCardQuery>;
export type CrewCardLazyQueryHookResult = ReturnType<
  typeof useCrewCardLazyQuery
>;
export type CrewCardQueryResult = Apollo.QueryResult<
  CrewCardQuery,
  CrewCardQueryVariables
>;
export const CrewFullDocument = gql`
  query CrewFull($id: String!) {
    crew(id: $id) {
      ...CrewFullSnippet
    }
  }
  ${CrewFullSnippetFragmentDoc}
`;

/**
 * __useCrewFullQuery__
 *
 * To run a query within a React component, call `useCrewFullQuery` and pass it any options that fit your needs.
 * When your component renders, `useCrewFullQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCrewFullQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useCrewFullQuery(
  baseOptions: Apollo.QueryHookOptions<CrewFullQuery, CrewFullQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<CrewFullQuery, CrewFullQueryVariables>(
    CrewFullDocument,
    options
  );
}
export function useCrewFullLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    CrewFullQuery,
    CrewFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<CrewFullQuery, CrewFullQueryVariables>(
    CrewFullDocument,
    options
  );
}
export type CrewFullQueryHookResult = ReturnType<typeof useCrewFullQuery>;
export type CrewFullLazyQueryHookResult = ReturnType<
  typeof useCrewFullLazyQuery
>;
export type CrewFullQueryResult = Apollo.QueryResult<
  CrewFullQuery,
  CrewFullQueryVariables
>;
export const CrewSsrDocument = gql`
  query CrewSSR($id: String!) {
    crew(id: $id) {
      ...CrewSSRSnippet
    }
  }
  ${CrewSsrSnippetFragmentDoc}
`;

/**
 * __useCrewSsrQuery__
 *
 * To run a query within a React component, call `useCrewSsrQuery` and pass it any options that fit your needs.
 * When your component renders, `useCrewSsrQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCrewSsrQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useCrewSsrQuery(
  baseOptions: Apollo.QueryHookOptions<CrewSsrQuery, CrewSsrQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<CrewSsrQuery, CrewSsrQueryVariables>(
    CrewSsrDocument,
    options
  );
}
export function useCrewSsrLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<CrewSsrQuery, CrewSsrQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<CrewSsrQuery, CrewSsrQueryVariables>(
    CrewSsrDocument,
    options
  );
}
export type CrewSsrQueryHookResult = ReturnType<typeof useCrewSsrQuery>;
export type CrewSsrLazyQueryHookResult = ReturnType<typeof useCrewSsrLazyQuery>;
export type CrewSsrQueryResult = Apollo.QueryResult<
  CrewSsrQuery,
  CrewSsrQueryVariables
>;
export const CurrentUserDocument = gql`
  query CurrentUser {
    currentUser {
      ...FullUserSnippet
    }
  }
  ${FullUserSnippetFragmentDoc}
`;

/**
 * __useCurrentUserQuery__
 *
 * To run a query within a React component, call `useCurrentUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useCurrentUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCurrentUserQuery({
 *   variables: {
 *   },
 * });
 */
export function useCurrentUserQuery(
  baseOptions?: Apollo.QueryHookOptions<
    CurrentUserQuery,
    CurrentUserQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<CurrentUserQuery, CurrentUserQueryVariables>(
    CurrentUserDocument,
    options
  );
}
export function useCurrentUserLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    CurrentUserQuery,
    CurrentUserQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<CurrentUserQuery, CurrentUserQueryVariables>(
    CurrentUserDocument,
    options
  );
}
export type CurrentUserQueryHookResult = ReturnType<typeof useCurrentUserQuery>;
export type CurrentUserLazyQueryHookResult = ReturnType<
  typeof useCurrentUserLazyQuery
>;
export type CurrentUserQueryResult = Apollo.QueryResult<
  CurrentUserQuery,
  CurrentUserQueryVariables
>;
export const DailyReportCardDocument = gql`
  query DailyReportCard($id: String!) {
    dailyReport(id: $id) {
      ...DailyReportCardSnippet
    }
  }
  ${DailyReportCardSnippetFragmentDoc}
`;

/**
 * __useDailyReportCardQuery__
 *
 * To run a query within a React component, call `useDailyReportCardQuery` and pass it any options that fit your needs.
 * When your component renders, `useDailyReportCardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDailyReportCardQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDailyReportCardQuery(
  baseOptions: Apollo.QueryHookOptions<
    DailyReportCardQuery,
    DailyReportCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<DailyReportCardQuery, DailyReportCardQueryVariables>(
    DailyReportCardDocument,
    options
  );
}
export function useDailyReportCardLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    DailyReportCardQuery,
    DailyReportCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    DailyReportCardQuery,
    DailyReportCardQueryVariables
  >(DailyReportCardDocument, options);
}
export type DailyReportCardQueryHookResult = ReturnType<
  typeof useDailyReportCardQuery
>;
export type DailyReportCardLazyQueryHookResult = ReturnType<
  typeof useDailyReportCardLazyQuery
>;
export type DailyReportCardQueryResult = Apollo.QueryResult<
  DailyReportCardQuery,
  DailyReportCardQueryVariables
>;
export const DailyReportFullDocument = gql`
  query DailyReportFull($id: String!) {
    dailyReport(id: $id) {
      ...DailyReportFullSnippet
    }
  }
  ${DailyReportFullSnippetFragmentDoc}
`;

/**
 * __useDailyReportFullQuery__
 *
 * To run a query within a React component, call `useDailyReportFullQuery` and pass it any options that fit your needs.
 * When your component renders, `useDailyReportFullQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDailyReportFullQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDailyReportFullQuery(
  baseOptions: Apollo.QueryHookOptions<
    DailyReportFullQuery,
    DailyReportFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<DailyReportFullQuery, DailyReportFullQueryVariables>(
    DailyReportFullDocument,
    options
  );
}
export function useDailyReportFullLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    DailyReportFullQuery,
    DailyReportFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    DailyReportFullQuery,
    DailyReportFullQueryVariables
  >(DailyReportFullDocument, options);
}
export type DailyReportFullQueryHookResult = ReturnType<
  typeof useDailyReportFullQuery
>;
export type DailyReportFullLazyQueryHookResult = ReturnType<
  typeof useDailyReportFullLazyQuery
>;
export type DailyReportFullQueryResult = Apollo.QueryResult<
  DailyReportFullQuery,
  DailyReportFullQueryVariables
>;
export const DailyReportPdfDocument = gql`
  query DailyReportPDF($id: String!) {
    dailyReport(id: $id) {
      ...DailyReportPDFSnippet
    }
  }
  ${DailyReportPdfSnippetFragmentDoc}
`;

/**
 * __useDailyReportPdfQuery__
 *
 * To run a query within a React component, call `useDailyReportPdfQuery` and pass it any options that fit your needs.
 * When your component renders, `useDailyReportPdfQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDailyReportPdfQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDailyReportPdfQuery(
  baseOptions: Apollo.QueryHookOptions<
    DailyReportPdfQuery,
    DailyReportPdfQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<DailyReportPdfQuery, DailyReportPdfQueryVariables>(
    DailyReportPdfDocument,
    options
  );
}
export function useDailyReportPdfLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    DailyReportPdfQuery,
    DailyReportPdfQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<DailyReportPdfQuery, DailyReportPdfQueryVariables>(
    DailyReportPdfDocument,
    options
  );
}
export type DailyReportPdfQueryHookResult = ReturnType<
  typeof useDailyReportPdfQuery
>;
export type DailyReportPdfLazyQueryHookResult = ReturnType<
  typeof useDailyReportPdfLazyQuery
>;
export type DailyReportPdfQueryResult = Apollo.QueryResult<
  DailyReportPdfQuery,
  DailyReportPdfQueryVariables
>;
export const DailyReportSsrDocument = gql`
  query DailyReportSSR($id: String!) {
    dailyReport(id: $id) {
      ...DailyReportSSRSnippet
    }
  }
  ${DailyReportSsrSnippetFragmentDoc}
`;

/**
 * __useDailyReportSsrQuery__
 *
 * To run a query within a React component, call `useDailyReportSsrQuery` and pass it any options that fit your needs.
 * When your component renders, `useDailyReportSsrQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDailyReportSsrQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDailyReportSsrQuery(
  baseOptions: Apollo.QueryHookOptions<
    DailyReportSsrQuery,
    DailyReportSsrQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<DailyReportSsrQuery, DailyReportSsrQueryVariables>(
    DailyReportSsrDocument,
    options
  );
}
export function useDailyReportSsrLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    DailyReportSsrQuery,
    DailyReportSsrQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<DailyReportSsrQuery, DailyReportSsrQueryVariables>(
    DailyReportSsrDocument,
    options
  );
}
export type DailyReportSsrQueryHookResult = ReturnType<
  typeof useDailyReportSsrQuery
>;
export type DailyReportSsrLazyQueryHookResult = ReturnType<
  typeof useDailyReportSsrLazyQuery
>;
export type DailyReportSsrQueryResult = Apollo.QueryResult<
  DailyReportSsrQuery,
  DailyReportSsrQueryVariables
>;
export const DailyReportsDocument = gql`
  query DailyReports($options: DailyReportListOptionData) {
    dailyReports(options: $options) {
      ...DailyReportCardSnippet
    }
  }
  ${DailyReportCardSnippetFragmentDoc}
`;

/**
 * __useDailyReportsQuery__
 *
 * To run a query within a React component, call `useDailyReportsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDailyReportsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDailyReportsQuery({
 *   variables: {
 *      options: // value for 'options'
 *   },
 * });
 */
export function useDailyReportsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    DailyReportsQuery,
    DailyReportsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<DailyReportsQuery, DailyReportsQueryVariables>(
    DailyReportsDocument,
    options
  );
}
export function useDailyReportsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    DailyReportsQuery,
    DailyReportsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<DailyReportsQuery, DailyReportsQueryVariables>(
    DailyReportsDocument,
    options
  );
}
export type DailyReportsQueryHookResult = ReturnType<
  typeof useDailyReportsQuery
>;
export type DailyReportsLazyQueryHookResult = ReturnType<
  typeof useDailyReportsLazyQuery
>;
export type DailyReportsQueryResult = Apollo.QueryResult<
  DailyReportsQuery,
  DailyReportsQueryVariables
>;
export const DailyReportsForJobsiteDocument = gql`
  query DailyReportsForJobsite(
    $jobsiteId: ID!
    $options: DailyReportListOptionData
  ) {
    dailyReportsForJobsite(jobsiteId: $jobsiteId, options: $options) {
      _id
    }
  }
`;

/**
 * __useDailyReportsForJobsiteQuery__
 *
 * To run a query within a React component, call `useDailyReportsForJobsiteQuery` and pass it any options that fit your needs.
 * When your component renders, `useDailyReportsForJobsiteQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDailyReportsForJobsiteQuery({
 *   variables: {
 *      jobsiteId: // value for 'jobsiteId'
 *      options: // value for 'options'
 *   },
 * });
 */
export function useDailyReportsForJobsiteQuery(
  baseOptions: Apollo.QueryHookOptions<
    DailyReportsForJobsiteQuery,
    DailyReportsForJobsiteQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    DailyReportsForJobsiteQuery,
    DailyReportsForJobsiteQueryVariables
  >(DailyReportsForJobsiteDocument, options);
}
export function useDailyReportsForJobsiteLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    DailyReportsForJobsiteQuery,
    DailyReportsForJobsiteQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    DailyReportsForJobsiteQuery,
    DailyReportsForJobsiteQueryVariables
  >(DailyReportsForJobsiteDocument, options);
}
export type DailyReportsForJobsiteQueryHookResult = ReturnType<
  typeof useDailyReportsForJobsiteQuery
>;
export type DailyReportsForJobsiteLazyQueryHookResult = ReturnType<
  typeof useDailyReportsForJobsiteLazyQuery
>;
export type DailyReportsForJobsiteQueryResult = Apollo.QueryResult<
  DailyReportsForJobsiteQuery,
  DailyReportsForJobsiteQueryVariables
>;
export const EmployeeHourReportsDocument = gql`
  query EmployeeHourReports(
    $id: ID!
    $startTime: DateTime!
    $endTime: DateTime!
  ) {
    employeeHourReports(id: $id, startTime: $startTime, endTime: $endTime) {
      days {
        date
        hours
      }
    }
  }
`;

/**
 * __useEmployeeHourReportsQuery__
 *
 * To run a query within a React component, call `useEmployeeHourReportsQuery` and pass it any options that fit your needs.
 * When your component renders, `useEmployeeHourReportsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEmployeeHourReportsQuery({
 *   variables: {
 *      id: // value for 'id'
 *      startTime: // value for 'startTime'
 *      endTime: // value for 'endTime'
 *   },
 * });
 */
export function useEmployeeHourReportsQuery(
  baseOptions: Apollo.QueryHookOptions<
    EmployeeHourReportsQuery,
    EmployeeHourReportsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    EmployeeHourReportsQuery,
    EmployeeHourReportsQueryVariables
  >(EmployeeHourReportsDocument, options);
}
export function useEmployeeHourReportsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    EmployeeHourReportsQuery,
    EmployeeHourReportsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    EmployeeHourReportsQuery,
    EmployeeHourReportsQueryVariables
  >(EmployeeHourReportsDocument, options);
}
export type EmployeeHourReportsQueryHookResult = ReturnType<
  typeof useEmployeeHourReportsQuery
>;
export type EmployeeHourReportsLazyQueryHookResult = ReturnType<
  typeof useEmployeeHourReportsLazyQuery
>;
export type EmployeeHourReportsQueryResult = Apollo.QueryResult<
  EmployeeHourReportsQuery,
  EmployeeHourReportsQueryVariables
>;
export const EmployeeSearchDocument = gql`
  query EmployeeSearch($searchString: String!, $options: SearchOptions) {
    employeeSearch(searchString: $searchString, options: $options) {
      ...EmployeeCardSnippet
    }
  }
  ${EmployeeCardSnippetFragmentDoc}
`;

/**
 * __useEmployeeSearchQuery__
 *
 * To run a query within a React component, call `useEmployeeSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useEmployeeSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEmployeeSearchQuery({
 *   variables: {
 *      searchString: // value for 'searchString'
 *      options: // value for 'options'
 *   },
 * });
 */
export function useEmployeeSearchQuery(
  baseOptions: Apollo.QueryHookOptions<
    EmployeeSearchQuery,
    EmployeeSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<EmployeeSearchQuery, EmployeeSearchQueryVariables>(
    EmployeeSearchDocument,
    options
  );
}
export function useEmployeeSearchLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    EmployeeSearchQuery,
    EmployeeSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<EmployeeSearchQuery, EmployeeSearchQueryVariables>(
    EmployeeSearchDocument,
    options
  );
}
export type EmployeeSearchQueryHookResult = ReturnType<
  typeof useEmployeeSearchQuery
>;
export type EmployeeSearchLazyQueryHookResult = ReturnType<
  typeof useEmployeeSearchLazyQuery
>;
export type EmployeeSearchQueryResult = Apollo.QueryResult<
  EmployeeSearchQuery,
  EmployeeSearchQueryVariables
>;
export const EmployeeFullDocument = gql`
  query EmployeeFull($id: String!) {
    employee(id: $id) {
      ...EmployeeFullSnippet
    }
  }
  ${EmployeeFullSnippetFragmentDoc}
`;

/**
 * __useEmployeeFullQuery__
 *
 * To run a query within a React component, call `useEmployeeFullQuery` and pass it any options that fit your needs.
 * When your component renders, `useEmployeeFullQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEmployeeFullQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useEmployeeFullQuery(
  baseOptions: Apollo.QueryHookOptions<
    EmployeeFullQuery,
    EmployeeFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<EmployeeFullQuery, EmployeeFullQueryVariables>(
    EmployeeFullDocument,
    options
  );
}
export function useEmployeeFullLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    EmployeeFullQuery,
    EmployeeFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<EmployeeFullQuery, EmployeeFullQueryVariables>(
    EmployeeFullDocument,
    options
  );
}
export type EmployeeFullQueryHookResult = ReturnType<
  typeof useEmployeeFullQuery
>;
export type EmployeeFullLazyQueryHookResult = ReturnType<
  typeof useEmployeeFullLazyQuery
>;
export type EmployeeFullQueryResult = Apollo.QueryResult<
  EmployeeFullQuery,
  EmployeeFullQueryVariables
>;
export const EmployeeSsrDocument = gql`
  query EmployeeSSR($id: String!) {
    employee(id: $id) {
      ...EmployeeSSRSnippet
    }
  }
  ${EmployeeSsrSnippetFragmentDoc}
`;

/**
 * __useEmployeeSsrQuery__
 *
 * To run a query within a React component, call `useEmployeeSsrQuery` and pass it any options that fit your needs.
 * When your component renders, `useEmployeeSsrQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEmployeeSsrQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useEmployeeSsrQuery(
  baseOptions: Apollo.QueryHookOptions<
    EmployeeSsrQuery,
    EmployeeSsrQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<EmployeeSsrQuery, EmployeeSsrQueryVariables>(
    EmployeeSsrDocument,
    options
  );
}
export function useEmployeeSsrLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    EmployeeSsrQuery,
    EmployeeSsrQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<EmployeeSsrQuery, EmployeeSsrQueryVariables>(
    EmployeeSsrDocument,
    options
  );
}
export type EmployeeSsrQueryHookResult = ReturnType<typeof useEmployeeSsrQuery>;
export type EmployeeSsrLazyQueryHookResult = ReturnType<
  typeof useEmployeeSsrLazyQuery
>;
export type EmployeeSsrQueryResult = Apollo.QueryResult<
  EmployeeSsrQuery,
  EmployeeSsrQueryVariables
>;
export const EmployeeFetchSearchDocument = gql`
  query EmployeeFetchSearch($id: String!) {
    employee(id: $id) {
      ...EmployeeSearchSnippet
    }
  }
  ${EmployeeSearchSnippetFragmentDoc}
`;

/**
 * __useEmployeeFetchSearchQuery__
 *
 * To run a query within a React component, call `useEmployeeFetchSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useEmployeeFetchSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEmployeeFetchSearchQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useEmployeeFetchSearchQuery(
  baseOptions: Apollo.QueryHookOptions<
    EmployeeFetchSearchQuery,
    EmployeeFetchSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    EmployeeFetchSearchQuery,
    EmployeeFetchSearchQueryVariables
  >(EmployeeFetchSearchDocument, options);
}
export function useEmployeeFetchSearchLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    EmployeeFetchSearchQuery,
    EmployeeFetchSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    EmployeeFetchSearchQuery,
    EmployeeFetchSearchQueryVariables
  >(EmployeeFetchSearchDocument, options);
}
export type EmployeeFetchSearchQueryHookResult = ReturnType<
  typeof useEmployeeFetchSearchQuery
>;
export type EmployeeFetchSearchLazyQueryHookResult = ReturnType<
  typeof useEmployeeFetchSearchLazyQuery
>;
export type EmployeeFetchSearchQueryResult = Apollo.QueryResult<
  EmployeeFetchSearchQuery,
  EmployeeFetchSearchQueryVariables
>;
export const FileFullDocument = gql`
  query FileFull($id: String!) {
    file(id: $id) {
      ...FileFullSnippet
    }
  }
  ${FileFullSnippetFragmentDoc}
`;

/**
 * __useFileFullQuery__
 *
 * To run a query within a React component, call `useFileFullQuery` and pass it any options that fit your needs.
 * When your component renders, `useFileFullQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFileFullQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useFileFullQuery(
  baseOptions: Apollo.QueryHookOptions<FileFullQuery, FileFullQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<FileFullQuery, FileFullQueryVariables>(
    FileFullDocument,
    options
  );
}
export function useFileFullLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    FileFullQuery,
    FileFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<FileFullQuery, FileFullQueryVariables>(
    FileFullDocument,
    options
  );
}
export type FileFullQueryHookResult = ReturnType<typeof useFileFullQuery>;
export type FileFullLazyQueryHookResult = ReturnType<
  typeof useFileFullLazyQuery
>;
export type FileFullQueryResult = Apollo.QueryResult<
  FileFullQuery,
  FileFullQueryVariables
>;
export const JobsiteMasterExcelReportByDateDocument = gql`
  query JobsiteMasterExcelReportByDate(
    $startTime: DateTime!
    $endTime: DateTime!
  ) {
    jobsiteMasterExcelReportByDate(startTime: $startTime, endTime: $endTime)
  }
`;

/**
 * __useJobsiteMasterExcelReportByDateQuery__
 *
 * To run a query within a React component, call `useJobsiteMasterExcelReportByDateQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteMasterExcelReportByDateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteMasterExcelReportByDateQuery({
 *   variables: {
 *      startTime: // value for 'startTime'
 *      endTime: // value for 'endTime'
 *   },
 * });
 */
export function useJobsiteMasterExcelReportByDateQuery(
  baseOptions: Apollo.QueryHookOptions<
    JobsiteMasterExcelReportByDateQuery,
    JobsiteMasterExcelReportByDateQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    JobsiteMasterExcelReportByDateQuery,
    JobsiteMasterExcelReportByDateQueryVariables
  >(JobsiteMasterExcelReportByDateDocument, options);
}
export function useJobsiteMasterExcelReportByDateLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsiteMasterExcelReportByDateQuery,
    JobsiteMasterExcelReportByDateQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    JobsiteMasterExcelReportByDateQuery,
    JobsiteMasterExcelReportByDateQueryVariables
  >(JobsiteMasterExcelReportByDateDocument, options);
}
export type JobsiteMasterExcelReportByDateQueryHookResult = ReturnType<
  typeof useJobsiteMasterExcelReportByDateQuery
>;
export type JobsiteMasterExcelReportByDateLazyQueryHookResult = ReturnType<
  typeof useJobsiteMasterExcelReportByDateLazyQuery
>;
export type JobsiteMasterExcelReportByDateQueryResult = Apollo.QueryResult<
  JobsiteMasterExcelReportByDateQuery,
  JobsiteMasterExcelReportByDateQueryVariables
>;
export const JobsiteMonthReportCardDocument = gql`
  query JobsiteMonthReportCard($id: ID!) {
    jobsiteMonthReport(id: $id) {
      ...JobsiteMonthReportCardSnippet
    }
  }
  ${JobsiteMonthReportCardSnippetFragmentDoc}
`;

/**
 * __useJobsiteMonthReportCardQuery__
 *
 * To run a query within a React component, call `useJobsiteMonthReportCardQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteMonthReportCardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteMonthReportCardQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteMonthReportCardQuery(
  baseOptions: Apollo.QueryHookOptions<
    JobsiteMonthReportCardQuery,
    JobsiteMonthReportCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    JobsiteMonthReportCardQuery,
    JobsiteMonthReportCardQueryVariables
  >(JobsiteMonthReportCardDocument, options);
}
export function useJobsiteMonthReportCardLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsiteMonthReportCardQuery,
    JobsiteMonthReportCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    JobsiteMonthReportCardQuery,
    JobsiteMonthReportCardQueryVariables
  >(JobsiteMonthReportCardDocument, options);
}
export type JobsiteMonthReportCardQueryHookResult = ReturnType<
  typeof useJobsiteMonthReportCardQuery
>;
export type JobsiteMonthReportCardLazyQueryHookResult = ReturnType<
  typeof useJobsiteMonthReportCardLazyQuery
>;
export type JobsiteMonthReportCardQueryResult = Apollo.QueryResult<
  JobsiteMonthReportCardQuery,
  JobsiteMonthReportCardQueryVariables
>;
export const JobsiteMonthReportFullDocument = gql`
  query JobsiteMonthReportFull($id: ID!) {
    jobsiteMonthReport(id: $id) {
      ...JobsiteMonthReportFullSnippet
    }
  }
  ${JobsiteMonthReportFullSnippetFragmentDoc}
`;

/**
 * __useJobsiteMonthReportFullQuery__
 *
 * To run a query within a React component, call `useJobsiteMonthReportFullQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteMonthReportFullQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteMonthReportFullQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteMonthReportFullQuery(
  baseOptions: Apollo.QueryHookOptions<
    JobsiteMonthReportFullQuery,
    JobsiteMonthReportFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    JobsiteMonthReportFullQuery,
    JobsiteMonthReportFullQueryVariables
  >(JobsiteMonthReportFullDocument, options);
}
export function useJobsiteMonthReportFullLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsiteMonthReportFullQuery,
    JobsiteMonthReportFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    JobsiteMonthReportFullQuery,
    JobsiteMonthReportFullQueryVariables
  >(JobsiteMonthReportFullDocument, options);
}
export type JobsiteMonthReportFullQueryHookResult = ReturnType<
  typeof useJobsiteMonthReportFullQuery
>;
export type JobsiteMonthReportFullLazyQueryHookResult = ReturnType<
  typeof useJobsiteMonthReportFullLazyQuery
>;
export type JobsiteMonthReportFullQueryResult = Apollo.QueryResult<
  JobsiteMonthReportFullQuery,
  JobsiteMonthReportFullQueryVariables
>;
export const JobsiteSearchDocument = gql`
  query JobsiteSearch($searchString: String!, $options: SearchOptions) {
    jobsiteSearch(searchString: $searchString, options: $options) {
      ...JobsiteCardSnippet
    }
  }
  ${JobsiteCardSnippetFragmentDoc}
`;

/**
 * __useJobsiteSearchQuery__
 *
 * To run a query within a React component, call `useJobsiteSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteSearchQuery({
 *   variables: {
 *      searchString: // value for 'searchString'
 *      options: // value for 'options'
 *   },
 * });
 */
export function useJobsiteSearchQuery(
  baseOptions: Apollo.QueryHookOptions<
    JobsiteSearchQuery,
    JobsiteSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<JobsiteSearchQuery, JobsiteSearchQueryVariables>(
    JobsiteSearchDocument,
    options
  );
}
export function useJobsiteSearchLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsiteSearchQuery,
    JobsiteSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<JobsiteSearchQuery, JobsiteSearchQueryVariables>(
    JobsiteSearchDocument,
    options
  );
}
export type JobsiteSearchQueryHookResult = ReturnType<
  typeof useJobsiteSearchQuery
>;
export type JobsiteSearchLazyQueryHookResult = ReturnType<
  typeof useJobsiteSearchLazyQuery
>;
export type JobsiteSearchQueryResult = Apollo.QueryResult<
  JobsiteSearchQuery,
  JobsiteSearchQueryVariables
>;
export const JobsiteYearMasterReportCurrentDocument = gql`
  query JobsiteYearMasterReportCurrent {
    jobsiteYearMasterReportCurrent {
      ...JobsiteYearMasterReportCardSnippet
    }
  }
  ${JobsiteYearMasterReportCardSnippetFragmentDoc}
`;

/**
 * __useJobsiteYearMasterReportCurrentQuery__
 *
 * To run a query within a React component, call `useJobsiteYearMasterReportCurrentQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteYearMasterReportCurrentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteYearMasterReportCurrentQuery({
 *   variables: {
 *   },
 * });
 */
export function useJobsiteYearMasterReportCurrentQuery(
  baseOptions?: Apollo.QueryHookOptions<
    JobsiteYearMasterReportCurrentQuery,
    JobsiteYearMasterReportCurrentQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    JobsiteYearMasterReportCurrentQuery,
    JobsiteYearMasterReportCurrentQueryVariables
  >(JobsiteYearMasterReportCurrentDocument, options);
}
export function useJobsiteYearMasterReportCurrentLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsiteYearMasterReportCurrentQuery,
    JobsiteYearMasterReportCurrentQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    JobsiteYearMasterReportCurrentQuery,
    JobsiteYearMasterReportCurrentQueryVariables
  >(JobsiteYearMasterReportCurrentDocument, options);
}
export type JobsiteYearMasterReportCurrentQueryHookResult = ReturnType<
  typeof useJobsiteYearMasterReportCurrentQuery
>;
export type JobsiteYearMasterReportCurrentLazyQueryHookResult = ReturnType<
  typeof useJobsiteYearMasterReportCurrentLazyQuery
>;
export type JobsiteYearMasterReportCurrentQueryResult = Apollo.QueryResult<
  JobsiteYearMasterReportCurrentQuery,
  JobsiteYearMasterReportCurrentQueryVariables
>;
export const JobsiteYearMasterReportCardDocument = gql`
  query JobsiteYearMasterReportCard($id: ID!) {
    jobsiteYearMasterReport(id: $id) {
      ...JobsiteYearMasterReportCardSnippet
    }
  }
  ${JobsiteYearMasterReportCardSnippetFragmentDoc}
`;

/**
 * __useJobsiteYearMasterReportCardQuery__
 *
 * To run a query within a React component, call `useJobsiteYearMasterReportCardQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteYearMasterReportCardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteYearMasterReportCardQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteYearMasterReportCardQuery(
  baseOptions: Apollo.QueryHookOptions<
    JobsiteYearMasterReportCardQuery,
    JobsiteYearMasterReportCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    JobsiteYearMasterReportCardQuery,
    JobsiteYearMasterReportCardQueryVariables
  >(JobsiteYearMasterReportCardDocument, options);
}
export function useJobsiteYearMasterReportCardLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsiteYearMasterReportCardQuery,
    JobsiteYearMasterReportCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    JobsiteYearMasterReportCardQuery,
    JobsiteYearMasterReportCardQueryVariables
  >(JobsiteYearMasterReportCardDocument, options);
}
export type JobsiteYearMasterReportCardQueryHookResult = ReturnType<
  typeof useJobsiteYearMasterReportCardQuery
>;
export type JobsiteYearMasterReportCardLazyQueryHookResult = ReturnType<
  typeof useJobsiteYearMasterReportCardLazyQuery
>;
export type JobsiteYearMasterReportCardQueryResult = Apollo.QueryResult<
  JobsiteYearMasterReportCardQuery,
  JobsiteYearMasterReportCardQueryVariables
>;
export const JobsiteYearMasterReportFullDocument = gql`
  query JobsiteYearMasterReportFull($id: ID!) {
    jobsiteYearMasterReport(id: $id) {
      ...JobsiteYearMasterReportFullSnippet
    }
  }
  ${JobsiteYearMasterReportFullSnippetFragmentDoc}
`;

/**
 * __useJobsiteYearMasterReportFullQuery__
 *
 * To run a query within a React component, call `useJobsiteYearMasterReportFullQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteYearMasterReportFullQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteYearMasterReportFullQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteYearMasterReportFullQuery(
  baseOptions: Apollo.QueryHookOptions<
    JobsiteYearMasterReportFullQuery,
    JobsiteYearMasterReportFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    JobsiteYearMasterReportFullQuery,
    JobsiteYearMasterReportFullQueryVariables
  >(JobsiteYearMasterReportFullDocument, options);
}
export function useJobsiteYearMasterReportFullLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsiteYearMasterReportFullQuery,
    JobsiteYearMasterReportFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    JobsiteYearMasterReportFullQuery,
    JobsiteYearMasterReportFullQueryVariables
  >(JobsiteYearMasterReportFullDocument, options);
}
export type JobsiteYearMasterReportFullQueryHookResult = ReturnType<
  typeof useJobsiteYearMasterReportFullQuery
>;
export type JobsiteYearMasterReportFullLazyQueryHookResult = ReturnType<
  typeof useJobsiteYearMasterReportFullLazyQuery
>;
export type JobsiteYearMasterReportFullQueryResult = Apollo.QueryResult<
  JobsiteYearMasterReportFullQuery,
  JobsiteYearMasterReportFullQueryVariables
>;
export const JobsiteYearMasterReportsDocument = gql`
  query JobsiteYearMasterReports {
    jobsiteYearMasterReports {
      ...JobsiteYearMasterReportCardSnippet
    }
  }
  ${JobsiteYearMasterReportCardSnippetFragmentDoc}
`;

/**
 * __useJobsiteYearMasterReportsQuery__
 *
 * To run a query within a React component, call `useJobsiteYearMasterReportsQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteYearMasterReportsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteYearMasterReportsQuery({
 *   variables: {
 *   },
 * });
 */
export function useJobsiteYearMasterReportsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    JobsiteYearMasterReportsQuery,
    JobsiteYearMasterReportsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    JobsiteYearMasterReportsQuery,
    JobsiteYearMasterReportsQueryVariables
  >(JobsiteYearMasterReportsDocument, options);
}
export function useJobsiteYearMasterReportsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsiteYearMasterReportsQuery,
    JobsiteYearMasterReportsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    JobsiteYearMasterReportsQuery,
    JobsiteYearMasterReportsQueryVariables
  >(JobsiteYearMasterReportsDocument, options);
}
export type JobsiteYearMasterReportsQueryHookResult = ReturnType<
  typeof useJobsiteYearMasterReportsQuery
>;
export type JobsiteYearMasterReportsLazyQueryHookResult = ReturnType<
  typeof useJobsiteYearMasterReportsLazyQuery
>;
export type JobsiteYearMasterReportsQueryResult = Apollo.QueryResult<
  JobsiteYearMasterReportsQuery,
  JobsiteYearMasterReportsQueryVariables
>;
export const JobsiteYearReportCardDocument = gql`
  query JobsiteYearReportCard($id: ID!) {
    jobsiteYearReport(id: $id) {
      ...JobsiteYearReportCardSnippet
    }
  }
  ${JobsiteYearReportCardSnippetFragmentDoc}
`;

/**
 * __useJobsiteYearReportCardQuery__
 *
 * To run a query within a React component, call `useJobsiteYearReportCardQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteYearReportCardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteYearReportCardQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteYearReportCardQuery(
  baseOptions: Apollo.QueryHookOptions<
    JobsiteYearReportCardQuery,
    JobsiteYearReportCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    JobsiteYearReportCardQuery,
    JobsiteYearReportCardQueryVariables
  >(JobsiteYearReportCardDocument, options);
}
export function useJobsiteYearReportCardLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsiteYearReportCardQuery,
    JobsiteYearReportCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    JobsiteYearReportCardQuery,
    JobsiteYearReportCardQueryVariables
  >(JobsiteYearReportCardDocument, options);
}
export type JobsiteYearReportCardQueryHookResult = ReturnType<
  typeof useJobsiteYearReportCardQuery
>;
export type JobsiteYearReportCardLazyQueryHookResult = ReturnType<
  typeof useJobsiteYearReportCardLazyQuery
>;
export type JobsiteYearReportCardQueryResult = Apollo.QueryResult<
  JobsiteYearReportCardQuery,
  JobsiteYearReportCardQueryVariables
>;
export const JobsiteYearReportFullDocument = gql`
  query JobsiteYearReportFull($id: ID!) {
    jobsiteYearReport(id: $id) {
      ...JobsiteYearReportFullSnippet
    }
  }
  ${JobsiteYearReportFullSnippetFragmentDoc}
`;

/**
 * __useJobsiteYearReportFullQuery__
 *
 * To run a query within a React component, call `useJobsiteYearReportFullQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteYearReportFullQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteYearReportFullQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteYearReportFullQuery(
  baseOptions: Apollo.QueryHookOptions<
    JobsiteYearReportFullQuery,
    JobsiteYearReportFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    JobsiteYearReportFullQuery,
    JobsiteYearReportFullQueryVariables
  >(JobsiteYearReportFullDocument, options);
}
export function useJobsiteYearReportFullLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsiteYearReportFullQuery,
    JobsiteYearReportFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    JobsiteYearReportFullQuery,
    JobsiteYearReportFullQueryVariables
  >(JobsiteYearReportFullDocument, options);
}
export type JobsiteYearReportFullQueryHookResult = ReturnType<
  typeof useJobsiteYearReportFullQuery
>;
export type JobsiteYearReportFullLazyQueryHookResult = ReturnType<
  typeof useJobsiteYearReportFullLazyQuery
>;
export type JobsiteYearReportFullQueryResult = Apollo.QueryResult<
  JobsiteYearReportFullQuery,
  JobsiteYearReportFullQueryVariables
>;
export const JobsiteYearReportSummaryDocument = gql`
  query JobsiteYearReportSummary($id: ID!) {
    jobsiteYearReport(id: $id) {
      ...JobsiteYearReportSummarySnippet
    }
  }
  ${JobsiteYearReportSummarySnippetFragmentDoc}
`;

/**
 * __useJobsiteYearReportSummaryQuery__
 *
 * To run a query within a React component, call `useJobsiteYearReportSummaryQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteYearReportSummaryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteYearReportSummaryQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteYearReportSummaryQuery(
  baseOptions: Apollo.QueryHookOptions<
    JobsiteYearReportSummaryQuery,
    JobsiteYearReportSummaryQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    JobsiteYearReportSummaryQuery,
    JobsiteYearReportSummaryQueryVariables
  >(JobsiteYearReportSummaryDocument, options);
}
export function useJobsiteYearReportSummaryLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsiteYearReportSummaryQuery,
    JobsiteYearReportSummaryQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    JobsiteYearReportSummaryQuery,
    JobsiteYearReportSummaryQueryVariables
  >(JobsiteYearReportSummaryDocument, options);
}
export type JobsiteYearReportSummaryQueryHookResult = ReturnType<
  typeof useJobsiteYearReportSummaryQuery
>;
export type JobsiteYearReportSummaryLazyQueryHookResult = ReturnType<
  typeof useJobsiteYearReportSummaryLazyQuery
>;
export type JobsiteYearReportSummaryQueryResult = Apollo.QueryResult<
  JobsiteYearReportSummaryQuery,
  JobsiteYearReportSummaryQueryVariables
>;
export const JobsiteFullDocument = gql`
  query JobsiteFull($id: String!) {
    jobsite(id: $id) {
      ...JobsiteFullSnippet
    }
  }
  ${JobsiteFullSnippetFragmentDoc}
`;

/**
 * __useJobsiteFullQuery__
 *
 * To run a query within a React component, call `useJobsiteFullQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteFullQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteFullQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteFullQuery(
  baseOptions: Apollo.QueryHookOptions<
    JobsiteFullQuery,
    JobsiteFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<JobsiteFullQuery, JobsiteFullQueryVariables>(
    JobsiteFullDocument,
    options
  );
}
export function useJobsiteFullLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsiteFullQuery,
    JobsiteFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<JobsiteFullQuery, JobsiteFullQueryVariables>(
    JobsiteFullDocument,
    options
  );
}
export type JobsiteFullQueryHookResult = ReturnType<typeof useJobsiteFullQuery>;
export type JobsiteFullLazyQueryHookResult = ReturnType<
  typeof useJobsiteFullLazyQuery
>;
export type JobsiteFullQueryResult = Apollo.QueryResult<
  JobsiteFullQuery,
  JobsiteFullQueryVariables
>;
export const JobsitesMaterialsDocument = gql`
  query JobsitesMaterials($id: String!) {
    jobsite(id: $id) {
      ...JobsiteMaterialsSnippet
    }
  }
  ${JobsiteMaterialsSnippetFragmentDoc}
`;

/**
 * __useJobsitesMaterialsQuery__
 *
 * To run a query within a React component, call `useJobsitesMaterialsQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsitesMaterialsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsitesMaterialsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsitesMaterialsQuery(
  baseOptions: Apollo.QueryHookOptions<
    JobsitesMaterialsQuery,
    JobsitesMaterialsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    JobsitesMaterialsQuery,
    JobsitesMaterialsQueryVariables
  >(JobsitesMaterialsDocument, options);
}
export function useJobsitesMaterialsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsitesMaterialsQuery,
    JobsitesMaterialsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    JobsitesMaterialsQuery,
    JobsitesMaterialsQueryVariables
  >(JobsitesMaterialsDocument, options);
}
export type JobsitesMaterialsQueryHookResult = ReturnType<
  typeof useJobsitesMaterialsQuery
>;
export type JobsitesMaterialsLazyQueryHookResult = ReturnType<
  typeof useJobsitesMaterialsLazyQuery
>;
export type JobsitesMaterialsQueryResult = Apollo.QueryResult<
  JobsitesMaterialsQuery,
  JobsitesMaterialsQueryVariables
>;
export const JobsitesNonCostedMaterialsDocument = gql`
  query JobsitesNonCostedMaterials($id: String!) {
    jobsite(id: $id) {
      ...JobsiteNonCostedMaterialsSnippet
    }
  }
  ${JobsiteNonCostedMaterialsSnippetFragmentDoc}
`;

/**
 * __useJobsitesNonCostedMaterialsQuery__
 *
 * To run a query within a React component, call `useJobsitesNonCostedMaterialsQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsitesNonCostedMaterialsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsitesNonCostedMaterialsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsitesNonCostedMaterialsQuery(
  baseOptions: Apollo.QueryHookOptions<
    JobsitesNonCostedMaterialsQuery,
    JobsitesNonCostedMaterialsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    JobsitesNonCostedMaterialsQuery,
    JobsitesNonCostedMaterialsQueryVariables
  >(JobsitesNonCostedMaterialsDocument, options);
}
export function useJobsitesNonCostedMaterialsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsitesNonCostedMaterialsQuery,
    JobsitesNonCostedMaterialsQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    JobsitesNonCostedMaterialsQuery,
    JobsitesNonCostedMaterialsQueryVariables
  >(JobsitesNonCostedMaterialsDocument, options);
}
export type JobsitesNonCostedMaterialsQueryHookResult = ReturnType<
  typeof useJobsitesNonCostedMaterialsQuery
>;
export type JobsitesNonCostedMaterialsLazyQueryHookResult = ReturnType<
  typeof useJobsitesNonCostedMaterialsLazyQuery
>;
export type JobsitesNonCostedMaterialsQueryResult = Apollo.QueryResult<
  JobsitesNonCostedMaterialsQuery,
  JobsitesNonCostedMaterialsQueryVariables
>;
export const JobsiteSsrDocument = gql`
  query JobsiteSSR($id: String!) {
    jobsite(id: $id) {
      ...JobsiteSSRSnippet
    }
  }
  ${JobsiteSsrSnippetFragmentDoc}
`;

/**
 * __useJobsiteSsrQuery__
 *
 * To run a query within a React component, call `useJobsiteSsrQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteSsrQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteSsrQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteSsrQuery(
  baseOptions: Apollo.QueryHookOptions<
    JobsiteSsrQuery,
    JobsiteSsrQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<JobsiteSsrQuery, JobsiteSsrQueryVariables>(
    JobsiteSsrDocument,
    options
  );
}
export function useJobsiteSsrLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsiteSsrQuery,
    JobsiteSsrQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<JobsiteSsrQuery, JobsiteSsrQueryVariables>(
    JobsiteSsrDocument,
    options
  );
}
export type JobsiteSsrQueryHookResult = ReturnType<typeof useJobsiteSsrQuery>;
export type JobsiteSsrLazyQueryHookResult = ReturnType<
  typeof useJobsiteSsrLazyQuery
>;
export type JobsiteSsrQueryResult = Apollo.QueryResult<
  JobsiteSsrQuery,
  JobsiteSsrQueryVariables
>;
export const JobsiteFetchSearchDocument = gql`
  query JobsiteFetchSearch($id: String!) {
    jobsite(id: $id) {
      ...JobsiteSearchSnippet
    }
  }
  ${JobsiteSearchSnippetFragmentDoc}
`;

/**
 * __useJobsiteFetchSearchQuery__
 *
 * To run a query within a React component, call `useJobsiteFetchSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteFetchSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteFetchSearchQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteFetchSearchQuery(
  baseOptions: Apollo.QueryHookOptions<
    JobsiteFetchSearchQuery,
    JobsiteFetchSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    JobsiteFetchSearchQuery,
    JobsiteFetchSearchQueryVariables
  >(JobsiteFetchSearchDocument, options);
}
export function useJobsiteFetchSearchLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsiteFetchSearchQuery,
    JobsiteFetchSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    JobsiteFetchSearchQuery,
    JobsiteFetchSearchQueryVariables
  >(JobsiteFetchSearchDocument, options);
}
export type JobsiteFetchSearchQueryHookResult = ReturnType<
  typeof useJobsiteFetchSearchQuery
>;
export type JobsiteFetchSearchLazyQueryHookResult = ReturnType<
  typeof useJobsiteFetchSearchLazyQuery
>;
export type JobsiteFetchSearchQueryResult = Apollo.QueryResult<
  JobsiteFetchSearchQuery,
  JobsiteFetchSearchQueryVariables
>;
export const JobsitesDocument = gql`
  query Jobsites($options: ListOptionData) {
    jobsites(options: $options) {
      ...JobsiteCardSnippet
    }
  }
  ${JobsiteCardSnippetFragmentDoc}
`;

/**
 * __useJobsitesQuery__
 *
 * To run a query within a React component, call `useJobsitesQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsitesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsitesQuery({
 *   variables: {
 *      options: // value for 'options'
 *   },
 * });
 */
export function useJobsitesQuery(
  baseOptions?: Apollo.QueryHookOptions<JobsitesQuery, JobsitesQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<JobsitesQuery, JobsitesQueryVariables>(
    JobsitesDocument,
    options
  );
}
export function useJobsitesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsitesQuery,
    JobsitesQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<JobsitesQuery, JobsitesQueryVariables>(
    JobsitesDocument,
    options
  );
}
export type JobsitesQueryHookResult = ReturnType<typeof useJobsitesQuery>;
export type JobsitesLazyQueryHookResult = ReturnType<
  typeof useJobsitesLazyQuery
>;
export type JobsitesQueryResult = Apollo.QueryResult<
  JobsitesQuery,
  JobsitesQueryVariables
>;
export const JobsitesTruckingRateDocument = gql`
  query JobsitesTruckingRate($options: ListOptionData) {
    jobsites(options: $options) {
      ...JobsiteTruckingRatesSnippet
    }
  }
  ${JobsiteTruckingRatesSnippetFragmentDoc}
`;

/**
 * __useJobsitesTruckingRateQuery__
 *
 * To run a query within a React component, call `useJobsitesTruckingRateQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsitesTruckingRateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsitesTruckingRateQuery({
 *   variables: {
 *      options: // value for 'options'
 *   },
 * });
 */
export function useJobsitesTruckingRateQuery(
  baseOptions?: Apollo.QueryHookOptions<
    JobsitesTruckingRateQuery,
    JobsitesTruckingRateQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    JobsitesTruckingRateQuery,
    JobsitesTruckingRateQueryVariables
  >(JobsitesTruckingRateDocument, options);
}
export function useJobsitesTruckingRateLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    JobsitesTruckingRateQuery,
    JobsitesTruckingRateQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    JobsitesTruckingRateQuery,
    JobsitesTruckingRateQueryVariables
  >(JobsitesTruckingRateDocument, options);
}
export type JobsitesTruckingRateQueryHookResult = ReturnType<
  typeof useJobsitesTruckingRateQuery
>;
export type JobsitesTruckingRateLazyQueryHookResult = ReturnType<
  typeof useJobsitesTruckingRateLazyQuery
>;
export type JobsitesTruckingRateQueryResult = Apollo.QueryResult<
  JobsitesTruckingRateQuery,
  JobsitesTruckingRateQueryVariables
>;
export const MaterialSearchDocument = gql`
  query MaterialSearch($searchString: String!, $options: SearchOptions) {
    materialSearch(searchString: $searchString, options: $options) {
      ...MaterialCardSnippet
    }
  }
  ${MaterialCardSnippetFragmentDoc}
`;

/**
 * __useMaterialSearchQuery__
 *
 * To run a query within a React component, call `useMaterialSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useMaterialSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMaterialSearchQuery({
 *   variables: {
 *      searchString: // value for 'searchString'
 *      options: // value for 'options'
 *   },
 * });
 */
export function useMaterialSearchQuery(
  baseOptions: Apollo.QueryHookOptions<
    MaterialSearchQuery,
    MaterialSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<MaterialSearchQuery, MaterialSearchQueryVariables>(
    MaterialSearchDocument,
    options
  );
}
export function useMaterialSearchLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    MaterialSearchQuery,
    MaterialSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<MaterialSearchQuery, MaterialSearchQueryVariables>(
    MaterialSearchDocument,
    options
  );
}
export type MaterialSearchQueryHookResult = ReturnType<
  typeof useMaterialSearchQuery
>;
export type MaterialSearchLazyQueryHookResult = ReturnType<
  typeof useMaterialSearchLazyQuery
>;
export type MaterialSearchQueryResult = Apollo.QueryResult<
  MaterialSearchQuery,
  MaterialSearchQueryVariables
>;
export const MaterialCardDocument = gql`
  query MaterialCard($id: String!) {
    material(id: $id) {
      ...MaterialCardSnippet
    }
  }
  ${MaterialCardSnippetFragmentDoc}
`;

/**
 * __useMaterialCardQuery__
 *
 * To run a query within a React component, call `useMaterialCardQuery` and pass it any options that fit your needs.
 * When your component renders, `useMaterialCardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMaterialCardQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useMaterialCardQuery(
  baseOptions: Apollo.QueryHookOptions<
    MaterialCardQuery,
    MaterialCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<MaterialCardQuery, MaterialCardQueryVariables>(
    MaterialCardDocument,
    options
  );
}
export function useMaterialCardLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    MaterialCardQuery,
    MaterialCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<MaterialCardQuery, MaterialCardQueryVariables>(
    MaterialCardDocument,
    options
  );
}
export type MaterialCardQueryHookResult = ReturnType<
  typeof useMaterialCardQuery
>;
export type MaterialCardLazyQueryHookResult = ReturnType<
  typeof useMaterialCardLazyQuery
>;
export type MaterialCardQueryResult = Apollo.QueryResult<
  MaterialCardQuery,
  MaterialCardQueryVariables
>;
export const MaterialsCardDocument = gql`
  query MaterialsCard($options: ListOptionData) {
    materials(options: $options) {
      ...MaterialCardSnippet
    }
  }
  ${MaterialCardSnippetFragmentDoc}
`;

/**
 * __useMaterialsCardQuery__
 *
 * To run a query within a React component, call `useMaterialsCardQuery` and pass it any options that fit your needs.
 * When your component renders, `useMaterialsCardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMaterialsCardQuery({
 *   variables: {
 *      options: // value for 'options'
 *   },
 * });
 */
export function useMaterialsCardQuery(
  baseOptions?: Apollo.QueryHookOptions<
    MaterialsCardQuery,
    MaterialsCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<MaterialsCardQuery, MaterialsCardQueryVariables>(
    MaterialsCardDocument,
    options
  );
}
export function useMaterialsCardLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    MaterialsCardQuery,
    MaterialsCardQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<MaterialsCardQuery, MaterialsCardQueryVariables>(
    MaterialsCardDocument,
    options
  );
}
export type MaterialsCardQueryHookResult = ReturnType<
  typeof useMaterialsCardQuery
>;
export type MaterialsCardLazyQueryHookResult = ReturnType<
  typeof useMaterialsCardLazyQuery
>;
export type MaterialsCardQueryResult = Apollo.QueryResult<
  MaterialsCardQuery,
  MaterialsCardQueryVariables
>;
export const MaterialsFullDocument = gql`
  query MaterialsFull($options: ListOptionData) {
    materials(options: $options) {
      ...MaterialFullSnippet
    }
  }
  ${MaterialFullSnippetFragmentDoc}
`;

/**
 * __useMaterialsFullQuery__
 *
 * To run a query within a React component, call `useMaterialsFullQuery` and pass it any options that fit your needs.
 * When your component renders, `useMaterialsFullQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMaterialsFullQuery({
 *   variables: {
 *      options: // value for 'options'
 *   },
 * });
 */
export function useMaterialsFullQuery(
  baseOptions?: Apollo.QueryHookOptions<
    MaterialsFullQuery,
    MaterialsFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<MaterialsFullQuery, MaterialsFullQueryVariables>(
    MaterialsFullDocument,
    options
  );
}
export function useMaterialsFullLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    MaterialsFullQuery,
    MaterialsFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<MaterialsFullQuery, MaterialsFullQueryVariables>(
    MaterialsFullDocument,
    options
  );
}
export type MaterialsFullQueryHookResult = ReturnType<
  typeof useMaterialsFullQuery
>;
export type MaterialsFullLazyQueryHookResult = ReturnType<
  typeof useMaterialsFullLazyQuery
>;
export type MaterialsFullQueryResult = Apollo.QueryResult<
  MaterialsFullQuery,
  MaterialsFullQueryVariables
>;
export const SearchDocument = gql`
  query Search($searchString: String!) {
    search(searchString: $searchString) {
      ...SearchSnippet
    }
  }
  ${SearchSnippetFragmentDoc}
`;

/**
 * __useSearchQuery__
 *
 * To run a query within a React component, call `useSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchQuery({
 *   variables: {
 *      searchString: // value for 'searchString'
 *   },
 * });
 */
export function useSearchQuery(
  baseOptions: Apollo.QueryHookOptions<SearchQuery, SearchQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<SearchQuery, SearchQueryVariables>(
    SearchDocument,
    options
  );
}
export function useSearchLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<SearchQuery, SearchQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<SearchQuery, SearchQueryVariables>(
    SearchDocument,
    options
  );
}
export type SearchQueryHookResult = ReturnType<typeof useSearchQuery>;
export type SearchLazyQueryHookResult = ReturnType<typeof useSearchLazyQuery>;
export type SearchQueryResult = Apollo.QueryResult<
  SearchQuery,
  SearchQueryVariables
>;
export const SignupSsrDocument = gql`
  query SignupSSR($id: String!) {
    signup(id: $id) {
      ...SignupFullSnippet
    }
  }
  ${SignupFullSnippetFragmentDoc}
`;

/**
 * __useSignupSsrQuery__
 *
 * To run a query within a React component, call `useSignupSsrQuery` and pass it any options that fit your needs.
 * When your component renders, `useSignupSsrQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSignupSsrQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useSignupSsrQuery(
  baseOptions: Apollo.QueryHookOptions<SignupSsrQuery, SignupSsrQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<SignupSsrQuery, SignupSsrQueryVariables>(
    SignupSsrDocument,
    options
  );
}
export function useSignupSsrLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    SignupSsrQuery,
    SignupSsrQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<SignupSsrQuery, SignupSsrQueryVariables>(
    SignupSsrDocument,
    options
  );
}
export type SignupSsrQueryHookResult = ReturnType<typeof useSignupSsrQuery>;
export type SignupSsrLazyQueryHookResult = ReturnType<
  typeof useSignupSsrLazyQuery
>;
export type SignupSsrQueryResult = Apollo.QueryResult<
  SignupSsrQuery,
  SignupSsrQueryVariables
>;
export const SystemDocument = gql`
  query System {
    system {
      ...SystemSnippet
    }
  }
  ${SystemSnippetFragmentDoc}
`;

/**
 * __useSystemQuery__
 *
 * To run a query within a React component, call `useSystemQuery` and pass it any options that fit your needs.
 * When your component renders, `useSystemQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSystemQuery({
 *   variables: {
 *   },
 * });
 */
export function useSystemQuery(
  baseOptions?: Apollo.QueryHookOptions<SystemQuery, SystemQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<SystemQuery, SystemQueryVariables>(
    SystemDocument,
    options
  );
}
export function useSystemLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<SystemQuery, SystemQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<SystemQuery, SystemQueryVariables>(
    SystemDocument,
    options
  );
}
export type SystemQueryHookResult = ReturnType<typeof useSystemQuery>;
export type SystemLazyQueryHookResult = ReturnType<typeof useSystemLazyQuery>;
export type SystemQueryResult = Apollo.QueryResult<
  SystemQuery,
  SystemQueryVariables
>;
export const UserForPasswordResetDocument = gql`
  query UserForPasswordReset($query: UserQuery!) {
    user(query: $query) {
      _id
      name
    }
  }
`;

/**
 * __useUserForPasswordResetQuery__
 *
 * To run a query within a React component, call `useUserForPasswordResetQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserForPasswordResetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserForPasswordResetQuery({
 *   variables: {
 *      query: // value for 'query'
 *   },
 * });
 */
export function useUserForPasswordResetQuery(
  baseOptions: Apollo.QueryHookOptions<
    UserForPasswordResetQuery,
    UserForPasswordResetQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    UserForPasswordResetQuery,
    UserForPasswordResetQueryVariables
  >(UserForPasswordResetDocument, options);
}
export function useUserForPasswordResetLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    UserForPasswordResetQuery,
    UserForPasswordResetQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    UserForPasswordResetQuery,
    UserForPasswordResetQueryVariables
  >(UserForPasswordResetDocument, options);
}
export type UserForPasswordResetQueryHookResult = ReturnType<
  typeof useUserForPasswordResetQuery
>;
export type UserForPasswordResetLazyQueryHookResult = ReturnType<
  typeof useUserForPasswordResetLazyQuery
>;
export type UserForPasswordResetQueryResult = Apollo.QueryResult<
  UserForPasswordResetQuery,
  UserForPasswordResetQueryVariables
>;
export const UsersDocument = gql`
  query Users($options: ListOptionData) {
    users(options: $options) {
      ...UserCardSnippet
    }
  }
  ${UserCardSnippetFragmentDoc}
`;

/**
 * __useUsersQuery__
 *
 * To run a query within a React component, call `useUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsersQuery({
 *   variables: {
 *      options: // value for 'options'
 *   },
 * });
 */
export function useUsersQuery(
  baseOptions?: Apollo.QueryHookOptions<UsersQuery, UsersQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<UsersQuery, UsersQueryVariables>(
    UsersDocument,
    options
  );
}
export function useUsersLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<UsersQuery, UsersQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<UsersQuery, UsersQueryVariables>(
    UsersDocument,
    options
  );
}
export type UsersQueryHookResult = ReturnType<typeof useUsersQuery>;
export type UsersLazyQueryHookResult = ReturnType<typeof useUsersLazyQuery>;
export type UsersQueryResult = Apollo.QueryResult<
  UsersQuery,
  UsersQueryVariables
>;
export const VehicleSearchDocument = gql`
  query VehicleSearch($searchString: String!, $options: SearchOptions) {
    vehicleSearch(searchString: $searchString, options: $options) {
      ...VehicleSearchSnippet
    }
  }
  ${VehicleSearchSnippetFragmentDoc}
`;

/**
 * __useVehicleSearchQuery__
 *
 * To run a query within a React component, call `useVehicleSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useVehicleSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useVehicleSearchQuery({
 *   variables: {
 *      searchString: // value for 'searchString'
 *      options: // value for 'options'
 *   },
 * });
 */
export function useVehicleSearchQuery(
  baseOptions: Apollo.QueryHookOptions<
    VehicleSearchQuery,
    VehicleSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<VehicleSearchQuery, VehicleSearchQueryVariables>(
    VehicleSearchDocument,
    options
  );
}
export function useVehicleSearchLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    VehicleSearchQuery,
    VehicleSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<VehicleSearchQuery, VehicleSearchQueryVariables>(
    VehicleSearchDocument,
    options
  );
}
export type VehicleSearchQueryHookResult = ReturnType<
  typeof useVehicleSearchQuery
>;
export type VehicleSearchLazyQueryHookResult = ReturnType<
  typeof useVehicleSearchLazyQuery
>;
export type VehicleSearchQueryResult = Apollo.QueryResult<
  VehicleSearchQuery,
  VehicleSearchQueryVariables
>;
export const VehicleFullDocument = gql`
  query VehicleFull($id: String!) {
    vehicle(id: $id) {
      ...VehicleFullSnippet
    }
  }
  ${VehicleFullSnippetFragmentDoc}
`;

/**
 * __useVehicleFullQuery__
 *
 * To run a query within a React component, call `useVehicleFullQuery` and pass it any options that fit your needs.
 * When your component renders, `useVehicleFullQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useVehicleFullQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useVehicleFullQuery(
  baseOptions: Apollo.QueryHookOptions<
    VehicleFullQuery,
    VehicleFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<VehicleFullQuery, VehicleFullQueryVariables>(
    VehicleFullDocument,
    options
  );
}
export function useVehicleFullLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    VehicleFullQuery,
    VehicleFullQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<VehicleFullQuery, VehicleFullQueryVariables>(
    VehicleFullDocument,
    options
  );
}
export type VehicleFullQueryHookResult = ReturnType<typeof useVehicleFullQuery>;
export type VehicleFullLazyQueryHookResult = ReturnType<
  typeof useVehicleFullLazyQuery
>;
export type VehicleFullQueryResult = Apollo.QueryResult<
  VehicleFullQuery,
  VehicleFullQueryVariables
>;
export const VehicleSsrDocument = gql`
  query VehicleSSR($id: String!) {
    vehicle(id: $id) {
      ...VehicleSSRSnippet
    }
  }
  ${VehicleSsrSnippetFragmentDoc}
`;

/**
 * __useVehicleSsrQuery__
 *
 * To run a query within a React component, call `useVehicleSsrQuery` and pass it any options that fit your needs.
 * When your component renders, `useVehicleSsrQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useVehicleSsrQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useVehicleSsrQuery(
  baseOptions: Apollo.QueryHookOptions<
    VehicleSsrQuery,
    VehicleSsrQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<VehicleSsrQuery, VehicleSsrQueryVariables>(
    VehicleSsrDocument,
    options
  );
}
export function useVehicleSsrLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    VehicleSsrQuery,
    VehicleSsrQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<VehicleSsrQuery, VehicleSsrQueryVariables>(
    VehicleSsrDocument,
    options
  );
}
export type VehicleSsrQueryHookResult = ReturnType<typeof useVehicleSsrQuery>;
export type VehicleSsrLazyQueryHookResult = ReturnType<
  typeof useVehicleSsrLazyQuery
>;
export type VehicleSsrQueryResult = Apollo.QueryResult<
  VehicleSsrQuery,
  VehicleSsrQueryVariables
>;
export const VehicleFetchSearchDocument = gql`
  query VehicleFetchSearch($id: String!) {
    vehicle(id: $id) {
      ...VehicleSearchSnippet
    }
  }
  ${VehicleSearchSnippetFragmentDoc}
`;

/**
 * __useVehicleFetchSearchQuery__
 *
 * To run a query within a React component, call `useVehicleFetchSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useVehicleFetchSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useVehicleFetchSearchQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useVehicleFetchSearchQuery(
  baseOptions: Apollo.QueryHookOptions<
    VehicleFetchSearchQuery,
    VehicleFetchSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    VehicleFetchSearchQuery,
    VehicleFetchSearchQueryVariables
  >(VehicleFetchSearchDocument, options);
}
export function useVehicleFetchSearchLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    VehicleFetchSearchQuery,
    VehicleFetchSearchQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    VehicleFetchSearchQuery,
    VehicleFetchSearchQueryVariables
  >(VehicleFetchSearchDocument, options);
}
export type VehicleFetchSearchQueryHookResult = ReturnType<
  typeof useVehicleFetchSearchQuery
>;
export type VehicleFetchSearchLazyQueryHookResult = ReturnType<
  typeof useVehicleFetchSearchLazyQuery
>;
export type VehicleFetchSearchQueryResult = Apollo.QueryResult<
  VehicleFetchSearchQuery,
  VehicleFetchSearchQueryVariables
>;
export const JobsiteMonthReportSubDocument = gql`
  subscription JobsiteMonthReportSub($id: ID!) {
    jobsiteMonthReportSub(id: $id) {
      ...JobsiteMonthReportFullSnippet
    }
  }
  ${JobsiteMonthReportFullSnippetFragmentDoc}
`;

/**
 * __useJobsiteMonthReportSubSubscription__
 *
 * To run a query within a React component, call `useJobsiteMonthReportSubSubscription` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteMonthReportSubSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteMonthReportSubSubscription({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteMonthReportSubSubscription(
  baseOptions: Apollo.SubscriptionHookOptions<
    JobsiteMonthReportSubSubscription,
    JobsiteMonthReportSubSubscriptionVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useSubscription<
    JobsiteMonthReportSubSubscription,
    JobsiteMonthReportSubSubscriptionVariables
  >(JobsiteMonthReportSubDocument, options);
}
export type JobsiteMonthReportSubSubscriptionHookResult = ReturnType<
  typeof useJobsiteMonthReportSubSubscription
>;
export type JobsiteMonthReportSubSubscriptionResult =
  Apollo.SubscriptionResult<JobsiteMonthReportSubSubscription>;
export const JobsiteYearMasterReportSubDocument = gql`
  subscription JobsiteYearMasterReportSub($id: ID!) {
    jobsiteYearMasterReportSub(id: $id) {
      ...JobsiteYearMasterReportFullSnippet
    }
  }
  ${JobsiteYearMasterReportFullSnippetFragmentDoc}
`;

/**
 * __useJobsiteYearMasterReportSubSubscription__
 *
 * To run a query within a React component, call `useJobsiteYearMasterReportSubSubscription` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteYearMasterReportSubSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteYearMasterReportSubSubscription({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteYearMasterReportSubSubscription(
  baseOptions: Apollo.SubscriptionHookOptions<
    JobsiteYearMasterReportSubSubscription,
    JobsiteYearMasterReportSubSubscriptionVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useSubscription<
    JobsiteYearMasterReportSubSubscription,
    JobsiteYearMasterReportSubSubscriptionVariables
  >(JobsiteYearMasterReportSubDocument, options);
}
export type JobsiteYearMasterReportSubSubscriptionHookResult = ReturnType<
  typeof useJobsiteYearMasterReportSubSubscription
>;
export type JobsiteYearMasterReportSubSubscriptionResult =
  Apollo.SubscriptionResult<JobsiteYearMasterReportSubSubscription>;
export const JobsiteYearReportSubDocument = gql`
  subscription JobsiteYearReportSub($id: ID!) {
    jobsiteYearReportSub(id: $id) {
      ...JobsiteYearReportFullSnippet
    }
  }
  ${JobsiteYearReportFullSnippetFragmentDoc}
`;

/**
 * __useJobsiteYearReportSubSubscription__
 *
 * To run a query within a React component, call `useJobsiteYearReportSubSubscription` and pass it any options that fit your needs.
 * When your component renders, `useJobsiteYearReportSubSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsiteYearReportSubSubscription({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobsiteYearReportSubSubscription(
  baseOptions: Apollo.SubscriptionHookOptions<
    JobsiteYearReportSubSubscription,
    JobsiteYearReportSubSubscriptionVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useSubscription<
    JobsiteYearReportSubSubscription,
    JobsiteYearReportSubSubscriptionVariables
  >(JobsiteYearReportSubDocument, options);
}
export type JobsiteYearReportSubSubscriptionHookResult = ReturnType<
  typeof useJobsiteYearReportSubSubscription
>;
export type JobsiteYearReportSubSubscriptionResult =
  Apollo.SubscriptionResult<JobsiteYearReportSubSubscription>;

