import { ReportNoteDocument, FileDocument } from "@models";

const file = async (reportNote: ReportNoteDocument, file: FileDocument) => {
  const index = reportNote.files.findIndex(
    (fileId) => fileId?.toString() === file._id.toString()
  );

  if (index !== -1) {
    reportNote.files.splice(index, 1);
  }

  return;
};

export default {
  file,
};
