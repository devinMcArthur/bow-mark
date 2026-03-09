import { JobsiteMaterialDocument } from "@models";

const canRemove = async (jobsiteMaterial: JobsiteMaterialDocument) => {
  const materialShipments = await jobsiteMaterial.getMaterialShipments();

  if (materialShipments.length > 0) {
    return false;
  } else return true;
};

const ifPossible = async (jobsiteMaterial: JobsiteMaterialDocument) => {
  const canRemove = await jobsiteMaterial.canRemove();

  if (canRemove) {
    const jobsite = await jobsiteMaterial.getJobsite();

    const materialIndex = jobsite.materials.findIndex(
      (material) => material?.toString() === jobsiteMaterial._id.toString()
    );
    if (materialIndex !== -1) {
      jobsite.materials.splice(materialIndex, 1);

      await jobsite.save();
    }

    await jobsiteMaterial.remove();
  }
};

export default {
  canRemove,
  ifPossible,
};
