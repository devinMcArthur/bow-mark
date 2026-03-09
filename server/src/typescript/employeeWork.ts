import { DailyReportDocument } from "@models";
import { Types } from "mongoose";

export interface IEmployeeWorkUpdate {
  jobTitle: string;
  startTime: Date;
  endTime: Date;
}

export interface IEmployeeWorkCreate {
  jobTitle: string;
  startTime: Date;
  endTime: Date;
  employeeId: string | Types.ObjectId;
  dailyReport: DailyReportDocument;
}
