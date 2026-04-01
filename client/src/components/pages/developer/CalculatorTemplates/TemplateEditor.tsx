// client/src/components/pages/developer/CalculatorTemplates/TemplateEditor.tsx
import React from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  IconButton,
  Input,
  Text,
} from "@chakra-ui/react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import {
  CalculatorTemplate,
  ParameterDef,
  TableDef,
  FormulaStep,
  BreakdownDef,
  IntermediateDef,
} from "../../../../components/TenderPricing/calculators/types";

interface TemplateEditorProps {
  template: CalculatorTemplate;
  onChange: (updated: CalculatorTemplate) => void;
}

// Generic editable row helper
const FieldRow: React.FC<{
  fields: { label: string; value: string; placeholder?: string; mono?: boolean; wide?: boolean }[];
  onChange: (index: number, value: string) => void;
  onDelete: () => void;
}> = ({ fields, onChange, onDelete }) => (
  <Flex gap={2} align="center" mb={1}>
    {fields.map((f, i) => (
      <Input
        key={i}
        size="xs"
        value={f.value}
        placeholder={f.placeholder}
        fontFamily={f.mono ? "mono" : undefined}
        flex={f.wide ? 2 : 1}
        onChange={(e) => onChange(i, e.target.value)}
      />
    ))}
    <IconButton
      aria-label="Delete"
      icon={<FiTrash2 />}
      size="xs"
      variant="ghost"
      colorScheme="red"
      onClick={onDelete}
    />
  </Flex>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text fontSize="10px" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" color="gray.400" mb={2} mt={5}>
    {children}
  </Text>
);

