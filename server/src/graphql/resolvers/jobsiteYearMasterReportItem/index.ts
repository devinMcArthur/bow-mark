import {
  JobsiteYearMasterReportItemClass,
  JobsiteYearMasterReportItemDocument,
  JobsiteYearReport,
  JobsiteYearReportClass,
} from "@models";
import { FieldResolver, Resolver, Root } from "type-graphql";

@Resolver(() => JobsiteYearMasterReportItemClass)
export default class JobsiteYearMasterReportItemResolver {
  /**
   * ----- Field Resolver -----
   */

  @FieldResolver(() => JobsiteYearReportClass, { nullable: true })
  async report(
    @Root() jobsiteYearMasterReportItem: JobsiteYearMasterReportItemDocument
  ) {
    return JobsiteYearReport.getById(jobsiteYearMasterReportItem.report || "");
  }
}
