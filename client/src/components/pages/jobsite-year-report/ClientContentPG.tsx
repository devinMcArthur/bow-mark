/**
 * PostgreSQL-backed Year Report Client Content
 *
 * This component displays the year report data fetched from PostgreSQL
 * instead of the pre-computed MongoDB documents. Used for comparing
 * the new reporting system against the old one.
 */

import {
  Alert,
  AlertIcon,
  Box,
  Code,
  Flex,
  Heading,
  SimpleGrid,
  Spinner,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Badge,
  Text,
} from "@chakra-ui/react";
import React from "react";
import { useJobsiteYearReportPgQuery } from "../../../generated/graphql";
import { useSystem } from "../../../contexts/System";
import formatNumber from "../../../utils/formatNumber";
import formatDate from "../../../utils/formatDate";
import getRateForTime from "../../../utils/getRateForTime";
import Card from "../../Common/Card";

interface IJobsiteYearReportClientContentPG {
  jobsiteMongoId: string;
  year: number;
}

const JobsiteYearReportClientContentPG = ({
  jobsiteMongoId,
  year,
}: IJobsiteYearReportClientContentPG) => {
  const { data, loading, error } = useJobsiteYearReportPgQuery({
    variables: {
      jobsiteMongoId,
      year,
    },
  });

  const {
    state: { system },
  } = useSystem();

  const report = data?.jobsiteYearReportPG;

  // Get overhead rate from system settings (same as MongoDB report)
  const overheadPercent = React.useMemo(() => {
    if (system && report?.dayReports?.[0]?.date) {
      return getRateForTime(
        system.internalExpenseOverheadRate,
        new Date(report.dayReports[0].date)
      );
    }
    return 10; // Default to 10%
  }, [report?.dayReports, system]);

  const overheadRate = React.useMemo(() => {
    return 1 + overheadPercent / 100;
  }, [overheadPercent]);

  // Calculate totals from day reports - must be called before any early returns
  const totals = React.useMemo(() => {
    if (!report) {
      return {
        employeeHours: 0,
        employeeCost: 0,
        vehicleHours: 0,
        vehicleCost: 0,
        materialQuantity: 0,
        materialCost: 0,
        truckingCost: 0,
        internalExpenses: 0,
        internalExpensesWithOverhead: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
      };
    }

    let employeeHours = 0;
    let employeeCost = 0;
    let vehicleHours = 0;
    let vehicleCost = 0;
    let materialQuantity = 0;
    let materialCost = 0;
    let truckingCost = 0;

    for (const day of report.dayReports) {
      employeeHours += day.summary.employeeHours;
      employeeCost += day.summary.employeeCost;
      vehicleHours += day.summary.vehicleHours;
      vehicleCost += day.summary.vehicleCost;
      materialQuantity += day.summary.materialQuantity;
      materialCost += day.summary.materialCost;
      truckingCost += day.summary.truckingCost;
    }

    const internalExpenses = employeeCost + vehicleCost + materialCost + truckingCost;
    const internalExpensesWithOverhead = internalExpenses * overheadRate;
    const totalRevenue =
      report.summary.externalRevenueInvoiceValue +
      report.summary.internalRevenueInvoiceValue;
    // Match MongoDB calculation: internal expenses + overhead, external invoices + 3%, internal + accrual invoices
    const totalExpenses =
      internalExpensesWithOverhead +
      report.summary.externalExpenseInvoiceValue * 1.03 +
      report.summary.internalExpenseInvoiceValue +
      report.summary.accrualExpenseInvoiceValue;

    return {
      employeeHours,
      employeeCost,
      vehicleHours,
      vehicleCost,
      materialQuantity,
      materialCost,
      truckingCost,
      internalExpenses,
      internalExpensesWithOverhead,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    };
  }, [report, overheadRate]);

  if (loading) {
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
        Error loading PostgreSQL report: {error.message}
      </Alert>
    );
  }

  if (!report) {
    return (
      <Alert status="warning">
        <AlertIcon />
        No data found in PostgreSQL for this jobsite and year. Make sure the
        data has been synced.
      </Alert>
    );
  }

  return (
    <Stack spacing={4}>
      <Alert status="info">
        <AlertIcon />
        <Text fontSize="sm">
          This data is from <strong>PostgreSQL</strong> (new system). Compare
          with the MongoDB data above.
        </Text>
      </Alert>

      {/* Summary Card */}
      <Card heading={<Heading size="md">Summary (PostgreSQL)</Heading>}>
        <SimpleGrid columns={[2, 4]} spacing={4}>
          <Stat>
            <StatLabel>Total Revenue</StatLabel>
            <StatNumber color="green.500">
              ${formatNumber(totals.totalRevenue)}
            </StatNumber>
            <StatHelpText>
              External: ${formatNumber(report.summary.externalRevenueInvoiceValue)}
            </StatHelpText>
            <StatHelpText>
              Internal: ${formatNumber(report.summary.internalRevenueInvoiceValue)}
            </StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Total Expenses</StatLabel>
            <StatNumber color="red.500">
              ${formatNumber(totals.totalExpenses)}
            </StatNumber>
            <StatHelpText>
              <Flex flexDir="column" fontSize="xs">
                <Code backgroundColor="transparent" fontSize="xs">
                  Internal + {overheadPercent}%: ${formatNumber(totals.internalExpensesWithOverhead)}
                </Code>
                <Code backgroundColor="transparent" fontSize="xs">
                  External Inv + 3%: ${formatNumber(report?.summary.externalExpenseInvoiceValue * 1.03 || 0)}
                </Code>
                <Code backgroundColor="transparent" fontSize="xs">
                  Internal Inv: ${formatNumber(report?.summary.internalExpenseInvoiceValue || 0)}
                </Code>
                <Code backgroundColor="transparent" fontSize="xs">
                  Accrual Inv: ${formatNumber(report?.summary.accrualExpenseInvoiceValue || 0)}
                </Code>
              </Flex>
            </StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Net Income</StatLabel>
            <StatNumber color={totals.netIncome >= 0 ? "green.500" : "red.500"}>
              ${formatNumber(totals.netIncome)}
            </StatNumber>
          </Stat>

          <Stat>
            <StatLabel>Days Worked</StatLabel>
            <StatNumber>{report.dayReports.length}</StatNumber>
            <StatHelpText>
              Crew Types: {report.crewTypes.join(", ") || "None"}
            </StatHelpText>
          </Stat>
        </SimpleGrid>
      </Card>

      {/* On-Site Costs */}
      <Card heading={<Heading size="md">On-Site Costs</Heading>}>
        <SimpleGrid columns={[2, 5]} spacing={4}>
          <Stat>
            <StatLabel>Wages</StatLabel>
            <StatNumber>${formatNumber(totals.employeeCost)}</StatNumber>
            <StatHelpText>{formatNumber(totals.employeeHours)} hours</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Equipment</StatLabel>
            <StatNumber>${formatNumber(totals.vehicleCost)}</StatNumber>
            <StatHelpText>{formatNumber(totals.vehicleHours)} hours</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Materials</StatLabel>
            <StatNumber>${formatNumber(totals.materialCost)}</StatNumber>
            <StatHelpText>{formatNumber(totals.materialQuantity)} qty</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Trucking</StatLabel>
            <StatNumber>${formatNumber(totals.truckingCost)}</StatNumber>
          </Stat>

          <Stat>
            <StatLabel>Total On-Site</StatLabel>
            <StatNumber>${formatNumber(totals.internalExpenses)}</StatNumber>
          </Stat>
        </SimpleGrid>
      </Card>

      {/* Issues */}
      {report.issues.length > 0 && (
        <Card heading={<Heading size="md">Issues ({report.issues.length})</Heading>}>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Type</Th>
                <Th>Entity</Th>
                <Th isNumeric>Count</Th>
              </Tr>
            </Thead>
            <Tbody>
              {report.issues.map((issue, idx) => (
                <Tr key={idx}>
                  <Td>
                    <Badge
                      colorScheme={
                        issue.type.includes("ZERO") ? "red" : "yellow"
                      }
                    >
                      {issue.type.replace(/_/g, " ")}
                    </Badge>
                  </Td>
                  <Td>{issue.entityName || issue.entityId || "-"}</Td>
                  <Td isNumeric>{issue.count}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}

      {/* Daily Breakdown */}
      <Card heading={<Heading size="md">Daily Breakdown</Heading>}>
        <Tabs size="sm" variant="enclosed">
          <TabList>
            <Tab>Summary</Tab>
            <Tab>Employees</Tab>
            <Tab>Vehicles</Tab>
            <Tab>Materials</Tab>
          </TabList>

          <TabPanels>
            {/* Summary Tab */}
            <TabPanel>
              <Box maxH="400px" overflowY="auto">
                <Table size="sm">
                  <Thead position="sticky" top={0} bg="white">
                    <Tr>
                      <Th>Date</Th>
                      <Th isNumeric>Wages</Th>
                      <Th isNumeric>Equipment</Th>
                      <Th isNumeric>Materials</Th>
                      <Th isNumeric>Trucking</Th>
                      <Th isNumeric>Total</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {report.dayReports.map((day) => {
                      const dayTotal =
                        day.summary.employeeCost +
                        day.summary.vehicleCost +
                        day.summary.materialCost +
                        day.summary.truckingCost;
                      return (
                        <Tr key={day.id}>
                          <Td>{formatDate(day.date, "MMM D")}</Td>
                          <Td isNumeric>
                            ${formatNumber(day.summary.employeeCost)}
                          </Td>
                          <Td isNumeric>
                            ${formatNumber(day.summary.vehicleCost)}
                          </Td>
                          <Td isNumeric>
                            ${formatNumber(day.summary.materialCost)}
                          </Td>
                          <Td isNumeric>
                            ${formatNumber(day.summary.truckingCost)}
                          </Td>
                          <Td isNumeric fontWeight="bold">
                            ${formatNumber(dayTotal)}
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            </TabPanel>

            {/* Employees Tab */}
            <TabPanel>
              <Box maxH="400px" overflowY="auto">
                <Table size="sm">
                  <Thead position="sticky" top={0} bg="white">
                    <Tr>
                      <Th>Date</Th>
                      <Th>Employee</Th>
                      <Th>Crew</Th>
                      <Th isNumeric>Hours</Th>
                      <Th isNumeric>Cost</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {report.dayReports.flatMap((day) =>
                      day.employees.map((emp) => (
                        <Tr key={emp.id}>
                          <Td>{formatDate(day.date, "MMM D")}</Td>
                          <Td>{emp.employeeName}</Td>
                          <Td>
                            <Badge>{emp.crewType}</Badge>
                          </Td>
                          <Td isNumeric>{formatNumber(emp.hours)}</Td>
                          <Td isNumeric>${formatNumber(emp.cost)}</Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Box>
            </TabPanel>

            {/* Vehicles Tab */}
            <TabPanel>
              <Box maxH="400px" overflowY="auto">
                <Table size="sm">
                  <Thead position="sticky" top={0} bg="white">
                    <Tr>
                      <Th>Date</Th>
                      <Th>Vehicle</Th>
                      <Th>Code</Th>
                      <Th>Crew</Th>
                      <Th isNumeric>Hours</Th>
                      <Th isNumeric>Cost</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {report.dayReports.flatMap((day) =>
                      day.vehicles.map((veh) => (
                        <Tr key={veh.id}>
                          <Td>{formatDate(day.date, "MMM D")}</Td>
                          <Td>{veh.vehicleName}</Td>
                          <Td>{veh.vehicleCode}</Td>
                          <Td>
                            <Badge>{veh.crewType}</Badge>
                          </Td>
                          <Td isNumeric>{formatNumber(veh.hours)}</Td>
                          <Td isNumeric>${formatNumber(veh.cost)}</Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Box>
            </TabPanel>

            {/* Materials Tab */}
            <TabPanel>
              <Box maxH="400px" overflowY="auto">
                <Table size="sm">
                  <Thead position="sticky" top={0} bg="white">
                    <Tr>
                      <Th>Date</Th>
                      <Th>Material</Th>
                      <Th>Supplier</Th>
                      <Th isNumeric>Qty</Th>
                      <Th isNumeric>Rate</Th>
                      <Th isNumeric>Cost</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {report.dayReports.flatMap((day) =>
                      day.materials.map((mat) => (
                        <Tr key={mat.id}>
                          <Td>{formatDate(day.date, "MMM D")}</Td>
                          <Td>
                            {mat.materialName}
                            {mat.estimated && (
                              <Badge ml={1} colorScheme="yellow" size="sm">
                                Est
                              </Badge>
                            )}
                          </Td>
                          <Td>{mat.supplierName}</Td>
                          <Td isNumeric>
                            {formatNumber(mat.quantity)} {mat.unit}
                          </Td>
                          <Td isNumeric>${formatNumber(mat.rate)}</Td>
                          <Td isNumeric>${formatNumber(mat.cost)}</Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Card>

      {/* Invoices */}
      <SimpleGrid columns={[1, 2]} spacing={4}>
        <Card heading={<Heading size="md">Revenue Invoices</Heading>}>
          {report.revenueInvoices.length === 0 ? (
            <Text color="gray.500">No revenue invoices</Text>
          ) : (
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Invoice #</Th>
                  <Th>Company</Th>
                  <Th isNumeric>Amount</Th>
                </Tr>
              </Thead>
              <Tbody>
                {report.revenueInvoices.map((inv) => (
                  <Tr key={inv.id}>
                    <Td>{inv.invoiceNumber}</Td>
                    <Td>{inv.companyName}</Td>
                    <Td isNumeric>${formatNumber(inv.amount)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>

        <Card heading={<Heading size="md">Expense Invoices</Heading>}>
          {report.expenseInvoices.length === 0 ? (
            <Text color="gray.500">No expense invoices</Text>
          ) : (
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Invoice #</Th>
                  <Th>Company</Th>
                  <Th isNumeric>Amount</Th>
                </Tr>
              </Thead>
              <Tbody>
                {report.expenseInvoices.map((inv) => (
                  <Tr key={inv.id}>
                    <Td>{inv.invoiceNumber}</Td>
                    <Td>{inv.companyName}</Td>
                    <Td isNumeric>${formatNumber(inv.amount)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </SimpleGrid>
    </Stack>
  );
};

export default JobsiteYearReportClientContentPG;
