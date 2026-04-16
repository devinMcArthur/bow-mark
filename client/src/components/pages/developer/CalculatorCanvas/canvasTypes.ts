import {
  Position,
  CanvasParameterDef,
  CanvasTableDef,
  CanvasFormulaStep,
  CanvasBreakdownDef,
  OutputDef,
  SpecialNodePositions,
} from "../../../../components/TenderPricing/calculators/types";

export interface GroupActivation {
  controllerId: string;
  /** Percentage / Toggle: simple comparison, e.g. "> 0", "< 1", "=== 1" */
  condition?: string;
  /** Selector only: which option ID activates this group */
  optionId?: string;
}

/** Named choice in a Selector controller */
export interface ControllerOption {
  id: string;
  label: string;
}

/**
 * Describes how the Quantity node handles a specific input unit.
 * When a line item's unit matches `unit`, the group `activatesGroupId` is
 * activated, and `conversionFormula` (if present) is evaluated to normalise
 * the raw quantity before the rest of the formulas run.
 *
 * conversionFormula may reference `quantity` (the raw input) and any param IDs
 * defined on the template. Result replaces `quantity` in the formula context.
 * Omit or leave empty for units that require no conversion (i.e. the template's
 * native unit).
 */
export interface UnitVariant {
  unit: string;              // canonical code, e.g. "m3"
  activatesGroupId: string;  // group to activate when this unit is selected
  conversionFormula?: string; // e.g. "quantity / depth_m"
}

export interface ControllerDef {
  id: string;
  label: string;
  type: "percentage" | "toggle" | "selector" | "singleSelect";
  /** Percentage: 0–1 number. Toggle: boolean. Absent for selector. */
  defaultValue?: number | boolean;
  /** Selector / singleSelect only */
  options?: ControllerOption[];
  /** Selector / singleSelect only: option IDs selected by default */
  defaultSelected?: string[];
  hint?: string;      // template-level guidance shown read-only to estimators
  position: Position; // canvas node position
}

export interface GroupDef {
  id: string;
  label: string;
  parentGroupId?: string;
  memberIds: string[]; // ordered list: param/table/formula step/sub-group IDs
  activation?: GroupActivation;   // omitted = always active
  position: Position;  // canvas position; w/h used for group resize
}

// CanvasDocument is the in-memory representation used by the canvas.
// Canvas-specific concerns (positions, defaultRows) are co-located on each def.
// `specialPositions` holds positions for the two synthetic nodes (quantity, unitPrice)
// that have no def object.
export interface CanvasDocument {
  id: string; // MongoDB _id (or a temp "new_<timestamp>" before first save)
  label: string;
  defaultUnit: string;
  parameterDefs: CanvasParameterDef[];
  tableDefs: CanvasTableDef[];
  formulaSteps: CanvasFormulaStep[];
  breakdownDefs: CanvasBreakdownDef[];
  outputDefs: OutputDef[];
  specialPositions: SpecialNodePositions; // positions for quantity/unitPrice synthetic nodes
  groupDefs: GroupDef[];
  controllerDefs: ControllerDef[];
  unitVariants?: UnitVariant[];
  updatedAt?: string;
  // REMOVED: defaultInputs (defaultValue now on ParameterDef; defaultRows now on CanvasTableDef)
  // REMOVED: nodePositions (position now on each canvas def)
  // REMOVED: intermediateDefs (replaced by outputDefs — prototype-era scaffolding)
}
