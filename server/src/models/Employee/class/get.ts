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
  User,
  UserDocument,
} from "@models";
import { GetByIDOptions, ISearchOptions } from "@typescript/models";
import populateOptions from "@utils/populateOptions";
import ElasticsearchClient from "@elasticsearch/client";
import ElasticSearchIndices from "@constants/ElasticSearchIndices";
import {
  EmployeeHoursReport,
  IEmployeeSearchObject,
} from "@typescript/employee";
import getRateForTime from "@utils/getRateForTime";
import { IHit } from "@typescript/elasticsearch";

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
  const res = await ElasticsearchClient.search({
    index: ElasticSearchIndices.Employee,
    body: {
      query: {
        multi_match: {
          query: searchString.toLowerCase(),
          fuzziness: "AUTO",
          fields: ["name", "jobTitle"],
        },
      },
    },
    size: options?.limit,
  });

  let employeeObjects: { id: string; score: number }[] = res.body.hits.hits.map(
    (item: IHit) => {
      return {
        id: item._id,
        score: item._score,
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

const list = async (Employee: EmployeeModel): Promise<EmployeeDocument[]> => {
  const employees = await Employee.find({});

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

  const jobsiteDayReports: JobsiteDayReportDocument[] =
    await JobsiteDayReport.find({
      date: {
        $gte: startTime,
        $lte: endTime,
      },
      "employees.employee": employee._id,
    });

  // Catalog hours for each day
  for (let i = 0; i < jobsiteDayReports.length; i++) {
    const jobsiteDayReport = jobsiteDayReports[i];

    const employeeReport = jobsiteDayReport.employees.find(
      (employeeReport) =>
        employeeReport.employee?.toString() === employee._id.toString()
    );

    report.days.push({
      date: jobsiteDayReport.date,
      hours: employeeReport?.hours || 0,
    });
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
