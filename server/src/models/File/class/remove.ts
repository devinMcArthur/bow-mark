import { FileDocument, FileModel } from "@models";
import { removeFile } from "@utils/fileStorage";

const full = async (file: FileDocument) => {
  await removeFile(file._id.toString());

  await file.remove();

  return;
};

const all = async (File: FileModel) => {
  const files = await File.find({});

  files.forEach((file) => {
    file.fullRemove();
  });

  return;
};

export default {
  full,
  all,
};