const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, onChange }) => {
  const patch = (partial: Partial<CalculatorTemplate>) =>
    onChange({ ...template, ...partial });

  // ── Parameters ────────────────────────────────────────────────────────────

  const updateParam = (i: number, field: keyof ParameterDef, value: string) => {
    const updated = template.parameterDefs.map((p, idx) =>
      idx === i
        ? { ...p, [field]: field === "defaultValue" ? parseFloat(value) || 0 : value }
        : p
    );
    patch({ parameterDefs: updated });
  };

  const addParam = () =>
    patch({
      parameterDefs: [
        ...template.parameterDefs,
        { id: "", label: "", defaultValue: 0 },
      ],
    });

  const removeParam = (i: number) =>
    patch({ parameterDefs: template.parameterDefs.filter((_, idx) => idx !== i) });

  // ── Tables ────────────────────────────────────────────────────────────────

  const updateTable = (i: number, field: keyof TableDef, value: string) => {
    const updated = template.tableDefs.map((t, idx) =>
      idx === i ? { ...t, [field]: value } : t
    );
    patch({ tableDefs: updated });
  };

  const addTable = () =>
    patch({
      tableDefs: [...template.tableDefs, { id: "", label: "", rowLabel: "Item" }],
    });

  const removeTable = (i: number) =>
    patch({ tableDefs: template.tableDefs.filter((_, idx) => idx !== i) });

  // ── Formula steps ─────────────────────────────────────────────────────────

  const updateStep = (i: number, field: keyof FormulaStep, value: string) => {
    const updated = template.formulaSteps.map((s, idx) =>
      idx === i ? { ...s, [field]: value } : s
    );
    patch({ formulaSteps: updated });
  };

  const addStep = () =>
    patch({ formulaSteps: [...template.formulaSteps, { id: "", formula: "" }] });

  const removeStep = (i: number) =>
    patch({ formulaSteps: template.formulaSteps.filter((_, idx) => idx !== i) });

  // ── Breakdown ─────────────────────────────────────────────────────────────

  const updateBreakdown = (i: number, field: string, value: string) => {
    const updated = template.breakdownDefs.map((b, idx) =>
      idx !== i ? b : { ...b, [field]: value }
    );
    patch({ breakdownDefs: updated });
  };

  const addBreakdown = () =>
    patch({ breakdownDefs: [...template.breakdownDefs, { id: "", label: "", items: [] }] });

  const removeBreakdown = (i: number) =>
    patch({ breakdownDefs: template.breakdownDefs.filter((_, idx) => idx !== i) });

  // ── Intermediates ─────────────────────────────────────────────────────────

  const updateIntermediate = (i: number, field: keyof IntermediateDef, value: string) => {
    const updated = template.intermediateDefs.map((im, idx) =>
      idx === i ? { ...im, [field]: value } : im
    );
    patch({ intermediateDefs: updated });
  };

  const addIntermediate = () =>
    patch({ intermediateDefs: [...template.intermediateDefs, { label: "", stepId: "", unit: "" }] });

  const removeIntermediate = (i: number) =>
    patch({ intermediateDefs: template.intermediateDefs.filter((_, idx) => idx !== i) });

  return (
    <Box h="100%" overflowY="auto" p={4}>
      {/* Basic info */}
      <SectionLabel>Basic Info</SectionLabel>
      <Grid templateColumns="1fr 1fr 80px" gap={2} mb={2}>
        <Box>
          <Text fontSize="10px" color="gray.500" mb={1}>ID (slug)</Text>
          <Input size="xs" fontFamily="mono" value={template.id} onChange={(e) => patch({ id: e.target.value })} placeholder="paving" />
        </Box>
        <Box>
          <Text fontSize="10px" color="gray.500" mb={1}>Label</Text>
          <Input size="xs" value={template.label} onChange={(e) => patch({ label: e.target.value })} placeholder="Paving" />
        </Box>
        <Box>
          <Text fontSize="10px" color="gray.500" mb={1}>Default Unit</Text>
          <Input size="xs" value={template.defaultUnit} onChange={(e) => patch({ defaultUnit: e.target.value })} placeholder="m²" />
        </Box>
      </Grid>

      {/* Parameters */}
      <SectionLabel>Parameters</SectionLabel>
      <Grid templateColumns="auto auto auto auto auto auto" mb={1}>
        {["id", "label", "prefix", "suffix", "default", ""].map((h) => (
          <Text key={h} fontSize="9px" color="gray.400" fontWeight="600" textTransform="uppercase" px={1}>{h}</Text>
        ))}
      </Grid>
      {template.parameterDefs.map((p, i) => (
        <FieldRow
          key={i}
          fields={[
            { label: "id", value: p.id, placeholder: "depthMm", mono: true },
            { label: "label", value: p.label, placeholder: "Depth" },
            { label: "prefix", value: p.prefix ?? "", placeholder: "$" },
            { label: "suffix", value: p.suffix ?? "", placeholder: "mm" },
            { label: "default", value: String(p.defaultValue), placeholder: "0" },
          ]}
          onChange={(fi, v) => {
            const fields: (keyof ParameterDef)[] = ["id", "label", "prefix", "suffix", "defaultValue"];
            updateParam(i, fields[fi], v);
          }}
          onDelete={() => removeParam(i)}
        />
      ))}
      <Button size="xs" variant="ghost" leftIcon={<FiPlus />} color="gray.500" onClick={addParam}>
        Add parameter
      </Button>

      {/* Tables */}
      <SectionLabel>Tables</SectionLabel>
      <Grid templateColumns="auto auto auto auto" mb={1}>
        {["id", "label", "row label", ""].map((h) => (
          <Text key={h} fontSize="9px" color="gray.400" fontWeight="600" textTransform="uppercase" px={1}>{h}</Text>
        ))}
      </Grid>
      {template.tableDefs.map((t, i) => (
        <FieldRow
          key={i}
          fields={[
            { label: "id", value: t.id, placeholder: "labour", mono: true },
            { label: "label", value: t.label, placeholder: "Labour" },
            { label: "rowLabel", value: t.rowLabel, placeholder: "Role" },
          ]}
          onChange={(fi, v) => {
            const fields: (keyof TableDef)[] = ["id", "label", "rowLabel"];
            updateTable(i, fields[fi], v);
          }}
          onDelete={() => removeTable(i)}
        />
      ))}
      <Button size="xs" variant="ghost" leftIcon={<FiPlus />} color="gray.500" onClick={addTable}>
        Add table
      </Button>

      {/* Formula steps */}
      <SectionLabel>Formula Steps</SectionLabel>
      <Text fontSize="10px" color="gray.400" mb={2}>
        Available vars: parameter ids · <code>{"{tableId}"}RatePerHr</code> · prior step ids · <code>quantity</code>
      </Text>
      {template.formulaSteps.map((s, i) => (
        <FieldRow
          key={i}
          fields={[
            { label: "id", value: s.id, placeholder: "tonnesPerM2", mono: true },
            { label: "formula", value: s.formula, placeholder: "depthMm * 0.00245", mono: true, wide: true },
          ]}
          onChange={(fi, v) => updateStep(i, fi === 0 ? "id" : "formula", v)}
          onDelete={() => removeStep(i)}
        />
      ))}
      <Button size="xs" variant="ghost" leftIcon={<FiPlus />} color="gray.500" onClick={addStep}>
        Add step
      </Button>

      {/* Breakdown */}
      <SectionLabel>Breakdown</SectionLabel>
      {template.breakdownDefs.map((b, i) => (
        <Box key={i} mb={2} pl={1} borderLeft="2px solid" borderColor="green.200">
          <FieldRow
            fields={[
              { label: "id", value: b.id, placeholder: "material", mono: true },
              { label: "label", value: b.label, placeholder: "Material" },
            ]}
            onChange={(fi, v) => {
              const fields = ["id", "label"];
              updateBreakdown(i, fields[fi], v);
            }}
            onDelete={() => removeBreakdown(i)}
          />
        </Box>
      ))}
      <Button size="xs" variant="ghost" leftIcon={<FiPlus />} color="gray.500" onClick={addBreakdown}>
        Add breakdown category
      </Button>

      {/* Intermediates */}
      <SectionLabel>Intermediates (footnotes)</SectionLabel>
      {template.intermediateDefs.map((im, i) => (
        <FieldRow
          key={i}
          fields={[
            { label: "label", value: im.label, placeholder: "Total tonnes" },
            { label: "stepId", value: im.stepId, placeholder: "totalTonnes", mono: true },
            { label: "unit", value: im.unit, placeholder: "t" },
          ]}
          onChange={(fi, v) => {
            const fields: (keyof IntermediateDef)[] = ["label", "stepId", "unit"];
            updateIntermediate(i, fields[fi], v);
          }}
          onDelete={() => removeIntermediate(i)}
        />
      ))}
      <Button size="xs" variant="ghost" leftIcon={<FiPlus />} color="gray.500" onClick={addIntermediate}>
        Add intermediate
      </Button>
    </Box>
  );
};

export default TemplateEditor;
