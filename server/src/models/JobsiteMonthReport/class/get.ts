import {
  DailyReportClass,
  Jobsite,
  JobsiteDayReport,
  JobsiteDayReportDocument,
  JobsiteDocument,
  JobsiteMonthReportDocument,
  JobsiteMonthReportModel,
  ReportNoteDocument,
} from "@models";
import { isDocument } from "@typegoose/typegoose";
import { GetByIDOptions, Id, UpdateStatus } from "@typescript/models";
import { getFileSignedUrl } from "@utils/fileStorage";
import populateOptions from "@utils/populateOptions";
import dayjs from "dayjs";
import { JobsiteDayReportClass } from "models/JobsiteDayReport";

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

const byJobsite = async (
  JobsiteMonthReport: JobsiteMonthReportModel,
  jobsite: JobsiteDocument
): Promise<JobsiteMonthReportDocument[]> => {
  const reports = await JobsiteMonthReport.find({
    jobsite: jobsite._id,
  });

  return reports;
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

const byDate = async (
  JobsiteMonthReport: JobsiteMonthReportModel,
  date: Date
): Promise<JobsiteMonthReportDocument[]> => {
  const jobsiteMonthlyReport = await JobsiteMonthReport.find({
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

const byJobsiteDayReport = async (
  JobsiteMonthReport: JobsiteMonthReportModel,
  jobsiteDayReport: JobsiteDayReportDocument
): Promise<JobsiteMonthReportDocument[]> => {
  const reports = await JobsiteMonthReport.find({
    dayReports: jobsiteDayReport._id,
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

const reportNotes = async (
    jobsiteMonthReport: JobsiteMonthReportDocument
): Promise<ReportNoteDocument[]> => {
  const populatedMonthReport = await jobsiteMonthReport
    .populate({
      path: "dayReports",
      populate: {
        path: "dailyReports",
        populate: {
          path: "reportNote"
        }
      }
    })
    .execPopulate();
  
  const notes: ReportNoteDocument[] = [];
  for (const dayReport of (populatedMonthReport as JobsiteMonthReportDocument).dayReports) {
    // Typeguard the populated DayReports
    if (dayReport && isDocument<JobsiteDayReportClass, Id>(dayReport)) {
      for (const dailyReport of dayReport.dailyReports) {
        // Typeguard the populated DailyReports
        if (dailyReport && isDocument<DailyReportClass, Id>(dailyReport) && dailyReport.reportNote) {
          notes.push(dailyReport.reportNote as ReportNoteDocument);
        }
      }
    }
  }

  return notes;
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

const excelName = async (jobsiteMonthReport: JobsiteMonthReportDocument) => {
  const jobsite = await jobsiteMonthReport.getJobsite();
  return `${jobsite.jobcode}_${dayjs(jobsiteMonthReport.startOfMonth).format(
    "MMMM_YYYY"
  )}`;
};

const excelUrl = async (jobsiteMonthReport: JobsiteMonthReportDocument) => {
  const url = await getFileSignedUrl(await jobsiteMonthReport.getExcelName());

  return url;
};

export default {
  byId,
  byJobsite,
  byJobsiteAndDate,
  byUpdateRequested,
  byUpdatePending,
  byDate,
  byJobsiteDayReport,
  dayReports,
  reportNotes,
  jobsite,
  excelName,
  excelUrl,
};
