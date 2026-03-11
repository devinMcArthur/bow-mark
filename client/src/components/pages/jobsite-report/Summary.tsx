import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Code,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
} from "@chakra-ui/react";
import { useJobsiteReportQuery } from "../../../generated/graphql";
import { useSystem } from "../../../contexts/System";
import formatNumber from "../../../utils/formatNumber";
import getRateForTime from "../../../utils/getRateForTime";
import Card from "../../Common/Card";
import InvoiceTablePG from "./InvoiceTablePG";

interface ISummary {
  jobsiteMongoId: string;
  startDate: string;
  endDate: string;
  onJobsiteName?: (name: string) => void;
}

const formatCurrency = (n: number) =>
  n < 0
    ? `-$${formatNumber(Math.abs(n))}`
    : `$${formatNumber(n)}`;

const Summary = ({ jobsiteMongoId, startDate, endDate, onJobsiteName }: ISummary) => {
  const { data, loading, error } = useJobsiteReportQuery({
    variables: {
      jobsiteMongoId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
    skip: !jobsiteMongoId,
  });

  const { state: { system } } = useSystem();

  const report = data?.jobsiteReport;

  // Surface jobsite name to parent for breadcrumb
  React.useEffect(() => {
    if (report?.jobsite.name && onJobsiteName) {
      onJobsiteName(report.jobsite.name);
    }
  }, [report?.jobsite.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Overhead rate from system settings (dynamic per reporting period)
  const overheadPercent = React.useMemo(() => {
    if (system && report?.dayReports?.[0]?.date) {
      return getRateForTime(
        system.internalExpenseOverheadRate,
        new Date(report.dayReports[0].date)
      );
    }
    return 10;
  }, [report?.dayReports, system]);

  // Financial totals
  const totals = React.useMemo(() => {
    if (!report) {
      return {
        employeeCost: 0, employeeHours: 0,
        vehicleCost: 0, vehicleHours: 0,
        materialCost: 0, materialQuantity: 0,
        truckingCost: 0,
        internalOnSite: 0, markedUpCost: 0, rawTotalCost: 0,
        totalRevenue: 0, netIncome: 0, netMarginPercent: null as number | null,
      };
    }

    let employeeCost = 0, vehicleCost = 0, materialCost = 0, truckingCost = 0;
    let employeeHours = 0, vehicleHours = 0, materialQuantity = 0;

    for (const day of report.dayReports) {
      employeeCost += day.summary.employeeCost;
      employeeHours += day.summary.employeeHours;
      vehicleCost += day.summary.vehicleCost;
      vehicleHours += day.summary.vehicleHours;
      materialCost += day.summary.materialCost;
      materialQuantity += day.summary.materialQuantity;
      truckingCost += day.summary.truckingCost;
    }

    const internalOnSite = employeeCost + vehicleCost + materialCost + truckingCost;
    const externalInvMarkup = report.summary.externalExpenseInvoiceValue * 1.03;
    const markedUpCost =
      internalOnSite * (1 + overheadPercent / 100) +
      externalInvMarkup +
      report.summary.internalExpenseInvoiceValue +
      report.summary.accrualExpenseInvoiceValue;

    const rawTotalCost =
      internalOnSite +
      report.summary.externalExpenseInvoiceValue +
      report.summary.internalExpenseInvoiceValue +
      report.summary.accrualExpenseInvoiceValue;

    const totalRevenue =
      report.summary.externalRevenueInvoiceValue +
      report.summary.internalRevenueInvoiceValue +
      report.summary.accrualRevenueInvoiceValue;

    const netIncome = totalRevenue - markedUpCost;
    const netMarginPercent = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : null;

    return {
      employeeCost, employeeHours, vehicleCost, vehicleHours,
      materialCost, materialQuantity, truckingCost,
      internalOnSite, markedUpCost, rawTotalCost,
      totalRevenue, netIncome, netMarginPercent,
    };
  }, [report, overheadPercent]);

  if (loading && !report) {
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
        Error loading report: {error.message}
      </Alert>
    );
  }

  if (!report) {
    return (
      <Alert status="warning">
        <AlertIcon />
        No data found for this jobsite in the selected date range.
      </Alert>
    );
  }

  const getMarginColor = (pct: number | null) => {
    if (pct == null) return "gray";
    if (pct >= 15) return "green";
    if (pct >= 5) return "yellow";
    return "red";
  };

  return (
    <Box overflowY="auto" h="100%" w="100%">
      <Stack spacing={4}>
        {/* Financial Summary */}
        <Card
          heading={
            <HStack>
              <Heading size="md">Financial Summary</Heading>
              {loading && <Spinner size="sm" color="blue.500" />}
              {report.jobsite.jobcode && (
                <Badge colorScheme="gray" fontSize="sm">
                  {report.jobsite.jobcode}
                </Badge>
              )}
            </HStack>
          }
        >
          <SimpleGrid columns={[2, 4]} spacing={4}>
            {/* Total Revenue */}
            <Stat>
              <StatLabel>Total Revenue</StatLabel>
              <StatNumber color="green.600" fontSize="lg">
                {formatCurrency(totals.totalRevenue)}
              </StatNumber>
              <StatHelpText fontSize="xs">
                <Flex flexDir="column">
                  <Code bg="transparent" fontSize="xs">
                    External: {formatCurrency(report.summary.externalRevenueInvoiceValue)}
                  </Code>
                  <Code bg="transparent" fontSize="xs">
                    Internal: {formatCurrency(report.summary.internalRevenueInvoiceValue)}
                  </Code>
                  {report.summary.accrualRevenueInvoiceValue > 0 && (
                    <Code bg="transparent" fontSize="xs">
                      Accrual: {formatCurrency(report.summary.accrualRevenueInvoiceValue)}
                    </Code>
                  )}
                </Flex>
              </StatHelpText>
            </Stat>

            {/* Total Expenses (marked up, with raw below) */}
            <Stat>
              <StatLabel>Total Expenses</StatLabel>
              <StatNumber color="red.500" fontSize="lg">
                {formatCurrency(totals.markedUpCost)}
              </StatNumber>
              <StatHelpText>
                <Text fontSize="xs" color="gray.500" mb={1}>
                  Raw: {formatCurrency(totals.rawTotalCost)}
                </Text>
                <Flex flexDir="column" fontSize="xs">
                  <Code bg="transparent" fontSize="xs">
                    On-site +{overheadPercent}%:{" "}
                    {formatCurrency(totals.internalOnSite * (1 + overheadPercent / 100))}
                  </Code>
                  <Code bg="transparent" fontSize="xs">
                    Ext. Inv +3%:{" "}
                    {formatCurrency(report.summary.externalExpenseInvoiceValue * 1.03)}
                  </Code>
                  <Code bg="transparent" fontSize="xs">
                    Int. Inv:{" "}
                    {formatCurrency(report.summary.internalExpenseInvoiceValue)}
                  </Code>
                  {report.summary.accrualExpenseInvoiceValue > 0 && (
                    <Code bg="transparent" fontSize="xs">
                      Accrual Inv:{" "}
                      {formatCurrency(report.summary.accrualExpenseInvoiceValue)}
                    </Code>
                  )}
                </Flex>
              </StatHelpText>
            </Stat>

            {/* Net Income */}
            <Stat>
              <StatLabel>Net Income</StatLabel>
              <StatNumber
                color={totals.netIncome >= 0 ? "green.600" : "red.500"}
                fontSize="lg"
              >
                {formatCurrency(totals.netIncome)}
              </StatNumber>
            </Stat>

            {/* Net Margin % */}
            <Stat>
              <StatLabel>Net Margin</StatLabel>
              <StatNumber fontSize="lg">
                {totals.netMarginPercent != null ? (
                  <Badge
                    colorScheme={getMarginColor(totals.netMarginPercent)}
                    fontSize="lg"
                    px={2}
                    py={1}
                  >
                    {totals.netMarginPercent >= 0 ? "+" : ""}
                    {totals.netMarginPercent.toFixed(1)}%
                  </Badge>
                ) : (
                  "—"
                )}
              </StatNumber>
              <StatHelpText>Days: {report.dayReports.length}</StatHelpText>
            </Stat>
          </SimpleGrid>
        </Card>

        {/* On-Job Stats */}
        <Card heading={<Heading size="md">On-Site Costs</Heading>}>
          <SimpleGrid columns={[2, 5]} spacing={4}>
            <Stat>
              <StatLabel>Wages</StatLabel>
              <StatNumber fontSize="md">{formatCurrency(totals.employeeCost)}</StatNumber>
              <StatHelpText>{formatNumber(totals.employeeHours)} hrs</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>Equipment</StatLabel>
              <StatNumber fontSize="md">{formatCurrency(totals.vehicleCost)}</StatNumber>
              <StatHelpText>{formatNumber(totals.vehicleHours)} hrs</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>Materials</StatLabel>
              <StatNumber fontSize="md">{formatCurrency(totals.materialCost)}</StatNumber>
              <StatHelpText>{formatNumber(totals.materialQuantity)} qty</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>Trucking</StatLabel>
              <StatNumber fontSize="md">{formatCurrency(totals.truckingCost)}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Total On-Site</StatLabel>
              <StatNumber fontSize="md">{formatCurrency(totals.internalOnSite)}</StatNumber>
              <StatHelpText>before overhead</StatHelpText>
            </Stat>
          </SimpleGrid>
        </Card>

        {/* Invoice Cards */}
        <Card heading={<Heading size="sm">Revenue Invoices ({report.revenueInvoices.length})</Heading>}>
          {report.revenueInvoices.length === 0 ? (
            <Text color="gray.500" fontSize="sm">No revenue invoices</Text>
          ) : (
            <InvoiceTablePG
              invoices={report.revenueInvoices}
              caption="Revenue costing"
              colorScheme="green"
            />
          )}
        </Card>

        <Card heading={<Heading size="sm">Expense Invoices ({report.expenseInvoices.length})</Heading>}>
          {report.expenseInvoices.length === 0 ? (
            <Text color="gray.500" fontSize="sm">No expense invoices</Text>
          ) : (
            <InvoiceTablePG
              invoices={report.expenseInvoices}
              caption="Expense costing"
              colorScheme="red"
            />
          )}
        </Card>
      </Stack>
    </Box>
  );
};

export default Summary;
