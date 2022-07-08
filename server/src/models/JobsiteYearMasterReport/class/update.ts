import { JobsiteYearMasterReportDocument } from "@models";
import { UpdateStatus } from "@typescript/models";

const document = async (
  jobsiteYearMasterReport: JobsiteYearMasterReportDocument
) => {
  await jobsiteYearMasterReport.generateFull();

  jobsiteYearMasterReport.update.status = UpdateStatus.Updated;
  jobsiteYearMasterReport.update.lastUpdatedAt = new Date();

  await jobsiteYearMasterReport.save();

  await jobsiteYearMasterReport.generateExcel();

  return;
};

export default {
  document,
};
