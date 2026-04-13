// client/src/components/pages/developer/CalculatorCanvas/__tests__/groupActivation.test.ts
import { describe, it, expect } from "vitest";
import { isGroupActive, computeInactiveNodeIds } from "../snapshotEvaluator";
import type { CanvasDocument, GroupDef } from "../canvasTypes";

const pos = { x: 0, y: 0 };
const specialPositions = { quantity: pos, unitPrice: pos };

function doc(overrides: Partial<CanvasDocument> = {}): CanvasDocument {
  return {
    id: "tmpl_1",
    label: "Test",
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

// ─── isGroupActive ────────────────────────────────────────────────────────────

describe("isGroupActive — no activation", () => {
  it("returns true when group has no activation condition", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Always active",
      memberIds: [],
      position: pos,
      // no activation field
    };
    const d = doc();
    expect(isGroupActive(group, d, {})).toBe(true);
  });

  it("returns true when referenced controller does not exist (deleted controller)", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "ctrl_deleted", condition: "> 0" },
    };
    // No controllerDefs at all — controller was deleted
    const d = doc({ controllerDefs: [] });
    expect(isGroupActive(group, d, {})).toBe(true);
  });
});

describe("isGroupActive — percentage controller", () => {
  const d = doc({
    controllerDefs: [
      {
        id: "pct_ctrl",
        label: "Percentage",
        type: "percentage",
        defaultValue: 0.5,
        position: pos,
      },
    ],
  });

  it("> comparison: returns true when value satisfies condition", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "pct_ctrl", condition: "> 0" },
    };
    expect(isGroupActive(group, d, { pct_ctrl: 0.8 })).toBe(true);
  });

  it("> comparison: returns false when value does not satisfy condition", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "pct_ctrl", condition: "> 0" },
    };
    expect(isGroupActive(group, d, { pct_ctrl: 0 })).toBe(false);
  });

  it(">= comparison: returns true when value equals threshold", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "pct_ctrl", condition: ">= 0.5" },
    };
    expect(isGroupActive(group, d, { pct_ctrl: 0.5 })).toBe(true);
  });

  it(">= comparison: returns false when value is below threshold", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "pct_ctrl", condition: ">= 0.5" },
    };
    expect(isGroupActive(group, d, { pct_ctrl: 0.4 })).toBe(false);
  });

  it("=== comparison: returns true when value exactly matches", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "pct_ctrl", condition: "=== 1" },
    };
    expect(isGroupActive(group, d, { pct_ctrl: 1 })).toBe(true);
  });

  it("=== comparison: returns false when value does not match", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "pct_ctrl", condition: "=== 1" },
    };
    expect(isGroupActive(group, d, { pct_ctrl: 0.5 })).toBe(false);
  });

  it("!== comparison: returns true when value differs from threshold", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "pct_ctrl", condition: "!== 0" },
    };
    expect(isGroupActive(group, d, { pct_ctrl: 0.8 })).toBe(true);
  });

  it("!== comparison: returns false when value equals threshold", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "pct_ctrl", condition: "!== 0" },
    };
    expect(isGroupActive(group, d, { pct_ctrl: 0 })).toBe(false);
  });

  it("falls back to defaultValue when controller value is undefined", () => {
    // defaultValue is 0.5, condition "> 0" → 0.5 > 0 → true
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "pct_ctrl", condition: "> 0" },
    };
    expect(isGroupActive(group, d, {})).toBe(true);
  });

  it("falls back to defaultValue=0 when controller value is undefined and no defaultValue set", () => {
    const dNoDefault = doc({
      controllerDefs: [
        {
          id: "pct_ctrl",
          label: "Percentage",
          type: "percentage",
          // no defaultValue
          position: pos,
        },
      ],
    });
    // defaultValue undefined → treated as 0; condition "> 0" → false
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "pct_ctrl", condition: "> 0" },
    };
    expect(isGroupActive(group, dNoDefault, {})).toBe(false);
  });
});

describe("isGroupActive — toggle controller", () => {
  const d = doc({
    controllerDefs: [
      {
        id: "tog_ctrl",
        label: "Toggle",
        type: "toggle",
        defaultValue: false,
        position: pos,
      },
    ],
  });

  it("converts true to 1 for comparison: active when toggle is true and condition is === 1", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "tog_ctrl", condition: "=== 1" },
    };
    expect(isGroupActive(group, d, { tog_ctrl: true })).toBe(true);
  });

  it("converts false to 0 for comparison: inactive when toggle is false and condition is === 1", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "tog_ctrl", condition: "=== 1" },
    };
    expect(isGroupActive(group, d, { tog_ctrl: false })).toBe(false);
  });

  it("uses defaultValue when controller value is undefined (defaultValue=false → 0)", () => {
    // defaultValue false → 0; condition "=== 1" → 0 === 1 → false
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "tog_ctrl", condition: "=== 1" },
    };
    expect(isGroupActive(group, d, {})).toBe(false);
  });

  it("uses defaultValue=true when controller value is undefined → treated as active", () => {
    const dTrue = doc({
      controllerDefs: [
        {
          id: "tog_ctrl",
          label: "Toggle",
          type: "toggle",
          defaultValue: true,
          position: pos,
        },
      ],
    });
    // defaultValue true → 1; condition "=== 1" → true
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "tog_ctrl", condition: "=== 1" },
    };
    expect(isGroupActive(group, dTrue, {})).toBe(true);
  });
});

