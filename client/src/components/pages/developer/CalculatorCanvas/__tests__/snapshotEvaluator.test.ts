// client/src/components/pages/developer/CalculatorCanvas/__tests__/snapshotEvaluator.test.ts
import { describe, it, expect } from "vitest";
import {
  evaluateSnapshot,
  computeSnapshotUnitPrice,
  snapshotFromTemplate,
  snapshotToCanvasDoc,
  RateBuildupSnapshot,
} from "../snapshotEvaluator";
import type { CanvasDocument } from "../canvasTypes";
import { RateBuildupOutputKind } from "../../../../../generated/graphql";

const pos = { x: 0, y: 0 };
const specialPositions = { quantity: pos, unitPrice: pos };

function doc(overrides: Partial<CanvasDocument> = {}): CanvasDocument {
  return {
    id: "tmpl_1",
    label: "Test Template",
    defaultUnit: "m2",
    parameterDefs: [],
    tableDefs: [],
    formulaSteps: [],
    breakdownDefs: [],
    outputDefs: [],
    specialPositions,
    groupDefs: [],
    controllerDefs: [],
    ...overrides,
  };
}

function snap(
  template: CanvasDocument,
  overrides: Partial<RateBuildupSnapshot> = {}
): RateBuildupSnapshot {
  return { ...snapshotFromTemplate(template), ...overrides };
}

// ─── Basic evaluation ─────────────────────────────────────────────────────────

describe("evaluateSnapshot — basic evaluation", () => {
  it("computes unitPrice from a simple formula (quantity * rate)", () => {
    const template = doc({
      parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 20, position: pos }],
      formulaSteps: [{ id: "cost", formula: "quantity * rate", position: pos }],
      breakdownDefs: [
        {
          id: "bd1",
          label: "Total",
          items: [{ stepId: "cost", label: "Cost" }],
          position: pos,
        },
      ],
    });
    const s = snap(template);
    const { unitPrice } = evaluateSnapshot(s, 5);
    // quantity=5, rate=20 → cost=100
    expect(unitPrice).toBe(100);
  });

  it("uses overridden param values from the snapshot (not template defaults)", () => {
    const template = doc({
      parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 100, position: pos }],
      formulaSteps: [{ id: "cost", formula: "quantity * rate", position: pos }],
      breakdownDefs: [
        {
          id: "bd1",
          label: "Total",
          items: [{ stepId: "cost", label: "Cost" }],
          position: pos,
        },
      ],
    });
    // Override rate to 30 (not the default 100)
    const s = snap(template, { params: { rate: 30 } });
    const { unitPrice } = evaluateSnapshot(s, 4);
    // quantity=4, rate=30 → cost=120
    expect(unitPrice).toBe(120);
  });

  it("rounds unitPrice to 4 decimal places", () => {
    const template = doc({
      parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 3, position: pos }],
      formulaSteps: [{ id: "cost", formula: "quantity * rate", position: pos }],
      breakdownDefs: [
        {
          id: "bd1",
          label: "Total",
          items: [{ stepId: "cost", label: "Cost" }],
          position: pos,
        },
      ],
    });
    const s = snap(template);
    // quantity=1, rate=3 → cost = 3; use 1/3 rate for rounding test
    const s2 = snap(template, { params: { rate: 1 / 3 } });
    const { unitPrice } = evaluateSnapshot(s2, 1);
    // 1/3 ≈ 0.3333333... → rounded to 4dp = 0.3333
    expect(unitPrice).toBe(parseFloat((1 / 3).toFixed(4)));
    expect(String(unitPrice).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(4);
  });
});

// ─── Unit variants ────────────────────────────────────────────────────────────

