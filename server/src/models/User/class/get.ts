import { Types } from "mongoose";

import { Employee, EmployeeDocument, UserDocument, UserModel } from "@models";
import { GetByIDOptions, IListOptions } from "@typescript/models";
import populateOptions from "@utils/populateOptions";
import { VehicleIssuePriority } from "@typescript/vehicleIssue";

/**
 * ----- Static Methods -----
 */

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  User: UserModel,
  id: Types.ObjectId | string,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<UserDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const user = await User.findById(id);

  if (!user && options.throwError) {
    throw new Error("User.getById: Unable to find user");
  }

  return user;
};

const listDefaultOptions: IListOptions<UserDocument> = {
  pageLimit: 25,
  offset: 0,
};
const list = async (
  User: UserModel,
  options?: IListOptions<UserDocument>
): Promise<UserDocument[]> => {
  options = populateOptions(options, listDefaultOptions);

  const users = await User.find(options?.query || {}, undefined, {
    limit: options?.pageLimit,
    skip: options?.offset,
  });

  return users;
};

const byEmail = async (
  User: UserModel,
  email: string
): Promise<UserDocument | null> => {
  const user = await User.findOne({ email });

  return user;
};

const byResetPasswordToken = async (
  User: UserModel,
  token: string
): Promise<UserDocument | null> => {
  const user = await User.findOne({ resetPasswordToken: token });

  return user;
};

const bySubscribedPriority = async (
  User: UserModel,
  priority: VehicleIssuePriority
) => {
  return await User.find({
    "settings.subscribedVehicleIssuePriorities": priority,
  });
};

/**
 * ----- Methods -----
 */

const employee = async (user: UserDocument): Promise<EmployeeDocument> => {
  if (user.employee) {
    const employee = await Employee.getById(user.employee);

    if (!employee) throw new Error("user.getEmployee: unable to find employee");

    return employee;
  } else {
    const employee = await Employee.createDocument({
      name: user.name,
    });

    await employee.save();

    user.employee = employee._id;

    return employee;
  }
};

export default {
  byId,
  byEmail,
  list,
  byResetPasswordToken,
  bySubscribedPriority,
  employee,
};
