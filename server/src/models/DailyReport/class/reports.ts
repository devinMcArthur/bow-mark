import { DailyReportDocument, JobsiteDayReport } from "@models";

const requestUpdate = async (dailyReport: DailyReportDocument) => {
  const jobsite = await dailyReport.getJobsite();

  await JobsiteDayReport.requestBuildForJobsiteDay(jobsite, dailyReport.date);

  return;
};

export default {
  requestUpdate,
};
