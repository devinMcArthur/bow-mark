import {
  CompanyClass,
  InvoiceClass,
  JobsiteClass,
  JobsiteMaterialClass,
  JobsiteMaterialDocument,
  MaterialClass,
} from "@models";
import { Id } from "@typescript/models";
import {
  Arg,
  Authorized,
  FieldResolver,
  Float,
  ID,
  Mutation,
  Resolver,
  Root,
} from "type-graphql";
import { InvoiceData } from "../invoice/mutations";
import mutations, { JobsiteMaterialUpdateData } from "./mutations";

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

  @FieldResolver(() => Float, { nullable: false })
  async completedQuantity(@Root() jobsiteMaterial: JobsiteMaterialDocument) {
    return jobsiteMaterial.getCompletedQuantity();
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
