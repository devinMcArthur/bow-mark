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
import {
  JobsiteMaterialCostType,
  YearlyQuantity,
} from "@typescript/jobsiteMaterial";
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

const byCompany = async (
  JobsiteMaterial: JobsiteMaterialModel,
  companyId: Id
): Promise<JobsiteMaterialDocument[]> => {
  return JobsiteMaterial.find({
    supplier: companyId,
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
): Promise<YearlyQuantity> => {
  const materialShipments = await jobsiteMaterial.getMaterialShipments();
  if (materialShipments.length === 0) return {};

  // Batch the daily-report date lookups into one query instead of one
  // per shipment. Each material shipment only needs the parent report's
  // year to bucket the quantity, so we project just `_id` + `date`.
  // Jobsite pages often render 15+ materials concurrently, so the
  // serial per-shipment roundtrip used to fan out to 100s of tiny
  // queries on page load.
  const dailyReportIds = Array.from(
    new Set(
      materialShipments
        .map((s) => s.dailyReport?.toString())
        .filter((id): id is string => !!id)
    )
  );
  const dailyReports = await DailyReport.find(
    { _id: { $in: dailyReportIds } },
    { date: 1 }
  ).lean();
  const dateById = new Map<string, Date>(
    dailyReports.map((r) => [r._id.toString(), r.date])
  );

  const quantityPerYear: YearlyQuantity = {};
  for (const shipment of materialShipments) {
    const date = shipment.dailyReport
      ? dateById.get(shipment.dailyReport.toString())
      : undefined;
    if (!date) continue;
    const year = new Date(date).getFullYear();
    quantityPerYear[year] = (quantityPerYear[year] ?? 0) + shipment.quantity;
  }

  return quantityPerYear;
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

  const monthsDailyReports = await DailyReport.find(
    {
      date: {
        $gte: dayjs(dayInMonth).startOf("month").toDate(),
        $lt: dayjs(dayInMonth).endOf("month").toDate(),
      },
    },
    { materialShipment: 1 }
  ).lean();

  // Collect every shipment id referenced by the month's daily reports
  // and resolve the quantity total in a single MaterialShipment query,
  // scoped to this jobsiteMaterial. Prior loop issued one shipment
  // query per daily report — with a full month of reports that added up
  // on large jobsites during end-of-month report builds.
  const shipmentIds = monthsDailyReports.flatMap(
    (r) => r.materialShipment ?? []
  );
  let quantity = 0;
  if (shipmentIds.length > 0) {
    const shipments = await MaterialShipment.find(
      {
        _id: { $in: shipmentIds },
        jobsiteMaterial: jobsiteMaterial._id,
        noJobsiteMaterial: false,
        archivedAt: null,
      },
      { quantity: 1 }
    ).lean();
    for (const s of shipments) quantity += s.quantity;
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
  byCompany,
  material,
  supplier,
  jobsite,
  materialShipments,
  completedQuantity,
  rateForTime,
  invoices,
  invoiceMonthRate,
};
