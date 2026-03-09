import { Types } from "mongoose";

import {
  Crew,
  CrewDocument,
  EmployeeDocument,
  EmployeeModel,
  JobsiteDayReport,
  JobsiteDayReportDocument,
  Signup,
  SignupDocument,
  System,
  User,
  UserDocument,
} from "@models";
import {
  GetByIDOptions,
  IListOptions,
  ISearchOptions,
} from "@typescript/models";
import populateOptions from "@utils/populateOptions";
import {
  EmployeeHoursReport,
  IEmployeeSearchObject,
} from "@typescript/employee";
import getRateForTime from "@utils/getRateForTime";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { EmployeeSearchIndex, searchIndex } from "@search";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * ----- Static Methods -----
 */

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  Employee: EmployeeModel,
  id: Types.ObjectId | string,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<EmployeeDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const employee = await Employee.findById(id);

  if (!employee && options.throwError) {
    throw new Error("Employee.getById: unable to find employee");
  }

  return employee;
};

const search = async (
  Employee: EmployeeModel,
  searchString: string,
  options?: ISearchOptions
): Promise<IEmployeeSearchObject[]> => {
  const res = await searchIndex(EmployeeSearchIndex, searchString, options);

  let employeeObjects: { id: string; score: number }[] = res.hits.map(
    (item) => {
      return {
        id: item.id,
        score: 0,
      };
    }
  );

  // Filter out blacklisted ids
  if (options?.blacklistedIds) {
    employeeObjects = employeeObjects.filter(
      (object) => !options.blacklistedIds?.includes(object.id)
    );
  }

  const employees: IEmployeeSearchObject[] = [];
  for (let i = 0; i < employeeObjects.length; i++) {
    const employee = await Employee.getById(employeeObjects[i].id);
    if (employee)
      employees.push({
        employee,
        score: employeeObjects[i].score,
      });
  }

  return employees;
};

const listDefaultOptions: IListOptions<EmployeeDocument> = {
  pageLimit: 999,
  offset: 0,
};
const list = async (
  Employee: EmployeeModel,
  options?: IListOptions<EmployeeDocument>
): Promise<EmployeeDocument[]> => {
  options = populateOptions(options, listDefaultOptions);

  if (options?.query && !options.showArchived) options.query.archivedAt = null;

  const employees = await Employee.find(
    options?.query || { archivedAt: null },
    undefined,
    {
      limit: options?.pageLimit,
      skip: options?.offset,
      sort: {
        name: "asc",
      },
    }
  );

  return employees;
};

const byName = async (
  Employee: EmployeeModel,
  name: string
): Promise<EmployeeDocument | null> => {
  const employee = await Employee.findOne({
    name: { $regex: new RegExp(name, "i") },
  });

  return employee;
};

/**
 * ----- Methods -----
 */

const user = async (
  employee: EmployeeDocument
): Promise<UserDocument | null> => {
  const user = await User.findOne({ employee: employee._id });

  return user;
};

const crews = async (employee: EmployeeDocument): Promise<CrewDocument[]> => {
  const crews = await Crew.find({ employees: employee._id, archivedAt: null });

  return crews;
};

const signup = async (
  employee: EmployeeDocument
): Promise<SignupDocument | null> => {
  const signup = await Signup.getByEmployee(employee._id);

  return signup;
};

const rateForTime = async (
  employee: EmployeeDocument,
  date: Date
): Promise<number> => {
  return getRateForTime(employee.rates, date);
};

const employeeHourReports = async (
  employee: EmployeeDocument,
  startTime: Date,
  endTime: Date
): Promise<EmployeeHoursReport> => {
  const report: EmployeeHoursReport = {
    days: [],
  };

  const jobsiteDayReports: JobsiteDayReportDocument[] = (
    await JobsiteDayReport.find({
      date: {
        $gte: dayjs(startTime).startOf("day").toDate(),
        $lte: dayjs(endTime).endOf("day").toDate(),
      },
      "employees.employee": employee._id,
    })
  ).sort((a, b) => a.date.getTime() - b.date.getTime());

  // Catalog hours for each day
  for (let i = 0; i < jobsiteDayReports.length; i++) {
    const jobsiteDayReport = jobsiteDayReports[i];

    const employeeReport = jobsiteDayReport.employees.find(
      (employeeReport) =>
        employeeReport.employee?.toString() === employee._id.toString()
    );

    const system = await System.getSystem();

    // Check for existing day index
    const existingIndex = report.days.findIndex((day) =>
      dayjs(day.date)
        .tz(system.timezone)
        .isSame(dayjs(jobsiteDayReport.date).tz(system.timezone), "day")
    );

    if (existingIndex === -1) {
      report.days.push({
        date: jobsiteDayReport.date,
        hours: employeeReport?.hours || 0,
      });
    } else {
      report.days[existingIndex].hours += employeeReport?.hours || 0;
    }
  }

  return report;
};

export default {
  byId,
  search,
  byName,
  list,
  user,
  crews,
  signup,
  rateForTime,
  employeeHourReports,
};
