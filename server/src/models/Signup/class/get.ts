import {
  Employee,
  EmployeeDocument,
  SignupDocument,
  SignupModel,
} from "@models";
import { GetByIDOptions, Id } from "@typescript/models";
import populateOptions from "@utils/populateOptions";

/**
 * ----- Static Methods -----
 */

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  Signup: SignupModel,
  id: Id,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<SignupDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const signup = await Signup.findById(id);

  if (!signup && options.throwError) {
    throw new Error("Signup.getById: unable to find report note");
  }

  return signup;
};

const byEmployee = async (
  Signup: SignupModel,
  employeeId: Id
): Promise<SignupDocument | null> => {
  const signup = await Signup.findOne({ employee: employeeId });

  return signup;
};

/**
 * ----- Methods -----
 */

const employee = async (signup: SignupDocument): Promise<EmployeeDocument> => {
  if (!signup.employee)
    throw new Error("This signup does not have an employee");
  const employee = await Employee.getById(signup.employee);

  if (!employee) throw new Error("signup.getEmployee: unable to find employee");

  return employee;
};

export default {
  byId,
  byEmployee,
  employee,
};
