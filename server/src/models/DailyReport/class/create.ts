import { DailyReportDocument, DailyReportModel } from "@models";
import { IDailyReportCreate } from "@typescript/dailyReport";
import { timezoneStartOfDayinUTC } from "@utils/time";
import { eventfulMutation } from "@lib/eventfulMutation";

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

  const createdId = await eventfulMutation(async (session) => {
    const created = await DailyReport.insertMany(
      [
        {
          crew: data.crew._id,
          jobsite: data.jobsite._id,
          date: startOfDay,
        },
      ],
      { session }
    );
    const dailyReport = created[0] as DailyReportDocument;
    // No entity-root provisioning here: the per-entity document folder
    // is created lazily the first time a file is actually posted (see
    // `ensureEntityRoot` mutation). Keeps the file tree free of empty
    // folders for the many daily reports that never have attachments.
    return { result: dailyReport._id, event: null };
  });

  // Re-fetch outside the transaction so the returned document isn't tied
  // to the (now-committed, expired) session — caller may still call .save().
  const fresh = await DailyReport.findById(createdId);
  if (!fresh) {
    throw new Error(
      "DailyReport.createDocument: document disappeared after create transaction"
    );
  }
  return fresh;
};

export default {
  document,
};
