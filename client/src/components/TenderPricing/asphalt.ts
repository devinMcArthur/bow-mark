// ─── Types ────────────────────────────────────────────────────────────────────

export interface AsphaltLabourEntry {
  id: string;
  name: string;
  qty: number;
  ratePerHour: number;
}

export interface AsphaltEquipmentEntry {
  id: string;
  name: string;
  qty: number;
  ratePerHour: number;
}

export interface AsphaltCalculatorInputs {
  depthMm: number;
  materialRate: number;    // $/tonne
  truckRate: number;       // $/hr
  roundTripMin: number;    // minutes
  productionRate: number;  // tonnes/hour
  labour: AsphaltLabourEntry[];
  equipment: AsphaltEquipmentEntry[];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_ASPHALT_LABOUR: AsphaltLabourEntry[] = [
  { id: "l1", name: "Foreman",    qty: 1, ratePerHour: 75   },
  { id: "l2", name: "Rakerman",   qty: 2, ratePerHour: 48.5 },
  { id: "l3", name: "Operator",   qty: 1, ratePerHour: 48.5 },
  { id: "l4", name: "Roller",     qty: 2, ratePerHour: 48.5 },
  { id: "l5", name: "Roller",     qty: 1, ratePerHour: 42.5 },
  { id: "l6", name: "Screed",     qty: 2, ratePerHour: 48.5 },
  { id: "l7", name: "Labourer",   qty: 1, ratePerHour: 36.5 },
];

export const DEFAULT_ASPHALT_EQUIPMENT: AsphaltEquipmentEntry[] = [
  { id: "e1", name: "Paver",          qty: 1, ratePerHour: 180  },
  { id: "e2", name: "Breakdown",      qty: 1, ratePerHour: 85   },
  { id: "e3", name: "Rubber",         qty: 1, ratePerHour: 85   },
  { id: "e4", name: "Bobcat",         qty: 1, ratePerHour: 55   },
  { id: "e5", name: "3/4 Ton",        qty: 1, ratePerHour: 12.5 },
  { id: "e6", name: "1 Ton",          qty: 1, ratePerHour: 15   },
  { id: "e7", name: "Water",          qty: 1, ratePerHour: 75   },
  { id: "e8", name: "Finish Roller",  qty: 1, ratePerHour: 85   },
  { id: "e9", name: "1/2 Ton",        qty: 1, ratePerHour: 12.5 },
];

export const DEFAULT_ASPHALT_INPUTS: AsphaltCalculatorInputs = {
  depthMm: 50,
  materialRate: 0,
  truckRate: 128,
  roundTripMin: 0,
  productionRate: 100,
  labour: DEFAULT_ASPHALT_LABOUR,
  equipment: DEFAULT_ASPHALT_EQUIPMENT,
};

// ─── Compute ──────────────────────────────────────────────────────────────────

export interface AsphaltComputedValues {
  tonnesPerM2: number;
  tonnes: number;
  materialPerM2: number;
  truckingPerT: number;
  truckingPerM2: number;
  labourRatePerHr: number;
  labourPerM2: number;
  equipmentRatePerHr: number;
  equipmentPerM2: number;
  unitPrice: number;
}

export function computeAsphalt(
  inputs: AsphaltCalculatorInputs,
  quantityM2: number
): AsphaltComputedValues {
  const tonnesPerM2 = inputs.depthMm * 0.00245;
  const tonnes = quantityM2 * tonnesPerM2;

  const materialPerM2 = inputs.materialRate * tonnesPerM2;

  const truckingPerT = (inputs.truckRate / 60) * inputs.roundTripMin / 13;
  const truckingPerM2 = truckingPerT * tonnesPerM2;

  const labourRatePerHr = inputs.labour.reduce(
    (sum, e) => sum + e.qty * e.ratePerHour, 0
  );
  const labourPerM2 =
    inputs.productionRate > 0
      ? (labourRatePerHr / inputs.productionRate) * tonnesPerM2
      : 0;

  const equipmentRatePerHr = inputs.equipment.reduce(
    (sum, e) => sum + e.qty * e.ratePerHour, 0
  );
  const equipmentPerM2 =
    inputs.productionRate > 0
      ? (equipmentRatePerHr / inputs.productionRate) * tonnesPerM2
      : 0;

  const unitPrice = materialPerM2 + truckingPerM2 + labourPerM2 + equipmentPerM2;

  return {
    tonnesPerM2,
    tonnes,
    materialPerM2,
    truckingPerT,
    truckingPerM2,
    labourRatePerHr,
    labourPerM2,
    equipmentRatePerHr,
    equipmentPerM2,
    unitPrice,
  };
}

export function parseCalculatorInputs(json: string | null | undefined): AsphaltCalculatorInputs {
  if (!json) return { ...DEFAULT_ASPHALT_INPUTS };
  try {
    return JSON.parse(json) as AsphaltCalculatorInputs;
  } catch {
    return { ...DEFAULT_ASPHALT_INPUTS };
  }
}
