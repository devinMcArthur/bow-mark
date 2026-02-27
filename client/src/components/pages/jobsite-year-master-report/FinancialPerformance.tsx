/**
 * Financial Performance Tab
 *
 * Shows per-jobsite revenue, direct costs, net income, and margin % for a year.
 * Includes a scatter plot of residual T/H % (x) vs net margin % (y) to
 * visualise whether higher-productivity-than-expected jobs tend to be more profitable.
 */

import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Heading,
  HStack,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
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
import React from "react";
import NextLink from "next/link";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { useFinancialPerformanceQuery } from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
import createLink from "../../../utils/createLink";
import Card from "../../Common/Card";

interface IFinancialPerformance {
  year: number;
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
  | "tonnesPerHour"
  | "residualTonnesPerHourPercent";

type SortDirection = "asc" | "desc";

const formatCurrency = (val: number) =>
  `$${formatNumber(val)}`;

const FinancialPerformance = ({ year }: IFinancialPerformance) => {
  const [sortColumn, setSortColumn] = React.useState<SortColumn>("netIncome");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");

  const { data, loading, error, previousData } = useFinancialPerformanceQuery({
    variables: { input: { year } },
  });

  const currentData = data ?? previousData;
  const report = currentData?.financialPerformance;
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
        case "netMarginPercent":
          aVal = a.netMarginPercent ?? -Infinity;
          bVal = b.netMarginPercent ?? -Infinity;
          break;
        case "residualTonnesPerHourPercent":
          aVal = a.residualTonnesPerHourPercent ?? -Infinity;
          bVal = b.residualTonnesPerHourPercent ?? -Infinity;
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
        default:
          aVal = a.tonnesPerHour;
          bVal = b.tonnesPerHour;
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [report?.jobsites, sortColumn, sortDirection]);

