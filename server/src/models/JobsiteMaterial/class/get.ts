import {
  Company,
  CompanyDocument,
  DailyReport,
  Invoice,
  InvoiceDocument,
  Jobsite,
  JobsiteDocument,
  JobsiteMaterialDocument,
  JobsiteMaterialModel,
  Material,
  MaterialDocument,
  MaterialShipment,
  MaterialShipmentDocument,
} from "@models";
import { JobsiteMaterialCostType } from "@typescript/jobsiteMaterial";
import { GetByIDOptions, Id } from "@typescript/models";
import getRateForTime from "@utils/getRateForTime";
import populateOptions from "@utils/populateOptions";
import dayjs from "dayjs";

/**
 * ----- Static Methods -----
 */

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  JobsiteMaterial: JobsiteMaterialModel,
  id: Id,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<JobsiteMaterialDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const jobsiteMaterial = await JobsiteMaterial.findById(id);

  if (!jobsiteMaterial && options.throwError) {
    throw new Error("JobsiteMaterial.getById: unable to find jobsiteMaterial");
  }

  return jobsiteMaterial;
};

const byMaterial = async (
  JobsiteMaterial: JobsiteMaterialModel,
  materialId: Id
): Promise<JobsiteMaterialDocument[]> => {
  return await JobsiteMaterial.find({
    material: materialId,
  });
};

/**
 * ----- Methods -----
 */

const material = async (
  jobsiteMaterial: JobsiteMaterialDocument
): Promise<MaterialDocument> => {
  const material = await Material.getById(
    jobsiteMaterial.material?.toString() || "",
    { throwError: true }
  );

  if (!material) throw new Error("Could not find jobsite materials material");

  return material;
};

const supplier = async (
  jobsiteMaterial: JobsiteMaterialDocument
): Promise<CompanyDocument> => {
  const company = await Company.getById(
    jobsiteMaterial.supplier?.toString() || "",
    {
      throwError: true,
    }
  );

  if (!company) throw new Error("Could not find jobsite materials supplier");

  return company;
};

const jobsite = async (
  jobsiteMaterial: JobsiteMaterialDocument
): Promise<JobsiteDocument> => {
  const jobsite = await Jobsite.findOne({ materials: jobsiteMaterial._id });

  if (!jobsite) throw new Error("This material does not have a jobsite");

  return jobsite;
};

const materialShipments = async (
  jobsiteMaterial: JobsiteMaterialDocument
): Promise<MaterialShipmentDocument[]> => {
  return MaterialShipment.find({
    jobsiteMaterial: jobsiteMaterial._id,
    noJobsiteMaterial: false,
    archivedAt: null,
  });
};

const invoices = async (
  jobsiteMaterial: JobsiteMaterialDocument
): Promise<InvoiceDocument[]> => {
  return Invoice.find({
    _id: { $in: jobsiteMaterial.invoices },
  });
};

const completedQuantity = async (
  jobsiteMaterial: JobsiteMaterialDocument
): Promise<number> => {
  const materialShipments = await jobsiteMaterial.getMaterialShipments();

  let quantity = 0;
  for (let i = 0; i < materialShipments.length; i++) {
    quantity += materialShipments[i].quantity;
  }

  return quantity;
};

const rateForTime = async (
  jobsiteMaterial: JobsiteMaterialDocument,
  date: Date
): Promise<number> => {
  return getRateForTime(jobsiteMaterial.rates, date);
};

const invoiceMonthRate = async (
  jobsiteMaterial: JobsiteMaterialDocument,
  dayInMonth: Date
): Promise<number | undefined> => {
  if (jobsiteMaterial.costType !== JobsiteMaterialCostType.invoice)
    return undefined;

  if (!jobsiteMaterial.invoices || jobsiteMaterial.invoices.length === 0)
    return 0;

  const monthsDailyReports = await DailyReport.find({
    date: {
      $gte: dayjs(dayInMonth).startOf("month").toDate(),
      $lt: dayjs(dayInMonth).endOf("month").toDate(),
    },
  });

  let quantity = 0;
  for (let i = 0; i < monthsDailyReports.length; i++) {
    const reportShipments = await monthsDailyReports[i].getMaterialShipments();

    for (let j = 0; j < reportShipments.length; j++) {
      if (
        reportShipments[j].noJobsiteMaterial === false &&
        reportShipments[j].jobsiteMaterial?.toString() ===
          jobsiteMaterial._id.toString()
      ) {
        quantity += reportShipments[j].quantity;
      }
    }
  }

  let cost = 0;
  const invoices = (await jobsiteMaterial.getInvoices()).filter((invoice) =>
    dayjs(invoice.date).isSame(dayInMonth, "month")
  );
  for (let i = 0; i < invoices.length; i++) {
    cost += invoices[i].cost;
  }

  if (quantity === 0) return 0;

  return cost / quantity;
};

export default {
  byId,
  byMaterial,
  material,
  supplier,
  jobsite,
  materialShipments,
  completedQuantity,
  rateForTime,
  invoices,
  invoiceMonthRate,
};
