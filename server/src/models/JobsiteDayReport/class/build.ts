import {
  JobsiteDayReportDocument,
  JobsiteDayReportModel,
  JobsiteDocument,
  System,
} from "@models";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { timezoneStartOfDayinUTC } from "@utils/time";

dayjs.extend(utc);
dayjs.extend(timezone);

const allForJobsite = async (
  JobsiteDayReport: JobsiteDayReportModel,
  jobsite: JobsiteDocument
): Promise<JobsiteDayReportDocument[]> => {
  // Get all existing jobsite daily reports
  const dailyReports = await jobsite.getDailyReports();
  const dailyReportDates = dailyReports
    .filter((report) => report.approved === true)
    .map((report) => report.date);

  // Set all dates to start of day in UTC
  const startOfDayDates = [];
  for (const date of dailyReportDates) {
    startOfDayDates.push(await timezoneStartOfDayinUTC(date));
  }

  const system = await System.getSystem();

  // Get all unique dates on this jobsite
  const uniqueDates = startOfDayDates.filter((date, index, array) => {
    let match = false;
    for (let i = index; i >= 0; i--) {
      if (
        i !== index &&
        dayjs(array[i])
          .tz(system.timezone)
          .isSame(dayjs(date).tz(system.timezone), "day")
      )
        match = true;
    }
    return !match;
  });

  const reports: JobsiteDayReportDocument[] = [];
  for (let i = 0; i < uniqueDates.length; i++) {
    reports.push(
      await JobsiteDayReport.requestBuildForJobsiteDay(jobsite, uniqueDates[i])
    );
  }

  return reports;
};

const forJobsiteDay = async (
  JobsiteDayReport: JobsiteDayReportModel,
  jobsite: JobsiteDocument,
  day: Date
): Promise<JobsiteDayReportDocument> => {
  const startOfDay = await timezoneStartOfDayinUTC(day);

  let jobsiteDayReport = await JobsiteDayReport.getByJobsiteAndDay(
    jobsite._id,
    day
  );

  if (jobsiteDayReport) jobsiteDayReport.date = startOfDay;

  if (!jobsiteDayReport) {
    jobsiteDayReport = await JobsiteDayReport.createDocument(
      jobsite,
      startOfDay
    );
  }

  await jobsiteDayReport.requestUpdate();

  await jobsiteDayReport.save();

  return jobsiteDayReport;
};

export default {
  allForJobsite,
  forJobsiteDay,
};
