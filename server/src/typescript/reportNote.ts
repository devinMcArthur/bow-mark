import { DailyReportDocument } from "@models";

export interface IReportNoteUpdate {
  note: string;
}

export interface IReportNoteCreate extends IReportNoteUpdate {
  dailyReport: DailyReportDocument;
}
