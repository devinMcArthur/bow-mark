import { SystemModel, SystemDocument } from "@models";

const system = async (System: SystemModel): Promise<SystemDocument> => {
  const system = (await System.find().limit(1))[0];

  return system;
};

export default {
  system,
};
