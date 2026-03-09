import { MaterialDocument, MaterialModel } from "@models";
import { IMaterialCreate } from "@typescript/material";

const document = async (
  Material: MaterialModel,
  data: IMaterialCreate
): Promise<MaterialDocument> => {
  const existingMaterial = await Material.getByName(data.name);
  if (existingMaterial) throw new Error("This material already exists");

  const material = new Material({
    ...data,
  });

  return material;
};

export default {
  document,
};