describe("isGroupActive — selector controller", () => {
  const d = doc({
    controllerDefs: [
      {
        id: "sel_ctrl",
        label: "Selector",
        type: "selector",
        options: [
          { id: "opt_a", label: "Option A" },
          { id: "opt_b", label: "Option B" },
          { id: "opt_c", label: "Option C" },
        ],
        defaultSelected: ["opt_a"],
        position: pos,
      },
    ],
  });

  it("is active when optionId is in the selected array", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "sel_ctrl", optionId: "opt_b" },
    };
    expect(isGroupActive(group, d, { sel_ctrl: ["opt_b", "opt_c"] })).toBe(true);
  });

  it("is inactive when optionId is not in the selected array", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "sel_ctrl", optionId: "opt_b" },
    };
    expect(isGroupActive(group, d, { sel_ctrl: ["opt_a", "opt_c"] })).toBe(false);
  });

  it("uses defaultSelected when controller value is undefined", () => {
    // defaultSelected is ["opt_a"]; group activates on opt_a → active
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "sel_ctrl", optionId: "opt_a" },
    };
    expect(isGroupActive(group, d, {})).toBe(true);
  });

  it("is inactive when using defaultSelected and optionId is not in it", () => {
    // defaultSelected is ["opt_a"]; group activates on opt_b → inactive
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "sel_ctrl", optionId: "opt_b" },
    };
    expect(isGroupActive(group, d, {})).toBe(false);
  });

  it("is inactive when optionId is not set (in-progress authoring)", () => {
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "sel_ctrl" /* no optionId */ },
    };
    expect(isGroupActive(group, d, { sel_ctrl: ["opt_a", "opt_b"] })).toBe(false);
  });
});

describe("isGroupActive — edge cases", () => {
  it("returns true when activation has no condition string on a percentage controller", () => {
    const d = doc({
      controllerDefs: [
        {
          id: "pct_ctrl",
          label: "Percentage",
          type: "percentage",
          defaultValue: 0,
          position: pos,
        },
      ],
    });
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "pct_ctrl" /* no condition */ },
    };
    expect(isGroupActive(group, d, { pct_ctrl: 0.5 })).toBe(true);
  });

  it("returns true when activation has no condition string on a toggle controller", () => {
    const d = doc({
      controllerDefs: [
        {
          id: "tog_ctrl",
          label: "Toggle",
          type: "toggle",
          defaultValue: false,
          position: pos,
        },
      ],
    });
    const group: GroupDef = {
      id: "grp_1",
      label: "Group",
      memberIds: [],
      position: pos,
      activation: { controllerId: "tog_ctrl" /* no condition */ },
    };
    expect(isGroupActive(group, d, { tog_ctrl: false })).toBe(true);
  });
});

// ─── computeInactiveNodeIds ───────────────────────────────────────────────────

describe("computeInactiveNodeIds — basic", () => {
  it("returns empty set when no groups exist", () => {
    const d = doc({ groupDefs: [] });
    const result = computeInactiveNodeIds(d, {});
    expect(result.size).toBe(0);
  });

  it("returns empty set when all groups are always-active (no activation)", () => {
    const d = doc({
      groupDefs: [
        { id: "grp_1", label: "G1", memberIds: ["step_a", "step_b"], position: pos },
        { id: "grp_2", label: "G2", memberIds: ["step_c"], position: pos },
      ],
    });
    const result = computeInactiveNodeIds(d, {});
    expect(result.size).toBe(0);
  });

  it("returns member IDs of inactive groups", () => {
    const d = doc({
      controllerDefs: [
        {
          id: "tog_ctrl",
          label: "Toggle",
          type: "toggle",
          defaultValue: false,
          position: pos,
        },
      ],
      groupDefs: [
        {
          id: "grp_optional",
          label: "Optional",
          memberIds: ["step_a", "step_b"],
          position: pos,
          activation: { controllerId: "tog_ctrl", condition: "=== 1" },
        },
        {
          id: "grp_always",
          label: "Always",
          memberIds: ["step_c"],
          position: pos,
          // no activation — always active
        },
      ],
    });
    // Toggle is false → optional group is inactive
    const result = computeInactiveNodeIds(d, { tog_ctrl: false });
    expect(result.has("step_a")).toBe(true);
    expect(result.has("step_b")).toBe(true);
    expect(result.has("step_c")).toBe(false);
  });
});

