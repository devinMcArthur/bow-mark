# Tonnes per Man Hour Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Tonnes per Man Hour (T/MH) as a secondary metric alongside the existing Tonnes per Crew Hour (T/H) in both the Dashboard Productivity tab and the Jobsite Report Productivity tab.

**Architecture:** Man hours = `SUM(employee hours)` per daily report (vs crew hours = `AVG(employee hours)`). Each resolver gets a parallel man-hours query; proportional allocation mirrors the existing crew-hours pattern. New fields are additive — nothing existing changes.

**Tech Stack:** Type-GraphQL (server types), Kysely (PG queries), GraphQL Code Generator (client types), React/Chakra UI (display).

---

### Task 1: Add man-hours fields to server GraphQL types

**Files:**
- Modify: `server/src/graphql/types/productivityAnalytics.ts`
- Modify: `server/src/graphql/types/businessDashboard.ts`

**Step 1: Add fields to `MaterialDailyBreakdown`**

In `productivityAnalytics.ts`, add after `tonnesPerHour`:
```typescript
@Field(() => Float)
manHours!: number;

@Field(() => Float)
tonnesPerManHour!: number;
```

**Step 2: Add fields to `MaterialProductivity`**

In `productivityAnalytics.ts`, add after `tonnesPerHour`:
```typescript
@Field(() => Float)
totalManHours!: number;

@Field(() => Float)
tonnesPerManHour!: number;
```

**Step 3: Add fields to `JobsiteProductivityReport`**

In `productivityAnalytics.ts`, add after `totalCrewHours`:
```typescript
@Field(() => Float)
totalManHours!: number;

@Field(() => Float)
overallTonnesPerManHour!: number;
```

**Step 4: Add fields to `DashboardProductivityJobsiteItem`**

In `businessDashboard.ts`, add after `tonnesPerHour`:
```typescript
@Field(() => Float)
totalManHours!: number;

@Field(() => Float, { nullable: true })
tonnesPerManHour?: number;
```

**Step 5: Add fields to `DashboardProductivityCrewItem`**

In `businessDashboard.ts`, add after `tonnesPerHour`:
```typescript
@Field(() => Float)
totalManHours!: number;

@Field(() => Float, { nullable: true })
tonnesPerManHour?: number;
```

**Step 6: Add fields to `DashboardProductivityReport`**

In `businessDashboard.ts`, add after `totalCrewHours`:
```typescript
@Field(() => Float)
totalManHours!: number;

@Field(() => Float)
averageTonnesPerManHour!: number;
```

**Step 7: Type-check server**
```bash
cd server && npm run build 2>&1 | head -30
```
Expected: compile errors only about missing values in resolvers (not type definition errors).

---

### Task 2: Update productivityAnalytics resolver

**Files:**
- Modify: `server/src/graphql/resolvers/productivityAnalytics/index.ts`

Context: This resolver handles `jobsiteProductivity` (used by the Jobsite Report page). The key query is Step 3 (`crewHoursPerReport`) which uses `AVG(ew.hours)`. We need to add `SUM(ew.hours)` to the same query, then propagate through proportional allocation.

**Step 1: Add `man_hours` to the crew hours query (Step 3)**

Find the query that selects `AVG(ew.hours) as crew_hours` (around line 317 and again ~618). In both places, add `man_hours` to the select:
```typescript
sql<number>`AVG(ew.hours)`.as("crew_hours"),
sql<number>`SUM(ew.hours)`.as("man_hours"),
```

**Step 2: Update `DailyData` interface and `MaterialStats` interface**

Find these two interfaces (around line 389):
```typescript
interface DailyData {
  tonnes: number;
  crewHours: number;
  manHours: number;   // ADD
}
interface MaterialStats {
  // ... existing fields ...
  totalProportionalHours: number;
  totalProportionalManHours: number;   // ADD
  // ...
}
```

**Step 3: Build manHoursMap parallel to crewHoursMap**

After the `crewHoursMap` is built (around line 381), add:
```typescript
const manHoursMap = new Map<string, number>();
for (const row of crewHoursPerReport) {
  if (row.daily_report_id) {
    manHoursMap.set(row.daily_report_id, Number(row.man_hours || 0));
  }
}
```

**Step 4: Compute proportional man hours in Step 5**

In the proportional allocation loop (around line 413), alongside `proportionalHours` add:
```typescript
const manHours = manHoursMap.get(row.daily_report_id) || 0;
const proportionalManHours =
  totalCrewTonnes > 0 ? (tonnes / totalCrewTonnes) * manHours : 0;
```

Then update the `dailyData` entry:
```typescript
crewHours: existingDaily.crewHours + proportionalHours,
manHours: existingDaily.manHours + proportionalManHours,   // ADD
```

