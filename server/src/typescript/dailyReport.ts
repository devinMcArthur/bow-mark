import { CrewDocument, DailyReportDocument, JobsiteDocument } from "@models";
import { registerEnumType } from "type-graphql";
import { Id } from "./models";

export interface IDailyReportUpdate {
  date: Date;
  jobsiteId: Id;
}

export interface IDailyReportCreate {
  jobsite: JobsiteDocument;
  crew: CrewDocument;
  date: Date;
}

export interface IDailyReportSearchObject {
  score: number;
  dailyReport: DailyReportDocument;
}

export enum DailyReportListFilter {
  NoPayroll = "NoPayroll",
  NoCostApproval = "NoCostApproval",
}

registerEnumType(DailyReportListFilter, {
  name: "DailyReportListFilter",
});
