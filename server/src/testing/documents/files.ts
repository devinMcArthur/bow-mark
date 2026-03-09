import fs from "fs";
import { File, FileDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededFiles {
  jobsite_1_base_1_1_file_1: FileDocument;
  jobsite_1_file_1: FileDocument;
}

const createFiles = async (): Promise<SeededFiles> => {
  const jobsite_1_base_1_1_file_1 = await File.createDocument({
    description: "Concrete crew",
    mimetype: "image/jpeg",
    _id: _ids.files.jobsite_1_base_1_1_file_1._id,
    stream: fs.createReadStream("src/testing/assets/concrete.jpg"),
  });

  const jobsite_1_file_1 = await File.createDocument({
    description: "Do this",
    mimetype: "image/jpeg",
    _id: _ids.files.jobsite_1_file_1._id,
    stream: fs.createReadStream("src/testing/assets/concrete.jpg"),
  });

  const files = {
    jobsite_1_base_1_1_file_1,
    jobsite_1_file_1,
  };

  for (let i = 0; i < Object.values(files).length; i++) {
    await Object.values(files)[i].save();
  }

  return files;
};

export default createFiles;
