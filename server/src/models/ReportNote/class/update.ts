import { FileDocument, ReportNoteDocument } from "@models";
import { IReportNoteUpdate } from "@typescript/reportNote";

const document = async (
  reportNote: ReportNoteDocument,
  data: IReportNoteUpdate
) => {
  reportNote.note = data.note;

  return;
};

const addFile = async (reportNote: ReportNoteDocument, file: FileDocument) => {
  reportNote.files.push(file._id);

  return;
};

export default {
  document,
  addFile,
};
