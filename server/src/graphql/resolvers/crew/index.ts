import { SearchOptions } from "@graphql/types/query";
import {
  Crew,
  CrewClass,
  CrewDocument,
  EmployeeClass,
  JobsiteClass,
  VehicleClass,
} from "@models";
import {
  Arg,
  Authorized,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import mutations, { CrewCreateData } from "./mutations";

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

  /**
   * ----- Mutations -----
   */

  @Authorized()
  @Mutation(() => CrewClass)
  async crewCreate(@Arg("data") data: CrewCreateData) {
    return mutations.create(data);
  }

  @Mutation(() => CrewClass)
  async crewAddEmployee(
    @Arg("crewId") id: string,
    @Arg("employeeId") employeeId: string
  ) {
    return mutations.addEmployee(id, employeeId);
  }

  @Mutation(() => CrewClass)
  async crewAddVehicle(
    @Arg("crewId") id: string,
    @Arg("vehicleId") vehicleId: string
  ) {
    return mutations.addVehicle(id, vehicleId);
  }

  @Mutation(() => CrewClass)
  async crewRemoveEmployee(
    @Arg("crewId") id: string,
    @Arg("employeeId") employeeId: string
  ) {
    return mutations.removeEmployee(id, employeeId);
  }

  @Mutation(() => CrewClass)
  async crewRemoveVehicle(
    @Arg("crewId") id: string,
    @Arg("vehicleId") vehicleId: string
  ) {
    return mutations.removeVehicle(id, vehicleId);
  }
}
