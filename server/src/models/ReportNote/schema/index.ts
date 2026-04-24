import SchemaVersions from "@constants/SchemaVersions";
import { DailyReportClass, FileClass } from "@models";
import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";

/**
 * @deprecated The journal-entry side of daily reports moved to the
 * `DailyReportEntry` collection. Legacy ReportNote.note strings have
 * been mirrored into entries via `migrate-report-notes-to-entries.ts`
 * and ReportNote.files were ported to FileNodes by
 * `migrate-file-system/06-reportNotes.ts`. This collection is kept
 * read-only until JobsiteMonth/Year report aggregations + Excel/PDF
 * exports + the MCP operational tool stop reading it.
 */
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

  /**
   * @deprecated Files now live as Documents under
   * `/daily-reports/<id>/` in the FileNode tree (migrated by
   * `migrate-file-system/06-reportNotes.ts`). New uploads go through
   * `uploadDocument`; this array is no longer mutated.
   */
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
