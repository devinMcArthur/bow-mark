import { getUserCrews } from "@graphql/helpers/general";
import { SearchOptions } from "@graphql/types/query";
import {
  CrewClass,
  DailyReportClass,
  InvoiceClass,
  Jobsite,
  JobsiteClass,
  JobsiteDayReportClass,
  JobsiteDocument,
  JobsiteMaterialClass,
  JobsiteMonthReportClass,
  JobsiteYearReportClass,
  MaterialShipmentClass,
  FileNode,
} from "@models";
import { FileNodeSchema } from "../../../models/FileNode/schema";
import { roleWeight } from "../fileNode";
import { UserRoles } from "@typescript/user";
import { IContext, ListOptionData } from "@typescript/graphql";
import { Id } from "@typescript/models";
import dayjs from "dayjs";
import {
  Arg,
  Authorized,
  Ctx,
  FieldResolver,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { InvoiceData } from "../invoice/mutations";
import { JobsiteMaterialCreateData } from "../jobsiteMaterial/mutations";
import mutations, {
  JobsiteContractData,
  JobsiteCreateData,
  JobsiteFileObjectData,
  JobsiteLocationData,
  JobsiteUpdateData,
  TruckingTypeRateData,
} from "./mutations";

@Resolver(() => JobsiteClass)
export default class JobsiteResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => [CrewClass])
  async crews(@Root() jobsite: JobsiteDocument) {
    return jobsite.getCrews();
  }

  @FieldResolver(() => [DailyReportClass])
  async dailyReports(
    @Root() jobsite: JobsiteDocument,
    @Ctx() context: IContext
  ) {
    return jobsite.getDailyReports({
      whitelistedCrews: await getUserCrews(context),
    });
  }

  @FieldResolver(() => [DailyReportClass])
  async yearsDailyReports(
    @Root() jobsite: JobsiteDocument,
    @Ctx() context: IContext
  ) {
    return jobsite.getDailyReports({
      currentYear: true,
      whitelistedCrews: await getUserCrews(context),
    });
  }

  @FieldResolver(() => [JobsiteMaterialClass])
  async materials(@Root() jobsite: JobsiteDocument) {
    return jobsite.getMaterials();
  }

  @FieldResolver(() => [InvoiceClass])
  async expenseInvoices(@Root() jobsite: JobsiteDocument) {
    return jobsite.getExpenseInvoices();
  }

  @FieldResolver(() => [InvoiceClass])
  async yearsExpenseInvoices(@Root() jobsite: JobsiteDocument) {
    return jobsite.getExpenseInvoices({
      currentYear: true,
    });
  }

  @FieldResolver(() => [InvoiceClass])
  async revenueInvoices(@Root() jobsite: JobsiteDocument) {
    return jobsite.getRevenueInvoices();
  }

  @FieldResolver(() => [InvoiceClass])
  async yearsRevenueInvoices(@Root() jobsite: JobsiteDocument) {
    return jobsite.getRevenueInvoices({
      currentYear: true,
    });
  }

  @FieldResolver(() => [MaterialShipmentClass])
  async nonCostedMaterialShipments(@Root() jobsite: JobsiteDocument) {
    return jobsite.getNonCostedMaterialShipments();
  }

  @FieldResolver(() => [MaterialShipmentClass])
  yearsNonCostedMaterialShipments(@Root() jobsite: JobsiteDocument) {
    return jobsite.getNonCostedMaterialShipments({
      startTime: dayjs().startOf("year").toDate(),
      endTime: dayjs().endOf("year").toDate(),
    });
  }

  @FieldResolver(() => [JobsiteDayReportClass])
  async dayReports(@Root() jobsite: JobsiteDocument) {
    return jobsite.getDayReports();
  }

  @FieldResolver(() => [JobsiteMonthReportClass])
  async monthReports(@Root() jobsite: JobsiteDocument) {
    return jobsite.getMonthReports();
  }

  @FieldResolver(() => [JobsiteYearReportClass])
  async yearReports(@Root() jobsite: JobsiteDocument) {
    return jobsite.getYearReports();
  }

  /**
   * Flat list of every file placed under this jobsite's FileNode tree,
   * regardless of sub-folder. Parallel to tender.documents — the new
   * unified file system's replacement for the legacy enrichedFiles
   * array. Filters by per-node minRole against the viewer's role, so
   * foremen (User) don't see files admins have restricted to PM+ even
   * if they know the tree exists.
   */
  @FieldResolver(() => [FileNodeSchema])
  async documents(
    @Root() jobsite: JobsiteDocument,
    @Ctx() context: IContext
  ): Promise<FileNodeSchema[]> {
    const jobsitesNs = await FileNode.findOne({
      name: "jobsites",
      isReservedRoot: true,
      parentId: { $ne: null },
    }).lean();
    if (!jobsitesNs) return [];
    const entityRoot = await FileNode.findOne({
      parentId: jobsitesNs._id,
      name: jobsite._id.toString(),
      isReservedRoot: true,
    }).lean();
    if (!entityRoot) return [];

    const docs = await FileNode.aggregate([
      { $match: { _id: entityRoot._id } },
      {
        $graphLookup: {
          from: "filenodes",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "parentId",
          as: "desc",
        },
      },
      { $unwind: "$desc" },
      {
        $match: {
          "desc.type": "file",
          "desc.deletedAt": null,
          "desc.documentId": { $exists: true },
        },
      },
      { $replaceRoot: { newRoot: "$desc" } },
      { $sort: { sortKey: 1, name: 1 } },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewerRole = (context.user as any)?.role ?? UserRoles.User;
    const viewerWeight = roleWeight(viewerRole);
    return (docs as FileNodeSchema[]).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (n) => (n as any).minRole == null || roleWeight((n as any).minRole) <= viewerWeight
    );
  }

  /**
   * ----- Queries -----
   */

  @Query(() => JobsiteClass)
  async jobsite(@Arg("id") id: string) {
    return Jobsite.getById(id);
  }

  @Query(() => [JobsiteClass])
  async jobsites(
    @Arg("options", () => ListOptionData, { nullable: true })
    options?: ListOptionData
  ) {
    return Jobsite.getList(options);
  }

  @Query(() => [JobsiteClass])
  async jobsiteSearch(
    @Arg("searchString") searchString: string,
    @Arg("options", () => SearchOptions, { nullable: true })
    options: SearchOptions
  ) {
    return (await Jobsite.search(searchString, options)).map(
      (object) => object.jobsite
    );
  }

  /**
   * ----- Mutations -----
   */

  @Authorized(["ADMIN"])
  @Mutation(() => JobsiteClass)
  async jobsiteCreate(@Arg("data") data: JobsiteCreateData) {
    return mutations.create(data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => JobsiteClass)
  async jobsiteUpdate(
    @Arg("id", () => ID, { nullable: false }) id: Id,
    @Arg("data", () => JobsiteUpdateData, { nullable: false })
    data: JobsiteUpdateData
  ) {
    return mutations.update(id, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => JobsiteClass)
  async jobsiteContract(
    @Arg("id", () => ID, { nullable: false }) id: Id,
    @Arg("data", () => JobsiteContractData, { nullable: false })
    data: JobsiteContractData
  ) {
    return mutations.updateContract(id, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => JobsiteClass)
  async jobsiteLocation(
    @Arg("id", () => ID, { nullable: false }) id: Id,
    @Arg("data", () => JobsiteLocationData, { nullable: false })
    data: JobsiteLocationData
  ) {
    return mutations.updateLocation(id, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => JobsiteClass)
  async jobsiteAddMaterial(
    @Arg("jobsiteId") jobsiteId: string,
    @Arg("data") data: JobsiteMaterialCreateData
  ) {
    return mutations.addMaterial(jobsiteId, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => JobsiteClass)
  async jobsiteAddExpenseInvoice(
    @Arg("jobsiteId") jobsiteId: string,
    @Arg("data") data: InvoiceData
  ) {
    return mutations.addExpenseInvoice(jobsiteId, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => JobsiteClass)
  async jobsiteAddRevenueInvoice(
    @Arg("jobsiteId") jobsiteId: string,
    @Arg("data") data: InvoiceData
  ) {
    return mutations.addRevenueInvoice(jobsiteId, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => JobsiteClass)
  async jobsiteSetTruckingRates(
    @Arg("id") id: string,
    @Arg("data", () => [TruckingTypeRateData]) data: TruckingTypeRateData[]
  ) {
    return mutations.setTruckingRates(id, data);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => JobsiteClass)
  async jobsiteGenerateDayReports(@Arg("id") id: string) {
    return mutations.generateDayReports(id);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => [JobsiteClass])
  async jobsiteAddDefaultTruckingRateToAll(
    @Arg("systemRateItemIndex", () => Int) itemIndex: number,
    @Arg("systemRateIndex", () => Int) rateIndex: number
  ) {
    return mutations.addTruckingRateToAll(itemIndex, rateIndex);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => [JobsiteClass])
  async jobsiteSetAllEmptyTruckingRates() {
    return mutations.setAllEmptyTruckingRates();
  }

  @Authorized(["PM"])
  @Mutation(() => JobsiteClass)
  async jobsiteAddFileObject(
    @Arg("id", () => ID) id: Id,
    @Arg("data", () => JobsiteFileObjectData) data: JobsiteFileObjectData
  ) {
    return mutations.addFileObject(id, data);
  }

  @Authorized(["PM"])
  @Mutation(() => JobsiteClass)
  async jobsiteRemoveFileObject(
    @Arg("id", () => ID) id: Id,
    @Arg("fileObjectId", () => ID) fileObjectId: Id
  ) {
    return mutations.removeFileObject(id, fileObjectId);
  }

  @Authorized(["PM"])
  @Mutation(() => JobsiteClass)
  async jobsiteRequestReportGeneration(@Arg("id", () => ID) id: Id) {
    return mutations.requestReportGeneration(id);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => Boolean)
  async jobsiteRemove(
    @Arg("id", () => ID) id: Id,
    @Arg("transferJobsiteId", () => ID, { nullable: true })
    transferJobsiteId: Id
  ) {
    return mutations.remove(id, transferJobsiteId);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => JobsiteClass)
  async jobsiteArchive(@Arg("id", () => ID) id: Id) {
    return mutations.archive(id);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => JobsiteClass)
  async jobsiteUnarchive(@Arg("id", () => ID) id: Id) {
    return mutations.unarchive(id);
  }

}
