import SchemaVersions from "@constants/SchemaVersions";
import { post, prop } from "@typegoose/typegoose";
import { JobsiteYearReportDocument } from "@models";
import { Field, ObjectType } from "type-graphql";
import pubsub from "@pubsub";
import { PubSubTopics } from "@typescript/pubSub";
import { JobsiteReportBaseClass } from "@typescript/jobsiteReports";

@ObjectType()
@post<JobsiteYearReportDocument>("save", async (jobsiteYearReport) => {
  await pubsub.publish(
    `${PubSubTopics.JOBSITE_YEAR_REPORT}_${jobsiteYearReport._id}`,
    {
      id: jobsiteYearReport._id,
    }
  );
})
export class JobsiteYearReportSchema extends JobsiteReportBaseClass {
  @Field(() => Date, { nullable: false })
  @prop({ required: true })
  public startOfYear!: Date;

  @Field()
  @prop({ required: true, default: SchemaVersions.JobsiteYearReport })
  public schemaVersion!: number;
}
