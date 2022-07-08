import { InvoiceDocument, JobsiteMaterialDocument } from "@models";
import { IJobsiteMaterialUpdate } from "@typescript/jobsiteMaterial";

const document = async (
  jobsiteMaterial: JobsiteMaterialDocument,
  data: IJobsiteMaterialUpdate
) => {
  jobsiteMaterial.supplier = data.supplier._id;

  jobsiteMaterial.quantity = data.quantity;

  jobsiteMaterial.unit = data.unit;

  jobsiteMaterial.rates = data.rates;

  jobsiteMaterial.deliveredRates = data.deliveredRates;

  jobsiteMaterial.delivered = data.delivered;

  jobsiteMaterial.costType = data.costType;

  await jobsiteMaterial.validateDocument();

  return;
};

const addInvoice = async (
  jobsiteMaterial: JobsiteMaterialDocument,
  invoice: InvoiceDocument
) => {
  const existingIndex = jobsiteMaterial.invoices.findIndex(
    (inv) => inv?.toString() === invoice._id.toString()
  );

  if (existingIndex === -1) {
    jobsiteMaterial.invoices.push(invoice._id);
  }

  await jobsiteMaterial.requestReportUpdate();
};

export default {
  document,
  addInvoice,
};
