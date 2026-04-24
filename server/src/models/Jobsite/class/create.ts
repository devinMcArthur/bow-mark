import { JobsiteDocument, JobsiteModel, System } from "@models";
import { IJobsiteCreate } from "@typescript/jobsite";
import { eventfulMutation } from "@lib/eventfulMutation";

const document = async (
  Jobsite: JobsiteModel,
  jobsiteData: IJobsiteCreate
): Promise<JobsiteDocument> => {
  const { contract, ...data } = jobsiteData;

  const createdId = await eventfulMutation(async (session) => {
    const jobsite = new Jobsite({
      ...data,
    });

    if (contract) await jobsite.updateContract(contract);

    const system = await System.getSystem();
    await jobsite.setTruckingRatesToDefault(system);

    await jobsite.save({ session });
    // Per-entity document folder is provisioned lazily when the first
    // file is uploaded — see the `ensureEntityRoot` mutation.

    return { result: jobsite._id, event: null };
  });

  // Re-fetch outside the transaction so caller can .save() without hitting
  // "Use of expired sessions is not permitted".
  const fresh = await Jobsite.findById(createdId);
  if (!fresh) {
    throw new Error("Jobsite.createDocument: document disappeared after create transaction");
  }
  return fresh;
};

export default {
  document,
};