describe("computeInactiveNodeIds — parent propagation", () => {
  it("propagates inactivity to child groups (parent inactive → child members also inactive)", () => {
    const d = doc({
      controllerDefs: [
        {
          id: "tog_ctrl",
          label: "Toggle",
          type: "toggle",
          defaultValue: false,
          position: pos,
        },
      ],
      groupDefs: [
        {
          id: "grp_parent",
          label: "Parent",
          memberIds: ["step_parent_only", "grp_child"],
          position: pos,
          activation: { controllerId: "tog_ctrl", condition: "=== 1" },
        },
        {
          id: "grp_child",
          label: "Child",
          // child has no activation of its own — would normally be active
          memberIds: ["step_child_a", "step_child_b"],
          position: pos,
        },
      ],
    });
    // Parent is inactive → child group should also be deactivated
    const result = computeInactiveNodeIds(d, { tog_ctrl: false });
    expect(result.has("step_parent_only")).toBe(true);
    expect(result.has("step_child_a")).toBe(true);
    expect(result.has("step_child_b")).toBe(true);
  });

  it("does not propagate inactivity when parent is active", () => {
    const d = doc({
      controllerDefs: [
        {
          id: "tog_ctrl",
          label: "Toggle",
          type: "toggle",
          defaultValue: true,
          position: pos,
        },
      ],
      groupDefs: [
        {
          id: "grp_parent",
          label: "Parent",
          memberIds: ["step_parent_only", "grp_child"],
          position: pos,
          activation: { controllerId: "tog_ctrl", condition: "=== 1" },
        },
        {
          id: "grp_child",
          label: "Child",
          memberIds: ["step_child_a"],
          position: pos,
        },
      ],
    });
    // Parent is active (toggle true → 1 === 1) → child should also remain active
    const result = computeInactiveNodeIds(d, { tog_ctrl: true });
    expect(result.size).toBe(0);
  });
});

describe("computeInactiveNodeIds — unit variant groups", () => {
  const grpM2 = "grp_m2_variant";
  const grpM3 = "grp_m3_variant";

  function variantDoc(): CanvasDocument {
    return doc({
      groupDefs: [
        {
          id: grpM2,
          label: "m2 variant",
          memberIds: ["step_m2_only"],
          position: pos,
          // no activation — but driven by unit variant logic
        },
        {
          id: grpM3,
          label: "m3 variant",
          memberIds: ["step_m3_only"],
          position: pos,
        },
      ],
      unitVariants: [
        { unit: "m2", activatesGroupId: grpM2 },
        { unit: "m3", activatesGroupId: grpM3 },
      ],
    });
  }

  it("activates only the matching variant group, deactivates others", () => {
    const d = variantDoc();
    // Active unit is m3 → grp_m3_variant active, grp_m2_variant inactive
    const result = computeInactiveNodeIds(d, {}, "m3");
    expect(result.has("step_m2_only")).toBe(true);
    expect(result.has("step_m3_only")).toBe(false);
  });

  it("deactivates all variant groups when no unit is specified", () => {
    const d = variantDoc();
    // No unit → no activeVariantGroupId → all unit variant groups inactive
    const result = computeInactiveNodeIds(d, {});
    expect(result.has("step_m2_only")).toBe(true);
    expect(result.has("step_m3_only")).toBe(true);
  });

  it("does not deactivate non-variant groups when evaluating unit variants", () => {
    const d = doc({
      groupDefs: [
        {
          id: grpM2,
          label: "m2 variant",
          memberIds: ["step_m2_only"],
          position: pos,
        },
        {
          id: grpM3,
          label: "m3 variant",
          memberIds: ["step_m3_only"],
          position: pos,
        },
        {
          id: "grp_always",
          label: "Always active",
          memberIds: ["step_always"],
          position: pos,
          // Not a unit variant group
        },
      ],
      unitVariants: [
        { unit: "m2", activatesGroupId: grpM2 },
        { unit: "m3", activatesGroupId: grpM3 },
      ],
    });
    // Active unit is m2 → m3 variant inactive, but grp_always stays active
    const result = computeInactiveNodeIds(d, {}, "m2");
    expect(result.has("step_m3_only")).toBe(true);
    expect(result.has("step_m2_only")).toBe(false);
    expect(result.has("step_always")).toBe(false);
  });
});
