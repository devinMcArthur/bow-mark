import {
  Jobsite,
  JobsiteDayReport,
  JobsiteDayReportDocument,
  JobsiteDocument,
  JobsiteMonthReportDocument,
  JobsiteMonthReportModel,
} from "@models";
import { GetByIDOptions, Id, UpdateStatus } from "@typescript/models";
import populateOptions from "@utils/populateOptions";
import dayjs from "dayjs";

/**
 * ----- Static Methods -----
 */

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  JobsiteMonthReport: JobsiteMonthReportModel,
  id: Id,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<JobsiteMonthReportDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const jobsiteMonthReport = await JobsiteMonthReport.findById(id);

  if (!jobsiteMonthReport && options.throwError) {
    throw new Error(
      "JobsiteMonthReport.getById: unable to find jobsiteMonthReport"
    );
  }

  return jobsiteMonthReport;
};

const byJobsiteAndDate = async (
  JobsiteMonthReport: JobsiteMonthReportModel,
  jobsiteId: Id,
  date: Date
): Promise<JobsiteMonthReportDocument | null> => {
  const jobsiteMonthlyReport = await JobsiteMonthReport.findOne({
    jobsite: jobsiteId,
    startOfMonth: dayjs(date).startOf("month").toDate(),
  });

  return jobsiteMonthlyReport;
};

const byUpdateRequested = async (
  JobsiteMonthReport: JobsiteMonthReportModel
): Promise<JobsiteMonthReportDocument[]> => {
  const reports = await JobsiteMonthReport.find({
    "update.status": UpdateStatus.Requested,
  });

  return reports;
};

const byUpdatePending = async (
  JobsiteMonthReport: JobsiteMonthReportModel
): Promise<JobsiteMonthReportDocument[]> => {
  const reports = await JobsiteMonthReport.find({
    "update.status": UpdateStatus.Pending,
  });

  return reports;
};

/**
 * ----- Methods -----
 */

const dayReports = async (
  jobsiteMonthReport: JobsiteMonthReportDocument
): Promise<JobsiteDayReportDocument[]> => {
  const reports = await JobsiteDayReport.find({
    _id: { $in: jobsiteMonthReport.dayReports },
  });

  return reports;
};

const jobsite = async (
  jobsiteMonthReport: JobsiteMonthReportDocument
): Promise<JobsiteDocument> => {
  if (!jobsiteMonthReport.jobsite)
    throw new Error("Jobsite month report does not have a jobsite");

  const jobsite = await Jobsite.getById(jobsiteMonthReport.jobsite);
  if (!jobsite) throw new Error("Could not find month report jobsite");

  return jobsite;
};

export default {
  byId,
  byJobsiteAndDate,
  byUpdateRequested,
  byUpdatePending,
  dayReports,
  jobsite,
};