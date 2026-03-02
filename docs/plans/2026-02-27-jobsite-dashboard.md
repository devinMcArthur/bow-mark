# Jobsite Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a new time-filterable jobsite report page at `/jobsite/[id]/report` that is fully PostgreSQL-backed, replicates the structure of existing MongoDB jobsite reports, and is linked from the company dashboard.

**Architecture:** A new `jobsiteReport` GraphQL query is added to the existing `JobsiteReportPGResolver` (same file as `jobsiteYearReportPG`), accepting `startDate`/`endDate` instead of `year` and reusing all existing private DB methods. Three new client components (Summary, Breakdown, Productivity) power the three tabs. The company dashboard links are updated to point to the new page carrying the current date range.

**Tech Stack:** TypeScript, Type-GraphQL, Kysely (PostgreSQL), Next.js 12, Apollo Client, Chakra UI, GraphQL Code Generator.

---

## Context for the implementer

### Key existing files

- **Server resolver:** `server/src/graphql/resolvers/jobsiteReportPG/index.ts` — contains `jobsiteYearReportPG` query AND all private helper methods (`getDayReports`, `getInvoiceSummary`, `getInvoices`, `getIssues`, `getCrewTypes`, `buildDayReport`, etc.). The new `jobsiteReport` query is added here as a second `@Query` method. It calls the same private helpers — only the date parameters change.
- **Server types:** `server/src/graphql/types/jobsiteReportPG.ts` — contains all existing PG types (`JobsiteYearReportPG`, `JobsiteDayReportPG`, etc.). The new `JobsiteReportPG` type is added here.
- **Resolver registration:** `server/src/app.ts:103` — `JobsiteReportPGResolver` is already registered. No changes needed.
- **Link utility:** `client/src/utils/createLink.ts` — add a `jobsiteReport` helper.
- **Dashboard Overview:** `client/src/components/pages/dashboard/Overview.tsx` — jobsite names link to `createLink.jobsiteYearReport(j.jobsiteId)` in three places (lines ~330, ~399, ~450). Update to `createLink.jobsiteReport(...)`.
- **Dashboard Financial:** `client/src/components/pages/dashboard/Financial.tsx` — jobsite rows use `router.push('/jobsite-year-report/...')` and `NextLink href='/jobsite-year-report/...'` (lines ~374, ~379). Update to new URL.

### Financial calculation (the +15% / +3% markup)

The overhead percent is dynamic. The existing PG client component (`ClientContentPG.tsx`) uses:
```tsx
const { state: { system } } = useSystem();
const overheadPercent = getRateForTime(system.internalExpenseOverheadRate, firstDayDate);
// Default to 10 if no system or no day reports
```

The total marked-up cost is:
```
internalOnSiteCost = employeeCost + vehicleCost + materialCost + truckingCost
markedUpCost = internalOnSiteCost × (1 + overheadPercent/100)
            + externalExpenseInvoiceValue × 1.03
            + internalExpenseInvoiceValue
            + accrualExpenseInvoiceValue
```

Net Income = totalRevenue - markedUpCost
Net Margin % = (netIncome / totalRevenue) × 100

### How the Breakdown tab data transformation works

The `dayReports[]` array has one entry per date with arrays of employees/vehicles/materials/trucking. To produce the crew-type cards with per-entity rows and per-date columns, you aggregate client-side:

```typescript
// Pseudo-code — full implementation in Task 7
for each day in dayReports:
  for each employee in day.employees:
    crewMap[employee.crewType].employees[employee.employeeName].totalHours += employee.hours
    crewMap[employee.crewType].employees[employee.employeeName].byDate[day.date] = { hours, cost }
```

Then for each crew type card, render a table where rows are employees and columns are dates.

---

## Task 1: Add `JobsiteReportPG` GraphQL type

**Files:**
- Modify: `server/src/graphql/types/jobsiteReportPG.ts`

**Step 1: Add the new type** — append after the `JobsiteYearReportPG` class (around line 270):

```typescript
/**
 * Date-range report from PostgreSQL — supports arbitrary start/end date
 */
@ObjectType()
export class JobsiteReportPG {
  @Field(() => ID)
  _id!: string;

  @Field(() => JobsiteInfoPG)
  jobsite!: JobsiteInfoPG;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;

  @Field(() => [String])
  crewTypes!: string[];

  @Field(() => InvoiceSummaryPG)
  summary!: InvoiceSummaryPG;

  @Field(() => [JobsiteDayReportPG])
  dayReports!: JobsiteDayReportPG[];

  @Field(() => [InvoiceReportPG])
  expenseInvoices!: InvoiceReportPG[];

  @Field(() => [InvoiceReportPG])
  revenueInvoices!: InvoiceReportPG[];

  @Field(() => [ReportIssuePG])
  issues!: ReportIssuePG[];
}
```

**Step 2: Verify TypeScript compiles**
```bash
cd /home/dev/work/bow-mark/server && npm run build 2>&1 | tail -20
```
Expected: no errors.

**Step 3: Commit**
```bash
git add server/src/graphql/types/jobsiteReportPG.ts
git commit -m "feat: add JobsiteReportPG type for date-range jobsite report"
```

---

## Task 2: Add `jobsiteReport` query to the PG resolver

**Files:**
- Modify: `server/src/graphql/resolvers/jobsiteReportPG/index.ts`

**Step 1: Add the import** — at the top of the file, add `JobsiteReportPG` to the existing import from `../../types/jobsiteReportPG`:

