import { CompanyClass, InvoiceClass, InvoiceDocument } from "@models";
import { Id } from "@typescript/models";
import {
  Arg,
  Authorized,
  FieldResolver,
  ID,
  Mutation,
  Resolver,
  Root,
} from "type-graphql";
import mutations, { InvoiceData } from "./mutations";

@Resolver(() => InvoiceClass)
export default class InvoiceResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => CompanyClass)
  async company(@Root() invoice: InvoiceDocument) {
    return invoice.getCompany();
  }

  /**
   * ----- Mutations -----
   */

  @Authorized(["ADMIN"])
  @Mutation(() => InvoiceClass)
  async invoiceUpdateForJobsite(
    @Arg("id") id: string,
    @Arg("jobsiteId", () => ID) jobsiteId: Id,
    @Arg("data") data: InvoiceData
  ) {
    return mutations.updateForJobsite(id, jobsiteId, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => InvoiceClass)
  async invoiceUpdateForJobsiteMaterial(
    @Arg("id") id: string,
    @Arg("jobsiteMaterialId", () => ID) jobsiteMaterialId: Id,
    @Arg("data") data: InvoiceData
  ) {
    return mutations.updateForJobsiteMaterial(id, jobsiteMaterialId, data);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => Boolean)
  async invoiceRemove(@Arg("id", () => ID) id: Id) {
    return mutations.remove(id);
  }
}
