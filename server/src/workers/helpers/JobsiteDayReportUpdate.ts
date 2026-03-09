import { JobsiteDayReport } from "@models";
import { UpdateStatus } from "@typescript/models";
import errorHandler from "@utils/errorHandler";

const JobsiteDayReportUpdateHelper = async () => {
  const jobsiteDayReports = await JobsiteDayReport.getByUpdateRequested();

  // Update
  for (let i = 0; i < jobsiteDayReports.length; i++) {
    try {
      if (jobsiteDayReports[i].update.status !== UpdateStatus.Pending) {
        jobsiteDayReports[i].update.status = UpdateStatus.Pending;
        await jobsiteDayReports[i].save();
      }

      await jobsiteDayReports[i].updateAndSaveDocument();
    } catch (e) {
      jobsiteDayReports[i].update.status = UpdateStatus.Updated;
      await jobsiteDayReports[i].save();

      errorHandler(
        `Jobsite day report ${jobsiteDayReports[i]._id} requested worker error`,
        e
      );
    }
  }

  return;
};

export default JobsiteDayReportUpdateHelper;
