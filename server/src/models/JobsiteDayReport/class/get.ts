import {
  EmployeeDocument,
  Jobsite,
  JobsiteDayReportDocument,
  JobsiteDayReportModel,
  JobsiteDocument,
  VehicleDocument,
} from "@models";
import { Id, UpdateStatus } from "@typescript/models";
import dayjs from "dayjs";

const byJobsite = async (
  JobsiteDayReport: JobsiteDayReportModel,
  jobsite: JobsiteDocument
): Promise<JobsiteDayReportDocument[]> => {
  const reports = await JobsiteDayReport.find({
    jobsite: jobsite._id,
  });

  return reports;
};

const byJobsiteAndYear = async (
  JobsiteDayReport: JobsiteDayReportModel,
  jobsiteId: Id,
  date: Date
): Promise<JobsiteDayReportDocument[]> => {
  const reports = await JobsiteDayReport.find({
    jobsite: jobsiteId,
    date: {
      $gte: dayjs(date).startOf("year").toDate(),
      $lt: dayjs(date).endOf("year").toDate(),
    },
  });

  return reports;
};

const byJobsiteAndMonth = async (
  JobsiteDayReport: JobsiteDayReportModel,
  jobsiteId: Id,
  date: Date
): Promise<JobsiteDayReportDocument[]> => {
  const reports = await JobsiteDayReport.find({
    jobsite: jobsiteId,
    date: {
      $gte: dayjs(date).startOf("month").toDate(),
      $lt: dayjs(date).endOf("month").toDate(),
    },
  });

  return reports;
};

const byJobsiteAndDay = async (
  JobsiteDayReport: JobsiteDayReportModel,
  jobsiteId: Id,
  day: Date
): Promise<JobsiteDayReportDocument | null> => {
  const report = await JobsiteDayReport.findOne({
    jobsite: jobsiteId,
    date: {
      $gte: dayjs(day).startOf("day").toDate(),
      $lt: dayjs(day).endOf("day").toDate(),
    },
  });

  return report;
};

const byDateRange = async (
  JobsiteDayReport: JobsiteDayReportModel,
  startTime: Date,
  endTime: Date
): Promise<JobsiteDayReportDocument[]> => {
  const reports = await JobsiteDayReport.find({
    date: {
      $gte: startTime,
      $lte: endTime,
    },
  });

  return reports;
};

const byEmployee = async (
  JobsiteDayReport: JobsiteDayReportModel,
  employee: EmployeeDocument
): Promise<JobsiteDayReportDocument[]> => {
  const reports = await JobsiteDayReport.find({
    "employees.employee": employee._id,
  });

  return reports;
};

const byVehicle = async (
  JobsiteDayReport: JobsiteDayReportModel,
  vehicle: VehicleDocument
): Promise<JobsiteDayReportDocument[]> => {
  const reports = await JobsiteDayReport.find({
    "vehicles.vehicle": vehicle._id,
  });

  return reports;
};

const byUpdateRequested = async (
  JobsiteDayReport: JobsiteDayReportModel
): Promise<JobsiteDayReportDocument[]> => {
  const reports = await JobsiteDayReport.find({
    "update.status": UpdateStatus.Requested,
  });

  return reports;
};

const byUpdatePending = async (
  JobsiteDayReport: JobsiteDayReportModel
): Promise<JobsiteDayReportDocument[]> => {
  const reports = await JobsiteDayReport.find({
    "update.status": UpdateStatus.Pending,
  });

  return reports;
};

const jobsite = async (
  jobsiteDayReport: JobsiteDayReportDocument
): Promise<JobsiteDocument> => {
  if (!jobsiteDayReport.jobsite)
    throw new Error("Jobstie day report does not have a jobsite");

  const jobsite = await Jobsite.getById(jobsiteDayReport.jobsite);

  if (!jobsite) throw new Error("Cannot find jobsite for jobsiteDayReport");

  return jobsite;
};

export default {
  byJobsite,
  byJobsiteAndYear,
  byJobsiteAndMonth,
  byJobsiteAndDay,
  byDateRange,
  byEmployee,
  byVehicle,
  byUpdateRequested,
  byUpdatePending,
  jobsite,
};
