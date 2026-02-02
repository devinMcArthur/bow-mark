/**
 * PostgreSQL vs MongoDB Master Report Comparison
 *
 * This component compares the PostgreSQL-backed master report data against
 * the existing MongoDB pre-computed data, highlighting any discrepancies.
 */

import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Heading,
  Spinner,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  Tooltip,
  Collapse,
  Button,
  Stack,
} from "@chakra-ui/react";
import React from "react";
import dayjs from "dayjs";
import {
  JobsiteYearMasterReportFullSnippetFragment,
  useJobsiteYearMasterReportPgQuery,
} from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";

interface IComparisonPG {
  mongoReport: JobsiteYearMasterReportFullSnippetFragment;
}

interface DiffValue {
  mongo: number;
  pg: number;
  diff: number;
  percentDiff: number;
}

interface JobsiteDiff {
  jobsiteId: string;
  jobsiteName: string;
  jobcode?: string;
  inMongo: boolean;
  inPG: boolean;
  employeeCost: DiffValue;
  vehicleCost: DiffValue;
  materialCost: DiffValue;
  truckingCost: DiffValue;
  revenue: DiffValue;
  expenses: DiffValue;
}

const TOLERANCE = 0.01; // $0.01 tolerance for floating point comparison

const ComparisonPG = ({ mongoReport }: IComparisonPG) => {
  const [showMatching, setShowMatching] = React.useState(false);

  // Extract year from MongoDB report
  const year = React.useMemo(() => {
    const startDate = dayjs(mongoReport.startOfYear);
    return startDate.add(-startDate.utcOffset(), "minutes").year();
  }, [mongoReport.startOfYear]);

  const { data, loading, error } = useJobsiteYearMasterReportPgQuery({
    variables: { year },
  });

  const pgReport = data?.jobsiteYearMasterReportPG;

  // Build comparison data
  const comparison = React.useMemo(() => {
    if (!pgReport) return null;

    // Type for MongoDB report item
    type MongoReportItem = typeof mongoReport.reports[0];
    // Type for PG report item
    type PGJobsiteItem = typeof pgReport.jobsites[0];

    // Create lookup maps - use report.jobsite._id as the key (the actual Jobsite mongo ID)
    const mongoJobsites = new Map<string, MongoReportItem>(
      mongoReport.reports.map((r) => [r.report.jobsite._id, r])
    );

    const pgJobsites = new Map<string, PGJobsiteItem>(
      pgReport.jobsites.map((j) => [j.jobsiteId, j])
    );

    // Collect all jobsite IDs
    const allJobsiteIds = Array.from(
      new Set([
        ...Array.from(mongoJobsites.keys()),
        ...Array.from(pgJobsites.keys()),
      ])
    );

    // Build diff for each jobsite
    const jobsiteDiffs: JobsiteDiff[] = [];

    for (const jobsiteId of allJobsiteIds) {
      const mongoItem = mongoJobsites.get(jobsiteId);
      const pgItem = pgJobsites.get(jobsiteId);

      const makeDiff = (mongo: number, pg: number): DiffValue => ({
        mongo,
        pg,
        diff: pg - mongo,
        percentDiff: mongo !== 0 ? ((pg - mongo) / mongo) * 100 : pg !== 0 ? 100 : 0,
      });

      // Get MongoDB values
      const mongoEmployee = mongoItem?.summary.employeeCost || 0;
      const mongoVehicle = mongoItem?.summary.vehicleCost || 0;
      const mongoMaterial = mongoItem?.summary.materialCost || 0;
      const mongoTrucking = mongoItem?.summary.truckingCost || 0;

      // Get PG values
      const pgEmployee = pgItem?.summary.employeeCost || 0;
      const pgVehicle = pgItem?.summary.vehicleCost || 0;
      const pgMaterial = pgItem?.summary.materialCost || 0;
      const pgTrucking = pgItem?.summary.truckingCost || 0;

      // Calculate revenue and expenses
      const mongoRevenue = mongoItem
        ? 0 // Individual items don't have invoice data in the snippet
        : 0;
      const pgRevenue = pgItem
        ? pgItem.invoiceSummary.externalRevenueInvoiceValue +
          pgItem.invoiceSummary.internalRevenueInvoiceValue
        : 0;

      const mongoExpenses = mongoEmployee + mongoVehicle + mongoMaterial + mongoTrucking;
      const pgExpenses = pgEmployee + pgVehicle + pgMaterial + pgTrucking;

      jobsiteDiffs.push({
        jobsiteId,
        jobsiteName: pgItem?.jobsiteName || mongoItem?.report.jobsite.name || "Unknown",
        jobcode: pgItem?.jobcode || mongoItem?.report.jobsite.jobcode || undefined,
        inMongo: !!mongoItem,
        inPG: !!pgItem,
        employeeCost: makeDiff(mongoEmployee, pgEmployee),
        vehicleCost: makeDiff(mongoVehicle, pgVehicle),
        materialCost: makeDiff(mongoMaterial, pgMaterial),
        truckingCost: makeDiff(mongoTrucking, pgTrucking),
        revenue: makeDiff(mongoRevenue, pgRevenue),
        expenses: makeDiff(mongoExpenses, pgExpenses),
      });
    }

    // Calculate global totals
    const mongoTotals = {
      employeeCost: mongoReport.reports.reduce((sum, r) => sum + r.summary.employeeCost, 0),
      vehicleCost: mongoReport.reports.reduce((sum, r) => sum + r.summary.vehicleCost, 0),
      materialCost: mongoReport.reports.reduce((sum, r) => sum + r.summary.materialCost, 0),
      truckingCost: mongoReport.reports.reduce((sum, r) => sum + r.summary.truckingCost, 0),
      externalExpense: mongoReport.summary.externalExpenseInvoiceValue,
      internalExpense: mongoReport.summary.internalExpenseInvoiceValue,
      accrualExpense: mongoReport.summary.accrualExpenseInvoiceValue,
      externalRevenue: mongoReport.summary.externalRevenueInvoiceValue,
      internalRevenue: mongoReport.summary.internalRevenueInvoiceValue,
      accrualRevenue: mongoReport.summary.accrualRevenueInvoiceValue,
    };

    const pgTotals = {
      employeeCost: pgReport.jobsites.reduce((sum, j) => sum + j.summary.employeeCost, 0),
      vehicleCost: pgReport.jobsites.reduce((sum, j) => sum + j.summary.vehicleCost, 0),
      materialCost: pgReport.jobsites.reduce((sum, j) => sum + j.summary.materialCost, 0),
      truckingCost: pgReport.jobsites.reduce((sum, j) => sum + j.summary.truckingCost, 0),
      externalExpense: pgReport.summary.externalExpenseInvoiceValue,
      internalExpense: pgReport.summary.internalExpenseInvoiceValue,
      accrualExpense: pgReport.summary.accrualExpenseInvoiceValue,
      externalRevenue: pgReport.summary.externalRevenueInvoiceValue,
      internalRevenue: pgReport.summary.internalRevenueInvoiceValue,
      accrualRevenue: pgReport.summary.accrualRevenueInvoiceValue,
    };

    return {
      jobsites: jobsiteDiffs.sort((a, b) => {
        // Sort by diff magnitude (largest first)
        const aDiff = Math.abs(a.expenses.diff);
        const bDiff = Math.abs(b.expenses.diff);
        return bDiff - aDiff;
      }),
      mongoTotals,
      pgTotals,
      mongoJobsiteCount: mongoReport.reports.length,
      pgJobsiteCount: pgReport.jobsites.length,
    };
  }, [mongoReport, pgReport]);

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
        Error loading PostgreSQL data: {error.message}
      </Alert>
    );
  }

  if (!pgReport || !comparison) {
    return (
      <Alert status="warning">
        <AlertIcon />
        No PostgreSQL data found for {year}. Run the backfill script first.
      </Alert>
    );
  }

  const hasDiff = (diff: DiffValue) => Math.abs(diff.diff) > TOLERANCE;

  const DiffCell = ({
    diff,
    format = "currency",
  }: {
    diff: DiffValue;
    format?: "currency" | "number";
  }) => {
    const isDifferent = hasDiff(diff);
    const formatFn = format === "currency" ? (n: number) => `$${formatNumber(n)}` : formatNumber;

    if (!isDifferent) {
      return <Td isNumeric color="gray.500">{formatFn(diff.mongo)}</Td>;
    }

    return (
      <Td isNumeric>
        <Tooltip
          label={
            <Box>
              <Text>MongoDB: {formatFn(diff.mongo)}</Text>
              <Text>PostgreSQL: {formatFn(diff.pg)}</Text>
              <Text>Diff: {diff.diff > 0 ? "+" : ""}{formatFn(diff.diff)}</Text>
              <Text>({diff.percentDiff > 0 ? "+" : ""}{diff.percentDiff.toFixed(2)}%)</Text>
            </Box>
          }
        >
          <Badge
            colorScheme={diff.diff > 0 ? "green" : "red"}
            variant="subtle"
            fontSize="sm"
          >
            {diff.diff > 0 ? "+" : ""}
            {formatFn(diff.diff)}
          </Badge>
        </Tooltip>
      </Td>
    );
  };

  const TotalDiffRow = ({
    label,
    mongo,
    pg,
  }: {
    label: string;
    mongo: number;
    pg: number;
  }) => {
    const diff = pg - mongo;
    const isDifferent = Math.abs(diff) > TOLERANCE;

    return (
      <Tr>
        <Td fontWeight="bold">{label}</Td>
        <Td isNumeric>${formatNumber(mongo)}</Td>
        <Td isNumeric>${formatNumber(pg)}</Td>
        <Td isNumeric>
          {isDifferent ? (
            <Badge colorScheme={diff > 0 ? "green" : "red"}>
              {diff > 0 ? "+" : ""}${formatNumber(diff)}
            </Badge>
          ) : (
            <Badge colorScheme="gray">Match</Badge>
          )}
        </Td>
      </Tr>
    );
  };

  const jobsitesWithDiffs = comparison.jobsites.filter(
    (j) =>
      hasDiff(j.employeeCost) ||
      hasDiff(j.vehicleCost) ||
      hasDiff(j.materialCost) ||
      hasDiff(j.truckingCost) ||
      !j.inMongo ||
      !j.inPG
  );

  const jobsitesMatching = comparison.jobsites.filter(
    (j) =>
      !hasDiff(j.employeeCost) &&
      !hasDiff(j.vehicleCost) &&
      !hasDiff(j.materialCost) &&
      !hasDiff(j.truckingCost) &&
      j.inMongo &&
      j.inPG
  );

  return (
    <Stack spacing={4}>
      <Alert status="info">
        <AlertIcon />
        <Text fontSize="sm">
          Comparing <strong>MongoDB</strong> ({comparison.mongoJobsiteCount} jobsites) vs{" "}
          <strong>PostgreSQL</strong> ({comparison.pgJobsiteCount} jobsites) for {year}
        </Text>
      </Alert>

      {/* Global Totals */}
      <Box bg="white" borderRadius="md" shadow="sm" p={4}>
        <Heading size="sm" mb={4}>Global Totals Comparison</Heading>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Metric</Th>
              <Th isNumeric>MongoDB</Th>
              <Th isNumeric>PostgreSQL</Th>
              <Th isNumeric>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            <TotalDiffRow
              label="Employee Cost"
              mongo={comparison.mongoTotals.employeeCost}
              pg={comparison.pgTotals.employeeCost}
            />
            <TotalDiffRow
              label="Vehicle Cost"
              mongo={comparison.mongoTotals.vehicleCost}
              pg={comparison.pgTotals.vehicleCost}
            />
            <TotalDiffRow
              label="Material Cost"
              mongo={comparison.mongoTotals.materialCost}
              pg={comparison.pgTotals.materialCost}
            />
            <TotalDiffRow
              label="Trucking Cost"
              mongo={comparison.mongoTotals.truckingCost}
              pg={comparison.pgTotals.truckingCost}
            />
            <Tr><Td colSpan={4} h={2} /></Tr>
            <TotalDiffRow
              label="External Expense Invoices"
              mongo={comparison.mongoTotals.externalExpense}
              pg={comparison.pgTotals.externalExpense}
            />
            <TotalDiffRow
              label="Internal Expense Invoices"
              mongo={comparison.mongoTotals.internalExpense}
              pg={comparison.pgTotals.internalExpense}
            />
            <TotalDiffRow
              label="Accrual Expense Invoices"
              mongo={comparison.mongoTotals.accrualExpense}
              pg={comparison.pgTotals.accrualExpense}
            />
            <Tr><Td colSpan={4} h={2} /></Tr>
            <TotalDiffRow
              label="External Revenue Invoices"
              mongo={comparison.mongoTotals.externalRevenue}
              pg={comparison.pgTotals.externalRevenue}
            />
            <TotalDiffRow
              label="Internal Revenue Invoices"
              mongo={comparison.mongoTotals.internalRevenue}
              pg={comparison.pgTotals.internalRevenue}
            />
            <TotalDiffRow
              label="Accrual Revenue Invoices"
              mongo={comparison.mongoTotals.accrualRevenue}
              pg={comparison.pgTotals.accrualRevenue}
            />
          </Tbody>
        </Table>
      </Box>

      {/* Per-Jobsite Differences */}
      <Box bg="white" borderRadius="md" shadow="sm" p={4}>
        <Heading size="sm" mb={4}>
          Jobsite Differences ({jobsitesWithDiffs.length} with differences)
        </Heading>

        {jobsitesWithDiffs.length === 0 ? (
          <Alert status="success">
            <AlertIcon />
            All {comparison.jobsites.length} jobsites match between MongoDB and PostgreSQL!
          </Alert>
        ) : (
          <Box maxH="400px" overflowY="auto">
            <Table size="sm">
              <Thead position="sticky" top={0} bg="white">
                <Tr>
                  <Th>Jobsite</Th>
                  <Th>Status</Th>
                  <Th isNumeric>Employee Diff</Th>
                  <Th isNumeric>Vehicle Diff</Th>
                  <Th isNumeric>Material Diff</Th>
                  <Th isNumeric>Trucking Diff</Th>
                </Tr>
              </Thead>
              <Tbody>
                {jobsitesWithDiffs.map((j) => (
                  <Tr key={j.jobsiteId}>
                    <Td>
                      <Text fontWeight="medium">{j.jobsiteName}</Text>
                      {j.jobcode && (
                        <Text fontSize="xs" color="gray.500">
                          {j.jobcode}
                        </Text>
                      )}
                    </Td>
                    <Td>
                      {!j.inMongo && (
                        <Badge colorScheme="yellow">Missing in Mongo</Badge>
                      )}
                      {!j.inPG && (
                        <Badge colorScheme="orange">Missing in PG</Badge>
                      )}
                      {j.inMongo && j.inPG && (
                        <Badge colorScheme="blue">Data Mismatch</Badge>
                      )}
                    </Td>
                    <DiffCell diff={j.employeeCost} />
                    <DiffCell diff={j.vehicleCost} />
                    <DiffCell diff={j.materialCost} />
                    <DiffCell diff={j.truckingCost} />
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      {/* Matching Jobsites (collapsible) */}
      {jobsitesMatching.length > 0 && (
        <Box bg="white" borderRadius="md" shadow="sm" p={4}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowMatching(!showMatching)}
            mb={2}
          >
            {showMatching ? "Hide" : "Show"} {jobsitesMatching.length} matching jobsites
          </Button>
          <Collapse in={showMatching}>
            <Box maxH="300px" overflowY="auto">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Jobsite</Th>
                    <Th isNumeric>Employee</Th>
                    <Th isNumeric>Vehicle</Th>
                    <Th isNumeric>Material</Th>
                    <Th isNumeric>Trucking</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {jobsitesMatching.map((j) => (
                    <Tr key={j.jobsiteId}>
                      <Td>
                        <Text fontWeight="medium">{j.jobsiteName}</Text>
                      </Td>
                      <Td isNumeric color="gray.500">
                        ${formatNumber(j.employeeCost.mongo)}
                      </Td>
                      <Td isNumeric color="gray.500">
                        ${formatNumber(j.vehicleCost.mongo)}
                      </Td>
                      <Td isNumeric color="gray.500">
                        ${formatNumber(j.materialCost.mongo)}
                      </Td>
                      <Td isNumeric color="gray.500">
                        ${formatNumber(j.truckingCost.mongo)}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Collapse>
        </Box>
      )}
    </Stack>
  );
};

export default ComparisonPG;
