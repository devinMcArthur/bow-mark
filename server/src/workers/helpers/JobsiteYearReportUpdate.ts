import { JobsiteYearReport } from "@models";
import { UpdateStatus } from "@typescript/models";
import errorHandler from "@utils/errorHandler";

const JobsiteYearReportUpdateHelper = async () => {
  const jobsiteYearReports = await JobsiteYearReport.getByUpdateRequested();

  // Update
  for (let i = 0; i < jobsiteYearReports.length; i++) {
    try {
      if (jobsiteYearReports[i].update.status !== UpdateStatus.Pending) {
        jobsiteYearReports[i].update.status = UpdateStatus.Pending;
        await jobsiteYearReports[i].save();
      }

      await jobsiteYearReports[i].updateAndSaveDocument();
    } catch (e) {
      jobsiteYearReports[i].update.status = UpdateStatus.Updated;
      await jobsiteYearReports[i].save();

      errorHandler(
        `Jobsite year report ${jobsiteYearReports[i]._id} worker error`,
        e
      );
    }
  }

  return;
};

export default JobsiteYearReportUpdateHelper;
