import SchemaVersions from "@constants/SchemaVersions";
import { JobsiteYearMasterReportDocument } from "@models";
import pubsub from "@pubsub";
import { post, prop } from "@typegoose/typegoose";
import { CrewTypes } from "@typescript/crew";
import { RangeSummaryReportClass } from "@typescript/jobsiteReports";
import { UpdateClass } from "@typescript/models";
import { PubSubTopics } from "@typescript/pubSub";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { JobsiteYearMasterReportItemClass } from "./subDocuments";

export * from "./subDocuments";

@ObjectType()
@post<JobsiteYearMasterReportDocument>(
  "save",
  async (jobsiteYearMasterReport) => {
    await pubsub.publish(
      `${PubSubTopics.JOBSITE_YEAR_MASTER_REPORT}_${jobsiteYearMasterReport._id}`,
      {
        id: jobsiteYearMasterReport._id,
      }
    );
  }
)
export class JobsiteYearMasterReportSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field(() => Date, { nullable: false })
  @prop({ required: true, unique: true })
  public startOfYear!: Date;

  @Field(() => [JobsiteYearMasterReportItemClass])
  @prop({
    required: true,
    default: [],
    type: () => JobsiteYearMasterReportItemClass,
  })
  public reports!: JobsiteYearMasterReportItemClass[];

  @Field(() => RangeSummaryReportClass)
  @prop({ type: () => RangeSummaryReportClass, default: {} })
  public summary!: RangeSummaryReportClass;

  @Field(() => [CrewTypes], { nullable: false })
  @prop({ type: [String], enum: CrewTypes, required: true, default: [] })
  public crewTypes!: CrewTypes[];

  @Field(() => UpdateClass, { nullable: false })
  @prop({ type: () => UpdateClass, required: true, default: {} })
  public update!: UpdateClass;

  @Field()
  @prop({ required: true, default: SchemaVersions.JobsiteYearMasterReport })
  public schemaVersion!: number;
}
