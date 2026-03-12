import { DefaultRateData, RatesData } from "@graphql/types/mutation";
import { System, SystemClass, File } from "@models";
import { Arg, Authorized, ID, Mutation, Query, Resolver } from "type-graphql";
import { Types } from "mongoose";
import { Id } from "@typescript/models";
import mutations from "./mutations";
import { publishEnrichedFileCreated } from "../../../rabbitmq/publisher";

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

  @Authorized(["ADMIN"])
  @Mutation(() => SystemClass)
  async systemAddSpecFile(@Arg("fileId", () => ID) fileId: Id) {
    const system = await System.getSystem();
    const file = await File.getById(fileId, { throwError: true });

    const fileObjectId = new Types.ObjectId();
    system.specFiles.push({
      _id: fileObjectId,
      file: file!._id,
      summaryStatus: "pending",
    } as any);

    await system.save();

    await publishEnrichedFileCreated(fileObjectId.toString(), file!._id.toString());

    return System.getSystem();
  }

  @Authorized(["ADMIN"])
  @Mutation(() => SystemClass)
  async systemRemoveSpecFile(@Arg("fileObjectId", () => ID) fileObjectId: Id) {
    const system = await System.getSystem();
    system.specFiles = system.specFiles.filter(
      (f) => f._id.toString() !== fileObjectId.toString()
    ) as any;
    await system.save();
    return system;
  }

  @Authorized(["ADMIN"])
  @Mutation(() => SystemClass)
  async systemRetrySpecFile(@Arg("fileObjectId", () => ID) fileObjectId: Id) {
    const system = await System.getSystem();
    const fileObj = system.specFiles.find(
      (f) => f._id.toString() === fileObjectId.toString()
    );
    if (!fileObj) throw new Error("Spec file not found");

    await (System as any).findOneAndUpdate(
      { "specFiles._id": fileObjectId },
      { $set: { "specFiles.$.summaryStatus": "pending" }, $unset: { "specFiles.$.summaryError": "" } }
    );

    const fileId =
      fileObj.file && typeof (fileObj.file as any)._id !== "undefined"
        ? (fileObj.file as any)._id.toString()
        : fileObj.file!.toString();

    await publishEnrichedFileCreated(fileObjectId.toString(), fileId);

    return System.getSystem();
  }
}
