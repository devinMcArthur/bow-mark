/**
 * Productivity Tab — Business Dashboard
 *
 * Shows productivity KPIs (Avg T/H, Total Tonnes, Total Crew Hours, Jobsite Count)
 * with a material filter and sortable rankings table toggled between By Jobsite
 * and By Crew views.
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
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
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
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useDashboardProductivityQuery } from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
import createLink from "../../../utils/createLink";
import Card from "../../Common/Card";

interface IProductivity {
  startDate: string;
  endDate: string;
}

type ViewMode = "jobsite" | "crew";

type JobsiteSortColumn =
  | "jobsiteName"
  | "totalTonnes"
  | "totalCrewHours"
  | "tonnesPerHour"
  | "percentFromAverage";

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

const getVsAverageColor = (pct: number): string => {
  if (pct > 10) return "green";
  if (pct < -10) return "red";
  return "gray";
};

const Productivity = ({ startDate, endDate }: IProductivity) => {
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<ViewMode>("jobsite");
  const [selectedMaterials, setSelectedMaterials] = React.useState<Set<string>>(
    new Set()
  );

  // Jobsite table sort state
  const [jobsiteSortColumn, setJobsiteSortColumn] =
    React.useState<JobsiteSortColumn>("tonnesPerHour");
  const [jobsiteSortDirection, setJobsiteSortDirection] =
    React.useState<SortDirection>("desc");

  // Crew table sort state
  const [crewSortColumn, setCrewSortColumn] =
    React.useState<CrewSortColumn>("tonnesPerHour");
  const [crewSortDirection, setCrewSortDirection] =
    React.useState<SortDirection>("desc");

  const selectedArray = Array.from(selectedMaterials);

  const { data, loading, error, previousData } = useDashboardProductivityQuery({
    variables: {
      input: {
        startDate,
        endDate,
        selectedMaterials:
          selectedArray.length > 0 ? selectedArray : undefined,
      },
    },
  });

  const currentData = data ?? previousData;
  const report = currentData?.dashboardProductivity;
  const isInitialLoading = loading && !report;

  // Sorted jobsites
  const sortedJobsites = React.useMemo(() => {
    if (!report?.jobsites) return [];
    return [...report.jobsites].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      switch (jobsiteSortColumn) {
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
          aVal = a.tonnesPerHour ?? -Infinity;
          bVal = b.tonnesPerHour ?? -Infinity;
          break;
        case "percentFromAverage":
          aVal = a.percentFromAverage ?? -Infinity;
          bVal = b.percentFromAverage ?? -Infinity;
          break;
        default:
          aVal = a.tonnesPerHour ?? -Infinity;
          bVal = b.tonnesPerHour ?? -Infinity;
      }
      if (aVal < bVal) return jobsiteSortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return jobsiteSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [report?.jobsites, jobsiteSortColumn, jobsiteSortDirection]);

  // Sorted crews
  const sortedCrews = React.useMemo(() => {
    if (!report?.crews) return [];
    return [...report.crews].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      switch (crewSortColumn) {
        case "crewName":
          aVal = a.crewName.toLowerCase();
          bVal = b.crewName.toLowerCase();
          break;
        case "crewType":
          aVal = a.crewType.toLowerCase();
          bVal = b.crewType.toLowerCase();
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
          aVal = a.tonnesPerHour ?? -Infinity;
          bVal = b.tonnesPerHour ?? -Infinity;
          break;
        case "dayCount":
          aVal = a.dayCount;
          bVal = b.dayCount;
          break;
        case "jobsiteCount":
          aVal = a.jobsiteCount;
          bVal = b.jobsiteCount;
          break;
        case "percentFromAverage":
          aVal = a.percentFromAverage ?? -Infinity;
          bVal = b.percentFromAverage ?? -Infinity;
          break;
        default:
          aVal = a.tonnesPerHour ?? -Infinity;
          bVal = b.tonnesPerHour ?? -Infinity;
      }
      if (aVal < bVal) return crewSortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return crewSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [report?.crews, crewSortColumn, crewSortDirection]);

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

  const handleJobsiteSort = (col: JobsiteSortColumn) => {
    if (jobsiteSortColumn === col) {
      setJobsiteSortDirection(
        jobsiteSortDirection === "asc" ? "desc" : "asc"
      );
    } else {
      setJobsiteSortColumn(col);
      setJobsiteSortDirection(col === "jobsiteName" ? "asc" : "desc");
    }
  };

  const handleCrewSort = (col: CrewSortColumn) => {
    if (crewSortColumn === col) {
      setCrewSortDirection(crewSortDirection === "asc" ? "desc" : "asc");
    } else {
      setCrewSortColumn(col);
      setCrewSortDirection(
        col === "crewName" || col === "crewType" ? "asc" : "desc"
      );
    }
  };

  const renderJobsiteSortIndicator = (col: JobsiteSortColumn) => {
    if (jobsiteSortColumn !== col) return null;
    return jobsiteSortDirection === "asc" ? (
      <FiChevronUp style={{ display: "inline", marginLeft: 4 }} />
    ) : (
      <FiChevronDown style={{ display: "inline", marginLeft: 4 }} />
    );
  };

  const renderCrewSortIndicator = (col: CrewSortColumn) => {
    if (crewSortColumn !== col) return null;
    return crewSortDirection === "asc" ? (
      <FiChevronUp style={{ display: "inline", marginLeft: 4 }} />
    ) : (
      <FiChevronDown style={{ display: "inline", marginLeft: 4 }} />
    );
  };

  return (
    <Box overflowY="auto" h="100%">
      {/* Summary Stats */}
      <Card
        heading={
          <HStack>
            <Heading size="md">Productivity Summary</Heading>
            {loading && <Spinner size="sm" color="blue.500" />}
            {selectedMaterials.size > 0 && (
              <Badge colorScheme="blue" fontSize="sm" fontWeight="normal">
                {selectedMaterials.size} material
                {selectedMaterials.size > 1 ? "s" : ""} filtered
              </Badge>
            )}
          </HStack>
        }
        mb={4}
      >
        <SimpleGrid columns={[2, 4]} spacing={4}>
          <Stat>
            <StatLabel>Avg T/H</StatLabel>
            <StatNumber color="purple.600" fontSize="lg">
              {report.avgTonnesPerHour != null
                ? formatNumber(report.avgTonnesPerHour)
                : "N/A"}
            </StatNumber>
            <StatHelpText>Tonnes per hour</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Total Tonnes</StatLabel>
            <StatNumber color="blue.600" fontSize="lg">
              {formatNumber(report.totalTonnes)}
            </StatNumber>
            <StatHelpText>
              {selectedMaterials.size > 0 ? "Selected materials" : "All materials"}
            </StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Total Crew Hours</StatLabel>
            <StatNumber fontSize="lg">
              {formatNumber(report.totalCrewHours)}
            </StatNumber>
            <StatHelpText>Combined</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Jobsite Count</StatLabel>
            <StatNumber fontSize="lg">{report.jobsiteCount}</StatNumber>
            <StatHelpText>With data</StatHelpText>
          </Stat>
        </SimpleGrid>
      </Card>

      {/* View Toggle + Material Filter */}
      <Card mb={4}>
        {/* View toggle */}
        <HStack mb={report.availableMaterials.length > 0 ? 4 : 0}>
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

        {/* Material filter chips */}
        {report.availableMaterials.length > 0 && (
          <Box>
            <HStack mb={2}>
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                Filter by Material:
              </Text>
              {selectedMaterials.size > 0 && (
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="gray"
                  onClick={() => setSelectedMaterials(new Set())}
                >
                  Clear all
                </Button>
              )}
            </HStack>
            <Wrap spacing={2}>
              {report.availableMaterials.map((mat) => {
                const isSelected = selectedMaterials.has(mat.key);
                return (
                  <WrapItem key={mat.key}>
                    <Badge
                      cursor="pointer"
                      colorScheme={isSelected ? "blue" : "gray"}
                      variant={isSelected ? "solid" : "outline"}
                      fontSize="sm"
                      px={3}
                      py={1}
                      borderRadius="full"
                      onClick={() => toggleMaterial(mat.key)}
                      _hover={{
                        opacity: 0.8,
                      }}
                    >
                      {mat.materialName}
                    </Badge>
                  </WrapItem>
                );
              })}
            </Wrap>
          </Box>
        )}
      </Card>

      {/* Rankings Table */}
      <Card
        heading={
          <HStack>
            <Heading size="md">
              {viewMode === "jobsite" ? "Jobsite Rankings" : "Crew Rankings"}
              <Badge
                ml={2}
                colorScheme="gray"
                fontSize="sm"
                fontWeight="normal"
              >
                {viewMode === "jobsite"
                  ? `${sortedJobsites.length} jobsites`
                  : `${sortedCrews.length} crews`}
              </Badge>
            </Heading>
            {loading && <Spinner size="sm" color="blue.500" />}
          </HStack>
        }
        mb={4}
      >
        {viewMode === "jobsite" ? (
          sortedJobsites.length === 0 ? (
            <Alert status="info">
              <AlertIcon />
              No jobsite productivity data for the selected date range.
            </Alert>
          ) : (
            <Box overflowX="auto" maxH="500px" overflowY="auto">
              <Table size="sm">
                <Thead position="sticky" top={0} bg="white" zIndex={1}>
                  <Tr>
                    <Th w="40px">#</Th>
                    <Th
                      cursor="pointer"
                      onClick={() => handleJobsiteSort("jobsiteName")}
                      _hover={{ bg: "gray.100" }}
                      minW="160px"
                    >
                      Jobsite{renderJobsiteSortIndicator("jobsiteName")}
                    </Th>
                    <Th
                      isNumeric
                      cursor="pointer"
                      onClick={() => handleJobsiteSort("totalTonnes")}
                      _hover={{ bg: "gray.100" }}
                    >
                      Tonnes{renderJobsiteSortIndicator("totalTonnes")}
                    </Th>
                    <Th
                      isNumeric
                      cursor="pointer"
                      onClick={() => handleJobsiteSort("totalCrewHours")}
                      _hover={{ bg: "gray.100" }}
                    >
                      Crew Hours{renderJobsiteSortIndicator("totalCrewHours")}
                    </Th>
                    <Th
                      isNumeric
                      cursor="pointer"
                      onClick={() => handleJobsiteSort("tonnesPerHour")}
                      _hover={{ bg: "gray.100" }}
                    >
                      T/H{renderJobsiteSortIndicator("tonnesPerHour")}
                    </Th>
                    <Th
                      isNumeric
                      cursor="pointer"
                      onClick={() => handleJobsiteSort("percentFromAverage")}
                      _hover={{ bg: "gray.100" }}
                    >
                      vs Average
                      {renderJobsiteSortIndicator("percentFromAverage")}
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {sortedJobsites.map((j, idx) => (
                    <Tr
                      key={j.jobsiteId}
                      _hover={{ bg: "gray.50" }}
                      cursor="pointer"
                      onClick={() =>
                        router.push(createLink.jobsite(j.jobsiteId))
                      }
                    >
                      <Td fontWeight="bold" color="gray.500">
                        {idx + 1}
                      </Td>
                      <Td>
                        <NextLink
                          href={createLink.jobsite(j.jobsiteId)}
                          passHref
                        >
                          <Text
                            as="a"
                            fontWeight="medium"
                            color="blue.600"
                            _hover={{ textDecoration: "underline" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {j.jobsiteName}
                          </Text>
                        </NextLink>
                        {j.jobcode && (
                          <Text fontSize="xs" color="gray.500">
                            {j.jobcode}
                          </Text>
                        )}
                      </Td>
                      <Td isNumeric>
                        {j.totalTonnes > 0 ? (
                          <Text fontWeight="medium">
                            {formatNumber(j.totalTonnes)}
                          </Text>
                        ) : (
                          <Text color="gray.400" fontSize="sm">
                            —
                          </Text>
                        )}
                      </Td>
                      <Td isNumeric>{formatNumber(j.totalCrewHours)}</Td>
                      <Td isNumeric>
                        {j.tonnesPerHour != null ? (
                          <Text fontWeight="bold" color="purple.600">
                            {formatNumber(j.tonnesPerHour)}
                          </Text>
                        ) : (
                          <Text color="gray.400" fontSize="sm">
                            —
                          </Text>
                        )}
                      </Td>
                      <Td isNumeric>
                        {j.percentFromAverage != null ? (
                          <Badge
                            colorScheme={getVsAverageColor(j.percentFromAverage)}
                            fontSize="sm"
                          >
                            {j.percentFromAverage >= 0 ? "+" : ""}
                            {j.percentFromAverage.toFixed(1)}%
                          </Badge>
                        ) : (
                          <Text color="gray.400" fontSize="sm">
                            —
                          </Text>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )
        ) : sortedCrews.length === 0 ? (
          <Alert status="info">
            <AlertIcon />
            No crew productivity data for the selected date range.
          </Alert>
        ) : (
          <Box overflowX="auto" maxH="500px" overflowY="auto">
            <Table size="sm">
              <Thead position="sticky" top={0} bg="white" zIndex={1}>
                <Tr>
                  <Th w="40px">#</Th>
                  <Th
                    cursor="pointer"
                    onClick={() => handleCrewSort("crewName")}
                    _hover={{ bg: "gray.100" }}
                    minW="140px"
                  >
                    Crew{renderCrewSortIndicator("crewName")}
                  </Th>
                  <Th
                    cursor="pointer"
                    onClick={() => handleCrewSort("crewType")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Type{renderCrewSortIndicator("crewType")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleCrewSort("totalTonnes")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Tonnes{renderCrewSortIndicator("totalTonnes")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleCrewSort("totalCrewHours")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Crew Hours{renderCrewSortIndicator("totalCrewHours")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleCrewSort("tonnesPerHour")}
                    _hover={{ bg: "gray.100" }}
                  >
                    T/H{renderCrewSortIndicator("tonnesPerHour")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleCrewSort("dayCount")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Days{renderCrewSortIndicator("dayCount")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleCrewSort("jobsiteCount")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Jobs{renderCrewSortIndicator("jobsiteCount")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleCrewSort("percentFromAverage")}
                    _hover={{ bg: "gray.100" }}
                  >
                    vs Average{renderCrewSortIndicator("percentFromAverage")}
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedCrews.map((crew, idx) => (
                  <Tr
                    key={crew.crewId}
                    _hover={{ bg: "gray.50" }}
                    cursor="pointer"
                    onClick={() =>
                      router.push(createLink.crew(crew.crewId))
                    }
                  >
                    <Td fontWeight="bold" color="gray.500">
                      {idx + 1}
                    </Td>
                    <Td>
                      <NextLink
                        href={createLink.crew(crew.crewId)}
                        passHref
                      >
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
                    </Td>
                    <Td>
                      <Badge colorScheme="purple" fontSize="xs">
                        {crew.crewType}
                      </Badge>
                    </Td>
                    <Td isNumeric>{formatNumber(crew.totalTonnes)}</Td>
                    <Td isNumeric>{formatNumber(crew.totalCrewHours)}</Td>
                    <Td isNumeric>
                      {crew.tonnesPerHour != null ? (
                        <Text fontWeight="bold" color="purple.600">
                          {formatNumber(crew.tonnesPerHour)}
                        </Text>
                      ) : (
                        <Text color="gray.400" fontSize="sm">
                          —
                        </Text>
                      )}
                    </Td>
                    <Td isNumeric>{crew.dayCount}</Td>
                    <Td isNumeric>{crew.jobsiteCount}</Td>
                    <Td isNumeric>
                      {crew.percentFromAverage != null ? (
                        <Badge
                          colorScheme={getVsAverageColor(
                            crew.percentFromAverage
                          )}
                          fontSize="sm"
                        >
                          {crew.percentFromAverage >= 0 ? "+" : ""}
                          {crew.percentFromAverage.toFixed(1)}%
                        </Badge>
                      ) : (
                        <Text color="gray.400" fontSize="sm">
                          —
                        </Text>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default Productivity;
