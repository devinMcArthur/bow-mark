// client/src/components/TenderPricing/TenderDemandTab.tsx
//
// Per-tender Demand rollup. Groups every row's rateBuildupOutputs into two
// sections: Material Demand (by materialId + unit) and Crew Hours (by crewKindId,
// unit implicitly "hr"). Pure client-side reduce over already-loaded sheet data.
// The only network calls are the material and crew kind catalog lookups to
// resolve display names.

import React, { useMemo } from "react";
import { Box, Flex, Text, Table, Thead, Tbody, Tr, Th, Td } from "@chakra-ui/react";
import { TenderPricingSheet } from "./types";
import { unitLabel } from "../../constants/units";
import { useMaterialsCardQuery, useCrewKindsQuery } from "../../generated/graphql";

interface Props {
  sheet: TenderPricingSheet;
}

interface MaterialRollupRow {
  materialId: string | null;   // null = estimator never picked one
  unit: string;
  total: number;
  rowCount: number;
}

interface CrewRollupRow {
  crewKindId: string | null;   // null = estimator never picked one
  total: number;
  rowCount: number;
}

const TenderDemandTab: React.FC<Props> = ({ sheet }) => {
  const { data: materialsData } = useMaterialsCardQuery();
  const materialNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of materialsData?.materials ?? []) map.set(m._id, m.name);
    return map;
  }, [materialsData]);

  const { data: crewKindsData } = useCrewKindsQuery();
  const crewKindNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of crewKindsData?.crewKinds ?? []) map.set(c._id, c.name);
    return map;
  }, [crewKindsData]);

  const { materialRollup, crewRollup } = useMemo(() => {
    // Material rollup key: `${materialId ?? "__none__"}::${unit}` — dual
    // grouping because units are non-additive (tonnes ≠ cubic metres).
    const byMat = new Map<string, MaterialRollupRow>();
    // Crew rollup key: just crewKindId (unit is always hr).
    const byCrew = new Map<string, CrewRollupRow>();

    for (const row of sheet.rows ?? []) {
      for (const out of row.rateBuildupOutputs ?? []) {
        if (!out.totalValue || out.totalValue === 0) continue;

        if (out.kind === "CrewHours") {
          const key = out.crewKindId ?? "__none__";
          const existing = byCrew.get(key);
          if (existing) {
            existing.total += out.totalValue;
            existing.rowCount += 1;
          } else {
            byCrew.set(key, {
              crewKindId: out.crewKindId ?? null,
              total: out.totalValue,
              rowCount: 1,
            });
          }
        } else {
          // material (default / legacy)
          const key = `${out.materialId ?? "__none__"}::${out.unit}`;
          const existing = byMat.get(key);
          if (existing) {
            existing.total += out.totalValue;
            existing.rowCount += 1;
          } else {
            byMat.set(key, {
              materialId: out.materialId ?? null,
              unit: out.unit,
              total: out.totalValue,
              rowCount: 1,
            });
          }
        }
      }
    }

    // Named first (alphabetical), unassigned last
    const materialRollup = Array.from(byMat.values()).sort((a, b) => {
      if (a.materialId === null && b.materialId !== null) return 1;
      if (b.materialId === null && a.materialId !== null) return -1;
      const aName = materialNameById.get(a.materialId ?? "") ?? "";
      const bName = materialNameById.get(b.materialId ?? "") ?? "";
      return aName.localeCompare(bName);
    });
    const crewRollup = Array.from(byCrew.values()).sort((a, b) => {
      if (a.crewKindId === null && b.crewKindId !== null) return 1;
      if (b.crewKindId === null && a.crewKindId !== null) return -1;
      const aName = crewKindNameById.get(a.crewKindId ?? "") ?? "";
      const bName = crewKindNameById.get(b.crewKindId ?? "") ?? "";
      return aName.localeCompare(bName);
    });

    return { materialRollup, crewRollup };
  }, [sheet.rows, materialNameById, crewKindNameById]);

  const isEmpty = materialRollup.length === 0 && crewRollup.length === 0;

  if (isEmpty) {
    return (
      <Flex h="100%" align="center" justify="center" direction="column" gap={2} p={8}>
        <Text fontSize="sm" color="gray.500" fontWeight="medium">
          No demand yet
        </Text>
        <Text fontSize="xs" color="gray.400" textAlign="center" maxW="280px">
          Attach a rate buildup template with Output nodes to any line item, and
          the materials and crew hours you select will roll up here.
        </Text>
      </Flex>
    );
  }

  return (
    <Box p={4} h="100%" overflowY="auto">
      <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={1}>
        Demand Rollup
      </Text>
      <Text fontSize="xs" color="gray.500" mb={4}>
        Rolled up across all line items with a rate buildup attached.
        Quantities × per-unit values.
      </Text>

      {/* ── Material Demand ─────────────────────────────────────────────── */}
      {materialRollup.length > 0 && (
        <Box mb={6}>
          <Text fontSize="xs" fontWeight="semibold" color="purple.600" textTransform="uppercase" letterSpacing="wider" mb={2}>
            Material
          </Text>
          <Box border="1px solid" borderColor="gray.200" rounded="md" overflow="hidden">
            <Table size="sm" variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th fontSize="10px" color="gray.500">Material</Th>
                  <Th fontSize="10px" color="gray.500" isNumeric>Quantity</Th>
                  <Th fontSize="10px" color="gray.500">Unit</Th>
                  <Th fontSize="10px" color="gray.500" isNumeric>Items</Th>
                </Tr>
              </Thead>
              <Tbody>
                {materialRollup.map((r, i) => {
                  const name = r.materialId
                    ? materialNameById.get(r.materialId) ?? "Unknown material"
                    : null;
                  return (
                    <Tr key={i}>
                      <Td>
                        {name ? (
                          <Text fontSize="xs" color="gray.700">{name}</Text>
                        ) : (
                          <Text fontSize="xs" color="orange.500" fontStyle="italic">
                            No material picked
                          </Text>
                        )}
                      </Td>
                      <Td isNumeric fontFamily="mono" fontSize="xs" color="gray.700" fontWeight="600">
                        {r.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Td>
                      <Td fontSize="xs" color="gray.500" fontFamily="mono">
                        {unitLabel(r.unit)}
                      </Td>
                      <Td isNumeric fontSize="xs" color="gray.400">
                        {r.rowCount}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </Box>
      )}

      {/* ── Crew Hours ──────────────────────────────────────────────────── */}
      {crewRollup.length > 0 && (
        <Box>
          <Text fontSize="xs" fontWeight="semibold" color="teal.600" textTransform="uppercase" letterSpacing="wider" mb={2}>
            Crew Hours
          </Text>
          <Box border="1px solid" borderColor="gray.200" rounded="md" overflow="hidden">
            <Table size="sm" variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th fontSize="10px" color="gray.500">Crew Kind</Th>
                  <Th fontSize="10px" color="gray.500" isNumeric>Hours</Th>
                  <Th fontSize="10px" color="gray.500" isNumeric>Items</Th>
                </Tr>
              </Thead>
              <Tbody>
                {crewRollup.map((r, i) => {
                  const name = r.crewKindId
                    ? crewKindNameById.get(r.crewKindId) ?? "Unknown crew kind"
                    : null;
                  return (
                    <Tr key={i}>
                      <Td>
                        {name ? (
                          <Text fontSize="xs" color="gray.700">{name}</Text>
                        ) : (
                          <Text fontSize="xs" color="orange.500" fontStyle="italic">
                            No crew kind picked
                          </Text>
                        )}
                      </Td>
                      <Td isNumeric fontFamily="mono" fontSize="xs" color="gray.700" fontWeight="600">
                        {r.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Td>
                      <Td isNumeric fontSize="xs" color="gray.400">
                        {r.rowCount}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default TenderDemandTab;
