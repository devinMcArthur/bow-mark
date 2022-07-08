import { FileDocument, FileModel } from "@models";
import { GetByIDOptions, Id } from "@typescript/models";
import { getFile } from "@utils/fileStorage";
import populateOptions from "@utils/populateOptions";

/**
 * ----- Static Methods -----
 */

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  File: FileModel,
  id: Id,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<FileDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const file = await File.findById(id);

  if (!file && options.throwError) {
    throw new Error("File.getById: unable to find file");
  }

  return file;
};

/**
 * ----- Methods -----
 */

const buffer = async (file: FileDocument): Promise<string> => {
  const retreivedFile = await getFile(file._id.toString());

  if (!retreivedFile || !retreivedFile.Body)
    throw new Error("unable to retreive file from storage");

  return `data:${file.mimetype};base64,${retreivedFile.Body.toString(
    "base64"
  )}`;
};

export default {
  byId,
  buffer,
};
