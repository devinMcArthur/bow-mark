import {
  Vehicle,
  VehicleClass,
  VehicleReportClass,
  VehicleReportDocument,
  VehicleWork,
  VehicleWorkClass,
} from "@models";
import { FieldResolver, Resolver, Root } from "type-graphql";

@Resolver(() => VehicleReportClass)
export default class VehicleReportResolver {
  @FieldResolver(() => VehicleClass, { nullable: true })
  async vehicleRecord(@Root() vehicleReport: VehicleReportDocument) {
    return Vehicle.getById(vehicleReport.vehicle || "");
  }

  @FieldResolver(() => [VehicleWorkClass])
  async vehicleWorkRecord(@Root() vehicleReport: VehicleReportDocument) {
    return VehicleWork.find({
      _id: { $in: vehicleReport.vehicleWork },
    });
  }
}
