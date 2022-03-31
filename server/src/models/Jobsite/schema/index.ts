import SchemaVersions from "@constants/SchemaVersions";
import { ES_updateJobsite } from "@elasticsearch/helpers/jobsite";
import {
  CrewClass,
  DailyReportClass,
  JobsiteDocument,
  InvoiceClass,
  JobsiteMaterialClass,
} from "@models";
import { post, prop, Ref } from "@typegoose/typegoose";
import { DefaultRateClass } from "@typescript/models";
import isUrl from "@validation/isUrl";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { TruckingRateClass } from "./subDocuments";

@ObjectType()
@post<JobsiteDocument>("save", async (jobsite) => {
  await ES_updateJobsite(jobsite);
})
export class JobsiteSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, minlength: 1, trim: true })
  public name!: string;

  @Field({ nullable: true })
  @prop({
    trim: true,
    validate: {
      validator: (value) => isUrl(value),
      message: "Provided URL is not a valid URL",
    },
  })
  public location_url?: string;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;

  @Field({ nullable: true })
  @prop({ trim: true, unique: true })
  public jobcode?: string;

  @Field({ nullable: false })
  @prop({ default: false, required: true })
  public active!: boolean;

  /**
   * @version 2
   */
  @Field(() => JobsiteMaterialClass)
  @prop({ ref: () => JobsiteMaterialClass, default: [] })
  public materials!: Ref<JobsiteMaterialClass>[];

  /**
   * @version 2
   */
  @Field(() => InvoiceClass)
  @prop({ ref: () => InvoiceClass, default: [] })
  public invoices!: Ref<InvoiceClass>[];

  /**
   * @version 2
   */
  @Field(() => [TruckingRateClass])
  @prop({ type: () => [TruckingRateClass], default: [] })
  public truckingRates!: TruckingRateClass[];

  @Field(() => [CrewClass])
  @prop({ ref: () => CrewClass, default: [] })
  public crews!: Ref<CrewClass>[];

  @Field()
  @prop({ required: true, default: SchemaVersions.Jobsite })
  public schemaVersion!: number;

  /**
   * @deprecated dailyReports holds the link to the jobsite
   */
  @Field(() => [DailyReportClass])
  @prop({ ref: () => DailyReportClass, default: [] })
  public dailyReports!: Ref<DailyReportClass>[];
}
