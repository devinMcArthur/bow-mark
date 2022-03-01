import { CrewClass, DailyReportClass } from "@models";
import { prop, Ref } from "@typegoose/typegoose";
import isUrl from "@validation/isUrl";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
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

  @Field(() => [CrewClass])
  @prop({ ref: () => CrewClass, default: [] })
  public crews!: Ref<CrewClass>[];

  /**
   * @deprecated dailyReports holds the link to the jobsite
   */
  @Field(() => [DailyReportClass])
  @prop({ ref: () => DailyReportClass, default: [] })
  public dailyReports!: Ref<DailyReportClass>[];
}