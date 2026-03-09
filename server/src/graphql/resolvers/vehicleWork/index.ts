import { VehicleClass, VehicleWorkClass, VehicleWorkDocument } from "@models";
import {
  Arg,
  Authorized,
  FieldResolver,
  Mutation,
  Resolver,
  Root,
} from "type-graphql";
import mutations, {
  VehicleWorkCreateData,
  VehicleWorkUpdateData,
} from "./mutations";

@Resolver(() => VehicleWorkClass)
export default class VehicleWorkResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => VehicleClass, { nullable: true })
  async vehicle(@Root() vehicleWork: VehicleWorkDocument) {
    return vehicleWork.getVehicle();
  }

  /**
   * ----- Mutations -----
   */

  @Authorized()
  @Mutation(() => [VehicleWorkClass])
  async vehicleWorkCreate(
    @Arg("dailyReportId") id: string,
    @Arg("data", () => [VehicleWorkCreateData]) data: VehicleWorkCreateData[]
  ) {
    return mutations.create(id, data);
  }

  @Authorized()
  @Mutation(() => VehicleWorkClass)
  async vehicleWorkUpdate(
    @Arg("id") id: string,
    @Arg("data") data: VehicleWorkUpdateData
  ) {
    return mutations.update(id, data);
  }

  @Authorized()
  @Mutation(() => String)
  async vehicleWorkDelete(@Arg("id") id: string) {
    return mutations.remove(id);
  }
}
