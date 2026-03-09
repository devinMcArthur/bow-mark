import SchemaVersions from "@constants/SchemaVersions";
import { DailyReportClass, FileClass } from "@models";
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class ReportNoteSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({
    required: function () {
      // @ts-expect-error - ensure it is at least an empty string
      return typeof this.note === "string" ? false : true;
    },
    trim: true,
    default: "",
  })
  public note!: string;

  @Field()
  @prop({ required: true, default: SchemaVersions.ReportNote })
  public schemaVersion!: number;

  @Field(() => [FileClass])
  @prop({ ref: () => FileClass, default: [] })
  public files!: Ref<FileClass>[];

  /**
   * @deprecated link is already held in DailyReport document
   */
  @Field(() => DailyReportClass)
  @prop({ ref: () => DailyReportClass })
  public dailyReport!: Ref<DailyReportClass>;
}
