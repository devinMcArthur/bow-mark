// client/src/components/pages/developer/CalculatorCanvas/InspectPanel.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Flex, Text, Badge, Button, Divider, VStack,
  Input, Select, Grid, IconButton,
} from "@chakra-ui/react";
import { v4 as uuidv4 } from "uuid";
import FormulaEditor from "./FormulaEditor";
import { Edge } from "reactflow";
import {
  TableDef,
  RateEntry,
} from "../../../../components/TenderPricing/calculators/types";
import { CanvasDocument, GroupDef, ControllerDef, ControllerOption, UnitVariant } from "./canvasStorage";
import { CANONICAL_UNITS, unitLabel } from "../../../../constants/units";
import { slugify, renameNodeId, nextSlugId } from "./canvasOps";
import { formulaToLatex } from "./formulaToLatex";
import katex from "katex";
import { StepDebugInfo } from "../../../../components/TenderPricing/calculators/evaluate";
import MaterialSearch from "../../../Search/MaterialSearch";
import { useMaterialsCardQuery, useCrewKindsQuery, RateBuildupOutputKind } from "../../../../generated/graphql";

interface Props {
  template: CanvasDocument;
  selectedNodeId: string | null;
  stepDebug: StepDebugInfo[];
  edges: Edge[];
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}

type NodeKind = "param" | "table" | "quantity" | "formula" | "breakdown" | "unitPrice" | "output" | "group" | "controller" | "unknown";

const KIND_COLORS: Record<NodeKind, string> = {
  param: "blue", table: "green", quantity: "yellow",
  formula: "purple", breakdown: "teal", unitPrice: "cyan", output: "pink",
  group: "purple", controller: "teal", unknown: "gray",
};
const KIND_LABELS: Record<NodeKind, string> = {
  param: "Parameter", table: "Table Aggregate", quantity: "Quantity (test input)",
  formula: "Formula Step", breakdown: "Summary", unitPrice: "Unit Price Output", output: "Demand Output",
  group: "Group", controller: "Controller", unknown: "Unknown",
};

function detectKind(nodeId: string, template: CanvasDocument): NodeKind {
  if (nodeId === "quantity") return "quantity";
  if (nodeId === "unitPrice") return "unitPrice";
  if (template.parameterDefs.some((p) => p.id === nodeId)) return "param";
  if (template.tableDefs.some((t) => `${t.id}RatePerHr` === nodeId)) return "table";
  if (template.formulaSteps.some((s) => s.id === nodeId)) return "formula";
  if (template.breakdownDefs.some((b) => b.id === nodeId)) return "breakdown";
  if (template.outputDefs.some((o) => o.id === nodeId)) return "output";
  if (template.groupDefs.some((g) => g.id === nodeId)) return "group";
  if ((template.controllerDefs ?? []).some((c) => c.id === nodeId)) return "controller";
  return "unknown";
}

// ─── Generic editable field ───────────────────────────────────────────────────

const EditField: React.FC<{
  label: string;
  value: string;
  type?: "text" | "number";
  placeholder?: string;
  mono?: boolean;
  onBlur: (val: string) => void;
}> = ({ label, value, type = "text", placeholder, mono, onBlur }) => {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <Box mb={3}>
      <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
        {label}
      </Text>
      <Input
        size="sm"
        type={type}
        value={local}
        placeholder={placeholder}
        fontFamily={mono ? "mono" : undefined}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onBlur(local)}
      />
    </Box>
  );
};

// ─── Table rows editor ────────────────────────────────────────────────────────

const TableInspect: React.FC<{
  tableDef: TableDef;
  rows: RateEntry[];
  doc: CanvasDocument;
  onUpdateDoc: (doc: CanvasDocument) => void;
}> = ({ tableDef, rows, doc, onUpdateDoc }) => {
  const [localRows, setLocalRows] = useState<RateEntry[]>(rows);
  useEffect(() => setLocalRows(rows), [rows]);
  const focusRowId = useRef<string | null>(null);

  const save = (updatedRows: RateEntry[]) => {
    onUpdateDoc({
      ...doc,
      tableDefs: doc.tableDefs.map((t) =>
        t.id === tableDef.id ? { ...t, defaultRows: updatedRows } : t
      ),
    });
  };

  const handleChange = (rowId: string, field: "name" | "qty" | "ratePerHour", raw: string) => {
    setLocalRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, [field]: field === "name" ? raw : parseFloat(raw) || 0 }
          : r
      )
    );
  };

  const addRow = () => {
    const newId = uuidv4();
    focusRowId.current = newId;
    const newRows = [...localRows, { id: newId, name: "New Item", qty: 1, ratePerHour: 0 }];
    setLocalRows(newRows);
    save(newRows);
  };

  const removeRow = (rowId: string) => {
    const newRows = localRows.filter((r) => r.id !== rowId);
    setLocalRows(newRows);
    save(newRows);
  };

  const total = localRows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);

  return (
    <Box mt={2}>
      <Grid templateColumns="1fr 44px 56px 18px" gap={1} mb={1}>
        <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase">{tableDef.rowLabel}</Text>
        <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase">Qty</Text>
        <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase">$/hr</Text>
        <Box />
      </Grid>
      {localRows.map((row) => (
        <Grid key={row.id} templateColumns="1fr 44px 56px 18px" gap={1} mb={1} alignItems="center">
          <Input size="xs" value={row.name} px={1} fontFamily="mono"
            ref={(el) => { if (el && focusRowId.current === row.id) { el.focus(); el.select(); focusRowId.current = null; } }}
            onChange={(e) => handleChange(row.id, "name", e.target.value)}
            onBlur={() => save(localRows)} />
          <Input size="xs" type="number" value={row.qty} px={1} textAlign="right" fontFamily="mono"
            onChange={(e) => handleChange(row.id, "qty", e.target.value)}
            onBlur={() => save(localRows)} />
          <Input size="xs" type="number" value={row.ratePerHour} px={1} textAlign="right" fontFamily="mono"
            onChange={(e) => handleChange(row.id, "ratePerHour", e.target.value)}
            onBlur={() => save(localRows)} />
          <IconButton
            aria-label="Remove row"
            icon={<span style={{ fontSize: 10 }}>✕</span>}
            size="xs"
            variant="ghost"
            colorScheme="red"
            minW="18px"
            h="18px"
            onClick={() => removeRow(row.id)}
          />
        </Grid>
      ))}
      <Divider my={2} />
      <Grid templateColumns="1fr auto" alignItems="center">
        <Text fontSize="xs" fontWeight="semibold" color="gray.500">Total</Text>
        <Text fontSize="xs" fontWeight="700" color="green.700" fontFamily="mono">${total.toFixed(2)}/hr</Text>
      </Grid>
      <Button size="xs" variant="ghost" colorScheme="green" mt={2} onClick={addRow} w="full">
        + Add Row
      </Button>
    </Box>
  );
};