describe("evaluateSnapshot — unit variants", () => {
  it("applies conversion formula when unit matches a variant (m3 → m2 via quantity / depth_m)", () => {
    // Template native unit is m2; a m3 variant converts via quantity / depth_m
    const groupId = "grp_m3";
    const template = doc({
      parameterDefs: [
        { id: "depth_m", label: "Depth (m)", defaultValue: 0.1, position: pos },
        { id: "rate", label: "Rate", defaultValue: 50, position: pos },
      ],
      formulaSteps: [{ id: "cost", formula: "quantity * rate", position: pos }],
      breakdownDefs: [
        {
          id: "bd1",
          label: "Total",
          items: [{ stepId: "cost", label: "Cost" }],
          position: pos,
        },
      ],
      groupDefs: [
        { id: groupId, label: "m3 group", memberIds: [], position: pos },
      ],
      unitVariants: [
        {
          unit: "m3",
          activatesGroupId: groupId,
          conversionFormula: "quantity / depth_m",
        },
      ],
    });
    const s = snap(template);
    // rawQuantity=2 m3, depth_m=0.1 → converted quantity = 2 / 0.1 = 20 m2
    // cost = 20 * 50 = 1000
    const { unitPrice } = evaluateSnapshot(s, 2, "m3");
    expect(unitPrice).toBe(1000);
  });

  it("uses raw quantity when unit has no matching variant", () => {
    const template = doc({
      parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 10, position: pos }],
      formulaSteps: [{ id: "cost", formula: "quantity * rate", position: pos }],
      breakdownDefs: [
        {
          id: "bd1",
          label: "Total",
          items: [{ stepId: "cost", label: "Cost" }],
          position: pos,
        },
      ],
      unitVariants: [
        {
          unit: "m3",
          activatesGroupId: "grp_m3",
          conversionFormula: "quantity / 0.1",
        },
      ],
    });
    const s = snap(template);
    // unit="m2" has no variant → raw quantity 7 is used directly
    const { unitPrice } = evaluateSnapshot(s, 7, "m2");
    expect(unitPrice).toBe(70);
  });

  it("falls back to raw quantity when conversion formula is invalid (returns null)", () => {
    const groupId = "grp_m3";
    const template = doc({
      parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 5, position: pos }],
      formulaSteps: [{ id: "cost", formula: "quantity * rate", position: pos }],
      breakdownDefs: [
        {
          id: "bd1",
          label: "Total",
          items: [{ stepId: "cost", label: "Cost" }],
          position: pos,
        },
      ],
      groupDefs: [
        { id: groupId, label: "m3 group", memberIds: [], position: pos },
      ],
      unitVariants: [
        {
          unit: "m3",
          activatesGroupId: groupId,
          conversionFormula: "((( broken formula !!!",
        },
      ],
    });
    const s = snap(template);
    // Invalid formula → null → fall back to rawQuantity=3
    // cost = 3 * 5 = 15
    const { unitPrice } = evaluateSnapshot(s, 3, "m3");
    expect(unitPrice).toBe(15);
  });

  it("falls back to raw quantity when conversion formula returns non-positive value", () => {
    const groupId = "grp_m3";
    const template = doc({
      parameterDefs: [
        { id: "rate", label: "Rate", defaultValue: 5, position: pos },
      ],
      formulaSteps: [{ id: "cost", formula: "quantity * rate", position: pos }],
      breakdownDefs: [
        {
          id: "bd1",
          label: "Total",
          items: [{ stepId: "cost", label: "Cost" }],
          position: pos,
        },
      ],
      groupDefs: [
        { id: groupId, label: "m3 group", memberIds: [], position: pos },
      ],
      unitVariants: [
        {
          unit: "m3",
          activatesGroupId: groupId,
          conversionFormula: "quantity - 10", // rawQuantity=3 → 3 - 10 = -7 (non-positive)
        },
      ],
    });
    const s = snap(template);
    // -7 is non-positive → fall back to rawQuantity=3; cost = 3 * 5 = 15
    const { unitPrice } = evaluateSnapshot(s, 3, "m3");
    expect(unitPrice).toBe(15);
  });
});

// ─── Controllers ──────────────────────────────────────────────────────────────

