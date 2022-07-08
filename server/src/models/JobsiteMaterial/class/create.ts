import { JobsiteMaterialDocument, JobsiteMaterialModel } from "@models";
import { IJobsiteMaterialCreate } from "@typescript/jobsiteMaterial";

const document = async (
  JobsiteMaterial: JobsiteMaterialModel,
  data: IJobsiteMaterialCreate
): Promise<JobsiteMaterialDocument> => {
  const jobsiteMaterial = new JobsiteMaterial({
    material: data.material._id,
    supplier: data.supplier._id,
    quantity: data.quantity,
    unit: data.unit,
    rates: data.rates,
    deliveredRates: data.deliveredRates,
    costType: data.costType,
    delivered: data.delivered,
  });

  await jobsiteMaterial.validateDocument();

  await data.jobsite.addMaterial(jobsiteMaterial);

  return jobsiteMaterial;
};

export default {
  document,
};
