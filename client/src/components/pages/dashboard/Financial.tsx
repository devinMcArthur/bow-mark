/**
 * Financial Tab — Business Dashboard
 *
 * Shows summary financial KPIs and a full sortable cost breakdown table
 * for all jobsites in the selected date range.
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
import { useDashboardFinancialQuery } from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
import Card from "../../Common/Card";

interface IFinancial {
  startDate: string;
  endDate: string;
}

type SortColumn =
  | "jobsiteName"
  | "totalRevenue"
  | "employeeCost"
  | "vehicleCost"
  | "materialCost"
  | "truckingCost"
  | "expenseInvoiceCost"
  | "totalDirectCost"
  | "netIncome"
  | "netMarginPercent"
  | "tonnesPerHour";

type SortDirection = "asc" | "desc";

const formatCurrency = (val: number) => `$${formatNumber(val)}`;

const getMarginColor = (pct?: number | null): string => {
  if (pct == null) return "gray";
  if (pct >= 15) return "green";
  if (pct >= 0) return "yellow";
  return "red";
};

const Financial = ({ startDate, endDate }: IFinancial) => {
  const router = useRouter();
  const [sortColumn, setSortColumn] =
    React.useState<SortColumn>("netMarginPercent");
  const [sortDirection, setSortDirection] =
    React.useState<SortDirection>("desc");

  const { data, loading, error, previousData } = useDashboardFinancialQuery({
    variables: { input: { startDate, endDate } },
  });

  const currentData = data ?? previousData;
  const report = currentData?.dashboardFinancial;
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
        case "employeeCost":
          aVal = a.employeeCost;
          bVal = b.employeeCost;
          break;
        case "vehicleCost":
          aVal = a.vehicleCost;
          bVal = b.vehicleCost;
          break;
        case "materialCost":
          aVal = a.materialCost;
          bVal = b.materialCost;
          break;
        case "truckingCost":
          aVal = a.truckingCost;
          bVal = b.truckingCost;
          break;
        case "expenseInvoiceCost":
          aVal = a.expenseInvoiceCost;
          bVal = b.expenseInvoiceCost;
          break;
        case "totalDirectCost":
          aVal = a.totalDirectCost;
          bVal = b.totalDirectCost;
          break;
        case "netIncome":
          aVal = a.netIncome;
          bVal = b.netIncome;
          break;
        case "netMarginPercent":
          aVal = a.netMarginPercent ?? -Infinity;
          bVal = b.netMarginPercent ?? -Infinity;
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
        Error loading financial data: {error.message}
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
      {/* Summary KPI Stats */}
      <Card
        heading={
          <HStack>
            <Heading size="md">Financial Summary</Heading>
            {loading && <Spinner size="sm" color="blue.500" />}
          </HStack>
        }
        mb={4}
      >
        <SimpleGrid columns={[2, 4]} spacing={4}>
          {/* Total Revenue */}
          <Stat>
            <StatLabel>Total Revenue</StatLabel>
            <StatNumber color="green.600" fontSize="lg">
              {formatCurrency(report.totalRevenue)}
            </StatNumber>
          </Stat>

          {/* Total Direct Cost */}
          <Stat>
            <StatLabel>Total Direct Cost</StatLabel>
            <StatNumber color="red.500" fontSize="lg">
              {formatCurrency(report.totalDirectCost)}
            </StatNumber>
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
          </Stat>

          {/* Avg Net Margin % */}
          <Stat>
            <StatLabel>Avg Net Margin %</StatLabel>
            <StatNumber
              color={
                (report.avgNetMarginPercent ?? 0) >= 15
                  ? "green.600"
                  : (report.avgNetMarginPercent ?? 0) >= 0
                  ? "yellow.600"
                  : "red.500"
              }
              fontSize="lg"
            >
              {report.avgNetMarginPercent != null
                ? `${report.avgNetMarginPercent.toFixed(1)}%`
                : "N/A"}
            </StatNumber>
            <StatHelpText>Net / Revenue</StatHelpText>
          </Stat>
        </SimpleGrid>
      </Card>

      {/* Full Jobsite Cost Table */}
      <Card
        heading={
          <HStack>
            <Heading size="md">
              Jobsite Cost Breakdown
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
                    onClick={() => handleSort("employeeCost")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Labour{renderSortIndicator("employeeCost")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("vehicleCost")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Equipment{renderSortIndicator("vehicleCost")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("materialCost")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Material{renderSortIndicator("materialCost")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("truckingCost")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Trucking{renderSortIndicator("truckingCost")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("expenseInvoiceCost")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Exp. Inv{renderSortIndicator("expenseInvoiceCost")}
                  </Th>
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("totalDirectCost")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Total Cost{renderSortIndicator("totalDirectCost")}
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
                    onClick={() => handleSort("tonnesPerHour")}
                    _hover={{ bg: "gray.100" }}
                  >
                    T/H{renderSortIndicator("tonnesPerHour")}
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedJobsites.map((j) => (
                  <Tr
                    key={j.jobsiteId}
                    _hover={{ bg: "gray.50" }}
                    cursor="pointer"
                    onClick={() =>
                      router.push(`/jobsite-year-report/${j.jobsiteId}`)
                    }
                  >
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
                    <Td isNumeric color="orange.700">
                      {formatCurrency(j.employeeCost)}
                    </Td>
                    <Td isNumeric color="orange.700">
                      {formatCurrency(j.vehicleCost)}
                    </Td>
                    <Td isNumeric color="orange.700">
                      {formatCurrency(j.materialCost)}
                    </Td>
                    <Td isNumeric color="orange.700">
                      {formatCurrency(j.truckingCost)}
                    </Td>
                    <Td isNumeric color="orange.700">
                      {formatCurrency(j.expenseInvoiceCost)}
                    </Td>
                    <Td isNumeric fontWeight="medium" color="red.600">
                      {formatCurrency(j.totalDirectCost)}
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

export default Financial;
