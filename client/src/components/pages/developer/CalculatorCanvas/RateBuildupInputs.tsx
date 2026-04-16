// client/src/components/pages/developer/CalculatorCanvas/RateBuildupInputs.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex, Grid, Input, Popover, PopoverBody, PopoverContent, PopoverTrigger, Select, Text, Textarea } from "@chakra-ui/react";
import { FiChevronDown, FiChevronRight, FiMessageSquare, FiPlus } from "react-icons/fi";
import katex from "katex";
import { CanvasDocument, GroupDef, ControllerDef, isGroupActive } from "./canvasStorage";
import { evaluateCanvasDoc } from "./snapshotEvaluator";
import { RateEntry } from "../../../../components/TenderPricing/calculators/types";
import { debugEvaluateTemplate } from "../../../../components/TenderPricing/calculators/evaluate";
import { RateRow } from "../../../../components/TenderPricing/calculatorShared";
import { formulaToLatex } from "./formulaToLatex";
import { unitLabel } from "../../../../constants/units";
import { useMaterialsCardQuery, useCrewKindsQuery } from "../../../../generated/graphql";

// ─── Public interface ─────────────────────────────────────────────────────────

export interface RateBuildupInputsProps {
  doc: CanvasDocument;
  params: Record<string, number>;
  tables: Record<string, RateEntry[]>;
  controllers: Record<string, number | boolean | string[]>;
  quantity: number;
  onParamChange: (id: string, value: number) => void;
  onUpdateRow: (tableId: string, rowId: string, field: keyof RateEntry, value: string | number) => void;
  onAddRow: (tableId: string) => void;
  onRemoveRow: (tableId: string, rowId: string) => void;
  onControllerChange: (id: string, value: number | boolean | string[]) => void;
  paramNotes?: Record<string, string>;
  onParamNoteChange?: (paramId: string, note: string) => void;
  /** Estimator's per-Output-node selections, keyed by outputDef.id. */
  outputs?: Record<string, { materialId?: string; crewKindId?: string }>;
  /**
   * Fires when the estimator picks a material or crew kind for an Output node.
   * The picked value replaces the full selection object, so callers can pass
   * `{ materialId }` or `{ crewKindId }` depending on the output's kind.
   */
  onOutputChange?: (
    outputId: string,
    selection: { materialId?: string; crewKindId?: string }
  ) => void;
  /** Number of columns for top-level groups. Defaults to 1. Use 2 when there is ample horizontal space. */
  columns?: 1 | 2;
  /** Fires whenever the evaluated result changes. Use this to display unit price outside the scroll area. */
  onResult?: (result: { unitPrice: number; breakdown: { id: string; label: string; value: number }[] }) => void;
  /** Canonical unit code from the line item (e.g. "m3"). Used to activate unit variant groups. */
  unit?: string;
}

// ─── NotePopover ──────────────────────────────────────────────────────────────

const NotePopover: React.FC<{
  note: string;
  onChange: (v: string) => void;
}> = ({ note, onChange }) => {
  const hasNote = note.trim().length > 0;
  return (
    <Popover placement="bottom-end" isLazy>
      <PopoverTrigger>
        <Box
          as="button"
          display="flex"
          alignItems="center"
          color={hasNote ? "orange.400" : "gray.300"}
          _hover={{ color: hasNote ? "orange.500" : "gray.400" }}
          transition="color 0.1s"
          cursor="pointer"
          flexShrink={0}
          title={hasNote ? "Edit note" : "Add note"}
        >
          <FiMessageSquare size={11} />
        </Box>
      </PopoverTrigger>
      <PopoverContent w="220px" boxShadow="lg" border="1px solid" borderColor="gray.200" _focus={{ outline: "none" }}>
        <PopoverBody p={2}>
          <Textarea
            placeholder="Add a note…"
            value={note}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            resize="none"
            fontSize="xs"
            color="gray.600"
            bg="white"
            border="none"
            _focus={{ boxShadow: "none" }}
            _placeholder={{ color: "gray.300" }}
            autoFocus
          />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

// ─── ParamRow ─────────────────────────────────────────────────────────────────

const ParamRow: React.FC<{
  paramId: string;
  doc: CanvasDocument;
  value: number;
  onChange: (id: string, v: number) => void;
  paramNote?: string;
  onParamNoteChange?: (id: string, note: string) => void;
}> = ({ paramId, doc, value, onChange, paramNote, onParamNoteChange }) => {
  const p = doc.parameterDefs.find((p) => p.id === paramId);
  if (!p) return null;
  return (
    <Box py={1.5}>
      <Flex align="center" justify="space-between" mb={1} gap={1}>
        <Text fontSize="xs" fontWeight="medium" color="gray.500" lineHeight="short">
          {p.label}
          {p.suffix && (
            <Text as="span" color="gray.400" pl={1.5} fontWeight="normal">{p.suffix}</Text>
          )}
        </Text>
        {onParamNoteChange && (
          <NotePopover
            note={paramNote ?? ""}
            onChange={(v) => onParamNoteChange(p.id, v)}
          />
        )}
      </Flex>
      {p.hint && (
        <Text fontSize="xs" color="gray.400" mb={1.5} lineHeight="short">{p.hint}</Text>
      )}
      <Input
        size="sm"
        type="number"
        value={value ?? p.defaultValue}
        onChange={(e) => onChange(p.id, parseFloat(e.target.value) || 0)}
        bg="gray.50"
        borderColor="gray.200"
        _hover={{ borderColor: "gray.300" }}
        _focus={{ bg: "white", borderColor: "orange.400", boxShadow: "0 0 0 1px #fb923c" }}
        fontWeight="medium"
        color="gray.800"
      />
    </Box>
  );
};

// ─── TableSection ─────────────────────────────────────────────────────────────

const TableSection: React.FC<{
  tableId: string;
  doc: CanvasDocument;
  rows: RateEntry[];
  onUpdateRow: (tableId: string, rowId: string, field: keyof RateEntry, value: string | number) => void;
  onAddRow: (tableId: string) => void;
  onRemoveRow: (tableId: string, rowId: string) => void;
}> = ({ tableId, doc, rows, onUpdateRow, onAddRow, onRemoveRow }) => {
  const t = doc.tableDefs.find((t) => t.id === tableId);
  if (!t) return null;
  const ratePerHr = rows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);
  return (
    <Box mb={4}>
      <Flex align="center" justify="space-between" mb={2}>
        <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
          {t.label}
        </Text>
        <Text fontSize="xs" fontWeight="medium" color="gray.500">
          ${ratePerHr.toFixed(2)}<Text as="span" color="gray.400">/hr</Text>
        </Text>
      </Flex>
      <Box border="1px solid" borderColor="gray.200" rounded="lg" overflow="hidden">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ textAlign: "left", padding: "5px 10px", fontWeight: 500, color: "#64748b", fontSize: "11px" }}>{t.rowLabel}</th>
              <th style={{ textAlign: "center", padding: "5px 4px", fontWeight: 500, color: "#64748b", width: "40px", fontSize: "11px" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "5px 10px", fontWeight: 500, color: "#64748b", width: "64px", fontSize: "11px" }}>$/hr</th>
              <th style={{ textAlign: "right", padding: "5px 10px", fontWeight: 500, color: "#64748b", width: "64px", fontSize: "11px" }}>Total</th>
              <th style={{ width: "28px" }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <RateRow
                key={row.id}
                entry={row}
                onChangeName={(v) => onUpdateRow(tableId, row.id, "name", v)}
                onChangeQty={(v) => onUpdateRow(tableId, row.id, "qty", v)}
                onChangeRate={(v) => onUpdateRow(tableId, row.id, "ratePerHour", v)}
                onDelete={() => onRemoveRow(tableId, row.id)}
              />
            ))}
          </tbody>
        </table>
      </Box>
      <Flex
        align="center" gap={1} mt={1} px={1}
        cursor="pointer" color="gray.400"
        _hover={{ color: "orange.500" }}
        onClick={() => onAddRow(tableId)}
        role="button"
        display="inline-flex"
      >
        <FiPlus size={11} />
        <Text fontSize="xs">Add row</Text>
      </Flex>
    </Box>
  );
};

