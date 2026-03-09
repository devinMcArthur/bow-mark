import {
  MaterialShipment,
  MaterialShipmentClass,
  TruckingReportClass,
  TruckingReportDocument,
} from "@models";
import { FieldResolver, Resolver, Root } from "type-graphql";

@Resolver(() => TruckingReportClass)
export default class TruckingReportResolver {
  @FieldResolver(() => MaterialShipmentClass)
  async materialShipments(@Root() truckingReport: TruckingReportDocument) {
    return MaterialShipment.find({
      _id: { $in: truckingReport.materialShipments },
    });
  }
}
