import {
  JobsiteDayReportDocument,
  JobsiteYearMasterReport,
  JobsiteYearReportDocument,
} from "@models";

const full = async (jobsiteYearReport: JobsiteYearReportDocument) => {
  // Remove jobsiteYearReport refernce from JobsiteYearMasterReport
  const jobsiteYearMasterReport =
    await JobsiteYearMasterReport.getByJobsiteYearReport(jobsiteYearReport);

  if (jobsiteYearMasterReport) {
    await jobsiteYearMasterReport.removeJobsiteYearReport(jobsiteYearReport);

    await jobsiteYearMasterReport.save();
  }

  await jobsiteYearReport.remove();
};

const dayReport = (
  jobsiteYearReport: JobsiteYearReportDocument,
  jobsiteDayReport: JobsiteDayReportDocument
): void => {
  // Get index of JobsiteDayReport in JobsiteMonthReport
  const index = jobsiteYearReport.dayReports.indexOf(jobsiteDayReport._id);

  // Remove JobsiteDayReport from JobsiteMonthReport if it exists
  if (index > -1) {
    jobsiteYearReport.dayReports.splice(index, 1);
  }
};

export default {
  full,
  dayReport,
};
