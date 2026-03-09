import { DocumentType, prop, Ref } from "@typegoose/typegoose";
import { JobsiteMasterReportItemClass } from "@typescript/jobsiteReports";
import { JobsiteYearReportClass } from "@models";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class JobsiteYearMasterReportItemClass extends JobsiteMasterReportItemClass {
  @Field(() => JobsiteYearReportClass)
  @prop({ required: true, ref: () => JobsiteYearReportClass })
  public report!: Ref<JobsiteYearReportClass>;
}

export type JobsiteYearMasterReportItemDocument =
  DocumentType<JobsiteYearMasterReportItemClass>;
