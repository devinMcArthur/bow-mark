import {
  InvoiceDocument,
  JobsiteMaterialDocument,
  MaterialShipment,
} from "@models";
import {
  IJobsiteMaterialUpdate,
  IRateScenarioData,
} from "@typescript/jobsiteMaterial";
import mongoose from "mongoose";

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
    _id: new mongoose.Types.ObjectId(),
    label: data.label,
    delivered: data.delivered,
    rates: data.rates as any,
  } as any);

  jobsiteMaterial.markModified("scenarios");

  await jobsiteMaterial.validateDocument();

  await jobsiteMaterial.requestReportUpdate();
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

  if (!data.rates || data.rates.length === 0)
    throw new Error("Must provide at least one rate for the scenario");

  scenario.label = data.label;
  scenario.delivered = data.delivered;
  scenario.rates = data.rates as any;

  // markModified required: direct array reassignment on a subdocument isn't
  // reliably detected as dirty by Mongoose 5's change tracking.
  jobsiteMaterial.markModified("scenarios");

  await jobsiteMaterial.validateDocument();

  await jobsiteMaterial.requestReportUpdate();
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

  // Block deletion if any MaterialShipment references this scenario —
  // removing it would silently drop those shipments from cost reports.
  const dependentShipment = await MaterialShipment.findOne({
    "vehicleObject.rateScenarioId": jobsiteMaterial.scenarios[index]._id,
    archivedAt: null,
  });
  if (dependentShipment) {
    throw new Error(
      "Cannot remove scenario: existing material shipments reference it. Archive or re-assign those shipments first."
    );
  }

  jobsiteMaterial.scenarios.splice(index, 1);
  jobsiteMaterial.markModified("scenarios");

  await jobsiteMaterial.validateDocument();

  await jobsiteMaterial.requestReportUpdate();
};

export default {
  document,
  addInvoice,
  addScenario,
  updateScenario,
  removeScenario,
};
