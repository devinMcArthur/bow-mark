import { SystemModel, SystemDocument } from "@models";

const system = async (System: SystemModel): Promise<SystemDocument> => {
  const system = (await System.find().limit(1).populate("specFiles.file"))[0];

  return system;
};

export default {
  system,
};
