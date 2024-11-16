import {
  CompanyClass,
  InvoiceClass,
  JobsiteClass,
  JobsiteMaterial,
  JobsiteMaterialClass,
  JobsiteMaterialDocument,
  MaterialClass,
} from "@models";
import { Id } from "@typescript/models";
import {
  Arg,
  Authorized,
  FieldResolver,
  ID,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { InvoiceData } from "../invoice/mutations";
import mutations, { JobsiteMaterialUpdateData } from "./mutations";
import { YearlyMaterialQuantity } from "@typescript/jobsiteMaterial";

@Resolver(() => JobsiteMaterialClass)
export default class JobsiteMaterialResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => MaterialClass)
  async material(@Root() jobsiteMaterial: JobsiteMaterialDocument) {
    return jobsiteMaterial.getMaterial();
  }

  @FieldResolver(() => CompanyClass)
  async supplier(@Root() jobsiteMaterial: JobsiteMaterialDocument) {
    return jobsiteMaterial.getSupplier();
  }

  @FieldResolver(() => [YearlyMaterialQuantity], { nullable: false })
  async completedQuantity(@Root() jobsiteMaterial: JobsiteMaterialDocument) {
    const quantity = await jobsiteMaterial.getCompletedQuantity();

    return Object.entries(quantity).map(([key, value]) => ({
      year: Number(key),
      quantity: Number(value),
    }));
  }

  @FieldResolver(() => JobsiteClass, { nullable: false })
  async jobsite(@Root() jobsiteMaterial: JobsiteMaterialDocument) {
    return jobsiteMaterial.getJobsite();
  }

  @FieldResolver(() => Boolean, { nullable: false })
  async canRemove(@Root() jobsiteMaterial: JobsiteMaterialDocument) {
    return jobsiteMaterial.canRemove();
  }

  @FieldResolver(() => [InvoiceClass], { nullable: true })
  async invoices(@Root() jobsiteMaterial: JobsiteMaterialDocument) {
    return jobsiteMaterial.getInvoices();
  }

  /**
   * ----- Queries -----
   */

  @Query(() => JobsiteMaterialClass)
  async jobsiteMaterial(@Arg("id") id: string) {
    return JobsiteMaterial.getById(id);
  }

  /**
   * ----- Mutations -----
   */

  @Authorized(["ADMIN"])
  @Mutation(() => JobsiteMaterialClass)
  async jobsiteMaterialUpdate(
    @Arg("id") id: string,
    @Arg("data") data: JobsiteMaterialUpdateData
  ) {
    return mutations.update(id, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => Boolean)
  async jobsiteMaterialRemove(
    @Arg("id", () => ID, { nullable: false }) id: Id
  ) {
    return mutations.remove(id);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => JobsiteMaterialClass)
  async jobsiteMaterialAddInvoice(
    @Arg("jobsiteMaterialId", () => ID) jobsiteMaterialId: Id,
    @Arg("data") data: InvoiceData
  ) {
    return mutations.addInvoice(jobsiteMaterialId, data);
  }
}
