import { JobsiteMaterialDocument } from "@models";

const requestUpdate = async (jobsiteMaterial: JobsiteMaterialDocument) => {
  const jobsite = await jobsiteMaterial.getJobsite();

  await jobsite.requestGenerateDayReports();

  return;
};

export default {
  requestUpdate,
};
