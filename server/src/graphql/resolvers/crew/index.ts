import { SearchOptions } from "@graphql/types/query";
import {
  Crew,
  CrewClass,
  CrewDocument,
  DailyReportClass,
  EmployeeClass,
  JobsiteClass,
  VehicleClass,
} from "@models";
import {
  CrewLocationClass,
  CrewLocationDayClass,
  CrewLocationDayItemClass,
} from "@typescript/crew";
import { SupportedMimeTypes } from "@typescript/file";
import { Id } from "@typescript/models";
import { generateCrewLocationWorkbook, getWorkbookBuffer } from "@utils/excel";
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
import mutations, { CrewCreateData, CrewUpdateData } from "./mutations";

@Resolver(() => CrewClass)
export default class CrewResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => [EmployeeClass])
  async employees(@Root() crew: CrewDocument) {
    return crew.getEmployees();
  }

  @FieldResolver(() => [VehicleClass])
  async vehicles(@Root() crew: CrewDocument) {
    return crew.getVehicles();
  }

  @FieldResolver(() => [JobsiteClass])
  async jobsites(@Root() crew: CrewDocument) {
    return crew.getJobsites();
  }

  @FieldResolver(() => [DailyReportClass])
  async dailyReports(@Root() crew: CrewDocument) {
    return crew.getDailyReports();
  }

  /**
   * ----- Query -----
   */

  @Query(() => CrewClass)
  async crew(@Arg("id") id: string) {
    return Crew.getById(id);
  }

  @Query(() => [CrewClass])
  async crewList() {
    return Crew.getList();
  }

  @Query(() => [CrewClass])
  async crewSearch(
    @Arg("searchString") searchString: string,
    @Arg("options", () => SearchOptions, { nullable: true })
    options: SearchOptions
  ) {
    return (await Crew.search(searchString, options)).map(
      (object) => object.crew
    );
  }

  @Query(() => [CrewLocationClass])
  async crewLocations(
    @Arg("startTime", () => Date, { nullable: true }) startTime?: Date,
    @Arg("endTime", () => Date, { nullable: true }) endTime?: Date
  ) {
    return Crew.getCrewLocations(startTime, endTime);
  }

  @Query(() => String)
  async crewLocationsExcel(
    @Arg("startTime", () => Date) startTime: Date,
    @Arg("endTime", () => Date) endTime: Date
  ) {
    const crewLocations = await Crew.getCrewLocations(startTime, endTime);

    const workbook = await generateCrewLocationWorkbook(
      crewLocations,
      startTime,
      endTime
    );

    const buffer = await getWorkbookBuffer(workbook);

    return `data:${SupportedMimeTypes.XLSX};base64,${buffer.toString(
      "base64"
    )}`;
  }

  /**
   * ----- Mutations -----
   */

  @Authorized(["PM", "ADMIN"])
  @Mutation(() => CrewClass)
  async crewCreate(@Arg("data") data: CrewCreateData) {
    return mutations.create(data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => CrewClass)
  async crewUpdate(
    @Arg("id", () => ID) id: Id,
    @Arg("data") data: CrewUpdateData
  ) {
    return mutations.update(id, data);
  }

  @Authorized()
  @Mutation(() => CrewClass)
  async crewAddEmployee(
    @Arg("crewId") id: string,
    @Arg("employeeId") employeeId: string
  ) {
    return mutations.addEmployee(id, employeeId);
  }

  @Authorized()
  @Mutation(() => CrewClass)
  async crewAddVehicle(
    @Arg("crewId") id: string,
    @Arg("vehicleId") vehicleId: string
  ) {
    return mutations.addVehicle(id, vehicleId);
  }

  @Authorized()
  @Mutation(() => CrewClass)
  async crewRemoveEmployee(
    @Arg("crewId") id: string,
    @Arg("employeeId") employeeId: string
  ) {
    return mutations.removeEmployee(id, employeeId);
  }

  @Authorized()
  @Mutation(() => CrewClass)
  async crewRemoveVehicle(
    @Arg("crewId") id: string,
    @Arg("vehicleId") vehicleId: string
  ) {
    return mutations.removeVehicle(id, vehicleId);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => CrewClass)
  async crewArchive(@Arg("id", () => ID) id: Id) {
    return mutations.archive(id);
  }
}

@Resolver(() => CrewLocationClass)
export class CrewLocationResolver {
  @FieldResolver(() => [CrewClass])
  async crew(@Root() crewLocation: CrewLocationClass) {
    return Crew.getById(crewLocation.crew._id);
  }
}

@Resolver(() => CrewLocationDayClass)
export class CrewLocationDayResolver {}

@Resolver(() => CrewLocationDayItemClass)
export class CrewLocationDayItemResolver {}
