import SchemaVersions from "@constants/SchemaVersions";
import { DailyReportClass } from "@models";
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class ProductionSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, trim: true })
  public jobTitle!: string;

  @Field({ nullable: false })
  @prop({ required: true })
  public quantity!: number;

  @Field({ nullable: false })
  @prop({ required: true, trim: true })
  public unit!: string;

  @Field({ nullable: false })
  @prop({ required: true })
  public startTime!: Date;

  @Field({ nullable: false })
  @prop({ required: true })
  public endTime!: Date;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;

  @Field()
  @prop({ required: true, default: SchemaVersions.Production })
  public schemaVersion!: number;

  /**
   * @deprecated link already exists in DailyReport document
   */
  @Field(() => DailyReportClass)
  @prop({ ref: () => DailyReportClass })
  public dailyReport!: Ref<DailyReportClass>;
}
