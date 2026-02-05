/**
 * Productivity Analytics Component
 *
 * Displays productivity metrics for a jobsite:
 * - Hours by Labor Type (job title breakdown)
 * - Material Productivity (Tonnes per Hour)
 */

import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Heading,
  HStack,
  Link,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import React from "react";
import {
  MaterialGrouping,
  useJobsiteProductivityQuery,
} from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
import createLink from "../../../utils/createLink";
import Card from "../../Common/Card";

interface IProductivityAnalytics {
  jobsiteMongoId: string;
  year: number;
}

const ProductivityAnalytics = ({
  jobsiteMongoId,
  year,
}: IProductivityAnalytics) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  // Material grouping selection
  const [materialGrouping, setMaterialGrouping] = React.useState<MaterialGrouping>(
    MaterialGrouping.CrewType
  );

  const { data, loading, error } = useJobsiteProductivityQuery({
    variables: {
      jobsiteMongoId,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      includeCrewHoursDetail: false,
      materialGrouping,
    },
  });

  const productivity = data?.jobsiteProductivity;

  // Track selected materials for combined summary (uses composite keys based on grouping)
  const [selectedMaterials, setSelectedMaterials] = React.useState<Set<string>>(
    new Set()
  );

  // Clear selection when grouping changes
  React.useEffect(() => {
    setSelectedMaterials(new Set());
  }, [materialGrouping]);

  // Generate selection key based on grouping dimension
  const getSelectionKey = React.useCallback(
    (mat: { materialName: string; crewType?: string | null; jobTitle?: string | null }) => {
      switch (materialGrouping) {
        case MaterialGrouping.CrewType:
          return `${mat.materialName}|${mat.crewType || "Unknown"}`;
        case MaterialGrouping.JobTitle:
          return `${mat.materialName}|${mat.jobTitle || "Unknown"}`;
        case MaterialGrouping.MaterialOnly:
        default:
          return mat.materialName;
      }
    },
    [materialGrouping]
  );

  // Generate display label for selected items
  const getDisplayLabel = React.useCallback(
    (mat: { materialName: string; crewType?: string | null; jobTitle?: string | null }) => {
      switch (materialGrouping) {
        case MaterialGrouping.CrewType:
          return `${mat.materialName} (${mat.crewType || "Unknown"})`;
        case MaterialGrouping.JobTitle:
          return `${mat.materialName} (${mat.jobTitle || "Unknown"})`;
        case MaterialGrouping.MaterialOnly:
        default:
          return mat.materialName;
      }
    },
    [materialGrouping]
  );

  // Calculate combined summary for selected materials
  const selectedSummary = React.useMemo(() => {
    if (!productivity?.materialProductivity || selectedMaterials.size === 0) {
      return null;
    }

    const selected = productivity.materialProductivity.filter((m) =>
      selectedMaterials.has(getSelectionKey(m))
    );

    const totalTonnes = selected.reduce((sum, m) => sum + m.totalTonnes, 0);
    const totalCrewHours = selected.reduce(
      (sum, m) => sum + m.totalCrewHours,
      0
    );
    const totalShipments = selected.reduce((sum, m) => sum + m.shipmentCount, 0);
    const tonnesPerHour = totalCrewHours > 0 ? totalTonnes / totalCrewHours : 0;

    return {
      count: selected.length,
      names: selected.map((m) => getDisplayLabel(m)),
      totalTonnes,
      totalCrewHours,
      tonnesPerHour,
      totalShipments,
    };
  }, [productivity?.materialProductivity, selectedMaterials, getSelectionKey, getDisplayLabel]);

  const toggleMaterial = (key: string) => {
    setSelectedMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedMaterials(new Set());
  };

  // Group labor hours by crew type for display
  const laborByCrewType = React.useMemo(() => {
    if (!productivity?.laborTypeHours) return {};

    const grouped: Record<
      string,
      typeof productivity.laborTypeHours
    > = {};

    for (const item of productivity.laborTypeHours) {
      if (!grouped[item.crewType]) {
        grouped[item.crewType] = [];
      }
      grouped[item.crewType].push(item);
    }

    return grouped;
  }, [productivity?.laborTypeHours]);

  if (loading) {
    return (
      <Card heading={<Heading size="md">Productivity Analytics</Heading>}>
        <Box display="flex" justifyContent="center" p={4}>
          <Spinner size="md" />
        </Box>
      </Card>
    );
  }

  if (error) {
    return (
      <Card heading={<Heading size="md">Productivity Analytics</Heading>}>
        <Alert status="error" size="sm">
          <AlertIcon />
          Error loading productivity data: {error.message}
        </Alert>
      </Card>
    );
  }

  if (!productivity) {
    return (
      <Card heading={<Heading size="md">Productivity Analytics</Heading>}>
        <Text color="gray.500">No productivity data available</Text>
      </Card>
    );
  }

  const hasMaterialData = productivity.materialProductivity.length > 0;
  const hasLaborData = productivity.laborTypeHours.length > 0;

  return (
    <Stack spacing={4}>
      {/* Overall Productivity Summary */}
      <Card heading={<Heading size="md">Productivity Summary</Heading>}>
        <SimpleGrid columns={[2, 4]} spacing={4}>
          <Stat>
            <StatLabel>Overall T/H</StatLabel>
            <StatNumber color="blue.500">
              {formatNumber(productivity.overallTonnesPerHour)}
            </StatNumber>
            <StatHelpText>Tonnes per crew hour</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Total Tonnes</StatLabel>
            <StatNumber>{formatNumber(productivity.totalTonnes)}</StatNumber>
            <StatHelpText>All materials</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Total Crew Hours</StatLabel>
            <StatNumber>{formatNumber(productivity.totalCrewHours)}</StatNumber>
            <StatHelpText>Based on max shift per crew</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Materials Tracked</StatLabel>
            <StatNumber>{productivity.materialProductivity.length}</StatNumber>
            <StatHelpText>With tonnes unit</StatHelpText>
          </Stat>
        </SimpleGrid>
      </Card>

      {/* Material Productivity (T/H) */}
      {hasMaterialData && (
        <Card
          heading={
            <HStack justify="space-between" w="100%">
              <Heading size="md">Material Productivity (T/H)</Heading>
              <Select
                size="sm"
                w="200px"
                value={materialGrouping}
                onChange={(e) =>
                  setMaterialGrouping(e.target.value as MaterialGrouping)
                }
              >
                <option value={MaterialGrouping.MaterialOnly}>
                  Group by Material
                </option>
                <option value={MaterialGrouping.CrewType}>
                  Material + Crew Type
                </option>
                <option value={MaterialGrouping.JobTitle}>
                  Material + Job Title
                </option>
              </Select>
            </HStack>
          }
        >
          {/* Selection Summary */}
          {selectedSummary && (
            <Box
              mb={4}
              p={3}
              bg="blue.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="blue.200"
            >
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="bold" color="blue.700">
                  Selected: {selectedSummary.names.join(" + ")}
                </Text>
                <Button size="xs" variant="ghost" onClick={clearSelection}>
                  Clear
                </Button>
              </HStack>
              <SimpleGrid columns={[2, 4]} spacing={3}>
                <Stat size="sm">
                  <StatLabel fontSize="xs">Combined Tonnes</StatLabel>
                  <StatNumber fontSize="md">
                    {formatNumber(selectedSummary.totalTonnes)}
                  </StatNumber>
                </Stat>
                <Stat size="sm">
                  <StatLabel fontSize="xs">Combined Hours</StatLabel>
                  <StatNumber fontSize="md">
                    {formatNumber(selectedSummary.totalCrewHours)}
                  </StatNumber>
                </Stat>
                <Stat size="sm">
                  <StatLabel fontSize="xs">Combined T/H</StatLabel>
                  <StatNumber fontSize="md" color="blue.600" fontWeight="bold">
                    {formatNumber(selectedSummary.tonnesPerHour)}
                  </StatNumber>
                </Stat>
                <Stat size="sm">
                  <StatLabel fontSize="xs">Shipments</StatLabel>
                  <StatNumber fontSize="md">
                    {selectedSummary.totalShipments}
                  </StatNumber>
                </Stat>
              </SimpleGrid>
            </Box>
          )}

          <Box maxH="300px" overflowY="auto">
            <Table size="sm">
              <Thead position="sticky" top={0} bg="white">
                <Tr>
                  <Th w="40px"></Th>
                  <Th>Material</Th>
                  {materialGrouping === MaterialGrouping.CrewType && (
                    <Th>Crew Type</Th>
                  )}
                  {materialGrouping === MaterialGrouping.JobTitle && (
                    <Th>Job Title</Th>
                  )}
                  <Th isNumeric>Tonnes</Th>
                  <Th isNumeric>Crew Hours</Th>
                  <Th isNumeric>T/H</Th>
                  <Th isNumeric>Shipments</Th>
                  <Th>Reports</Th>
                </Tr>
              </Thead>
              <Tbody>
                {productivity.materialProductivity.map((mat, idx) => {
                  const selectionKey = getSelectionKey(mat);
                  return (
                    <Tr
                      key={idx}
                      bg={
                        selectedMaterials.has(selectionKey)
                          ? "blue.50"
                          : undefined
                      }
                      _hover={{ bg: "gray.50" }}
                      cursor="pointer"
                      onClick={() => toggleMaterial(selectionKey)}
                    >
                      <Td>
                        <Checkbox
                          isChecked={selectedMaterials.has(selectionKey)}
                          onChange={() => toggleMaterial(selectionKey)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Td>
                      <Td fontWeight="medium">{mat.materialName}</Td>
                      {materialGrouping === MaterialGrouping.CrewType && (
                        <Td>
                          <Badge colorScheme="purple" fontSize="xs">
                            {mat.crewType || "Unknown"}
                          </Badge>
                        </Td>
                      )}
                      {materialGrouping === MaterialGrouping.JobTitle && (
                        <Td>
                          <Badge colorScheme="teal" fontSize="xs">
                            {mat.jobTitle || "Unknown"}
                          </Badge>
                        </Td>
                      )}
                      <Td isNumeric>{formatNumber(mat.totalTonnes)}</Td>
                      <Td isNumeric>{formatNumber(mat.totalCrewHours)}</Td>
                      <Td isNumeric fontWeight="bold" color="blue.600">
                        {formatNumber(mat.tonnesPerHour)}
                      </Td>
                      <Td isNumeric>{mat.shipmentCount}</Td>
                      <Td onClick={(e) => e.stopPropagation()}>
                        <Popover placement="left" isLazy>
                          <PopoverTrigger>
                            <Button size="xs" variant="link" colorScheme="blue">
                              {mat.dailyReports.length} report
                              {mat.dailyReports.length !== 1 ? "s" : ""}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent w="auto" minW="150px">
                            <PopoverBody>
                              <VStack align="start" spacing={1}>
                                {mat.dailyReports.map((report) => (
                                  <NextLink
                                    key={report.id}
                                    href={createLink.dailyReport(report.id)}
                                    passHref
                                  >
                                    <Link
                                      color="blue.600"
                                      fontSize="sm"
                                      _hover={{ textDecoration: "underline" }}
                                    >
                                      {new Date(report.date).toLocaleDateString()}
                                    </Link>
                                  </NextLink>
                                ))}
                              </VStack>
                            </PopoverBody>
                          </PopoverContent>
                        </Popover>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </Card>
      )}

      {/* Labor Hours by Job Title */}
      {hasLaborData && (
        <Card heading={<Heading size="md">Hours by Labor Type</Heading>}>
          <Stack spacing={4}>
            {Object.entries(laborByCrewType).map(([crewType, items]) => (
              <Box key={crewType}>
                <Badge mb={2} colorScheme="purple" fontSize="sm">
                  {crewType}
                </Badge>
                <Box maxH="250px" overflowY="auto">
                  <Table size="sm">
                    <Thead position="sticky" top={0} bg="white">
                      <Tr>
                        <Th>Job Title</Th>
                        <Th isNumeric>Total Hours</Th>
                        <Th isNumeric>Avg/Day</Th>
                        <Th isNumeric>Days</Th>
                        <Th isNumeric>Employees</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {items.map((item, idx) => (
                        <Tr key={idx}>
                          <Td fontWeight="medium">{item.jobTitle}</Td>
                          <Td isNumeric>{formatNumber(item.totalManHours)}</Td>
                          <Td isNumeric>{formatNumber(item.avgHoursPerDay)}</Td>
                          <Td isNumeric>{item.dayCount}</Td>
                          <Td isNumeric>{item.employeeCount}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            ))}
          </Stack>
        </Card>
      )}

      {!hasMaterialData && !hasLaborData && (
        <Alert status="info">
          <AlertIcon />
          No productivity data found for this year. Make sure there are approved
          daily reports with employee work and material shipments (in tonnes).
        </Alert>
      )}
    </Stack>
  );
};

export default ProductivityAnalytics;
