import { JobsiteMaterial, JobsiteMaterialDocument } from "@models";
import _ids from "@testing/_ids";
import { JobsiteMaterialCostType } from "@typescript/jobsiteMaterial";

export interface SeededJobsiteMaterials {
  jobsite_2_material_1: JobsiteMaterialDocument;
  jobsite_2_material_2: JobsiteMaterialDocument;
  jobsite_3_material_1: JobsiteMaterialDocument;
}

const createJobsiteMaterials = async (): Promise<SeededJobsiteMaterials> => {
  const jobsite_2_material_1 = new JobsiteMaterial({
    _id: _ids.jobsiteMaterials.jobsite_2_material_1._id,
    material: _ids.materials.material_1._id,
    supplier: _ids.companies.company_1._id,
    quantity: 2000,
    unit: "tonnes",
    costType: JobsiteMaterialCostType.rate,
    rates: [
      {
        date: new Date(),
        rate: 10,
      },
    ],
  });

  const jobsite_2_material_2 = new JobsiteMaterial({
    _id: _ids.jobsiteMaterials.jobsite_2_material_2._id,
    material: _ids.materials.material_2._id,
    supplier: _ids.companies.company_1._id,
    quantity: 5000,
    unit: "tonnes",
    costType: JobsiteMaterialCostType.invoice,
    invoices: [
      _ids.invoices.jobsite_2_material_1_invoice_1._id,
      _ids.invoices.jobsite_2_material_1_invoice_2._id,
    ],
  });

  const jobsite_3_material_1 = new JobsiteMaterial({
    _id: _ids.jobsiteMaterials.jobsite_3_material_1._id,
    material: _ids.materials.material_1._id,
    supplier: _ids.companies.company_1._id,
    quantity: 1000,
    unit: "tonnes",
    costType: JobsiteMaterialCostType.rate,
    rates: [
      {
        date: new Date(),
        rate: 15,
      },
    ],
  });

  const jobsiteMaterials = {
    jobsite_2_material_1,
    jobsite_2_material_2,
    jobsite_3_material_1,
  };

  for (let i = 0; i < Object.values(jobsiteMaterials).length; i++) {
    await Object.values(jobsiteMaterials)[i].save();
  }

  return jobsiteMaterials;
};

export default createJobsiteMaterials;
