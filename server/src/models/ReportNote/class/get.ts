import {
    DailyReport,
    DailyReportDocument,
  File,
  FileDocument,
  ReportNoteDocument,
  ReportNoteModel,
} from "@models";
import { GetByIDOptions, Id } from "@typescript/models";
import populateOptions from "@utils/populateOptions";

/**
 * ----- Static Methods -----
 */

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  ReportNote: ReportNoteModel,
  id: Id,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<ReportNoteDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const reportNote = await ReportNote.findById(id);

  if (!reportNote && options.throwError) {
    throw new Error("ReportNote.getById: unable to find report note");
  }

  return reportNote;
};

/**
 * ----- Methods -----
 */

const files = async (
  reportNote: ReportNoteDocument
): Promise<FileDocument[]> => {
  const files = await File.find({
    _id: { $in: reportNote.files },
  });

  return files;
};

const dailyReport = async (
  reportNote: ReportNoteDocument
): Promise<DailyReportDocument | null> => {
  return DailyReport.findOne({
    reportNote: reportNote._id
  });
};

export default {
  byId,
  dailyReport,
  files,
};
