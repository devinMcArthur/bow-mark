import {
  MaterialShipment,
  MaterialShipmentClass,
  NonCostedMaterialReportClass,
  NonCostedMaterialReportDocument,
} from "@models";
import { FieldResolver, Resolver, Root } from "type-graphql";

@Resolver(() => NonCostedMaterialReportClass)
export default class NonCostedMaterialReportResolver {
  @FieldResolver(() => [MaterialShipmentClass])
  async materialShipments(
    @Root() nonCostedMaterialReport: NonCostedMaterialReportDocument
  ) {
    return MaterialShipment.find({
      _id: { $in: nonCostedMaterialReport.materialShipments },
    });
  }
}