  // Scatter data: only jobsites that have both residual T/H and margin data
  const scatterData = React.useMemo(
    () =>
      (report?.jobsites ?? [])
        .filter(
          (j) =>
            j.residualTonnesPerHourPercent != null && j.netMarginPercent != null
        )
        .map((j) => ({
          x: j.residualTonnesPerHourPercent!,
          y: j.netMarginPercent!,
          ...j,
        })),
    [report?.jobsites]
  );

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
        Error loading financial performance: {error.message}
      </Alert>
    );
  }

  if (!report) {
    return (
      <Alert status="warning">
        <AlertIcon />
        No financial data found for {year}.
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

  const getMarginColor = (pct?: number | null) => {
    if (pct == null) return "gray";
    if (pct >= 20) return "green";
    if (pct >= 5) return "teal";
    if (pct >= -5) return "gray";
    if (pct >= -20) return "orange";
    return "red";
  };

  const getMarginBg = (pct?: number | null) => {
    if (pct == null) return undefined;
    if (pct >= 10) return "green.50";
    if (pct <= -10) return "red.50";
    return undefined;
  };

  const getDotColor = (pct?: number | null) => {
    if (pct == null) return "#718096";
    if (pct >= 15) return "#38a169";
    if (pct >= 0) return "#68d391";
    if (pct >= -15) return "#fc8181";
    return "#e53e3e";
  };

  const correlationLabel = (() => {
    const r = report.correlationResidualThMargin;
    if (r == null) return "Insufficient data";
    const abs = Math.abs(r);
    const sign = r >= 0 ? "positive" : "negative";
    const strength = abs >= 0.7 ? "strong" : abs >= 0.4 ? "moderate" : "weak";
    return `r = ${r.toFixed(2)} (${strength} ${sign})`;
  })();

  return (
    <Box>
      {/* Summary Stats */}
      <Card
        heading={
          <HStack>
            <Heading size="md">Financial Summary — {year}</Heading>
            {loading && <Spinner size="sm" color="blue.500" />}
          </HStack>
        }
      >
        <SimpleGrid columns={[2, 4]} spacing={4}>
          <Stat>
            <StatLabel>Total Revenue</StatLabel>
            <StatNumber color="green.600">
              {formatCurrency(report.totalRevenue)}
            </StatNumber>
            <StatHelpText>Revenue invoices</StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Total Direct Cost</StatLabel>
            <StatNumber color="red.500">
              {formatCurrency(report.totalDirectCost)}
            </StatNumber>
            <StatHelpText>Labor + materials + trucking</StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Net Income</StatLabel>
            <StatNumber color={report.totalNetIncome >= 0 ? "green.600" : "red.500"}>
              {formatCurrency(report.totalNetIncome)}
            </StatNumber>
            <StatHelpText>Revenue − direct cost</StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Avg Net Margin</StatLabel>
            <StatNumber
              color={
                (report.averageNetMarginPercent ?? 0) >= 0
                  ? "green.600"
                  : "red.500"
              }
            >
              {report.averageNetMarginPercent != null
                ? `${report.averageNetMarginPercent.toFixed(1)}%`
                : "N/A"}
            </StatNumber>
            <StatHelpText>Net ÷ revenue</StatHelpText>
          </Stat>
        </SimpleGrid>
      </Card>

      {/* Scatter Plot */}
      {scatterData.length >= 3 && (
        <Card
          heading={
            <HStack justify="space-between" w="100%">
              <Heading size="md">
                Productivity vs Profitability
              </Heading>
              <Popover trigger="hover" placement="bottom-end">
                <PopoverTrigger>
                  <Badge
                    colorScheme="purple"
                    fontSize="sm"
                    px={2}
                    py={1}
                    cursor="help"
                  >
                    {correlationLabel}
                  </Badge>
                </PopoverTrigger>
                <PopoverContent maxW="300px">
                  <PopoverArrow />
                  <PopoverBody fontSize="sm">
                    <Text fontWeight="bold" mb={1}>What does this mean?</Text>
                    <Text mb={2}>
                      This number shows whether jobs where the crew laid more
                      tonnes per hour than expected also tended to be more
                      profitable — or whether there&rsquo;s no real connection.
                    </Text>
                    <Text mb={2}>
                      <strong>r closer to +1</strong> — crews that out-performed
                      on productivity also had better margins. The two tend to go
                      together.
                    </Text>
                    <Text mb={2}>
                      <strong>r closer to −1</strong> — high-productivity jobs
                      actually had worse margins (e.g. extra effort on
                      low-revenue jobs).
                    </Text>
                    <Text>
                      <strong>r near 0</strong> — no clear pattern; productivity
                      and profit seem unrelated on this year&rsquo;s jobs.
                    </Text>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            </HStack>
          }
        >
          <Text fontSize="sm" color="gray.600" mb={4}>
            X-axis: residual T/H % (how much the job outperformed its size-adjusted
            T/H expectation). Y-axis: net margin %. Each dot is one jobsite. A
            rightward and upward trend means higher-than-expected productivity
            correlates with better margins.
          </Text>
          <Box h="380px">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="x"
                  type="number"
                  name="Residual T/H %"
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  label={{
                    value: "Residual T/H % (vs expected for job size)",
                    position: "bottom",
                    offset: 10,
                    fontSize: 12,
                  }}
                />
                <YAxis
                  dataKey="y"
                  type="number"
                  name="Net Margin %"
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  label={{
                    value: "Net Margin %",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 12,
                  }}
                />
                <ReferenceLine x={0} stroke="#718096" strokeDasharray="4 4" />
                <ReferenceLine y={0} stroke="#718096" strokeDasharray="4 4" />
                <Tooltip
                  content={({ payload }) => {
                    const d = payload?.[0]?.payload;
                    if (!d?.jobsiteName) return null;
                    return (
                      <Box
                        bg="white"
                        p={2}
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="md"
                        shadow="md"
                        fontSize="sm"
                      >
                        <Text fontWeight="bold">{d.jobsiteName}</Text>
                        <Text>Net Margin: {d.netMarginPercent?.toFixed(1)}%</Text>
                        <Text>
                          Residual T/H: {d.residualTonnesPerHourPercent?.toFixed(1)}%
                        </Text>
                        <Text>Revenue: {formatCurrency(d.totalRevenue)}</Text>
                        <Text>Net Income: {formatCurrency(d.netIncome)}</Text>
                        <Text>T/H: {d.tonnesPerHour?.toFixed(2)}</Text>
                      </Box>
                    );
                  }}
                />
                <Scatter data={scatterData} name="Jobsites" cursor="pointer">
                  {scatterData.map((entry) => (
                    <Cell
                      key={entry.jobsiteId}
                      fill={getDotColor(entry.netMarginPercent)}
                      r={6}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </Box>
          <HStack mt={2} spacing={4} justify="center" flexWrap="wrap">
            <HStack>
              <Box w={3} h={3} borderRadius="full" bg="#38a169" />
              <Text fontSize="sm">Margin ≥ 15%</Text>
            </HStack>
            <HStack>
              <Box w={3} h={3} borderRadius="full" bg="#68d391" />
              <Text fontSize="sm">Margin 0–15%</Text>
            </HStack>
            <HStack>
              <Box w={3} h={3} borderRadius="full" bg="#fc8181" />
              <Text fontSize="sm">Margin -15–0%</Text>
            </HStack>
            <HStack>
              <Box w={3} h={3} borderRadius="full" bg="#e53e3e" />
              <Text fontSize="sm">Margin &lt; -15%</Text>
            </HStack>
          </HStack>
        </Card>
      )}

      {/* Per-Jobsite Table */}
      <Card
        heading={
          <HStack>
            <Heading size="md">
              Jobsite Breakdown
              <Badge ml={2} colorScheme="gray" fontSize="sm" fontWeight="normal">
                {sortedJobsites.length} jobsites
              </Badge>
            </Heading>
            {loading && <Spinner size="sm" color="blue.500" />}
          </HStack>
        }
      >
        {sortedJobsites.length === 0 ? (
          <Alert status="info">
            <AlertIcon />
            No jobsite data for the selected year.
          </Alert>
        ) : (
          <Box overflowX="auto" maxH="600px" overflowY="auto">
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
                    onClick={() => handleSort("employeeCost")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Labor{renderSortIndicator("employeeCost")}
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
                    Invoices{renderSortIndicator("expenseInvoiceCost")}
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
                  <Th
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort("residualTonnesPerHourPercent")}
                    _hover={{ bg: "gray.100" }}
                  >
                    Residual T/H%{renderSortIndicator("residualTonnesPerHourPercent")}
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedJobsites.map((j, idx) => (
                  <Tr
                    key={j.jobsiteId}
                    bg={getMarginBg(j.netMarginPercent)}
                    _hover={{ bg: "gray.50" }}
                  >
                    <Td fontWeight="bold" color="gray.500">
                      {idx + 1}
                    </Td>
                    <Td>
                      <NextLink href={createLink.jobsite(j.jobsiteId)} passHref>
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
                    <Td isNumeric>{formatCurrency(j.employeeCost)}</Td>
                    <Td isNumeric>{formatCurrency(j.vehicleCost)}</Td>
                    <Td isNumeric>{formatCurrency(j.materialCost)}</Td>
                    <Td isNumeric>{formatCurrency(j.truckingCost)}</Td>
                    <Td isNumeric>{formatCurrency(j.expenseInvoiceCost)}</Td>
                    <Td isNumeric color="red.600">
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
                      {j.tonnesPerHour > 0 ? (
                        <Text fontWeight="medium" color="blue.600">
                          {formatNumber(j.tonnesPerHour)}
                        </Text>
                      ) : (
                        <Text color="gray.400" fontSize="sm">
                          —
                        </Text>
                      )}
                    </Td>
                    <Td isNumeric>
                      {j.residualTonnesPerHourPercent != null ? (
                        <Badge
                          colorScheme={
                            j.residualTonnesPerHourPercent >= 10
                              ? "green"
                              : j.residualTonnesPerHourPercent >= -10
                              ? "gray"
                              : "red"
                          }
                          fontSize="sm"
                        >
                          {j.residualTonnesPerHourPercent >= 0 ? "+" : ""}
                          {j.residualTonnesPerHourPercent.toFixed(1)}%
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
        <Text fontSize="xs" color="gray.500" mt={3}>
          <strong>Revenue:</strong> sum of revenue invoices.{" "}
          <strong>Direct Cost:</strong> employee + vehicle + material + trucking
          from approved daily reports, plus{" "}
          <strong>Invoices</strong> (jobsite expense invoices — subcontractors,
          equipment rentals, etc.).{" "}
          <strong>Residual T/H%:</strong> how much actual T/H exceeded or
          missed the size-adjusted expectation.
        </Text>
      </Card>
    </Box>
  );
};

export default FinancialPerformance;
