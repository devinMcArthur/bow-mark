import {
  Company,
  CompanyDocument,
  InvoiceDocument,
  InvoiceModel,
  Jobsite,
  JobsiteDocument,
  JobsiteMaterial,
  JobsiteMaterialDocument,
} from "@models";
import { GetByIDOptions, Id } from "@typescript/models";
import populateOptions from "@utils/populateOptions";

/**
 * ----- Static Methods -----
 */

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  Invoice: InvoiceModel,
  id: Id,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<InvoiceDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const invoice = await Invoice.findById(id);

  if (!invoice && options.throwError) {
    throw new Error("Invoice.getById: unable to find invoice");
  }

  return invoice;
};

const byCompanyAndNumber = async (
  Invoice: InvoiceModel,
  companyId: Id,
  invoiceNumber: string
): Promise<InvoiceDocument | null> => {
  const invoice = await Invoice.findOne({
    company: companyId,
    invoiceNumber: invoiceNumber,
  });

  return invoice;
};

/**
 * ----- Methods -----
 */

const company = async (invoice: InvoiceDocument): Promise<CompanyDocument> => {
  if (!invoice.company) throw new Error("Invoice does not have a company");

  const company = await Company.getById(invoice.company.toString(), {
    throwError: true,
  });

  if (!company) throw new Error("Could not find invoice company");

  return company;
};

const jobsiteMaterial = async (
  invoice: InvoiceDocument
): Promise<JobsiteMaterialDocument | null> => {
  const jobsiteMaterial = await JobsiteMaterial.findOne({
    invoices: { $in: [invoice._id] },
  });

  return jobsiteMaterial;
};

const jobsite = async (
  invoice: InvoiceDocument
): Promise<JobsiteDocument | null> => {
  const jobsiteMaterial = await invoice.getJobsiteMaterial();

  if (jobsiteMaterial) {
    return jobsiteMaterial.getJobsite();
  } else {
    const jobsite = await Jobsite.findOne({
      $or: [
        { expenseInvoices: { $in: [invoice._id] } },
        { revenueInvoices: { $in: [invoice._id] } },
      ],
    });

    return jobsite;
  }
};

export default {
  byId,
  byCompanyAndNumber,
  company,
  jobsiteMaterial,
  jobsite,
};
