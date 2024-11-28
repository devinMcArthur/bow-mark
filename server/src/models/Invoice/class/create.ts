import { InvoiceDocument, InvoiceModel } from "@models";
import { IInvoiceCreate } from "@typescript/invoice";

const document = async (
  Invoice: InvoiceModel,
  data: IInvoiceCreate
): Promise<InvoiceDocument> => {
  const existingInvoice = await Invoice.getByCompanyAndNumber(
    data.company._id,
    data.invoiceNumber
  );
  if (existingInvoice) {
    const jobsiteMaterialParent = await existingInvoice.getJobsiteMaterial();
    if (jobsiteMaterialParent) {
      const jobsite = await jobsiteMaterialParent.getJobsite();
      const material = await jobsiteMaterialParent.getMaterial();
      throw new Error(`An Invoice with this company and invoice number already exists on the material '${material.name}' on the jobsite '${jobsite.name}'`);
    }

    const jobsiteParent = await existingInvoice.getJobsite();
    if (jobsiteParent) {
      throw new Error(`An Invoice with this company and invoice number already exists on the jobsite '${jobsiteParent.name}'`);
    }

    throw new Error(
      "An Invoice with this company and invoice number already exists"
    );
  }

  const invoice = new Invoice({
    company: data.company._id,
    invoiceNumber: data.invoiceNumber,
    cost: data.cost,
    date: data.date,
    description: data.description,
    internal: data.internal,
    accrual: data.accrual,
  });

  return invoice;
};

export default {
  document,
};
