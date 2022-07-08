import { Jobsite, JobsiteDocument } from "@models";
import _ids from "@testing/_ids";
import { TruckingRateTypes } from "@typescript/jobsite";

export interface SeededJobsites {
  jobsite_1: JobsiteDocument;
  jobsite_2: JobsiteDocument;
  jobsite_3: JobsiteDocument;
}

const createJobsites = async (): Promise<SeededJobsites> => {
  const jobsite_1 = new Jobsite({
    _id: _ids.jobsites.jobsite_1._id,
    name: "Jobsite 1",
    location_url: "https://goo.gl/maps/cG7UFkMup7siY89F6",
    description: "First Job",
    jobcode: "2022-1",
    active: true,
    crews: [_ids.crews.base_1._id],
    schemaVersion: 1,
    fileObjects: [
      {
        file: _ids.files.jobsite_1_file_1._id,
      },
    ],
  });

  const jobsite_2 = new Jobsite({
    _id: _ids.jobsites.jobsite_2._id,
    name: "Jobsite 2",
    description: "Second Job - v2",
    jobcode: "2022-2",
    active: true,
    materials: [
      _ids.jobsiteMaterials.jobsite_2_material_1._id,
      _ids.jobsiteMaterials.jobsite_2_material_2._id,
    ],
    crews: [_ids.crews.base_1._id],
    truckingRates: [
      {
        _id: _ids.jobsites.jobsite_2.truckingRates[0],
        title: "Tandem",
        rates: [
          {
            date: new Date(),
            rate: 120,
            type: TruckingRateTypes.Hour,
          },
        ],
      },
    ],
  });

  const jobsite_3 = new Jobsite({
    _id: _ids.jobsites.jobsite_3._id,
    name: "Jobsite 3",
    description: "Third Job - v2",
    jobcode: "2022-3",
    active: true,
    materials: [_ids.jobsiteMaterials.jobsite_3_material_1._id],
    crews: [_ids.crews.base_1._id],
    revenueInvoices: [_ids.invoices.jobsite_3_invoice_1._id],
    expenseInvoices: [_ids.invoices.jobsite_3_invoice_2._id],
  });

  const jobsites = {
    jobsite_1,
    jobsite_2,
    jobsite_3,
  };

  for (let i = 0; i < Object.values(jobsites).length; i++) {
    await Object.values(jobsites)[i].save();
  }

  return jobsites;
};

export default createJobsites;
