export interface GravelLabourEntry {
  id: string;
  name: string;
  qty: number;
  ratePerHour: number;
}

export interface GravelEquipmentEntry {
  id: string;
  name: string;
  qty: number;
  ratePerHour: number;
}

export interface GravelCalculatorInputs {
  depthMm: number;
  materialRate: number;      // $/t from pit
  tandemRate: number;        // $/hr
  tandemRoundTripMin: number;
  pupRate: number;           // $/hr (Truck & Pup, 25t payload)
  pupRoundTripMin: number;
  productionRate: number;    // t/hr
  labour: GravelLabourEntry[];
  equipment: GravelEquipmentEntry[];
}

export const DEFAULT_GRAVEL_LABOUR: GravelLabourEntry[] = [
  { id: "gl1", name: "Foreman",  qty: 1, ratePerHour: 75   },
  { id: "gl2", name: "Operator", qty: 1, ratePerHour: 48.5 },
  { id: "gl3", name: "Grademan", qty: 1, ratePerHour: 46   },
  { id: "gl4", name: "Labourer", qty: 2, ratePerHour: 42.5 },
];

export const DEFAULT_GRAVEL_EQUIPMENT: GravelEquipmentEntry[] = [
  { id: "ge1", name: "140 G",     qty: 1,   ratePerHour: 130  },
  { id: "ge2", name: '85" Base',  qty: 1,   ratePerHour: 91   },
  { id: "ge3", name: "3/4 Ton",   qty: 1,   ratePerHour: 12.5 },
  { id: "ge4", name: "Hoe",       qty: 0,   ratePerHour: 115  },
  { id: "ge5", name: "Water",     qty: 1,   ratePerHour: 72.5 },
  { id: "ge6", name: "Bobcat",    qty: 0.5, ratePerHour: 55   },
  { id: "ge7", name: "Roller",    qty: 0.5, ratePerHour: 55   },
];

export const DEFAULT_GRAVEL_INPUTS: GravelCalculatorInputs = {
  depthMm: 150,
  materialRate: 0,
  tandemRate: 128,
  tandemRoundTripMin: 0,
  pupRate: 0,
  pupRoundTripMin: 0,
  productionRate: 100,
  labour: DEFAULT_GRAVEL_LABOUR,
  equipment: DEFAULT_GRAVEL_EQUIPMENT,
};

export interface GravelComputedValues {
  tonnesPerM2: number;
  tonnes: number;
  materialPerM2: number;
  tandemPerT: number;
  pupPerT: number;
  truckingPerT: number;
  truckingPerM2: number;
  labourRatePerHr: number;
  labourPerM2: number;
  equipmentRatePerHr: number;
  equipmentPerM2: number;
  unitPrice: number;
}

export function computeGravel(
  inputs: GravelCalculatorInputs,
  quantityM2: number
): GravelComputedValues {
  const tonnesPerM2 = inputs.depthMm * 0.0023;
  const tonnes = tonnesPerM2 * quantityM2;

  const materialPerM2 = inputs.materialRate * tonnesPerM2;

  const tandemPerT =
    inputs.tandemRate > 0 && inputs.tandemRoundTripMin > 0
      ? (inputs.tandemRate / 60) * inputs.tandemRoundTripMin / 13
      : 0;

  const pupPerT =
    inputs.pupRate > 0 && inputs.pupRoundTripMin > 0
      ? (inputs.pupRate / 60) * inputs.pupRoundTripMin / 25
      : 0;

  const truckingPerT = tandemPerT + pupPerT;
  const truckingPerM2 = truckingPerT * tonnesPerM2;

  const labourRatePerHr = inputs.labour.reduce(
    (sum, e) => sum + e.qty * e.ratePerHour,
    0
  );
  const equipmentRatePerHr = inputs.equipment.reduce(
    (sum, e) => sum + e.qty * e.ratePerHour,
    0
  );

  const labourPerM2 =
    inputs.productionRate > 0
      ? (labourRatePerHr / inputs.productionRate) * tonnesPerM2
      : 0;
  const equipmentPerM2 =
    inputs.productionRate > 0
      ? (equipmentRatePerHr / inputs.productionRate) * tonnesPerM2
      : 0;

  const unitPrice =
    materialPerM2 + truckingPerM2 + labourPerM2 + equipmentPerM2;

  return {
    tonnesPerM2,
    tonnes,
    materialPerM2,
    tandemPerT,
    pupPerT,
    truckingPerT,
    truckingPerM2,
    labourRatePerHr,
    labourPerM2,
    equipmentRatePerHr,
    equipmentPerM2,
    unitPrice,
  };
}

export function parseGravelInputs(json?: string | null): GravelCalculatorInputs {
  if (!json) return DEFAULT_GRAVEL_INPUTS;
  try {
    const parsed = JSON.parse(json);
    return {
      ...DEFAULT_GRAVEL_INPUTS,
      ...parsed,
      labour: Array.isArray(parsed.labour) ? parsed.labour : DEFAULT_GRAVEL_LABOUR,
      equipment: Array.isArray(parsed.equipment)
        ? parsed.equipment
        : DEFAULT_GRAVEL_EQUIPMENT,
    };
  } catch {
    return DEFAULT_GRAVEL_INPUTS;
  }
}
