import {
  EmployeeClass,
  OperatorDailyReport,
  OperatorDailyReportClass,
  OperatorDailyReportDocument,
  VehicleClass,
  VehicleIssueClass,
} from "@models";
import { IContext, ListOptionData } from "@typescript/graphql";
import { Id, IListOptions } from "@typescript/models";
import { UserRoles, UserTypes } from "@typescript/user";
import {
  Arg,
  Authorized,
  Ctx,
  FieldResolver,
  ID,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import mutations, { OperatorDailyReportCreateData } from "./mutations";

@Resolver(() => OperatorDailyReportClass)
export default class OperatorDailyReportResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => VehicleClass)
  async vehicle(@Root() operatorDailyReport: OperatorDailyReportDocument) {
    return operatorDailyReport.getVehicle();
  }

  @FieldResolver(() => EmployeeClass)
  async author(@Root() operatorDailyReport: OperatorDailyReportDocument) {
    return operatorDailyReport.getAuthor();
  }

  @FieldResolver(() => [VehicleIssueClass])
  async vehicleIssues(
    @Root() operatorDailyReport: OperatorDailyReportDocument
  ) {
    return operatorDailyReport.getVehicleIssues();
  }

  /**
   * --- Query ---
   */

  @Query(() => OperatorDailyReportClass)
  async operatorDailyReport(@Arg("id", () => ID) id: Id) {
    return OperatorDailyReport.getById(id);
  }

  @Authorized()
  @Query(() => [OperatorDailyReportClass])
  async operatorDailyReports(
    @Ctx() context: IContext,
    @Arg("options", () => ListOptionData, { nullable: true })
    options?: ListOptionData
  ) {
    const query: IListOptions<OperatorDailyReportDocument>["query"] = {};

    if (
      context.user &&
      context.user.role === UserRoles.User &&
      context.user.types.includes(UserTypes.VehicleMaintenance)
    ) {
      const employee = await context.user.getEmployee();
      query.author = employee._id;
    }

    return OperatorDailyReport.getList({
      ...options,
      query,
    });
  }

  /**
   * ----- Mutations -----
   */

  @Authorized()
  @Mutation(() => OperatorDailyReportClass)
  async operatorDailyReportCreate(
    @Arg("vehicleId", () => ID) vehicleId: Id,
    @Arg("data") data: OperatorDailyReportCreateData,
    @Ctx() context: IContext
  ) {
    if (!context.user) throw new Error("Must be logged in to do this");
    const employee = await context.user.getEmployee();
    if (!employee)
      throw new Error(
        "You do not have an employee account, please contact support"
      );

    return mutations.create(vehicleId, employee, data);
  }
}
