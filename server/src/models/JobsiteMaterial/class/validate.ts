import { JobsiteMaterialDocument } from "@models";
import { JobsiteMaterialCostType } from "@typescript/jobsiteMaterial";

const document = async (jobsiteMaterial: JobsiteMaterialDocument) => {
  await jobsiteMaterial.validate();

  switch (jobsiteMaterial.costType) {
    case JobsiteMaterialCostType.deliveredRate: {
      if (
        !jobsiteMaterial.deliveredRates ||
        jobsiteMaterial.deliveredRates.length === 0
      )
        throw new Error("Must provide delivered rates");

      break;
    }
    case JobsiteMaterialCostType.rate: {
      if (!jobsiteMaterial.rates || jobsiteMaterial.rates.length === 0)
        throw new Error("Must provide rates");

      break;
    }
  }

  return;
};

export default {
  document,
};
