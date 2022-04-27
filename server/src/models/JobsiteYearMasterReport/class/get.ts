import {
  JobsiteYearMasterReportDocument,
  JobsiteYearMasterReportModel,
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
  JobsiteYearMasterReport: JobsiteYearMasterReportModel,
  id: Id,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<JobsiteYearMasterReportDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const jobsiteYearReport = await JobsiteYearMasterReport.findById(id);

  if (!jobsiteYearReport && options.throwError) {
    throw new Error(
      "JobsiteYearMasterReport.getById: unable to find jobsiteYearMasterReport"
    );
  }

  return jobsiteYearReport;
};

const byDate = async (
  JobsiteYearMasterReport: JobsiteYearMasterReportModel,
  date: Date
): Promise<JobsiteYearMasterReportDocument | null> => {
  const jobsiteYearMasterReport = await JobsiteYearMasterReport.findOne({
    startOfYear: dayjs(date).startOf("year").toDate(),
  });

  return jobsiteYearMasterReport;
};

const byUpdateRequested = async (
  JobsiteYearMasterReport: JobsiteYearMasterReportModel
): Promise<JobsiteYearMasterReportDocument[]> => {
  const reports = await JobsiteYearMasterReport.find({
    "update.status": UpdateStatus.Requested,
  });

  return reports;
};

const byUpdatePending = async (
  JobsiteYearMasterReport: JobsiteYearMasterReportModel
): Promise<JobsiteYearMasterReportDocument[]> => {
  const reports = await JobsiteYearMasterReport.find({
    "update.status": UpdateStatus.Pending,
  });

  return reports;
};

/**
 * ----- Methods -----
 */

export default {
  byId,
  byDate,
  byUpdateRequested,
  byUpdatePending,
};