And update `materialStats`:
```typescript
totalProportionalManHours: existing.totalProportionalManHours + proportionalManHours,
```

**Step 5: Propagate to `MaterialProductivity` output**

Where `totalCrewHours` and `tonnesPerHour` are set on each material result, also set:
```typescript
totalManHours: stats.totalProportionalManHours,
tonnesPerManHour: stats.totalProportionalManHours > 0
  ? stats.totalTonnes / stats.totalProportionalManHours
  : 0,
```

**Step 6: Propagate to `MaterialDailyBreakdown` output**

Where `crewHours` and `tonnesPerHour` are set per day, also set:
```typescript
manHours: data.manHours,
tonnesPerManHour: data.manHours > 0 ? data.tonnes / data.manHours : 0,
```

**Step 7: Propagate to overall `JobsiteProductivityReport` output**

For `totalManHours` and `overallTonnesPerManHour` on the report root: sum man hours the same way as crew hours (using `manHoursMap` over the daily reports that had material deliveries), then divide total tonnes.

Find where `totalCrewHours` is computed (around line 643) and add parallel logic:
```typescript
let totalManHours = 0;
for (const row of materialCrews) {
  if (row.daily_report_id) {
    totalManHours += manHoursMap.get(row.daily_report_id) || 0;
  }
}
const overallTonnesPerManHour =
  totalManHours > 0 ? totalTonnes / totalManHours : 0;
```

Then add to the return value:
```typescript
totalManHours,
overallTonnesPerManHour,
```

**Step 8: Type-check server**
```bash
cd server && npm run build 2>&1 | head -40
```
Expected: No errors.

---

### Task 3: Update businessDashboard resolver

**Files:**
- Modify: `server/src/graphql/resolvers/businessDashboard/index.ts`

Context: The dashboard productivity query uses `getCrewHoursPerReport` (AVG-based) for jobsite benchmarks, and `getCrewHoursPerCrew` / `getManHoursPerCrew` (MAX-based sum) for crew items. Man hours needs a separate simple SUM approach.

**Step 1: Add `getManHoursPerReport` private helper**

Add after `getCrewHoursPerReport`:
```typescript
/** Man hours per daily report: SUM of all employee hours */
private async getManHoursPerReport(startDate: Date, endDate: Date) {
  return db
    .selectFrom("fact_employee_work as ew")
    .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
    .select([
      "ew.daily_report_id",
      "ew.jobsite_id",
      sql<number>`SUM(ew.hours)`.as("man_hours"),
    ])
    .where("ew.work_date", ">=", startDate)
    .where("ew.work_date", "<=", endDate)
    .where("ew.archived_at", "is", null)
    .where("dr.approved", "=", true)
    .where("dr.archived", "=", false)
    .groupBy(["ew.daily_report_id", "ew.jobsite_id"])
    .execute();
}
```

**Step 2: Add `getManHoursPerCrew` private helper**

Add after `getCrewHoursPerCrew`:
```typescript
/** Man hours per crew: SUM of all employee hours (not MAX-based) */
private async getManHoursPerCrew(startDate: Date, endDate: Date) {
  return db
    .selectFrom("fact_employee_work as ew")
    .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
    .select([
      "ew.crew_id",
      sql<number>`SUM(ew.hours)`.as("total_man_hours"),
    ])
    .where("ew.work_date", ">=", startDate)
    .where("ew.work_date", "<=", endDate)
    .where("ew.archived_at", "is", null)
    .where("dr.approved", "=", true)
    .where("dr.archived", "=", false)
    .groupBy("ew.crew_id")
    .execute();
}
```

**Step 3: Fetch man hours in `dashboardProductivity`**

In the `Promise.all` call (around line 297), add `manHoursPerReport` and `manHoursPerCrewRows`:
```typescript
const [
  availableMaterials,
  shipmentsPerReport,
  crewHoursPerReport,
  manHoursPerReport,       // ADD
  crewRows,
  tonnesPerCrewRows,
  crewHoursPerCrewRows,
  manHoursPerCrewRows,     // ADD
] = await Promise.all([
  this.getAvailableMaterials(startDate, endDate, materialGrouping),
  this.getShipmentsPerReport(startDate, endDate, materialGrouping, filterCriteria),
  this.getCrewHoursPerReport(startDate, endDate),
  this.getManHoursPerReport(startDate, endDate),   // ADD
  this.getCrews(),
  this.getTonnesPerCrew(startDate, endDate, crewMaterialNames),
  this.getCrewHoursPerCrew(startDate, endDate),
  this.getManHoursPerCrew(startDate, endDate),     // ADD
]);
```

**Step 4: Build `manHoursDailyMap`**