describe("evaluateSnapshot — controllers", () => {
  it("converts boolean controller true to 1 in formula context", () => {
    const template = doc({
      parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 100, position: pos }],
      formulaSteps: [{ id: "cost", formula: "quantity * rate * toggle_ctrl", position: pos }],
      breakdownDefs: [
        {
          id: "bd1",
          label: "Total",
          items: [{ stepId: "cost", label: "Cost" }],
          position: pos,
        },
      ],
      controllerDefs: [
        {
          id: "toggle_ctrl",
          label: "Enable extra",
          type: "toggle",
          defaultValue: false,
          position: pos,
        },
      ],
    });
    // Override controller to true → 1 in formula
    const s = snap(template, { controllers: { toggle_ctrl: true } });
    // cost = 2 * 100 * 1 = 200
    const { unitPrice } = evaluateSnapshot(s, 2);
    expect(unitPrice).toBe(200);
  });

  it("converts boolean controller false to 0 in formula context", () => {
    const template = doc({
      parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 100, position: pos }],
      formulaSteps: [{ id: "cost", formula: "quantity * rate * toggle_ctrl", position: pos }],
      breakdownDefs: [
        {
          id: "bd1",
          label: "Total",
          items: [{ stepId: "cost", label: "Cost" }],
          position: pos,
        },
      ],
      controllerDefs: [
        {
          id: "toggle_ctrl",
          label: "Enable extra",
          type: "toggle",
          defaultValue: true,
          position: pos,
        },
      ],
    });
    // Override controller to false → 0 in formula
    const s = snap(template, { controllers: { toggle_ctrl: false } });
    // cost = 2 * 100 * 0 = 0
    const { unitPrice } = evaluateSnapshot(s, 2);
    expect(unitPrice).toBe(0);
  });

  it("passes numeric controller values through directly", () => {
    const template = doc({
      parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 50, position: pos }],
      formulaSteps: [{ id: "cost", formula: "quantity * rate * markup", position: pos }],
      breakdownDefs: [
        {
          id: "bd1",
          label: "Total",
          items: [{ stepId: "cost", label: "Cost" }],
          position: pos,
        },
      ],
      controllerDefs: [
        {
          id: "markup",
          label: "Markup",
          type: "percentage",
          defaultValue: 1,
          position: pos,
        },
      ],
    });
    // Numeric controller: 1.15 (15% markup)
    const s = snap(template, { controllers: { markup: 1.15 } });
    // cost = 2 * 50 * 1.15 = 115
    const { unitPrice } = evaluateSnapshot(s, 2);
    expect(unitPrice).toBeCloseTo(115);
  });
});

// ─── Output resolution ────────────────────────────────────────────────────────

describe("evaluateSnapshot — output resolution", () => {
  it("resolves Material output with estimator pick overriding template default", () => {
    const template = doc({
      parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 10, position: pos }],
      formulaSteps: [{ id: "asphalt_t", formula: "quantity * 2.4", position: pos }],
      breakdownDefs: [],
      outputDefs: [
        {
          id: "out_asphalt",
          kind: RateBuildupOutputKind.Material,
          sourceStepId: "asphalt_t",
          unit: "t",
          label: "Asphalt",
          defaultMaterialId: "mat_default",
          position: pos,
        },
      ],
    });
    // Estimator picks a different material
    const s = snap(template, {
      outputs: { out_asphalt: { materialId: "mat_estimator_pick" } },
    });
    const { outputs } = evaluateSnapshot(s, 5);
    expect(outputs).toHaveLength(1);
    expect(outputs[0].materialId).toBe("mat_estimator_pick");
    expect(outputs[0].kind).toBe(RateBuildupOutputKind.Material);
    expect(outputs[0].unit).toBe("t");
  });

  it("resolves CrewHours output with template default when no estimator pick", () => {
    const template = doc({
      formulaSteps: [{ id: "crew_hrs", formula: "quantity * 0.5", position: pos }],
      breakdownDefs: [],
      outputDefs: [
        {
          id: "out_crew",
          kind: RateBuildupOutputKind.CrewHours,
          sourceStepId: "crew_hrs",
          unit: "hr",
          label: "Operator",
          defaultCrewKindId: "crewkind_default",
          position: pos,
        },
      ],
    });
    const s = snap(template);
    // No estimator pick — should fall back to template defaultCrewKindId
    const { outputs } = evaluateSnapshot(s, 4);
    expect(outputs).toHaveLength(1);
    expect(outputs[0].crewKindId).toBe("crewkind_default");
    expect(outputs[0].kind).toBe(RateBuildupOutputKind.CrewHours);
    expect(outputs[0].unit).toBe("hr");
  });

  it("output totalValue equals perUnitValue (formula produces row total, NOT multiplied by quantity again)", () => {
    // The formula step already receives `quantity` in context, so its value
    // IS the total. We must NOT multiply by quantity a second time.
    const template = doc({
      formulaSteps: [
        // This formula computes the total tons for the whole row (not per-unit)
        { id: "asphalt_total_t", formula: "quantity * 2.4", position: pos },
      ],
      breakdownDefs: [],
      outputDefs: [
        {
          id: "out_asphalt",
          kind: RateBuildupOutputKind.Material,
          sourceStepId: "asphalt_total_t",
          unit: "t",
          label: "Asphalt",
          position: pos,
        },
      ],
    });
    const s = snap(template);
    const quantity = 10;
    const { outputs } = evaluateSnapshot(s, quantity);
    // Formula: 10 * 2.4 = 24 total tons (already a row total)
    // perUnitValue and totalValue must both be 24 — not 24 * 10 = 240
    expect(outputs[0].perUnitValue).toBe(24);
    expect(outputs[0].totalValue).toBe(24);
    expect(outputs[0].totalValue).toBe(outputs[0].perUnitValue);
  });
});

