import { JobsiteDocument } from "@models";
import { registerEnumType } from "type-graphql";
import { IDefaultRateData, IRatesData } from "./models";
import { IFileCreate } from "./file";
import { UserRoles } from "./user";

export interface IJobsiteCreate {
  name: string;
  jobcode: string;
  description?: string;
  contract?: IJobsiteContract;
}

export interface IJobsiteUpdate {
  name: string;
  description?: string | null;
}

export interface IJobsiteSearchObject {
  score: number;
  jobsite: JobsiteDocument;
}

export enum TruckingRateTypes {
  Hour = "Hour",
  Quantity = "Quantity",
}

registerEnumType(TruckingRateTypes, {
  name: "TruckingRateTypes",
});

export interface ITruckingRateData extends IRatesData {
  type: TruckingRateTypes;
}

export interface ITruckingTypeRateData extends IDefaultRateData {
  rates: ITruckingRateData[];
}

export interface IJobsiteFileObject {
  file: IFileCreate;
  minRole: UserRoles;
}

export interface IJobsiteContract {
  bidValue: number;
  expectedProfit: number;
}
