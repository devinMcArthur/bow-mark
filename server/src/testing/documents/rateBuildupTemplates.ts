import { RateBuildupTemplate, RateBuildupTemplateDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededRateBuildupTemplates {
  e2e_paving: RateBuildupTemplateDocument;
}

/**
 * E2E Paving Test template — designed to exercise every wire path the Playwright
 * E2E tests need to verify without duplicating the exhaustive math unit tests.
 *
 * Coverage (expected unit prices at defaults, qty 100):
 *
 *   Variant | Waste   | Material | Labour (amortised) | Waste | unitPrice
 *   --------|---------|----------|--------------------|-------|-----------
 *   m2      | off     | 14.40    | 50.00 (5000/100)   | 0     | 64.40
 *   m2      | on      | 14.40    | 50.00              | 1.50  | 65.90
 *   m2 (*)  | off     | 23.04    | 50.00              | 0     | 73.04  (depth 0.08)
 *   m3      | off     | 14.40    |  2.50 (5000/2000)  | 0     | 16.90  (converted qty)
 *
 * The m3 unit variant applies conversionFormula `quantity / depth_m`, so the
 * raw row quantity (100) becomes 2000 in the evaluation context.
 */
const createRateBuildupTemplates = async (): Promise<SeededRateBuildupTemplates> => {
  const pos = { x: 0, y: 0 };

  const e2e_paving = new RateBuildupTemplate({
    _id: _ids.rateBuildupTemplates.e2e_paving._id,
    label: "E2E Paving Test",
    defaultUnit: "m2",
    parameterDefs: [
      { id: "depth_m", label: "Depth (m)", defaultValue: 0.05, position: pos },
      { id: "price_per_t", label: "$/t", defaultValue: 120, position: pos },
      { id: "labour_lump", label: "Labour Lump $", defaultValue: 5000, position: pos },
      // Lives inside g_waste so the group has at least one user input and
      // therefore renders in the RateBuildupInputs panel. Also makes the
      // waste rate editable so tests can verify the formula picks it up.
      { id: "waste_rate", label: "Waste $/unit", defaultValue: 1.5, position: pos },
    ],
    tableDefs: [],
    formulaSteps: [
      {
        id: "mat_per_unit",
        label: "Material per unit",
        formula: "depth_m * 2.4 * price_per_t",
        position: pos,
      },
      {
        id: "lab_per_unit",
        label: "Labour per unit",
        formula: "labour_lump / quantity",
        position: pos,
      },
      {
        id: "waste_per_unit",
        label: "Waste per unit",
        formula: "waste_rate",
        position: pos,
      },
      {
        id: "mat_tons_total",
        label: "Material tons (row total)",
        formula: "quantity * depth_m * 2.4",
        position: pos,
      },
      {
        id: "crew_hours_total",
        label: "Crew hours (row total)",
        formula: "quantity * 0.02",
        position: pos,
      },
    ],
    breakdownDefs: [
      {
        id: "bd_material",
        label: "Material",
        items: [{ stepId: "mat_per_unit", label: "Material" }],
        position: pos,
      },
      {
        id: "bd_labour",
        label: "Labour",
        items: [{ stepId: "lab_per_unit", label: "Labour" }],
        position: pos,
      },
      {
        id: "bd_waste",
        label: "Waste",
        items: [{ stepId: "waste_per_unit", label: "Waste" }],
        position: pos,
      },
    ],
    outputDefs: [
      {
        id: "out_asphalt",
        kind: "Material",
        sourceStepId: "mat_tons_total",
        unit: "t",
        label: "Asphalt",
        allowedMaterialIds: [
          _ids.materials.material_1._id,
          _ids.materials.material_2._id,
        ],
        defaultMaterialId: _ids.materials.material_1._id,
        position: pos,
      },
      {
        id: "out_crew",
        kind: "CrewHours",
        sourceStepId: "crew_hours_total",
        unit: "hr",
        label: "Operator",
        allowedCrewKindIds: [
          _ids.crewKinds.e2e_operator._id,
          _ids.crewKinds.e2e_labour._id,
        ],
        defaultCrewKindId: _ids.crewKinds.e2e_operator._id,
        position: pos,
      },
    ],
    controllerDefs: [
      {
        id: "waste_toggle",
        label: "Include Waste",
        type: "toggle",
        defaultValue: 0,
        position: pos,
      },
    ],
    groupDefs: [
      {
        id: "g_waste",
        label: "Waste group",
        memberIds: ["waste_rate", "waste_per_unit"],
        activation: { controllerId: "waste_toggle", condition: "=== 1" },
        position: pos,
      },
    ],
    unitVariants: [
      { unit: "m2", activatesGroupId: "g_variant_m2" },
      { unit: "m3", activatesGroupId: "g_variant_m3", conversionFormula: "quantity / depth_m" },
    ],
    specialPositions: JSON.stringify({
      quantity: { x: 100, y: 200 },
      unitPrice: { x: 700, y: 200 },
    }),
  });

  // Add two empty groups so the unit variant lookup resolves — the evaluator
  // uses variant groups only to decide which branch is active via activeUnit,
  // and in this template neither branch has variant-specific formula steps,
  // so the groups just need to exist as valid references.
  (e2e_paving as any).groupDefs.push(
    { id: "g_variant_m2", label: "m2 variant", memberIds: [], position: pos },
    { id: "g_variant_m3", label: "m3 variant", memberIds: [], position: pos }
  );

  await e2e_paving.save();
  return { e2e_paving };
};

export default createRateBuildupTemplates;