// ─── Per-kind edit sections ───────────────────────────────────────────────────

const ParamEdit: React.FC<{
  doc: CanvasDocument;
  nodeId: string;
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}> = ({ doc, nodeId, onUpdateDoc }) => {
  const param = doc.parameterDefs.find((p) => p.id === nodeId)!;

  const saveField = (updates: { label?: string; suffix?: string | undefined; defaultValue?: number; hint?: string | undefined }) => {
    // defaultValue is now stored directly on the ParameterDef
    onUpdateDoc({ ...doc, parameterDefs: doc.parameterDefs.map((p) => p.id === nodeId ? { ...p, ...updates } : p) });
  };

  const saveLabel = (newLabel: string) => {
    // Update label first, then rename the node's ID to the derived slug if it changed.
    const labeledDoc: CanvasDocument = {
      ...doc,
      parameterDefs: doc.parameterDefs.map((p) => p.id === nodeId ? { ...p, label: newLabel } : p),
    };
    const newSlug = slugify(newLabel);
    if (newSlug !== nodeId) {
      onUpdateDoc(renameNodeId(nodeId, newSlug, labeledDoc), newSlug);
    } else {
      onUpdateDoc(labeledDoc);
    }
  };

  return (
    <>
      <EditField label="Label" value={param.label} onBlur={saveLabel} />
      <EditField label="Suffix" value={param.suffix ?? ""} placeholder="e.g. mm, /t, /hr"
        onBlur={(v) => saveField({ suffix: v || undefined })} />
      <EditField label="Default Value" value={String(param.defaultValue)}
        type="number" mono onBlur={(v) => saveField({ defaultValue: parseFloat(v) || 0 })} />
      <EditField label="Hint" value={param.hint ?? ""} placeholder="Guidance for estimators"
        onBlur={(v) => saveField({ hint: v || undefined })} />
    </>
  );
};

const FormulaEdit: React.FC<{
  doc: CanvasDocument;
  nodeId: string;
  stepDebug: StepDebugInfo[];
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}> = ({ doc, nodeId, stepDebug, onUpdateDoc }) => {
  const step = doc.formulaSteps.find((s) => s.id === nodeId)!;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any pending debounce when this node is deselected (component unmounts)
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleFormulaChange = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateDoc({
        ...doc,
        formulaSteps: doc.formulaSteps.map((s) =>
          s.id === nodeId ? { ...s, formula: val } : s
        ),
      });
    }, 350);
  };

  const saveLabel = (newLabel: string) => {
    const labeledDoc: CanvasDocument = {
      ...doc,
      formulaSteps: doc.formulaSteps.map((s) => s.id === nodeId ? { ...s, label: newLabel || undefined } : s),
    };
    const newSlug = slugify(newLabel);
    if (newLabel && newSlug !== nodeId) {
      onUpdateDoc(renameNodeId(nodeId, newSlug, labeledDoc), newSlug);
    } else {
      onUpdateDoc(labeledDoc);
    }
  };

  const debug = stepDebug.find((s) => s.id === nodeId);

  const availableVars = [
    ...doc.parameterDefs.map((p) => p.id),
    ...doc.tableDefs.map((t) => `${t.id}RatePerHr`),
    "quantity",
    ...doc.formulaSteps.filter((s) => s.id !== nodeId).map((s) => s.id),
    // Percentage and Toggle controllers output a numeric value usable in formulas
    ...(doc.controllerDefs ?? [])
      .filter((c) => c.type === "percentage" || c.type === "toggle")
      .map((c) => c.id),
  ];

  const labelMap: Record<string, string> = useMemo(() => {
    const m: Record<string, string> = { quantity: "Quantity" };
    for (const p of doc.parameterDefs) m[p.id] = p.label;
    for (const t of doc.tableDefs) m[`${t.id}RatePerHr`] = t.label;
    for (const s of doc.formulaSteps) m[s.id] = s.label ?? s.id;
    for (const c of (doc.controllerDefs ?? [])) m[c.id] = c.label;
    return m;
  }, [doc]);

  const katexHtml = useMemo(() => {
    if (!step.formula.trim()) return "";
    try {
      const latex = formulaToLatex(step.formula, labelMap);
      return katex.renderToString(latex, { throwOnError: false, displayMode: true, output: "html" });
    } catch {
      return "";
    }
  }, [step.formula, labelMap]);

  return (
    <>
      <EditField
        label="Label"
        value={step.label ?? ""}
        placeholder="Human-readable name"
        onBlur={saveLabel}
      />

      <Box mb={3}>
        <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
          Formula
        </Text>
        <FormulaEditor
          value={step.formula}
          variables={availableVars}
          onChange={handleFormulaChange}
        />
        <Text fontSize="11px" fontFamily="mono" mt={1}
          color={debug?.error ? "red.500" : "purple.600"}>
          {debug?.error ? `⚠ ${debug.error}` : `= ${debug?.value?.toFixed(6) ?? "—"}`}
        </Text>
      </Box>

      {katexHtml && (
        <Box mb={3}>
          <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Preview
          </Text>
          <Box
            bg="gray.50"
            border="1px solid"
            borderColor="purple.100"
            borderRadius="md"
            px={3}
            py={2}
            overflowX="auto"
            dangerouslySetInnerHTML={{ __html: katexHtml }}
          />
        </Box>
      )}
    </>
  );
};

