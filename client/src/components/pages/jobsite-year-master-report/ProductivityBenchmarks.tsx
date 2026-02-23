/**
 * Productivity Benchmarks Component
 *
 * Compares T/H rates across all jobsites for a year.
 * Supports material grouping by crew type or job title.
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
  Input,
  InputGroup,
  InputLeftElement,
  NumberInput,
  NumberInputField,
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
import { FiSearch, FiChevronUp, FiChevronDown } from "react-icons/fi";
import React from "react";
import NextLink from "next/link";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  MaterialGrouping,
  useProductivityBenchmarksQuery,
} from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
import createLink from "../../../utils/createLink";
import Card from "../../Common/Card";

interface IProductivityBenchmarks {
  year: number;
}

type SortColumn =
  | "jobsiteName"
  | "totalTonnes"
  | "totalCrewHours"
  | "tonnesPerHour"
  | "expectedTonnesPerHour"
  | "shipmentCount"
  | "percentFromAverage"
  | "percentFromExpected";

type SortDirection = "asc" | "desc";

const ProductivityBenchmarks = ({ year }: IProductivityBenchmarks) => {
  const [materialGrouping, setMaterialGrouping] =
    React.useState<MaterialGrouping>(MaterialGrouping.JobTitle);
  const [selectedMaterials, setSelectedMaterials] = React.useState<Set<string>>(
    new Set()
  );
  const [materialSearch, setMaterialSearch] = React.useState("");
  const [sortColumn, setSortColumn] =
    React.useState<SortColumn>("percentFromExpected");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");

  // T/H estimation
  const [tonneEstimate, setTonneEstimate] = React.useState("");

  // Jobsite highlight state
  const [highlightedJobsiteId, setHighlightedJobsiteId] = React.useState<string | null>(null);
  const [jobsiteSearch, setJobsiteSearch] = React.useState("");
  const [showJobsiteDropdown, setShowJobsiteDropdown] = React.useState(false);
  const highlightedRowRef = React.useRef<HTMLTableRowElement>(null);
  const jobsiteSearchRef = React.useRef<HTMLInputElement>(null);

  // Clear selection and search when grouping changes
  React.useEffect(() => {
    setSelectedMaterials(new Set());
    setMaterialSearch("");
  }, [materialGrouping]);

  // Query for filtered results
  const selectedArray = Array.from(selectedMaterials);
  const {
    data,
    loading,
    error,
    previousData,
  } = useProductivityBenchmarksQuery({
    variables: {
      input: {
        year,
        materialGrouping,
        selectedMaterials: selectedArray.length > 0 ? selectedArray : undefined,
      },
    },
  });

  // Use a separate query for available materials that doesn't change with selection
  const { data: materialsData } = useProductivityBenchmarksQuery({
    variables: {
      input: {
        year,
        materialGrouping,
      },
    },
  });

  // Use current data, or fall back to previous data while loading to prevent flicker
  const currentData = data ?? previousData;
  const report = currentData?.productivityBenchmarks;
  const availableMaterials =
    materialsData?.productivityBenchmarks?.availableMaterials || [];

  // Filter materials by search term
  const filteredMaterials = React.useMemo(() => {
    if (!materialSearch.trim()) return availableMaterials;
    const search = materialSearch.toLowerCase();
    return availableMaterials.filter((mat) => {
      const materialMatch = mat.materialName.toLowerCase().includes(search);
      const crewTypeMatch = mat.crewType?.toLowerCase().includes(search);
      const jobTitleMatch = mat.jobTitle?.toLowerCase().includes(search);
      return materialMatch || crewTypeMatch || jobTitleMatch;
    });
  }, [availableMaterials, materialSearch]);

  // Only show initial loading when we have no data at all
  const isInitialLoading = loading && !report;

  // Sort jobsites - must be before early returns to follow Rules of Hooks
  const sortedJobsites = React.useMemo(() => {
    if (!report?.jobsites) return [];
    const jobsites = [...report.jobsites];
    jobsites.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortColumn) {
        case "jobsiteName":
          aVal = a.jobsiteName.toLowerCase();
          bVal = b.jobsiteName.toLowerCase();
          break;
        case "totalTonnes":
          aVal = a.totalTonnes;
          bVal = b.totalTonnes;
          break;
        case "totalCrewHours":
          aVal = a.totalCrewHours;
          bVal = b.totalCrewHours;
          break;
        case "tonnesPerHour":
          aVal = a.tonnesPerHour;
          bVal = b.tonnesPerHour;
          break;
        case "expectedTonnesPerHour":
          aVal = a.expectedTonnesPerHour;
          bVal = b.expectedTonnesPerHour;
          break;
        case "shipmentCount":
          aVal = a.shipmentCount;
          bVal = b.shipmentCount;
          break;
        case "percentFromAverage":
          aVal = a.percentFromAverage;
          bVal = b.percentFromAverage;
          break;
        case "percentFromExpected":
          aVal = a.percentFromExpected;
          bVal = b.percentFromExpected;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return jobsites;
  }, [report?.jobsites, sortColumn, sortDirection]);

  // Filter jobsites by search for dropdown
  const filteredJobsites = React.useMemo(() => {
    if (!jobsiteSearch.trim()) return [];
    const search = jobsiteSearch.toLowerCase();
    return sortedJobsites
      .filter(
        (j) =>
          j.jobsiteName.toLowerCase().includes(search) ||
          j.jobcode?.toLowerCase().includes(search)
      )
      .slice(0, 10); // Limit dropdown results
  }, [sortedJobsites, jobsiteSearch]);

  // Handle jobsite selection
  const selectJobsite = (jobsiteId: string | null) => {
    setHighlightedJobsiteId(jobsiteId);
    setJobsiteSearch("");
    setShowJobsiteDropdown(false);
  };

  // Scroll to highlighted row when it changes
  React.useEffect(() => {
    if (highlightedJobsiteId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedJobsiteId]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        jobsiteSearchRef.current &&
        !jobsiteSearchRef.current.contains(e.target as Node)
      ) {
        setShowJobsiteDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const clearMaterialSelection = () => {
    setSelectedMaterials(new Set());
  };

  const selectAllMaterials = () => {
    // Select all from filtered list (or all if no search)
    const materialsToSelect = materialSearch.trim()
      ? filteredMaterials
      : availableMaterials;
    setSelectedMaterials(new Set(materialsToSelect.map((m) => m.key)));
  };

  if (isInitialLoading) {
    return (
      <Box display="flex" justifyContent="center" p={8}>
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        Error loading productivity benchmarks: {error.message}
      </Alert>
    );
  }

  if (!report) {
    return (
      <Alert status="warning">
        <AlertIcon />
        No productivity data found for {year}. Make sure there are approved
        daily reports with employee work and material shipments.
      </Alert>
    );
  }

  const getDeviationColor = (percent: number) => {
    if (percent >= 20) return "green";
    if (percent >= 5) return "teal";
    if (percent >= -5) return "gray";
    if (percent >= -20) return "orange";
    return "red";
  };

  const getDeviationBadge = (percent: number) => {
    const color = getDeviationColor(percent);
    const prefix = percent > 0 ? "+" : "";
    return (
      <Badge colorScheme={color} fontSize="sm">
        {prefix}
        {percent.toFixed(1)}%
      </Badge>
    );
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to descending for numeric columns
      setSortColumn(column);
      setSortDirection(column === "jobsiteName" ? "asc" : "desc");
    }
  };

  const renderSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? (
      <FiChevronUp style={{ display: "inline", marginLeft: 4 }} />
    ) : (
      <FiChevronDown style={{ display: "inline", marginLeft: 4 }} />
    );
  };

  return (
    <Stack spacing={4}>
      {/* Grouping Control */}
      <Box bg="white" borderRadius="md" shadow="sm" p={4}>
        <HStack spacing={4}>
          <Text fontWeight="medium">Group by:</Text>
          <Select
            size="sm"
            w="220px"
            value={materialGrouping}
            onChange={(e) =>
              setMaterialGrouping(e.target.value as MaterialGrouping)
            }
          >
            <option value={MaterialGrouping.MaterialOnly}>Material Only</option>
            <option value={MaterialGrouping.CrewType}>
              Material + Crew Type
            </option>
            <option value={MaterialGrouping.JobTitle}>
              Material + Job Title
            </option>
          </Select>
        </HStack>
      </Box>

      {/* Material Selection */}
      {availableMaterials.length > 0 && (
        <Card
          heading={
            <HStack justify="space-between" w="100%">
              <Heading size="md">Filter by Materials</Heading>
              <HStack>
                {selectedMaterials.size > 0 && (
                  <Badge colorScheme="blue" fontSize="sm">
                    {selectedMaterials.size} selected
                  </Badge>
                )}
                <Button size="xs" variant="ghost" onClick={selectAllMaterials}>
                  Select All
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={clearMaterialSelection}
                  isDisabled={selectedMaterials.size === 0}
                >
                  Clear
                </Button>
              </HStack>
            </HStack>
          }
        >
          <Text fontSize="sm" color="gray.600" mb={3}>
            Select materials to compare T/H rates across jobsites for only those
            materials.
          </Text>
          <InputGroup size="sm" mb={3}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search materials..."
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
            />
          </InputGroup>
          <Box maxH="250px" overflowY="auto">
            <Table size="sm">
              <Thead position="sticky" top={0} bg="white" zIndex={1}>
                <Tr>
                  <Th w="40px"></Th>
                  <Th>Material</Th>
                  {materialGrouping === MaterialGrouping.CrewType && (
                    <Th>Crew Type</Th>
                  )}
                  {materialGrouping === MaterialGrouping.JobTitle && (
                    <Th>Job Title</Th>
                  )}
                  <Th isNumeric>Total Tonnes</Th>
                  <Th isNumeric>Shipments</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredMaterials.map((mat) => (
                  <Tr
                    key={mat.key}
                    bg={
                      selectedMaterials.has(mat.key) ? "blue.50" : undefined
                    }
                    _hover={{ bg: "gray.50" }}
                    cursor="pointer"
                    onClick={() => toggleMaterial(mat.key)}
                  >
                    <Td>
                      <Checkbox
                        isChecked={selectedMaterials.has(mat.key)}
                        onChange={() => toggleMaterial(mat.key)}
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
                    <Td isNumeric>{mat.shipmentCount}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Card>
      )}

      {/* Summary Stats */}
      <Card
        heading={
          <HStack>
            <Heading size="md">
              Productivity Summary - {year}
              {selectedMaterials.size > 0 && (
                <Badge
                  ml={2}
                  colorScheme="blue"
                  fontSize="sm"
                  fontWeight="normal"
                >
                  Filtered
                </Badge>
              )}
            </Heading>
            {loading && <Spinner size="sm" color="blue.500" />}
          </HStack>
        }
      >
        <SimpleGrid columns={[2, 5]} spacing={4}>
          <Stat>
            <StatLabel>Average T/H</StatLabel>
            <StatNumber color="blue.500">
              {formatNumber(report.averageTonnesPerHour)}
            </StatNumber>
            <StatHelpText>All jobsites</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Total Tonnes</StatLabel>
            <StatNumber>{formatNumber(report.totalTonnes)}</StatNumber>
            <StatHelpText>
              {selectedMaterials.size > 0 ? "Selected materials" : "Delivered"}
            </StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Total Crew Hours</StatLabel>
            <StatNumber>{formatNumber(report.totalCrewHours)}</StatNumber>
            <StatHelpText>Combined</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Jobsites</StatLabel>
            <StatNumber>{report.jobsiteCount}</StatNumber>
            <StatHelpText>With data</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Estimate T/H</StatLabel>
            <NumberInput
              size="sm"
              min={0}
              value={tonneEstimate}
              onChange={(val) => setTonneEstimate(val)}
            >
              <NumberInputField placeholder="Enter tonnes..." />
            </NumberInput>
            {(() => {
              const val = parseFloat(tonneEstimate);
              if (!val || val <= 0) return <StatHelpText>Enter job tonnes</StatHelpText>;
              const estimated =
                report.regression.intercept +
                report.regression.slope * Math.log(val);
              return (
                <StatNumber color="blue.500" fontSize="xl" mt={1}>
                  {estimated > 0 ? estimated.toFixed(2) : "N/A"}{" "}
                  <Text as="span" fontSize="sm" color="gray.500">
                    T/H
                  </Text>
                </StatNumber>
              );
            })()}
          </Stat>
        </SimpleGrid>
      </Card>

      {/* Scatter Plot with Regression Line */}
      {sortedJobsites.length > 0 && (() => {
        // Prepare chart data
        const { intercept, slope } = report.regression;
        const minTonnes = Math.min(...sortedJobsites.map((j) => j.totalTonnes));
        const maxTonnes = Math.max(...sortedJobsites.map((j) => j.totalTonnes));
        const logMin = Math.log(minTonnes);
        const logMax = Math.log(maxTonnes);

        // Generate regression line points
        const regressionPoints = [];
        for (let i = 0; i <= 50; i++) {
          const logVal = logMin + (logMax - logMin) * (i / 50);
          const tonnes = Math.exp(logVal);
          const th = intercept + slope * logVal;
          regressionPoints.push({ x: tonnes, y: th, isRegression: true });
        }

        // Prepare scatter data with color based on performance
        const scatterData = sortedJobsites.map((j) => ({
          x: j.totalTonnes,
          y: j.tonnesPerHour,
          ...j,
        }));

        return (
          <Card
            heading={
              <HStack justify="space-between" w="100%">
                <HStack>
                  <Heading size="md">Job Size vs Productivity</Heading>
                  {loading && <Spinner size="sm" color="blue.500" />}
                </HStack>
                {/* Jobsite search */}
                <Box position="relative" ref={jobsiteSearchRef}>
                  <InputGroup size="sm" w="250px">
                    <InputLeftElement pointerEvents="none">
                      <FiSearch color="gray.400" />
                    </InputLeftElement>
                    <Input
                      placeholder="Find jobsite..."
                      value={jobsiteSearch}
                      onChange={(e) => {
                        setJobsiteSearch(e.target.value);
                        setShowJobsiteDropdown(true);
                      }}
                      onFocus={() => setShowJobsiteDropdown(true)}
                    />
                  </InputGroup>
                  {/* Dropdown */}
                  {showJobsiteDropdown && filteredJobsites.length > 0 && (
                    <Box
                      position="absolute"
                      top="100%"
                      left={0}
                      right={0}
                      bg="white"
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="md"
                      shadow="lg"
                      zIndex={10}
                      maxH="200px"
                      overflowY="auto"
                    >
                      {filteredJobsites.map((j) => (
                        <Box
                          key={j.jobsiteId}
                          p={2}
                          cursor="pointer"
                          _hover={{ bg: "blue.50" }}
                          onClick={() => selectJobsite(j.jobsiteId)}
                        >
                          <Text fontSize="sm" fontWeight="medium">
                            {j.jobsiteName}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {j.jobcode} • {formatNumber(j.totalTonnes)}t •{" "}
                            {j.tonnesPerHour.toFixed(1)} T/H
                          </Text>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </HStack>
            }
          >
            {highlightedJobsiteId && (
              <HStack mb={2}>
                <Badge colorScheme="blue" fontSize="sm">
                  Highlighting:{" "}
                  {sortedJobsites.find((j) => j.jobsiteId === highlightedJobsiteId)
                    ?.jobsiteName}
                </Badge>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => selectJobsite(null)}
                >
                  Clear
                </Button>
              </HStack>
            )}
            <Text fontSize="sm" color="gray.600" mb={4}>
              Each dot is a jobsite. The blue line shows expected T/H based on job
              size. Green dots are outperforming; red dots are underperforming.
            </Text>
            <Box h="400px">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    scale="log"
                    domain={[minTonnes * 0.8, maxTonnes * 1.2]}
                    name="Tonnes"
                    tickFormatter={(val) => formatNumber(val)}
                    label={{
                      value: "Total Tonnes (log scale)",
                      position: "bottom",
                      offset: 0,
                    }}
                  />
                  <YAxis
                    dataKey="y"
                    type="number"
                    name="T/H"
                    domain={[0, "auto"]}
                    tickFormatter={(val) => val.toFixed(1)}
                    label={{
                      value: "Tonnes/Hour",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <ZAxis range={[60, 60]} />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload || payload.length === 0) return null;
                      const data = payload[0]?.payload;
                      if (!data?.jobsiteName) return null;
                      return (
                        <Box
                          bg="white"
                          p={2}
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="md"
                          shadow="md"
                        >
                          <Text fontWeight="bold" fontSize="sm">
                            {data.jobsiteName}
                          </Text>
                          <Text fontSize="xs">
                            Tonnes: {formatNumber(data.totalTonnes)}
                          </Text>
                          <Text fontSize="xs">
                            T/H: {data.tonnesPerHour.toFixed(2)}
                          </Text>
                          <Text fontSize="xs">
                            Expected: {data.expectedTonnesPerHour.toFixed(2)}
                          </Text>
                          <Text
                            fontSize="xs"
                            color={
                              data.percentFromExpected >= 0
                                ? "green.600"
                                : "red.600"
                            }
                          >
                            {data.percentFromExpected >= 0 ? "+" : ""}
                            {data.percentFromExpected.toFixed(1)}% vs expected
                          </Text>
                        </Box>
                      );
                    }}
                  />
                  <ReferenceLine
                    y={report.averageTonnesPerHour}
                    stroke="#718096"
                    strokeDasharray="5 5"
                    label={{
                      value: `Avg: ${report.averageTonnesPerHour.toFixed(1)}`,
                      position: "right",
                      fill: "#718096",
                      fontSize: 12,
                    }}
                  />
                  {/* Regression line as scatter with line shape */}
                  <Scatter
                    data={regressionPoints}
                    line={{ stroke: "#3182ce", strokeWidth: 2 }}
                    shape={() => null}
                    name="Expected T/H"
                    legendType="line"
                  />
                  {/* Jobsite scatter points */}
                  <Scatter data={scatterData} name="Jobsites">
                    {scatterData.map((entry, index) => {
                      const isHighlighted = entry.jobsiteId === highlightedJobsiteId;
                      const baseColor =
                        entry.percentFromExpected >= 0 ? "#38a169" : "#e53e3e";
                      return (
                        <Cell
                          key={index}
                          fill={isHighlighted ? "#3182ce" : baseColor}
                          stroke={isHighlighted ? "#1a365d" : undefined}
                          strokeWidth={isHighlighted ? 3 : 0}
                          r={isHighlighted ? 10 : 6}
                        />
                      );
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </Box>
            <HStack mt={2} spacing={4} justify="center" flexWrap="wrap">
              <HStack>
                <Box w={3} h={3} borderRadius="full" bg="#38a169" />
                <Text fontSize="sm">Above expected</Text>
              </HStack>
              <HStack>
                <Box w={3} h={3} borderRadius="full" bg="#e53e3e" />
                <Text fontSize="sm">Below expected</Text>
              </HStack>
              <HStack>
                <Box w={6} h={0.5} bg="#3182ce" />
                <Text fontSize="sm">Expected T/H (regression)</Text>
              </HStack>
              {highlightedJobsiteId && (
                <HStack>
                  <Box
                    w={3}
                    h={3}
                    borderRadius="full"
                    bg="#3182ce"
                    border="2px solid"
                    borderColor="#1a365d"
                  />
                  <Text fontSize="sm">Selected</Text>
                </HStack>
              )}
            </HStack>
          </Card>
        );
      })()}

      {/* Jobsite Ranking Table */}
      <Card
        heading={
          <HStack>
            <Heading size="md">
              Jobsite Rankings
              {selectedMaterials.size > 0 && (
                <Badge
                  ml={2}
                  colorScheme="blue"
                  fontSize="sm"
                  fontWeight="normal"
                >
                  {selectedMaterials.size} material
                  {selectedMaterials.size > 1 ? "s" : ""}
                </Badge>
              )}
            </Heading>
            {loading && <Spinner size="sm" color="blue.500" />}
          </HStack>
        }
      >
        {sortedJobsites.length === 0 ? (
          <Alert status="info">
            <AlertIcon />
            No jobsites found with productivity data for the selected filters.
          </Alert>
        ) : (
          <Box maxH="500px" overflowY="auto">
            <Table size="sm">
              <Thead position="sticky" top={0} bg="white" zIndex={1}>
                <Tr>
                  <Th w="40px">#</Th>
                  <Th
                    cursor="pointer"
                    onClick={() => handleSort("jobsiteName")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Jobsite
                    {renderSortIndicator("jobsiteName")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("totalTonnes")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Tonnes
                    {renderSortIndicator("totalTonnes")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("totalCrewHours")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Hours
                    {renderSortIndicator("totalCrewHours")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("tonnesPerHour")}
                    _hover={{ bg: "gray.100" }}
                  >
                    T/H
                    {renderSortIndicator("tonnesPerHour")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("expectedTonnesPerHour")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Expected T/H
                    {renderSortIndicator("expectedTonnesPerHour")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("shipmentCount")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Shipments
                    {renderSortIndicator("shipmentCount")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("percentFromAverage")}
                    _hover={{ bg: "gray.100" }}
                  >
                    vs Average
                    {renderSortIndicator("percentFromAverage")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("percentFromExpected")}
                    _hover={{ bg: "gray.100" }}
                  >
                    vs Expected
                    {renderSortIndicator("percentFromExpected")}
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedJobsites.map((jobsite, idx) => {
                  const isHighlighted = jobsite.jobsiteId === highlightedJobsiteId;
                  return (
                    <Tr
                      key={jobsite.jobsiteId}
                      ref={isHighlighted ? highlightedRowRef : undefined}
                      _hover={{ bg: "gray.50" }}
                      bg={
                        isHighlighted
                          ? "blue.100"
                          : jobsite.percentFromExpected >= 20
                          ? "green.50"
                          : jobsite.percentFromExpected <= -20
                          ? "red.50"
                          : undefined
                      }
                      outline={isHighlighted ? "2px solid" : undefined}
                      outlineColor={isHighlighted ? "blue.500" : undefined}
                      cursor="pointer"
                      onClick={() =>
                        selectJobsite(
                          isHighlighted ? null : jobsite.jobsiteId
                        )
                      }
                    >
                      <Td fontWeight="bold" color="gray.500">
                        {idx + 1}
                      </Td>
                      <Td>
                        <NextLink
                          href={createLink.jobsite(jobsite.jobsiteId)}
                          passHref
                        >
                          <Text
                            as="a"
                            fontWeight="medium"
                            color={isHighlighted ? "blue.800" : "blue.600"}
                            _hover={{ textDecoration: "underline" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {jobsite.jobsiteName}
                          </Text>
                        </NextLink>
                        {jobsite.jobcode && (
                          <Text fontSize="xs" color="gray.500">
                            {jobsite.jobcode}
                          </Text>
                        )}
                      </Td>
                      <Td isNumeric>{formatNumber(jobsite.totalTonnes)}</Td>
                      <Td isNumeric>{formatNumber(jobsite.totalCrewHours)}</Td>
                      <Td isNumeric fontWeight="bold" color="blue.600">
                        {formatNumber(jobsite.tonnesPerHour)}
                      </Td>
                      <Td isNumeric color="gray.500">
                        {formatNumber(jobsite.expectedTonnesPerHour)}
                      </Td>
                      <Td isNumeric>{jobsite.shipmentCount}</Td>
                      <Td isNumeric>
                        {getDeviationBadge(jobsite.percentFromAverage)}
                      </Td>
                      <Td isNumeric>
                        {getDeviationBadge(jobsite.percentFromExpected)}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        )}
      </Card>

      {/* Legend */}
      <Box bg="white" borderRadius="md" shadow="sm" p={4}>
        <Text fontSize="sm" color="gray.600" fontWeight="medium" mb={2}>
          Legend
        </Text>
        <HStack spacing={4} wrap="wrap" mb={3}>
          <HStack>
            <Badge colorScheme="green">+20% or more</Badge>
            <Text fontSize="sm">High performer</Text>
          </HStack>
          <HStack>
            <Badge colorScheme="teal">+5% to +20%</Badge>
            <Text fontSize="sm">Above average</Text>
          </HStack>
          <HStack>
            <Badge colorScheme="gray">-5% to +5%</Badge>
            <Text fontSize="sm">Average</Text>
          </HStack>
          <HStack>
            <Badge colorScheme="orange">-20% to -5%</Badge>
            <Text fontSize="sm">Below average</Text>
          </HStack>
          <HStack>
            <Badge colorScheme="red">-20% or less</Badge>
            <Text fontSize="sm">Needs improvement</Text>
          </HStack>
        </HStack>
        <Text fontSize="xs" color="gray.500">
          <strong>vs Average:</strong> Comparison to flat average T/H across all
          jobsites. <strong>vs Expected:</strong> Size-adjusted comparison based
          on job tonnage (larger jobs tend to have higher T/H due to economies
          of scale).
        </Text>
      </Box>
    </Stack>
  );
};

export default ProductivityBenchmarks;
