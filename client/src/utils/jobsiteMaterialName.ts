import {
  JobsiteMaterialCardSnippetFragment,
  JobsiteMaterialCostType,
} from "../generated/graphql";

const jobsiteMaterialName = (
  jobsiteMaterial: JobsiteMaterialCardSnippetFragment
) => {
  let subText = "";
  if (jobsiteMaterial.costType === JobsiteMaterialCostType.DeliveredRate) {
    subText = " (Delivered)";
  } else if (
    jobsiteMaterial.costType === JobsiteMaterialCostType.Invoice &&
    jobsiteMaterial.delivered === true
  ) {
    subText = " (Delivered)";
  }

  return `${jobsiteMaterial.material.name} - ${jobsiteMaterial.supplier.name}${subText}`;
};

export default jobsiteMaterialName;
