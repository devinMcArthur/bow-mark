import {
  JobsiteClass,
  JobsiteDayReportClass,
  JobsiteYearReport,
  JobsiteYearReportDocument,
  JobsiteYearReportClass,
  ReportNoteClass,
} from "@models";
import { Id } from "@typescript/models";
import { PubSubTopics } from "@typescript/pubSub";
import {
  Arg,
  FieldResolver,
  ID,
  Query,
  Resolver,
  Root,
  Subscription,
} from "type-graphql";

@Resolver(() => JobsiteYearReportClass)
export default class JobsiteYearReportResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => [JobsiteDayReportClass])
  async dayReports(@Root() jobsiteYearReport: JobsiteYearReportDocument) {
    return jobsiteYearReport.getDayReports();
  }

  @FieldResolver(() => JobsiteClass)
  async jobsite(@Root() jobsiteYearReport: JobsiteYearReportDocument) {
    return jobsiteYearReport.getJobsite();
  }

  @FieldResolver(() => String, { nullable: true })
  async excelDownloadUrl(@Root() jobsiteYearReport: JobsiteYearReportDocument) {
    return jobsiteYearReport.getExcelUrl();
  }

  @FieldResolver(() => [ReportNoteClass])
  async reportNotes(
      @Root() jobsiteYearReport: JobsiteYearReportDocument
  ) {
    return jobsiteYearReport.getReportNotes();
  }

  /**
   * ----- Queries -----
   */

  @Query(() => JobsiteYearReportClass, { nullable: true })
  async jobsiteYearReport(@Arg("id", () => ID) id: Id) {
    return JobsiteYearReport.getById(id);
  }

  /**
   * ----- Subscriptions -----
   */

  @Subscription(() => JobsiteYearReportClass, {
    topics: ({ args }) => {
      return `${PubSubTopics.JOBSITE_YEAR_REPORT}_${args.id}`;
    },
    nullable: true,
  })
  async jobsiteYearReportSub(
    @Arg("id", () => ID) jobsiteYearId: Id,
    @Root() { id }: { id: string }
  ) {
    return JobsiteYearReport.getById(id);
  }
}
