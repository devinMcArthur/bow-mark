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
  Heading,
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
import React from "react";
import { useJobsiteProductivityQuery } from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
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

  const { data, loading, error } = useJobsiteProductivityQuery({
    variables: {
      jobsiteMongoId,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      includeCrewHoursDetail: false,
    },
  });

  const productivity = data?.jobsiteProductivity;

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
        <Card heading={<Heading size="md">Material Productivity (T/H)</Heading>}>
          <Box maxH="300px" overflowY="auto">
            <Table size="sm">
              <Thead position="sticky" top={0} bg="white">
                <Tr>
                  <Th>Material</Th>
                  <Th isNumeric>Tonnes</Th>
                  <Th isNumeric>Crew Hours</Th>
                  <Th isNumeric>T/H</Th>
                  <Th isNumeric>Shipments</Th>
                </Tr>
              </Thead>
              <Tbody>
                {productivity.materialProductivity.map((mat, idx) => (
                  <Tr key={idx}>
                    <Td fontWeight="medium">{mat.materialName}</Td>
                    <Td isNumeric>{formatNumber(mat.totalTonnes)}</Td>
                    <Td isNumeric>{formatNumber(mat.totalCrewHours)}</Td>
                    <Td isNumeric fontWeight="bold" color="blue.600">
                      {formatNumber(mat.tonnesPerHour)}
                    </Td>
                    <Td isNumeric>{mat.shipmentCount}</Td>
                  </Tr>
                ))}
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
