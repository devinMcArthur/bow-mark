import { File, ReportNote, ReportNoteDocument } from "@models";
import { Id } from "@typescript/models";

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
