import { DailyReportDocument } from "@models";
import { Id } from "./models";

export interface IVehicleWorkUpdate {
  jobTitle?: string;
  hours: number;
}

export interface IVehicleWorkCreate {
  jobTitle?: string;
  hours: number;
  vehicleId: Id;
  dailyReport: DailyReportDocument;
}
