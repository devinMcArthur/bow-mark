import { RatesData } from "@graphql/types/mutation";
import { SearchOptions } from "@graphql/types/query";
import {
  CrewClass,
  Employee,
  EmployeeClass,
  EmployeeDocument,
  SignupClass,
  User,
  UserClass,
} from "@models";
import { EmployeeHoursReport } from "@typescript/employee";
import { ListOptionData } from "@typescript/graphql";
import { Id } from "@typescript/models";
import {
  Arg,
  Authorized,
  FieldResolver,
  ID,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import mutations, { EmployeeCreateData, EmployeeUpdateData } from "./mutations";
import { UserRoles, UserTypes } from "@typescript/user";

@Resolver(() => EmployeeClass)
export default class EmployeeResolver {
  /**
   * ----- Field Resolver -----
   */

  @FieldResolver(() => UserClass, { nullable: true })
  async user(@Root() employee: EmployeeDocument) {
    return employee.getUser();
  }

  @FieldResolver(() => [CrewClass])
  async crews(@Root() employee: EmployeeDocument) {
    return employee.getCrews();
  }

  @FieldResolver(() => SignupClass, { nullable: true })
  async signup(@Root() employee: EmployeeDocument) {
    return employee.getSignup();
  }

  /**
   * ----- Queries -----
   */

  @Query(() => EmployeeClass)
  async employee(@Arg("id") id: string) {
    return Employee.getById(id);
  }

  @Query(() => [EmployeeClass])
  async employees(
    @Arg("options", () => ListOptionData, { nullable: true })
    options?: ListOptionData
  ) {
    return Employee.getList({
      ...options,
    });
  }

  @Query(() => [EmployeeClass])
  async employeeSearch(
    @Arg("searchString") searchString: string,
    @Arg("options", () => SearchOptions, { nullable: true })
    options: SearchOptions
  ) {
    return (await Employee.search(searchString, options)).map(
      (object) => object.employee
    );
  }

  @Query(() => [EmployeeClass])
  async archivedEmployees(
    @Arg("options", () => ListOptionData, { nullable: true })
    options?: ListOptionData
  ) {
    return Employee.getList({
      ...options,
      query: {
        archivedAt: { $exists: true, $ne: null },
      },
      showArchived: true,
    });
  }

  @Query(() => EmployeeHoursReport)
  async employeeHourReports(
    @Arg("id", () => ID) id: Id,
    @Arg("startTime", () => Date) startTime: Date,
    @Arg("endTime", () => Date) endTime: Date
  ) {
    const employee = await Employee.getById(id);
    if (!employee) throw new Error("Could not find employee");

    return employee.getHourReports(startTime, endTime);
  }

  @Query(() => [EmployeeClass])
  async mechanics() {
    const users = await User.getList({
      query: {
        role: UserRoles.ProjectManager,
        types: [UserTypes.VehicleMaintenance],
      },
    });

    const mechanics: EmployeeDocument[] = [];

    for (let i = 0; i < users.length; i++) {
      const employee = await users[i].getEmployee();
      if (employee) mechanics.push(employee);
    }

    return mechanics;
  }

  /**
   * ----- Mutations -----
   */

  @Authorized()
  @Mutation(() => EmployeeClass)
  async employeeCreate(
    @Arg("data") data: EmployeeCreateData,
    @Arg("crewId", { nullable: true }) crewId?: string
  ) {
    return mutations.create(data, crewId);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => EmployeeClass)
  async employeeUpdate(
    @Arg("id", () => ID) id: Id,
    @Arg("data") data: EmployeeUpdateData
  ) {
    return mutations.update(id, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => EmployeeClass)
  async employeeUpdateRates(
    @Arg("id") id: string,
    @Arg("data", () => [RatesData]) data: RatesData[]
  ) {
    return mutations.updateRates(id, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => EmployeeClass)
  async employeeArchive(@Arg("id", () => ID) id: Id) {
    return mutations.archive(id);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => EmployeeClass)
  async employeeUnarchive(@Arg("id", () => ID) id: Id) {
    return mutations.unarchive(id);
  }
}
