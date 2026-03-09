import pendingJobsiteDayReportUpdateHelper from "./helpers/PendingJobsiteDayReport";
import pendingJobsiteMonthReportUpdateHelper from "./helpers/PendingJobsiteMonthReport";
import pendingJobsiteYearReportUpdateHelper from "./helpers/PendingJobsiteYearReport";
import pendingJobsiteYearMasterReportUpdateHelper from "./helpers/PendingJobsiteYearMasterReport";
import jobsiteDayReportUpdate from "./jobsiteDayReportUpdate";
import jobsiteMonthReportUpdate from "./jobsiteMonthReportUpdate";
import jobsiteYearReportUpdate from "./jobsiteYearReportUpdate";
import jobsiteYearMasterReportUpdate from "./jobsiteYearMasterReportUpdate";

const workers = async () => {
  // Handle any reports stuck in pending
  await pendingJobsiteYearMasterReportUpdateHelper();
  await pendingJobsiteYearReportUpdateHelper();
  await pendingJobsiteMonthReportUpdateHelper();
  await pendingJobsiteDayReportUpdateHelper();

  console.log("Workers started");

  jobsiteYearMasterReportUpdate();
  jobsiteYearReportUpdate();
  jobsiteMonthReportUpdate();
  jobsiteDayReportUpdate();
};

export default workers;
