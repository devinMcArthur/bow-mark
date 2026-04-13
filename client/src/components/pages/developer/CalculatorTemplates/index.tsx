// client/src/components/pages/developer/CalculatorTemplates/index.tsx
import React, { useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { useCalculatorTemplates } from "../../../../components/TenderPricing/calculators/storage";
import {
  CalculatorTemplate,
  CalculatorInputs,
} from "../../../../components/TenderPricing/calculators/types";
import TemplateList from "./TemplateList";
import TemplateEditor from "./TemplateEditor";
import TemplateTestPanel from "./TemplateTestPanel";

const EMPTY_TEMPLATE: CalculatorTemplate = {
  id: "",
  label: "",
  defaultUnit: "m²",
  parameterDefs: [],
  tableDefs: [],
  formulaSteps: [],
  breakdownDefs: [],
  outputDefs: [],
  defaultInputs: { params: {}, tables: {} },
};

const CalculatorTemplates: React.FC = () => {
  const { templates, saveTemplates } = useCalculatorTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(
    templates[0]?.id ?? null
  );

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  const handleNew = () => {
    const draft = { ...EMPTY_TEMPLATE, id: `template-${Date.now()}` };
    saveTemplates([...templates, draft]);
    setSelectedId(draft.id);
  };

  const handleChange = (updated: CalculatorTemplate) => {
    saveTemplates(templates.map((t) => (t.id === selectedId ? updated : t)));
    // If the id field changed, follow it
    if (updated.id !== selectedId) setSelectedId(updated.id);
  };

  const handleUpdateDefaults = (inputs: CalculatorInputs) => {
    if (!selected) return;
    handleChange({ ...selected, defaultInputs: inputs });
  };

  return (
    <Flex borderWidth={1} borderColor="gray.200" rounded="lg" overflow="hidden" minH="600px">
      {/* Left: template list */}
      <Box w="220px" flexShrink={0}>
        <TemplateList
          templates={templates}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={handleNew}
        />
      </Box>

      {/* Right: editor + test panel */}
      {selected ? (
        <Flex flex={1} overflow="hidden">
          {/* Editor (left half) */}
          <Box flex={1} borderRight="1px solid" borderColor="gray.200" overflow="hidden">
            <Box
              px={4}
              py={2}
              borderBottom="1px solid"
              borderColor="gray.100"
              bg="gray.50"
            >
              <Text fontSize="xs" fontWeight="600" color="gray.600">Edit</Text>
            </Box>
            <TemplateEditor template={selected} onChange={handleChange} />
          </Box>

          {/* Test panel (right half) */}
          <Box flex={1} overflow="hidden">
            <Box
              px={4}
              py={2}
              borderBottom="1px solid"
              borderColor="gray.100"
              bg="gray.50"
            >
              <Text fontSize="xs" fontWeight="600" color="gray.600">Live Test</Text>
            </Box>
            <TemplateTestPanel
              template={selected}
              onUpdateDefaults={handleUpdateDefaults}
            />
          </Box>
        </Flex>
      ) : (
        <Flex flex={1} align="center" justify="center">
          <Text color="gray.400" fontSize="sm">Select a template or create a new one</Text>
        </Flex>
      )}
    </Flex>
  );
};

export default CalculatorTemplates;
