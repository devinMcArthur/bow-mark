import { CrewDocument, DailyReportDocument, JobsiteDocument } from "@models";
import SearchClient from "../../client";
import SearchIndices from "@constants/SearchIndices";
import { logger } from "@logger";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface DailyReportSearchDocument {
  id: string;
  jobsiteName: string;
  jobsiteCode: string;
  crewName: string;
  // Timestamp in seconds
  date: number;
  // Human-readable date fields for text search
  dayOfWeek: string; // e.g., "Monday"
  monthName: string; // e.g., "January"
  dateText: string; // e.g., "January 15 2024"
}

export const DailyReportSearchIndex =
  SearchClient.index<DailyReportSearchDocument>(SearchIndices.DailyReport);
DailyReportSearchIndex.primaryKey = "id";

export const search_UpdateDailyReport = async (
  dailyReport: DailyReportDocument
) => {
  if (process.env.NODE_ENV === "test") return;

  if (dailyReport.archived !== true) {
    let crew: CrewDocument | undefined = undefined,
      jobsite: JobsiteDocument | undefined = undefined;
    try {
      jobsite = await dailyReport.getJobsite();
      crew = await dailyReport.getCrew();
    } catch (e: unknown) {
      logger.info(`Daily Report search update error: ${(e as Error).message}`);
    }

    const reportDate = new Date(dailyReport.date);
    const dayOfWeek = DAYS_OF_WEEK[reportDate.getDay()];
    const monthName = MONTHS[reportDate.getMonth()];
    const day = reportDate.getDate();
    const year = reportDate.getFullYear();

    await DailyReportSearchIndex.addDocuments([
      {
        id: dailyReport._id.toString(),
        jobsiteName: jobsite?.name || "",
        jobsiteCode: jobsite?.jobcode || "",
        crewName: crew?.name || "",
        date: Date.parse(dailyReport.date.toString()) / 1000,
        dayOfWeek,
        monthName,
        dateText: `${monthName} ${day} ${year}`,
      },
    ]);
  } else {
    await DailyReportSearchIndex.deleteDocument(dailyReport._id.toString());
  }
};