```typescript
import {
  JobsiteYearReportPG,
  JobsiteReportPG,        // ← add this
  JobsiteDayReportPG,
  // ... rest unchanged
} from "../../types/jobsiteReportPG";
```

**Step 2: Add the new query method** — insert after the closing brace of `jobsiteYearReportPG()` (around line 93), before `jobsiteYearMasterReportPG()`:

```typescript
/**
 * Get a date-range report for a jobsite from PostgreSQL.
 * Accepts arbitrary startDate/endDate instead of a fixed year.
 * Reuses all existing private helper methods.
 */
@Query(() => JobsiteReportPG, { nullable: true })
async jobsiteReport(
  @Arg("jobsiteMongoId") jobsiteMongoId: string,
  @Arg("startDate", () => Date) startDate: Date,
  @Arg("endDate", () => Date) endDate: Date
): Promise<JobsiteReportPG | null> {
  const jobsite = await db
    .selectFrom("dim_jobsite")
    .select(["id", "mongo_id", "name", "jobcode"])
    .where("mongo_id", "=", jobsiteMongoId)
    .executeTakeFirst();

  if (!jobsite) return null;

  const [
    dayReports,
    invoiceSummary,
    expenseInvoices,
    revenueInvoices,
    issues,
    crewTypes,
  ] = await Promise.all([
    this.getDayReports(jobsite.id, startDate, endDate),
    this.getInvoiceSummary(jobsite.id, startDate, endDate),
    this.getInvoices(jobsite.id, startDate, endDate, "expense"),
    this.getInvoices(jobsite.id, startDate, endDate, "revenue"),
    this.getIssues(jobsite.id, startDate, endDate),
    this.getCrewTypes(jobsite.id, startDate, endDate),
  ]);

  return {
    _id: `${jobsite.mongo_id}_${startDate.toISOString()}_${endDate.toISOString()}`,
    jobsite: {
      _id: jobsite.mongo_id,
      name: jobsite.name,
      jobcode: jobsite.jobcode || undefined,
    },
    startDate,
    endDate,
    crewTypes,
    summary: invoiceSummary,
    dayReports,
    expenseInvoices,
    revenueInvoices,
    issues,
  };
}
```

**Step 3: Verify TypeScript compiles**
```bash
cd /home/dev/work/bow-mark/server && npm run build 2>&1 | tail -20
```
Expected: no errors.

**Step 4: Commit**
```bash
git add server/src/graphql/resolvers/jobsiteReportPG/index.ts
git commit -m "feat: add jobsiteReport query for arbitrary date-range jobsite report"
```

---

## Task 3: Create GraphQL query file and run codegen

**Files:**
- Create: `client/src/graphql/queries/JobsiteReport.graphql`

**Step 1: Create the query file**

```graphql
query JobsiteReport(
  $jobsiteMongoId: String!
  $startDate: Date!
  $endDate: Date!
) {
  jobsiteReport(
    jobsiteMongoId: $jobsiteMongoId
    startDate: $startDate
    endDate: $endDate
  ) {
    _id
    startDate
    endDate
    jobsite {
      _id
      name
      jobcode
    }
    crewTypes
    summary {
      externalExpenseInvoiceValue
      internalExpenseInvoiceValue
      accrualExpenseInvoiceValue
      externalRevenueInvoiceValue
      internalRevenueInvoiceValue
      accrualRevenueInvoiceValue
    }
    dayReports {
      id
      date
      crewTypes
      summary {
        employeeHours
        employeeCost
        vehicleHours
        vehicleCost
        materialQuantity
        materialCost
        nonCostedMaterialQuantity
        truckingQuantity
        truckingHours
        truckingCost
        crewTypeSummaries {
          crewType
          employeeHours
          employeeCost
          vehicleHours
          vehicleCost
          materialQuantity
          materialCost
          nonCostedMaterialQuantity
          truckingQuantity
          truckingHours
          truckingCost
        }
      }
      employees {
        id
        employeeId
        employeeName
        hours
        cost
        crewType
      }
      vehicles {
        id
        vehicleId
        vehicleName
        vehicleCode
        hours
        cost
        crewType
      }
      materials {
        id
        materialName
        supplierName
        quantity
        unit
        rate
        cost
        estimated
        crewType
      }
      nonCostedMaterials {
        id
        materialName
        supplierName
        quantity
        unit
        crewType
      }
      trucking {
        id
        truckingType
        quantity
        hours
        rate
        rateType
        cost
        crewType
      }
    }
    expenseInvoices {
      id
      invoiceNumber
      companyName
      amount
      description
      invoiceType
      date
    }
    revenueInvoices {
      id
      invoiceNumber
      companyName
      amount
      description
      invoiceType
      date
    }
    issues {
      type
      entityId
      entityName
      count
    }
  }
}
```

**Step 2: Ensure the server is running, then run codegen**
```bash
cd /home/dev/work/bow-mark/client && npm run codegen
```
Expected: Generated files updated with `useJobsiteReportQuery` hook and related types.

**Step 3: Verify TypeScript**
```bash
cd /home/dev/work/bow-mark/client && npx tsc --noEmit 2>&1 | tail -20
```
Expected: Exit 0 or only pre-existing errors.

**Step 4: Commit**
```bash
git add client/src/graphql/queries/JobsiteReport.graphql client/src/generated/
git commit -m "feat: add JobsiteReport graphql query and regenerate types"
```

---

## Task 4: Add `jobsiteReport` link helper and update dashboard links

**Files:**
- Modify: `client/src/utils/createLink.ts`
- Modify: `client/src/components/pages/dashboard/Overview.tsx`
- Modify: `client/src/components/pages/dashboard/Financial.tsx`

