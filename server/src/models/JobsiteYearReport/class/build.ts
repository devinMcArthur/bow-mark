import { JobsiteYearReportDocument, JobsiteYearReportModel } from "@models";
import { IJobsiteReportBuild } from "@typescript/jobsiteReports";
import { UpdateStatus } from "@typescript/models";
import dayjs from "dayjs";

const staticRequestBuild = async (
  JobsiteYearReport: JobsiteYearReportModel,
  data: IJobsiteReportBuild
) => {
  // Try to find existing
  let jobsiteYearReport = await JobsiteYearReport.getByJobsiteAndDate(
    data.jobsiteId,
    data.date
  );

  if (!jobsiteYearReport) {
    jobsiteYearReport = new JobsiteYearReport({
      jobsite: data.jobsiteId,
      startOfYear: dayjs(data.date).startOf("year").toDate(),
    });
  }

  if (jobsiteYearReport.update.status !== UpdateStatus.Pending)
    jobsiteYearReport.update.status = UpdateStatus.Requested;

  await jobsiteYearReport.save();

  return;
};

const requestBuild = async (jobsiteYearReport: JobsiteYearReportDocument) => {
  if (jobsiteYearReport.update.status !== UpdateStatus.Pending)
    jobsiteYearReport.update.status = UpdateStatus.Requested;

  await jobsiteYearReport.save();
};

export default {
  staticRequestBuild,
  requestBuild,
};