// ─── computeSnapshotUnitPrice ─────────────────────────────────────────────────

describe("computeSnapshotUnitPrice", () => {
  it("returns only the unitPrice (convenience wrapper)", () => {
    const template = doc({
      parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 15, position: pos }],
      formulaSteps: [{ id: "cost", formula: "quantity * rate", position: pos }],
      breakdownDefs: [
        {
          id: "bd1",
          label: "Total",
          items: [{ stepId: "cost", label: "Cost" }],
          position: pos,
        },
      ],
    });
    const s = snap(template);
    const unitPrice = computeSnapshotUnitPrice(s, 3);
    // quantity=3, rate=15 → 45
    expect(unitPrice).toBe(45);
    // Should match evaluateSnapshot result exactly
    expect(unitPrice).toBe(evaluateSnapshot(s, 3).unitPrice);
  });
});

// ─── snapshotFromTemplate ────────────────────────────────────────────────────

describe("snapshotFromTemplate", () => {
  it("seeds params from parameterDef defaultValue", () => {
    const template = doc({
      parameterDefs: [
        { id: "rate", label: "Rate", defaultValue: 120, position: pos },
        { id: "depth", label: "Depth", defaultValue: 0.05, position: pos },
      ],
    });
    const s = snapshotFromTemplate(template);
    expect(s.params.rate).toBe(120);
    expect(s.params.depth).toBe(0.05);
  });

  it("seeds tables from tableDef defaultRows", () => {
    const template = doc({
      tableDefs: [
        {
          id: "crew",
          label: "Crew",
          rowLabel: "Role",
          defaultRows: [
            { id: "r1", name: "Operator", qty: 1, ratePerHour: 80 },
            { id: "r2", name: "Labour", qty: 2, ratePerHour: 50 },
          ],
          position: pos,
        },
      ],
    });
    const s = snapshotFromTemplate(template);
    expect(s.tables.crew).toHaveLength(2);
    expect(s.tables.crew[0].ratePerHour).toBe(80);
  });

  it("defaults tableDef without defaultRows to empty array", () => {
    const template = doc({
      tableDefs: [
        { id: "t1", label: "T", rowLabel: "R", defaultRows: undefined as any, position: pos },
      ],
    });
    const s = snapshotFromTemplate(template);
    expect(s.tables.t1).toEqual([]);
  });

  it("seeds percentage controller with numeric default", () => {
    const template = doc({
      controllerDefs: [
        { id: "waste", label: "Waste", type: "percentage", defaultValue: 0.1, position: pos },
      ],
    });
    const s = snapshotFromTemplate(template);
    expect(s.controllers.waste).toBe(0.1);
  });

  it("seeds percentage controller with 0 when default missing", () => {
    const template = doc({
      controllerDefs: [
        { id: "waste", label: "Waste", type: "percentage", position: pos },
      ],
    });
    const s = snapshotFromTemplate(template);
    expect(s.controllers.waste).toBe(0);
  });

  it("seeds toggle controller with boolean default", () => {
    const template = doc({
      controllerDefs: [
        { id: "sealcoat", label: "Sealcoat", type: "toggle", defaultValue: true, position: pos },
      ],
    });
    const s = snapshotFromTemplate(template);
    expect(s.controllers.sealcoat).toBe(true);
  });

  it("seeds toggle controller with false when default missing", () => {
    const template = doc({
      controllerDefs: [
        { id: "sealcoat", label: "Sealcoat", type: "toggle", position: pos },
      ],
    });
    const s = snapshotFromTemplate(template);
    expect(s.controllers.sealcoat).toBe(false);
  });

  it("seeds selector controller with defaultSelected", () => {
    const template = doc({
      controllerDefs: [
        {
          id: "mix",
          label: "Mix",
          type: "selector",
          options: [
            { id: "opt_a", label: "A" },
            { id: "opt_b", label: "B" },
          ],
          defaultSelected: ["opt_a"],
          position: pos,
        },
      ],
    });
    const s = snapshotFromTemplate(template);
    expect(s.controllers.mix).toEqual(["opt_a"]);
  });

  it("seeds selector controller with empty array when defaultSelected missing", () => {
    const template = doc({
      controllerDefs: [
        { id: "mix", label: "Mix", type: "selector", position: pos },
      ],
    });
    const s = snapshotFromTemplate(template);
    expect(s.controllers.mix).toEqual([]);
  });

  it("seeds Material output selection from defaultMaterialId", () => {
    const template = doc({
      outputDefs: [
        {
          id: "out1",
          kind: RateBuildupOutputKind.Material,
          sourceStepId: "step1",
          unit: "t",
          defaultMaterialId: "mat_default",
          position: pos,
        },
      ],
    });
    const s = snapshotFromTemplate(template);
    expect(s.outputs!.out1).toEqual({ materialId: "mat_default" });
  });

  it("seeds CrewHours output selection from defaultCrewKindId", () => {
    const template = doc({
      outputDefs: [
        {
          id: "out1",
          kind: RateBuildupOutputKind.CrewHours,
          sourceStepId: "step1",
          unit: "hr",
          defaultCrewKindId: "ck_base",
          position: pos,
        },
      ],
    });
    const s = snapshotFromTemplate(template);
    expect(s.outputs!.out1).toEqual({ crewKindId: "ck_base" });
  });

  it("sourceTemplateId matches template id", () => {
    const template = doc({ id: "tmpl_xyz" });
    const s = snapshotFromTemplate(template);
    expect(s.sourceTemplateId).toBe("tmpl_xyz");
  });
});

