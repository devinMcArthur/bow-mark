// client/src/components/pages/developer/CalculatorCanvas/LiveTestPanel.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Grid, Input, Text } from "@chakra-ui/react";
import { v4 as uuidv4 } from "uuid";
import { FiChevronDown, FiChevronRight, FiPlus } from "react-icons/fi";
import { CanvasDocument, GroupDef, ControllerDef, isGroupActive, computeInactiveNodeIds } from "./canvasStorage";
import { RateEntry } from "../../../../components/TenderPricing/calculators/types";
import {
  evaluateTemplate,
  debugEvaluateTemplate,
} from "../../../../components/TenderPricing/calculators/evaluate";
import {
  BreakdownCell,
  RateRow,
} from "../../../../components/TenderPricing/calculatorShared";

interface Props {
  doc: CanvasDocument;
  onCollapse: () => void;
}

const copyTables = (tables: Record<string, RateEntry[]>) =>
  Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, [...v]]));

// ─── Param row ────────────────────────────────────────────────────────────────

const ParamRow: React.FC<{
  paramId: string;
  doc: CanvasDocument;
  value: number;
  onChange: (id: string, v: number) => void;
}> = ({ paramId, doc, value, onChange }) => {
  const p = doc.parameterDefs.find((p) => p.id === paramId);
  if (!p) return null;
  return (
    <React.Fragment>
      <Text fontSize="sm" color="gray.700">
        {p.label}
        {p.suffix && (
          <Text as="span" fontSize="xs" color="gray.400">
            {" "}({p.suffix})
          </Text>
        )}
      </Text>
      <Input
        size="sm"
        type="number"
        textAlign="right"
        value={value ?? p.defaultValue}
        onChange={(e) => onChange(p.id, parseFloat(e.target.value) || 0)}
      />
    </React.Fragment>
  );
};

// ─── Table section ────────────────────────────────────────────────────────────

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
      <Flex align="center" justify="space-between" mb={1}>
        <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide">
          {t.label}
        </Text>
        <Text fontSize="xs" color="gray.500">${ratePerHr.toFixed(2)}/hr</Text>
      </Flex>
      <Box borderWidth={1} borderColor="gray.200" rounded="md" overflow="hidden">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#F7FAFC" }}>
              <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 500, color: "#718096" }}>{t.rowLabel}</th>
              <th style={{ textAlign: "center", padding: "4px 4px", fontWeight: 500, color: "#718096", width: "40px" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "64px" }}>$/hr</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500, color: "#718096", width: "64px" }}>Total</th>
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
      <Button size="xs" variant="ghost" leftIcon={<FiPlus />} mt={1} color="gray.500" onClick={() => onAddRow(tableId)}>
        Add
      </Button>
    </Box>
  );
};

function buildControllerDefaults(doc: CanvasDocument): Record<string, number | boolean | string[]> {
  return Object.fromEntries(
    (doc.controllerDefs ?? []).map((c) => [
      c.id,
      c.type === "selector"
        ? (c.defaultSelected ?? [])
        : c.type === "toggle"
        ? (c.defaultValue as boolean ?? false)
        : (c.defaultValue as number ?? 0),
    ])
  );
}

// ─── Controller widget ────────────────────────────────────────────────────────

