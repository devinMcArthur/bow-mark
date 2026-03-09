import { DefaultRateData, RatesData } from "@graphql/types/mutation";
import { System, SystemClass } from "@models";
import { Arg, Authorized, Mutation, Query, Resolver } from "type-graphql";
import mutations from "./mutations";

@Resolver(() => SystemClass)
export default class SystemResolver {
  /**
   * ----- Queries -----
   */

  @Query(() => SystemClass)
  async system() {
    return System.getSystem();
  }

  /**
   * ----- Mutations -----
   */

  @Authorized(["ADMIN"])
  @Mutation(() => SystemClass)
  async systemUpdateUnitDefaults(@Arg("data", () => [String]) data: string[]) {
    return mutations.unitDefaults(data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => SystemClass)
  async systemUpdateLaborTypes(@Arg("data", () => [String]) data: string[]) {
    return mutations.laborTypes(data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => SystemClass)
  async systemUpdateFluidTypes(@Arg("data", () => [String]) data: string[]) {
    return mutations.fluidTypes(data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => SystemClass)
  async systemUpdateCompanyVehicleTypeDefaults(
    @Arg("data", () => [DefaultRateData]) data: DefaultRateData[]
  ) {
    return mutations.companyVehicleTypeDefaults(data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => SystemClass)
  async systemUpdateMaterialShipmentVehicleTypeDefaults(
    @Arg("data", () => [DefaultRateData]) data: DefaultRateData[]
  ) {
    return mutations.materialShipmentVehicleTypeDefaults(data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => SystemClass)
  async systemUpdateInternalExpenseOverheadRate(
    @Arg("data", () => [RatesData]) data: RatesData[]
  ) {
    return mutations.internalExpenseOverheadRate(data);
  }
}
