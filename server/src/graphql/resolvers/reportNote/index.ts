import { FileClass, ReportNoteClass, ReportNoteDocument } from "@models";
import {
  Arg,
  Authorized,
  FieldResolver,
  Mutation,
  Resolver,
  Root,
} from "type-graphql";
import mutations from "./mutations";

@Resolver(() => ReportNoteClass)
export default class ReportNoteResolver {
  /**
   * ----- Field Resolvers -----
   */

  @FieldResolver(() => [FileClass])
  async files(@Root() reportNote: ReportNoteDocument) {
    return reportNote.getFiles();
  }

  /**
   * ----- Mutations -----
   */

  @Authorized()
  @Mutation(() => ReportNoteClass)
  async reportNoteRemoveFile(
    @Arg("reportNoteId") id: string,
    @Arg("fileId") fileId: string
  ) {
    return mutations.removeFile(id, fileId);
  }
}
