import { SearchOptions } from "@graphql/types/query";
import {
  Company,
  CompanyClass,
  CompanyDocument,
  Jobsite,
  JobsiteClass,
  Material,
  MaterialClass,
} from "@models";
import {
  CompanyMaterialReport,
  CompanyMaterialReportDocument,
  CompanyMaterialReportJobDay,
  CompanyMaterialReportJobDayDocument,
} from "@typescript/company";
import { ListOptionData } from "@typescript/graphql";
import {
  Arg,
  FieldResolver,
  ID,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import mutations, { CompanyCreateData } from "./mutations";

@Resolver(() => CompanyClass)
export default class CompanyResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => [CompanyMaterialReport])
  async materialReports(@Root() company: CompanyDocument) {
    return company.getMaterialReports();
  }

  /**
   * ----- Queries -----
   */

  @Query(() => CompanyClass)
  async company(@Arg("id", () => ID) id: string) {
    return Company.getById(id);
  }

  @Query(() => [CompanyClass])
  async companies(
    @Arg("options", () => ListOptionData, { nullable: true })
    options?: ListOptionData
  ) {
    return Company.getList(options);
  }

  @Query(() => [CompanyClass])
  async companySearch(
    @Arg("searchString") searchString: string,
    @Arg("options", () => SearchOptions, { nullable: true })
    options: SearchOptions
  ) {
    return (await Company.search(searchString, options)).map(
      (object) => object.company
    );
  }

  /**
   * ----- Mutations -----
   */

  @Mutation(() => CompanyClass)
  async companyCreate(@Arg("data") data: CompanyCreateData) {
    return mutations.create(data);
  }
}

@Resolver(() => CompanyMaterialReport)
export class CompanyMaterialReportResolver {
  @FieldResolver(() => MaterialClass)
  async material(@Root() companyMaterialReport: CompanyMaterialReportDocument) {
    if (!companyMaterialReport.material)
      throw new Error("Doesn't have a material");

    const material = await Material.getById(
      companyMaterialReport.material.toString()
    );
    if (!material) throw new Error("Unable to find material");

    return material;
  }
}

@Resolver(() => CompanyMaterialReportJobDay)
export class CompanyMaterialReportJobDayResolver {
  @FieldResolver(() => JobsiteClass)
  async jobsite(
    @Root() companyMaterialReportJobDay: CompanyMaterialReportJobDayDocument
  ) {
    if (!companyMaterialReportJobDay.jobsite)
      throw new Error("Doesn't have a jobsite");

    const jobsite = await Jobsite.getById(
      companyMaterialReportJobDay.jobsite.toString()
    );
    if (!jobsite) throw new Error("Unable to find jobsite");

    return jobsite;
  }
}
