import { DailyReportDocument, DailyReportModel } from "@models";
import { IDailyReportCreate } from "@typescript/dailyReport";
import { timezoneStartOfDayinUTC } from "@utils/time";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const document = async (
  DailyReport: DailyReportModel,
  data: IDailyReportCreate
): Promise<DailyReportDocument> => {
  const startOfDay = await timezoneStartOfDayinUTC(data.date);

  const existingReport = await DailyReport.getExistingReport(
    data.jobsite._id,
    data.crew._id,
    startOfDay
  );

  if (existingReport)
    throw new Error("DailyReport.createDocument: a report already exists");

  const dailyReport = new DailyReport({
    crew: data.crew._id,
    jobsite: data.jobsite._id,
    date: startOfDay,
  });

  return dailyReport;
};

export default {
  document,
};
