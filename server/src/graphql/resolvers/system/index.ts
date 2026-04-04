import { DefaultRateData, RatesData } from "@graphql/types/mutation";
import { System, SystemClass, File, EnrichedFile } from "@models";
import { Arg, Authorized, ID, Mutation, Query, Resolver } from "type-graphql";
import { Id } from "@typescript/models";
import mutations from "./mutations";
import { publishEnrichedFileCreated } from "../../../rabbitmq/publisher";
import { isDocument } from "@typegoose/typegoose";

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
  async systemUpdateUnitExtras(@Arg("data", () => [String]) data: string[]) {
    return mutations.unitExtras(data);
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

  @Authorized(["ADMIN"])
  @Mutation(() => SystemClass)
  async systemAddSpecFile(@Arg("fileId", () => ID) fileId: Id) {
    const system = await System.getSystem();
    const file = await File.getById(fileId, { throwError: true });

    // Create a standalone EnrichedFile document
    const enrichedFile = await EnrichedFile.createDocument(file!._id.toString());
    await enrichedFile.save();

    // Push the ref to system.specFiles
    system.specFiles.push(enrichedFile._id as any);
    await system.save();

    await publishEnrichedFileCreated(enrichedFile._id.toString(), file!._id.toString());

    return System.getSystem();
  }

  @Authorized(["ADMIN"])
  @Mutation(() => SystemClass)
  async systemRemoveSpecFile(@Arg("fileObjectId", () => ID) fileObjectId: Id) {
    const system = await System.getSystem();
    system.specFiles = (system.specFiles as any[]).filter(
      (f: any) => f.toString() !== fileObjectId.toString()
    ) as any;
    await system.save();

    await EnrichedFile.findByIdAndDelete(fileObjectId);

    return system;
  }

  @Authorized(["ADMIN"])
  @Mutation(() => SystemClass)
  async systemRetrySpecFile(@Arg("fileObjectId", () => ID) fileObjectId: Id) {
    const enrichedFile = await EnrichedFile.findById(fileObjectId);
    if (!enrichedFile) throw new Error("Spec file not found");
    if (!enrichedFile.file) throw new Error("EnrichedFile has no file ref");

    await EnrichedFile.findByIdAndUpdate(fileObjectId, {
      $set: { summaryStatus: "pending" },
      $unset: { summaryError: "" },
    });

    const fileId = isDocument(enrichedFile.file)
      ? enrichedFile.file._id.toString()
      : enrichedFile.file.toString();

    await publishEnrichedFileCreated(fileObjectId.toString(), fileId);

    return System.getSystem();
  }
}
