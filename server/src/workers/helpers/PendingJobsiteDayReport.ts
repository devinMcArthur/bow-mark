import { JobsiteDayReport } from "@models";
import errorHandler from "@utils/errorHandler";

const pendingJobsiteDayReportUpdateHelper = async () => {
  const jobsiteDayReports = await JobsiteDayReport.getByUpdatePending();

  console.log(`Fixing ${jobsiteDayReports.length} pending jobsite day reports`);

  // Update
  for (let i = 0; i < jobsiteDayReports.length; i++) {
    try {
      await jobsiteDayReports[i].updateAndSaveDocument();
    } catch (e) {
      errorHandler(
        `Jobsite day report ${jobsiteDayReports[i]._id} pending worker error`,
        e
      );
    }
  }

  return;
};

export default pendingJobsiteDayReportUpdateHelper;