// ─── snapshotToCanvasDoc ─────────────────────────────────────────────────────

describe("snapshotToCanvasDoc", () => {
  it("strips snapshot-specific fields and returns the canvas shape", () => {
    const template = doc({
      parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 20, position: pos }],
    });
    const s = snapshotFromTemplate(template);
    s.paramNotes = { rate: "confirmed with estimator" };

    const back = snapshotToCanvasDoc(s);
    expect(back.parameterDefs).toEqual(template.parameterDefs);
    expect((back as any).params).toBeUndefined();
    expect((back as any).tables).toBeUndefined();
    expect((back as any).controllers).toBeUndefined();
    expect((back as any).paramNotes).toBeUndefined();
    expect((back as any).outputs).toBeUndefined();
    expect((back as any).sourceTemplateId).toBeUndefined();
  });

  it("legacy fallback: provides empty outputDefs when snapshot has none", () => {
    // Older snapshots saved before outputDefs were introduced. Simulate by
    // building a snapshot then deleting outputDefs to match stored shape.
    const template = doc();
    const s = snapshotFromTemplate(template);
    delete (s as any).outputDefs;

    const back = snapshotToCanvasDoc(s);
    expect(back.outputDefs).toEqual([]);
  });
});

// ─── Multi-output mixed kinds ────────────────────────────────────────────────

