import React, { useState, useMemo } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { TenderPricingSheet, TenderPricingRowType } from "./types";
import { computeRow, formatCurrency } from "./compute";

// ─── Types ────────────────────────────────────────────────────────────────────

type Granularity = "schedule" | "group";

interface SummarySection {
  label: string;
  itemNumber?: string | null;
  type: "schedule" | "group";
  costTotal: number;
  bidTotal: number;
  itemCount: number;
}

// ─── Compute helpers ──────────────────────────────────────────────────────────

function buildSummary(
  sheet: TenderPricingSheet,
  granularity: Granularity
): SummarySection[] {
  const { rows, defaultMarkupPct } = sheet;
  const result: SummarySection[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isSchedule = row.type === TenderPricingRowType.Schedule;
    const isGroup = row.type === TenderPricingRowType.Group;

    if (!isSchedule && !isGroup) continue;
    if (isGroup && granularity === "schedule") continue;

    let costTotal = 0;
    let bidTotal = 0;
    let itemCount = 0;

    for (let j = i + 1; j < rows.length; j++) {
      const child = rows[j];
      if (child.type === TenderPricingRowType.Schedule) break;
      if (child.indentLevel <= row.indentLevel) break;

      if (child.type === TenderPricingRowType.Item) {
        const { lineItemTotal } = computeRow(child, defaultMarkupPct);
        const totalUP = (child.unitPrice ?? 0) + (child.extraUnitPrice ?? 0);
        costTotal += totalUP * (child.quantity ?? 0);
        bidTotal += lineItemTotal;
        itemCount++;
      }
    }

    result.push({
      label: row.description ?? "(unlabeled)",
      itemNumber: row.itemNumber,
      type: isSchedule ? "schedule" : "group",
      costTotal,
      bidTotal,
      itemCount,
    });
  }

  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PricingSummaryProps {
  sheet: TenderPricingSheet;
}

const PricingSummary: React.FC<PricingSummaryProps> = ({ sheet }) => {
  const [granularity, setGranularity] = useState<Granularity>("group");

  const sections = useMemo(
    () => buildSummary(sheet, granularity),
    [sheet, granularity]
  );

  // Grand totals: sum leaf-level sections (groups in group mode, schedules in schedule mode)
  const leafSections = sections.filter((s) =>
    granularity === "schedule" ? s.type === "schedule" : s.type === "group"
  );
  const grandCost = leafSections.reduce((sum, s) => sum + s.costTotal, 0);
  const grandBid = leafSections.reduce((sum, s) => sum + s.bidTotal, 0);
  const grandMarkup =
    grandCost > 0 ? ((grandBid - grandCost) / grandCost) * 100 : 0;

  return (
    <Flex direction="column" h="100%" overflow="hidden">
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        px={4}
        py={2}
        borderBottom="1px solid"
        borderColor="gray.100"
        flexShrink={0}
      >
        <Text fontWeight="semibold" fontSize="sm" color="gray.700">
          Summary
        </Text>
        <ButtonGroup size="xs" isAttached variant="outline">
          <Button
            colorScheme={granularity === "schedule" ? "blue" : "gray"}
            variant={granularity === "schedule" ? "solid" : "outline"}
            onClick={() => setGranularity("schedule")}
          >
            By Schedule
          </Button>
          <Button
            colorScheme={granularity === "group" ? "blue" : "gray"}
            variant={granularity === "group" ? "solid" : "outline"}
            onClick={() => setGranularity("group")}
          >
            By Group
          </Button>
        </ButtonGroup>
      </Flex>

      {/* Table */}
      <Box flex={1} overflowY="auto">
        {sections.length === 0 ? (
          <Box p={8} textAlign="center" color="gray.400">
            <Text fontSize="sm">
              No schedules or groups yet.
            </Text>
          </Box>
        ) : (
          <Table size="sm" variant="simple">
            <Thead position="sticky" top={0} bg="white" zIndex={1}>
              <Tr bg="gray.50">
                <Th>Section</Th>
                <Th isNumeric whiteSpace="nowrap">Cost</Th>
                <Th isNumeric whiteSpace="nowrap" color="blue.600">Bid</Th>
                <Th isNumeric whiteSpace="nowrap">Markup</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sections.map((section, i) => {
                const markup =
                  section.costTotal > 0
                    ? ((section.bidTotal - section.costTotal) / section.costTotal) * 100
                    : 0;
                const isSchedule = section.type === "schedule";

                return (
                  <Tr
                    key={i}
                    bg={isSchedule ? "gray.700" : undefined}
                    _hover={{ bg: isSchedule ? "gray.600" : "gray.50" }}
                  >
                    <Td pl={isSchedule ? 2 : 6}>
                      <Text
                        fontSize="sm"
                        fontWeight={isSchedule ? "semibold" : undefined}
                        color={isSchedule ? "white" : "gray.800"}
                        noOfLines={2}
                      >
                        {section.itemNumber
                          ? `${section.itemNumber} ${section.label}`
                          : section.label}
                      </Text>
                      {!isSchedule && section.itemCount > 0 && (
                        <Text fontSize="xs" color="gray.400">
                          {section.itemCount} item{section.itemCount !== 1 ? "s" : ""}
                        </Text>
                      )}
                    </Td>
                    <Td isNumeric>
                      <Text
                        fontSize="sm"
                        color={isSchedule ? "gray.300" : "gray.700"}
                      >
                        {section.costTotal > 0 ? formatCurrency(section.costTotal) : "—"}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Text
                        fontSize="sm"
                        fontWeight={isSchedule ? "semibold" : "medium"}
                        color={isSchedule ? "white" : "blue.700"}
                      >
                        {section.bidTotal > 0 ? formatCurrency(section.bidTotal) : "—"}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Text
                        fontSize="xs"
                        color={isSchedule ? "gray.400" : "gray.500"}
                      >
                        {markup > 0 ? `${markup.toFixed(1)}%` : "—"}
                      </Text>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Box>

      {/* Footer totals */}
      {sections.length > 0 && (
        <Box
          borderTop="2px solid"
          borderColor="gray.200"
          px={4}
          py={3}
          bg="gray.50"
          flexShrink={0}
        >
          <Flex justify="space-between" align="center">
            <Text fontSize="xs" color="gray.500" fontWeight="medium">
              TOTAL
            </Text>
            <Flex gap={6}>
              <Box textAlign="right">
                <Text fontSize="xs" color="gray.500">Cost</Text>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                  {formatCurrency(grandCost)}
                </Text>
              </Box>
              <Box textAlign="right">
                <Text fontSize="xs" color="blue.500">Bid</Text>
                <Text fontSize="sm" fontWeight="bold" color="blue.700">
                  {formatCurrency(grandBid)}
                </Text>
              </Box>
              <Box textAlign="right">
                <Text fontSize="xs" color="gray.500">Markup</Text>
                <Text fontSize="sm" fontWeight="semibold" color="gray.600">
                  {grandMarkup > 0 ? `${grandMarkup.toFixed(1)}%` : "—"}
                </Text>
              </Box>
            </Flex>
          </Flex>
        </Box>
      )}
    </Flex>
  );
};

export default PricingSummary;
