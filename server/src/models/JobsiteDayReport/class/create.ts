import {
  JobsiteDayReportDocument,
  JobsiteDayReportModel,
  JobsiteDocument,
} from "@models";

const document = async (
  JobsiteDayReport: JobsiteDayReportModel,
  jobsite: JobsiteDocument,
  date: Date
): Promise<JobsiteDayReportDocument> => {
  const jobsiteDayReport = new JobsiteDayReport({
    jobsite: jobsite._id,
    date: date,
  });

  return jobsiteDayReport;
};

export default {
  document,
};
