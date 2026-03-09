import { DailyReportDocument } from "@models";

export interface IProductionUpdate {
  jobTitle: string;
  quantity: number;
  unit: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}

export interface IProductionCreate {
  jobTitle: string;
  quantity: number;
  unit: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  dailyReport: DailyReportDocument;
}
