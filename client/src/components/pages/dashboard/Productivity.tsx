/**
 * Productivity Tab — Business Dashboard
 *
 * Mirrors the Productivity Benchmarks tab from the Year Master Report:
 * - Material grouping selector (Material Only / +Crew Type / +Job Title)
 * - Search + checkbox material filter table
 * - Scatter plot with log-linear regression line (jobsite mode)
 * - Sortable jobsite rankings with vs Average and vs Expected columns
 * - Sortable crew rankings
 */

import React from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonGroup,
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
import { FiChevronDown, FiChevronUp, FiSearch } from "react-icons/fi";
import {
  MaterialGrouping,
  useDashboardProductivityQuery,
} from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
import createLink from "../../../utils/createLink";
import Card from "../../Common/Card";

interface IProductivity {
  startDate: string;
  endDate: string;
}

type ViewMode = "jobsite" | "crew";

type JobsiteSortColumn =
  | "jobcode"
  | "jobsiteName"
  | "totalTonnes"
  | "totalCrewHours"
  | "tonnesPerHour"
  | "expectedTonnesPerHour"
  | "shipmentCount"
  | "percentFromAverage"
  | "percentFromExpected";

type CrewSortColumn =
  | "crewName"
  | "crewType"
  | "totalTonnes"
  | "totalCrewHours"
  | "tonnesPerHour"
  | "dayCount"
  | "jobsiteCount"
  | "percentFromAverage";

type SortDirection = "asc" | "desc";

const getDeviationColor = (pct: number): string => {
  if (pct >= 20) return "green";
  if (pct >= 5) return "teal";
  if (pct >= -5) return "gray";
  if (pct >= -20) return "orange";
  return "red";
};

const getDeviationBadge = (pct: number) => {
  const color = getDeviationColor(pct);
  return (
    <Badge colorScheme={color} fontSize="sm">
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </Badge>
  );
};

