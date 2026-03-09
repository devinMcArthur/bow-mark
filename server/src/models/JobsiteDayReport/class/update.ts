import { JobsiteDayReportDocument, JobsiteMonthReport } from "@models";
import { UpdateStatus } from "@typescript/models";

const document = async (jobsiteDayReport: JobsiteDayReportDocument) => {
  await jobsiteDayReport.generateReports();

  jobsiteDayReport.update.status = UpdateStatus.Updated;
  jobsiteDayReport.update.lastUpdatedAt = new Date();

  await jobsiteDayReport.save();

  if (jobsiteDayReport.jobsite)
    await JobsiteMonthReport.requestBuild({
      jobsiteId: jobsiteDayReport.jobsite,
      date: jobsiteDayReport.date,
    });

  return;
};

const requestUpdate = async (jobsiteDayReport: JobsiteDayReportDocument) => {
  if (jobsiteDayReport.update.status !== UpdateStatus.Pending)
    jobsiteDayReport.update.status = UpdateStatus.Requested;

  return;
};

export default {
  document,
  requestUpdate,
};