**Step 1: Add link helper to createLink.ts**

After the existing `jobsiteYearReport` function (line ~52 of `createLink.ts`):

```typescript
const jobsiteReport = (
  jobsiteMongoId: string,
  startDate: string,
  endDate: string
) => {
  return `/jobsite/${jobsiteMongoId}/report?startDate=${startDate}&endDate=${endDate}`;
};
```

Add `jobsiteReport` to the exported object (line ~128):

```typescript
const createLink = {
  // ...existing entries...
  jobsiteReport,   // ← add this line
  jobsiteYearReport,
  // ...
};
```

**Step 2: Update Overview.tsx jobsite name links**

`Overview.tsx` receives `{ startDate, endDate }` as props. Search for all occurrences of `createLink.jobsiteYearReport(j.jobsiteId)` — there are three (Top Performers table, Needs Attention table, All Jobs table). Replace each with:

```tsx
createLink.jobsiteReport(j.jobsiteId, startDate, endDate)
```

Also add `import createLink from "../../../utils/createLink";` at the top if not already present.

**Step 3: Update Financial.tsx jobsite row links**

`Financial.tsx` receives `{ startDate, endDate }` as props. There are two places to update:

1. `router.push('/jobsite-year-report/${j.jobsiteId}')` (the `onClick` on the `<Tr>`) → change to:
```tsx
onClick={() => router.push(createLink.jobsiteReport(j.jobsiteId, startDate, endDate))}
```

2. `NextLink href={'/jobsite-year-report/${j.jobsiteId}'}` → change to:
```tsx
href={createLink.jobsiteReport(j.jobsiteId, startDate, endDate)}
```

Add `import createLink from "../../../utils/createLink";` at the top of `Financial.tsx`.

**Step 4: Verify TypeScript**
```bash
cd /home/dev/work/bow-mark/client && npx tsc --noEmit 2>&1 | tail -20
```
Expected: Exit 0.

**Step 5: Commit**
```bash
git add client/src/utils/createLink.ts \
        client/src/components/pages/dashboard/Overview.tsx \
        client/src/components/pages/dashboard/Financial.tsx
git commit -m "feat: add jobsiteReport link helper and update dashboard links"
```

---

## Task 5: Create the page shell

**Files:**
- Create: `client/src/pages/jobsite/[id]/report.tsx`

Note: Next.js 12 supports nested dynamic routes. Creating `pages/jobsite/[id]/report.tsx` handles `/jobsite/123/report` and does NOT conflict with the existing `pages/jobsite/[id].tsx` which handles `/jobsite/123`.

**Step 1: Create the page file**

