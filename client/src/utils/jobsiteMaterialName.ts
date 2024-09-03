import {
  JobsiteMaterialForDailyReportSnippetFragment,
  JobsiteMaterialCostType,
} from "../generated/graphql";

const jobsiteMaterialName = (
  jobsiteMaterial: JobsiteMaterialForDailyReportSnippetFragment
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
