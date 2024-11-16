import { Types } from "mongoose";

import {
  Crew,
  CrewDocument,
  VehicleDocument,
  VehicleModel,
  System,
  OperatorDailyReport,
  VehicleIssue,
  JobsiteDayReportDocument,
  JobsiteDayReport,
} from "@models";
import {
  GetByIDOptions,
  IListOptions,
  ISearchOptions,
} from "@typescript/models";
import populateOptions from "@utils/populateOptions";
import { IVehicleSearchObject, VehicleHoursReport } from "@typescript/vehicle";
import getRateForTime from "@utils/getRateForTime";
import { searchIndex, VehicleSearchIndex } from "@search";
import dayjs from "dayjs";

/**
 * ----- Static Methods -----
 */

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  Vehicle: VehicleModel,
  id: Types.ObjectId | string,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<VehicleDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const vehicle = await Vehicle.findById(id);

  if (!vehicle && options.throwError) {
    throw new Error("Vehicle.getById: Unable to find vehicle");
  }

  return vehicle;
};

const search = async (
  Vehicle: VehicleModel,
  searchString: string,
  options?: ISearchOptions
): Promise<IVehicleSearchObject[]> => {
  const res = await searchIndex(VehicleSearchIndex, searchString, options);

  let vehicleObjects: { id: string; score: number }[] = res.hits.map((item) => {
    return {
      id: item.id,
      score: 0,
    };
  });

  // Filter out blacklisted ids
  if (options?.blacklistedIds) {
    vehicleObjects = vehicleObjects.filter(
      (object) => !options.blacklistedIds?.includes(object.id)
    );
  }

  const vehicles: IVehicleSearchObject[] = [];
  for (let i = 0; i < vehicleObjects.length; i++) {
    const vehicle = await Vehicle.getById(vehicleObjects[i].id);
    if (vehicle)
      vehicles.push({
        vehicle,
        score: vehicleObjects[i].score,
      });
  }

  return vehicles;
};

const byCode = async (
  Vehicle: VehicleModel,
  code: string
): Promise<VehicleDocument | null> => {
  const vehicle = await Vehicle.findOne({
    vehicleCode: { $regex: new RegExp(`^${code}$`, "i") },
  });

  return vehicle;
};

const listDefaultOptions: IListOptions<VehicleDocument> = {
  pageLimit: 9999,
  offset: 0,
};
const list = async (
  Vehicle: VehicleModel,
  options?: IListOptions<VehicleDocument>
): Promise<VehicleDocument[]> => {
  options = populateOptions(options, listDefaultOptions);

  if (options?.query && !options.showArchived) options.query.archivedAt = null;

  const vehicles = await Vehicle.find(
    options?.query || { archivedAt: null },
    undefined,
    {
      limit: options?.pageLimit,
      skip: options?.offset,
      sort: {
        vehicleCode: "asc",
      },
    }
  );

  return vehicles;
};

/**
 * ----- Methods -----
 */

const crews = async (vehicle: VehicleDocument): Promise<CrewDocument[]> => {
  const crews = await Crew.find({ vehicles: vehicle._id, archivedAt: null });

  return crews;
};

const rateForTime = async (
  vehicle: VehicleDocument,
  date: Date
): Promise<number> => {
  if (vehicle.rates && vehicle.rates.length > 0) {
    return getRateForTime(vehicle.rates, date);
  } else {
    const system = await System.getSystem();
    const systemDefault = system.companyVehicleTypeDefaults.find(
      (item) => item.title === vehicle.vehicleType
    );

    if (systemDefault) {
      return getRateForTime(systemDefault.rates, date);
    } else {
      return 0;
    }
  }
};

const operatorDailyReports = async (vehicle: VehicleDocument) => {
  const operatorDailyReports = await OperatorDailyReport.find({
    vehicle: vehicle._id,
  })
    .sort({ startTime: "desc" })
    .limit(50);

  return operatorDailyReports;
};

const vehicleIssues = async (vehicle: VehicleDocument) => {
  const vehicleIssues = await VehicleIssue.find({
    vehicle: vehicle._id,
    closed: false,
  })
    .sort({ createdAt: "desc" })
    .limit(50);

  return vehicleIssues;
};

const vehicleHourReports = async (
  vehicle: VehicleDocument,
): Promise<VehicleHoursReport> => {
  const report: VehicleHoursReport = {
    years: [],
  };

  const jobsiteDayReports: JobsiteDayReportDocument[] = (
    await JobsiteDayReport.find({
      "vehicles.vehicle": vehicle._id,
    })
  ).sort((a, b) => a.date.getTime() - b.date.getTime());

  // Catalog hours for each year
  for (let i = 0; i < jobsiteDayReports.length; i++) {
    const jobsiteDayReport = jobsiteDayReports[i];

    const vehicleReport = jobsiteDayReport.vehicles.find(
      (vehicleReport) =>
        vehicleReport.vehicle?.toString() === vehicle._id.toString()
    );

    // Check for existing day index
    const existingIndex = report.years.findIndex((year) => year.year === jobsiteDayReport.date.getFullYear());

    if (existingIndex === -1) {
      report.years.push({
        year: jobsiteDayReport.date.getFullYear(),
        hours: vehicleReport?.hours || 0,
      });
    } else {
      report.years[existingIndex].hours += vehicleReport?.hours || 0;
    }
  }

  return report;
};

export default {
  byId,
  search,
  byCode,
  list,
  crews,
  rateForTime,
  operatorDailyReports,
  vehicleIssues,
  vehicleHourReports
};