const ControllerWidget: React.FC<{
  ctrl: ControllerDef;
  value: number | boolean | string[];
  onChange: (id: string, v: number | boolean | string[]) => void;
}> = ({ ctrl, value, onChange }) => {
  if (ctrl.type === "percentage") {
    const pct = (value as number) * 100;
    return (
      <Flex align="center" gap={2} mb={3}>
        <Text fontSize="sm" color="gray.700" flex={1}>
          {ctrl.label}
          <Text as="span" fontSize="xs" color="gray.400"> (%)</Text>
        </Text>
        <Input
          size="sm"
          type="number"
          w="80px"
          min={0}
          max={100}
          textAlign="right"
          value={pct}
          onChange={(e) => onChange(ctrl.id, Math.min(1, Math.max(0, (parseFloat(e.target.value) || 0) / 100)))}
        />
      </Flex>
    );
  }

  if (ctrl.type === "toggle") {
    return (
      <Flex align="center" gap={2} mb={3} cursor="pointer"
        onClick={() => onChange(ctrl.id, !(value as boolean))}
      >
        <Box
          w={4} h={4}
          border="1.5px solid"
          borderColor={(value as boolean) ? "teal.400" : "gray.300"}
          bg={(value as boolean) ? "teal.400" : "transparent"}
          rounded="sm"
        />
        <Text fontSize="sm" color="gray.700">{ctrl.label}</Text>
      </Flex>
    );
  }

  // selector
  const selected = value as string[];
  return (
    <Box mb={3}>
      <Text fontSize="xs" fontWeight="semibold" color="teal.600" textTransform="uppercase" letterSpacing="wide" mb={1}>
        {ctrl.label}
      </Text>
      {(ctrl.options ?? []).map((opt) => {
        const isSelected = selected.includes(opt.id);
        return (
          <Flex key={opt.id} align="center" gap={2} mb={1} cursor="pointer"
            onClick={() => {
              const next = isSelected
                ? selected.filter((id) => id !== opt.id)
                : [...selected, opt.id];
              onChange(ctrl.id, next);
            }}
          >
            <Box
              w={3.5} h={3.5}
              border="1px solid"
              borderColor={isSelected ? "teal.400" : "gray.300"}
              bg={isSelected ? "teal.400" : "transparent"}
              rounded="sm"
              flexShrink={0}
            />
            <Text fontSize="sm" color="gray.700">{opt.label}</Text>
          </Flex>
        );
      })}
    </Box>
  );
};

// ─── Group section (recursive) ────────────────────────────────────────────────

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
}

