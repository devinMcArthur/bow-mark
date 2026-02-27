/**
 * Overview Tab — Business Dashboard
 *
 * Shows top-level KPI stats with YoY change, Top Performers / Needs Attention
 * panels, and a sortable all-jobs table with fixed-height internal scroll.
 */

import React from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Stat,
  StatArrow,
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
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useDashboardOverviewQuery } from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
import Card from "../../Common/Card";

interface IOverview {
  startDate: string;
  endDate: string;
}

type SortColumn =
  | "jobsiteName"
  | "totalRevenue"
  | "netIncome"
  | "netMarginPercent"
  | "totalTonnes"
  | "tonnesPerHour";

type SortDirection = "asc" | "desc";

const formatCurrency = (val: number) => `$${formatNumber(val)}`;

const getMarginColor = (pct?: number | null): string => {
  if (pct == null) return "gray";
  if (pct >= 15) return "green";
  if (pct >= 0) return "yellow";
  return "red";
};

const Overview = ({ startDate, endDate }: IOverview) => {
  const router = useRouter();
  const [sortColumn, setSortColumn] =
    React.useState<SortColumn>("netMarginPercent");
  const [sortDirection, setSortDirection] =
    React.useState<SortDirection>("desc");

  const { data, loading, error, previousData } = useDashboardOverviewQuery({
    variables: { input: { startDate, endDate } },
  });

  const currentData = data ?? previousData;
  const report = currentData?.dashboardOverview;
  const isInitialLoading = loading && !report;

  const sortedJobsites = React.useMemo(() => {
    if (!report?.jobsites) return [];
    return [...report.jobsites].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      switch (sortColumn) {
        case "jobsiteName":
          aVal = a.jobsiteName.toLowerCase();
          bVal = b.jobsiteName.toLowerCase();
          break;
        case "totalRevenue":
          aVal = a.totalRevenue;
          bVal = b.totalRevenue;
          break;
        case "netIncome":
          aVal = a.netIncome;
          bVal = b.netIncome;
          break;
        case "netMarginPercent":
          aVal = a.netMarginPercent ?? -Infinity;
          bVal = b.netMarginPercent ?? -Infinity;
          break;
        case "totalTonnes":
          aVal = a.totalTonnes;
          bVal = b.totalTonnes;
          break;
        case "tonnesPerHour":
          aVal = a.tonnesPerHour ?? -Infinity;
          bVal = b.tonnesPerHour ?? -Infinity;
          break;
        default:
          aVal = a.netMarginPercent ?? -Infinity;
          bVal = b.netMarginPercent ?? -Infinity;
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [report?.jobsites, sortColumn, sortDirection]);

  const topPerformers = React.useMemo(() => {
    if (!report?.jobsites) return [];
    return [...report.jobsites]
      .filter((j) => j.netMarginPercent != null)
      .sort((a, b) => (b.netMarginPercent ?? -Infinity) - (a.netMarginPercent ?? -Infinity))
      .slice(0, 5);
  }, [report?.jobsites]);

  const needsAttention = React.useMemo(() => {
    if (!report?.jobsites) return [];
    return [...report.jobsites]
      .filter((j) => j.netMarginPercent != null)
      .sort((a, b) => (a.netMarginPercent ?? Infinity) - (b.netMarginPercent ?? Infinity))
      .slice(0, 5);
  }, [report?.jobsites]);

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
        Error loading dashboard overview: {error.message}
      </Alert>
    );
  }

  if (!report) {
    return (
      <Alert status="warning">
        <AlertIcon />
        No data found for the selected date range.
      </Alert>
    );
  }

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection(col === "jobsiteName" ? "asc" : "desc");
    }
  };

  const renderSortIndicator = (col: SortColumn) => {
    if (sortColumn !== col) return null;
    return sortDirection === "asc" ? (
      <FiChevronUp style={{ display: "inline", marginLeft: 4 }} />
    ) : (
      <FiChevronDown style={{ display: "inline", marginLeft: 4 }} />
    );
  };

  return (
    <Box overflowY="auto" h="100%">
      {/* KPI Stats */}
      <Card
        heading={
          <HStack>
            <Heading size="md">Overview</Heading>
            {loading && <Spinner size="sm" color="blue.500" />}
          </HStack>
        }
        mb={4}
      >
        <SimpleGrid columns={[2, 3, 5]} spacing={4}>
          {/* Total Revenue */}
          <Stat>
            <StatLabel>Total Revenue</StatLabel>
            <StatNumber color="green.600" fontSize="lg">
              {formatCurrency(report.totalRevenue)}
            </StatNumber>
            {report.revenueChangePercent != null && (
              <StatHelpText>
                <StatArrow
                  type={report.revenueChangePercent >= 0 ? "increase" : "decrease"}
                />
                {Math.abs(report.revenueChangePercent).toFixed(1)}% YoY
              </StatHelpText>
            )}
          </Stat>

          {/* Net Income */}
          <Stat>
            <StatLabel>Net Income</StatLabel>
            <StatNumber
              color={report.totalNetIncome >= 0 ? "green.600" : "red.500"}
              fontSize="lg"
            >
              {formatCurrency(report.totalNetIncome)}
            </StatNumber>
            {report.netIncomeChangePercent != null && (
              <StatHelpText>
                <StatArrow
                  type={report.netIncomeChangePercent >= 0 ? "increase" : "decrease"}
                />
                {Math.abs(report.netIncomeChangePercent).toFixed(1)}% YoY
              </StatHelpText>
            )}
          </Stat>

          {/* Avg Net Margin */}
          <Stat>
            <StatLabel>Avg Net Margin</StatLabel>
            <StatNumber
              color={
                (report.avgNetMarginPercent ?? 0) >= 0 ? "green.600" : "red.500"
              }
              fontSize="lg"
            >
              {report.avgNetMarginPercent != null
                ? `${report.avgNetMarginPercent.toFixed(1)}%`
                : "N/A"}
            </StatNumber>
            <StatHelpText>Net / Revenue</StatHelpText>
          </Stat>

          {/* Total Tonnes */}
          <Stat>
            <StatLabel>Total Tonnes</StatLabel>
            <StatNumber color="blue.600" fontSize="lg">
              {formatNumber(report.totalTonnes)}
            </StatNumber>
            {report.tonnesChangePercent != null && (
              <StatHelpText>
                <StatArrow
                  type={report.tonnesChangePercent >= 0 ? "increase" : "decrease"}
                />
                {Math.abs(report.tonnesChangePercent).toFixed(1)}% YoY
              </StatHelpText>
            )}
          </Stat>

          {/* Avg T/H */}
          <Stat>
            <StatLabel>Avg T/H</StatLabel>
            <StatNumber color="purple.600" fontSize="lg">
              {report.avgTonnesPerHour != null
                ? formatNumber(report.avgTonnesPerHour)
                : "N/A"}
            </StatNumber>
            {report.tonnesPerHourChangePercent != null && (
              <StatHelpText>
                <StatArrow
                  type={
                    report.tonnesPerHourChangePercent >= 0
                      ? "increase"
                      : "decrease"
                  }
                />
                {Math.abs(report.tonnesPerHourChangePercent).toFixed(1)}% YoY
              </StatHelpText>
            )}
          </Stat>
        </SimpleGrid>
      </Card>

      {/* Top Performers + Needs Attention panels */}
      {(topPerformers.length > 0 || needsAttention.length > 0) && (
        <SimpleGrid columns={[1, 2]} spacing={4} mb={4}>
          {/* Top Performers */}
          <Card
            heading={
              <Heading size="sm" color="green.700">
                Top Performers (by Margin %)
              </Heading>
            }
          >
            {topPerformers.length === 0 ? (
              <Text fontSize="sm" color="gray.500">
                No data
              </Text>
            ) : (
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>#</Th>
                    <Th>Jobsite</Th>
                    <Th isNumeric>Margin %</Th>
                    <Th isNumeric>Net Income</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {topPerformers.map((j, idx) => (
                    <Tr key={j.jobsiteId} _hover={{ bg: "gray.50" }}>
                      <Td fontWeight="bold" color="gray.500">
                        {idx + 1}
                      </Td>
                      <Td>
                        <NextLink
                          href={`/jobsite-year-report/${j.jobsiteId}`}
                          passHref
                        >
                          <Text
                            as="a"
                            fontWeight="medium"
                            color="blue.600"
                            _hover={{ textDecoration: "underline" }}
                            fontSize="sm"
                          >
                            {j.jobsiteName}
                          </Text>
                        </NextLink>
                      </Td>
                      <Td isNumeric>
                        <Badge
                          colorScheme={getMarginColor(j.netMarginPercent)}
                          fontSize="xs"
                        >
                          {j.netMarginPercent != null
                            ? `${j.netMarginPercent >= 0 ? "+" : ""}${j.netMarginPercent.toFixed(1)}%`
                            : "—"}
                        </Badge>
                      </Td>
                      <Td
                        isNumeric
                        fontWeight="bold"
                        color={j.netIncome >= 0 ? "green.700" : "red.600"}
                        fontSize="sm"
                      >
                        {formatCurrency(j.netIncome)}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Card>

          {/* Needs Attention */}
          <Card
            heading={
              <Heading size="sm" color="red.600">
                Needs Attention (lowest Margin %)
              </Heading>
            }
          >
            {needsAttention.length === 0 ? (
              <Text fontSize="sm" color="gray.500">
                No data
              </Text>
            ) : (
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>#</Th>
                    <Th>Jobsite</Th>
                    <Th isNumeric>Margin %</Th>
                    <Th isNumeric>Net Income</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {needsAttention.map((j, idx) => (
                    <Tr key={j.jobsiteId} _hover={{ bg: "gray.50" }}>
                      <Td fontWeight="bold" color="gray.500">
                        {idx + 1}
                      </Td>
                      <Td>
                        <NextLink
                          href={`/jobsite-year-report/${j.jobsiteId}`}
                          passHref
                        >
                          <Text
                            as="a"
                            fontWeight="medium"
                            color="blue.600"
                            _hover={{ textDecoration: "underline" }}
                            fontSize="sm"
                          >
                            {j.jobsiteName}
                          </Text>
                        </NextLink>
                      </Td>
                      <Td isNumeric>
                        <Badge
                          colorScheme={getMarginColor(j.netMarginPercent)}
                          fontSize="xs"
                        >
                          {j.netMarginPercent != null
                            ? `${j.netMarginPercent >= 0 ? "+" : ""}${j.netMarginPercent.toFixed(1)}%`
                            : "—"}
                        </Badge>
                      </Td>
                      <Td
                        isNumeric
                        fontWeight="bold"
                        color={j.netIncome >= 0 ? "green.700" : "red.600"}
                        fontSize="sm"
                      >
                        {formatCurrency(j.netIncome)}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Card>
        </SimpleGrid>
      )}

      {/* All Jobs Table */}
      <Card
        heading={
          <HStack>
            <Heading size="md">
              All Jobs
              <Badge
                ml={2}
                colorScheme="gray"
                fontSize="sm"
                fontWeight="normal"
              >
                {sortedJobsites.length} jobsites
              </Badge>
            </Heading>
            {loading && <Spinner size="sm" color="blue.500" />}
          </HStack>
        }
        mb={4}
      >
        {sortedJobsites.length === 0 ? (
          <Alert status="info">
            <AlertIcon />
            No jobsite data for the selected date range.
          </Alert>
        ) : (
          <Box overflowX="auto" maxH="450px" overflowY="auto">
            <Table size="sm">
              <Thead position="sticky" top={0} bg="white" zIndex={1}>
                <Tr>
                  <Th w="40px">#</Th>
                  <Th
                    cursor="pointer"
                    onClick={() => handleSort("jobsiteName")}
                    _hover={{ bg: "gray.100" }}
                    minW="160px"
                  >
                    Jobsite{renderSortIndicator("jobsiteName")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("totalRevenue")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Revenue{renderSortIndicator("totalRevenue")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("netIncome")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Net Income{renderSortIndicator("netIncome")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("netMarginPercent")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Margin %{renderSortIndicator("netMarginPercent")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("totalTonnes")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Tonnes{renderSortIndicator("totalTonnes")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("tonnesPerHour")}
                    _hover={{ bg: "gray.100" }}
                  >
                    T/H{renderSortIndicator("tonnesPerHour")}
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedJobsites.map((j, idx) => (
                  <Tr
                    key={j.jobsiteId}
                    _hover={{ bg: "gray.50" }}
                    cursor="pointer"
                    onClick={() => router.push(`/jobsite-year-report/${j.jobsiteId}`)}
                  >
                    <Td fontWeight="bold" color="gray.500">
                      {idx + 1}
                    </Td>
                    <Td>
                      <NextLink
                        href={`/jobsite-year-report/${j.jobsiteId}`}
                        passHref
                      >
                        <Text
                          as="a"
                          fontWeight="medium"
                          color="blue.600"
                          _hover={{ textDecoration: "underline" }}
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
                    <Td isNumeric color="green.700">
                      {formatCurrency(j.totalRevenue)}
                    </Td>
                    <Td
                      isNumeric
                      fontWeight="bold"
                      color={j.netIncome >= 0 ? "green.700" : "red.600"}
                    >
                      {formatCurrency(j.netIncome)}
                    </Td>
                    <Td isNumeric>
                      {j.netMarginPercent != null ? (
                        <Badge
                          colorScheme={getMarginColor(j.netMarginPercent)}
                          fontSize="sm"
                        >
                          {j.netMarginPercent >= 0 ? "+" : ""}
                          {j.netMarginPercent.toFixed(1)}%
                        </Badge>
                      ) : (
                        <Text color="gray.400" fontSize="sm">
                          —
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
                    <Td isNumeric>
                      {j.tonnesPerHour != null && j.tonnesPerHour > 0 ? (
                        <Text fontWeight="medium" color="purple.600">
                          {formatNumber(j.tonnesPerHour)}
                        </Text>
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

export default Overview;
