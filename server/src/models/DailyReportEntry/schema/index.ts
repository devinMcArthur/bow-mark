import { prop, Ref, index } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { DailyReportClass } from "../../DailyReport/class";
import { DocumentSchema } from "../../Document/schema";
import { UserClass } from "../../User/class";

/**
 * A single timestamped journal entry on a daily report. Foremen post
 * these from the field throughout the day — short text, optional
 * photos, optionally flagged as an issue. Lives in its own collection
 * (not embedded on DailyReport) so entries are independently
 * indexable, fetchable, and subscribable without bloating the parent
 * document or fighting Mongo's 16MB cap.
 *
 * Indexed on (dailyReportId, createdAt) so the timeline query is a
 * fast range scan and entries come back in chronological order.
 */
@index({ dailyReportId: 1, createdAt: 1 })
@ObjectType()
export class DailyReportEntrySchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => ID)
  @prop({ ref: () => DailyReportClass, required: true })
  public dailyReportId!: Ref<DailyReportClass>;

  /** Plain-text body. Either this or documentIds must be non-empty. */
  @Field({ nullable: true })
  @prop({ trim: true })
  public text?: string;

  /**
   * References to Document records whose FileNode placement lives under
   * this daily report's scoped root (/daily-reports/<id>/). Photos in
   * the composer upload through the standard uploadDocument pipeline
   * and their resulting Document ids are recorded here. Order is
   * preserved so grids render in the order the foreman attached them.
   */
  @Field(() => [ID])
  @prop({ ref: () => DocumentSchema, default: [] })
  public documentIds!: Ref<DocumentSchema>[];

  @Field(() => ID, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public createdBy?: Ref<UserClass>;

  @Field()
  @prop({ required: true, default: false })
  public isIssue!: boolean;

  @Field()
  @prop({ required: true, default: () => new Date() })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: () => new Date() })
  public updatedAt!: Date;
}