```tsx
import React from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  HStack,
  Input,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { NextPage } from "next";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import { useRouter } from "next/router";
import Permission from "../../../components/Common/Permission";
import { UserRoles } from "../../../generated/graphql";

const Summary = dynamic<{
  jobsiteMongoId: string;
  startDate: string;
  endDate: string;
  onJobsiteName: (name: string) => void;
}>(() => import("../../../components/pages/jobsite-report/Summary"), { ssr: false });

const Breakdown = dynamic<{
  jobsiteMongoId: string;
  startDate: string;
  endDate: string;
}>(() => import("../../../components/pages/jobsite-report/Breakdown"), { ssr: false });

const Productivity = dynamic<{
  jobsiteMongoId: string;
  startDate: string;
  endDate: string;
}>(() => import("../../../components/pages/jobsite-report/Productivity"), { ssr: false });

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

type ActivePreset = "thisYear" | "lastYear" | "last6Months" | null;

const detectPreset = (start: string, end: string): ActivePreset => {
  const today = new Date();
  const todayStr = toDateInput(today);
  if (
    start === toDateInput(new Date(today.getFullYear(), 0, 1)) &&
    end === todayStr
  )
    return "thisYear";
  const y = today.getFullYear() - 1;
  if (
    start === toDateInput(new Date(y, 0, 1)) &&
    end === toDateInput(new Date(y, 11, 31))
  )
    return "lastYear";
  return null;
};

const getDefaultRange = () => {
  const today = new Date();
  return {
    startDate: toDateInput(new Date(today.getFullYear(), 0, 1)),
    endDate: toDateInput(today),
  };
};

const JobsiteReportPage: NextPage = () => {
  const router = useRouter();
  const jobsiteMongoId = router.query.id as string | undefined;
  const defaults = getDefaultRange();
  const [startDate, setStartDate] = React.useState(defaults.startDate);
  const [endDate, setEndDate] = React.useState(defaults.endDate);
  const [tabIndex, setTabIndex] = React.useState(0);
  const [activePreset, setActivePreset] = React.useState<ActivePreset>("thisYear");
  const [jobsiteName, setJobsiteName] = React.useState<string>("");

  // Hydrate state from URL query params once router is ready
  React.useEffect(() => {
    if (!router.isReady) return;
    const { startDate: qs, endDate: qe, tab: qt } = router.query;
    const resolvedStart = typeof qs === "string" ? qs : defaults.startDate;
    const resolvedEnd = typeof qe === "string" ? qe : toDateInput(new Date());
    setStartDate(resolvedStart);
    setEndDate(resolvedEnd);
    setActivePreset(detectPreset(resolvedStart, resolvedEnd));
    if (typeof qt === "string") {
      const idx = parseInt(qt, 10);
      if (idx >= 0 && idx <= 2) setTabIndex(idx);
    }
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep URL in sync. endDate omitted when it equals today.
  React.useEffect(() => {
    if (!router.isReady || !jobsiteMongoId) return;
    const query: Record<string, string | number> = {
      id: jobsiteMongoId,
      startDate,
      tab: tabIndex,
    };
    if (endDate !== toDateInput(new Date())) query.endDate = endDate;
    router.replace({ pathname: router.pathname, query }, undefined, {
      shallow: true,
    });
  }, [startDate, endDate, tabIndex, router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const setThisYear = () => {
    const today = new Date();
    setStartDate(toDateInput(new Date(today.getFullYear(), 0, 1)));
    setEndDate(toDateInput(today));
    setActivePreset("thisYear");
  };

  const setLastYear = () => {
    const y = new Date().getFullYear() - 1;
    setStartDate(toDateInput(new Date(y, 0, 1)));
    setEndDate(toDateInput(new Date(y, 11, 31)));
    setActivePreset("lastYear");
  };

  const setLast6Months = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    setStartDate(toDateInput(start));
    setEndDate(toDateInput(end));
    setActivePreset("last6Months");
  };

  return (
    <Permission minRole={UserRoles.ProjectManager} type={null} showError>
      <Box
        p={4}
        h="100vh"
        w="100%"
        display="flex"
        flexDirection="column"
        overflow="hidden"
      >
        {/* Breadcrumb */}
        <HStack spacing={1} mb={2} fontSize="sm" color="gray.500">
          <NextLink href="/dashboard" passHref>
            <Text
              as="a"
              color="blue.500"
              _hover={{ textDecoration: "underline" }}
            >
              Dashboard
            </Text>
          </NextLink>
          <Text>›</Text>
          <Text color="gray.700" fontWeight="medium">
            {jobsiteName || "Jobsite"}
          </Text>
        </HStack>

        <Tabs
          variant="enclosed"
          index={tabIndex}
          onChange={setTabIndex}
          display="flex"
          flexDirection="column"
          flex={1}
          minH={0}
          w="100%"
        >
          <Flex
            align="flex-end"
            justify="space-between"
            borderBottom="1px solid"
            borderColor="inherit"
            flexShrink={0}
            flexWrap="wrap"
            gap={2}
          >
            <TabList borderBottom="none">
              <Tab>Summary</Tab>
              <Tab>Breakdown</Tab>
              <Tab>Productivity</Tab>
            </TabList>
            <HStack spacing={2} wrap="wrap" pb="1px">
              <ButtonGroup size="sm" isAttached variant="outline">
                <Button
                  onClick={setThisYear}
                  colorScheme={activePreset === "thisYear" ? "blue" : "gray"}
                  variant={activePreset === "thisYear" ? "solid" : "outline"}
                >
                  This Year
                </Button>
                <Button
                  onClick={setLastYear}
                  colorScheme={activePreset === "lastYear" ? "blue" : "gray"}
                  variant={activePreset === "lastYear" ? "solid" : "outline"}
                >
                  Last Year
                </Button>
                <Button
                  onClick={setLast6Months}
                  colorScheme={
                    activePreset === "last6Months" ? "blue" : "gray"
                  }
                  variant={
                    activePreset === "last6Months" ? "solid" : "outline"
                  }
                >
                  Last 6 Months
                </Button>
              </ButtonGroup>
              <HStack spacing={1}>
                <Text fontSize="sm" color="gray.500">
                  From
                </Text>
                <Input
                  type="date"
                  size="sm"
                  w="150px"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActivePreset(null);
                  }}
                />
                <Text fontSize="sm" color="gray.500">
                  to
                </Text>
                <Input
                  type="date"
                  size="sm"
                  w="150px"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActivePreset(null);
                  }}
                />
              </HStack>
            </HStack>
          </Flex>

          <TabPanels flex={1} minH={0} overflow="hidden" w="100%">
            <TabPanel h="100%" w="100%" p={0} pt={4} overflow="hidden">
              {jobsiteMongoId && (
                <Summary
                  jobsiteMongoId={jobsiteMongoId}
                  startDate={startDate}
                  endDate={endDate}
                  onJobsiteName={setJobsiteName}
                />
              )}
            </TabPanel>
            <TabPanel h="100%" w="100%" p={0} pt={4} overflow="hidden">
              {jobsiteMongoId && (
                <Breakdown
                  jobsiteMongoId={jobsiteMongoId}
                  startDate={startDate}
                  endDate={endDate}
                />
              )}
            </TabPanel>
            <TabPanel h="100%" w="100%" p={0} pt={4} overflow="hidden">
              {jobsiteMongoId && (
                <Productivity
                  jobsiteMongoId={jobsiteMongoId}
                  startDate={startDate}
                  endDate={endDate}
                />
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Permission>
  );
};

export default JobsiteReportPage;
```

**Step 2: Verify TypeScript**
```bash
cd /home/dev/work/bow-mark/client && npx tsc --noEmit 2>&1 | tail -20
```
Expected: Exit 0 (or only pre-existing errors not in this file).

**Step 3: Commit**
```bash
git add client/src/pages/jobsite/
git commit -m "feat: add jobsite report page shell with date controls and tabs"
```

---

## Task 6: Create Summary tab component

**Files:**
- Create: `client/src/components/pages/jobsite-report/Summary.tsx`

**Step 1: Create the file**

