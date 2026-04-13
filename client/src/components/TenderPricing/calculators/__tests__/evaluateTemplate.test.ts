// client/src/components/TenderPricing/calculators/__tests__/evaluateTemplate.test.ts
import { describe, it, expect } from "vitest";
import { safeEval, evaluateTemplate, EvaluatableTemplate } from "../evaluate";
import { RateBuildupOutputKind } from "../../../../generated/graphql";

const pos = { x: 0, y: 0 };

function tmpl(overrides: Partial<EvaluatableTemplate> = {}): EvaluatableTemplate {
  return {
    parameterDefs: [],
    tableDefs: [],
    formulaSteps: [],
    breakdownDefs: [],
    outputDefs: [],
    ...overrides,
  };
}

// ─── safeEval ─────────────────────────────────────────────────────────────────

describe("safeEval", () => {
  it("evaluates a simple expression", () => {
    expect(safeEval("a + b", { a: 3, b: 4 })).toBe(7);
  });

  it("returns 0 for division by zero (Infinity)", () => {
    expect(safeEval("1 / 0", {})).toBe(0);
  });

  it("returns 0 for undefined variables", () => {
    // expr-eval throws when a variable is not in context
    expect(safeEval("unknownVar * 2", {})).toBe(0);
  });

  it("returns 0 for syntax errors", () => {
    expect(safeEval("((( broken !!!", {})).toBe(0);
  });

  it("returns 0 for NaN results (0/0)", () => {
    expect(safeEval("0 / 0", {})).toBe(0);
  });
});

// ─── evaluateTemplate — basic formula evaluation ──────────────────────────────

describe("evaluateTemplate — basic formula evaluation", () => {
  it("evaluates a single formula step and sums it in a breakdown", () => {
    const result = evaluateTemplate(
      tmpl({
        formulaSteps: [{ id: "cost", formula: "quantity * 10" }],
        breakdownDefs: [
          { id: "bd1", label: "Total", items: [{ stepId: "cost", label: "Cost" }] },
        ],
      }),
      undefined,
      5
    );
    expect(result.unitPrice).toBe(50);
    expect(result.breakdown[0].value).toBe(50);
  });

  it("evaluates multiple steps with inter-step references", () => {
    const result = evaluateTemplate(
      tmpl({
        formulaSteps: [
          { id: "material", formula: "quantity * 20" },
          { id: "labour", formula: "quantity * 5" },
          { id: "total", formula: "material + labour" },
        ],
        breakdownDefs: [
          {
            id: "bd1",
            label: "All Costs",
            items: [{ stepId: "total", label: "Total" }],
          },
        ],
      }),
      undefined,
      3
    );
    // material = 3*20=60, labour = 3*5=15, total = 75
    expect(result.unitPrice).toBe(75);
  });

  it("handles dependency order independence (topological sort)", () => {
    // total is declared before its dependencies — topo sort should handle it
    const result = evaluateTemplate(
      tmpl({
        formulaSteps: [
          { id: "total", formula: "material + labour" },
          { id: "material", formula: "quantity * 20" },
          { id: "labour", formula: "quantity * 5" },
        ],
        breakdownDefs: [
          {
            id: "bd1",
            label: "All Costs",
            items: [{ stepId: "total", label: "Total" }],
          },
        ],
      }),
      undefined,
      3
    );
    // Same as ordered case: total = 60 + 15 = 75
    expect(result.unitPrice).toBe(75);
  });
});

// ─── Parameters ───────────────────────────────────────────────────────────────

describe("evaluateTemplate — parameters", () => {
  it("uses input params when provided", () => {
    const result = evaluateTemplate(
      tmpl({
        parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 100 }],
        formulaSteps: [{ id: "cost", formula: "quantity * rate" }],
        breakdownDefs: [
          { id: "bd1", label: "Cost", items: [{ stepId: "cost", label: "Cost" }] },
        ],
      }),
      { params: { rate: 50 }, tables: {} },
      2
    );
    // quantity=2, rate=50 (input, not default 100) → 100
    expect(result.unitPrice).toBe(100);
  });

  it("falls back to defaultValue when no input is provided", () => {
    const result = evaluateTemplate(
      tmpl({
        parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 100 }],
        formulaSteps: [{ id: "cost", formula: "quantity * rate" }],
        breakdownDefs: [
          { id: "bd1", label: "Cost", items: [{ stepId: "cost", label: "Cost" }] },
        ],
      }),
      undefined,
      2
    );
    // quantity=2, rate=100 (default) → 200
    expect(result.unitPrice).toBe(200);
  });
});

