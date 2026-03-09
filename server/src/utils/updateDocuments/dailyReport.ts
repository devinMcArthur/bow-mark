import { DailyReport } from "@models";
import dayjs from "dayjs";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const updateToV1 = async () => {
  const dailyReports = await DailyReport.find({
    schemaVersion: undefined,
  });

  if (dailyReports.length > 0) {
    console.log(
      `Updating ${dailyReports.length} DailyReport document(s) to Schema Version 1...`
    );

    for (let i = 0; i < dailyReports.length; i++) {
      const dailyReport = dailyReports[i];

      if (dailyReport.date) {
        const offset = dayjs(dailyReport.date)
          .tz("America/Edmonton")
          .utcOffset();
        dailyReport.date = dayjs(dailyReport.date)
          .add(Math.abs(offset), "minutes")
          .toDate();
      } else {
        dailyReport.date = new Date();
      }

      dailyReport.schemaVersion = 1;

      await dailyReport.save();
    }

    console.log(
      `...successfully updated ${dailyReports.length} DailyReport document(s) to Schema Version 1.`
    );
  }

  return;
};

const updateDailyReport = async () => {
  await updateToV1();

  return;
};

export default updateDailyReport;