After `crewHoursDailyMap` is built:
```typescript
const manHoursDailyMap = new Map<string, number>();
for (const row of manHoursPerReport) {
  if (row.daily_report_id) {
    manHoursDailyMap.set(row.daily_report_id, Number(row.man_hours || 0));
  }
}
```

**Step 5: Update `aggregateByJobsite` to accept and track man hours**

Add `totalManHours` to the `JobsiteStats` interface:
```typescript
interface JobsiteStats {
  // ... existing ...
  totalManHours: number;
  // ...
}
```

Add it to the initial object:
```typescript
totalManHours: 0,
```

Update the loop that sets `totalCrewHours` to also set `totalManHours`:
```typescript
for (const stats of jobsiteStats.values()) {
  let totalCrewHours = 0;
  let totalManHours = 0;
  for (const drId of stats.dailyReportIds) {
    totalCrewHours += crewHoursMap.get(drId) || 0;
    totalManHours += manHoursMap.get(drId) || 0;
  }
  stats.totalCrewHours = totalCrewHours;
  stats.totalManHours = totalManHours;
}
```

Update the `aggregateByJobsite` signature to accept the man hours map:
```typescript
private aggregateByJobsite(
  shipmentsPerReport: ...,
  crewHoursMap: Map<string, number>,
  manHoursMap: Map<string, number>   // ADD
)
```

Update the call site to pass `manHoursDailyMap`.

**Step 6: Update `buildJobsiteBenchmarks` to include man hours**

Add `totalManHours` to its internal working type and the `DashboardProductivityJobsiteItem` return:
```typescript
// In jobsitesWithData push:
jobsitesWithData.push({ ...stats, tonnesPerHour });

// In final map:
return {
  // ... existing fields ...
  totalManHours: stats.totalManHours,
  tonnesPerManHour: stats.totalManHours > 0
    ? stats.totalTonnes / stats.totalManHours
    : undefined,
};
```

Also accumulate `overallManHours` alongside `overallCrewHours`:
```typescript
let overallTonnes = 0;
let overallCrewHours = 0;
let overallManHours = 0;

// In loop:
overallManHours += stats.totalManHours;

// Return:
return {
  jobsites,
  overallTonnes,
  overallCrewHours,
  overallManHours,   // ADD
  regression: { intercept, slope },
};
```

**Step 7: Update `dashboardProductivity` return for crew items**

Build `manHoursCrewMap` and add man hours to each crew item:
```typescript
const manHoursCrewMap = new Map(
  manHoursPerCrewRows.map((r) => [r.crew_id, Number(r.total_man_hours)])
);

// In crew item push:
crewItems.push({
  // ... existing ...
  totalManHours: manHoursCrewMap.get(row.crew_id) ?? 0,
  tonnesPerManHour: (manHoursCrewMap.get(row.crew_id) ?? 0) > 0
    ? tonnes / (manHoursCrewMap.get(row.crew_id) ?? 0)
    : undefined,
});
```

**Step 8: Update `dashboardProductivity` return root**

```typescript
const averageTonnesPerManHour =
  overallManHours > 0 ? overallTonnes / overallManHours : 0;

return {
  averageTonnesPerHour,
  averageTonnesPerManHour,   // ADD
  totalTonnes: overallTonnes,
  totalCrewHours: overallCrewHours,
  totalManHours: overallManHours,   // ADD
  // ...
};
```

**Step 9: Type-check server**
```bash
cd server && npm run build 2>&1 | head -40
```
Expected: No errors.

---

### Task 4: Update GraphQL client queries

**Files:**
- Modify: `client/src/graphql/queries/JobsiteProductivity.graphql`
- Modify: `client/src/graphql/queries/Dashboard.graphql`

**Step 1: Add fields to `JobsiteProductivity.graphql`**

Under `materialProductivity`, add after `tonnesPerHour`:
```graphql
totalManHours
tonnesPerManHour
```

Under `dailyBreakdown`, add after `tonnesPerHour`:
```graphql
manHours
tonnesPerManHour
```

At root level, add after `totalCrewHours`:
```graphql
totalManHours
overallTonnesPerManHour
```

**Step 2: Add fields to `Dashboard.graphql`**

In the `dashboardProductivity` query, find the jobsite items block and add after `tonnesPerHour`:
```graphql
totalManHours
tonnesPerManHour
```

Find the crew items block and add after `tonnesPerHour`:
```graphql
totalManHours
tonnesPerManHour
```

At the root `dashboardProductivity` level add after `totalCrewHours`:
```graphql
totalManHours
averageTonnesPerManHour
```

**Step 3: Run codegen**
```bash
cd client && npm run codegen
```
Expected: Regenerates `src/generated/graphql.tsx` with new fields. No errors.

---

### Task 5: Update Jobsite Report Productivity UI

**Files:**
- Modify: `client/src/components/pages/jobsite-report/Productivity.tsx`

