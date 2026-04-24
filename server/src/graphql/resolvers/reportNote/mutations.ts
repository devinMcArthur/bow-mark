import { File, ReportNote, ReportNoteDocument } from "@models";
import { Id } from "@typescript/models";

/** @deprecated Replaced by FileNode trash (`trashNode` mutation). No GraphQL surface still calls this; kept until the legacy `ReportNote.files[]` field is dropped. */
const removeFile = async (
  reportNoteId: Id,
  fileId: Id
): Promise<ReportNoteDocument> => {
  const reportNote = await ReportNote.getById(reportNoteId, {
    throwError: true,
  });
  if (!reportNote) throw new Error("Unable to find report note");

  const file = await File.getById(fileId, { throwError: true });
  if (!file) throw new Error("Unable to find file");

  await reportNote.removeFile(file);

  await file.fullRemove();

  await reportNote.save();

  return reportNote;
};

export default {
  removeFile,
};
