import {
  Arg,
  Authorized,
  FieldResolver,
  Float,
  ID,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";

import {
  CrewClass,
  OperatorDailyReportClass,
  Vehicle,
  VehicleClass,
  VehicleDocument,
  VehicleIssueClass,
} from "@models";
import mutations, { VehicleCreateData, VehicleUpdateData } from "./mutations";
import { SearchOptions } from "@graphql/types/query";
import { RatesData } from "@graphql/types/mutation";
import { Id } from "@typescript/models";
import { ListOptionData } from "@typescript/graphql";
import { VehicleHoursReport } from "@typescript/vehicle";

@Resolver(() => VehicleClass)
export default class VehicleResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => [CrewClass])
  async crews(@Root() vehicle: VehicleDocument) {
    return vehicle.getCrews();
  }

  @FieldResolver(() => Float)
  async currentRate(@Root() vehicle: VehicleDocument) {
    return await vehicle.getRateForTime(new Date());
  }

  @FieldResolver(() => [OperatorDailyReportClass])
  async operatorDailyReports(@Root() vehicle: VehicleDocument) {
    return await vehicle.getOperatorDailyReports();
  }

  @FieldResolver(() => [VehicleIssueClass])
  async vehicleIssues(@Root() vehicle: VehicleDocument) {
    return await vehicle.getVehicleIssues();
  }

  /**
   * ----- Queries -----
   */

  @Query(() => VehicleClass)
  async vehicle(@Arg("id") id: string) {
    return Vehicle.getById(id);
  }

  @Query(() => [VehicleClass])
  async vehicles(
    @Arg("options", () => ListOptionData, { nullable: true })
    options?: ListOptionData
  ) {
    return Vehicle.getList({
      ...options,
    });
  }

  @Query(() => [VehicleClass])
  async archivedVehicles(
    @Arg("options", () => ListOptionData, { nullable: true })
    options?: ListOptionData
  ) {
    return Vehicle.getList({
      ...options,
      query: {
        archivedAt: { $exists: true, $ne: null },
      },
      showArchived: true,
    });
  }

  @Query(() => [VehicleClass])
  async vehicleSearch(
    @Arg("searchString") searchString: string,
    @Arg("options", () => SearchOptions, { nullable: true })
    options?: SearchOptions
  ) {
    return (await Vehicle.search(searchString, options)).map(
      (object) => object.vehicle
    );
  }

  @Query(() => VehicleHoursReport)
  async vehicleHourReports(
    @Arg("id", () => ID) id: Id,
  ) {
    const vehicle = await Vehicle.getById(id);
    if (!vehicle) throw new Error("Could not find vehicle");

    return vehicle.getVehicleHourReports();
  }

  /**
   * ----- Mutations -----
   */

  @Authorized()
  @Mutation(() => VehicleClass)
  async vehicleCreate(
    @Arg("data") data: VehicleCreateData,
    @Arg("crewId", { nullable: true }) crewId?: string
  ) {
    return mutations.create(data, crewId);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => VehicleClass)
  async vehicleUpdate(
    @Arg("id", () => ID) id: Id,
    @Arg("data") data: VehicleUpdateData
  ) {
    return mutations.update(id, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => VehicleClass)
  async vehicleUpdateRates(
    @Arg("id") id: string,
    @Arg("data", () => [RatesData]) data: RatesData[]
  ) {
    return mutations.updateRates(id, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => VehicleClass)
  async vehicleArchive(@Arg("id", () => ID) id: Id) {
    return mutations.archive(id);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => VehicleClass)
  async vehicleUnarchive(@Arg("id", () => ID) id: Id) {
    return mutations.unarchive(id);
  }
}