const Productivity = ({ startDate, endDate }: IProductivity) => {
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<ViewMode>("jobsite");
  const [materialGrouping, setMaterialGrouping] = React.useState<MaterialGrouping>(
    MaterialGrouping.JobTitle
  );
  const [selectedMaterials, setSelectedMaterials] = React.useState<Set<string>>(
    new Set()
  );
  const [materialSearch, setMaterialSearch] = React.useState("");

  // Jobsite sort state
  const [jobsiteSortCol, setJobsiteSortCol] =
    React.useState<JobsiteSortColumn>("percentFromExpected");
  const [jobsiteSortDir, setJobsiteSortDir] = React.useState<SortDirection>("desc");

  // Crew sort state
  const [crewSortCol, setCrewSortCol] =
    React.useState<CrewSortColumn>("tonnesPerHour");
  const [crewSortDir, setCrewSortDir] = React.useState<SortDirection>("desc");

  // T/H estimation
  const [tonneEstimate, setTonneEstimate] = React.useState("");

  // Jobsite highlight (scatter + table row)
  const [highlightedJobsiteId, setHighlightedJobsiteId] = React.useState<string | null>(null);
  const [jobsiteSearch, setJobsiteSearch] = React.useState("");
  const [showJobsiteDropdown, setShowJobsiteDropdown] = React.useState(false);
  const highlightedRowRef = React.useRef<HTMLTableRowElement>(null);
  const jobsiteSearchRef = React.useRef<HTMLDivElement>(null);

  // In crew mode, always use MATERIAL_ONLY
  const effectiveGrouping =
    viewMode === "crew" ? MaterialGrouping.MaterialOnly : materialGrouping;

  // Reset selections when grouping or view changes
  React.useEffect(() => {
    setSelectedMaterials(new Set());
    setMaterialSearch("");
  }, [materialGrouping, viewMode]);

  const selectedArray = Array.from(selectedMaterials);

  // Primary query (filtered by selected materials)
  const { data, loading, error, previousData } = useDashboardProductivityQuery({
    variables: {
      input: {
        startDate,
        endDate,
        materialGrouping: effectiveGrouping,
        selectedMaterials: selectedArray.length > 0 ? selectedArray : undefined,
      },
    },
  });

  // Separate query for available materials (no filter so panel doesn't collapse)
  const { data: materialsData } = useDashboardProductivityQuery({
    variables: {
      input: {
        startDate,
        endDate,
        materialGrouping: effectiveGrouping,
      },
    },
  });

  const currentData = data ?? previousData;
  const report = currentData?.dashboardProductivity;
  const isInitialLoading = loading && !report;

  const availableMaterials = React.useMemo(
    () => materialsData?.dashboardProductivity?.availableMaterials ?? [],
    [materialsData?.dashboardProductivity?.availableMaterials]
  );

  // Filter material list by search term
  const filteredMaterials = React.useMemo(() => {
    if (!materialSearch.trim()) return availableMaterials;
    const s = materialSearch.toLowerCase();
    return availableMaterials.filter(
      (m) =>
        m.materialName.toLowerCase().includes(s) ||
        m.crewType?.toLowerCase().includes(s) ||
        m.jobTitle?.toLowerCase().includes(s)
    );
  }, [availableMaterials, materialSearch]);

  // Sorted jobsites
  const sortedJobsites = React.useMemo(() => {
    if (!report?.jobsites) return [];
    return [...report.jobsites].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      switch (jobsiteSortCol) {
        case "jobcode":
          aVal = (a.jobcode ?? "").toLowerCase();
          bVal = (b.jobcode ?? "").toLowerCase();
          break;
        case "jobsiteName":
          aVal = a.jobsiteName.toLowerCase();
          bVal = b.jobsiteName.toLowerCase();
          break;
        case "totalTonnes":      aVal = a.totalTonnes;           bVal = b.totalTonnes;           break;
        case "totalCrewHours":   aVal = a.totalCrewHours;        bVal = b.totalCrewHours;        break;
        case "tonnesPerHour":    aVal = a.tonnesPerHour;         bVal = b.tonnesPerHour;         break;
        case "expectedTonnesPerHour": aVal = a.expectedTonnesPerHour; bVal = b.expectedTonnesPerHour; break;
        case "shipmentCount":    aVal = a.shipmentCount;         bVal = b.shipmentCount;         break;
        case "percentFromAverage": aVal = a.percentFromAverage;  bVal = b.percentFromAverage;    break;
        case "percentFromExpected": aVal = a.percentFromExpected; bVal = b.percentFromExpected;  break;
        default: return 0;
      }
      if (aVal < bVal) return jobsiteSortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return jobsiteSortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [report?.jobsites, jobsiteSortCol, jobsiteSortDir]);

  // Sorted crews
  const sortedCrews = React.useMemo(() => {
    if (!report?.crews) return [];
    return [...report.crews].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      switch (crewSortCol) {
        case "crewName":   aVal = a.crewName.toLowerCase(); bVal = b.crewName.toLowerCase(); break;
        case "crewType":   aVal = a.crewType.toLowerCase(); bVal = b.crewType.toLowerCase(); break;
        case "totalTonnes":    aVal = a.totalTonnes;    bVal = b.totalTonnes;    break;
        case "totalCrewHours": aVal = a.totalCrewHours; bVal = b.totalCrewHours; break;
        case "tonnesPerHour":  aVal = a.tonnesPerHour ?? -Infinity; bVal = b.tonnesPerHour ?? -Infinity; break;
        case "dayCount":       aVal = a.dayCount;       bVal = b.dayCount;       break;
        case "jobsiteCount":   aVal = a.jobsiteCount;   bVal = b.jobsiteCount;   break;
        case "percentFromAverage": aVal = a.percentFromAverage ?? -Infinity; bVal = b.percentFromAverage ?? -Infinity; break;
        default: return 0;
      }
      if (aVal < bVal) return crewSortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return crewSortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [report?.crews, crewSortCol, crewSortDir]);

  // Jobsite search for scatter highlight
  const filteredJobsitesForSearch = React.useMemo(() => {
    if (!jobsiteSearch.trim()) return [];
    const s = jobsiteSearch.toLowerCase();
    return sortedJobsites
      .filter(
        (j) =>
          j.jobsiteName.toLowerCase().includes(s) ||
          j.jobcode?.toLowerCase().includes(s)
      )
      .slice(0, 10);
  }, [sortedJobsites, jobsiteSearch]);

  // Scroll to highlighted row
  React.useEffect(() => {
    if (highlightedJobsiteId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedJobsiteId]);

  // Close jobsite dropdown on outside click
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (jobsiteSearchRef.current && !jobsiteSearchRef.current.contains(e.target as Node)) {
        setShowJobsiteDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleMaterial = (key: string) => {
    setSelectedMaterials((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAllMaterials = () => {
    const toSelect = materialSearch.trim() ? filteredMaterials : availableMaterials;
    setSelectedMaterials(new Set(toSelect.map((m) => m.key)));
  };

  const selectJobsite = (id: string | null) => {
    setHighlightedJobsiteId(id);
    setJobsiteSearch("");
    setShowJobsiteDropdown(false);
  };

  const handleJobsiteSort = (col: JobsiteSortColumn) => {
    if (col === jobsiteSortCol) {
      setJobsiteSortDir(jobsiteSortDir === "asc" ? "desc" : "asc");
    } else {
      setJobsiteSortCol(col);
      setJobsiteSortDir(col === "jobsiteName" || col === "jobcode" ? "asc" : "desc");
    }
  };

  const renderJobsiteIndicator = (col: JobsiteSortColumn) => {
    if (col !== jobsiteSortCol) return null;
    return jobsiteSortDir === "asc" ? (
      <FiChevronUp style={{ display: "inline", marginLeft: 4 }} />
    ) : (
      <FiChevronDown style={{ display: "inline", marginLeft: 4 }} />
    );
  };

  const handleCrewSort = (col: CrewSortColumn) => {
    if (col === crewSortCol) {
      setCrewSortDir(crewSortDir === "asc" ? "desc" : "asc");
    } else {
      setCrewSortCol(col);
      setCrewSortDir(col === "crewName" || col === "crewType" ? "asc" : "desc");
    }
  };

  const renderCrewIndicator = (col: CrewSortColumn) => {
    if (col !== crewSortCol) return null;
    return crewSortDir === "asc" ? (
      <FiChevronUp style={{ display: "inline", marginLeft: 4 }} />
    ) : (
      <FiChevronDown style={{ display: "inline", marginLeft: 4 }} />
    );
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
        Error loading productivity data: {error.message}
      </Alert>
    );
  }

  if (!report) {
    return (
      <Alert status="warning">
        <AlertIcon />
        No productivity data found for the selected date range.
      </Alert>
    );
  }

  return (
    <Box overflowY="auto" h="100%" w="100%">
      <Stack spacing={4} pb={4}>

        {/* View toggle + Group by */}
        <Box bg="white" borderRadius="md" shadow="sm" p={4}>
          <HStack spacing={6} flexWrap="wrap">
            <HStack spacing={3}>
              <Text fontWeight="medium">View:</Text>
              <ButtonGroup size="sm" isAttached variant="outline">
                <Button
                  colorScheme={viewMode === "jobsite" ? "blue" : "gray"}
                  variant={viewMode === "jobsite" ? "solid" : "outline"}
                  onClick={() => setViewMode("jobsite")}
                >
                  By Jobsite
                </Button>
                <Button
                  colorScheme={viewMode === "crew" ? "blue" : "gray"}
                  variant={viewMode === "crew" ? "solid" : "outline"}
                  onClick={() => setViewMode("crew")}
                >
                  By Crew
                </Button>
              </ButtonGroup>
            </HStack>
            {viewMode === "jobsite" && (
              <HStack spacing={3}>
                <Text fontWeight="medium">Group by:</Text>
                <Select
                  size="sm"
                  w="220px"
                  value={materialGrouping}
                  onChange={(e) => setMaterialGrouping(e.target.value as MaterialGrouping)}
                >
                  <option value={MaterialGrouping.MaterialOnly}>Material Only</option>
                  <option value={MaterialGrouping.CrewType}>Material + Crew Type</option>
                  <option value={MaterialGrouping.JobTitle}>Material + Job Title</option>
                </Select>
              </HStack>
            )}
          </HStack>
        </Box>

        {/* Material filter */}
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
                    onClick={() => setSelectedMaterials(new Set())}
                    isDisabled={selectedMaterials.size === 0}
                  >
                    Clear
                  </Button>
                </HStack>
              </HStack>
            }
          >
            <Text fontSize="sm" color="gray.600" mb={3}>
              Select materials to compare T/H rates across jobsites for only those materials.
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
                    <Th w="40px" />
                    <Th>Material</Th>
                    {effectiveGrouping === MaterialGrouping.CrewType && <Th>Crew Type</Th>}
                    {effectiveGrouping === MaterialGrouping.JobTitle && <Th>Job Title</Th>}
                    <Th isNumeric>Total Tonnes</Th>
                    <Th isNumeric>Shipments</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredMaterials.map((mat) => (
                    <Tr
                      key={mat.key}
                      bg={selectedMaterials.has(mat.key) ? "blue.50" : undefined}
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
                      {effectiveGrouping === MaterialGrouping.CrewType && (
                        <Td>
                          <Badge colorScheme="purple" fontSize="xs">
                            {mat.crewType || "Unknown"}
                          </Badge>
                        </Td>
                      )}
                      {effectiveGrouping === MaterialGrouping.JobTitle && (
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
                Productivity Summary
                {selectedMaterials.size > 0 && (
                  <Badge ml={2} colorScheme="blue" fontSize="sm" fontWeight="normal">
                    Filtered
                  </Badge>
                )}
              </Heading>
              {loading && <Spinner size="sm" color="blue.500" />}
            </HStack>
          }
        >
          <SimpleGrid columns={[2, viewMode === "crew" ? 4 : 5]} spacing={4}>
            <Stat>
              <StatLabel>Average T/H</StatLabel>
              <StatNumber color="blue.500">
                {formatNumber(report.averageTonnesPerHour)}
              </StatNumber>
              <StatHelpText>
                {viewMode === "crew" ? "All crews" : "All jobsites"}
              </StatHelpText>
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

            {viewMode === "jobsite" ? (
              <>
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
                        <Text as="span" fontSize="sm" color="gray.500">T/H</Text>
                      </StatNumber>
                    );
                  })()}
                </Stat>
              </>
            ) : (
              <Stat>
                <StatLabel>Crews</StatLabel>
                <StatNumber>{sortedCrews.length}</StatNumber>
                <StatHelpText>With data</StatHelpText>
              </Stat>
            )}
          </SimpleGrid>
        </Card>

        {/* Crew Rankings (crew mode) */}
        {viewMode === "crew" && (
          <Card
            heading={
              <HStack>
                <Heading size="md">
                  Crew Rankings
                  {selectedMaterials.size > 0 && (
                    <Badge ml={2} colorScheme="blue" fontSize="sm" fontWeight="normal">
                      {selectedMaterials.size} material{selectedMaterials.size > 1 ? "s" : ""}
                    </Badge>
                  )}
                </Heading>
                {loading && <Spinner size="sm" color="blue.500" />}
              </HStack>
            }
          >
            {sortedCrews.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                No crew productivity data for the selected date range.
              </Alert>
            ) : (
              <Box maxH="500px" overflowY="auto">
                <Table size="sm">
                  <Thead position="sticky" top={0} bg="white" zIndex={1}>
                    <Tr>
                      <Th w="40px">#</Th>
                      <Th cursor="pointer" onClick={() => handleCrewSort("crewName")} _hover={{ bg: "gray.100" }} minW="140px">
                        Crew{renderCrewIndicator("crewName")}
                      </Th>
                      <Th isNumeric cursor="pointer" onClick={() => handleCrewSort("totalTonnes")} _hover={{ bg: "gray.100" }}>
                        Tonnes{renderCrewIndicator("totalTonnes")}
                      </Th>
                      <Th isNumeric cursor="pointer" onClick={() => handleCrewSort("totalCrewHours")} _hover={{ bg: "gray.100" }}>
                        Hours{renderCrewIndicator("totalCrewHours")}
                      </Th>
                      <Th isNumeric cursor="pointer" onClick={() => handleCrewSort("tonnesPerHour")} _hover={{ bg: "gray.100" }}>
                        T/H{renderCrewIndicator("tonnesPerHour")}
                      </Th>
                      <Th isNumeric cursor="pointer" onClick={() => handleCrewSort("jobsiteCount")} _hover={{ bg: "gray.100" }}>
                        Jobs{renderCrewIndicator("jobsiteCount")}
                      </Th>
                      <Th isNumeric cursor="pointer" onClick={() => handleCrewSort("dayCount")} _hover={{ bg: "gray.100" }}>
                        Days{renderCrewIndicator("dayCount")}
                      </Th>
                      <Th isNumeric cursor="pointer" onClick={() => handleCrewSort("percentFromAverage")} _hover={{ bg: "gray.100" }}>
                        vs Average{renderCrewIndicator("percentFromAverage")}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortedCrews.map((crew, idx) => (
                      <Tr
                        key={crew.crewId}
                        _hover={{ bg: "gray.50" }}
                        bg={
                          (crew.percentFromAverage ?? 0) >= 20
                            ? "green.50"
                            : (crew.percentFromAverage ?? 0) <= -20
                            ? "red.50"
                            : undefined
                        }
                        cursor="pointer"
                        onClick={() => router.push(createLink.crew(crew.crewId))}
                      >
                        <Td fontWeight="bold" color="gray.500">{idx + 1}</Td>
                        <Td>
                          <NextLink href={createLink.crew(crew.crewId)} passHref>
                            <Text
                              as="a"
                              fontWeight="medium"
                              color="blue.600"
                              _hover={{ textDecoration: "underline" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {crew.crewName}
                            </Text>
                          </NextLink>
                          <Badge colorScheme="purple" fontSize="xs">{crew.crewType}</Badge>
                        </Td>
                        <Td isNumeric>{formatNumber(crew.totalTonnes)}</Td>
                        <Td isNumeric>{formatNumber(crew.totalCrewHours)}</Td>
                        <Td isNumeric fontWeight="bold" color="blue.600">
                          {crew.tonnesPerHour != null ? formatNumber(crew.tonnesPerHour) : "—"}
                        </Td>
                        <Td isNumeric>{crew.jobsiteCount}</Td>
                        <Td isNumeric>{crew.dayCount}</Td>
                        <Td isNumeric>
                          {crew.percentFromAverage != null
                            ? getDeviationBadge(crew.percentFromAverage)
                            : <Text color="gray.400" fontSize="sm">—</Text>}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </Card>
        )}

        {/* Scatter Plot (jobsite mode) */}
        {viewMode === "jobsite" && sortedJobsites.length > 0 && (() => {
          const { intercept, slope } = report.regression;
          const minTonnes = Math.min(...sortedJobsites.map((j) => j.totalTonnes));
          const maxTonnes = Math.max(...sortedJobsites.map((j) => j.totalTonnes));
          const logMin = Math.log(minTonnes);
          const logMax = Math.log(maxTonnes);

          const regressionPoints = [];
          for (let i = 0; i <= 50; i++) {
            const logVal = logMin + (logMax - logMin) * (i / 50);
            regressionPoints.push({
              x: Math.exp(logVal),
              y: intercept + slope * logVal,
              isRegression: true,
            });
          }

          const scatterData = sortedJobsites.map((j) => ({ x: j.totalTonnes, y: j.tonnesPerHour, ...j }));

          return (
            <Card
              heading={
                <HStack justify="space-between" w="100%">
                  <HStack>
                    <Heading size="md">Job Size vs Productivity</Heading>
                    {loading && <Spinner size="sm" color="blue.500" />}
                  </HStack>
                  <Box position="relative" ref={jobsiteSearchRef}>
                    <InputGroup size="sm" w="250px">
                      <InputLeftElement pointerEvents="none">
                        <FiSearch color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="Find jobsite..."
                        value={jobsiteSearch}
                        onChange={(e) => { setJobsiteSearch(e.target.value); setShowJobsiteDropdown(true); }}
                        onFocus={() => setShowJobsiteDropdown(true)}
                      />
                    </InputGroup>
                    {showJobsiteDropdown && filteredJobsitesForSearch.length > 0 && (
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
                        {filteredJobsitesForSearch.map((j) => (
                          <Box
                            key={j.jobsiteId}
                            p={2}
                            cursor="pointer"
                            _hover={{ bg: "blue.50" }}
                            onClick={() => selectJobsite(j.jobsiteId)}
                          >
                            <Text fontSize="sm" fontWeight="medium">{j.jobsiteName}</Text>
                            <Text fontSize="xs" color="gray.500">
                              {j.jobcode} • {formatNumber(j.totalTonnes)}t • {j.tonnesPerHour.toFixed(1)} T/H
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
                    {sortedJobsites.find((j) => j.jobsiteId === highlightedJobsiteId)?.jobsiteName}
                  </Badge>
                  <Button size="xs" variant="ghost" onClick={() => selectJobsite(null)}>Clear</Button>
                </HStack>
              )}
              <Text fontSize="sm" color="gray.600" mb={4}>
                Each dot is a jobsite. The blue line shows expected T/H based on job size. Green dots are outperforming; red dots are underperforming.
              </Text>
              <Box h="400px">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="x"
                      type="number"
                      scale="log"
                      domain={[minTonnes * 0.8, maxTonnes * 1.2]}
                      name="Tonnes"
                      tickFormatter={(v) => formatNumber(v)}
                      label={{ value: "Total Tonnes (log scale)", position: "bottom", offset: 0 }}
                    />
                    <YAxis
                      dataKey="y"
                      type="number"
                      name="T/H"
                      domain={[0, "auto"]}
                      tickFormatter={(v) => v.toFixed(1)}
                      label={{ value: "Tonnes/Hour", angle: -90, position: "insideLeft" }}
                    />
                    <ZAxis range={[60, 60]} />
                    <Tooltip
                      content={({ payload }) => {
                        if (!payload?.length) return null;
                        const d = payload[0]?.payload;
                        if (!d?.jobsiteName) return null;
                        return (
                          <Box bg="white" p={2} border="1px solid" borderColor="gray.200" borderRadius="md" shadow="md">
                            <Text fontWeight="bold" fontSize="sm">{d.jobsiteName}</Text>
                            <Text fontSize="xs">Tonnes: {formatNumber(d.totalTonnes)}</Text>
                            <Text fontSize="xs">T/H: {d.tonnesPerHour.toFixed(2)}</Text>
                            <Text fontSize="xs">Expected: {d.expectedTonnesPerHour.toFixed(2)}</Text>
                            <Text fontSize="xs" color={d.percentFromExpected >= 0 ? "green.600" : "red.600"}>
                              {d.percentFromExpected >= 0 ? "+" : ""}{d.percentFromExpected.toFixed(1)}% vs expected
                            </Text>
                          </Box>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={report.averageTonnesPerHour}
                      stroke="#718096"
                      strokeDasharray="5 5"
                      label={{ value: `Avg: ${report.averageTonnesPerHour.toFixed(1)}`, position: "right", fill: "#718096", fontSize: 12 }}
                    />
                    <Scatter data={regressionPoints} line={{ stroke: "#3182ce", strokeWidth: 2 }} shape={() => null} name="Expected T/H" legendType="line" />
                    <Scatter data={scatterData} name="Jobsites" cursor="pointer" onClick={(d) => { if (d?.jobsiteId) selectJobsite(d.jobsiteId === highlightedJobsiteId ? null : d.jobsiteId); }}>
                      {scatterData.map((entry, i) => {
                        const isHighlighted = entry.jobsiteId === highlightedJobsiteId;
                        const baseColor = entry.percentFromExpected >= 0 ? "#38a169" : "#e53e3e";
                        return (
                          <Cell
                            key={i}
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
                <HStack><Box w={3} h={3} borderRadius="full" bg="#38a169" /><Text fontSize="sm">Above expected</Text></HStack>
                <HStack><Box w={3} h={3} borderRadius="full" bg="#e53e3e" /><Text fontSize="sm">Below expected</Text></HStack>
                <HStack><Box w={6} h="2px" bg="#3182ce" /><Text fontSize="sm">Expected T/H (regression)</Text></HStack>
                {highlightedJobsiteId && (
                  <HStack><Box w={3} h={3} borderRadius="full" bg="#3182ce" border="2px solid" borderColor="#1a365d" /><Text fontSize="sm">Selected</Text></HStack>
                )}
              </HStack>
            </Card>
          );
        })()}

        {/* Jobsite Rankings Table (jobsite mode) */}
        {viewMode === "jobsite" && (
          <Card
            heading={
              <HStack>
                <Heading size="md">
                  Jobsite Rankings
                  {selectedMaterials.size > 0 && (
                    <Badge ml={2} colorScheme="blue" fontSize="sm" fontWeight="normal">
                      {selectedMaterials.size} material{selectedMaterials.size > 1 ? "s" : ""}
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
                No jobsite productivity data for the selected date range.
              </Alert>
            ) : (
              <Box maxH="500px" overflowY="auto">
                <Table size="sm">
                  <Thead position="sticky" top={0} bg="white" zIndex={1}>
                    <Tr>
                      <Th cursor="pointer" onClick={() => handleJobsiteSort("jobcode")} _hover={{ bg: "gray.100" }} w="80px">
                        Job Code{renderJobsiteIndicator("jobcode")}
                      </Th>
                      <Th cursor="pointer" onClick={() => handleJobsiteSort("jobsiteName")} _hover={{ bg: "gray.100" }} minW="160px">
                        Jobsite{renderJobsiteIndicator("jobsiteName")}
                      </Th>
                      <Th isNumeric cursor="pointer" onClick={() => handleJobsiteSort("totalTonnes")} _hover={{ bg: "gray.100" }}>
                        Tonnes{renderJobsiteIndicator("totalTonnes")}
                      </Th>
                      <Th isNumeric cursor="pointer" onClick={() => handleJobsiteSort("totalCrewHours")} _hover={{ bg: "gray.100" }}>
                        Hours{renderJobsiteIndicator("totalCrewHours")}
                      </Th>
                      <Th isNumeric cursor="pointer" onClick={() => handleJobsiteSort("tonnesPerHour")} _hover={{ bg: "gray.100" }}>
                        T/H{renderJobsiteIndicator("tonnesPerHour")}
                      </Th>
                      <Th isNumeric cursor="pointer" onClick={() => handleJobsiteSort("expectedTonnesPerHour")} _hover={{ bg: "gray.100" }}>
                        Expected T/H{renderJobsiteIndicator("expectedTonnesPerHour")}
                      </Th>
                      <Th isNumeric cursor="pointer" onClick={() => handleJobsiteSort("shipmentCount")} _hover={{ bg: "gray.100" }}>
                        Shipments{renderJobsiteIndicator("shipmentCount")}
                      </Th>
                      <Th isNumeric cursor="pointer" onClick={() => handleJobsiteSort("percentFromAverage")} _hover={{ bg: "gray.100" }}>
                        vs Average{renderJobsiteIndicator("percentFromAverage")}
                      </Th>
                      <Th isNumeric cursor="pointer" onClick={() => handleJobsiteSort("percentFromExpected")} _hover={{ bg: "gray.100" }}>
                        vs Expected{renderJobsiteIndicator("percentFromExpected")}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortedJobsites.map((j) => {
                      const isHighlighted = j.jobsiteId === highlightedJobsiteId;
                      return (
                        <Tr
                          key={j.jobsiteId}
                          ref={isHighlighted ? highlightedRowRef : undefined}
                          _hover={{ bg: "gray.50" }}
                          bg={
                            isHighlighted
                              ? "blue.100"
                              : j.percentFromExpected >= 20
                              ? "green.50"
                              : j.percentFromExpected <= -20
                              ? "red.50"
                              : undefined
                          }
                          outline={isHighlighted ? "2px solid" : undefined}
                          outlineColor={isHighlighted ? "blue.500" : undefined}
                          cursor="pointer"
                          onClick={() => selectJobsite(isHighlighted ? null : j.jobsiteId)}
                        >
                          <Td fontWeight="medium" color="gray.600" fontSize="xs">{j.jobcode ?? "—"}</Td>
                          <Td>
                            <NextLink href={createLink.jobsite(j.jobsiteId)} passHref>
                              <Text
                                as="a"
                                fontWeight="medium"
                                color={isHighlighted ? "blue.800" : "blue.600"}
                                _hover={{ textDecoration: "underline" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {j.jobsiteName}
                              </Text>
                            </NextLink>
                            {j.jobcode && <Text fontSize="xs" color="gray.500">{j.jobcode}</Text>}
                          </Td>
                          <Td isNumeric>{formatNumber(j.totalTonnes)}</Td>
                          <Td isNumeric>{formatNumber(j.totalCrewHours)}</Td>
                          <Td isNumeric fontWeight="bold" color="blue.600">{formatNumber(j.tonnesPerHour)}</Td>
                          <Td isNumeric color="gray.500">{formatNumber(j.expectedTonnesPerHour)}</Td>
                          <Td isNumeric>{j.shipmentCount}</Td>
                          <Td isNumeric>{getDeviationBadge(j.percentFromAverage)}</Td>
                          <Td isNumeric>{getDeviationBadge(j.percentFromExpected)}</Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            )}
          </Card>
        )}

        {/* Legend */}
        <Box bg="white" borderRadius="md" shadow="sm" p={4}>
          <Text fontSize="sm" color="gray.600" fontWeight="medium" mb={2}>Legend</Text>
          <HStack spacing={4} wrap="wrap" mb={3}>
            <HStack><Badge colorScheme="green">+20% or more</Badge><Text fontSize="sm">High performer</Text></HStack>
            <HStack><Badge colorScheme="teal">+5% to +20%</Badge><Text fontSize="sm">Above average</Text></HStack>
            <HStack><Badge colorScheme="gray">-5% to +5%</Badge><Text fontSize="sm">Average</Text></HStack>
            <HStack><Badge colorScheme="orange">-20% to -5%</Badge><Text fontSize="sm">Below average</Text></HStack>
            <HStack><Badge colorScheme="red">-20% or less</Badge><Text fontSize="sm">Needs improvement</Text></HStack>
          </HStack>
          <Text fontSize="xs" color="gray.500">
            {viewMode === "jobsite" ? (
              <>
                <strong>vs Average:</strong> Comparison to flat average T/H across all jobsites.{" "}
                <strong>vs Expected:</strong> Size-adjusted comparison based on job tonnage (larger jobs tend to have higher T/H due to economies of scale).
              </>
            ) : (
              <>
                <strong>vs Average:</strong> Comparison to flat average T/H across all crews for the selected material(s).
              </>
            )}
          </Text>
        </Box>

      </Stack>
    </Box>
  );
};

export default Productivity;
