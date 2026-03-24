import { InvoiceDocument, JobsiteMaterialDocument } from "@models";
import {
  IJobsiteMaterialUpdate,
  IRateScenarioData,
} from "@typescript/jobsiteMaterial";
import { Types } from "mongoose";

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

  if (data.costModel !== undefined) {
    jobsiteMaterial.costModel = data.costModel;
  }

  if (data.scenarios !== undefined) {
    jobsiteMaterial.scenarios = data.scenarios as any;
  }

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

const addScenario = async (
  jobsiteMaterial: JobsiteMaterialDocument,
  data: IRateScenarioData
) => {
  if (!jobsiteMaterial.scenarios) {
    jobsiteMaterial.scenarios = [] as any;
  }

  jobsiteMaterial.scenarios!.push({
    _id: new Types.ObjectId(),
    label: data.label,
    delivered: data.delivered,
    rates: data.rates as any,
  } as any);

  await jobsiteMaterial.validateDocument();
};

const updateScenario = async (
  jobsiteMaterial: JobsiteMaterialDocument,
  scenarioId: string,
  data: IRateScenarioData
) => {
  const scenario = jobsiteMaterial.scenarios?.find(
    (s) => s._id.toString() === scenarioId
  );

  if (!scenario) throw new Error("Scenario not found");

  scenario.label = data.label;
  scenario.delivered = data.delivered;
  scenario.rates = data.rates as any;

  await jobsiteMaterial.validateDocument();
};

const removeScenario = async (
  jobsiteMaterial: JobsiteMaterialDocument,
  scenarioId: string
) => {
  if (!jobsiteMaterial.scenarios) return;

  const index = jobsiteMaterial.scenarios.findIndex(
    (s) => s._id.toString() === scenarioId
  );

  if (index === -1) throw new Error("Scenario not found");

  jobsiteMaterial.scenarios.splice(index, 1);

  await jobsiteMaterial.validateDocument();
};

export default {
  document,
  addInvoice,
  addScenario,
  updateScenario,
  removeScenario,
};