const GroupSection: React.FC<GroupSectionProps> = ({
  group, depth, doc, params, tables, controllers, onParamChange, onUpdateRow, onAddRow, onRemoveRow, onControllerChange,
}) => {
  const active = isGroupActive(group, doc, controllers);
  const [open, setOpen] = useState(true);

  // Auto-collapse when group becomes inactive
  useEffect(() => {
    if (!active) setOpen(false);
  }, [active]);

  // Collect visible members
  const controllerIds = group.memberIds.filter((id) => (doc.controllerDefs ?? []).some((c) => c.id === id));
  const paramIds = group.memberIds.filter((id) => doc.parameterDefs.some((p) => p.id === id));
  const tableIds = group.memberIds
    .filter((id) => id.endsWith("RatePerHr") && doc.tableDefs.some((t) => `${t.id}RatePerHr` === id))
    .map((id) => id.replace(/RatePerHr$/, ""));
  const subGroupIds = group.memberIds.filter((id) => doc.groupDefs.some((g) => g.id === id));

  // Group controllers with the sub-groups they activate so they render together
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

  const hasVisibleContent = controllerIds.length > 0 || paramIds.length > 0 || tableIds.length > 0 || subGroupIds.length > 0;
  if (!hasVisibleContent) return null;

  const headingColorVal = active
    ? (depth === 0 ? "#4338ca" : "#8b5cf6")
    : "#94a3b8";
  const indent = depth * 12;

  return (
    <Box mb={3} ml={`${indent}px`} opacity={active ? 1 : 0.5}>
      {/* Section heading */}
      <Flex
        align="center"
        gap={1}
        mb={open && active ? 2 : 0}
        borderBottom={open && active ? "1px solid" : "none"}
        borderColor={depth === 0 ? "indigo.100" : "purple.100"}
        pb={open && active ? 1 : 0}
        cursor={active ? "pointer" : "default"}
        onClick={() => { if (active) setOpen((o) => !o); }}
        _hover={active ? { opacity: 0.8 } : {}}
      >
        <Box color={headingColorVal} fontSize="10px">
          {open && active ? <FiChevronDown /> : <FiChevronRight />}
        </Box>
        <Text
          fontSize="xs"
          fontWeight="bold"
          color={headingColorVal}
          textTransform="uppercase"
          letterSpacing="wider"
        >
          {group.label}
        </Text>
        {!active && (
          <Text fontSize="9px" fontWeight="semibold" color="gray.400"
            bg="gray.100" px={1} py={0.5} rounded="sm" ml={1} textTransform="uppercase">
            inactive
          </Text>
        )}
      </Flex>

      {open && active && (
        <>
          {/* Standalone controllers (don't activate any sub-group) */}
          {loneControllerIds.map((id) => {
            const ctrl = (doc.controllerDefs ?? []).find((c) => c.id === id)!;
            return (
              <ControllerWidget
                key={id}
                ctrl={ctrl}
                value={controllers[id] ?? (ctrl.type === "selector" ? [] : ctrl.type === "toggle" ? false : 0)}
                onChange={onControllerChange}
              />
            );
          })}

          {/* Params in this group */}
          {paramIds.length > 0 && (
            <Grid templateColumns="1fr 80px" gap={2} alignItems="center" mb={2}>
              {paramIds.map((id) => (
                <ParamRow key={id} paramId={id} doc={doc} value={params[id]} onChange={onParamChange} />
              ))}
            </Grid>
          )}

          {/* Tables in this group */}
          {tableIds.map((id) => (
            <TableSection key={id} tableId={id} doc={doc} rows={tables[id] ?? []}
              onUpdateRow={onUpdateRow} onAddRow={onAddRow} onRemoveRow={onRemoveRow} />
          ))}

          {/* Controller blocks: controller immediately above the sub-groups it activates */}
          {controllerBlocks.map(({ ctrl, groupIds }) => (
            <Box key={ctrl.id} mb={3} borderLeft="2px solid" borderColor="teal.300" pl={2}>
              <ControllerWidget
                ctrl={ctrl}
                value={controllers[ctrl.id] ?? (ctrl.type === "selector" ? [] : ctrl.type === "toggle" ? false : 0)}
                onChange={onControllerChange}
              />
              {groupIds.map((id) => {
                const subGroup = doc.groupDefs.find((g) => g.id === id)!;
                return (
                  <GroupSection key={id} group={subGroup} depth={depth + 1} doc={doc}
                    params={params} tables={tables} controllers={controllers}
                    onParamChange={onParamChange} onUpdateRow={onUpdateRow}
                    onAddRow={onAddRow} onRemoveRow={onRemoveRow} onControllerChange={onControllerChange} />
                );
              })}
            </Box>
          ))}

          {/* Sub-groups with no controller */}
          {uncontrolledSubGroupIds.map((id) => {
            const subGroup = doc.groupDefs.find((g) => g.id === id)!;
            return (
              <GroupSection key={id} group={subGroup} depth={depth + 1} doc={doc}
                params={params} tables={tables} controllers={controllers}
                onParamChange={onParamChange} onUpdateRow={onUpdateRow}
                onAddRow={onAddRow} onRemoveRow={onRemoveRow} onControllerChange={onControllerChange} />
            );
          })}
        </>
      )}
    </Box>
  );
};

// ─── Main panel ───────────────────────────────────────────────────────────────

