import { JobsiteMaterial, MaterialDocument } from "@models";

const canRemove = async (material: MaterialDocument): Promise<boolean> => {
  const jobsiteMaterials = await JobsiteMaterial.getByMaterial(material._id);

  if (jobsiteMaterials.length > 0) {
    return false;
  } else return true;
};

const ifPossible = async (material: MaterialDocument) => {
  const canRemove = await material.canRemove();

  if (canRemove) {
    await material.remove();
  }

  return;
};

export default {
  canRemove,
  ifPossible,
};
