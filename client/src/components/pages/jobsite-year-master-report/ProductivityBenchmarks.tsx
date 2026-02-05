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
import { FiSearch } from "react-icons/fi";
import React from "react";
import NextLink from "next/link";
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

const ProductivityBenchmarks = ({ year }: IProductivityBenchmarks) => {
  const [materialGrouping, setMaterialGrouping] =
    React.useState<MaterialGrouping>(MaterialGrouping.JobTitle);
  const [selectedMaterials, setSelectedMaterials] = React.useState<Set<string>>(
    new Set()
  );
  const [materialSearch, setMaterialSearch] = React.useState("");

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
        <SimpleGrid columns={[2, 4]} spacing={4}>
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
        </SimpleGrid>
      </Card>

      {/* Jobsite Ranking Table */}
      <Card
        heading={
          <HStack>
            <Heading size="md">
              Jobsite Rankings (by T/H)
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
        {report.jobsites.length === 0 ? (
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
                  <Th>Jobsite</Th>
                  <Th isNumeric>Tonnes</Th>
                  <Th isNumeric>Hours</Th>
                  <Th isNumeric>T/H</Th>
                  <Th isNumeric>Shipments</Th>
                  <Th isNumeric>vs Average</Th>
                </Tr>
              </Thead>
              <Tbody>
                {report.jobsites.map((jobsite, idx) => (
                  <Tr
                    key={jobsite.jobsiteId}
                    _hover={{ bg: "gray.50" }}
                    bg={
                      jobsite.percentFromAverage >= 20
                        ? "green.50"
                        : jobsite.percentFromAverage <= -20
                        ? "red.50"
                        : undefined
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
                          color="blue.600"
                          _hover={{ textDecoration: "underline" }}
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
                    <Td isNumeric>{jobsite.shipmentCount}</Td>
                    <Td isNumeric>
                      {getDeviationBadge(jobsite.percentFromAverage)}
                    </Td>
                  </Tr>
                ))}
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
        <HStack spacing={4} wrap="wrap">
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
      </Box>
    </Stack>
  );
};

export default ProductivityBenchmarks;