```tsx
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
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { useJobsiteReportQuery } from "../../../generated/graphql";
import { useSystem } from "../../../contexts/System";
import formatNumber from "../../../utils/formatNumber";
import getRateForTime from "../../../utils/getRateForTime";
import Card from "../../Common/Card";

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

  // Financial totals — compute before any early returns
  const totals = React.useMemo(() => {
    if (!report) {
      return {
        employeeCost: 0, vehicleCost: 0, materialCost: 0, truckingCost: 0,
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
        <SimpleGrid columns={[1, 2]} spacing={4}>
          {/* Revenue Invoices */}
          <Card heading={<Heading size="sm">Revenue Invoices</Heading>}>
            {report.revenueInvoices.length === 0 ? (
              <Text color="gray.500" fontSize="sm">No revenue invoices</Text>
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
                      <Td isNumeric color="green.700">{formatCurrency(inv.amount)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Card>

          {/* Expense Invoices */}
          <Card heading={<Heading size="sm">Expense Invoices</Heading>}>
            {report.expenseInvoices.length === 0 ? (
              <Text color="gray.500" fontSize="sm">No expense invoices</Text>
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
                      <Td isNumeric color="red.600">{formatCurrency(inv.amount)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Card>
        </SimpleGrid>
      </Stack>
    </Box>
  );
};

export default Summary;
```

**Step 2: Verify TypeScript**
```bash
cd /home/dev/work/bow-mark/client && npx tsc --noEmit 2>&1 | tail -20
```
Expected: Exit 0.

**Step 3: Commit**
```bash
git add client/src/components/pages/jobsite-report/Summary.tsx
git commit -m "feat: add jobsite report Summary tab"
```

---

## Task 7: Create Breakdown tab component

**Files:**
- Create: `client/src/components/pages/jobsite-report/Breakdown.tsx`

The core challenge is pivoting `dayReports[]` (one entry per date) into per-crew-type aggregated maps for the table rows, with dates as columns. The aggregation runs client-side.

**Step 1: Create the file**

