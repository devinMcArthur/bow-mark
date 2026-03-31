// client/src/components/pages/developer/CalculatorCanvas/index.tsx
import React, { useMemo, useState } from "react";
import { Box, Flex, Select, Text } from "@chakra-ui/react";
import { useCalculatorTemplates } from "../../../../components/TenderPricing/calculators/storage";
import {
  debugEvaluateTemplate,
} from "../../../../components/TenderPricing/calculators/evaluate";
import { parseEdges } from "./edgeParser";
import CanvasFlow from "./CanvasFlow";
import InspectPanel from "./InspectPanel";

const QUANTITY_DEFAULT = 100;

const CalculatorCanvas: React.FC = () => {
  const { templates } = useCalculatorTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id ?? ""
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const template = templates.find((t) => t.id === selectedTemplateId) ?? templates[0];

  const stepDebug = useMemo(
    () =>
      template
        ? debugEvaluateTemplate(template, template.defaultInputs, QUANTITY_DEFAULT)
        : [],
    [template]
  );

  const edges = useMemo(
    () => (template ? parseEdges(template) : []),
    [template]
  );

  if (templates.length === 0) {
    return (
      <Flex align="center" justify="center" h="400px">
        <Text color="gray.400" fontSize="sm">
          No templates found. Create one in the Calculator Templates tab first.
        </Text>
      </Flex>
    );
  }

  return (
    <Box>
      {/* Template picker */}
      <Flex align="center" gap={3} mb={4}>
        <Text fontSize="sm" color="gray.600" whiteSpace="nowrap" fontWeight="medium">
          Template
        </Text>
        <Select
          size="sm"
          maxW="260px"
          value={selectedTemplateId}
          onChange={(e) => {
            setSelectedTemplateId(e.target.value);
            setSelectedNodeId(null);
          }}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label || t.id}
            </option>
          ))}
        </Select>
      </Flex>

      {/* Canvas + inspect panel */}
      {template && (
        <Flex
          borderWidth={1}
          borderColor="gray.200"
          rounded="lg"
          overflow="hidden"
          h="700px"
        >
          {/* Canvas */}
          <Box flex={1} h="100%" bg="#0f172a">
            <CanvasFlow
              template={template}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          </Box>

          {/* Inspect panel */}
          <Box
            w="260px"
            flexShrink={0}
            borderLeft="1px solid"
            borderColor="gray.200"
            h="100%"
            overflowY="auto"
            bg="white"
          >
            <InspectPanel
              template={template}
              selectedNodeId={selectedNodeId}
              stepDebug={stepDebug}
              edges={edges}
            />
          </Box>
        </Flex>
      )}
    </Box>
  );
};

export default CalculatorCanvas;