// ─── Tables ───────────────────────────────────────────────────────────────────

describe("evaluateTemplate — tables", () => {
  it("computes {tableId}RatePerHr as sum of qty * ratePerHour", () => {
    const result = evaluateTemplate(
      tmpl({
        tableDefs: [{ id: "crew", label: "Crew" }],
        formulaSteps: [{ id: "crewCost", formula: "crewRatePerHr * quantity" }],
        breakdownDefs: [
          { id: "bd1", label: "Labour", items: [{ stepId: "crewCost", label: "Crew" }] },
        ],
      }),
      {
        params: {},
        tables: {
          crew: [
            { id: "r1", name: "Operator", qty: 2, ratePerHour: 80 },
            { id: "r2", name: "Labourer", qty: 1, ratePerHour: 40 },
          ],
        },
      },
      1
    );
    // crewRatePerHr = 2*80 + 1*40 = 200; crewCost = 200 * 1 = 200
    expect(result.unitPrice).toBe(200);
  });

  it("uses defaultRows when no input tables are provided", () => {
    const result = evaluateTemplate(
      tmpl({
        tableDefs: [
          {
            id: "crew",
            label: "Crew",
            defaultRows: [
              { id: "r1", name: "Operator", qty: 1, ratePerHour: 100 },
            ],
          },
        ],
        formulaSteps: [{ id: "crewCost", formula: "crewRatePerHr * quantity" }],
        breakdownDefs: [
          { id: "bd1", label: "Labour", items: [{ stepId: "crewCost", label: "Crew" }] },
        ],
      }),
      undefined,
      3
    );
    // crewRatePerHr = 1*100 = 100; crewCost = 100 * 3 = 300
    expect(result.unitPrice).toBe(300);
  });
});

// ─── Breakdowns ───────────────────────────────────────────────────────────────

describe("evaluateTemplate — breakdowns", () => {
  it("sums multiple steps into one breakdown category", () => {
    const result = evaluateTemplate(
      tmpl({
        formulaSteps: [
          { id: "a", formula: "10" },
          { id: "b", formula: "20" },
          { id: "c", formula: "30" },
        ],
        breakdownDefs: [
          {
            id: "bd1",
            label: "Sum",
            items: [
              { stepId: "a", label: "A" },
              { stepId: "b", label: "B" },
              { stepId: "c", label: "C" },
            ],
          },
        ],
      }),
      undefined,
      1
    );
    expect(result.breakdown[0].value).toBe(60);
    expect(result.unitPrice).toBe(60);
  });

  it("handles breakdown referencing a missing step (value = 0)", () => {
    const result = evaluateTemplate(
      tmpl({
        formulaSteps: [],
        breakdownDefs: [
          {
            id: "bd1",
            label: "Missing",
            items: [{ stepId: "nonExistentStep", label: "Ghost" }],
          },
        ],
      }),
      undefined,
      1
    );
    expect(result.breakdown[0].value).toBe(0);
    expect(result.unitPrice).toBe(0);
  });
});

// ─── Controller values ────────────────────────────────────────────────────────

describe("evaluateTemplate — controller values", () => {
  it("injects controller values into formula context", () => {
    const result = evaluateTemplate(
      tmpl({
        formulaSteps: [{ id: "cost", formula: "quantity * rate * ctrl" }],
        breakdownDefs: [
          { id: "bd1", label: "Cost", items: [{ stepId: "cost", label: "Cost" }] },
        ],
        parameterDefs: [{ id: "rate", label: "Rate", defaultValue: 50 }],
      }),
      undefined,
      2,
      { ctrl: 1.1 } // 10% markup controller
    );
    // cost = 2 * 50 * 1.1 = 110
    expect(result.unitPrice).toBeCloseTo(110);
  });
});

// ─── Inactive nodes ───────────────────────────────────────────────────────────

