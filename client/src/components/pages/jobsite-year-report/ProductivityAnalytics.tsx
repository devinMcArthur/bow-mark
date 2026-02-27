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
  IconButton,
  Link,
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
} from "@chakra-ui/react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import NextLink from "next/link";
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  MaterialGrouping,
  MaterialProductivity,
  useJobsiteProductivityQuery,
} from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
import createLink from "../../../utils/createLink";
import Card from "../../Common/Card";

// Color palette for trend chart lines
const CHART_COLORS = [
  "#3182ce", "#38a169", "#d69e2e", "#e53e3e", "#805ad5",
  "#319795", "#dd6b20", "#d53f8c", "#2b6cb0", "#276749",
];

/**
 * Trend chart showing T/H over time for selected materials
 */
interface IProductivityTrendChart {
  materialProductivity: MaterialProductivity[];
  selectedMaterials: Set<string>;
  getSelectionKey: (mat: MaterialProductivity) => string;
  getDisplayLabel: (mat: MaterialProductivity) => string;
}

const ProductivityTrendChart = ({
  materialProductivity,
  selectedMaterials,
  getSelectionKey,
  getDisplayLabel,
}: IProductivityTrendChart) => {
  // Build chart data: merge all dates from selected materials
  const { chartData, selectedLabels } = React.useMemo(() => {
    const selectedMats = materialProductivity.filter((m) =>
      selectedMaterials.has(getSelectionKey(m))
    );

    if (selectedMats.length === 0) {
      return { chartData: [] as Record<string, string | number>[], selectedLabels: [] as string[] };
    }

    // Collect all unique dates and T/H values
    const dateMap = new Map<string, Record<string, string | number>>();
    const labels: string[] = [];

    selectedMats.forEach((mat) => {
      const label = getDisplayLabel(mat);
      labels.push(label);

      // Use dailyBreakdown if available (cast to any since types may not be generated yet)
      const breakdown = (mat as any).dailyBreakdown;
      if (breakdown && Array.isArray(breakdown)) {
        breakdown.forEach((day: { date: string; tonnesPerHour: number }) => {
          const dateStr = new Date(day.date).toISOString().split("T")[0];
          const existing = dateMap.get(dateStr) || { date: dateStr };
          existing[label] = day.tonnesPerHour;
          dateMap.set(dateStr, existing);
        });
      }
    });

    // Sort by date
    const data = Array.from(dateMap.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );

    return { chartData: data, selectedLabels: labels };
  }, [materialProductivity, selectedMaterials, getSelectionKey, getDisplayLabel]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Box mt={4}>
      <Text fontWeight="bold" fontSize="sm" mb={2} color="gray.600">
        Productivity Trend
      </Text>
      <Box h="250px" w="100%">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(val: string) => {
                const d = new Date(val);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              fontSize={12}
            />
            <YAxis
              label={{ value: "T/H", angle: -90, position: "insideLeft", fontSize: 12 }}
              fontSize={12}
            />
            <Tooltip
              labelFormatter={(val: string) => new Date(val).toLocaleDateString()}
              formatter={(value: number) => [formatNumber(value), "T/H"]}
            />
            <Legend />
            {selectedLabels.map((label, idx) => (
              <Line
                key={label}
                type="monotone"
                dataKey={label}
                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

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
    MaterialGrouping.JobTitle
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

  // Track expanded rows for daily breakdown view
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  // Clear selection and expanded rows when grouping changes
  React.useEffect(() => {
    setSelectedMaterials(new Set());
    setExpandedRows(new Set());
  }, [materialGrouping]);

  const toggleRowExpansion = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

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
  }, [productivity]);

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

              {/* Trend Chart */}
              <ProductivityTrendChart
                materialProductivity={productivity.materialProductivity}
                selectedMaterials={selectedMaterials}
                getSelectionKey={getSelectionKey}
                getDisplayLabel={getDisplayLabel}
              />
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
                </Tr>
              </Thead>
              <Tbody>
                {productivity.materialProductivity.map((mat, idx) => {
                  const selectionKey = getSelectionKey(mat);
                  const isExpanded = expandedRows.has(selectionKey);
                  const colSpan =
                    5 +
                    (materialGrouping === MaterialGrouping.CrewType ? 1 : 0) +
                    (materialGrouping === MaterialGrouping.JobTitle ? 1 : 0);

                  return (
                    <React.Fragment key={idx}>
                      <Tr
                        bg={
                          selectedMaterials.has(selectionKey)
                            ? "blue.50"
                            : undefined
                        }
                        _hover={{ bg: "gray.50" }}
                      >
                        <Td>
                          <HStack spacing={1}>
                            <Checkbox
                              isChecked={selectedMaterials.has(selectionKey)}
                              onChange={() => toggleMaterial(selectionKey)}
                            />
                            <IconButton
                              aria-label={isExpanded ? "Collapse" : "Expand"}
                              icon={isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                              size="xs"
                              variant="ghost"
                              onClick={() => toggleRowExpansion(selectionKey)}
                            />
                          </HStack>
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
                      </Tr>
                      {/* Daily Breakdown Row */}
                      {isExpanded && (
                        <Tr>
                          <Td colSpan={colSpan + 3} p={0} bg="gray.50">
                            <Box p={3} borderTop="1px" borderColor="gray.200">
                              <Text fontWeight="bold" fontSize="sm" mb={2} color="gray.600">
                                Daily Breakdown
                              </Text>
                              {(mat as any).dailyBreakdown?.length > 0 ? (
                                <Table size="sm" variant="simple" bg="white" borderRadius="md">
                                  <Thead>
                                    <Tr>
                                      <Th>Date</Th>
                                      <Th isNumeric>Tonnes</Th>
                                      <Th isNumeric>Crew Hours</Th>
                                      <Th isNumeric>T/H</Th>
                                      <Th>Report</Th>
                                    </Tr>
                                  </Thead>
                                  <Tbody>
                                    {((mat as any).dailyBreakdown as Array<{
                                      date: string;
                                      dailyReportId: string;
                                      tonnes: number;
                                      crewHours: number;
                                      tonnesPerHour: number;
                                    }>).map((day, dayIdx) => (
                                      <Tr key={dayIdx}>
                                        <Td>{new Date(day.date).toLocaleDateString()}</Td>
                                        <Td isNumeric>{formatNumber(day.tonnes)}</Td>
                                        <Td isNumeric>{formatNumber(day.crewHours)}</Td>
                                        <Td isNumeric fontWeight="medium" color="blue.600">
                                          {formatNumber(day.tonnesPerHour)}
                                        </Td>
                                        <Td>
                                          <NextLink
                                            href={createLink.dailyReport(day.dailyReportId)}
                                            passHref
                                          >
                                            <Link color="blue.600" fontSize="sm">
                                              View
                                            </Link>
                                          </NextLink>
                                        </Td>
                                      </Tr>
                                    ))}
                                  </Tbody>
                                </Table>
                              ) : (
                                <Text color="gray.500" fontSize="sm">
                                  No daily breakdown data available. Please restart the server and run codegen.
                                </Text>
                              )}
                            </Box>
                          </Td>
                        </Tr>
                      )}
                    </React.Fragment>
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