```tsx
import React from "react";
import {
  Alert, AlertIcon, Badge, Box, Collapse, Flex, Heading,
  HStack, IconButton, Spinner, Stack, Table, Tbody, Td,
  Text, Th, Thead, Tr,
} from "@chakra-ui/react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import {
  JobsiteReportQuery,
  useJobsiteReportQuery,
} from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
import formatDate from "../../../utils/formatDate";
import Card from "../../Common/Card";

interface IBreakdown {
  jobsiteMongoId: string;
  startDate: string;
  endDate: string;
}

type DayReport = NonNullable<
  JobsiteReportQuery["jobsiteReport"]
>["dayReports"][0];

// ---- Aggregation types ----
interface EmpEntry {
  totalHours: number;
  totalCost: number;
  byDate: Map<string, { hours: number; cost: number }>;
}
interface VehEntry {
  name: string;
  code: string;
  totalHours: number;
  totalCost: number;
  byDate: Map<string, { hours: number; cost: number }>;
}
interface MatEntry {
  supplier: string;
  unit: string;
  totalQty: number;
  totalCost: number;
  estimated: boolean;
  byDate: Map<string, { qty: number; cost: number }>;
}
interface NonCostMatEntry {
  supplier: string;
  unit: string;
  totalQty: number;
  byDate: Map<string, number>;
}
interface TruckEntry {
  rate: number;
  rateType: string;
  totalQty: number;
  totalHours: number;
  totalCost: number;
  byDate: Map<string, { qty: number; hours: number; cost: number }>;
}
interface CrewData {
  employees: Map<string, EmpEntry>;
  vehicles: Map<string, VehEntry>;
  materials: Map<string, MatEntry>;
  nonCostedMaterials: Map<string, NonCostMatEntry>;
  trucking: Map<string, TruckEntry>;
  totalEmployeeCost: number;
  totalEmployeeHours: number;
  totalVehicleCost: number;
  totalVehicleHours: number;
  totalMaterialCost: number;
  totalMaterialQty: number;
  totalTruckingCost: number;
}

function emptyCrewData(): CrewData {
  return {
    employees: new Map(),
    vehicles: new Map(),
    materials: new Map(),
    nonCostedMaterials: new Map(),
    trucking: new Map(),
    totalEmployeeCost: 0,
    totalEmployeeHours: 0,
    totalVehicleCost: 0,
    totalVehicleHours: 0,
    totalMaterialCost: 0,
    totalMaterialQty: 0,
    totalTruckingCost: 0,
  };
}

function aggregateDayReports(dayReports: DayReport[]): {
  crewMap: Map<string, CrewData>;
  dates: string[];
} {
  const crewMap = new Map<string, CrewData>();
  const dateSet = new Set<string>();

  for (const day of dayReports) {
    const dateStr = new Date(day.date).toISOString().split("T")[0];
    dateSet.add(dateStr);

    for (const emp of day.employees) {
      if (!crewMap.has(emp.crewType)) crewMap.set(emp.crewType, emptyCrewData());
      const crew = crewMap.get(emp.crewType)!;
      crew.totalEmployeeCost += emp.cost;
      crew.totalEmployeeHours += emp.hours;
      if (!crew.employees.has(emp.employeeName)) {
        crew.employees.set(emp.employeeName, {
          totalHours: 0,
          totalCost: 0,
          byDate: new Map(),
        });
      }
      const entry = crew.employees.get(emp.employeeName)!;
      entry.totalHours += emp.hours;
      entry.totalCost += emp.cost;
      const prev = entry.byDate.get(dateStr) || { hours: 0, cost: 0 };
      entry.byDate.set(dateStr, {
        hours: prev.hours + emp.hours,
        cost: prev.cost + emp.cost,
      });
    }

    for (const veh of day.vehicles) {
      if (!crewMap.has(veh.crewType)) crewMap.set(veh.crewType, emptyCrewData());
      const crew = crewMap.get(veh.crewType)!;
      crew.totalVehicleCost += veh.cost;
      crew.totalVehicleHours += veh.hours;
      const key = veh.vehicleName;
      if (!crew.vehicles.has(key)) {
        crew.vehicles.set(key, {
          name: veh.vehicleName,
          code: veh.vehicleCode,
          totalHours: 0,
          totalCost: 0,
          byDate: new Map(),
        });
      }
      const entry = crew.vehicles.get(key)!;
      entry.totalHours += veh.hours;
      entry.totalCost += veh.cost;
      const prev = entry.byDate.get(dateStr) || { hours: 0, cost: 0 };
      entry.byDate.set(dateStr, {
        hours: prev.hours + veh.hours,
        cost: prev.cost + veh.cost,
      });
    }

    for (const mat of day.materials) {
      if (!crewMap.has(mat.crewType)) crewMap.set(mat.crewType, emptyCrewData());
      const crew = crewMap.get(mat.crewType)!;
      crew.totalMaterialCost += mat.cost;
      crew.totalMaterialQty += mat.quantity;
      const key = `${mat.materialName}|${mat.supplierName}`;
      if (!crew.materials.has(key)) {
        crew.materials.set(key, {
          supplier: mat.supplierName,
          unit: mat.unit,
          totalQty: 0,
          totalCost: 0,
          estimated: mat.estimated,
          byDate: new Map(),
        });
      }
      const entry = crew.materials.get(key)!;
      entry.totalQty += mat.quantity;
      entry.totalCost += mat.cost;
      if (mat.estimated) entry.estimated = true;
      const prev = entry.byDate.get(dateStr) || { qty: 0, cost: 0 };
      entry.byDate.set(dateStr, {
        qty: prev.qty + mat.quantity,
        cost: prev.cost + mat.cost,
      });
    }

    for (const nc of day.nonCostedMaterials) {
      if (!crewMap.has(nc.crewType)) crewMap.set(nc.crewType, emptyCrewData());
      const crew = crewMap.get(nc.crewType)!;
      const key = `${nc.materialName}|${nc.supplierName}`;
      if (!crew.nonCostedMaterials.has(key)) {
        crew.nonCostedMaterials.set(key, {
          supplier: nc.supplierName,
          unit: nc.unit || "",
          totalQty: 0,
          byDate: new Map(),
        });
      }
      const entry = crew.nonCostedMaterials.get(key)!;
      entry.totalQty += nc.quantity;
      const prev = entry.byDate.get(dateStr) || 0;
      entry.byDate.set(dateStr, prev + nc.quantity);
    }

    for (const trk of day.trucking) {
      if (!crewMap.has(trk.crewType)) crewMap.set(trk.crewType, emptyCrewData());
      const crew = crewMap.get(trk.crewType)!;
      crew.totalTruckingCost += trk.cost;
      if (!crew.trucking.has(trk.truckingType)) {
        crew.trucking.set(trk.truckingType, {
          rate: trk.rate,
          rateType: trk.rateType,
          totalQty: 0,
          totalHours: 0,
          totalCost: 0,
          byDate: new Map(),
        });
      }
      const entry = crew.trucking.get(trk.truckingType)!;
      entry.totalQty += trk.quantity;
      entry.totalHours += trk.hours ?? 0;
      entry.totalCost += trk.cost;
      const prev = entry.byDate.get(dateStr) || { qty: 0, hours: 0, cost: 0 };
      entry.byDate.set(dateStr, {
        qty: prev.qty + trk.quantity,
        hours: prev.hours + (trk.hours ?? 0),
        cost: prev.cost + trk.cost,
      });
    }
  }

  const dates = [...dateSet].sort();
  return { crewMap, dates };
}

// ---- CrewCard ----
interface ICrewCard {
  crewType: string;
  crew: CrewData;
  dates: string[];
}

const CrewCard = ({ crewType, crew, dates }: ICrewCard) => {
  const [open, setOpen] = React.useState(false);

  const formatCurrency = (n: number) =>
    n < 0 ? `-$${formatNumber(Math.abs(n))}` : `$${formatNumber(n)}`;

  return (
    <Card
      heading={
        <HStack justify="space-between" w="100%">
          <HStack>
            <IconButton
              aria-label="Toggle"
              icon={open ? <FiChevronDown /> : <FiChevronRight />}
              size="xs"
              variant="ghost"
              onClick={() => setOpen(!open)}
            />
            <Heading size="sm">{crewType}</Heading>
          </HStack>
          <HStack spacing={4} fontSize="sm" color="gray.600">
            <Text>
              Wages: <strong>{formatCurrency(crew.totalEmployeeCost)}</strong>
            </Text>
            <Text>
              Equip: <strong>{formatCurrency(crew.totalVehicleCost)}</strong>
            </Text>
            <Text>
              Mat: <strong>{formatCurrency(crew.totalMaterialCost)}</strong>
            </Text>
            <Text>
              Trucking: <strong>{formatCurrency(crew.totalTruckingCost)}</strong>
            </Text>
          </HStack>
        </HStack>
      }
    >
      <Collapse in={open} animateOpacity>
        <Stack spacing={4} pt={2}>
          {/* Employees */}
          {crew.employees.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">
                Employees
              </Heading>
              <Box overflowX="auto">
                <Table size="sm" minW="600px">
                  <Thead>
                    <Tr>
                      <Th minW="150px">Name</Th>
                      <Th isNumeric>Total Hrs</Th>
                      <Th isNumeric>Total Cost</Th>
                      {dates.map((d) => (
                        <Th key={d} isNumeric whiteSpace="nowrap">
                          {formatDate(new Date(d + "T12:00:00"), "MMM D")}
                        </Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {[...crew.employees.entries()].map(([name, entry]) => (
                      <Tr key={name}>
                        <Td fontWeight="medium">{name}</Td>
                        <Td isNumeric>{formatNumber(entry.totalHours)}</Td>
                        <Td isNumeric>{formatCurrency(entry.totalCost)}</Td>
                        {dates.map((d) => {
                          const day = entry.byDate.get(d);
                          return (
                            <Td key={d} isNumeric color={day ? undefined : "gray.300"}>
                              {day ? formatNumber(day.hours) : "—"}
                            </Td>
                          );
                        })}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

          {/* Vehicles */}
          {crew.vehicles.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">
                Equipment
              </Heading>
              <Box overflowX="auto">
                <Table size="sm" minW="600px">
                  <Thead>
                    <Tr>
                      <Th minW="150px">Vehicle</Th>
                      <Th>Code</Th>
                      <Th isNumeric>Total Hrs</Th>
                      <Th isNumeric>Total Cost</Th>
                      {dates.map((d) => (
                        <Th key={d} isNumeric whiteSpace="nowrap">
                          {formatDate(new Date(d + "T12:00:00"), "MMM D")}
                        </Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {[...crew.vehicles.entries()].map(([name, entry]) => (
                      <Tr key={name}>
                        <Td fontWeight="medium">{entry.name}</Td>
                        <Td color="gray.500">{entry.code}</Td>
                        <Td isNumeric>{formatNumber(entry.totalHours)}</Td>
                        <Td isNumeric>{formatCurrency(entry.totalCost)}</Td>
                        {dates.map((d) => {
                          const day = entry.byDate.get(d);
                          return (
                            <Td key={d} isNumeric color={day ? undefined : "gray.300"}>
                              {day ? formatNumber(day.hours) : "—"}
                            </Td>
                          );
                        })}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

          {/* Materials */}
          {crew.materials.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">
                Materials
              </Heading>
              <Box overflowX="auto">
                <Table size="sm" minW="600px">
                  <Thead>
                    <Tr>
                      <Th minW="150px">Material</Th>
                      <Th>Supplier</Th>
                      <Th isNumeric>Total Qty</Th>
                      <Th isNumeric>Total Cost</Th>
                      {dates.map((d) => (
                        <Th key={d} isNumeric whiteSpace="nowrap">
                          {formatDate(new Date(d + "T12:00:00"), "MMM D")}
                        </Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {[...crew.materials.entries()].map(([key, entry]) => {
                      const [matName] = key.split("|");
                      return (
                        <Tr key={key}>
                          <Td fontWeight="medium">
                            {matName}
                            {entry.estimated && (
                              <Badge ml={1} colorScheme="yellow" fontSize="xs">
                                Est
                              </Badge>
                            )}
                          </Td>
                          <Td color="gray.500">{entry.supplier}</Td>
                          <Td isNumeric>
                            {formatNumber(entry.totalQty)} {entry.unit}
                          </Td>
                          <Td isNumeric>{formatCurrency(entry.totalCost)}</Td>
                          {dates.map((d) => {
                            const day = entry.byDate.get(d);
                            return (
                              <Td key={d} isNumeric color={day ? undefined : "gray.300"}>
                                {day ? formatNumber(day.qty) : "—"}
                              </Td>
                            );
                          })}
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

          {/* Non-Costed Materials */}
          {crew.nonCostedMaterials.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">
                Non-Costed Materials
              </Heading>
              <Box overflowX="auto">
                <Table size="sm" minW="600px">
                  <Thead>
                    <Tr>
                      <Th minW="150px">Material</Th>
                      <Th>Supplier</Th>
                      <Th isNumeric>Total Qty</Th>
                      {dates.map((d) => (
                        <Th key={d} isNumeric whiteSpace="nowrap">
                          {formatDate(new Date(d + "T12:00:00"), "MMM D")}
                        </Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {[...crew.nonCostedMaterials.entries()].map(([key, entry]) => {
                      const [matName] = key.split("|");
                      return (
                        <Tr key={key}>
                          <Td fontWeight="medium">{matName}</Td>
                          <Td color="gray.500">{entry.supplier}</Td>
                          <Td isNumeric>
                            {formatNumber(entry.totalQty)} {entry.unit}
                          </Td>
                          {dates.map((d) => {
                            const qty = entry.byDate.get(d);
                            return (
                              <Td key={d} isNumeric color={qty ? undefined : "gray.300"}>
                                {qty ? formatNumber(qty) : "—"}
                              </Td>
                            );
                          })}
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

          {/* Trucking */}
          {crew.trucking.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">
                Trucking
              </Heading>
              <Box overflowX="auto">
                <Table size="sm" minW="600px">
                  <Thead>
                    <Tr>
                      <Th minW="150px">Type</Th>
                      <Th>Rate</Th>
                      <Th isNumeric>Total Qty</Th>
                      <Th isNumeric>Total Cost</Th>
                      {dates.map((d) => (
                        <Th key={d} isNumeric whiteSpace="nowrap">
                          {formatDate(new Date(d + "T12:00:00"), "MMM D")}
                        </Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {[...crew.trucking.entries()].map(([type, entry]) => (
                      <Tr key={type}>
                        <Td fontWeight="medium">{type}</Td>
                        <Td color="gray.500">
                          ${formatNumber(entry.rate)}/{entry.rateType}
                        </Td>
                        <Td isNumeric>{formatNumber(entry.totalQty)}</Td>
                        <Td isNumeric>{formatCurrency(entry.totalCost)}</Td>
                        {dates.map((d) => {
                          const day = entry.byDate.get(d);
                          return (
                            <Td key={d} isNumeric color={day ? undefined : "gray.300"}>
                              {day ? formatNumber(day.qty) : "—"}
                            </Td>
                          );
                        })}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}
        </Stack>
      </Collapse>
    </Card>
  );
};

// ---- Main Breakdown component ----
const Breakdown = ({ jobsiteMongoId, startDate, endDate }: IBreakdown) => {
  const { data, loading, error } = useJobsiteReportQuery({
    variables: {
      jobsiteMongoId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
    skip: !jobsiteMongoId,
  });

  const report = data?.jobsiteReport;

  const { crewMap, dates } = React.useMemo(() => {
    if (!report) return { crewMap: new Map<string, CrewData>(), dates: [] };
    return aggregateDayReports(report.dayReports);
  }, [report]);

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
        Error loading breakdown: {error.message}
      </Alert>
    );
  }

  if (!report || crewMap.size === 0) {
    return (
      <Alert status="warning">
        <AlertIcon />
        No on-site data found for this jobsite in the selected date range.
      </Alert>
    );
  }

  return (
    <Box overflowY="auto" h="100%" w="100%">
      <Stack spacing={3}>
        {report.crewTypes.map((crewType) => {
          const crew = crewMap.get(crewType);
          if (!crew) return null;
          return (
            <CrewCard
              key={crewType}
              crewType={crewType}
              crew={crew}
              dates={dates}
            />
          );
        })}
      </Stack>
    </Box>
  );
};

export default Breakdown;
```

