import {
  JobsiteYearMasterReportDocument,
  JobsiteYearReportDocument,
} from "@models";

const yearReport = async (
  jobsiteYearMasterReport: JobsiteYearMasterReportDocument,
  jobsiteYearReport: JobsiteYearReportDocument
) => {
  // Remove jobsiteYearReport refernce from JobsiteYearMasterReport
  const index = jobsiteYearMasterReport.reports.findIndex((report) => {
    report.report?.toString() === jobsiteYearReport._id.toString();
  });

  // Remove JobsiteYearReport from JobsiteYearMasterReport if it exists
  if (index > -1) {
    jobsiteYearMasterReport.reports.splice(index, 1);
  }
};

export default {
  yearReport,
};
