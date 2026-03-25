import {
  JobsiteMaterialCostModel,
  JobsiteMaterialCostType,
  JobsiteMaterialForDailyReportSnippetFragment,
  MaterialShipmentCreateData,
  TruckingRateTypes,
  TruckingTypeRateSnippetFragment,
} from "../../../src/generated/graphql";

// ── Materials ──────────────────────────────────────────────────────────────

const baseMaterial: JobsiteMaterialForDailyReportSnippetFragment = {
  __typename: "JobsiteMaterialClass",
  _id: "mat-base",
  unit: "tonnes",
  costType: JobsiteMaterialCostType.Rate,
  costModel: null,
  delivered: false,
  deliveredRates: [],
  scenarios: null,
  material: { __typename: "MaterialClass", _id: "mat-1", name: "Gravel" },
  supplier: { __typename: "CompanyClass", _id: "sup-1", name: "Acme Quarry" },
};

/** Old-model material — no costModel set. */
export const legacyMaterial: JobsiteMaterialForDailyReportSnippetFragment = {
  ...baseMaterial,
  _id: "mat-legacy",
};

/** New invoice model — quantity only. */
export const invoiceMaterial: JobsiteMaterialForDailyReportSnippetFragment = {
  ...baseMaterial,
  _id: "mat-invoice",
  costModel: JobsiteMaterialCostModel.Invoice,
};

/** New rate model with a pickup and a delivered scenario. */
export const rateMaterial: JobsiteMaterialForDailyReportSnippetFragment = {
  ...baseMaterial,
  _id: "mat-rate",
  costModel: JobsiteMaterialCostModel.Rate,
  scenarios: [
    {
      __typename: "RateScenarioClass",
      _id: "s-pickup",
      label: "Pickup",
      delivered: false,
    },
    {
      __typename: "RateScenarioClass",
      _id: "s-tandem",
      label: "Tandem",
      delivered: true,
    },
  ],
};

// ── Trucking rates ─────────────────────────────────────────────────────────

/** Per-load trucking rate. */
export const quantityTruckingRate: TruckingTypeRateSnippetFragment = {
  __typename: "TruckingTypeRateClass",
  _id: "truck-qty",
  title: "Tandem",
  rates: [
    {
      __typename: "TruckingRateClass",
      rate: 32,
      date: "2024-01-01",
      type: TruckingRateTypes.Quantity,
    },
  ],
};

/** Hourly trucking rate — triggers start/end time fields. */
export const hourlyTruckingRate: TruckingTypeRateSnippetFragment = {
  __typename: "TruckingTypeRateClass",
  _id: "truck-hourly",
  title: "T&P Hourly",
  rates: [
    {
      __typename: "TruckingRateClass",
      rate: 95,
      date: "2024-01-01",
      type: TruckingRateTypes.Hour,
    },
  ],
};

// ── Form data factory ──────────────────────────────────────────────────────

export const makeFormData = (
  materialId: string,
  opts: { scenarioId?: string; truckingRateId?: string } = {}
): MaterialShipmentCreateData => ({
  shipments: [
    {
      jobsiteMaterialId: materialId,
      noJobsiteMaterial: false,
      quantity: 0,
      startTime: undefined,
      endTime: undefined,
    },
  ],
  vehicleObject: {
    source: "",
    vehicleType: "",
    vehicleCode: "",
    truckingRateId: opts.truckingRateId ?? quantityTruckingRate._id!,
    rateScenarioId: opts.scenarioId,
  },
});
