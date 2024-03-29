import { Types } from "mongoose";

import {
  Crew,
  CrewDocument,
  DailyReportDocument,
  DailyReportModel,
  Employee,
  EmployeeDocument,
  EmployeeWork,
  EmployeeWorkDocument,
  Jobsite,
  JobsiteDayReportDocument,
  JobsiteDocument,
  MaterialShipment,
  MaterialShipmentDocument,
  Production,
  ProductionDocument,
  ReportNote,
  ReportNoteDocument,
  System,
  Vehicle,
  VehicleDocument,
  VehicleWork,
  VehicleWorkDocument,
} from "@models";
import { IDailyReportSearchObject } from "@typescript/dailyReport";
import {
  GetByIDOptions,
  Id,
  IListOptions,
  ISearchOptions,
} from "@typescript/models";
import populateOptions from "@utils/populateOptions";

import { timezoneEndOfDayinUTC, timezoneStartOfDayinUTC } from "@utils/time";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { DailyReportSearchIndex, searchIndex } from "@search";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * ----- Static Methods -----
 */

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  DailyReport: DailyReportModel,
  id: Types.ObjectId | string,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<DailyReportDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const dailyReport = await DailyReport.findById(id);

  if (!dailyReport && options.throwError) {
    throw new Error("DailyReport.getById: unable to find daily report");
  }

  return dailyReport;
};

export interface IDailyReportSearchOptions {
  whitelistedCrews?: Id[];
}
const search = async (
  DailyReport: DailyReportModel,
  searchString: string,
  options?: ISearchOptions & IDailyReportSearchOptions
): Promise<IDailyReportSearchObject[]> => {
  const res = await searchIndex(DailyReportSearchIndex, searchString, options);

  let dailyReportObjects: { id: string; score: number }[] = res.hits.map(
    (item) => {
      return {
        id: item.id,
        score: 0,
      };
    }
  );

  // Filter out blacklisted ids
  if (options?.blacklistedIds) {
    dailyReportObjects = dailyReportObjects.filter(
      (object) => !options.blacklistedIds?.includes(object.id)
    );
  }

  const dailyReports: IDailyReportSearchObject[] = [];
  for (let i = 0; i < dailyReportObjects.length; i++) {
    const dailyReport = await DailyReport.getById(dailyReportObjects[i].id);
    if (dailyReport) {
      // Only add whitelisted crews (if provided)
      if (
        !options?.whitelistedCrews ||
        options.whitelistedCrews.includes(dailyReport.crew?.toString() || "")
      )
        dailyReports.push({
          dailyReport,
          score: dailyReportObjects[i].score,
        });
    }
  }

  return dailyReports;
};

const listDefaultOptions: IListOptions<DailyReportDocument> = {
  pageLimit: 25,
  offset: 0,
};
const list = async (
  DailyReport: DailyReportModel,
  options?: IListOptions<DailyReportDocument>
): Promise<DailyReportDocument[]> => {
  options = populateOptions(options, listDefaultOptions);

  const dailyReports = await DailyReport.find(
    {
      archived: { $ne: true },
      ...options?.query,
    },
    undefined,
    {
      limit: options?.pageLimit,
      skip: options?.offset,
      sort: {
        date: -1,
      },
    }
  );

  return dailyReports;
};

const existingReport = async (
  DailyReport: DailyReportModel,
  jobsiteId: Id,
  crewId: Id,
  date: Date
): Promise<DailyReportDocument | null> => {
  const system = await System.getSystem();

  const dailyReport = await DailyReport.findOne({
    crew: crewId,
    jobsite: jobsiteId,
    archived: { $ne: true },
    date: {
      $gte: dayjs(date).tz(system.timezone).startOf("day").toDate(),
      $lt: dayjs(date).tz(system.timezone).endOf("day").toDate(),
    },
  });

  return dailyReport;
};

const byJobsiteDayReport = async (
  DailyReport: DailyReportModel,
  jobsiteDayReport: JobsiteDayReportDocument
): Promise<DailyReportDocument[]> => {
  if (!jobsiteDayReport.jobsite || !jobsiteDayReport.date)
    throw new Error("jobsiteDayReport does not have the correct fields");

  const startOfDay = await timezoneStartOfDayinUTC(jobsiteDayReport.date);
  const endOfDay = await timezoneEndOfDayinUTC(jobsiteDayReport.date);

  const dailyReports = await DailyReport.find({
    date: {
      $gte: startOfDay,
      $lt: endOfDay,
    },
    jobsite: jobsiteDayReport.jobsite,
    approved: true,
    archived: { $ne: true },
  });

  return dailyReports;
};

/**
 * ----- Methods -----
 */

const jobsite = async (
  dailyReport: DailyReportDocument
): Promise<JobsiteDocument> => {
  if (!dailyReport.jobsite)
    throw new Error(
      "dailyReport.getJobsite: report does not contain a jobsite"
    );

  const jobsite = await Jobsite.getById(dailyReport.jobsite);

  if (!jobsite)
    throw new Error("dailyReport.getJobsite: unable to find linked jobsite");

  return jobsite;
};

const crew = async (
  dailyReport: DailyReportDocument
): Promise<CrewDocument> => {
  if (!dailyReport.crew)
    throw new Error("dailyReport.getCrew: report does not contain a crew");

  const crew = await Crew.getById(dailyReport.crew);

  if (!crew) {
    const placeholderCrew = await Crew.getPlaceholderCrew();

    return placeholderCrew;
  }

  return crew;
};

const employeeWork = async (
  dailyReport: DailyReportDocument
): Promise<EmployeeWorkDocument[]> => {
  const employeeWork = await EmployeeWork.find({
    _id: { $in: dailyReport.employeeWork },
  });

  return employeeWork;
};

const vehicleWork = async (
  dailyReport: DailyReportDocument
): Promise<VehicleWorkDocument[]> => {
  const vehicleWork = await VehicleWork.find({
    _id: { $in: dailyReport.vehicleWork },
  });

  return vehicleWork;
};

const production = async (
  dailyReport: DailyReportDocument
): Promise<ProductionDocument[]> => {
  const production = await Production.find({
    _id: { $in: dailyReport.production },
  });

  return production;
};

const materialShipments = async (
  dailyReport: DailyReportDocument
): Promise<MaterialShipmentDocument[]> => {
  const materialShipments = await MaterialShipment.find({
    _id: { $in: dailyReport.materialShipment },
    archivedAt: null,
  });

  return materialShipments;
};

const reportNote = async (
  dailyReport: DailyReportDocument
): Promise<ReportNoteDocument | null> => {
  if (dailyReport.reportNote) {
    const reportNote = await ReportNote.getById(dailyReport.reportNote);

    return reportNote;
  } else return null;
};

const temporaryEmployees = async (
  dailyReport: DailyReportDocument
): Promise<EmployeeDocument[]> => {
  const employees = await Employee.find({
    _id: { $in: dailyReport.temporaryEmployees },
  });

  return employees;
};

const temporaryVehicles = async (
  dailyReport: DailyReportDocument
): Promise<VehicleDocument[]> => {
  const vehicles = await Vehicle.find({
    _id: { $in: dailyReport.temporaryVehicles },
  });

  return vehicles;
};

export default {
  byId,
  search,
  list,
  existingReport,
  byJobsiteDayReport,
  jobsite,
  crew,
  employeeWork,
  vehicleWork,
  production,
  materialShipments,
  reportNote,
  temporaryEmployees,
  temporaryVehicles,
};
