// client/src/components/pages/developer/CalculatorCanvas/InspectPanel.tsx
import React from "react";
import { Box, Text, Badge, Code, Divider, VStack } from "@chakra-ui/react";
import { Edge } from "reactflow";
import {
  CalculatorTemplate,
} from "../../../../components/TenderPricing/calculators/types";
import { StepDebugInfo } from "../../../../components/TenderPricing/calculators/evaluate";

interface Props {
  template: CalculatorTemplate;
  selectedNodeId: string | null;
  stepDebug: StepDebugInfo[];
  edges: Edge[];
}

type NodeKind = "param" | "table" | "quantity" | "formula" | "breakdown" | "output";

const KIND_COLORS: Record<NodeKind, string> = {
  param: "blue",
  table: "green",
  quantity: "yellow",
  formula: "purple",
  breakdown: "teal",
  output: "cyan",
};

const KIND_LABELS: Record<NodeKind, string> = {
  param: "Parameter",
  table: "Table Aggregate",
  quantity: "Quantity",
  formula: "Formula Step",
  breakdown: "Breakdown",
  output: "Unit Price Output",
};

function detectKind(nodeId: string, template: CalculatorTemplate): NodeKind {
  if (nodeId === "quantity") return "quantity";
  if (nodeId === "unitPrice") return "output";
  if (template.parameterDefs.some((p) => p.id === nodeId)) return "param";
  if (template.tableDefs.some((t) => `${t.id}RatePerHr` === nodeId)) return "table";
  if (template.formulaSteps.some((s) => s.id === nodeId)) return "formula";
  return "breakdown";
}

function getNodeValue(
  nodeId: string,
  kind: NodeKind,
  template: CalculatorTemplate,
  stepDebug: StepDebugInfo[]
): { display: string; error?: string } {
  if (kind === "param") {
    const p = template.parameterDefs.find((p) => p.id === nodeId)!;
    const val = template.defaultInputs.params[nodeId] ?? p.defaultValue;
    return { display: `${val}${p.suffix ? " " + p.suffix : ""}` };
  }
  if (kind === "table") {
    const tId = nodeId.replace(/RatePerHr$/, "");
    const rows = template.defaultInputs.tables[tId] ?? [];
    const total = rows.reduce((s, r) => s + r.qty * r.ratePerHour, 0);
    return { display: `$${total.toFixed(2)}/hr` };
  }
  if (kind === "quantity") {
    return { display: "100 (default)" };
  }
  if (kind === "formula") {
    const s = stepDebug.find((s) => s.id === nodeId);
    if (!s) return { display: "—" };
    if (s.error) return { display: "error", error: s.error };
    return { display: s.value.toFixed(6) };
  }
  if (kind === "breakdown") {
    const bd = template.breakdownDefs.find((b) => b.id === nodeId)!;
    const s = stepDebug.find((s) => s.id === bd.perUnit);
    return { display: s ? `$${s.value.toFixed(4)}/unit` : "—" };
  }
  // output
  const unitPrice = template.breakdownDefs.reduce((sum, bd) => {
    const s = stepDebug.find((s) => s.id === bd.perUnit);
    return sum + (s?.value ?? 0);
  }, 0);
  return { display: `$${unitPrice.toFixed(2)}` };
}

const InspectPanel: React.FC<Props> = ({
  template,
  selectedNodeId,
  stepDebug,
  edges,
}) => {
  if (!selectedNodeId) {
    return (
      <Box p={6} h="100%" display="flex" alignItems="center" justifyContent="center">
        <Text fontSize="sm" color="gray.400">Click a node to inspect</Text>
      </Box>
    );
  }

  const kind = detectKind(selectedNodeId, template);
  const { display, error } = getNodeValue(selectedNodeId, kind, template, stepDebug);
  const incoming = edges.filter((e) => e.target === selectedNodeId);
  const outgoing = edges.filter((e) => e.source === selectedNodeId);

  // Get formula string for formula nodes
  const formulaStep = kind === "formula"
    ? template.formulaSteps.find((s) => s.id === selectedNodeId)
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

      {/* Formula */}
      {formulaStep && (
        <>
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Formula
          </Text>
          <Code fontSize="xs" p={2} borderRadius="md" display="block" mb={4} bg="purple.50" color="purple.700">
            {formulaStep.formula}
          </Code>
        </>
      )}

      {/* Computed value */}
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1}>
        Value
      </Text>
      {error ? (
        <Text fontSize="sm" color="red.500" fontFamily="mono" mb={4}>⚠ {error}</Text>
      ) : (
        <Text fontSize="sm" fontWeight="600" color="gray.700" fontFamily="mono" mb={4}>{display}</Text>
      )}

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
            <Text key={e.id} fontSize="xs" fontFamily="mono" color="gray.600">
              {e.source}
            </Text>
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
            <Text key={e.id} fontSize="xs" fontFamily="mono" color="gray.600">
              {e.target}
            </Text>
          ))}
        </VStack>
      )}
    </Box>
  );
};

export default InspectPanel;
