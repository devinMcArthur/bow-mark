import { ReportNoteDocument, ReportNoteModel } from "@models";
import { IReportNoteCreate } from "@typescript/reportNote";

const document = async (
  ReportNote: ReportNoteModel,
  data: IReportNoteCreate
): Promise<ReportNoteDocument> => {
  const reportNote = new ReportNote({
    note: data.note,
  });

  await data.dailyReport.setReportNote(reportNote);

  return reportNote;
};

export default {
  document,
};
