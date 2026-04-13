import { describe, it, expect } from "vitest";
import { fragmentToDoc } from "../fragmentParser";

// Fragments come from Apollo as loosely-typed objects. Tests cast as any to
// avoid importing the full generated fragment type (stubbed in vitest config).
const frag = (overrides: Record<string, any> = {}): any => ({
  _id: "tmpl_1",
  label: "Test",
  defaultUnit: "m2",
  parameterDefs: [],
  tableDefs: [],
  formulaSteps: [],
  breakdownDefs: [],
  outputDefs: [],
  groupDefs: [],
  controllerDefs: [],
  unitVariants: [],
  updatedAt: null,
  specialPositions: null,
  ...overrides,
});

describe("fragmentToDoc", () => {
  describe("happy path", () => {
    it("maps minimal fragment to a CanvasDocument", () => {
      const doc = fragmentToDoc(frag());
      expect(doc.id).toBe("tmpl_1");
      expect(doc.label).toBe("Test");
      expect(doc.defaultUnit).toBe("m2");
      expect(doc.parameterDefs).toEqual([]);
      expect(doc.groupDefs).toEqual([]);
      expect(doc.controllerDefs).toEqual([]);
      expect(doc.unitVariants).toEqual([]);
    });

    it("uses 'unit' fallback when defaultUnit is null", () => {
      const doc = fragmentToDoc(frag({ defaultUnit: null }));
      expect(doc.defaultUnit).toBe("unit");
    });
  });

  describe("specialPositions", () => {
    it("parses JSON string form", () => {
      const doc = fragmentToDoc(
        frag({
          specialPositions: JSON.stringify({
            quantity: { x: 50, y: 60 },
            unitPrice: { x: 500, y: 600 },
          }),
        })
      );
      expect(doc.specialPositions.quantity).toEqual({ x: 50, y: 60 });
      expect(doc.specialPositions.unitPrice).toEqual({ x: 500, y: 600 });
    });

    it("accepts pre-parsed object form", () => {
      const doc = fragmentToDoc(
        frag({
          specialPositions: {
            quantity: { x: 10, y: 20 },
            unitPrice: { x: 30, y: 40 },
          },
        })
      );
      expect(doc.specialPositions.quantity).toEqual({ x: 10, y: 20 });
      expect(doc.specialPositions.unitPrice).toEqual({ x: 30, y: 40 });
    });

    it("falls back to defaults on invalid JSON", () => {
      const doc = fragmentToDoc(frag({ specialPositions: "{broken json" }));
      expect(doc.specialPositions.quantity).toEqual({ x: 100, y: 200 });
      expect(doc.specialPositions.unitPrice).toEqual({ x: 700, y: 200 });
    });

    it("uses defaults when specialPositions is null", () => {
      const doc = fragmentToDoc(frag({ specialPositions: null }));
      expect(doc.specialPositions.quantity).toEqual({ x: 100, y: 200 });
      expect(doc.specialPositions.unitPrice).toEqual({ x: 700, y: 200 });
    });

    it("partial specialPositions keeps defaults for missing keys", () => {
      const doc = fragmentToDoc(
        frag({ specialPositions: JSON.stringify({ quantity: { x: 11, y: 22 } }) })
      );
      expect(doc.specialPositions.quantity).toEqual({ x: 11, y: 22 });
      // unitPrice default retained
      expect(doc.specialPositions.unitPrice).toEqual({ x: 700, y: 200 });
    });
  });

  describe("groupDefs legacy parsing", () => {
    it("accepts typed array form", () => {
      const groups = [
        { id: "g1", label: "G1", memberIds: ["a", "b"], position: { x: 0, y: 0 } },
      ];
      const doc = fragmentToDoc(frag({ groupDefs: groups }));
      expect(doc.groupDefs).toHaveLength(1);
      expect(doc.groupDefs[0].id).toBe("g1");
    });

    it("parses JSON string (pre-migration form)", () => {
      const doc = fragmentToDoc(
        frag({
          groupDefs: JSON.stringify([
            { id: "g1", label: "G", memberIds: ["x"], position: { x: 0, y: 0 } },
          ]),
        })
      );
      expect(doc.groupDefs).toHaveLength(1);
      expect(doc.groupDefs[0].memberIds).toEqual(["x"]);
    });

    it("empty on invalid groupDefs JSON", () => {
      const doc = fragmentToDoc(frag({ groupDefs: "{broken" }));
      expect(doc.groupDefs).toEqual([]);
    });

    it("deduplicates memberIds within a group", () => {
      const doc = fragmentToDoc(
        frag({
          groupDefs: [
            { id: "g1", label: "G", memberIds: ["a", "b", "a", "c", "b"], position: { x: 0, y: 0 } },
          ],
        })
      );
      expect(doc.groupDefs[0].memberIds).toEqual(["a", "b", "c"]);
    });
  });

  describe("controllerDefs legacy parsing", () => {
    it("accepts typed array form", () => {
      const doc = fragmentToDoc(
        frag({
          controllerDefs: [
            { id: "c1", label: "C", type: "percentage", defaultValue: 0.1, position: { x: 0, y: 0 } },
          ],
        })
      );
      expect(doc.controllerDefs).toHaveLength(1);
    });

    it("parses JSON string (pre-migration form)", () => {
      const doc = fragmentToDoc(
        frag({
          controllerDefs: JSON.stringify([
            { id: "c1", label: "C", type: "toggle", defaultValue: true, position: { x: 0, y: 0 } },
          ]),
        })
      );
      expect(doc.controllerDefs).toHaveLength(1);
      expect(doc.controllerDefs[0].type).toBe("toggle");
    });

    it("empty on invalid controllerDefs JSON", () => {
      const doc = fragmentToDoc(frag({ controllerDefs: "not json" }));
      expect(doc.controllerDefs).toEqual([]);
    });
  });

  describe("canvas def dedup by id", () => {
    it("drops duplicate parameterDefs by id, keeping first", () => {
      const pos = { x: 0, y: 0 };
      const doc = fragmentToDoc(
        frag({
          parameterDefs: [
            { id: "p1", label: "First", defaultValue: 1, position: pos },
            { id: "p1", label: "Dup", defaultValue: 2, position: pos },
            { id: "p2", label: "Second", defaultValue: 3, position: pos },
          ],
        })
      );
      expect(doc.parameterDefs).toHaveLength(2);
      expect(doc.parameterDefs[0].label).toBe("First");
      expect(doc.parameterDefs[1].id).toBe("p2");
    });

    it("dedups tableDefs, formulaSteps, breakdownDefs, outputDefs", () => {
      const pos = { x: 0, y: 0 };
      const doc = fragmentToDoc(
        frag({
          tableDefs: [
            { id: "t1", label: "T", rowLabel: "R", defaultRows: [], position: pos },
            { id: "t1", label: "Dup", rowLabel: "R", defaultRows: [], position: pos },
          ],
          formulaSteps: [
            { id: "f1", formula: "1", position: pos },
            { id: "f1", formula: "2", position: pos },
          ],
          breakdownDefs: [
            { id: "b1", label: "B", items: [], position: pos },
            { id: "b1", label: "Dup", items: [], position: pos },
          ],
          outputDefs: [
            { id: "o1", kind: "Material", sourceStepId: "f1", unit: "t", position: pos },
            { id: "o1", kind: "CrewHours", sourceStepId: "f1", unit: "hr", position: pos },
          ],
        })
      );
      expect(doc.tableDefs).toHaveLength(1);
      expect(doc.formulaSteps).toHaveLength(1);
      expect(doc.formulaSteps[0].formula).toBe("1");
      expect(doc.breakdownDefs).toHaveLength(1);
      expect(doc.outputDefs).toHaveLength(1);
      expect(doc.outputDefs[0].kind).toBe("Material"); // first wins
    });
  });

  describe("unitVariants", () => {
    it("strips null conversionFormula", () => {
      const doc = fragmentToDoc(
        frag({
          unitVariants: [
            { unit: "m2", activatesGroupId: "g_m2", conversionFormula: null },
            { unit: "m3", activatesGroupId: "g_m3", conversionFormula: "quantity / depth" },
          ],
        })
      );
      expect(doc.unitVariants).toHaveLength(2);
      expect(doc.unitVariants![0].conversionFormula).toBeUndefined();
      expect(doc.unitVariants![1].conversionFormula).toBe("quantity / depth");
    });
  });
});
