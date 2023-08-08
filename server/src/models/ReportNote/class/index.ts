import { FileDocument, ReportNoteDocument, ReportNoteModel } from "@models";
import { GetByIDOptions, Id } from "@typescript/models";
import { IReportNoteCreate, IReportNoteUpdate } from "@typescript/reportNote";
import { ObjectType } from "type-graphql";
import { ReportNoteSchema } from "..";
import create from "./create";
import get from "./get";
import remove from "./remove";
import update from "./update";

@ObjectType()
export class ReportNoteClass extends ReportNoteSchema {
  /**
   * ----- Get -----
   */

  public static async getById(
    this: ReportNoteModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public async getDailyReport(this: ReportNoteDocument) {
    return get.dailyReport(this);
  }

  public async getFiles(this: ReportNoteDocument) {
    return get.files(this);
  }

  /**
   * ----- Create -----
   */

  public static async createDocument(
    this: ReportNoteModel,
    data: IReportNoteCreate
  ) {
    return create.document(this, data);
  }

  /**
   * ----- Update -----
   */

  public async updateDocument(
    this: ReportNoteDocument,
    data: IReportNoteUpdate
  ) {
    return update.document(this, data);
  }

  public async addFile(this: ReportNoteDocument, file: FileDocument) {
    return update.addFile(this, file);
  }

  /**
   * ----- Remove -----
   */

  public async removeFile(this: ReportNoteDocument, file: FileDocument) {
    return remove.file(this, file);
  }
}