const LiveTestPanel: React.FC<Props> = ({ doc, onCollapse }) => {
  const [quantity, setQuantity] = useState(100);
  const [params, setParams] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      doc.parameterDefs.map((p) => [p.id, doc.defaultInputs.params[p.id] ?? p.defaultValue])
    )
  );
  const [tables, setTables] = useState<Record<string, RateEntry[]>>(
    () => copyTables(doc.defaultInputs.tables)
  );
  const [controllers, setControllers] = useState<Record<string, number | boolean | string[]>>(
    () => buildControllerDefaults(doc)
  );

  useEffect(() => {
    setQuantity(100);
    setParams(
      Object.fromEntries(
        doc.parameterDefs.map((p) => [p.id, doc.defaultInputs.params[p.id] ?? p.defaultValue])
      )
    );
    setTables(copyTables(doc.defaultInputs.tables));
    setControllers(buildControllerDefaults(doc));
  }, [doc.id]);

  const inputs = useMemo(() => ({ params, tables }), [params, tables]);

  const controllerValues = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    for (const c of (doc.controllerDefs ?? [])) {
      if (c.type === "percentage") result[c.id] = controllers[c.id] as number ?? 0;
      if (c.type === "toggle") result[c.id] = (controllers[c.id] as boolean) ? 1 : 0;
    }
    return result;
  }, [doc.controllerDefs, controllers]);

  const inactiveNodeIds = useMemo(
    () => computeInactiveNodeIds(doc, controllers),
    [doc, controllers]
  );

  const result = useMemo(
    () => evaluateTemplate(doc, inputs, quantity, controllerValues, inactiveNodeIds),
    [doc, inputs, quantity, controllerValues, inactiveNodeIds]
  );
  const stepDebug = useMemo(
    () => debugEvaluateTemplate(doc, inputs, quantity, controllerValues, inactiveNodeIds),
    [doc, inputs, quantity, controllerValues, inactiveNodeIds]
  );

  const updateParam = useCallback(
    (id: string, v: number) => setParams((prev) => ({ ...prev, [id]: v })),
    []
  );

  const updateRow = (tableId: string, rowId: string, field: keyof RateEntry, value: string | number) => {
    setTables((prev) => ({
      ...prev,
      [tableId]: (prev[tableId] ?? []).map((r) => r.id === rowId ? { ...r, [field]: value } : r),
    }));
  };
  const addRow = (tableId: string) => {
    setTables((prev) => ({
      ...prev,
      [tableId]: [...(prev[tableId] ?? []), { id: uuidv4(), name: "", qty: 1, ratePerHour: 0 }],
    }));
  };
  const removeRow = (tableId: string, rowId: string) => {
    setTables((prev) => ({
      ...prev,
      [tableId]: (prev[tableId] ?? []).filter((r) => r.id !== rowId),
    }));
  };

  // Determine which params/tables/controllers are in any group (member of at least one groupDef)
  const { ungroupedParams, ungroupedTables, topLevelGroups, controllerBlocks, loneControllers, uncontrolledTopGroups } = useMemo(() => {
    const allMemberIds = new Set(doc.groupDefs.flatMap((g) => g.memberIds));
    const topLevelGroups = doc.groupDefs.filter((g) => !allMemberIds.has(g.id));
    const ungroupedControllers = (doc.controllerDefs ?? []).filter((c) => !allMemberIds.has(c.id));
    const ungroupedControllerIds = new Set(ungroupedControllers.map((c) => c.id));

    // Map each ungrouped controller to the top-level groups it activates
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
      topLevelGroups,
      // Controllers that have at least one top-level group — rendered as a block with those groups
      controllerBlocks: ungroupedControllers
        .filter((c) => controllerGroupMap.has(c.id))
        .map((c) => ({ ctrl: c, groups: controllerGroupMap.get(c.id)! })),
      // Controllers with no groups — rendered standalone at top
      loneControllers: ungroupedControllers.filter((c) => !controllerGroupMap.has(c.id)),
      // Top-level groups with no ungrouped controller activation
      uncontrolledTopGroups: topLevelGroups.filter((g) => !groupsWithController.has(g.id)),
    };
  }, [doc]);

  return (
    <Box h="100%" overflowY="auto" bg="white">
      {/* Sticky header */}
      <Flex
        align="center"
        justify="space-between"
        px={3}
        py={2}
        borderBottom="1px solid"
        borderColor="gray.100"
        position="sticky"
        top={0}
        bg="white"
        zIndex={1}
      >
        <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
          Live Test
        </Text>
        <Button
          size="xs"
          variant="ghost"
          onClick={onCollapse}
          aria-label="Collapse live test panel"
          px={1}
          minW="auto"
          color="gray.400"
          _hover={{ color: "gray.600" }}
        >
          «
        </Button>
      </Flex>

      <Box px={3} py={3}>
        {/* Quantity */}
        <Flex align="center" gap={2} mb={4}>
          <Text fontSize="sm" color="gray.600" flex={1}>Quantity</Text>
          <Input
            size="sm"
            type="number"
            w="80px"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            textAlign="right"
          />
          <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">{doc.defaultUnit}</Text>
        </Flex>

        {/* Standalone controllers (no groups) */}
        {loneControllers.length > 0 && (
          <Box mb={4}>
            {loneControllers.map((c) => (
              <ControllerWidget
                key={c.id}
                ctrl={c}
                value={controllers[c.id] ?? (c.type === "selector" ? [] : c.type === "toggle" ? false : 0)}
                onChange={(id, v) => setControllers((prev) => ({ ...prev, [id]: v }))}
              />
            ))}
          </Box>
        )}

        {/* Ungrouped params */}
        {ungroupedParams.length > 0 && (
          <Grid templateColumns="1fr 80px" gap={2} alignItems="center" mb={4}>
            {ungroupedParams.map((p) => (
              <ParamRow
                key={p.id}
                paramId={p.id}
                doc={doc}
                value={params[p.id]}
                onChange={updateParam}
              />
            ))}
          </Grid>
        )}

        {/* Ungrouped tables */}
        {ungroupedTables.map((t) => (
          <TableSection
            key={t.id}
            tableId={t.id}
            doc={doc}
            rows={tables[t.id] ?? []}
            onUpdateRow={updateRow}
            onAddRow={addRow}
            onRemoveRow={removeRow}
          />
        ))}

        {/* Controller blocks: controller widget immediately above the groups it activates */}
        {controllerBlocks.map(({ ctrl, groups }) => (
          <Box key={ctrl.id} mb={3} borderLeft="2px solid" borderColor="teal.300" pl={2}>
            <ControllerWidget
              ctrl={ctrl}
              value={controllers[ctrl.id] ?? (ctrl.type === "selector" ? [] : ctrl.type === "toggle" ? false : 0)}
              onChange={(id, v) => setControllers((prev) => ({ ...prev, [id]: v }))}
            />
            {groups.map((g) => (
              <GroupSection
                key={g.id}
                group={g}
                depth={0}
                doc={doc}
                params={params}
                tables={tables}
                controllers={controllers}
                onParamChange={updateParam}
                onUpdateRow={updateRow}
                onAddRow={addRow}
                onRemoveRow={removeRow}
                onControllerChange={(id, v) => setControllers((prev) => ({ ...prev, [id]: v }))}
              />
            ))}
          </Box>
        ))}

        {/* Top-level groups with no controller */}
        {uncontrolledTopGroups.map((g) => (
          <GroupSection
            key={g.id}
            group={g}
            depth={0}
            doc={doc}
            params={params}
            tables={tables}
            controllers={controllers}
            onParamChange={updateParam}
            onUpdateRow={updateRow}
            onAddRow={addRow}
            onRemoveRow={removeRow}
            onControllerChange={(id, v) => setControllers((prev) => ({ ...prev, [id]: v }))}
          />
        ))}

        {/* Summary breakdown */}
        {result.breakdown.length > 0 && (
          <>
            <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={2}>
              Summary
            </Text>
            <Grid
              templateColumns={`repeat(${result.breakdown.length + 1}, 1fr)`}
              gap={0}
              borderWidth={1}
              borderColor="gray.200"
              rounded="lg"
              overflow="hidden"
              mb={3}
            >
              {result.breakdown.map((cat) => (
                <BreakdownCell key={cat.id} label={cat.label} value={cat.value} borderRight />
              ))}
              <BreakdownCell label="Unit Price" value={result.unitPrice} highlight />
            </Grid>
          </>
        )}

        {/* Formula step debug */}
        {stepDebug.length > 0 && (
          <Box mt={2}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={2}>
              Formula Steps
            </Text>
            <Box borderWidth={1} borderColor="gray.200" rounded="md" overflow="hidden">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ background: "#F7FAFC" }}>
                    <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 600, color: "#718096", fontFamily: "monospace" }}>id</th>
                    <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 600, color: "#718096", fontFamily: "monospace" }}>formula</th>
                    <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600, color: "#718096", width: "80px" }}>value</th>
                  </tr>
                </thead>
                <tbody>
                  {stepDebug.map((s) => (
                    <tr key={s.id} style={{ background: s.error ? "#FFF5F5" : "white", borderTop: "1px solid #EDF2F7" }}>
                      <td style={{ padding: "4px 8px", fontFamily: "monospace", color: s.error ? "#C53030" : "#4A5568" }}>{s.id}</td>
                      <td style={{ padding: "4px 8px", fontFamily: "monospace", color: "#805AD5" }}>
                        {s.formula}
                        {s.error && <span style={{ color: "#C53030", marginLeft: 8, fontFamily: "sans-serif" }}>⚠ {s.error}</span>}
                      </td>
                      <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 600, color: s.error ? "#C53030" : "#1A202C" }}>
                        {s.error ? "—" : s.value.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default LiveTestPanel;
