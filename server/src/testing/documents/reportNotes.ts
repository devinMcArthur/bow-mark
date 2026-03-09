import { ReportNote, ReportNoteDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededReportNotes {
  jobsite_1_base_1_1_note_1: ReportNoteDocument;
}

const createReportNotes = async (): Promise<SeededReportNotes> => {
  const jobsite_1_base_1_1_note_1 = new ReportNote({
    _id: _ids.reportNotes.jobsite_1_base_1_1_note_1._id,
    note: "This is a note for the first day on Jobsite 1",
    files: [_ids.files.jobsite_1_base_1_1_file_1._id],
  });

  const reportNotes = {
    jobsite_1_base_1_1_note_1,
  };

  for (let i = 0; i < Object.values(reportNotes).length; i++) {
    await Object.values(reportNotes)[i].save();
  }

  return reportNotes;
};

export default createReportNotes;
