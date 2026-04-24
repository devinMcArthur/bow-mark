import {
  DailyReportClass,
  FileClass,
  ReportNoteClass,
  ReportNoteDocument,
} from "@models";
import { FieldResolver, Resolver, Root } from "type-graphql";

@Resolver(() => ReportNoteClass)
export default class ReportNoteResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => [FileClass])
  async files(@Root() reportNote: ReportNoteDocument) {
    return reportNote.getFiles();
  }

  @FieldResolver(() => DailyReportClass, { nullable: true })
  async dailyReport(@Root() reportNote: ReportNoteDocument) {
    return reportNote.getDailyReport();
  }

}
