import { JobsiteDayReport, JobsiteDayReportClass } from "@models";
import { Arg, ID, Query, Resolver } from "type-graphql";

@Resolver(() => JobsiteDayReportClass)
export default class JobsiteDayReportResolver {
  @Query(() => [JobsiteDayReportClass])
  async jobsiteDayReports(
    @Arg("ids", () => [ID])
    ids: string[]
  ) {
    return JobsiteDayReport.getByIds(ids);
  }
}
