import SchemaVersions from "@constants/SchemaVersions";
import { post, prop } from "@typegoose/typegoose";
import { JobsiteMonthReportDocument } from "@models";
import { Field, ObjectType } from "type-graphql";
import pubsub from "@pubsub";
import { PubSubTopics } from "@typescript/pubSub";
import { JobsiteReportBaseClass } from "@typescript/jobsiteReports";

@ObjectType()
@post<JobsiteMonthReportDocument>("save", async (jobsiteMonthReport) => {
  await pubsub.publish(
    `${PubSubTopics.JOBSITE_MONTH_REPORT}_${jobsiteMonthReport._id}`,
    {
      id: jobsiteMonthReport._id,
    }
  );
})
export class JobsiteMonthReportSchema extends JobsiteReportBaseClass {
  @Field(() => Date, { nullable: false })
  @prop({ required: true })
  public startOfMonth!: Date;

  @Field()
  @prop({ required: true, default: SchemaVersions.JobsiteMonthReport })
  public schemaVersion!: number;
}
