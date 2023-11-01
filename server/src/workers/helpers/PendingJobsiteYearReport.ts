import { JobsiteYearReport } from "@models";
import errorHandler from "@utils/errorHandler";

const pendingJobsiteYearReportUpdateHelper = async () => {
  const jobsiteYearReports = await JobsiteYearReport.getByUpdatePending();

  console.log(`Fixing ${jobsiteYearReports.length} pending jobsite year reports`);

  // Update
  for (let i = 0; i < jobsiteYearReports.length; i++) {
    try {
      await jobsiteYearReports[i].updateAndSaveDocument();
    } catch (e) {
      errorHandler(
        `Jobsite year report ${jobsiteYearReports[i]._id} pending worker error`,
        e
      );
    }
  }

  return;
};

export default pendingJobsiteYearReportUpdateHelper;