**Step 2: Verify TypeScript**
```bash
cd /home/dev/work/bow-mark/client && npx tsc --noEmit 2>&1 | tail -20
```
Expected: Exit 0.

**Step 3: Commit**
```bash
git add client/src/components/pages/jobsite-report/Breakdown.tsx
git commit -m "feat: add jobsite report Breakdown tab with crew-type cards"
```

---

## Task 8: Create Productivity tab component

The existing `ProductivityAnalytics` component at `client/src/components/pages/jobsite-year-report/ProductivityAnalytics.tsx` accepts `{ jobsiteMongoId: string, year: number }` and internally calls `useJobsiteProductivityQuery`. For the new page we need `startDate`/`endDate`. Rather than modify the existing component (it's in use on the year report page), create a new thin component that calls the query directly with a date range.

**Files:**
- Create: `client/src/components/pages/jobsite-report/Productivity.tsx`

**Step 1: Read the existing ProductivityAnalytics.tsx completely**

```bash
cat /home/dev/work/bow-mark/client/src/components/pages/jobsite-year-report/ProductivityAnalytics.tsx
```

Use this as the reference for UI patterns. The new component replicates the same UI but accepts `startDate`/`endDate` instead of `year`, and passes them directly to `useJobsiteProductivityQuery` as `dateRange: { startDate: new Date(startDate), endDate: new Date(endDate) }`.

**Step 2: Create `Productivity.tsx`**

Create `client/src/components/pages/jobsite-report/Productivity.tsx` by copying the structure of the existing `ProductivityAnalytics.tsx` but:
1. Change props interface from `{ jobsiteMongoId: string; year: number }` to `{ jobsiteMongoId: string; startDate: string; endDate: string }`
2. Change the query variables from `{ jobsiteMongoId, dateRange: { startDate: new Date(year, 0, 1), endDate: new Date(year, 11, 31) } }` to `{ jobsiteMongoId, dateRange: { startDate: new Date(startDate), endDate: new Date(endDate) } }`
3. Keep all other logic identical (material grouping dropdown, checkbox selection, trend chart, labor type hours table)
4. After the productivity content, add a **Daily Breakdown** section at the very bottom using the same `useJobsiteReportQuery` data (already fetched by Summary and Breakdown tabs — Apollo cache means no extra network request). Add 4 sub-tabs (Summary | Employees | Vehicles | Materials) matching the layout from `ClientContentPG.tsx`.

The daily breakdown section queries `useJobsiteReportQuery` with the same `{ jobsiteMongoId, startDate, endDate }` variables as the other tabs and renders the `report.dayReports` data in tabular form.

**Step 3: Verify TypeScript**
```bash
cd /home/dev/work/bow-mark/client && npx tsc --noEmit 2>&1 | tail -20
```
Expected: Exit 0.

**Step 4: Commit**
```bash
git add client/src/components/pages/jobsite-report/Productivity.tsx
git commit -m "feat: add jobsite report Productivity tab"
```

---

## Verification

After all tasks are complete:

1. Ensure the server is running (`tilt up` or `npm run start:dev` in `server/`)
2. Navigate to the company dashboard (`/dashboard`)
3. Click a jobsite name in the All Jobs table (Overview tab) — should navigate to `/jobsite/[id]/report?startDate=...&endDate=...`
4. Verify the breadcrumb shows "Dashboard › [Jobsite Name]"
5. Check **Summary tab**: revenue/expense cards with markup breakdown, on-site costs grid, invoice tables
6. Check **Breakdown tab**: one crew-type card per crew, expand it — employee/vehicle/material/trucking tables with date columns
7. Check **Productivity tab**: T/H stats, material productivity table, labor hours, daily breakdown at bottom
8. Change the date range — all tabs should update
9. Check Financial tab on dashboard → click a jobsite row → same new page
10. Run final TypeScript check: `cd client && npx tsc --noEmit`
