import {
  Arg,
  Authorized,
  FieldResolver,
  Mutation,
  Resolver,
  Root,
} from "type-graphql";

import {
  DailyReportClass,
  JobsiteMaterialClass,
  MaterialShipmentClass,
  MaterialShipmentDocument,
  VehicleClass,
} from "@models";
import mutations, {
  MaterialShipmentCreateData,
  MaterialShipmentUpdateData,
} from "./mutations";

@Resolver(() => MaterialShipmentClass)
export default class MaterialShipmentResolver {
  /**
   * ----- Field Resolver -----
   */

  @FieldResolver(() => VehicleClass, { nullable: true })
  async vehicle(@Root() materialShipment: MaterialShipmentDocument) {
    return materialShipment.getVehicle();
  }

  @FieldResolver(() => JobsiteMaterialClass, { nullable: true })
  async jobsiteMaterial(@Root() materialShipment: MaterialShipmentDocument) {
    return materialShipment.getJobsiteMaterial();
  }

  @FieldResolver(() => DailyReportClass)
  async dailyReport(@Root() materialShipment: MaterialShipmentDocument) {
    return materialShipment.getDailyReport();
  }

  /**
   * ----- Mutations -----
   */

  @Authorized()
  @Mutation(() => [MaterialShipmentClass])
  async materialShipmentCreate(
    @Arg("dailyReportId") dailyReportId: string,
    @Arg("data", () => [MaterialShipmentCreateData])
    data: MaterialShipmentCreateData[]
  ) {
    return mutations.create(dailyReportId, data);
  }

  @Authorized()
  @Mutation(() => MaterialShipmentClass)
  async materialShipmentUpdate(
    @Arg("id") id: string,
    @Arg("data", () => MaterialShipmentUpdateData, { nullable: false })
    data: MaterialShipmentUpdateData
  ) {
    return mutations.update(id, data);
  }

  @Authorized()
  @Mutation(() => String)
  async materialShipmentDelete(@Arg("id") id: string) {
    return mutations.remove(id);
  }
}
