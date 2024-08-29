import {
  JobsiteMaterial,
  JobsiteMaterialClass,
  MaterialReportClass,
  MaterialReportDocument,
  MaterialShipment,
  MaterialShipmentClass,
} from "@models";
import { FieldResolver, Resolver, Root } from "type-graphql";

@Resolver(() => MaterialReportClass)
export default class MaterialReportResolver {
  @FieldResolver(() => JobsiteMaterialClass)
  async jobsiteMaterialRecord(@Root() materialReport: MaterialReportDocument) {
    return JobsiteMaterial.getById(materialReport.jobsiteMaterial || "");
  }

  @FieldResolver(() => [MaterialShipmentClass])
  async materialShipments(@Root() materialReport: MaterialReportDocument) {
    return MaterialShipment.find({
      _id: { $in: materialReport.materialShipments },
    });
  }
}
