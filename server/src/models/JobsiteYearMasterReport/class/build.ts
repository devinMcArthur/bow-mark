import { JobsiteYearMasterReportModel } from "@models";
import { UpdateStatus } from "@typescript/models";
import dayjs from "dayjs";

const requestBuild = async (
  JobsiteYearMasterReport: JobsiteYearMasterReportModel,
  date: Date
) => {
  // Try to find existing
  let jobsiteYearMasterReport = await JobsiteYearMasterReport.getByDate(date);

  if (!jobsiteYearMasterReport) {
    jobsiteYearMasterReport = new JobsiteYearMasterReport({
      startOfYear: dayjs(date).startOf("year").toDate(),
    });
  }

  if (jobsiteYearMasterReport.update.status !== UpdateStatus.Pending)
    jobsiteYearMasterReport.update.status = UpdateStatus.Requested;

  await jobsiteYearMasterReport.save();

  return;
};

export default {
  requestBuild,
};
