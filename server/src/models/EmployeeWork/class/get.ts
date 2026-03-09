import { Types } from "mongoose";

import {
  DailyReport,
  DailyReportDocument,
  Employee,
  EmployeeDocument,
  EmployeeWorkDocument,
  EmployeeWorkModel,
} from "@models";
import { GetByIDOptions } from "@typescript/models";
import populateOptions from "@utils/populateOptions";

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  EmployeeWork: EmployeeWorkModel,
  id: Types.ObjectId | string,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<EmployeeWorkDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const employeeWork = await EmployeeWork.findById(id);

  if (!employeeWork && options.throwError) {
    throw new Error("EmployeeWork.getById: unable to find employee work");
  }

  return employeeWork;
};

const employee = async (
  employeeWork: EmployeeWorkDocument
): Promise<EmployeeDocument> => {
  if (!employeeWork.employee)
    throw new Error("employeeWork.getEmployee: does not contain an employee");

  const employee = await Employee.getById(employeeWork.employee);

  if (!employee)
    throw new Error("employeeWork.getEmployee: unable to find employee");

  return employee;
};

const dailyReport = async (
  employeeWork: EmployeeWorkDocument
): Promise<DailyReportDocument | null> => {
  const dailyReport = await DailyReport.findOne({
    employeeWork: employeeWork._id,
  });

  return dailyReport;
};

export default {
  byId,
  employee,
  dailyReport,
};