const BreakdownEdit: React.FC<{
  doc: CanvasDocument;
  nodeId: string;
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}> = ({ doc, nodeId, onUpdateDoc }) => {
  const bd = doc.breakdownDefs.find((b) => b.id === nodeId)!;

  const saveItems = (items: typeof bd.items) => {
    onUpdateDoc({
      ...doc,
      breakdownDefs: doc.breakdownDefs.map((b) => b.id === nodeId ? { ...b, items } : b),
    });
  };

  const saveLabel = (newLabel: string) => {
    const labeledDoc: CanvasDocument = {
      ...doc,
      breakdownDefs: doc.breakdownDefs.map((b) => b.id === nodeId ? { ...b, label: newLabel } : b),
    };
    const newSlug = slugify(newLabel);
    if (newSlug !== nodeId) {
      onUpdateDoc(renameNodeId(nodeId, newSlug, labeledDoc), newSlug);
    } else {
      onUpdateDoc(labeledDoc);
    }
  };

  return (
    <>
      <EditField label="Label" value={bd.label} onBlur={saveLabel} />
      <Box mb={3}>
        <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={2}>
          Items (summed)
        </Text>
        {(bd.items ?? []).map((item, idx) => (
          <Flex key={idx} align="center" gap={1} mb={1}>
            <Select
              size="xs"
              flex={1}
              value={item.stepId}
              onChange={(e) => {
                const next = (bd.items ?? []).map((it, i) => i === idx ? { ...it, stepId: e.target.value } : it);
                saveItems(next);
              }}
            >
              {doc.formulaSteps.map((s) => (
                <option key={s.id} value={s.id}>{s.label ?? s.id}</option>
              ))}
            </Select>
            <IconButton
              aria-label="Remove item"
              icon={<>✕</>}
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={() => saveItems((bd.items ?? []).filter((_, i) => i !== idx))}
            />
          </Flex>
        ))}
        <Button
          size="xs"
          variant="ghost"
          colorScheme="green"
          mt={1}
          onClick={() => {
            const firstStep = doc.formulaSteps[0];
            if (!firstStep) return;
            saveItems([...(bd.items ?? []), { stepId: firstStep.id, label: firstStep.label ?? firstStep.id }]);
          }}
        >
          + Add Item
        </Button>
      </Box>
    </>
  );
};

// ─── Output (Demand) edit ─────────────────────────────────────────────────────

