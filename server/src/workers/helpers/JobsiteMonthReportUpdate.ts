import { JobsiteMonthReport } from "@models";
import { UpdateStatus } from "@typescript/models";
import errorHandler from "@utils/errorHandler";

const JobsiteMonthReportUpdateHelper = async () => {
  const jobsiteMonthReports = await JobsiteMonthReport.getByUpdateRequested();

  // Update
  for (let i = 0; i < jobsiteMonthReports.length; i++) {
    try {
      if (jobsiteMonthReports[i].update.status !== UpdateStatus.Pending) {
        jobsiteMonthReports[i].update.status = UpdateStatus.Pending;
        await jobsiteMonthReports[i].save();
      }

      await jobsiteMonthReports[i].updateAndSaveDocument();
    } catch (e) {
      jobsiteMonthReports[i].update.status = UpdateStatus.Updated;
      await jobsiteMonthReports[i].save();

      errorHandler(
        `Jobsite month report ${jobsiteMonthReports[i]._id} worker error`,
        e
      );
    }
  }

  return;
};

export default JobsiteMonthReportUpdateHelper;
