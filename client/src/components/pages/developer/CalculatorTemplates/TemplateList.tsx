// client/src/components/pages/developer/CalculatorTemplates/TemplateList.tsx
import React from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { FiPlus } from "react-icons/fi";
import { CalculatorTemplate } from "../../../../components/TenderPricing/calculators/types";

interface TemplateListProps {
  templates: CalculatorTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  selectedId,
  onSelect,
  onNew,
}) => (
  <Box borderRight="1px solid" borderColor="gray.200" h="100%" minH="500px">
    <Flex
      px={3}
      py={2}
      align="center"
      justify="space-between"
      borderBottom="1px solid"
      borderColor="gray.100"
    >
      <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="wide">
        Templates
      </Text>
      <Button size="xs" colorScheme="blue" leftIcon={<FiPlus />} onClick={onNew}>
        New
      </Button>
    </Flex>

    {templates.length === 0 && (
      <Text fontSize="sm" color="gray.400" fontStyle="italic" p={3}>
        No templates yet
      </Text>
    )}

    {templates.map((t) => (
      <Box
        key={t.id}
        px={3}
        py={2.5}
        cursor="pointer"
        bg={selectedId === t.id ? "blue.50" : "white"}
        borderBottom="1px solid"
        borderColor="gray.50"
        _hover={{ bg: selectedId === t.id ? "blue.50" : "gray.50" }}
        onClick={() => onSelect(t.id)}
      >
        <Text fontSize="sm" fontWeight={selectedId === t.id ? 600 : 400} color="gray.800">
          {t.label || <Text as="span" color="gray.400" fontStyle="italic">Untitled</Text>}
        </Text>
        <Text fontSize="xs" color="gray.400" fontFamily="mono">
          {t.id || "—"} · {t.defaultUnit || "—"}
        </Text>
      </Box>
    ))}
  </Box>
);

export default TemplateList;
