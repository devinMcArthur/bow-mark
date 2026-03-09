import { MaterialDocument } from "@models";
import { IMaterialUpdate } from "@typescript/material";

const document = (material: MaterialDocument, data: IMaterialUpdate) => {
  material.name = data.name;
};

const archive = async (material: MaterialDocument) => {
  if (!material.archivedAt) material.archivedAt = new Date();
};

export default {
  document,
  archive,
};