describe("evaluateSnapshot — multi-output templates", () => {
  it("resolves three outputs of mixed kinds simultaneously", () => {
    const template = doc({
      parameterDefs: [
        { id: "depth_m", label: "Depth", defaultValue: 0.05, position: pos },
      ],
      formulaSteps: [
        // Asphalt tons: quantity * depth * density
        { id: "tons", formula: "quantity * depth_m * 2.4", position: pos },
        // Operator hours: 1 hr per 100 m2
        { id: "opHours", formula: "quantity / 100", position: pos },
        // Labourer hours: 2x operator
        { id: "labHours", formula: "opHours * 2", position: pos },
        // Unit cost from tons at $120/t plus crew
        { id: "cost", formula: "tons * 120 + opHours * 80 + labHours * 50", position: pos },
      ],
      breakdownDefs: [
        { id: "bd1", label: "Total", items: [{ stepId: "cost", label: "Cost" }], position: pos },
      ],
      outputDefs: [
        {
          id: "mat_asphalt",
          kind: RateBuildupOutputKind.Material,
          sourceStepId: "tons",
          unit: "t",
          defaultMaterialId: "mat_asphalt_id",
          position: pos,
        },
        {
          id: "crew_operator",
          kind: RateBuildupOutputKind.CrewHours,
          sourceStepId: "opHours",
          unit: "hr",
          defaultCrewKindId: "ck_operator",
          position: pos,
        },
        {
          id: "crew_labour",
          kind: RateBuildupOutputKind.CrewHours,
          sourceStepId: "labHours",
          unit: "hr",
          defaultCrewKindId: "ck_labour",
          position: pos,
        },
      ],
    });
    const s = snap(template);

    const { unitPrice, outputs } = evaluateSnapshot(s, 1000);
    // tons = 1000 * 0.05 * 2.4 = 120
    // opHours = 10
    // labHours = 20
    // cost = 120*120 + 10*80 + 20*50 = 14400 + 800 + 1000 = 16200
    expect(unitPrice).toBe(16200);

    expect(outputs).toHaveLength(3);

    const asphalt = outputs.find((o) => o.materialId === "mat_asphalt_id");
    expect(asphalt).toBeDefined();
    expect(asphalt!.kind).toBe(RateBuildupOutputKind.Material);
    expect(asphalt!.unit).toBe("t");
    expect(asphalt!.totalValue).toBe(120);

    const operator = outputs.find((o) => o.crewKindId === "ck_operator");
    expect(operator).toBeDefined();
    expect(operator!.kind).toBe(RateBuildupOutputKind.CrewHours);
    expect(operator!.unit).toBe("hr");
    expect(operator!.totalValue).toBe(10);

    const labour = outputs.find((o) => o.crewKindId === "ck_labour");
    expect(labour).toBeDefined();
    expect(labour!.totalValue).toBe(20);
  });

  it("overrides each output independently via snapshot.outputs", () => {
    const template = doc({
      formulaSteps: [
        { id: "tons", formula: "quantity * 0.1", position: pos },
        { id: "hours", formula: "quantity * 0.05", position: pos },
      ],
      outputDefs: [
        {
          id: "mat",
          kind: RateBuildupOutputKind.Material,
          sourceStepId: "tons",
          unit: "t",
          defaultMaterialId: "mat_default",
          position: pos,
        },
        {
          id: "crew",
          kind: RateBuildupOutputKind.CrewHours,
          sourceStepId: "hours",
          unit: "hr",
          defaultCrewKindId: "ck_default",
          position: pos,
        },
      ],
    });
    const s = snap(template, {
      outputs: {
        mat: { materialId: "mat_picked" },
        crew: { crewKindId: "ck_picked" },
      },
    });

    const { outputs } = evaluateSnapshot(s, 100);
    expect(outputs.find((o) => o.kind === RateBuildupOutputKind.Material)!.materialId).toBe(
      "mat_picked"
    );
    expect(outputs.find((o) => o.kind === RateBuildupOutputKind.CrewHours)!.crewKindId).toBe(
      "ck_picked"
    );
  });
});

