import { JobsiteYearMasterReport } from "@models";
import { UpdateStatus } from "@typescript/models";
import errorHandler from "@utils/errorHandler";

const JobsiteYearMasterReportUpdateHelper = async () => {
  const jobsiteYearMasterReports =
    await JobsiteYearMasterReport.getByUpdateRequested();

  // Update
  for (let i = 0; i < jobsiteYearMasterReports.length; i++) {
    try {
      if (jobsiteYearMasterReports[i].update.status !== UpdateStatus.Pending) {
        jobsiteYearMasterReports[i].update.status = UpdateStatus.Pending;
        await jobsiteYearMasterReports[i].save();
      }

      await jobsiteYearMasterReports[i].updateAndSaveDocument();
    } catch (e) {
      jobsiteYearMasterReports[i].update.status = UpdateStatus.Updated;
      await jobsiteYearMasterReports[i].save();

      errorHandler(
        `Jobsite year master report ${jobsiteYearMasterReports[i]._id} worker error`,
        e
      );
    }
  }

  return;
};

export default JobsiteYearMasterReportUpdateHelper;
