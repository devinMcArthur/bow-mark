import {
  Tender,
  TenderDocument,
  TenderPricingSheet,
  TenderPricingSheetDocument,
} from "@models";
import _ids from "@testing/_ids";
import { TenderPricingRowType } from "@typescript/tenderPricingSheet";

export interface SeededTenderPricing {
  tender: TenderDocument;
  sheet: TenderPricingSheetDocument;
}

/**
 * Seed one tender + pricing sheet + one Item row with a RateBuildupSnapshot
 * already attached. The snapshot mirrors the E2E Paving Test template seeded
 * in rateBuildupTemplates.ts and starts with defaults (depth 0.05, waste off,
 * unit m2). The row's unitPrice is pre-computed using the same math as
 * evaluateSnapshot so the initial page load shows a sensible number without
 * requiring a client-side recompute.
 */
const createTenderPricing = async (): Promise<SeededTenderPricing> => {
  const pos = { x: 0, y: 0 };

  const tender = new Tender({
    _id: _ids.tenders.e2e_pricing._id,
    name: "E2E Pricing Tender",
    jobcode: "E2E-PRICE-001",
    status: "bidding",
    files: [],
    notes: [],
    createdBy: _ids.users.admin_user._id,
  });
  await tender.save();

  // Build the snapshot as a JSON string — same shape as CanvasDocument + the
  // snapshot-specific params/tables/controllers/outputs fields. Must match the
  // template in rateBuildupTemplates.ts for evaluateSnapshot to produce the
  // expected numbers documented there.
  const snapshot = {
    id: _ids.rateBuildupTemplates.e2e_paving._id.toString(),
    sourceTemplateId: _ids.rateBuildupTemplates.e2e_paving._id.toString(),
    label: "E2E Paving Test",
    defaultUnit: "m2",
    parameterDefs: [
      { id: "depth_m", label: "Depth (m)", defaultValue: 0.05, position: pos },
      { id: "price_per_t", label: "$/t", defaultValue: 120, position: pos },
      { id: "labour_lump", label: "Labour Lump $", defaultValue: 5000, position: pos },
    ],
    tableDefs: [],
    formulaSteps: [
      { id: "mat_per_unit", label: "Material per unit", formula: "depth_m * 2.4 * price_per_t", position: pos },
      { id: "lab_per_unit", label: "Labour per unit", formula: "labour_lump / quantity", position: pos },
      { id: "waste_per_unit", label: "Waste per unit", formula: "1.5", position: pos },
      { id: "mat_tons_total", label: "Material tons (row total)", formula: "quantity * depth_m * 2.4", position: pos },
      { id: "crew_hours_total", label: "Crew hours (row total)", formula: "quantity * 0.02", position: pos },
    ],
    breakdownDefs: [
      { id: "bd_material", label: "Material", items: [{ stepId: "mat_per_unit", label: "Material" }], position: pos },
      { id: "bd_labour", label: "Labour", items: [{ stepId: "lab_per_unit", label: "Labour" }], position: pos },
      { id: "bd_waste", label: "Waste", items: [{ stepId: "waste_per_unit", label: "Waste" }], position: pos },
    ],
    outputDefs: [
      {
        id: "out_asphalt",
        kind: "Material",
        sourceStepId: "mat_tons_total",
        unit: "t",
        label: "Asphalt",
        allowedMaterialIds: [
          _ids.materials.material_1._id.toString(),
          _ids.materials.material_2._id.toString(),
        ],
        defaultMaterialId: _ids.materials.material_1._id.toString(),
        position: pos,
      },
      {
        id: "out_crew",
        kind: "CrewHours",
        sourceStepId: "crew_hours_total",
        unit: "hr",
        label: "Operator",
        allowedCrewKindIds: [
          _ids.crewKinds.e2e_operator._id.toString(),
          _ids.crewKinds.e2e_labour._id.toString(),
        ],
        defaultCrewKindId: _ids.crewKinds.e2e_operator._id.toString(),
        position: pos,
      },
    ],
    controllerDefs: [
      { id: "waste_toggle", label: "Include Waste", type: "toggle", defaultValue: 0, position: pos },
    ],
    groupDefs: [
      {
        id: "g_waste",
        label: "Waste group",
        memberIds: ["waste_per_unit"],
        activation: { controllerId: "waste_toggle", condition: "=== 1" },
        position: pos,
      },
      { id: "g_variant_m2", label: "m2 variant", memberIds: [], position: pos },
      { id: "g_variant_m3", label: "m3 variant", memberIds: [], position: pos },
    ],
    unitVariants: [
      { unit: "m2", activatesGroupId: "g_variant_m2" },
      { unit: "m3", activatesGroupId: "g_variant_m3", conversionFormula: "quantity / depth_m" },
    ],
    specialPositions: {
      quantity: { x: 100, y: 200 },
      unitPrice: { x: 700, y: 200 },
    },
    // Snapshot-specific fields
    params: { depth_m: 0.05, price_per_t: 120, labour_lump: 5000 },
    tables: {},
    controllers: { waste_toggle: false },
    outputs: {
      out_asphalt: { materialId: _ids.materials.material_1._id.toString() },
      out_crew: { crewKindId: _ids.crewKinds.e2e_operator._id.toString() },
    },
  };

  // Pre-computed unit price for defaults, qty 100, unit m2, waste off:
  //   mat_per_unit  = 0.05 * 2.4 * 120        = 14.4
  //   lab_per_unit  = 5000 / 100              = 50
  //   waste_per_unit = 0 (group inactive)
  //   unitPrice     = 64.4
  const initialUnitPrice = 64.4;
  const initialOutputs = [
    {
      kind: "Material",
      materialId: _ids.materials.material_1._id,
      unit: "t",
      // mat_tons_total = 100 * 0.05 * 2.4 = 12
      perUnitValue: 12,
      totalValue: 12,
    },
    {
      kind: "CrewHours",
      crewKindId: _ids.crewKinds.e2e_operator._id,
      unit: "hr",
      // crew_hours_total = 100 * 0.02 = 2
      perUnitValue: 2,
      totalValue: 2,
    },
  ];

  const sheet = new TenderPricingSheet({
    _id: _ids.tenders.e2e_pricing.sheetId,
    tender: tender._id,
    defaultMarkupPct: 15,
    rows: [
      {
        _id: _ids.tenders.e2e_pricing.rowId,
        type: TenderPricingRowType.Item,
        sortOrder: 0,
        itemNumber: "1",
        description: "E2E Paving Row",
        indentLevel: 0,
        quantity: 100,
        unit: "m2",
        unitPrice: initialUnitPrice,
        rateBuildupSnapshot: JSON.stringify(snapshot),
        rateBuildupOutputs: initialOutputs,
        docRefs: [],
        status: "not_started",
      },
    ],
  });
  await sheet.save();

  // Link the sheet back to the tender for downstream queries that use the ref.
  tender.pricingSheet = sheet._id as any;
  await tender.save();

  return { tender, sheet };
};

export default createTenderPricing;
