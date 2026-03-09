import { JobsiteDocument, JobsiteModel, System } from "@models";
import { IJobsiteCreate } from "@typescript/jobsite";

const document = async (
  Jobsite: JobsiteModel,
  jobsiteData: IJobsiteCreate
): Promise<JobsiteDocument> => {
  const { contract, ...data } = jobsiteData;

  const jobsite = new Jobsite({
    ...data,
  });

  if (contract) await jobsite.updateContract(contract);

  const system = await System.getSystem();
  await jobsite.setTruckingRatesToDefault(system);

  return jobsite;
};

export default {
  document,
};
