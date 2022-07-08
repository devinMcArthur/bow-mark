import { RatesData } from "@graphql/types/mutation";
import { SearchOptions } from "@graphql/types/query";
import {
  CrewClass,
  Employee,
  EmployeeClass,
  EmployeeDocument,
  SignupClass,
  UserClass,
} from "@models";
import { EmployeeHoursReport } from "@typescript/employee";
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
  async employeeSearch(
    @Arg("searchString") searchString: string,
    @Arg("options", () => SearchOptions, { nullable: true })
    options: SearchOptions
  ) {
    return (await Employee.search(searchString, options)).map(
      (object) => object.employee
    );
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
}
