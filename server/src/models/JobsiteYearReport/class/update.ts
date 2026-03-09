import {
  JobsiteDayReport,
  JobsiteYearMasterReport,
  JobsiteYearReportDocument,
} from "@models";
import { CrewTypes } from "@typescript/crew";
import { UpdateStatus } from "@typescript/models";

const document = async (jobsiteYearReport: JobsiteYearReportDocument) => {
  if (!jobsiteYearReport.jobsite)
    throw new Error("This year report does not have a jobsite");

  const dayReports = await JobsiteDayReport.getByJobsiteAndYear(
    jobsiteYearReport.jobsite,
    jobsiteYearReport.startOfYear
  );

  jobsiteYearReport.dayReports = dayReports.map((report) => report._id);

  const crewTypes: CrewTypes[] = [];
  for (let i = 0; i < dayReports.length; i++) {
    const dayReport = dayReports[i];

    for (let j = 0; j < dayReport.crewTypes.length; j++) {
      if (!crewTypes.includes(dayReport.crewTypes[j]))
        crewTypes.push(dayReport.crewTypes[j]);
    }
  }

  jobsiteYearReport.crewTypes = crewTypes;

  await jobsiteYearReport.generateExpenseInvoiceReports();
  await jobsiteYearReport.generateRevenueInvoiceReports();

  await jobsiteYearReport.generateSummary();

  await jobsiteYearReport.generateIssues();

  jobsiteYearReport.update.status = UpdateStatus.Updated;
  jobsiteYearReport.update.lastUpdatedAt = new Date();

  await jobsiteYearReport.save();

  await jobsiteYearReport.generateExcel();

  await JobsiteYearMasterReport.requestBuild(jobsiteYearReport.startOfYear);

  const jobsite = await jobsiteYearReport.getJobsite();
  await jobsite.updateWorkOnHand();
  await jobsite.save();

  return;
};

export default {
  document,
};