**Step 1: Update Summary stat card**

Find the "Overall T/H" `<Stat>` and add a secondary line below `<StatNumber>`:
```tsx
<StatNumber color="blue.500">
  {formatNumber(productivity.overallTonnesPerHour)}
</StatNumber>
<StatHelpText>
  <Text as="span" color="gray.500" fontSize="xs">
    {formatNumber(productivity.overallTonnesPerManHour)} t/mh
  </Text>
</StatHelpText>
```

Update the Total Crew Hours stat label and help text to clarify:
```tsx
<StatLabel>Total Crew Hours</StatLabel>
<StatNumber>{formatNumber(productivity.totalCrewHours)}</StatNumber>
<StatHelpText>
  Avg shift length per day
  <Text as="span" color="gray.400" fontSize="xs" ml={1}>
    ({formatNumber(productivity.totalManHours)} man-hrs)
  </Text>
</StatHelpText>
```

**Step 2: Add T/MH secondary value in material productivity table**

Find the T/H `<Td>` in the material productivity table (around line 532):
```tsx
<Td isNumeric fontWeight="bold" color="blue.600">
  {formatNumber(mat.tonnesPerHour)}
  <Text as="div" fontSize="xs" color="gray.400" fontWeight="normal">
    {formatNumber(mat.tonnesPerManHour)} t/mh
  </Text>
</Td>
```

**Step 3: Type-check client**
```bash
cd client && npm run type-check 2>&1 | grep Productivity
```
Expected: No errors.

---

### Task 6: Update Dashboard Productivity UI

**Files:**
- Modify: `client/src/components/pages/dashboard/Productivity.tsx`

**Step 1: Update Productivity Summary stat card**

Find the "Average T/H" `<Stat>` and add secondary t/mh:
```tsx
<StatNumber color="blue.500">
  {formatNumber(report.averageTonnesPerHour)}
</StatNumber>
<StatHelpText>
  <Text as="span" color="gray.500" fontSize="xs">
    {formatNumber(report.averageTonnesPerManHour)} t/mh
  </Text>
</StatHelpText>
```

Update the Total Crew Hours stat similarly to jobsite report:
```tsx
<StatHelpText>
  {viewMode === "crew" ? "All crews" : "All jobsites"}
  <Text as="span" color="gray.400" fontSize="xs" ml={1}>
    ({formatNumber(report.totalManHours)} man-hrs)
  </Text>
</StatHelpText>
```

**Step 2: Add T/MH column to Jobsite Rankings table**

Find the `<Th>` for T/H in the jobsite rankings (around the `tonnesPerHour` sort column). After the T/H `<Td>`:
```tsx
<Td isNumeric fontWeight="bold" color="blue.600">
  {formatNumber(j.tonnesPerHour)}
  <Text as="div" fontSize="xs" color="gray.400" fontWeight="normal">
    {j.tonnesPerManHour != null ? `${formatNumber(j.tonnesPerManHour)} t/mh` : "—"}
  </Text>
</Td>
```

**Step 3: Add T/MH secondary to Crew Rankings table**

Find the T/H `<Td>` in crew rankings (around the `tonnesPerHour` cell):
```tsx
<Td isNumeric fontWeight="bold" color="blue.600">
  {crew.tonnesPerHour != null ? formatNumber(crew.tonnesPerHour) : "—"}
  <Text as="div" fontSize="xs" color="gray.400" fontWeight="normal">
    {crew.tonnesPerManHour != null ? `${formatNumber(crew.tonnesPerManHour)} t/mh` : "—"}
  </Text>
</Td>
```

**Step 4: Type-check client**
```bash
cd client && npm run type-check 2>&1 | grep -E "Productivity|dashboard"
```
Expected: No errors.

---

### Task 7: Final verification and commit

**Step 1: Full server build**
```bash
cd server && npm run build
```
Expected: Clean build.

**Step 2: Full client type-check**
```bash
cd client && npm run type-check
```
Expected: No new errors (the pre-existing MenuButton TS2590 error on report.tsx:187 is known and unrelated).

**Step 3: Commit**
```bash
cd /home/dev/work/bow-mark
git add server/src/graphql/types/productivityAnalytics.ts
git add server/src/graphql/types/businessDashboard.ts
git add server/src/graphql/resolvers/productivityAnalytics/index.ts
git add server/src/graphql/resolvers/businessDashboard/index.ts
git add client/src/graphql/queries/JobsiteProductivity.graphql
git add client/src/graphql/queries/Dashboard.graphql
git add client/src/generated/graphql.tsx
git add client/src/components/pages/jobsite-report/Productivity.tsx
git add client/src/components/pages/dashboard/Productivity.tsx
git commit -m "feat: add tonnes per man hour alongside T/H in productivity views"
```