// ─── ControllerWidget ─────────────────────────────────────────────────────────

const ControllerWidget: React.FC<{
  ctrl: ControllerDef;
  value: number | boolean | string[];
  onChange: (id: string, v: number | boolean | string[]) => void;
}> = ({ ctrl, value, onChange }) => {
  if (ctrl.type === "percentage") {
    const pct = (value as number) * 100;
    return (
      <Box mb={3}>
        <Flex align="center" gap={2}>
          <Box flex={1}>
            <Text fontSize="sm" fontWeight="medium" color="gray.700">{ctrl.label}</Text>
            {ctrl.hint && <Text fontSize="xs" color="gray.400" mt={0.5} lineHeight="short">{ctrl.hint}</Text>}
          </Box>
          <Flex align="center" gap={1}>
            <Input
              size="sm"
              type="number"
              w="64px"
              min={0}
              max={100}
              textAlign="right"
              value={pct}
              onChange={(e) => onChange(ctrl.id, Math.min(1, Math.max(0, (parseFloat(e.target.value) || 0) / 100)))}
              bg="white"
              borderColor="gray.200"
              _hover={{ borderColor: "gray.300" }}
              _focus={{ borderColor: "orange.400", boxShadow: "0 0 0 1px #fb923c" }}
              fontWeight="medium"
            />
            <Text fontSize="xs" color="gray.400">%</Text>
          </Flex>
        </Flex>
      </Box>
    );
  }

  if (ctrl.type === "toggle") {
    const on = value as boolean;
    return (
      <Box mb={3}>
        <Flex
          align="center" gap={2.5} cursor="pointer"
          onClick={() => onChange(ctrl.id, !on)}
          role="checkbox"
          aria-checked={on}
        >
          {/* Pill toggle */}
          <Box
            w="30px" h="17px" rounded="full"
            bg={on ? "orange.400" : "gray.200"}
            position="relative"
            transition="background 0.15s ease"
            flexShrink={0}
          >
            <Box
              position="absolute"
              top="2.5px"
              left={on ? "15px" : "2.5px"}
              w="12px" h="12px"
              rounded="full"
              bg="white"
              boxShadow="0 1px 2px rgba(0,0,0,0.2)"
              transition="left 0.15s ease"
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="gray.700" userSelect="none">{ctrl.label}</Text>
            {ctrl.hint && <Text fontSize="xs" color="gray.400" mt={0.5} lineHeight="short">{ctrl.hint}</Text>}
          </Box>
        </Flex>
      </Box>
    );
  }

  // selector / singleSelect — pill options
  const selected = value as string[];
  const isSingle = ctrl.type === "singleSelect";
  return (
    <Box mb={3}>
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1.5}>
        {ctrl.label}
      </Text>
      {ctrl.hint && (
        <Text fontSize="xs" color="gray.400" mb={1.5}>{ctrl.hint}</Text>
      )}
      <Flex wrap="wrap" gap={1.5}>
        {(ctrl.options ?? []).map((opt) => {
          const isSelected = selected.includes(opt.id);
          return (
            <Box
              key={opt.id}
              px={2.5} py={1}
              rounded="full"
              fontSize="xs"
              fontWeight="medium"
              cursor="pointer"
              border="1px solid"
              borderColor={isSelected ? "orange.300" : "gray.200"}
              bg={isSelected ? "orange.50" : "white"}
              color={isSelected ? "orange.700" : "gray.500"}
              transition="all 0.1s ease"
              _hover={{ borderColor: isSelected ? "orange.400" : "gray.300", color: isSelected ? "orange.700" : "gray.600" }}
              onClick={() => {
                if (isSingle) {
                  onChange(ctrl.id, isSelected ? [] : [opt.id]);
                } else {
                  const next = isSelected ? selected.filter((id) => id !== opt.id) : [...selected, opt.id];
                  onChange(ctrl.id, next);
                }
              }}
            >
              {opt.label}
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
};

// ─── GroupSection (recursive) ─────────────────────────────────────────────────

interface GroupSectionProps {
  group: GroupDef;
  depth: number;
  doc: CanvasDocument;
  params: Record<string, number>;
  tables: Record<string, RateEntry[]>;
  controllers: Record<string, number | boolean | string[]>;
  onParamChange: (id: string, v: number) => void;
  onUpdateRow: (tableId: string, rowId: string, field: keyof RateEntry, value: string | number) => void;
  onAddRow: (tableId: string) => void;
  onRemoveRow: (tableId: string, rowId: string) => void;
  onControllerChange: (id: string, v: number | boolean | string[]) => void;
  paramNotes?: Record<string, string>;
  onParamNoteChange?: (id: string, note: string) => void;
  columns?: 1 | 2;
  /** When this group is gated by a toggle controller, pass it here to render inline in the header. */
  activationCtrl?: ControllerDef;
  /** Map of formula step id → { label, value, formula } for rendering outputs inline. */
  formulaOutputs?: Record<string, { label: string; value: number; formula: string }>;
  /** id → label for all variables (params, tables, steps, controllers). Used by FormulaOutputRow. */
  variableLabelMap?: Record<string, string>;
  /** id → current numeric value for all variables. Used by FormulaOutputRow. */
  variableValueMap?: Record<string, number>;
}

const GroupSection: React.FC<GroupSectionProps> = ({
  group, depth, doc, params, tables, controllers,
  onParamChange, onUpdateRow, onAddRow, onRemoveRow, onControllerChange,
  paramNotes, onParamNoteChange, columns = 1, activationCtrl,
  formulaOutputs = {}, variableLabelMap = {}, variableValueMap = {},
}) => {
  const active = isGroupActive(group, doc, controllers);
  const [open, setOpen] = useState(false);
  const [outputsOpen, setOutputsOpen] = useState(false);


  const controllerIds = group.memberIds.filter((id) => (doc.controllerDefs ?? []).some((c) => c.id === id));
  const paramIds = group.memberIds.filter((id) => doc.parameterDefs.some((p) => p.id === id));
  const tableIds = group.memberIds
    .filter((id) => id.endsWith("RatePerHr") && doc.tableDefs.some((t) => `${t.id}RatePerHr` === id))
    .map((id) => id.replace(/RatePerHr$/, ""));
  const subGroupIds = group.memberIds.filter((id) => doc.groupDefs.some((g) => g.id === id));
  const formulaIds = group.memberIds.filter((id) => id in formulaOutputs);

  const controllerIdSet = new Set(controllerIds);
  const ctrlSubGroupMap = new Map<string, string[]>();
  const subGroupsWithCtrl = new Set<string>();
  for (const sgId of subGroupIds) {
    const sg = doc.groupDefs.find((g) => g.id === sgId);
    const cid = sg?.activation?.controllerId;
    if (cid && controllerIdSet.has(cid)) {
      if (!ctrlSubGroupMap.has(cid)) ctrlSubGroupMap.set(cid, []);
      ctrlSubGroupMap.get(cid)!.push(sgId);
      subGroupsWithCtrl.add(sgId);
    }
  }
  const controllerBlocks = controllerIds
    .filter((cid) => ctrlSubGroupMap.has(cid))
    .map((cid) => ({ ctrl: (doc.controllerDefs ?? []).find((c) => c.id === cid)!, groupIds: ctrlSubGroupMap.get(cid)! }));
  const loneControllerIds = controllerIds.filter((cid) => !ctrlSubGroupMap.has(cid));
  const uncontrolledSubGroupIds = subGroupIds.filter((id) => !subGroupsWithCtrl.has(id));

  if (!groupHasInputs(group, doc)) return null;

  // Depth-based card styling
  const isTop = depth === 0;
  const headerBg = active
    ? (isTop ? "#fff7ed" : "#fffbeb")   // orange.50 / amber.50
    : "#f9fafb";
  const borderColor = active
    ? (isTop ? "#fed7aa" : "#fde68a")   // orange.200 / amber.200
    : "#e5e7eb";
  const headingColor = active ? (isTop ? "#c2410c" : "#b45309") : "#9ca3af"; // orange.700 / amber.700

  return (
    <Box
      mb={isTop ? 3 : 2}
      ml={isTop ? 0 : 3}
      border="1px solid"
      borderColor={borderColor}
      rounded={isTop ? "xl" : "lg"}
      overflow="hidden"
      opacity={active ? 1 : 0.65}
      transition="opacity 0.15s"
    >
      {/* Card header */}
      <Flex
        align="center" gap={1.5}
        px={3} py={isTop ? 2 : 1.5}
        bg={headerBg}
        borderBottom={open && active ? "1px solid" : "none"}
        borderColor={borderColor}
        cursor={active ? "pointer" : "default"}
        onClick={() => { if (active) setOpen((o) => !o); }}
        _hover={active ? { bg: isTop ? "#ffedd5" : "#fef9c3" } : {}}
        transition="background 0.1s"
      >
        <Box color={headingColor} flexShrink={0} mt="1px">
          {open && active ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
        </Box>
        <Text fontSize="xs" fontWeight="semibold" color={headingColor} textTransform="uppercase" letterSpacing="wider" flex={1} pl={1.5}>
          {group.label}
        </Text>
        {/* Activation toggle — inline in header */}
        {activationCtrl?.type === "toggle" && (
          <Box
            data-testid={`group-toggle-${group.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onControllerChange(activationCtrl.id, !(controllers[activationCtrl.id] as boolean));
            }}
            flexShrink={0}
          >
            <Box
              w="30px" h="17px" rounded="full"
              bg={active ? "orange.400" : "gray.300"}
              position="relative"
              transition="background 0.15s ease"
            >
              <Box
                position="absolute"
                top="2.5px"
                left={active ? "15px" : "2.5px"}
                w="12px" h="12px"
                rounded="full"
                bg="white"
                boxShadow="0 1px 2px rgba(0,0,0,0.2)"
                transition="left 0.15s ease"
              />
            </Box>
          </Box>
        )}
        {!active && !activationCtrl && (
          <Text fontSize="9px" fontWeight="semibold" color="gray.400"
            bg="gray.100" px={1.5} py={0.5} rounded="sm" textTransform="uppercase" letterSpacing="wide">
            inactive
          </Text>
        )}
      </Flex>

      {/* Card body */}
      {open && active && (
        <Box px={3} pt={3} pb={3}>
          {loneControllerIds.map((id) => {
            const ctrl = (doc.controllerDefs ?? []).find((c) => c.id === id)!;
            return (
              <ControllerWidget key={id} ctrl={ctrl}
                value={controllers[id] ?? (ctrl.type === "selector" || ctrl.type === "singleSelect" ? [] : ctrl.type === "toggle" ? false : 0)}
                onChange={onControllerChange} />
            );
          })}

          {paramIds.length > 0 && (
            <Grid
              templateColumns={columns === 2 ? "repeat(2, 1fr)" : "1fr"}
              gap={2} alignItems="start" mb={2}
            >
              {paramIds.map((id) => (
                <ParamRow key={id} paramId={id} doc={doc} value={params[id]} onChange={onParamChange}
                  paramNote={paramNotes?.[id]} onParamNoteChange={onParamNoteChange} />
              ))}
            </Grid>
          )}

          {tableIds.length > 0 && (
            <Grid templateColumns={columns === 2 && tableIds.length > 1 ? "repeat(2, 1fr)" : "1fr"} gap={3} mb={2}>
              {tableIds.map((id) => (
                <TableSection key={id} tableId={id} doc={doc} rows={tables[id] ?? []}
                  onUpdateRow={onUpdateRow} onAddRow={onAddRow} onRemoveRow={onRemoveRow} />
              ))}
            </Grid>
          )}

          {controllerBlocks.map(({ ctrl, groupIds }) => (
            <Box key={ctrl.id} mb={2}>
              {ctrl.type !== "toggle" && (
                <ControllerWidget ctrl={ctrl}
                  value={controllers[ctrl.id] ?? (ctrl.type === "selector" || ctrl.type === "singleSelect" ? [] : 0)}
                  onChange={onControllerChange} />
              )}
              {groupIds.map((id) => {
                const subGroup = doc.groupDefs.find((g) => g.id === id)!;
                return (
                  <GroupSection key={id} group={subGroup} depth={depth + 1} doc={doc}
                    params={params} tables={tables} controllers={controllers}
                    onParamChange={onParamChange} onUpdateRow={onUpdateRow}
                    onAddRow={onAddRow} onRemoveRow={onRemoveRow} onControllerChange={onControllerChange}
                    paramNotes={paramNotes} onParamNoteChange={onParamNoteChange} columns={columns}
                    activationCtrl={ctrl.type === "toggle" ? ctrl : undefined}
                    formulaOutputs={formulaOutputs}
                    variableLabelMap={variableLabelMap} variableValueMap={variableValueMap} />
                );
              })}
            </Box>
          ))}

          {uncontrolledSubGroupIds.map((id) => {
            const subGroup = doc.groupDefs.find((g) => g.id === id)!;
            return (
              <GroupSection key={id} group={subGroup} depth={depth + 1} doc={doc}
                params={params} tables={tables} controllers={controllers}
                onParamChange={onParamChange} onUpdateRow={onUpdateRow}
                onAddRow={onAddRow} onRemoveRow={onRemoveRow} onControllerChange={onControllerChange}
                paramNotes={paramNotes} onParamNoteChange={onParamNoteChange} columns={columns}
                formulaOutputs={formulaOutputs}
                variableLabelMap={variableLabelMap} variableValueMap={variableValueMap} />
            );
          })}

          {/* Formula outputs for this group — collapsible */}
          {formulaIds.length > 0 && (
            <Box mt={2} pt={2} borderTop="1px solid" borderColor={active ? (depth === 0 ? "orange.100" : "amber.100") : "gray.100"}>
              <Flex
                align="center" gap={1} mb={outputsOpen ? 1 : 0}
                cursor="pointer"
                onClick={() => setOutputsOpen((o) => !o)}
                _hover={{ opacity: 0.8 }}
                role="button"
              >
                <Box color="gray.300" flexShrink={0}>
                  {outputsOpen ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
                </Box>
                <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wider">
                  Outputs
                </Text>
              </Flex>
              {outputsOpen && formulaIds.map((id) => {
                const out = formulaOutputs[id];
                return (
                  <FormulaOutputRow
                    key={id}
                    label={out.label}
                    value={out.value}
                    formula={out.formula}
                    variableLabelMap={variableLabelMap}
                    variableValueMap={variableValueMap}
                  />
                );
              })}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if a group (or any subgroup, recursively) contains at least one
 *  user-editable input: a param, a table, or a controller. Groups that contain
 *  only formula steps have no inputs and are excluded from the inputs panel. */
function groupHasInputs(group: GroupDef, doc: CanvasDocument): boolean {
  for (const id of group.memberIds) {
    if (doc.parameterDefs.some((p) => p.id === id)) return true;
    if (doc.tableDefs.some((t) => `${t.id}RatePerHr` === id)) return true;
    if ((doc.controllerDefs ?? []).some((c) => c.id === id)) return true;
    const sub = doc.groupDefs.find((g) => g.id === id);
    if (sub && groupHasInputs(sub, doc)) return true;
  }
  return false;
}

function formatOutputValue(v: number): string {
  if (!isFinite(v)) return "—";
  if (Number.isInteger(v)) return v.toLocaleString();
  const abs = Math.abs(v);
  if (abs >= 1000) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  if (abs >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

const katexOpts: katex.KatexOptions = { throwOnError: false, errorColor: "#f87171", displayMode: false, output: "html" };

// ─── FormulaOutputRow ─────────────────────────────────────────────────────────

const FormulaOutputRow: React.FC<{
  label: string;
  value: number;
  formula: string;
  variableLabelMap: Record<string, string>;
  variableValueMap: Record<string, number>;
}> = ({ label, value, formula, variableLabelMap, variableValueMap }) => {
  const [open, setOpen] = useState(false);

  const katexHtml = useMemo(() => {
    if (!open || !formula) return "";
    try {
      return katex.renderToString(formulaToLatex(formula, variableLabelMap), katexOpts);
    } catch { return ""; }
  }, [open, formula, variableLabelMap]);

  const referencedVars = useMemo(() => {
    if (!open) return [];
    const seen = new Set<string>();
    const vars: { id: string; label: string; value: number }[] = [];
    for (const [, id] of formula.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g)) {
      if (!seen.has(id) && id in variableValueMap) {
        seen.add(id);
        vars.push({ id, label: variableLabelMap[id] ?? id, value: variableValueMap[id] });
      }
    }
    return vars;
  }, [open, formula, variableLabelMap, variableValueMap]);

  return (
    <Box>
      <Flex
        align="baseline" justify="space-between" py={1.5}
        cursor="pointer"
        onClick={() => setOpen((o) => !o)}
        sx={{ "&:hover > *": { color: "gray.700" } }}
        role="button"
      >
        <Flex align="center" gap={1} flex={1} minW={0}>
          <Box color="gray.300" flexShrink={0} mt="1px">
            {open ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
          </Box>
          <Text fontSize="xs" color="gray.500" noOfLines={1}>{label}</Text>
        </Flex>
        <Text fontSize="xs" fontWeight="medium" color="gray.600" fontFamily="mono" flexShrink={0} pl={3}>
          {formatOutputValue(value)}
        </Text>
      </Flex>

      {open && (
        <Box
          mx={1} mb={2} px={3} py={2.5}
          bg="gray.50" rounded="md"
          border="1px solid" borderColor="gray.100"
        >
          {/* KaTeX formula */}
          {katexHtml ? (
            <Box
              mb={referencedVars.length > 0 ? 2.5 : 0}
              sx={{ ".katex": { fontSize: "13px", color: "#374151" } }}
              dangerouslySetInnerHTML={{ __html: katexHtml }}
            />
          ) : (
            <Text fontSize="xs" fontFamily="mono" color="gray.400" mb={referencedVars.length > 0 ? 2 : 0}>
              {formula}
            </Text>
          )}

          {/* Variable values */}
          {referencedVars.length > 0 && (
            <Box borderTop="1px solid" borderColor="gray.200" pt={2}>
              {referencedVars.map(({ id, label: vLabel, value: vValue }) => (
                <Flex key={id} justify="space-between" align="baseline" py={0.5}>
                  <Text fontSize="11px" color="gray.400">{vLabel}</Text>
                  <Text fontSize="11px" fontFamily="mono" color="gray.500">{formatOutputValue(vValue)}</Text>
                </Flex>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

// ─── Demand outputs (estimator material pickers) ──────────────────────────────

/**
 * Compact read-only formula display shown under each Demand row. Lets the
 * estimator see *how* the demand is being computed. Rendered as KaTeX on a
 * single line; the numeric value lives on the parent Demand row header, so
 * we don't repeat it here.
 */
const DemandFormulaRow: React.FC<{
  stepLabel: string;
  formula: string;
  variableLabelMap: Record<string, string>;
}> = ({ stepLabel, formula, variableLabelMap }) => {
  const katexHtml = useMemo(() => {
    if (!formula) return "";
    try {
      return katex.renderToString(formulaToLatex(formula, variableLabelMap), katexOpts);
    } catch { return ""; }
  }, [formula, variableLabelMap]);

  return (
    <Flex
      mt={1.5} ml={1} pl={2} py={0.5} pr={1}
      borderLeft="2px solid" borderColor="purple.200"
      align="baseline"
      gap={2}
    >
      {katexHtml ? (
        <Box
          flex={1}
          minW={0}
          overflow="hidden"
          sx={{ ".katex": { fontSize: "11px", color: "#6b7280" } }}
          dangerouslySetInnerHTML={{ __html: katexHtml }}
        />
      ) : (
        <Text fontSize="11px" fontFamily="mono" color="gray.500" flex={1} noOfLines={1}>
          {formula || stepLabel}
        </Text>
      )}
    </Flex>
  );
};

const DemandOutputsSection: React.FC<{
  doc: CanvasDocument;
  formulaOutputMap: Record<string, { label: string; value: number; formula: string }>;
  inactiveNodeIds: Set<string>;
  quantity: number;
  outputs?: Record<string, { materialId?: string; crewKindId?: string }>;
  onOutputChange?: (
    outputId: string,
    selection: { materialId?: string; crewKindId?: string }
  ) => void;
  variableLabelMap: Record<string, string>;
}> = ({ doc, formulaOutputMap, inactiveNodeIds, quantity, outputs, onOutputChange, variableLabelMap }) => {
  const { data: materialsData } = useMaterialsCardQuery();
  const materials = useMemo(() => materialsData?.materials ?? [], [materialsData]);
  const materialById = useMemo(() => {
    const m = new Map<string, { _id: string; name: string }>();
    for (const mat of materials) m.set(mat._id, mat);
    return m;
  }, [materials]);

  const { data: crewKindsData } = useCrewKindsQuery();
  const crewKinds = useMemo(() => crewKindsData?.crewKinds ?? [], [crewKindsData]);
  const crewKindById = useMemo(() => {
    const m = new Map<string, { _id: string; name: string }>();
    for (const c of crewKinds) m.set(c._id, c);
    return m;
  }, [crewKinds]);

  // Hide Output nodes whose source formula step is inactive (disabled by a
  // controller-gated group). They contribute 0 demand and would just be noise.
  const visibleOutputs = useMemo(
    () => doc.outputDefs.filter((o) => !inactiveNodeIds.has(o.sourceStepId)),
    [doc.outputDefs, inactiveNodeIds]
  );

  if (visibleOutputs.length === 0) return null;

  return (
    <Box mt={4} mb={2} border="1px solid" borderColor="purple.100" rounded="lg" bg="purple.50/30">
      <Box px={3} py={2} borderBottom="1px solid" borderColor="purple.100">
        <Text fontSize="xs" fontWeight="semibold" color="purple.600" textTransform="uppercase" letterSpacing="wider">
          Demand
        </Text>
      </Box>
      <Box px={3} py={2}>
        {visibleOutputs.map((out) => {
          const sourceStep = formulaOutputMap[out.sourceStepId];
          // The formula step's value is already the row total — formulas
          // receive `quantity` in their evaluation context and use it
          // directly, so the raw step value IS the full line-item demand.
          const total = sourceStep?.value ?? 0;
          const isCrew = out.kind === "CrewHours";
          const displayUnit = isCrew ? "hr" : out.unit;

          // Build kind-specific picker props: options, selected id, display label,
          // placeholder, and the onChange that shapes the outgoing selection.
          let options: { _id: string; name: string }[];
          let selectedId: string | undefined;
          let missingFromCatalog = false;
          let placeholder: string;
          let noun: string;

          if (isCrew) {
            noun = "crew kind";
            const allowed = out.allowedCrewKindIds ?? [];
            const filtered = allowed.length > 0
              ? crewKinds.filter((c) => allowed.includes(c._id))
              : crewKinds;
            const seen = new Set<string>();
            options = filtered.filter((c) => {
              if (seen.has(c._id)) return false;
              seen.add(c._id);
              return true;
            });
            selectedId = outputs?.[out.id]?.crewKindId ?? out.defaultCrewKindId;
            missingFromCatalog = !!selectedId && !crewKindById.has(selectedId);
            placeholder = allowed.length > 0 ? "— pick crew kind —" : "— any crew kind —";
          } else {
            noun = "material";
            const allowed = out.allowedMaterialIds ?? [];
            const filtered = allowed.length > 0
              ? materials.filter((m) => allowed.includes(m._id))
              : materials;
            const seen = new Set<string>();
            options = filtered.filter((m) => {
              if (seen.has(m._id)) return false;
              seen.add(m._id);
              return true;
            });
            selectedId = outputs?.[out.id]?.materialId ?? out.defaultMaterialId;
            missingFromCatalog = !!selectedId && !materialById.has(selectedId);
            placeholder = allowed.length > 0 ? "— pick material —" : "— any material —";
          }

          const handleChange = (newId: string) => {
            const value = newId || undefined;
            if (isCrew) onOutputChange?.(out.id, { crewKindId: value });
            else onOutputChange?.(out.id, { materialId: value });
          };

          // Lock the dropdown when there's only one possible choice AND the
          // template has set that single choice as the default — there's
          // nothing for the estimator to actually change. In that case we
          // collapse the Select entirely and show the name inline.
          const singleOptionLocked = options.length === 1 && (isCrew
            ? out.defaultCrewKindId === options[0]._id
            : out.defaultMaterialId === options[0]._id);

          const selectedName = selectedId
            ? options.find((o) => o._id === selectedId)?.name
            : undefined;

          return (
            <Box
              key={out.id}
              py={2}
              borderBottom="1px solid"
              borderColor="purple.50"
              _last={{ borderBottom: "none", pb: 0 }}
              _first={{ pt: 0 }}
            >
              {/* Header row: label · (inline locked name) ─────── total unit */}
              <Flex align="baseline" justify="space-between" gap={3}>
                <Flex align="baseline" gap={2} flex={1} minW={0}>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.700" flexShrink={0}>
                    {out.label ?? out.id}
                  </Text>
                  {singleOptionLocked && selectedName && (
                    <Text fontSize="xs" color="gray.500" noOfLines={1}>
                      · {selectedName}
                    </Text>
                  )}
                </Flex>
                <Text fontSize="sm" fontWeight="700" color="gray.800" fontFamily="mono" flexShrink={0}>
                  {total.toFixed(2)}
                  <Text as="span" fontSize="10px" color="gray.400" ml={1}>
                    {unitLabel(displayUnit)}
                  </Text>
                </Text>
              </Flex>

              {/* Interactive picker — only rendered when the estimator
                  actually has a choice to make. */}
              {!singleOptionLocked && (
                <Box mt={1.5}>
                  <Select
                    size="xs"
                    value={selectedId ?? ""}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={placeholder}
                    isDisabled={!onOutputChange}
                  >
                    {options.map((opt) => (
                      <option key={opt._id} value={opt._id}>{opt.name}</option>
                    ))}
                  </Select>
                  {missingFromCatalog && (
                    <Text fontSize="10px" color="orange.500" mt={1}>
                      Selected {noun} no longer in catalog
                    </Text>
                  )}
                </Box>
              )}

              {/* Source formula — shows the estimator how this demand is computed */}
              {sourceStep && (
                <DemandFormulaRow
                  stepLabel={sourceStep.label}
                  formula={sourceStep.formula}
                  variableLabelMap={variableLabelMap}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ─── RateBuildupInputs ────────────────────────────────────────────────────────

const RateBuildupInputs: React.FC<RateBuildupInputsProps> = ({
  doc, params, tables, controllers, quantity,
  onParamChange, onUpdateRow, onAddRow, onRemoveRow, onControllerChange,
  paramNotes, onParamNoteChange, outputs, onOutputChange,
  columns = 1, onResult, unit,
}) => {
  const inputs = useMemo(() => ({ params, tables }), [params, tables]);

  // Single source of truth for the live-preview compute. Shares
  // evaluateCanvasDoc with evaluateSnapshot (save path) so the two cannot
  // drift. See snapshotEvaluator.ts for the rationale.
  const { result, normalizedQuantity, controllerNumeric, inactiveNodeIds } =
    useMemo(
      () => evaluateCanvasDoc(doc, params, tables, controllers, quantity, unit),
      [doc, params, tables, controllers, quantity, unit]
    );

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  useEffect(() => {
    onResultRef.current?.(result);
  }, [result]);

  const [outputsOpen, setOutputsOpen] = useState(false);

  // Map of formula step id → { label, value, formula } for all active, non-errored steps.
  // Uses the same normalizedQuantity + controllerNumeric + inactiveNodeIds that
  // the main result memo computed via evaluateCanvasDoc, so the debug panel
  // and the main result can never disagree on their inputs.
  const formulaOutputMap = useMemo<Record<string, { label: string; value: number; formula: string }>>(() => {
    if (!doc.formulaSteps.length) return {};
    const stepMeta = new Map(doc.formulaSteps.map((s) => [s.id, { label: s.label ?? s.id, formula: s.formula }]));
    const stepResults = debugEvaluateTemplate(doc, inputs, normalizedQuantity, controllerNumeric, inactiveNodeIds);
    const map: Record<string, { label: string; value: number; formula: string }> = {};
    for (const s of stepResults) {
      const meta = stepMeta.get(s.id);
      if (!s.error && !inactiveNodeIds.has(s.id) && meta) {
        map[s.id] = { label: meta.label, value: s.value, formula: meta.formula };
      }
    }
    return map;
  }, [doc, inputs, normalizedQuantity, controllerNumeric, inactiveNodeIds]);

  // id → label for all variables in scope (used by formulaToLatex inside FormulaOutputRow)
  const variableLabelMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = { quantity: "Quantity" };
    for (const p of doc.parameterDefs) map[p.id] = p.label;
    for (const t of doc.tableDefs) map[`${t.id}RatePerHr`] = t.label;
    for (const s of doc.formulaSteps) map[s.id] = s.label ?? s.id;
    for (const c of (doc.controllerDefs ?? [])) map[c.id] = c.label;
    return map;
  }, [doc]);

  // id → current numeric value for all variables (used in the variable breakdown table).
  // Controller values come from the shared controllerNumeric map so the
  // debug table shows the exact values that went into the formula context.
  const variableValueMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = { quantity: normalizedQuantity };
    for (const p of doc.parameterDefs) map[p.id] = params[p.id] ?? p.defaultValue;
    for (const t of doc.tableDefs) {
      const rows = tables[t.id] ?? [];
      map[`${t.id}RatePerHr`] = rows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);
    }
    for (const [id, out] of Object.entries(formulaOutputMap)) map[id] = out.value;
    for (const [id, v] of Object.entries(controllerNumeric)) map[id] = v;
    return map;
  }, [doc, params, tables, normalizedQuantity, formulaOutputMap, controllerNumeric]);

  // Ungrouped formula outputs (not a member of any group)
  const ungroupedFormulaOutputs = useMemo(() => {
    const allMemberIds = new Set(doc.groupDefs.flatMap((g) => g.memberIds));
    return Object.entries(formulaOutputMap)
      .filter(([id]) => !allMemberIds.has(id))
      .map(([id, out]) => ({ id, ...out }));
  }, [formulaOutputMap, doc.groupDefs]);

  const { ungroupedParams, ungroupedTables, controllerBlocks, loneControllers, uncontrolledTopGroups } = useMemo(() => {
    const allMemberIds = new Set(doc.groupDefs.flatMap((g) => g.memberIds));
    const topLevelGroups = doc.groupDefs.filter((g) => !allMemberIds.has(g.id));
    const ungroupedControllers = (doc.controllerDefs ?? []).filter((c) => !allMemberIds.has(c.id));
    const ungroupedControllerIds = new Set(ungroupedControllers.map((c) => c.id));

    const controllerGroupMap = new Map<string, typeof topLevelGroups>();
    const groupsWithController = new Set<string>();
    for (const g of topLevelGroups) {
      const cid = g.activation?.controllerId;
      if (cid && ungroupedControllerIds.has(cid)) {
        if (!controllerGroupMap.has(cid)) controllerGroupMap.set(cid, []);
        controllerGroupMap.get(cid)!.push(g);
        groupsWithController.add(g.id);
      }
    }

    return {
      ungroupedParams: doc.parameterDefs.filter((p) => !allMemberIds.has(p.id)),
      ungroupedTables: doc.tableDefs.filter((t) => !allMemberIds.has(`${t.id}RatePerHr`)),
      controllerBlocks: ungroupedControllers
        .filter((c) => controllerGroupMap.has(c.id))
        .map((c) => ({ ctrl: c, groups: controllerGroupMap.get(c.id)!.filter((g) => groupHasInputs(g, doc)) }))
        .filter(({ groups }) => groups.length > 0),
      loneControllers: ungroupedControllers.filter((c) => !controllerGroupMap.has(c.id)),
      uncontrolledTopGroups: topLevelGroups.filter((g) => !groupsWithController.has(g.id) && groupHasInputs(g, doc)),
    };
  }, [doc]);

  return (
    <Box>
      {/* Standalone controllers */}
      {loneControllers.length > 0 && (
        <Box mb={4}>
          {loneControllers.map((c) => (
            <ControllerWidget key={c.id} ctrl={c}
              value={controllers[c.id] ?? (c.type === "selector" || c.type === "singleSelect" ? [] : c.type === "toggle" ? false : 0)}
              onChange={onControllerChange} />
          ))}
        </Box>
      )}

      {/* Ungrouped params */}
      {ungroupedParams.length > 0 && (
        <Grid
          templateColumns={columns === 2 ? "repeat(2, 1fr)" : "1fr"}
          gap={2} alignItems="start" mb={4}
        >
          {ungroupedParams.map((p) => (
            <ParamRow key={p.id} paramId={p.id} doc={doc} value={params[p.id]}
              onChange={onParamChange}
              paramNote={paramNotes?.[p.id]} onParamNoteChange={onParamNoteChange} />
          ))}
        </Grid>
      )}

      {/* Ungrouped tables */}
      {ungroupedTables.map((t) => (
        <TableSection key={t.id} tableId={t.id} doc={doc} rows={tables[t.id] ?? []}
          onUpdateRow={onUpdateRow} onAddRow={onAddRow} onRemoveRow={onRemoveRow} />
      ))}

      {/* Controller blocks */}
      {controllerBlocks.map(({ ctrl, groups }) => (
        <Box key={ctrl.id} mb={3}>
          {ctrl.type !== "toggle" && (
            <ControllerWidget ctrl={ctrl}
              value={controllers[ctrl.id] ?? (ctrl.type === "selector" || ctrl.type === "singleSelect" ? [] : 0)}
              onChange={onControllerChange} />
          )}
          {groups.map((g) => (
            <GroupSection key={g.id} group={g} depth={0} doc={doc}
              params={params} tables={tables} controllers={controllers}
              onParamChange={onParamChange} onUpdateRow={onUpdateRow}
              onAddRow={onAddRow} onRemoveRow={onRemoveRow} onControllerChange={onControllerChange}
              paramNotes={paramNotes} onParamNoteChange={onParamNoteChange}
              columns={columns}
              activationCtrl={ctrl.type === "toggle" ? ctrl : undefined}
              formulaOutputs={formulaOutputMap}
              variableLabelMap={variableLabelMap} variableValueMap={variableValueMap} />
          ))}
        </Box>
      ))}

      {/* Uncontrolled top-level groups */}
      {uncontrolledTopGroups.map((g) => (
        <GroupSection key={g.id} group={g} depth={0} doc={doc}
          params={params} tables={tables} controllers={controllers}
          onParamChange={onParamChange} onUpdateRow={onUpdateRow}
          onAddRow={onAddRow} onRemoveRow={onRemoveRow} onControllerChange={onControllerChange}
          paramNotes={paramNotes} onParamNoteChange={onParamNoteChange} columns={columns}
          formulaOutputs={formulaOutputMap}
          variableLabelMap={variableLabelMap} variableValueMap={variableValueMap} />
      ))}

      {/* Demand outputs — estimator picks the material for each active Output node */}
      {doc.outputDefs.length > 0 && (
        <DemandOutputsSection
          doc={doc}
          formulaOutputMap={formulaOutputMap}
          inactiveNodeIds={inactiveNodeIds}
          quantity={normalizedQuantity}
          outputs={outputs}
          onOutputChange={onOutputChange}
          variableLabelMap={variableLabelMap}
        />
      )}

      {/* Ungrouped formula outputs */}
      {ungroupedFormulaOutputs.length > 0 && (
        <Box mt={2} border="1px solid" borderColor="gray.100" rounded="lg" overflow="hidden">
          <Flex
            align="center" gap={1.5} px={3} py={2}
            cursor="pointer"
            onClick={() => setOutputsOpen((o) => !o)}
            _hover={{ bg: "gray.50" }}
            transition="background 0.1s"
          >
            <Box color="gray.400" flexShrink={0}>
              {outputsOpen ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
            </Box>
            <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wider">
              Formula Outputs
            </Text>
          </Flex>
          {outputsOpen && (
            <Box px={3} pt={1} pb={2}>
              {ungroupedFormulaOutputs.map(({ id, label, value, formula }) => (
                <FormulaOutputRow
                  key={id}
                  label={label}
                  value={value}
                  formula={formula}
                  variableLabelMap={variableLabelMap}
                  variableValueMap={variableValueMap}
                />
              ))}
            </Box>
          )}
        </Box>
      )}

    </Box>
  );
};

export default RateBuildupInputs;