describe("evaluateTemplate — inactive nodes", () => {
  it("zeroes out steps in inactiveNodeIds set", () => {
    const result = evaluateTemplate(
      tmpl({
        formulaSteps: [
          { id: "active", formula: "10" },
          { id: "inactive", formula: "999" },
        ],
        breakdownDefs: [
          {
            id: "bd1",
            label: "Total",
            items: [
              { stepId: "active", label: "Active" },
              { stepId: "inactive", label: "Inactive" },
            ],
          },
        ],
      }),
      undefined,
      1,
      {},
      new Set(["inactive"])
    );
    // inactive node should be 0, not 999
    expect(result.breakdown[0].value).toBe(10);
    expect(result.unitPrice).toBe(10);
  });
});

// ─── Circular dependencies ────────────────────────────────────────────────────

describe("evaluateTemplate — circular dependencies", () => {
  it("steps in a cycle get appended; earlier ones evaluate to 0 for missing refs", () => {
    // cycleA depends on cycleB which depends on cycleA — neither can resolve
    const result = evaluateTemplate(
      tmpl({
        formulaSteps: [
          { id: "cycleA", formula: "cycleB + 1" },
          { id: "cycleB", formula: "cycleA + 1" },
          { id: "independent", formula: "5" },
        ],
        breakdownDefs: [
          {
            id: "bd1",
            label: "All",
            items: [
              { stepId: "cycleA", label: "A" },
              { stepId: "cycleB", label: "B" },
              { stepId: "independent", label: "Independent" },
            ],
          },
        ],
      }),
      undefined,
      1
    );
    // independent = 5 (no cycle deps, evaluates first)
    // cycleA evaluates first among cycle members: cycleB is not yet in ctx → safeEval returns 0
    // cycleB evaluates second: cycleA is now 0 in ctx → 0 + 1 = 1
    // unitPrice = 0 + 1 + 5 = 6
    expect(result.unitPrice).toBe(6);
  });
});

// ─── Output nodes ─────────────────────────────────────────────────────────────

describe("evaluateTemplate — output nodes", () => {
  it("reads output value from sourceStepId", () => {
    const result = evaluateTemplate(
      tmpl({
        formulaSteps: [{ id: "asphaltTons", formula: "quantity * 2.4" }],
        breakdownDefs: [],
        outputDefs: [
          {
            id: "out1",
            kind: RateBuildupOutputKind.Material,
            sourceStepId: "asphaltTons",
            unit: "t",
            label: "Asphalt",
            position: pos,
          },
        ],
      }),
      undefined,
      10
    );
    // asphaltTons = 10 * 2.4 = 24
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].perUnitValue).toBe(24);
    expect(result.outputs[0].unit).toBe("t");
  });

  it("normalises CrewHours unit to 'hr'", () => {
    const result = evaluateTemplate(
      tmpl({
        formulaSteps: [{ id: "crewHrs", formula: "quantity * 0.5" }],
        breakdownDefs: [],
        outputDefs: [
          {
            id: "out1",
            kind: RateBuildupOutputKind.CrewHours,
            sourceStepId: "crewHrs",
            unit: "hours", // stale/wrong unit — should be normalised
            label: "Operator",
            position: pos,
          },
        ],
      }),
      undefined,
      4
    );
    expect(result.outputs[0].unit).toBe("hr");
    expect(result.outputs[0].perUnitValue).toBe(2);
  });

  it("returns 0 for output referencing non-existent step", () => {
    const result = evaluateTemplate(
      tmpl({
        formulaSteps: [],
        breakdownDefs: [],
        outputDefs: [
          {
            id: "out1",
            kind: RateBuildupOutputKind.Material,
            sourceStepId: "doesNotExist",
            unit: "t",
            label: "Ghost",
            position: pos,
          },
        ],
      }),
      undefined,
      5
    );
    expect(result.outputs[0].perUnitValue).toBe(0);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("evaluateTemplate — edge cases", () => {
  it("empty template returns zero unitPrice, empty breakdown and outputs", () => {
    const result = evaluateTemplate(tmpl(), undefined, 10);
    expect(result.unitPrice).toBe(0);
    expect(result.breakdown).toHaveLength(0);
    expect(result.outputs).toHaveLength(0);
  });

  it("zero quantity evaluates formulas with quantity = 0", () => {
    const result = evaluateTemplate(
      tmpl({
        formulaSteps: [{ id: "cost", formula: "quantity * 100" }],
        breakdownDefs: [
          { id: "bd1", label: "Cost", items: [{ stepId: "cost", label: "Cost" }] },
        ],
      }),
      undefined,
      0
    );
    expect(result.unitPrice).toBe(0);
  });
});
