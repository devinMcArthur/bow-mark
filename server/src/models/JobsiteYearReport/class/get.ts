import {
    DailyReportClass,
  Jobsite,
  JobsiteDayReport,
  JobsiteDayReportClass,
  JobsiteDayReportDocument,
  JobsiteDocument,
  JobsiteMonthReportDocument,
  JobsiteYearReportDocument,
  JobsiteYearReportModel,
  ReportNoteDocument,
} from "@models";
import { isDocument } from "@typegoose/typegoose";
import { GetByIDOptions, Id, UpdateStatus } from "@typescript/models";
import { getFileSignedUrl } from "@utils/fileStorage";
import populateOptions from "@utils/populateOptions";
import dayjs from "dayjs";

/**
 * ----- Static Methods -----
 */

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  JobsiteYearReport: JobsiteYearReportModel,
  id: Id,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<JobsiteYearReportDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const jobsiteYearReport = await JobsiteYearReport.findById(id);

  if (!jobsiteYearReport && options.throwError) {
    throw new Error(
      "JobsiteYearReport.getById: unable to find jobsiteYearReport"
    );
  }

  return jobsiteYearReport;
};

const byJobsite = async (
  JobsiteYearReport: JobsiteYearReportModel,
  jobsite: JobsiteDocument
): Promise<JobsiteYearReportDocument[]> => {
  const reports = await JobsiteYearReport.find({
    jobsite: jobsite._id,
  });

  return reports;
};

const byJobsiteAndDate = async (
  JobsiteYearReport: JobsiteYearReportModel,
  jobsiteId: Id,
  date: Date
): Promise<JobsiteYearReportDocument | null> => {
  const jobsiteYearlyReport = await JobsiteYearReport.findOne({
    jobsite: jobsiteId,
    startOfYear: dayjs(date).startOf("year").toDate(),
  });

  return jobsiteYearlyReport;
};

const byDate = async (
  JobsiteYearReport: JobsiteYearReportModel,
  date: Date
): Promise<JobsiteYearReportDocument[]> => {
  const jobsiteYearlyReports = await JobsiteYearReport.find({
    startOfYear: dayjs(date).startOf("year").toDate(),
  });

  return jobsiteYearlyReports;
};

const byUpdateRequested = async (
  JobsiteYearReport: JobsiteYearReportModel
): Promise<JobsiteYearReportDocument[]> => {
  const reports = await JobsiteYearReport.find({
    "update.status": UpdateStatus.Requested,
  });

  return reports;
};

const byUpdatePending = async (
  JobsiteYearReport: JobsiteYearReportModel
): Promise<JobsiteYearReportDocument[]> => {
  const reports = await JobsiteYearReport.find({
    "update.status": UpdateStatus.Pending,
  });

  return reports;
};

const byJobsiteDayReport = async (
  JobsiteYearReport: JobsiteYearReportModel,
  jobsiteDayReport: JobsiteDayReportDocument
): Promise<JobsiteYearReportDocument[]> => {
  const reports = await JobsiteYearReport.find({
    dayReports: jobsiteDayReport._id,
  });

  return reports;
};

/**
 * ----- Methods -----
 */

const dayReports = async (
  jobsiteYearReport: JobsiteYearReportDocument
): Promise<JobsiteDayReportDocument[]> => {
  const reports = await JobsiteDayReport.find({
    _id: { $in: jobsiteYearReport.dayReports },
  });

  return reports;
};

const lastDayReport = async (
  jobsiteYearReport: JobsiteYearReportDocument
): Promise<JobsiteDayReportDocument | null> => {
  return JobsiteDayReport.findOne({
    _id: { $in: jobsiteYearReport.dayReports },
  }).sort({ date: -1 });
};

const reportNotes = async (
    jobsiteYearReport: JobsiteYearReportDocument
): Promise<ReportNoteDocument[]> => {
  const populatedMonthReport = await jobsiteYearReport
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
  jobsiteYearReport: JobsiteYearReportDocument
): Promise<JobsiteDocument> => {
  if (!jobsiteYearReport.jobsite)
    throw new Error("this report does not have a jobsite");

  const jobsite = await Jobsite.getById(jobsiteYearReport.jobsite);
  if (!jobsite) throw new Error("Could not find month report jobsite");

  return jobsite;
};

const excelName = async (jobsiteYearReport: JobsiteYearReportDocument) => {
  const jobsite = await jobsiteYearReport.getJobsite();
  return `${jobsite.jobcode}_${dayjs(jobsiteYearReport.startOfYear).year()}`;
};

const excelUrl = async (jobsiteYearReport: JobsiteYearReportDocument) => {
  const url = await getFileSignedUrl(await jobsiteYearReport.getExcelName());

  return url;
};

export default {
  byId,
  byJobsite,
  byDate,
  byJobsiteAndDate,
  byUpdateRequested,
  byUpdatePending,
  dayReports,
  lastDayReport,
  reportNotes,
  jobsite,
  excelName,
  excelUrl,
  byJobsiteDayReport,
};
