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

import {
  CrewClass,
  DailyReport,
  DailyReportClass,
  DailyReportDocument,
  EmployeeClass,
  EmployeeWorkClass,
  Jobsite,
  JobsiteClass,
  MaterialShipmentClass,
  ProductionClass,
  ReportNoteClass,
  VehicleClass,
  VehicleWorkClass,
} from "@models";
import mutations, {
  DailyReportCreateData,
  DailyReportUpdateData,
} from "./mutations";
import { SearchOptions } from "@graphql/types/query";
import { DailyReportListOptionData } from "./queries";
import { FilterQuery } from "mongoose";
import { Id } from "@typescript/models";
import { DailyReportListFilter } from "@typescript/dailyReport";
import { IContext } from "@typescript/graphql";
import { UserRoles } from "@typescript/user";
import { mongoose } from "@typegoose/typegoose";

@Resolver(() => DailyReportClass)
export default class DailyReportResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => JobsiteClass)
  async jobsite(@Root() dailyReport: DailyReportDocument) {
    try {
      return await dailyReport.getJobsite();
    } catch (error) {
      console.log(error);
      return Jobsite.createDocument({
        name: "Unknown Jobsite",
        jobcode: "Unknown",
      });
    }
  }

  @FieldResolver(() => CrewClass)
  async crew(@Root() dailyReport: DailyReportDocument) {
    return dailyReport.getCrew();
  }

  @FieldResolver(() => [EmployeeWorkClass])
  async employeeWork(@Root() dailyReport: DailyReportDocument) {
    return dailyReport.getEmployeeWork();
  }

  @FieldResolver(() => [VehicleWorkClass])
  async vehicleWork(@Root() dailyReport: DailyReportDocument) {
    return dailyReport.getVehicleWork();
  }

  @FieldResolver(() => [ProductionClass])
  async productions(@Root() dailyReport: DailyReportDocument) {
    return dailyReport.getProduction();
  }

  @FieldResolver(() => [MaterialShipmentClass])
  async materialShipments(@Root() dailyReport: DailyReportDocument) {
    return dailyReport.getMaterialShipments();
  }

  @FieldResolver(() => ReportNoteClass, { nullable: true })
  async reportNote(@Root() dailyReport: DailyReportDocument) {
    return dailyReport.getReportNote();
  }

  @FieldResolver(() => [EmployeeClass])
  async temporaryEmployees(@Root() dailyReport: DailyReportDocument) {
    return dailyReport.getTemporaryEmployees();
  }

  @FieldResolver(() => [VehicleClass])
  async temporaryVehicles(@Root() dailyReport: DailyReportDocument) {
    return dailyReport.getTemporaryVehicles();
  }

  /**
   * ----- Summary counts -----
   * Cheap counts of the DailyReport's direct ref arrays. No DB hit —
   * the root document already carries the arrays. Surfaced on the
   * daily-report card so the summary strip can be rendered without a
   * per-card fetch of the underlying collections.
   */

  @FieldResolver(() => Number)
  employeeWorkCount(@Root() dailyReport: DailyReportDocument): number {
    return dailyReport.employeeWork?.length ?? 0;
  }

  @FieldResolver(() => Number)
  vehicleWorkCount(@Root() dailyReport: DailyReportDocument): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (dailyReport as any).vehicleWork?.length ?? 0;
  }

  @FieldResolver(() => Number)
  materialShipmentCount(@Root() dailyReport: DailyReportDocument): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (dailyReport as any).materialShipment?.length ?? 0;
  }

  @FieldResolver(() => Number)
  productionCount(@Root() dailyReport: DailyReportDocument): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (dailyReport as any).production?.length ?? 0;
  }

  /**
   * ----- Queries -----
   */

  @Query(() => DailyReportClass)
  async dailyReport(@Arg("id") id: string) {
    return DailyReport.getById(id);
  }

  @Authorized()
  @Query(() => [DailyReportClass])
  async dailyReports(
    @Ctx() ctx: IContext,
    @Arg("options", () => DailyReportListOptionData, { nullable: true })
    options?: DailyReportListOptionData
  ) {
    let query: FilterQuery<DailyReportDocument> = {};
    if (options?.crews && options.crews.length > 0) {
      query = {
        crew: { $in: options.crews },
      };
    } else if (ctx.user && ctx.user.role === UserRoles.User) {
      // If user is just a 'User' and not in a crew, do not return any daily reports
      query = {
        _id: mongoose.Types.ObjectId(),
      };
    }

    if (options?.filters?.includes(DailyReportListFilter.NoCostApproval)) {
      query = {
        ...query,
        approved: false,
      };
    }

    if (options?.filters?.includes(DailyReportListFilter.NoPayroll)) {
      query = {
        ...query,
        payrollComplete: false,
      };
    }

    return DailyReport.getList({
      ...options,
      query,
    });
  }

  @Query(() => [DailyReportClass])
  async dailyReportSearch(
    @Arg("searchString") searchString: string,
    @Arg("options", () => SearchOptions, { nullable: true })
    options: SearchOptions
  ) {
    return (await DailyReport.search(searchString, options)).map(
      (object) => object.dailyReport
    );
  }

  @Query(() => [DailyReportClass])
  async dailyReportsForJobsite(
    @Arg("jobsiteId", () => ID) jobsiteId: Id,
    @Arg("options", () => DailyReportListOptionData, { nullable: true })
    options?: DailyReportListOptionData
  ) {
    return DailyReport.getList({
      query: {
        jobsite: jobsiteId,
      },
      ...options,
    });
  }

  /**
   * ----- Mutations -----
   */

  @Authorized()
  @Mutation(() => DailyReportClass)
  async dailyReportCreate(@Arg("data") data: DailyReportCreateData) {
    return mutations.create(data);
  }

  @Authorized()
  @Mutation(() => DailyReportClass)
  async dailyReportUpdate(
    @Arg("id") id: string,
    @Arg("data") data: DailyReportUpdateData
  ) {
    return mutations.update(id, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => DailyReportClass)
  async dailyReportJobCostApprovalUpdate(
    @Arg("id") id: string,
    @Arg("approved") approved: boolean
  ) {
    return mutations.updateJobCostApproval(id, approved);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => DailyReportClass)
  async dailyReportPayrollCompleteUpdate(
    @Arg("id") id: string,
    @Arg("complete") complete: boolean
  ) {
    return mutations.updatePayrollComplete(id, complete);
  }

  @Authorized()
  @Mutation(() => DailyReportClass)
  async dailyReportAddTemporaryEmployee(
    @Arg("id") id: string,
    @Arg("employeeId") employeeId: string
  ) {
    return mutations.addTemporaryEmployee(id, employeeId);
  }

  @Authorized()
  @Mutation(() => DailyReportClass)
  async dailyReportAddTemporaryVehicle(
    @Arg("id") id: string,
    @Arg("vehicleId") vehicleId: string
  ) {
    return mutations.addTemporaryVehicle(id, vehicleId);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => DailyReportClass)
  async dailyReportArchive(@Arg("id", () => ID) id: Id) {
    return mutations.archive(id);
  }
}
