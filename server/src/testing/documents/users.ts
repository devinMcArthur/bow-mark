import { User, UserDocument } from "@models";
import _ids from "@testing/_ids";
import { UserRoles } from "@typescript/user";
import hashPassword from "@utils/hashPassword";

export interface SeededUsers {
  base_foreman_1_user: UserDocument;
  admin_user: UserDocument;
  developer_user: UserDocument;
  project_manager_user: UserDocument;
}

const createUsers = async (): Promise<SeededUsers> => {
  const base_foreman_1_user = new User({
    _id: _ids.users.base_foreman_1_user._id,
    name: "Base Foreman 1",
    email: "baseforeman1@bowmark.ca",
    password: await hashPassword("password"),
    employee: _ids.employees.base_foreman_1._id,
  });

  const admin_user = new User({
    _id: _ids.users.admin_user._id,
    name: "Admin User",
    email: "admin@bowmark.ca",
    password: await hashPassword("password"),
    employee: _ids.employees.office_admin._id,
    admin: true,
    role: UserRoles.Admin,
  });

  const developer_user = new User({
    _id: _ids.users.developer_user._id,
    name: "Developer User",
    email: "developer@bowmark.ca",
    password: await hashPassword("password"),
    employee: _ids.employees.office_admin._id,
    role: UserRoles.Developer,
  });

  const project_manager_user = new User({
    _id: _ids.users.project_manager_user._id,
    name: "Project Manager User",
    email: "pm@bowmark.ca",
    password: await hashPassword("password"),
    employee: _ids.employees.pm_employee._id,
    role: UserRoles.ProjectManager,
  });

  const users = {
    base_foreman_1_user,
    admin_user,
    developer_user,
    project_manager_user,
  };

  for (let i = 0; i < Object.values(users).length; i++) {
    await Object.values(users)[i].save();
  }

  return users;
};

export default createUsers;
