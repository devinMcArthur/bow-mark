import { getUserCrews } from "@graphql/helpers/general";
import { SearchOptions } from "@graphql/types/query";
import {
  CrewClass,
  DailyReportClass,
  EnrichedFileClass,
  InvoiceClass,
  Jobsite,
  JobsiteClass,
  JobsiteDayReportClass,
  JobsiteDocument,
  JobsiteEnrichedFileClass,
  JobsiteMaterialClass,
  JobsiteMonthReportClass,
  JobsiteYearReportClass,
  MaterialShipmentClass,
  File,
  EnrichedFile,
} from "@models";
import { UserRoles } from "@typescript/user";
import { publishEnrichedFileCreated } from "../../../rabbitmq/publisher";
import { isDocument } from "@typegoose/typegoose";
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

  @FieldResolver(() => [JobsiteEnrichedFileClass])
  async enrichedFiles(
    @Root() jobsite: JobsiteDocument,
    @Ctx() context: IContext
  ) {
    const userRole = context.user?.role ?? UserRoles.User;
    const allEntries = (jobsite.enrichedFiles as JobsiteEnrichedFileClass[]).filter(
      (entry) => entry.enrichedFile != null
    );
    const allowedEntries = allEntries.filter(
      (entry) => (entry.minRole ?? UserRoles.ProjectManager) <= userRole
    );
    const enrichedFileIds = allowedEntries.map((e) => e.enrichedFile);
    const files = await EnrichedFile.find({ _id: { $in: enrichedFileIds } }).populate("file");
    const fileMap = new Map(files.map((f) => [f._id.toString(), f]));
    return allowedEntries
      .map((entry) => ({
        _id: entry._id,
        minRole: entry.minRole,
        enrichedFile: fileMap.get(entry.enrichedFile!.toString()),
      }))
      .filter((e) => e.enrichedFile != null);
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

  // ── EnrichedFiles ────────────────────────────────────────────────────────

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => JobsiteClass)
  async jobsiteAddEnrichedFile(
    @Arg("id", () => ID) id: Id,
    @Arg("fileId", () => ID) fileId: Id,
    @Arg("minRole", () => UserRoles, { defaultValue: UserRoles.ProjectManager }) minRole: UserRoles
  ) {
    const jobsite = await Jobsite.getById(id, { throwError: true });
    const file = await File.getById(fileId, { throwError: true });

    const enrichedFile = await EnrichedFile.createDocument(file!._id.toString());
    await enrichedFile.save();
    // Strip any stale legacy entries (old plain-ObjectId format) before saving
    jobsite!.enrichedFiles = (jobsite!.enrichedFiles as any[]).filter(
      (e: any) => e.enrichedFile != null
    ) as any;
    (jobsite!.enrichedFiles as any[]).push({ enrichedFile: enrichedFile._id, minRole });
    await jobsite!.save();

    await publishEnrichedFileCreated(enrichedFile._id.toString(), file!._id.toString());

    return Jobsite.getById(id);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => JobsiteClass)
  async jobsiteRemoveEnrichedFile(
    @Arg("id", () => ID) id: Id,
    @Arg("fileObjectId", () => ID) fileObjectId: Id
  ) {
    const jobsite = await Jobsite.getById(id, { throwError: true });
    jobsite!.enrichedFiles = (jobsite!.enrichedFiles as any[]).filter(
      (entry: any) => entry.enrichedFile.toString() !== fileObjectId.toString()
    ) as any;
    await jobsite!.save();

    await EnrichedFile.findByIdAndDelete(fileObjectId);

    return jobsite;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => JobsiteClass)
  async jobsiteRetryEnrichedFile(
    @Arg("id", () => ID) id: Id,
    @Arg("fileObjectId", () => ID) fileObjectId: Id
  ) {
    const enrichedFile = await EnrichedFile.findById(fileObjectId);
    if (!enrichedFile) throw new Error("File not found");
    if (!enrichedFile.file) throw new Error("EnrichedFile has no file ref");

    await EnrichedFile.findByIdAndUpdate(fileObjectId, {
      $set: { summaryStatus: "pending" },
      $unset: { summaryError: "" },
    });

    const fileId = isDocument(enrichedFile.file)
      ? enrichedFile.file._id.toString()
      : enrichedFile.file.toString();

    await publishEnrichedFileCreated(fileObjectId.toString(), fileId);

    return Jobsite.getById(id);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => JobsiteClass)
  async jobsiteUpdateEnrichedFileRole(
    @Arg("id", () => ID) id: Id,
    @Arg("fileObjectId", () => ID) fileObjectId: Id,
    @Arg("minRole", () => UserRoles) minRole: UserRoles
  ) {
    const jobsite = await Jobsite.getById(id, { throwError: true });
    const entry = (jobsite!.enrichedFiles as any[]).find(
      (e: any) => e.enrichedFile.toString() === fileObjectId.toString()
    );
    if (!entry) throw new Error("File not found on jobsite");
    entry.minRole = minRole;
    await jobsite!.save();
    return Jobsite.getById(id);
  }
}