const OutputEdit: React.FC<{
  doc: CanvasDocument;
  nodeId: string;
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}> = ({ doc, nodeId, onUpdateDoc }) => {
  const out = doc.outputDefs.find((o) => o.id === nodeId)!;
  const isCrew = out.kind === "CrewHours";

  const { data: materialsData } = useMaterialsCardQuery();
  const materials = useMemo(() => materialsData?.materials ?? [], [materialsData]);
  const { data: crewKindsData } = useCrewKindsQuery();
  const crewKinds = useMemo(() => crewKindsData?.crewKinds ?? [], [crewKindsData]);

  const allowedMaterials = out.allowedMaterialIds ?? [];
  const allowedCrewKinds = out.allowedCrewKindIds ?? [];
  const materialName = (id: string | undefined) => (id ? materials.find((m) => m._id === id)?.name ?? id : "");
  const crewKindName = (id: string | undefined) => (id ? crewKinds.find((c) => c._id === id)?.name ?? id : "");

  const patch = (updates: Partial<typeof out>) => {
    onUpdateDoc({
      ...doc,
      outputDefs: doc.outputDefs.map((o) => (o.id === nodeId ? { ...o, ...updates } : o)),
    });
  };

  /**
   * Switching kind clears the other kind's fields to avoid stale data. We
   * keep sourceStepId + label + position since those apply regardless of kind.
   */
  const changeKind = (newKind: RateBuildupOutputKind) => {
    if (newKind === out.kind) return;
    if (newKind === RateBuildupOutputKind.CrewHours) {
      patch({
        kind: RateBuildupOutputKind.CrewHours,
        unit: "hr",
        allowedMaterialIds: undefined,
        defaultMaterialId: undefined,
      });
    } else {
      patch({
        kind: RateBuildupOutputKind.Material,
        unit: out.unit || "t",
        allowedCrewKindIds: undefined,
        defaultCrewKindId: undefined,
      });
    }
  };

  const saveLabel = (newLabel: string) => {
    const labeled: CanvasDocument = {
      ...doc,
      outputDefs: doc.outputDefs.map((o) => (o.id === nodeId ? { ...o, label: newLabel } : o)),
    };
    const newSlug = nextSlugId(
      `out_${slugify(newLabel)}`,
      new Set([
        ...doc.outputDefs.filter((o) => o.id !== nodeId).map((o) => o.id),
        ...doc.formulaSteps.map((s) => s.id),
        ...doc.parameterDefs.map((p) => p.id),
        ...doc.tableDefs.map((t) => t.id),
        ...doc.tableDefs.map((t) => `${t.id}RatePerHr`),
        ...doc.breakdownDefs.map((b) => b.id),
        "quantity",
        "unitPrice",
      ])
    );
    if (newSlug !== nodeId) {
      onUpdateDoc(renameNodeId(nodeId, newSlug, labeled), newSlug);
    } else {
      onUpdateDoc(labeled);
    }
  };

  // ── Material whitelist handlers ────────────────────────────────────────────
  const addMaterialToWhitelist = (materialId: string) => {
    if (allowedMaterials.includes(materialId)) return;
    patch({ allowedMaterialIds: [...allowedMaterials, materialId] });
  };

  const removeMaterialFromWhitelist = (materialId: string) => {
    const list = allowedMaterials.filter((id) => id !== materialId);
    const defaultStillValid = out.defaultMaterialId && list.includes(out.defaultMaterialId);
    patch({
      allowedMaterialIds: list.length > 0 ? list : undefined,
      ...(defaultStillValid ? {} : { defaultMaterialId: undefined }),
    });
  };

  const materialCandidates = useMemo(() => {
    const base = allowedMaterials.length > 0
      ? materials.filter((m) => allowedMaterials.includes(m._id))
      : materials;
    const seen = new Set<string>();
    return base.filter((m) => {
      if (seen.has(m._id)) return false;
      seen.add(m._id);
      return true;
    });
  }, [allowedMaterials, materials]);

  // ── CrewKind whitelist handlers ────────────────────────────────────────────
  const toggleCrewKindInWhitelist = (crewKindId: string) => {
    const has = allowedCrewKinds.includes(crewKindId);
    if (has) {
      const list = allowedCrewKinds.filter((id) => id !== crewKindId);
      const defaultStillValid = out.defaultCrewKindId && list.includes(out.defaultCrewKindId);
      patch({
        allowedCrewKindIds: list.length > 0 ? list : undefined,
        ...(defaultStillValid ? {} : { defaultCrewKindId: undefined }),
      });
    } else {
      patch({ allowedCrewKindIds: [...allowedCrewKinds, crewKindId] });
    }
  };

  const crewKindCandidates = useMemo(() => {
    const base = allowedCrewKinds.length > 0
      ? crewKinds.filter((c) => allowedCrewKinds.includes(c._id))
      : crewKinds;
    const seen = new Set<string>();
    return base.filter((c) => {
      if (seen.has(c._id)) return false;
      seen.add(c._id);
      return true;
    });
  }, [allowedCrewKinds, crewKinds]);

  return (
    <>
      <EditField label="Label" value={out.label ?? ""} placeholder={isCrew ? "Operator" : "Asphalt"} onBlur={saveLabel} />

      {/* Kind discriminator — switches between material and crew hours */}
      <Box mb={3}>
        <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
          Kind
        </Text>
        <Select
          size="sm"
          value={out.kind}
          onChange={(e) => changeKind(e.target.value as RateBuildupOutputKind)}
        >
          <option value="Material">Material</option>
          <option value="CrewHours">Crew Hours</option>
        </Select>
      </Box>

      {/* Source step picker */}
      <Box mb={3}>
        <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
          Source Formula Step
        </Text>
        <Select
          size="sm"
          value={out.sourceStepId}
          onChange={(e) => patch({ sourceStepId: e.target.value })}
          placeholder="— pick formula —"
        >
          {doc.formulaSteps.map((s) => (
            <option key={s.id} value={s.id}>{s.label ?? s.id}</option>
          ))}
        </Select>
      </Box>

      {/* Unit dropdown — hidden for crewHours (implicitly "hr") */}
      {!isCrew && (
        <Box mb={3}>
          <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Unit
          </Text>
          <Select size="sm" value={out.unit} onChange={(e) => patch({ unit: e.target.value })}>
            {CANONICAL_UNITS.map((u) => (
              <option key={u.code} value={u.code}>{u.label} ({u.code})</option>
            ))}
          </Select>
        </Box>
      )}

      {/* ── MATERIAL kind: whitelist + default ─────────────────────────────── */}
      {!isCrew && (
        <>
          <Box mb={3}>
            <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
              Allowed Materials
            </Text>
            <Text fontSize="10px" color="gray.500" mb={2}>
              Leave empty to allow any material. Otherwise, the estimator can only pick from this list.
            </Text>
            {(out.allowedMaterialIds ?? []).length > 0 && (
              <Flex wrap="wrap" gap={1} mb={2}>
                {(out.allowedMaterialIds ?? []).map((id) => (
                  <Badge
                    key={id}
                    colorScheme="pink"
                    variant="subtle"
                    cursor="pointer"
                    px={2}
                    py={1}
                    onClick={() => removeMaterialFromWhitelist(id)}
                    title="Click to remove"
                  >
                    {materialName(id)} ✕
                  </Badge>
                ))}
              </Flex>
            )}
            <MaterialSearch
              materialSelected={(m) => addMaterialToWhitelist(m._id)}
              key={(out.allowedMaterialIds ?? []).length}
            />
          </Box>

          <Box mb={3}>
            <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
              Default Material (optional)
            </Text>
            <Select
              size="sm"
              value={out.defaultMaterialId ?? ""}
              onChange={(e) => patch({ defaultMaterialId: e.target.value || undefined })}
              placeholder="— none —"
            >
              {materialCandidates.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </Select>
            {allowedMaterials.length > 0 && materialCandidates.length === 0 && (
              <Text fontSize="10px" color="gray.500" mt={1}>
                Loading materials…
              </Text>
            )}
          </Box>
        </>
      )}

      {/* ── CREW HOURS kind: whitelist + default ───────────────────────────── */}
      {isCrew && (
        <>
          <Box mb={3}>
            <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
              Allowed Crew Kinds
            </Text>
            <Text fontSize="10px" color="gray.500" mb={2}>
              Leave empty to allow any crew kind. Otherwise, the estimator can only pick from this list.
            </Text>
            {(out.allowedCrewKindIds ?? []).length > 0 && (
              <Flex wrap="wrap" gap={1} mb={2}>
                {(out.allowedCrewKindIds ?? []).map((id) => (
                  <Badge
                    key={id}
                    colorScheme="teal"
                    variant="subtle"
                    cursor="pointer"
                    px={2}
                    py={1}
                    onClick={() => toggleCrewKindInWhitelist(id)}
                    title="Click to remove"
                  >
                    {crewKindName(id)} ✕
                  </Badge>
                ))}
              </Flex>
            )}
            {/*
              Simple picker: render all crew kinds NOT already in the whitelist.
              Unlike materials (40+ items needing search), crew kinds are typically
              fewer than 10, so a plain Select is plenty.
            */}
            {crewKinds.filter((c) => !allowedCrewKinds.includes(c._id)).length > 0 && (
              <Select
                size="sm"
                value=""
                placeholder="+ Add crew kind"
                onChange={(e) => {
                  if (e.target.value) toggleCrewKindInWhitelist(e.target.value);
                }}
              >
                {crewKinds
                  .filter((c) => !allowedCrewKinds.includes(c._id))
                  .map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
              </Select>
            )}
            {crewKinds.length === 0 && (
              <Text fontSize="10px" color="orange.500" mt={1}>
                No crew kinds defined yet — add them in Settings → Crew Kinds.
              </Text>
            )}
          </Box>

          <Box mb={3}>
            <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
              Default Crew Kind (optional)
            </Text>
            <Select
              size="sm"
              value={out.defaultCrewKindId ?? ""}
              onChange={(e) => patch({ defaultCrewKindId: e.target.value || undefined })}
              placeholder="— none —"
            >
              {crewKindCandidates.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </Select>
          </Box>
        </>
      )}
    </>
  );
};

const ControllerEdit: React.FC<{
  doc: CanvasDocument;
  nodeId: string;
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}> = ({ doc, nodeId, onUpdateDoc }) => {
  const ctrl = (doc.controllerDefs ?? []).find((c) => c.id === nodeId)!;
  const [newOptionLabel, setNewOptionLabel] = useState("");

  const updateCtrl = (updates: Partial<ControllerDef>) => {
    onUpdateDoc({
      ...doc,
      controllerDefs: doc.controllerDefs.map((c) =>
        c.id === nodeId ? { ...c, ...updates } : c
      ),
    });
  };

  const saveLabel = (newLabel: string) => {
    const takenIds = new Set([
      ...doc.parameterDefs.map((p) => p.id),
      ...doc.tableDefs.map((t) => t.id),
      ...doc.tableDefs.map((t) => `${t.id}RatePerHr`),
      ...doc.formulaSteps.map((s) => s.id),
      ...doc.breakdownDefs.map((b) => b.id),
      ...(doc.controllerDefs ?? []).filter((c) => c.id !== nodeId).map((c) => c.id),
      ...(doc.groupDefs ?? []).map((g) => g.id),
      "quantity", "unitPrice",
    ]);
    const newSlug = nextSlugId(`${slugify(newLabel)}_${ctrl.type}`, takenIds);
    const labeledDoc: CanvasDocument = {
      ...doc,
      controllerDefs: doc.controllerDefs.map((c) =>
        c.id === nodeId ? { ...c, label: newLabel } : c
      ),
    };
    if (newSlug !== nodeId) {
      onUpdateDoc(renameNodeId(nodeId, newSlug, labeledDoc), newSlug);
    } else {
      onUpdateDoc(labeledDoc);
    }
  };

  return (
    <>
      <EditField
        label="Label"
        value={ctrl.label}
        onBlur={saveLabel}
      />

      <Box mb={3}>
        <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
          Type
        </Text>
        <Text fontSize="sm" fontFamily="mono" color="teal.600">{ctrl.type}</Text>
      </Box>

      {/* Percentage default value */}
      {ctrl.type === "percentage" && (
        <EditField
          label="Default Value (0–1)"
          value={String(ctrl.defaultValue ?? 0.5)}
          type="number"
          mono
          onBlur={(v) => updateCtrl({ defaultValue: Math.min(1, Math.max(0, parseFloat(v) || 0)) })}
        />
      )}

      {/* Toggle default */}
      {ctrl.type === "toggle" && (
        <Box mb={3}>
          <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Default
          </Text>
          <Select
            size="sm"
            value={ctrl.defaultValue ? "true" : "false"}
            onChange={(e) => updateCtrl({ defaultValue: e.target.value === "true" })}
          >
            <option value="false">OFF (false)</option>
            <option value="true">ON (true)</option>
          </Select>
        </Box>
      )}

      {/* Selector / singleSelect options */}
      {(ctrl.type === "selector" || ctrl.type === "singleSelect") && (
        <Box mb={3}>
          <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={2}>
            Options
          </Text>
          {(ctrl.options ?? []).map((opt) => (
            <Flex key={opt.id} align="center" gap={1} mb={1}>
              <Input
                size="xs"
                flex={1}
                value={opt.label}
                onChange={(e) => {
                  const newOptions = (ctrl.options ?? []).map((o) =>
                    o.id === opt.id ? { ...o, label: e.target.value } : o
                  );
                  updateCtrl({ options: newOptions });
                }}
              />
              <IconButton
                aria-label="Remove option"
                icon={<span style={{ fontSize: 10 }}>✕</span>}
                size="xs"
                variant="ghost"
                colorScheme="red"
                minW="18px"
                h="18px"
                onClick={() => {
                  const newOptions = (ctrl.options ?? []).filter((o) => o.id !== opt.id);
                  const newSelected = (ctrl.defaultSelected ?? []).filter((id) => id !== opt.id);
                  updateCtrl({ options: newOptions, defaultSelected: newSelected });
                }}
              />
            </Flex>
          ))}
          <Flex gap={1} mt={1}>
            <Input
              size="xs"
              flex={1}
              placeholder="New option label"
              value={newOptionLabel}
              onChange={(e) => setNewOptionLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newOptionLabel.trim()) {
                  const newOpt: ControllerOption = {
                    id: slugify(newOptionLabel) + "_" + Date.now(),
                    label: newOptionLabel.trim(),
                  };
                  updateCtrl({ options: [...(ctrl.options ?? []), newOpt] });
                  setNewOptionLabel("");
                }
              }}
            />
            <Button
              size="xs"
              colorScheme="teal"
              variant="ghost"
              onClick={() => {
                if (!newOptionLabel.trim()) return;
                const newOpt: ControllerOption = {
                  id: slugify(newOptionLabel) + "_" + Date.now(),
                  label: newOptionLabel.trim(),
                };
                updateCtrl({ options: [...(ctrl.options ?? []), newOpt] });
                setNewOptionLabel("");
              }}
            >
              Add
            </Button>
          </Flex>

          {/* Default selected */}
          {(ctrl.options ?? []).length > 0 && (
            <Box mt={3}>
              <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={1}>
                Default Selected
              </Text>
              {(ctrl.options ?? []).map((opt) => {
                const isSelected = (ctrl.defaultSelected ?? []).includes(opt.id);
                return (
                  <Flex key={opt.id} align="center" gap={2} mb={1} cursor="pointer"
                    onClick={() => {
                      const isSingle = ctrl.type === "singleSelect";
                      const newSelected = isSelected
                        ? (ctrl.defaultSelected ?? []).filter((id) => id !== opt.id)
                        : isSingle ? [opt.id] : [...(ctrl.defaultSelected ?? []), opt.id];
                      updateCtrl({ defaultSelected: newSelected });
                    }}
                  >
                    <Box w={3} h={3} border="1px solid" borderColor={isSelected ? "teal.400" : "gray.300"}
                      bg={isSelected ? "teal.400" : "transparent"} rounded={ctrl.type === "singleSelect" ? "full" : "sm"} />
                    <Text fontSize="xs" color="gray.600">{opt.label}</Text>
                  </Flex>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      <EditField label="Hint" value={ctrl.hint ?? ""} placeholder="Guidance for estimators"
        onBlur={(v) => updateCtrl({ hint: v || undefined })} />
    </>
  );
};

const GroupEdit: React.FC<{
  doc: CanvasDocument;
  nodeId: string;
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}> = ({ doc, nodeId, onUpdateDoc }) => {
  const group = doc.groupDefs.find((g) => g.id === nodeId)!;
  const controllers = doc.controllerDefs ?? [];

  const saveLabel = (newLabel: string) => {
    onUpdateDoc({
      ...doc,
      groupDefs: doc.groupDefs.map((g) => g.id === nodeId ? { ...g, label: newLabel } : g),
    });
  };

  const setActivation = (activation: typeof group.activation) => {
    onUpdateDoc({
      ...doc,
      groupDefs: doc.groupDefs.map((g) => g.id === nodeId ? { ...g, activation } : g),
    });
  };

  const ctrl = group.activation
    ? controllers.find((c) => c.id === group.activation!.controllerId)
    : undefined;

  return (
    <>
      <EditField label="Label" value={group.label} onBlur={saveLabel} />

      <Divider mb={3} />

      <Text fontSize="10px" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb={2}>
        Controlled By
      </Text>

      <Box mb={3}>
        <Text fontSize="10px" color="gray.400" mb={1}>Controller</Text>
        <Select
          size="sm"
          value={group.activation?.controllerId ?? ""}
          onChange={(e) => {
            if (!e.target.value) {
              setActivation(undefined);
            } else {
              setActivation({ controllerId: e.target.value });
            }
          }}
        >
          <option value="">— None (always active) —</option>
          {controllers.map((c) => (
            <option key={c.id} value={c.id}>{c.label} ({c.type})</option>
          ))}
        </Select>
      </Box>

      {/* Condition field for percentage/toggle */}
      {ctrl && (ctrl.type === "percentage" || ctrl.type === "toggle") && (
        <Box mb={3}>
          <Text fontSize="10px" color="gray.400" mb={1}>
            Active when (e.g. {ctrl.type === "percentage" ? "> 0" : "=== 1"})
          </Text>
          <Input
            size="sm"
            fontFamily="mono"
            placeholder={ctrl.type === "percentage" ? "> 0" : "=== 1"}
            value={group.activation?.condition ?? ""}
            onChange={(e) =>
              setActivation(group.activation ? { ...group.activation, condition: e.target.value } : { controllerId: ctrl!.id, condition: e.target.value })
            }
          />
        </Box>
      )}

      {/* Option selector for selector / singleSelect type */}
      {ctrl && (ctrl.type === "selector" || ctrl.type === "singleSelect") && (
        <Box mb={3}>
          <Text fontSize="10px" color="gray.400" mb={1}>Active when option</Text>
          <Select
            size="sm"
            value={group.activation?.optionId ?? ""}
            onChange={(e) =>
              setActivation(group.activation ? { ...group.activation, optionId: e.target.value || undefined } : { controllerId: ctrl!.id, optionId: e.target.value || undefined })
            }
          >
            <option value="">— Pick option —</option>
            {(ctrl.options ?? []).map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </Select>
        </Box>
      )}
    </>
  );
};

const TableLabelEdit: React.FC<{
  doc: CanvasDocument;
  nodeId: string;
  onUpdateDoc: (doc: CanvasDocument, newSelectedId?: string) => void;
}> = ({ doc, nodeId, onUpdateDoc }) => {
  const tId = nodeId.replace(/RatePerHr$/, "");
  const tableDef = doc.tableDefs.find((t) => t.id === tId)!;

  const saveLabel = (newLabel: string) => {
    // The canvas node ID for a table is `${tableBaseId}RatePerHr`.
    // Rename the base ID; renameNodeId handles both the base and the RatePerHr variant.
    const labeledDoc: CanvasDocument = {
      ...doc,
      tableDefs: doc.tableDefs.map((t) => t.id === tId ? { ...t, label: newLabel } : t),
    };
    const newSlug = slugify(newLabel);
    const newNodeId = `${newSlug}RatePerHr`;
    if (newSlug !== tId) {
      onUpdateDoc(renameNodeId(nodeId, newNodeId, labeledDoc), newNodeId);
    } else {
      onUpdateDoc(labeledDoc);
    }
  };

  const saveRowLabel = (newRowLabel: string) => {
    onUpdateDoc({
      ...doc,
      tableDefs: doc.tableDefs.map((t) => t.id === tId ? { ...t, rowLabel: newRowLabel } : t),
    });
  };

  return (
    <>
      <EditField label="Label" value={tableDef.label} onBlur={saveLabel} />
      <EditField label="Row Label" value={tableDef.rowLabel} placeholder="e.g. Role, Equipment, Item"
        onBlur={saveRowLabel} />
      <EditField label="Hint" value={tableDef.hint ?? ""} placeholder="Guidance for estimators"
        onBlur={(v) => onUpdateDoc({
          ...doc,
          tableDefs: doc.tableDefs.map((t) => t.id === tId ? { ...t, hint: v || undefined } : t),
        })} />
    </>
  );
};

// ─── Unit Variants Editor ─────────────────────────────────────────────────────

const UnitVariantsEditor: React.FC<{
  doc: CanvasDocument;
  onUpdateDoc: (doc: CanvasDocument) => void;
}> = ({ doc, onUpdateDoc }) => {
  const [unit, setUnit] = useState("");
  const [groupId, setGroupId] = useState("");
  const [formula, setFormula] = useState("");

  const canAdd = unit.trim() !== "" && groupId !== "";

  return (
    <Box>
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={2}>
        Unit Variants
      </Text>
      <Text fontSize="xs" color="gray.400" mb={3}>
        Each variant activates a group and optionally normalises the quantity via a conversion formula.
      </Text>

      {(doc.unitVariants ?? []).map((v, i) => (
        <Box key={i} mb={2} p={2} border="1px solid" borderColor="gray.600" rounded="md">
          <Flex align="center" justify="space-between" mb={1}>
            <Text fontSize="xs" fontWeight="medium" color="gray.300">
              {unitLabel(v.unit)} <Text as="span" color="gray.500">({v.unit})</Text>
            </Text>
            <Box
              as="button"
              fontSize="xs"
              color="red.400"
              _hover={{ color: "red.300" }}
              onClick={() => onUpdateDoc({
                ...doc,
                unitVariants: (doc.unitVariants ?? []).filter((_, j) => j !== i),
              })}
            >
              Remove
            </Box>
          </Flex>
          <Text fontSize="xs" color="gray.500" mb={0.5}>
            Group: {doc.groupDefs.find((g) => g.id === v.activatesGroupId)?.label ?? v.activatesGroupId}
          </Text>
          {v.conversionFormula && (
            <Text fontSize="xs" color="gray.400" fontFamily="mono">{v.conversionFormula}</Text>
          )}
        </Box>
      ))}

      <Box pt={2} borderTop="1px solid" borderColor="gray.700">
        <Text fontSize="10px" fontWeight="semibold" color="gray.500" textTransform="uppercase" mb={1.5}>
          Add Variant
        </Text>
        <Select size="xs" mb={1.5} placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
          {CANONICAL_UNITS.map((u) => (
            <option key={u.code} value={u.code}>{u.label} ({u.code})</option>
          ))}
        </Select>
        <Select size="xs" mb={1.5} placeholder="Activates group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          {doc.groupDefs.filter((g) => !doc.groupDefs.some((pg) => pg.memberIds.includes(g.id))).map((g) => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </Select>
        <Input
          size="xs"
          mb={1.5}
          placeholder="Conversion formula (optional, e.g. quantity / depth_m)"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          fontFamily="mono"
        />
        <Button
          size="xs"
          colorScheme="orange"
          isDisabled={!canAdd}
          onClick={() => {
            onUpdateDoc({
              ...doc,
              unitVariants: [...(doc.unitVariants ?? []), {
                unit: unit.trim(),
                activatesGroupId: groupId,
                conversionFormula: formula.trim() || undefined,
              }],
            });
            setUnit(""); setGroupId(""); setFormula("");
          }}
        >
          Add Variant
        </Button>
      </Box>
    </Box>
  );
};

// ─── Main panel ───────────────────────────────────────────────────────────────

const InspectPanel: React.FC<Props> = ({
  template, selectedNodeId, stepDebug, edges, onUpdateDoc,
}) => {
  if (!selectedNodeId) {
    return (
      <Box p={6} h="100%" display="flex" alignItems="center" justifyContent="center">
        <Text fontSize="sm" color="gray.400">Click a node to inspect</Text>
      </Box>
    );
  }

  const kind = detectKind(selectedNodeId, template);
  const incoming = edges.filter((e) => e.target === selectedNodeId);
  const outgoing = edges.filter((e) => e.source === selectedNodeId);

  const tableDef = kind === "table"
    ? template.tableDefs.find((t) => `${t.id}RatePerHr` === selectedNodeId) ?? null
    : null;

  return (
    <Box p={4} h="100%" overflowY="auto">
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={3}>
        Inspect
      </Text>

      {/* Node ID + type badge */}
      <Text fontFamily="mono" fontWeight="700" fontSize="md" color="gray.800" mb={1}>
        {selectedNodeId}
      </Text>
      <Badge colorScheme={KIND_COLORS[kind]} mb={4} fontSize="10px">
        {KIND_LABELS[kind]}
      </Badge>

      {/* Editable fields per kind */}
      {kind === "param" && (
        <ParamEdit doc={template} nodeId={selectedNodeId} onUpdateDoc={onUpdateDoc} />
      )}
      {kind === "formula" && (
        <FormulaEdit doc={template} nodeId={selectedNodeId} stepDebug={stepDebug} onUpdateDoc={onUpdateDoc} />
      )}
      {kind === "breakdown" && (
        <BreakdownEdit doc={template} nodeId={selectedNodeId} onUpdateDoc={onUpdateDoc} />
      )}
      {kind === "table" && tableDef && (
        <>
          <TableLabelEdit doc={template} nodeId={selectedNodeId} onUpdateDoc={onUpdateDoc} />
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Rows
          </Text>
          <TableInspect
            tableDef={tableDef}
            rows={tableDef.defaultRows ?? []}
            doc={template}
            onUpdateDoc={onUpdateDoc}
          />
          <Box mb={4} />
        </>
      )}
      {kind === "quantity" && (
        <Box>
          <Text fontSize="xs" color="gray.400" mb={4}>
            Simulation input only — quantity is provided by the tender sheet at runtime, not stored in the template.
          </Text>
          <UnitVariantsEditor doc={template} onUpdateDoc={onUpdateDoc} />
        </Box>
      )}
      {kind === "unitPrice" && (
        <Text fontSize="xs" color="gray.400" mb={4}>Derived from all summary nodes. Read-only.</Text>
      )}
      {kind === "output" && (
        <OutputEdit doc={template} nodeId={selectedNodeId} onUpdateDoc={onUpdateDoc} />
      )}
      {kind === "group" && (
        <GroupEdit doc={template} nodeId={selectedNodeId} onUpdateDoc={onUpdateDoc} />
      )}
      {kind === "controller" && (
        <ControllerEdit doc={template} nodeId={selectedNodeId} onUpdateDoc={onUpdateDoc} />
      )}
      {kind === "unknown" && (
        <Text fontSize="xs" color="gray.400" mb={4}>
          Node not found in template. It may have been deleted — try undoing or deselecting.
        </Text>
      )}

      {kind !== "group" && kind !== "controller" && (
        <>
          <Divider mb={4} />

          {/* Receives from */}
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={2}>
            Receives from
          </Text>
          {incoming.length === 0 ? (
            <Text fontSize="xs" color="gray.400" mb={4}>— (source node)</Text>
          ) : (
            <VStack align="stretch" spacing={1} mb={4}>
              {incoming.map((e) => (
                <Text key={e.id} fontSize="xs" fontFamily="mono" color="gray.600">{e.source}</Text>
              ))}
            </VStack>
          )}

          {/* Feeds into */}
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={2}>
            Feeds into
          </Text>
          {outgoing.length === 0 ? (
            <Text fontSize="xs" color="gray.400">— (sink node)</Text>
          ) : (
            <VStack align="stretch" spacing={1}>
              {outgoing.map((e) => (
                <Text key={e.id} fontSize="xs" fontFamily="mono" color="gray.600">{e.target}</Text>
              ))}
            </VStack>
          )}
        </>
      )}
    </Box>
  );
};

export default InspectPanel;
