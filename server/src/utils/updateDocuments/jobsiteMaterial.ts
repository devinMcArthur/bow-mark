import { JobsiteMaterial } from "@models";
import { JobsiteMaterialCostType } from "@typescript/jobsiteMaterial";

const updateToV2 = async () => {
  const jobsiteMaterials = await JobsiteMaterial.find({
    schemaVersion: 1,
  });

  if (jobsiteMaterials.length > 0) {
    console.log(
      `Updating ${jobsiteMaterials.length} JobsiteMaterial document(s) to Schema Version 2...`
    );

    for (let i = 0; i < jobsiteMaterials.length; i++) {
      const jobsiteMaterial = jobsiteMaterials[i];

      if (jobsiteMaterial.delivered)
        jobsiteMaterial.costType = JobsiteMaterialCostType.deliveredRate;
      else jobsiteMaterial.costType = JobsiteMaterialCostType.rate;

      jobsiteMaterial.schemaVersion = 2;

      await jobsiteMaterial.save();
    }

    console.log(
      `...successfully updated ${jobsiteMaterials.length} JobsiteMaterial document(s) to Schema Version 2.`
    );
  }
};

const updateJobsiteMaterials = async () => {
  await updateToV2();
};

export default updateJobsiteMaterials;