// ─── Unit variant × controller interaction ──────────────────────────────────

describe("evaluateSnapshot — unit variant × controller interaction", () => {
  // Template with BOTH a unit variant group AND an independent controller group.
  // Scenarios: variant m2 OR m3, and controller waste toggle on/off.
  // Must correctly combine: only the matching variant group active AND the
  // waste group active iff controller value matches activation condition.
  function makeTemplate() {
    return doc({
      parameterDefs: [
        { id: "depth_m", label: "Depth", defaultValue: 0.05, position: pos },
      ],
      controllerDefs: [
        { id: "waste", label: "Waste", type: "toggle", defaultValue: false, position: pos },
      ],
      formulaSteps: [
        // m2 base: quantity * 10
        { id: "baseM2", formula: "quantity * 10", position: pos },
        // m3 base: quantity * 1000 (area conversion built into variant formula)
        { id: "baseM3", formula: "quantity * 1000", position: pos },
        // Waste add-on: quantity * 1 (active only when waste toggle on)
        { id: "wasteCost", formula: "quantity * 1", position: pos },
      ],
      breakdownDefs: [
        {
          id: "bd1",
          label: "T",
          items: [
            { stepId: "baseM2", label: "Base m2" },
            { stepId: "baseM3", label: "Base m3" },
            { stepId: "wasteCost", label: "Waste" },
          ],
          position: pos,
        },
      ],
      unitVariants: [
        { unit: "m2", activatesGroupId: "g_m2" },
        { unit: "m3", activatesGroupId: "g_m3", conversionFormula: "quantity / depth_m" },
      ],
      groupDefs: [
        { id: "g_m2", label: "m2 branch", memberIds: ["baseM2"], position: pos },
        { id: "g_m3", label: "m3 branch", memberIds: ["baseM3"], position: pos },
        {
          id: "g_waste",
          label: "Waste",
          memberIds: ["wasteCost"],
          activation: { controllerId: "waste", condition: "=== 1" },
          position: pos,
        },
      ],
    });
  }

  it("m2 variant + waste off: only baseM2 active", () => {
    const s = snap(makeTemplate(), { controllers: { waste: false } });
    // quantity 5 m2 → baseM2 = 50; baseM3 inactive = 0; wasteCost inactive = 0
    expect(evaluateSnapshot(s, 5, "m2").unitPrice).toBe(50);
  });

  it("m2 variant + waste on: baseM2 + wasteCost", () => {
    const s = snap(makeTemplate(), { controllers: { waste: true } });
    // quantity 5 m2 → baseM2 = 50 + wasteCost = 5 → 55
    expect(evaluateSnapshot(s, 5, "m2").unitPrice).toBe(55);
  });

  it("m3 variant + waste off: only baseM3 active, conversion applies", () => {
    const s = snap(makeTemplate(), { controllers: { waste: false } });
    // raw 5 m3, depth 0.05 → converted quantity 100
    // baseM3 = 100 * 1000 = 100000; baseM2 inactive; wasteCost inactive
    expect(evaluateSnapshot(s, 5, "m3").unitPrice).toBe(100000);
  });

  it("m3 variant + waste on: baseM3 + wasteCost, conversion applies to both", () => {
    const s = snap(makeTemplate(), { controllers: { waste: true } });
    // converted quantity 100 → baseM3 100000 + wasteCost 100 → 100100
    expect(evaluateSnapshot(s, 5, "m3").unitPrice).toBe(100100);
  });

  it("no unit specified: all variant groups inactive, controller group still honored", () => {
    const s = snap(makeTemplate(), { controllers: { waste: true } });
    // No unit → both m2 and m3 variant groups inactive. Only wasteCost active.
    // quantity 5 → wasteCost = 5
    expect(evaluateSnapshot(s, 5).unitPrice).toBe(5);
  });
});
