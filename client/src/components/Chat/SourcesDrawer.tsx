import React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Code,
} from "@chakra-ui/react";

interface ToolResult {
  toolName: string;
  result: string;
}

interface ChatMessage {
  toolResults?: ToolResult[];
}

interface Props {
  message: ChatMessage | null;
}

// ─── Per-tool-result panel ────────────────────────────────────────────────────

function ToolResultPanel({ result }: { result: string }) {
  const [showRaw, setShowRaw] = React.useState(false);

  // Try to parse JSON
  let parsed: unknown = null;
  let parseError = false;
  try {
    parsed = JSON.parse(result);
  } catch {
    parseError = true;
  }

  if (parseError || parsed === null) {
    return (
      <Box>
        <Code
          display="block"
          whiteSpace="pre-wrap"
          fontSize="xs"
          p={3}
          borderRadius="md"
          bg="gray.50"
          border="1px solid"
          borderColor="gray.200"
          overflowX="auto"
          w="full"
        >
          {result}
        </Code>
      </Box>
    );
  }

  // Find top-level array property
  let rows: Record<string, unknown>[] | null = null;
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    for (const key of Object.keys(parsed as Record<string, unknown>)) {
      const val = (parsed as Record<string, unknown>)[key];
      if (Array.isArray(val) && val.length > 0) {
        rows = val as Record<string, unknown>[];
        break;
      }
    }
  } else if (Array.isArray(parsed) && parsed.length > 0) {
    rows = parsed as Record<string, unknown>[];
  }

  // Render table if we have rows with at least one item
  const renderTable = rows !== null && rows.length > 0;
  const columns = renderTable ? Object.keys(rows![0]) : [];

  const renderValue = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) return "[array]";
    if (typeof val === "object") return "[object]";
    return String(val);
  };

  return (
    <Box>
      {renderTable ? (
        <Box overflowX="auto" mb={3}>
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                {columns.map((col) => (
                  <Th key={col} fontSize="xs" textTransform="none" fontFamily="mono">
                    {col}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {rows!.map((row, i) => (
                <Tr key={i}>
                  {columns.map((col) => (
                    <Td key={col} fontSize="xs" fontFamily="mono" whiteSpace="nowrap">
                      {renderValue(row[col])}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      ) : (
        // Key-value rendering
        <Box mb={3}>
          {Object.entries(parsed as Record<string, unknown>).map(([key, val]) => (
            <Box key={key} display="flex" gap={2} mb={1} fontSize="sm">
              <Text as="span" fontWeight="bold" color="gray.700" flexShrink={0}>
                {key}:
              </Text>
              <Text as="span" color="gray.600" fontFamily="mono" fontSize="xs" wordBreak="break-all">
                {renderValue(val)}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Raw JSON toggle */}
      <Button
        variant="ghost"
        size="xs"
        color="gray.500"
        fontWeight="normal"
        onClick={() => setShowRaw((prev) => !prev)}
        mb={showRaw ? 2 : 0}
      >
        {showRaw ? "Hide raw JSON" : "Raw JSON"}
      </Button>
      {showRaw && (
        <Code
          display="block"
          whiteSpace="pre-wrap"
          fontSize="xs"
          p={3}
          borderRadius="md"
          bg="gray.50"
          border="1px solid"
          borderColor="gray.200"
          overflowX="auto"
          w="full"
        >
          {JSON.stringify(parsed, null, 2)}
        </Code>
      )}
    </Box>
  );
}

// ─── SourcesDrawer ────────────────────────────────────────────────────────────

export function SourcesDrawer({ message }: Props) {
  if (!message || !message.toolResults || message.toolResults.length === 0) {
    return null;
  }

  return (
    <Accordion allowMultiple>
      {message.toolResults.map((tr, idx) => (
        <AccordionItem key={idx}>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <Text fontFamily="mono" fontSize="sm" color="gray.700">
                {tr.toolName}
              </Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <ToolResultPanel result={tr.result} />
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
