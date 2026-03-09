import { registerEnumType } from "type-graphql";

export interface IUserCreate {
  name: string;
  email: string;
  password: string;
}

export enum UserRoles {
  User = 1, // Lowerest power in UserType
  ProjectManager = 2, // Highest power in UserType
  Admin = 3, // Type Independent, full power
}

registerEnumType(UserRoles, {
  name: "UserRoles",
});

export enum UserTypes {
  Operations = "Operations",
  VehicleMaintenance = "VehicleMaintenance",
}

registerEnumType(UserTypes, {
  name: "UserTypes",
});

export enum UserHomeViewSettings {
  DailyReports = 1,
  GeneralReports = 2,
}

registerEnumType(UserHomeViewSettings, {
  name: "UserHomeViewSettings",
});
