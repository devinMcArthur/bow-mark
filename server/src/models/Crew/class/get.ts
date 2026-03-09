import { Types } from "mongoose";

import {
  CrewDocument,
  CrewModel,
  DailyReport,
  DailyReportDocument,
  Employee,
  EmployeeDocument,
  Jobsite,
  JobsiteDocument,
  Vehicle,
  VehicleDocument,
} from "@models";
import {
  CrewLocationClass,
  CrewLocationDayClass,
  CrewTypes,
  ICrewSearchObject,
} from "@typescript/crew";
import { GetByIDOptions, ISearchOptions } from "@typescript/models";
import populateOptions from "@utils/populateOptions";
import { timezoneEndOfDayinUTC, timezoneStartOfDayinUTC } from "@utils/time";
import dayjs from "dayjs";
import { CrewSearchIndex, searchIndex } from "@search";

/**
 * ----- Static Methods -----
 */

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  Crew: CrewModel,
  id: Types.ObjectId | string,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<CrewDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const crew = await Crew.findById(id);

  if (!crew && options.throwError) {
    throw new Error("Crew.getById: unable to find crew");
  }

  return crew;
};

const search = async (
  Crew: CrewModel,
  searchString: string,
  options?: ISearchOptions
): Promise<ICrewSearchObject[]> => {
  const res = await searchIndex(CrewSearchIndex, searchString, options);

  let crewObjects: { id: string; score: number }[] = res.hits.map((item) => {
    return {
      id: item.id,
      score: 0,
    };
  });

  // Filter out blacklisted ids
  if (options?.blacklistedIds) {
    crewObjects = crewObjects.filter(
      (object) => !options.blacklistedIds?.includes(object.id)
    );
  }

  const crews: ICrewSearchObject[] = [];
  for (let i = 0; i < crewObjects.length; i++) {
    const crew = await Crew.getById(crewObjects[i].id);
    if (crew)
      crews.push({
        crew,
        score: crewObjects[i].score,
      });
  }

  return crews;
};

const list = async (Crew: CrewModel): Promise<CrewDocument[]> => {
  const crews = await Crew.find({});

  return crews;
};

const byVehicle = async (
  Crew: CrewModel,
  vehicle: VehicleDocument
): Promise<CrewDocument[]> => {
  const crews = await Crew.find({ vehicles: vehicle._id });

  return crews;
};

const placeholderCrew = async (Crew: CrewModel): Promise<CrewDocument> => {
  const placeholderCrewName = "Placeholder Crew";

  const crew = await Crew.findOne({ name: placeholderCrewName });

  // Create placeholder crew if it doesn't exist
  if (!crew) {
    const newCrew = await Crew.createDocument({
      name: placeholderCrewName,
      type: CrewTypes.Other,
    });

    await newCrew.save();

    return newCrew;
  }

  return crew;
};

const crewLocations = async (
  Crew: CrewModel,
  startDate: Date = dayjs().startOf("month").toDate(),
  endDate: Date = dayjs().endOf("month").toDate()
): Promise<CrewLocationClass[]> => {
  const crews = await Crew.find({
    archivedAt: null,
  });

  const jobsiteNameCatalog: { [key: string]: string } = {};

  const crewLocations: CrewLocationClass[] = [];

  for (let i = 0; i < crews.length; i++) {
    const crew = crews[i];

    const dailyReports = await DailyReport.find({
      date: {
        $gte: await timezoneStartOfDayinUTC(startDate),
        $lte: await timezoneEndOfDayinUTC(endDate),
      },
      crew: crew._id,
    });

    if (dailyReports.length > 0) {
      crewLocations.push({
        crew,
        days: [],
      });
    }

    // Get unique days from list of daily reports
    const uniqueDays: string[] = [];
    for (let j = 0; j < dailyReports.length; j++) {
      const dailyReport = dailyReports[j];
      const startOfDay = await timezoneStartOfDayinUTC(dailyReport.date);

      // Determine if this daily report date is a unique date

      if (!uniqueDays.includes(startOfDay.toISOString())) {
        // New unique date
        uniqueDays.push(startOfDay.toISOString());

        const jobsite = await dailyReport.getJobsite();
        const jobsiteName = `${jobsite.jobcode} - ${jobsite.name}`;

        const locationDay: CrewLocationDayClass = {
          date: startOfDay,
          items: [
            {
              dailyReportId: dailyReport._id,
              jobsiteName,
            },
          ],
        };

        crewLocations[crewLocations.length - 1].days.push(locationDay);
      } else {
        // Existing unique date
        const locationDay =
          crewLocations[crewLocations.length - 1].days[
            uniqueDays.indexOf(startOfDay.toISOString())
          ];

        let jobsiteName = "";

        if (dailyReport.jobsite) {
          if (jobsiteNameCatalog[dailyReport.jobsite?.toString()]) {
            jobsiteName = jobsiteNameCatalog[dailyReport.jobsite?.toString()];
          } else {
            const jobsite = await dailyReport.getJobsite();
            jobsiteName = `${jobsite.jobcode} - ${jobsite.name}`;
            jobsiteNameCatalog[dailyReport.jobsite?.toString()] = jobsiteName;
          }

          locationDay.items.push({
            dailyReportId: dailyReport._id,
            jobsiteName: jobsiteName,
          });

          crewLocations[crewLocations.length - 1].days[
            uniqueDays.indexOf(startOfDay.toISOString())
          ] = locationDay;
        }
      }
    }
  }

  return crewLocations;
};

/**
 * ----- Methods -----
 */

const employees = async (crew: CrewDocument): Promise<EmployeeDocument[]> => {
  const employees: EmployeeDocument[] = await Employee.find({
    _id: { $in: crew.employees },
  });

  return employees;
};

const vehicles = async (crew: CrewDocument): Promise<VehicleDocument[]> => {
  const vehicles = await Vehicle.find({ _id: { $in: crew.vehicles } });

  return vehicles;
};

const jobsites = async (crew: CrewDocument): Promise<JobsiteDocument[]> => {
  const jobsites = await Jobsite.getByCrew(crew);

  return jobsites;
};

const dailyReports = async (
  crew: CrewDocument
): Promise<DailyReportDocument[]> => {
  const dailyReports = await DailyReport.find({
    crew: crew._id,
    archived: { $ne: true },
  }).sort({
    date: -1,
  });

  return dailyReports;
};

const dailyReportsByMonth = async (crew: CrewDocument, startOfMonth: Date) => {
  const dailyReports = await DailyReport.find({
    crew: crew._id,
    archived: { $ne: true },
    date: {
      $gte: await timezoneStartOfDayinUTC(
        dayjs(startOfMonth).startOf("month").add(1, "day").toDate()
      ),
      $lte: await timezoneEndOfDayinUTC(
        dayjs(startOfMonth).endOf("month").toDate()
      ),
    },
  }).sort({
    date: -1,
  });

  return dailyReports;
};

export default {
  byId,
  search,
  list,
  byVehicle,
  placeholderCrew,
  employees,
  vehicles,
  jobsites,
  dailyReports,
  crewLocations,
  dailyReportsByMonth,
};
