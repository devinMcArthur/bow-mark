# Business Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a new `/dashboard` page with date range picker and three tabs (Overview, Financial, Productivity) as an executive business health dashboard backed by PostgreSQL.

**Architecture:** Three new GraphQL queries (`dashboardOverview`, `dashboardFinancial`, `dashboardProductivity`) accepting `startDate`/`endDate` strings, resolved from PostgreSQL fact tables. Three lazy-loaded React tab components on a new Next.js page completely separate from the existing master report.

**Tech Stack:** Type-GraphQL + Kysely (server), Apollo Client + Chakra UI + React.lazy (client), PostgreSQL star schema, GraphQL Code Generator.

---

### Task 1: Server — GraphQL Types

**Files:**
- Create: `server/src/graphql/types/businessDashboard.ts`

**Context:** Follow the pattern in `server/src/graphql/types/financialPerformance.ts`. Use `@InputType`, `@ObjectType`, `@Field` decorators from `type-graphql`.

**Step 1: Create the types file**

```typescript
import { Field, Float, ID, InputType, Int, ObjectType } from "type-graphql";

// ─── Inputs ──────────────────────────────────────────────────────────────────

@InputType()
export class DashboardInput {
  @Field()
  startDate!: string; // ISO date string e.g. "2026-01-01"

  @Field()
  endDate!: string; // ISO date string e.g. "2026-12-31"
}

@InputType()
export class DashboardProductivityInput extends DashboardInput {
  @Field(() => [String], { nullable: true })
  selectedMaterials?: string[]; // Filter by material name
}

// ─── Overview ────────────────────────────────────────────────────────────────

@ObjectType()
export class DashboardOverviewItem {
  @Field(() => ID)
  jobsiteId!: string; // MongoDB ID for client-side links

  @Field()
  jobsiteName!: string;

  @Field({ nullable: true })
  jobcode?: string;

  @Field(() => Float)
  totalRevenue!: number;

  @Field(() => Float)
  totalDirectCost!: number;

  @Field(() => Float)
  netIncome!: number;

  @Field(() => Float, { nullable: true })
  netMarginPercent?: number; // null when revenue is 0

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float, { nullable: true })
  tonnesPerHour?: number; // null when crew hours is 0
}

@ObjectType()
export class DashboardOverviewReport {
  @Field(() => Float)
  totalRevenue!: number;

  @Field(() => Float)
  totalNetIncome!: number;

  @Field(() => Float, { nullable: true })
  avgNetMarginPercent?: number;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float, { nullable: true })
  avgTonnesPerHour?: number;

  // Year-over-year % change (null if no prior period data)
  @Field(() => Float, { nullable: true })
  revenueChangePercent?: number;

  @Field(() => Float, { nullable: true })
  netIncomeChangePercent?: number;

  @Field(() => Float, { nullable: true })
  tonnesChangePercent?: number;

  @Field(() => Float, { nullable: true })
  thChangePercent?: number;

  @Field(() => [DashboardOverviewItem])
  jobsites!: DashboardOverviewItem[];
}

// ─── Financial ───────────────────────────────────────────────────────────────

@ObjectType()
export class DashboardFinancialItem {
  @Field(() => ID)
  jobsiteId!: string;

  @Field()
  jobsiteName!: string;

  @Field({ nullable: true })
  jobcode?: string;

  @Field(() => Float)
  totalRevenue!: number;

  @Field(() => Float)
  employeeCost!: number;

  @Field(() => Float)
  vehicleCost!: number;

  @Field(() => Float)
  materialCost!: number;

  @Field(() => Float)
  truckingCost!: number;

  @Field(() => Float)
  expenseInvoiceCost!: number;

  @Field(() => Float)
  totalDirectCost!: number;

  @Field(() => Float)
  netIncome!: number;

  @Field(() => Float, { nullable: true })
  netMarginPercent?: number;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float, { nullable: true })
  tonnesPerHour?: number;
}

@ObjectType()
export class DashboardFinancialReport {
  @Field(() => Float)
  totalRevenue!: number;

  @Field(() => Float)
  totalDirectCost!: number;

  @Field(() => Float)
  totalNetIncome!: number;

  @Field(() => Float, { nullable: true })
  avgNetMarginPercent?: number;

  @Field(() => [DashboardFinancialItem])
  jobsites!: DashboardFinancialItem[];
}

// ─── Productivity ─────────────────────────────────────────────────────────────

@ObjectType()
export class DashboardProductivityJobsiteItem {
  @Field(() => ID)
  jobsiteId!: string;

  @Field()
  jobsiteName!: string;

  @Field({ nullable: true })
  jobcode?: string;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float)
  totalCrewHours!: number;

  @Field(() => Float, { nullable: true })
  tonnesPerHour?: number;

  @Field(() => Float, { nullable: true })
  percentFromAverage?: number;
}

@ObjectType()
export class DashboardProductivityCrewItem {
  @Field(() => ID)
  crewId!: string; // PG UUID — used as React key

  @Field()
  crewName!: string;

  @Field()
  crewType!: string;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float)
  totalCrewHours!: number;

  @Field(() => Float, { nullable: true })
  tonnesPerHour?: number;

  @Field(() => Int)
  dayCount!: number;

  @Field(() => Int)
  jobsiteCount!: number;

  @Field(() => Float, { nullable: true })
  percentFromAverage?: number;
}

@ObjectType()
export class DashboardMaterialOption {
  @Field()
  materialName!: string;

  @Field()
  key!: string; // same as materialName — used as filter key
}

@ObjectType()
export class DashboardProductivityReport {
  @Field(() => Float, { nullable: true })
  avgTonnesPerHour?: number;

  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float)
  totalCrewHours!: number;

  @Field(() => Int)
  jobsiteCount!: number;

  @Field(() => [DashboardMaterialOption])
  availableMaterials!: DashboardMaterialOption[];

  @Field(() => [DashboardProductivityJobsiteItem])
  jobsites!: DashboardProductivityJobsiteItem[];

  @Field(() => [DashboardProductivityCrewItem])
  crews!: DashboardProductivityCrewItem[];
}
```

**Step 2: Verify it compiles**

Run: `cd /home/dev/work/bow-mark/server && npm run build`
Expected: exits 0, no TypeScript errors in the new file

**Step 3: Commit**

```bash
git add server/src/graphql/types/businessDashboard.ts
git commit -m "feat: add GraphQL types for business dashboard"
```

---

### Task 2: Server — BusinessDashboard Resolver

**Files:**
- Create: `server/src/graphql/resolvers/businessDashboard/index.ts`

**Context:** Read `server/src/graphql/resolvers/financialPerformance/index.ts` before starting — the db import path, Kysely patterns, and Promise.all structure all come from there. Key rules:
- Always join `dim_daily_report` and filter `dr.approved = true`, `dr.archived = false`
- Always filter `archived_at IS NULL` on fact tables
- Use `sql<number>\`SUM(...)\`.as("alias")` for aggregations
- Use `Map<pgId, value>` to aggregate, then look up `mongo_id` from `dim_jobsite` for the GraphQL response

The tonnes conversion SQL (same as productivityBenchmarks resolver):
```typescript
const TANDEM_TONNES_PER_LOAD = 22;
const CUBIC_METERS_TO_TONNES = 1.5;
const getTonnesConversion = () => sql<number>`
  CASE
    WHEN LOWER(ms.unit) = 'tonnes' THEN ms.quantity
    WHEN LOWER(ms.unit) = 'loads' AND ms.vehicle_type ILIKE '%tandem%'
      THEN ms.quantity * ${TANDEM_TONNES_PER_LOAD}
    WHEN LOWER(ms.unit) = 'm3'
      THEN ms.quantity * ${CUBIC_METERS_TO_TONNES}
    ELSE NULL
  END
`;
```

**Step 1: Create the resolver file**

```typescript
import { Arg, Query, Resolver } from "type-graphql";
import { sql } from "kysely";
import { db } from "../../db"; // check financialPerformance resolver for exact import path

import {
  DashboardInput,
  DashboardProductivityInput,
  DashboardOverviewReport,
  DashboardOverviewItem,
  DashboardFinancialReport,
  DashboardFinancialItem,
  DashboardProductivityReport,
  DashboardProductivityJobsiteItem,
  DashboardProductivityCrewItem,
  DashboardMaterialOption,
} from "../../types/businessDashboard";

const TANDEM_TONNES_PER_LOAD = 22;
const CUBIC_METERS_TO_TONNES = 1.5;

const getTonnesConversion = (alias = "ms") => sql<number>`
  CASE
    WHEN LOWER(${sql.ref(alias + ".unit")}) = 'tonnes' THEN ${sql.ref(alias + ".quantity")}
    WHEN LOWER(${sql.ref(alias + ".unit")}) = 'loads' AND ${sql.ref(alias + ".vehicle_type")} ILIKE '%tandem%'
      THEN ${sql.ref(alias + ".quantity")} * ${TANDEM_TONNES_PER_LOAD}
    WHEN LOWER(${sql.ref(alias + ".unit")}) = 'm3'
      THEN ${sql.ref(alias + ".quantity")} * ${CUBIC_METERS_TO_TONNES}
    ELSE NULL
  END
`;

@Resolver()
export default class BusinessDashboardResolver {

  // ─── Overview ─────────────────────────────────────────────────────────────

  @Query(() => DashboardOverviewReport)
  async dashboardOverview(
    @Arg("input") input: DashboardInput
  ): Promise<DashboardOverviewReport> {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    endDate.setHours(23, 59, 59, 999);

    // Prior year equivalent period for YoY comparison
    const priorStart = new Date(startDate);
    priorStart.setFullYear(priorStart.getFullYear() - 1);
    const priorEnd = new Date(endDate);
    priorEnd.setFullYear(priorEnd.getFullYear() - 1);

    const [
      jobsiteRows,
      revenueRows, employeeRows, vehicleRows, materialRows, truckingRows,
      expenseRows, tonnesRows, crewHoursRows,
      priorRevenueRows, priorEmployeeRows, priorVehicleRows, priorMaterialRows,
      priorTruckingRows, priorExpenseRows, priorTonnesRows, priorCrewHoursRows,
    ] = await Promise.all([
      this.getJobsites(),
      this.getRevenue(startDate, endDate),
      this.getEmployeeCosts(startDate, endDate),
      this.getVehicleCosts(startDate, endDate),
      this.getMaterialCosts(startDate, endDate),
      this.getTruckingCosts(startDate, endDate),
      this.getExpenseInvoiceCosts(startDate, endDate),
      this.getTonnesPerJobsite(startDate, endDate),
      this.getCrewHoursPerJobsite(startDate, endDate),
      this.getRevenue(priorStart, priorEnd),
      this.getEmployeeCosts(priorStart, priorEnd),
      this.getVehicleCosts(priorStart, priorEnd),
      this.getMaterialCosts(priorStart, priorEnd),
      this.getTruckingCosts(priorStart, priorEnd),
      this.getExpenseInvoiceCosts(priorStart, priorEnd),
      this.getTonnesPerJobsite(priorStart, priorEnd),
      this.getCrewHoursPerJobsite(priorStart, priorEnd),
    ]);

    // Build lookup maps keyed by PG jobsite UUID
    const revenueMap = new Map(revenueRows.map(r => [r.jobsite_id, Number(r.total_revenue)]));
    const employeeMap = new Map(employeeRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const vehicleMap = new Map(vehicleRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const materialMap = new Map(materialRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const truckingMap = new Map(truckingRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const expenseMap = new Map(expenseRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const tonnesMap = new Map(tonnesRows.map(r => [r.jobsite_id, Number(r.total_tonnes ?? 0)]));
    const crewHoursMap = new Map(crewHoursRows.map(r => [r.jobsite_id, Number(r.total_hours)]));

    const jobsiteMongoMap = new Map(jobsiteRows.map(j => [j.id, j]));

    // Only include jobsites with some activity in this period
    const activeIds = new Set([...revenueMap.keys(), ...employeeMap.keys(), ...tonnesMap.keys()]);

    const items: DashboardOverviewItem[] = [];
    for (const pgId of activeIds) {
      const j = jobsiteMongoMap.get(pgId);
      if (!j) continue;
      const revenue = revenueMap.get(pgId) ?? 0;
      const directCost =
        (employeeMap.get(pgId) ?? 0) + (vehicleMap.get(pgId) ?? 0) +
        (materialMap.get(pgId) ?? 0) + (truckingMap.get(pgId) ?? 0) +
        (expenseMap.get(pgId) ?? 0);
      const netIncome = revenue - directCost;
      const tonnes = tonnesMap.get(pgId) ?? 0;
      const crewHrs = crewHoursMap.get(pgId) ?? 0;
      items.push({
        jobsiteId: j.mongo_id,
        jobsiteName: j.name,
        jobcode: j.jobcode ?? undefined,
        totalRevenue: revenue,
        totalDirectCost: directCost,
        netIncome,
        netMarginPercent: revenue > 0 ? (netIncome / revenue) * 100 : undefined,
        totalTonnes: tonnes,
        tonnesPerHour: crewHrs > 0 ? tonnes / crewHrs : undefined,
      });
    }

    // Current period totals
    const totalRevenue = items.reduce((s, j) => s + j.totalRevenue, 0);
    const totalNetIncome = items.reduce((s, j) => s + j.netIncome, 0);
    const totalTonnes = items.reduce((s, j) => s + j.totalTonnes, 0);
    const totalCrewHrs = crewHoursRows.reduce((s, r) => s + Number(r.total_hours), 0);
    const avgTonnesPerHour = totalCrewHrs > 0 ? totalTonnes / totalCrewHrs : undefined;
    const margined = items.filter(j => j.netMarginPercent != null);
    const avgNetMarginPercent = margined.length > 0
      ? margined.reduce((s, j) => s + (j.netMarginPercent ?? 0), 0) / margined.length
      : undefined;

    // Prior year totals for YoY
    const priorRevenue = priorRevenueRows.reduce((s, r) => s + Number(r.total_revenue), 0);
    const priorCost =
      priorEmployeeRows.reduce((s, r) => s + Number(r.total_cost), 0) +
      priorVehicleRows.reduce((s, r) => s + Number(r.total_cost), 0) +
      priorMaterialRows.reduce((s, r) => s + Number(r.total_cost), 0) +
      priorTruckingRows.reduce((s, r) => s + Number(r.total_cost), 0) +
      priorExpenseRows.reduce((s, r) => s + Number(r.total_cost), 0);
    const priorNetIncome = priorRevenue - priorCost;
    const priorTonnes = priorTonnesRows.reduce((s, r) => s + Number(r.total_tonnes ?? 0), 0);
    const priorCrewHrs = priorCrewHoursRows.reduce((s, r) => s + Number(r.total_hours), 0);
    const priorTH = priorCrewHrs > 0 ? priorTonnes / priorCrewHrs : 0;
    const currentTH = avgTonnesPerHour ?? 0;

    const pctChange = (cur: number, prior: number) =>
      prior !== 0 ? ((cur - prior) / Math.abs(prior)) * 100 : undefined;

    return {
      totalRevenue,
      totalNetIncome,
      avgNetMarginPercent,
      totalTonnes,
      avgTonnesPerHour,
      revenueChangePercent: pctChange(totalRevenue, priorRevenue),
      netIncomeChangePercent: pctChange(totalNetIncome, priorNetIncome),
      tonnesChangePercent: pctChange(totalTonnes, priorTonnes),
      thChangePercent: priorTH !== 0 ? pctChange(currentTH, priorTH) : undefined,
      jobsites: items,
    };
  }

  // ─── Financial ────────────────────────────────────────────────────────────

  @Query(() => DashboardFinancialReport)
  async dashboardFinancial(
    @Arg("input") input: DashboardInput
  ): Promise<DashboardFinancialReport> {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    endDate.setHours(23, 59, 59, 999);

    const [
      jobsiteRows, revenueRows, employeeRows, vehicleRows,
      materialRows, truckingRows, expenseRows, tonnesRows, crewHoursRows,
    ] = await Promise.all([
      this.getJobsites(),
      this.getRevenue(startDate, endDate),
      this.getEmployeeCosts(startDate, endDate),
      this.getVehicleCosts(startDate, endDate),
      this.getMaterialCosts(startDate, endDate),
      this.getTruckingCosts(startDate, endDate),
      this.getExpenseInvoiceCosts(startDate, endDate),
      this.getTonnesPerJobsite(startDate, endDate),
      this.getCrewHoursPerJobsite(startDate, endDate),
    ]);

    const revenueMap = new Map(revenueRows.map(r => [r.jobsite_id, Number(r.total_revenue)]));
    const employeeMap = new Map(employeeRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const vehicleMap = new Map(vehicleRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const materialMap = new Map(materialRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const truckingMap = new Map(truckingRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const expenseMap = new Map(expenseRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const tonnesMap = new Map(tonnesRows.map(r => [r.jobsite_id, Number(r.total_tonnes ?? 0)]));
    const crewHoursMap = new Map(crewHoursRows.map(r => [r.jobsite_id, Number(r.total_hours)]));
    const jobsiteMongoMap = new Map(jobsiteRows.map(j => [j.id, j]));

    const activeIds = new Set([...revenueMap.keys(), ...employeeMap.keys(), ...tonnesMap.keys()]);

    const items: DashboardFinancialItem[] = [];
    let totalRevenue = 0, totalDirectCost = 0, totalNetIncome = 0;
    const margins: number[] = [];

    for (const pgId of activeIds) {
      const j = jobsiteMongoMap.get(pgId);
      if (!j) continue;
      const revenue = revenueMap.get(pgId) ?? 0;
      const employee = employeeMap.get(pgId) ?? 0;
      const vehicle = vehicleMap.get(pgId) ?? 0;
      const material = materialMap.get(pgId) ?? 0;
      const trucking = truckingMap.get(pgId) ?? 0;
      const expenseInv = expenseMap.get(pgId) ?? 0;
      const directCost = employee + vehicle + material + trucking + expenseInv;
      const netIncome = revenue - directCost;
      const margin = revenue > 0 ? (netIncome / revenue) * 100 : undefined;
      const tonnes = tonnesMap.get(pgId) ?? 0;
      const crewHrs = crewHoursMap.get(pgId) ?? 0;

      totalRevenue += revenue;
      totalDirectCost += directCost;
      totalNetIncome += netIncome;
      if (margin != null) margins.push(margin);

      items.push({
        jobsiteId: j.mongo_id,
        jobsiteName: j.name,
        jobcode: j.jobcode ?? undefined,
        totalRevenue: revenue,
        employeeCost: employee,
        vehicleCost: vehicle,
        materialCost: material,
        truckingCost: trucking,
        expenseInvoiceCost: expenseInv,
        totalDirectCost: directCost,
        netIncome,
        netMarginPercent: margin,
        totalTonnes: tonnes,
        tonnesPerHour: crewHrs > 0 ? tonnes / crewHrs : undefined,
      });
    }

    return {
      totalRevenue,
      totalDirectCost,
      totalNetIncome,
      avgNetMarginPercent: margins.length > 0
        ? margins.reduce((s, m) => s + m, 0) / margins.length
        : undefined,
      jobsites: items,
    };
  }

  // ─── Productivity ─────────────────────────────────────────────────────────

  @Query(() => DashboardProductivityReport)
  async dashboardProductivity(
    @Arg("input") input: DashboardProductivityInput
  ): Promise<DashboardProductivityReport> {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    endDate.setHours(23, 59, 59, 999);

    const [
      jobsiteRows, crewRows,
      tonnesPerJobsiteRows, crewHoursPerJobsiteRows,
      tonnesPerCrewRows, crewHoursPerCrewRows,
      materialRows,
    ] = await Promise.all([
      this.getJobsites(),
      this.getCrews(),
      this.getTonnesPerJobsite(startDate, endDate, input.selectedMaterials),
      this.getCrewHoursPerJobsite(startDate, endDate),
      this.getTonnesPerCrew(startDate, endDate, input.selectedMaterials),
      this.getCrewHoursPerCrew(startDate, endDate),
      this.getAvailableMaterials(startDate, endDate),
    ]);

    const jobsiteMongoMap = new Map(jobsiteRows.map(j => [j.id, j]));
    const crewMap = new Map(crewRows.map(c => [c.id, c]));
    const crewHoursJobsiteMap = new Map(crewHoursPerJobsiteRows.map(r => [r.jobsite_id, Number(r.total_hours)]));
    const crewHoursCrewMap = new Map(crewHoursPerCrewRows.map(r => [r.crew_id, Number(r.total_hours)]));

    // Jobsite items
    let totalTonnes = 0, totalCrewHours = 0;
    const jobsiteItems: DashboardProductivityJobsiteItem[] = [];
    for (const row of tonnesPerJobsiteRows) {
      const j = jobsiteMongoMap.get(row.jobsite_id);
      if (!j) continue;
      const tonnes = Number(row.total_tonnes ?? 0);
      const crewHrs = crewHoursJobsiteMap.get(row.jobsite_id) ?? 0;
      totalTonnes += tonnes;
      totalCrewHours += crewHrs;
      jobsiteItems.push({
        jobsiteId: j.mongo_id,
        jobsiteName: j.name,
        jobcode: j.jobcode ?? undefined,
        totalTonnes: tonnes,
        totalCrewHours: crewHrs,
        tonnesPerHour: crewHrs > 0 ? tonnes / crewHrs : undefined,
        percentFromAverage: undefined,
      });
    }

    const validJobsites = jobsiteItems.filter(j => j.tonnesPerHour != null);
    const avgJobsiteTH = validJobsites.length > 0
      ? validJobsites.reduce((s, j) => s + (j.tonnesPerHour ?? 0), 0) / validJobsites.length
      : undefined;
    if (avgJobsiteTH) {
      for (const item of jobsiteItems) {
        if (item.tonnesPerHour != null)
          item.percentFromAverage = ((item.tonnesPerHour - avgJobsiteTH) / avgJobsiteTH) * 100;
      }
    }

    // Crew items
    const crewItems: DashboardProductivityCrewItem[] = [];
    for (const row of tonnesPerCrewRows) {
      const c = crewMap.get(row.crew_id);
      if (!c) continue;
      const tonnes = Number(row.total_tonnes ?? 0);
      const crewHrs = crewHoursCrewMap.get(row.crew_id) ?? 0;
      crewItems.push({
        crewId: row.crew_id,
        crewName: c.name,
        crewType: c.type,
        totalTonnes: tonnes,
        totalCrewHours: crewHrs,
        tonnesPerHour: crewHrs > 0 ? tonnes / crewHrs : undefined,
        dayCount: Number(row.day_count),
        jobsiteCount: Number(row.jobsite_count),
        percentFromAverage: undefined,
      });
    }

    const validCrews = crewItems.filter(c => c.tonnesPerHour != null);
    const avgCrewTH = validCrews.length > 0
      ? validCrews.reduce((s, c) => s + (c.tonnesPerHour ?? 0), 0) / validCrews.length
      : undefined;
    if (avgCrewTH) {
      for (const item of crewItems) {
        if (item.tonnesPerHour != null)
          item.percentFromAverage = ((item.tonnesPerHour - avgCrewTH) / avgCrewTH) * 100;
      }
    }

    return {
      avgTonnesPerHour: avgJobsiteTH,
      totalTonnes,
      totalCrewHours,
      jobsiteCount: jobsiteItems.length,
      availableMaterials: materialRows.map(r => ({ materialName: r.material_name, key: r.material_name })),
      jobsites: jobsiteItems,
      crews: crewItems,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async getJobsites() {
    return db
      .selectFrom("dim_jobsite as j")
      .select(["j.id", "j.mongo_id", "j.name", "j.jobcode"])
      .where("j.archived_at", "is", null)
      .execute();
  }

  private async getCrews() {
    return db
      .selectFrom("dim_crew as c")
      .select(["c.id", "c.name", "c.type"])
      .execute();
  }

  private async getRevenue(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_invoice as i")
      .select(["i.jobsite_id", sql<number>`SUM(i.amount)`.as("total_revenue")])
      .where("i.invoice_date", ">=", startDate)
      .where("i.invoice_date", "<=", endDate)
      .where("i.direction", "=", "revenue")
      .groupBy("i.jobsite_id")
      .execute();
  }

  private async getExpenseInvoiceCosts(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_invoice as i")
      .select(["i.jobsite_id", sql<number>`SUM(i.amount)`.as("total_cost")])
      .where("i.invoice_date", ">=", startDate)
      .where("i.invoice_date", "<=", endDate)
      .where("i.direction", "=", "expense")
      .groupBy("i.jobsite_id")
      .execute();
  }

  private async getEmployeeCosts(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select(["ew.jobsite_id", sql<number>`SUM(ew.total_cost)`.as("total_cost")])
      .where("ew.work_date", ">=", startDate)
      .where("ew.work_date", "<=", endDate)
      .where("ew.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy("ew.jobsite_id")
      .execute();
  }

  private async getVehicleCosts(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_vehicle_work as vw")
      .innerJoin("dim_daily_report as dr", "dr.id", "vw.daily_report_id")
      .select(["vw.jobsite_id", sql<number>`SUM(vw.total_cost)`.as("total_cost")])
      .where("vw.work_date", ">=", startDate)
      .where("vw.work_date", "<=", endDate)
      .where("vw.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy("vw.jobsite_id")
      .execute();
  }

  private async getMaterialCosts(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .select(["ms.jobsite_id", sql<number>`SUM(ms.total_cost)`.as("total_cost")])
      .where("ms.work_date", ">=", startDate)
      .where("ms.work_date", "<=", endDate)
      .where("ms.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy("ms.jobsite_id")
      .execute();
  }

  private async getTruckingCosts(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_trucking as t")
      .innerJoin("dim_daily_report as dr", "dr.id", "t.daily_report_id")
      .select(["t.jobsite_id", sql<number>`SUM(t.total_cost)`.as("total_cost")])
      .where("t.work_date", ">=", startDate)
      .where("t.work_date", "<=", endDate)
      .where("t.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy("t.jobsite_id")
      .execute();
  }

  // Crew hours: MAX hours per (daily_report, crew) to count crew-hours not employee-hours
  private async getCrewHoursPerJobsite(startDate: Date, endDate: Date) {
    const sub = db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select([
        "ew.jobsite_id",
        "ew.daily_report_id",
        "ew.crew_id",
        sql<number>`MAX(ew.hours)`.as("crew_day_hours"),
      ])
      .where("ew.work_date", ">=", startDate)
      .where("ew.work_date", "<=", endDate)
      .where("ew.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy(["ew.jobsite_id", "ew.daily_report_id", "ew.crew_id"]);

    return db
      .selectFrom(sub.as("crew_daily"))
      .select(["crew_daily.jobsite_id", sql<number>`SUM(crew_daily.crew_day_hours)`.as("total_hours")])
      .groupBy("crew_daily.jobsite_id")
      .execute();
  }

  private async getCrewHoursPerCrew(startDate: Date, endDate: Date) {
    const sub = db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select([
        "ew.crew_id",
        "ew.daily_report_id",
        sql<number>`MAX(ew.hours)`.as("crew_day_hours"),
      ])
      .where("ew.work_date", ">=", startDate)
      .where("ew.work_date", "<=", endDate)
      .where("ew.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy(["ew.crew_id", "ew.daily_report_id"]);

    return db
      .selectFrom(sub.as("crew_daily"))
      .select(["crew_daily.crew_id", sql<number>`SUM(crew_daily.crew_day_hours)`.as("total_hours")])
      .groupBy("crew_daily.crew_id")
      .execute();
  }

  private async getTonnesPerJobsite(startDate: Date, endDate: Date, selectedMaterials?: string[]) {
    let q = db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id")
      .innerJoin("dim_material as m", "m.id", "jm.material_id")
      .select(["ms.jobsite_id", sql<number>`SUM(${getTonnesConversion()})`.as("total_tonnes")])
      .where("ms.work_date", ">=", startDate)
      .where("ms.work_date", "<=", endDate)
      .where("ms.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false);

    if (selectedMaterials && selectedMaterials.length > 0)
      q = q.where("m.name", "in", selectedMaterials);

    return q.groupBy("ms.jobsite_id").execute();
  }

  private async getTonnesPerCrew(startDate: Date, endDate: Date, selectedMaterials?: string[]) {
    let q = db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id")
      .innerJoin("dim_material as m", "m.id", "jm.material_id")
      .select([
        "ms.crew_id",
        sql<number>`SUM(${getTonnesConversion()})`.as("total_tonnes"),
        sql<number>`COUNT(DISTINCT ms.work_date)`.as("day_count"),
        sql<number>`COUNT(DISTINCT ms.jobsite_id)`.as("jobsite_count"),
      ])
      .where("ms.work_date", ">=", startDate)
      .where("ms.work_date", "<=", endDate)
      .where("ms.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false);

    if (selectedMaterials && selectedMaterials.length > 0)
      q = q.where("m.name", "in", selectedMaterials);

    return q.groupBy("ms.crew_id").execute();
  }

  private async getAvailableMaterials(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id")
      .innerJoin("dim_material as m", "m.id", "jm.material_id")
      .select(["m.name as material_name"])
      .where("ms.work_date", ">=", startDate)
      .where("ms.work_date", "<=", endDate)
      .where("ms.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy("m.name")
      .orderBy("m.name")
      .execute();
  }
}
```

**Step 2: Fix import path for `db`**

Check how `db` is imported in `server/src/graphql/resolvers/financialPerformance/index.ts` and use the exact same import in the new file.

**Step 3: Verify it compiles**

Run: `cd /home/dev/work/bow-mark/server && npm run build`
Expected: exits 0

**Step 4: Commit**

```bash
git add server/src/graphql/resolvers/businessDashboard/index.ts
git commit -m "feat: add BusinessDashboard resolver (overview, financial, productivity)"
```

---

### Task 3: Server — Register Resolver

**Files:**
- Modify: `server/src/app.ts`

**Step 1: Add import**

Find the block of resolver imports in `server/src/app.ts` (look for `FinancialPerformanceResolver` or similar). Add:

```typescript
import BusinessDashboardResolver from "./graphql/resolvers/businessDashboard";
```

**Step 2: Add to resolvers array**

Find the array passed to `buildTypeDefsAndResolvers` (or `buildSchema`) and add `BusinessDashboardResolver`:

```typescript
resolvers: [
  // ... existing resolvers ...
  BusinessDashboardResolver,
],
```

**Step 3: Verify build**

Run: `cd /home/dev/work/bow-mark/server && npm run build`
Expected: exits 0

**Step 4: Commit**

```bash
git add server/src/app.ts
git commit -m "feat: register BusinessDashboardResolver"
```

---

### Task 4: Client — GraphQL Queries + Codegen

**Files:**
- Create: `client/src/graphql/queries/Dashboard.graphql`

**Step 1: Create query file**

```graphql
query DashboardOverview($input: DashboardInput!) {
  dashboardOverview(input: $input) {
    totalRevenue
    totalNetIncome
    avgNetMarginPercent
    totalTonnes
    avgTonnesPerHour
    revenueChangePercent
    netIncomeChangePercent
    tonnesChangePercent
    thChangePercent
    jobsites {
      jobsiteId
      jobsiteName
      jobcode
      totalRevenue
      totalDirectCost
      netIncome
      netMarginPercent
      totalTonnes
      tonnesPerHour
    }
  }
}

query DashboardFinancial($input: DashboardInput!) {
  dashboardFinancial(input: $input) {
    totalRevenue
    totalDirectCost
    totalNetIncome
    avgNetMarginPercent
    jobsites {
      jobsiteId
      jobsiteName
      jobcode
      totalRevenue
      employeeCost
      vehicleCost
      materialCost
      truckingCost
      expenseInvoiceCost
      totalDirectCost
      netIncome
      netMarginPercent
      totalTonnes
      tonnesPerHour
    }
  }
}

query DashboardProductivity($input: DashboardProductivityInput!) {
  dashboardProductivity(input: $input) {
    avgTonnesPerHour
    totalTonnes
    totalCrewHours
    jobsiteCount
    availableMaterials {
      materialName
      key
    }
    jobsites {
      jobsiteId
      jobsiteName
      jobcode
      totalTonnes
      totalCrewHours
      tonnesPerHour
      percentFromAverage
    }
    crews {
      crewId
      crewName
      crewType
      totalTonnes
      totalCrewHours
      tonnesPerHour
      dayCount
      jobsiteCount
      percentFromAverage
    }
  }
}
```

**Step 2: Run codegen**

The server must be running (tilt up). Then:

Run: `cd /home/dev/work/bow-mark/client && npm run codegen`
Expected: `src/generated/graphql.tsx` updated, containing `useDashboardOverviewQuery`, `useDashboardFinancialQuery`, `useDashboardProductivityQuery`

**Step 3: Commit**

```bash
git add client/src/graphql/queries/Dashboard.graphql client/src/generated/
git commit -m "feat: add Dashboard GraphQL queries and regenerate types"
```

---

### Task 5: Client — Dashboard Page

**Files:**
- Create: `client/src/pages/dashboard.tsx`

**Context:** Look at `client/src/pages/jobsite-year-master-report/[id].tsx` for the tab pattern. Look at how Chakra's `Tabs`, `TabList`, `Tab`, `TabPanel`, `TabPanels` are used there.

**Step 1: Create the page**

```typescript
import React from "react";
import {
  Box, Button, ButtonGroup, Flex, Heading,
  HStack, Input, Tab, TabList, TabPanel,
  TabPanels, Tabs, Text,
} from "@chakra-ui/react";
import { NextPage } from "next";

const Overview = React.lazy(() => import("../components/pages/dashboard/Overview"));
const Financial = React.lazy(() => import("../components/pages/dashboard/Financial"));
const Productivity = React.lazy(() => import("../components/pages/dashboard/Productivity"));

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

const getDefaultRange = () => {
  const today = new Date();
  return {
    startDate: toDateInput(new Date(today.getFullYear(), 0, 1)),
    endDate: toDateInput(today),
  };
};

const DashboardPage: NextPage = () => {
  const defaults = getDefaultRange();
  const [startDate, setStartDate] = React.useState(defaults.startDate);
  const [endDate, setEndDate] = React.useState(defaults.endDate);
  const [tabIndex, setTabIndex] = React.useState(0);

  const setThisYear = () => {
    const today = new Date();
    setStartDate(toDateInput(new Date(today.getFullYear(), 0, 1)));
    setEndDate(toDateInput(today));
  };

  const setLastYear = () => {
    const y = new Date().getFullYear() - 1;
    setStartDate(toDateInput(new Date(y, 0, 1)));
    setEndDate(toDateInput(new Date(y, 11, 31)));
  };

  const setLast6Months = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    setStartDate(toDateInput(start));
    setEndDate(toDateInput(end));
  };

  return (
    <Box p={4} h="100vh" display="flex" flexDirection="column" overflow="hidden">
      <Flex align="center" justify="space-between" mb={4} wrap="wrap" gap={2} flexShrink={0}>
        <Heading size="lg">Business Dashboard</Heading>
        <HStack spacing={2} wrap="wrap">
          <ButtonGroup size="sm" variant="outline">
            <Button onClick={setThisYear}>This Year</Button>
            <Button onClick={setLastYear}>Last Year</Button>
            <Button onClick={setLast6Months}>Last 6 Months</Button>
          </ButtonGroup>
          <HStack spacing={1}>
            <Text fontSize="sm" color="gray.500">From</Text>
            <Input type="date" size="sm" w="150px" value={startDate}
              onChange={e => setStartDate(e.target.value)} />
            <Text fontSize="sm" color="gray.500">to</Text>
            <Input type="date" size="sm" w="150px" value={endDate}
              onChange={e => setEndDate(e.target.value)} />
          </HStack>
        </HStack>
      </Flex>

      <Tabs variant="enclosed" index={tabIndex} onChange={setTabIndex}
        display="flex" flexDirection="column" flex={1} minH={0}>
        <TabList flexShrink={0}>
          <Tab>Overview</Tab>
          <Tab>Financial</Tab>
          <Tab>Productivity</Tab>
        </TabList>
        <TabPanels flex={1} minH={0} overflow="hidden">
          <TabPanel h="100%" p={0} pt={4} overflow="hidden">
            <React.Suspense fallback={null}>
              <Overview startDate={startDate} endDate={endDate} />
            </React.Suspense>
          </TabPanel>
          <TabPanel h="100%" p={0} pt={4} overflow="hidden">
            <React.Suspense fallback={null}>
              <Financial startDate={startDate} endDate={endDate} />
            </React.Suspense>
          </TabPanel>
          <TabPanel h="100%" p={0} pt={4} overflow="hidden">
            <React.Suspense fallback={null}>
              <Productivity startDate={startDate} endDate={endDate} />
            </React.Suspense>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default DashboardPage;
```

**Step 2: Type-check**

Run: `cd /home/dev/work/bow-mark/client && npm run type-check`
Expected: no errors in dashboard.tsx (ignore errors in tab components that don't exist yet)

**Step 3: Commit**

```bash
git add client/src/pages/dashboard.tsx
git commit -m "feat: add /dashboard page with date range picker and tab structure"
```

---

### Task 6: Client — Overview Component

**Files:**
- Create: `client/src/components/pages/dashboard/Overview.tsx`

**Context:** Look at `client/src/components/pages/jobsite-year-master-report/FinancialPerformance.tsx` for Card usage, Stat usage, table with sticky headers, and Badge color patterns. The `Card` component used there — use the same import pattern.

**Step 1: Create the component**

```typescript
import React from "react";
import {
  Alert, AlertIcon, Badge, Box, Card, CardBody, CardHeader,
  Flex, Grid, GridItem, Heading, HStack, SimpleGrid, Spinner,
  Stat, StatArrow, StatHelpText, StatLabel, StatNumber,
  Table, Tbody, Td, Text, Th, Thead, Tr, VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useDashboardOverviewQuery } from "../../../generated/graphql";

interface IOverview {
  startDate: string;
  endDate: string;
}

type SortKey = "jobsiteName" | "totalRevenue" | "netIncome" | "netMarginPercent" | "totalTonnes" | "tonnesPerHour";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const getMarginColorScheme = (pct?: number | null) => {
  if (pct == null) return "gray";
  if (pct >= 15) return "green";
  if (pct >= 0) return "yellow";
  return "red";
};

const getMarginBg = (pct?: number | null) => {
  if (pct == null) return undefined;
  if (pct >= 15) return "green.50";
  if (pct >= 0) return "yellow.50";
  return "red.50";
};

const Overview = ({ startDate, endDate }: IOverview) => {
  const [sortKey, setSortKey] = React.useState<SortKey>("netMarginPercent");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const { data, loading, error, previousData } = useDashboardOverviewQuery({
    variables: { input: { startDate, endDate } },
  });

  const report = (data ?? previousData)?.dashboardOverview;

  if (loading && !report) {
    return <Flex justify="center" align="center" h="100%"><Spinner size="xl" /></Flex>;
  }
  if (error) {
    return <Alert status="error"><AlertIcon />{error.message}</Alert>;
  }
  if (!report) return null;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };
  const si = (key: SortKey) => sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const sorted = React.useMemo(() => {
    return [...(report.jobsites ?? [])].sort((a, b) => {
      const av = (a[sortKey] as number | null | undefined) ?? -Infinity;
      const bv = (b[sortKey] as number | null | undefined) ?? -Infinity;
      if (typeof av === "string") return sortDir === "asc" ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [report.jobsites, sortKey, sortDir]);

  const top5 = [...(report.jobsites ?? [])]
    .filter(j => j.netMarginPercent != null)
    .sort((a, b) => (b.netMarginPercent ?? 0) - (a.netMarginPercent ?? 0))
    .slice(0, 5);

  const bottom5 = [...(report.jobsites ?? [])]
    .filter(j => j.netMarginPercent != null)
    .sort((a, b) => (a.netMarginPercent ?? 0) - (b.netMarginPercent ?? 0))
    .slice(0, 5);

  const kpis = [
    { label: "Total Revenue", value: formatCurrency(report.totalRevenue), change: report.revenueChangePercent },
    { label: "Net Income", value: formatCurrency(report.totalNetIncome), change: report.netIncomeChangePercent },
    { label: "Avg Net Margin", value: report.avgNetMarginPercent != null ? `${report.avgNetMarginPercent.toFixed(1)}%` : "—", change: null },
    { label: "Total Tonnes", value: `${report.totalTonnes.toFixed(0)} T`, change: report.tonnesChangePercent },
    { label: "Avg T/H", value: report.avgTonnesPerHour != null ? `${report.avgTonnesPerHour.toFixed(2)} T/H` : "—", change: report.thChangePercent },
  ];

  const CalloutRow = ({ j }: { j: typeof top5[0] }) => (
    <Flex justify="space-between" align="center" py={1}>
      <Text fontSize="sm" fontWeight="medium" noOfLines={1} flex={1} mr={2}>
        {j.jobsiteName}{j.jobcode && <Text as="span" color="gray.500" fontWeight="normal"> ({j.jobcode})</Text>}
      </Text>
      <HStack spacing={2} flexShrink={0}>
        <Badge colorScheme={getMarginColorScheme(j.netMarginPercent)}>
          {j.netMarginPercent?.toFixed(1)}%
        </Badge>
        {j.tonnesPerHour != null && (
          <Text fontSize="xs" color="gray.500">{j.tonnesPerHour.toFixed(1)} T/H</Text>
        )}
      </HStack>
    </Flex>
  );

  return (
    <Box display="flex" flexDirection="column" h="100%" gap={4} overflow="hidden">
      {/* KPI Cards */}
      <SimpleGrid columns={5} spacing={3} flexShrink={0}>
        {kpis.map(kpi => (
          <Card key={kpi.label} size="sm">
            <CardBody>
              <Stat>
                <StatLabel color="gray.500" fontSize="xs">{kpi.label}</StatLabel>
                <StatNumber fontSize="lg">{kpi.value}</StatNumber>
                {kpi.change != null && (
                  <StatHelpText mb={0}>
                    <StatArrow type={kpi.change >= 0 ? "increase" : "decrease"} />
                    {Math.abs(kpi.change).toFixed(1)}% vs last year
                  </StatHelpText>
                )}
              </Stat>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Callout Panels */}
      <Grid templateColumns="1fr 1fr" gap={4} flexShrink={0}>
        <Card size="sm">
          <CardHeader pb={0}><Heading size="xs" color="green.600">Top Performers</Heading></CardHeader>
          <CardBody pt={2}>
            <VStack align="stretch" spacing={0} divider={<Box borderTopWidth={1} borderColor="gray.100" />}>
              {top5.map(j => <CalloutRow key={j.jobsiteId} j={j} />)}
              {top5.length === 0 && <Text fontSize="sm" color="gray.400">No data</Text>}
            </VStack>
          </CardBody>
        </Card>
        <Card size="sm">
          <CardHeader pb={0}><Heading size="xs" color="red.600">Needs Attention</Heading></CardHeader>
          <CardBody pt={2}>
            <VStack align="stretch" spacing={0} divider={<Box borderTopWidth={1} borderColor="gray.100" />}>
              {bottom5.map(j => <CalloutRow key={j.jobsiteId} j={j} />)}
              {bottom5.length === 0 && <Text fontSize="sm" color="gray.400">No data</Text>}
            </VStack>
          </CardBody>
        </Card>
      </Grid>

      {/* All Jobs Table */}
      <Box flex={1} minH={0} borderWidth={1} borderRadius="md" overflow="hidden">
        <Box overflowY="auto" h="100%">
          <Table size="sm" variant="simple">
            <Thead position="sticky" top={0} bg="white" zIndex={1}>
              <Tr>
                <Th cursor="pointer" onClick={() => handleSort("jobsiteName")}>Jobsite{si("jobsiteName")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("totalRevenue")}>Revenue{si("totalRevenue")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("netIncome")}>Net Income{si("netIncome")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("netMarginPercent")}>Margin %{si("netMarginPercent")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("totalTonnes")}>Tonnes{si("totalTonnes")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("tonnesPerHour")}>T/H{si("tonnesPerHour")}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sorted.map(j => (
                <Tr key={j.jobsiteId} bg={getMarginBg(j.netMarginPercent)} _hover={{ opacity: 0.85 }}>
                  <Td>
                    <NextLink href={`/jobsite-year-report/${j.jobsiteId}`} passHref>
                      <Text as="a" color="blue.600" _hover={{ textDecoration: "underline" }} fontSize="sm">
                        {j.jobsiteName}{j.jobcode && <Text as="span" color="gray.500"> ({j.jobcode})</Text>}
                      </Text>
                    </NextLink>
                  </Td>
                  <Td isNumeric fontSize="sm">{formatCurrency(j.totalRevenue)}</Td>
                  <Td isNumeric fontSize="sm">{formatCurrency(j.netIncome)}</Td>
                  <Td isNumeric>
                    {j.netMarginPercent != null
                      ? <Badge colorScheme={getMarginColorScheme(j.netMarginPercent)}>{j.netMarginPercent.toFixed(1)}%</Badge>
                      : "—"}
                  </Td>
                  <Td isNumeric fontSize="sm">{j.totalTonnes.toFixed(0)} T</Td>
                  <Td isNumeric fontSize="sm">{j.tonnesPerHour != null ? `${j.tonnesPerHour.toFixed(2)} T/H` : "—"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
};

export default Overview;
```

**Note:** If `Card`, `CardHeader`, `CardBody` don't exist in the Chakra version used (check `client/package.json` for `@chakra-ui/react` version), look at how existing components like `FinancialPerformance.tsx` wrap content and use the same pattern.

**Step 2: Type-check**

Run: `cd /home/dev/work/bow-mark/client && npm run type-check`
Expected: no errors in Overview.tsx

**Step 3: Commit**

```bash
git add client/src/components/pages/dashboard/Overview.tsx
git commit -m "feat: add Overview tab for business dashboard"
```

---

### Task 7: Client — Financial Component

**Files:**
- Create: `client/src/components/pages/dashboard/Financial.tsx`

**Step 1: Create the component**

```typescript
import React from "react";
import {
  Alert, AlertIcon, Badge, Box, Card, CardBody,
  Flex, Grid, GridItem, Spinner, Stat, StatLabel, StatNumber,
  Table, Tbody, Td, Text, Th, Thead, Tr,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useDashboardFinancialQuery } from "../../../generated/graphql";

interface IFinancial { startDate: string; endDate: string; }

type SortKey = "jobsiteName" | "totalRevenue" | "employeeCost" | "vehicleCost" | "materialCost"
  | "truckingCost" | "expenseInvoiceCost" | "totalDirectCost" | "netIncome" | "netMarginPercent"
  | "totalTonnes" | "tonnesPerHour";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const getMarginColorScheme = (pct?: number | null) => {
  if (pct == null) return "gray";
  if (pct >= 15) return "green";
  if (pct >= 0) return "yellow";
  return "red";
};

const getMarginBg = (pct?: number | null) => {
  if (pct == null) return undefined;
  if (pct >= 15) return "green.50";
  if (pct >= 0) return "yellow.50";
  return "red.50";
};

const Financial = ({ startDate, endDate }: IFinancial) => {
  const [sortKey, setSortKey] = React.useState<SortKey>("netMarginPercent");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const { data, loading, error, previousData } = useDashboardFinancialQuery({
    variables: { input: { startDate, endDate } },
  });

  const report = (data ?? previousData)?.dashboardFinancial;

  if (loading && !report) return <Flex justify="center" align="center" h="100%"><Spinner size="xl" /></Flex>;
  if (error) return <Alert status="error"><AlertIcon />{error.message}</Alert>;
  if (!report) return null;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };
  const si = (key: SortKey) => sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const sorted = React.useMemo(() => {
    return [...(report.jobsites ?? [])].sort((a, b) => {
      const av = (a[sortKey] as number | null | undefined) ?? -Infinity;
      const bv = (b[sortKey] as number | null | undefined) ?? -Infinity;
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [report.jobsites, sortKey, sortDir]);

  const summaryCards = [
    { label: "Total Revenue", value: fmt(report.totalRevenue) },
    { label: "Total Direct Cost", value: fmt(report.totalDirectCost) },
    { label: "Net Income", value: fmt(report.totalNetIncome) },
    { label: "Avg Net Margin", value: report.avgNetMarginPercent != null ? `${report.avgNetMarginPercent.toFixed(1)}%` : "—" },
  ];

  return (
    <Box display="flex" flexDirection="column" h="100%" gap={4} overflow="hidden">
      <Grid templateColumns="repeat(4, 1fr)" gap={3} flexShrink={0}>
        {summaryCards.map(s => (
          <Card key={s.label} size="sm">
            <CardBody>
              <Stat>
                <StatLabel color="gray.500" fontSize="xs">{s.label}</StatLabel>
                <StatNumber fontSize="lg">{s.value}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        ))}
      </Grid>

      <Box flex={1} minH={0} borderWidth={1} borderRadius="md" overflow="hidden">
        <Box overflowX="auto" overflowY="auto" h="100%">
          <Table size="sm" variant="simple">
            <Thead position="sticky" top={0} bg="white" zIndex={1}>
              <Tr>
                <Th cursor="pointer" onClick={() => handleSort("jobsiteName")}>Jobsite{si("jobsiteName")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("totalRevenue")}>Revenue{si("totalRevenue")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("employeeCost")}>Labour{si("employeeCost")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("vehicleCost")}>Equipment{si("vehicleCost")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("materialCost")}>Material{si("materialCost")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("truckingCost")}>Trucking{si("truckingCost")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("expenseInvoiceCost")}>Exp. Inv{si("expenseInvoiceCost")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("totalDirectCost")}>Total Cost{si("totalDirectCost")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("netIncome")}>Net Income{si("netIncome")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("netMarginPercent")}>Margin %{si("netMarginPercent")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("totalTonnes")}>Tonnes{si("totalTonnes")}</Th>
                <Th cursor="pointer" isNumeric onClick={() => handleSort("tonnesPerHour")}>T/H{si("tonnesPerHour")}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sorted.map(j => (
                <Tr key={j.jobsiteId} bg={getMarginBg(j.netMarginPercent)} _hover={{ opacity: 0.85 }}>
                  <Td>
                    <NextLink href={`/jobsite-year-report/${j.jobsiteId}`} passHref>
                      <Text as="a" color="blue.600" _hover={{ textDecoration: "underline" }} fontSize="sm">
                        {j.jobsiteName}{j.jobcode && <Text as="span" color="gray.500"> ({j.jobcode})</Text>}
                      </Text>
                    </NextLink>
                  </Td>
                  <Td isNumeric fontSize="sm">{fmt(j.totalRevenue)}</Td>
                  <Td isNumeric fontSize="sm">{fmt(j.employeeCost)}</Td>
                  <Td isNumeric fontSize="sm">{fmt(j.vehicleCost)}</Td>
                  <Td isNumeric fontSize="sm">{fmt(j.materialCost)}</Td>
                  <Td isNumeric fontSize="sm">{fmt(j.truckingCost)}</Td>
                  <Td isNumeric fontSize="sm">{fmt(j.expenseInvoiceCost)}</Td>
                  <Td isNumeric fontSize="sm">{fmt(j.totalDirectCost)}</Td>
                  <Td isNumeric fontSize="sm">{fmt(j.netIncome)}</Td>
                  <Td isNumeric>
                    {j.netMarginPercent != null
                      ? <Badge colorScheme={getMarginColorScheme(j.netMarginPercent)}>{j.netMarginPercent.toFixed(1)}%</Badge>
                      : "—"}
                  </Td>
                  <Td isNumeric fontSize="sm">{j.totalTonnes.toFixed(0)} T</Td>
                  <Td isNumeric fontSize="sm">{j.tonnesPerHour != null ? `${j.tonnesPerHour.toFixed(2)} T/H` : "—"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
};

export default Financial;
```

**Step 2: Type-check**

Run: `cd /home/dev/work/bow-mark/client && npm run type-check`
Expected: no errors

**Step 3: Commit**

```bash
git add client/src/components/pages/dashboard/Financial.tsx
git commit -m "feat: add Financial tab for business dashboard"
```

---

### Task 8: Client — Productivity Component

**Files:**
- Create: `client/src/components/pages/dashboard/Productivity.tsx`

**Step 1: Create the component**

```typescript
import React from "react";
import {
  Alert, AlertIcon, Badge, Box, Button, ButtonGroup,
  Card, CardBody, Flex, Grid, GridItem, Spinner,
  Stat, StatLabel, StatNumber, Table, Tbody, Td, Text,
  Th, Thead, Tr, Wrap, WrapItem,
} from "@chakra-ui/react";
import { useDashboardProductivityQuery } from "../../../generated/graphql";

interface IProductivity { startDate: string; endDate: string; }
type JobsiteSortKey = "jobsiteName" | "totalTonnes" | "totalCrewHours" | "tonnesPerHour" | "percentFromAverage";
type CrewSortKey = "crewName" | "crewType" | "totalTonnes" | "totalCrewHours" | "tonnesPerHour" | "dayCount" | "jobsiteCount" | "percentFromAverage";

const getDeviationColorScheme = (pct?: number | null) => {
  if (pct == null) return "gray";
  if (pct >= 10) return "green";
  if (pct >= -10) return "gray";
  return "red";
};

const Productivity = ({ startDate, endDate }: IProductivity) => {
  const [viewMode, setViewMode] = React.useState<"jobsite" | "crew">("jobsite");
  const [selectedMaterials, setSelectedMaterials] = React.useState<string[]>([]);
  const [jSortKey, setJSortKey] = React.useState<JobsiteSortKey>("tonnesPerHour");
  const [jSortDir, setJSortDir] = React.useState<"asc" | "desc">("desc");
  const [cSortKey, setCSortKey] = React.useState<CrewSortKey>("tonnesPerHour");
  const [cSortDir, setCSortDir] = React.useState<"asc" | "desc">("desc");

  const { data, loading, error, previousData } = useDashboardProductivityQuery({
    variables: { input: { startDate, endDate, selectedMaterials: selectedMaterials.length > 0 ? selectedMaterials : undefined } },
  });

  const report = (data ?? previousData)?.dashboardProductivity;

  if (loading && !report) return <Flex justify="center" align="center" h="100%"><Spinner size="xl" /></Flex>;
  if (error) return <Alert status="error"><AlertIcon />{error.message}</Alert>;
  if (!report) return null;

  const toggleMaterial = (key: string) =>
    setSelectedMaterials(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const handleJSort = (key: JobsiteSortKey) => {
    if (jSortKey === key) setJSortDir(d => d === "asc" ? "desc" : "asc");
    else { setJSortKey(key); setJSortDir("desc"); }
  };
  const handleCSort = (key: CrewSortKey) => {
    if (cSortKey === key) setCSortDir(d => d === "asc" ? "desc" : "asc");
    else { setCSortKey(key); setCSortDir("desc"); }
  };

  const sortedJobsites = React.useMemo(() => {
    return [...(report.jobsites ?? [])].sort((a, b) => {
      const av = (a[jSortKey] as number | string | null | undefined) ?? -Infinity;
      const bv = (b[jSortKey] as number | string | null | undefined) ?? -Infinity;
      if (typeof av === "string") return jSortDir === "asc" ? (av).localeCompare(bv as string) : (bv as string).localeCompare(av);
      return jSortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [report.jobsites, jSortKey, jSortDir]);

  const sortedCrews = React.useMemo(() => {
    return [...(report.crews ?? [])].sort((a, b) => {
      const av = (a[cSortKey] as number | string | null | undefined) ?? -Infinity;
      const bv = (b[cSortKey] as number | string | null | undefined) ?? -Infinity;
      if (typeof av === "string") return cSortDir === "asc" ? (av).localeCompare(bv as string) : (bv as string).localeCompare(av);
      return cSortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [report.crews, cSortKey, cSortDir]);

  const jsi = (key: JobsiteSortKey) => jSortKey === key ? (jSortDir === "asc" ? " ↑" : " ↓") : "";
  const csi = (key: CrewSortKey) => cSortKey === key ? (cSortDir === "asc" ? " ↑" : " ↓") : "";

  const PctBadge = ({ pct }: { pct?: number | null }) =>
    pct != null
      ? <Badge colorScheme={getDeviationColorScheme(pct)}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</Badge>
      : <>—</>;

  return (
    <Box display="flex" flexDirection="column" h="100%" gap={4} overflow="hidden">
      <Grid templateColumns="repeat(4, 1fr)" gap={3} flexShrink={0}>
        {[
          { label: "Avg T/H", value: report.avgTonnesPerHour != null ? `${report.avgTonnesPerHour.toFixed(2)} T/H` : "—" },
          { label: "Total Tonnes", value: `${report.totalTonnes.toFixed(0)} T` },
          { label: "Total Crew Hours", value: `${report.totalCrewHours.toFixed(0)} hrs` },
          { label: "Jobsites", value: String(report.jobsiteCount) },
        ].map(s => (
          <Card key={s.label} size="sm"><CardBody>
            <Stat>
              <StatLabel color="gray.500" fontSize="xs">{s.label}</StatLabel>
              <StatNumber fontSize="lg">{s.value}</StatNumber>
            </Stat>
          </CardBody></Card>
        ))}
      </Grid>

      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={2} flexShrink={0}>
        <ButtonGroup size="sm" isAttached variant="outline">
          <Button onClick={() => setViewMode("jobsite")}
            colorScheme={viewMode === "jobsite" ? "blue" : undefined}
            variant={viewMode === "jobsite" ? "solid" : "outline"}>
            By Jobsite
          </Button>
          <Button onClick={() => setViewMode("crew")}
            colorScheme={viewMode === "crew" ? "blue" : undefined}
            variant={viewMode === "crew" ? "solid" : "outline"}>
            By Crew
          </Button>
        </ButtonGroup>
        <Wrap spacing={1}>
          {report.availableMaterials.map(m => (
            <WrapItem key={m.key}>
              <Badge cursor="pointer" px={2} py={1} borderRadius="full"
                colorScheme={selectedMaterials.includes(m.key) ? "blue" : "gray"}
                onClick={() => toggleMaterial(m.key)}>
                {m.materialName}
              </Badge>
            </WrapItem>
          ))}
        </Wrap>
      </Flex>

      <Box flex={1} minH={0} borderWidth={1} borderRadius="md" overflow="hidden">
        <Box overflowY="auto" h="100%">
          {viewMode === "jobsite" ? (
            <Table size="sm" variant="simple">
              <Thead position="sticky" top={0} bg="white" zIndex={1}>
                <Tr>
                  <Th w="8">#</Th>
                  <Th cursor="pointer" onClick={() => handleJSort("jobsiteName")}>Jobsite{jsi("jobsiteName")}</Th>
                  <Th cursor="pointer" isNumeric onClick={() => handleJSort("totalTonnes")}>Tonnes{jsi("totalTonnes")}</Th>
                  <Th cursor="pointer" isNumeric onClick={() => handleJSort("totalCrewHours")}>Crew Hrs{jsi("totalCrewHours")}</Th>
                  <Th cursor="pointer" isNumeric onClick={() => handleJSort("tonnesPerHour")}>T/H{jsi("tonnesPerHour")}</Th>
                  <Th cursor="pointer" isNumeric onClick={() => handleJSort("percentFromAverage")}>vs Avg{jsi("percentFromAverage")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedJobsites.map((j, idx) => (
                  <Tr key={j.jobsiteId}>
                    <Td color="gray.400" fontSize="xs">{idx + 1}</Td>
                    <Td fontSize="sm">{j.jobsiteName}{j.jobcode && <Text as="span" color="gray.500"> ({j.jobcode})</Text>}</Td>
                    <Td isNumeric fontSize="sm">{j.totalTonnes.toFixed(0)}</Td>
                    <Td isNumeric fontSize="sm">{j.totalCrewHours.toFixed(0)}</Td>
                    <Td isNumeric fontSize="sm">{j.tonnesPerHour != null ? j.tonnesPerHour.toFixed(2) : "—"}</Td>
                    <Td isNumeric><PctBadge pct={j.percentFromAverage} /></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Table size="sm" variant="simple">
              <Thead position="sticky" top={0} bg="white" zIndex={1}>
                <Tr>
                  <Th w="8">#</Th>
                  <Th cursor="pointer" onClick={() => handleCSort("crewName")}>Crew{csi("crewName")}</Th>
                  <Th cursor="pointer" onClick={() => handleCSort("crewType")}>Type{csi("crewType")}</Th>
                  <Th cursor="pointer" isNumeric onClick={() => handleCSort("totalTonnes")}>Tonnes{csi("totalTonnes")}</Th>
                  <Th cursor="pointer" isNumeric onClick={() => handleCSort("totalCrewHours")}>Crew Hrs{csi("totalCrewHours")}</Th>
                  <Th cursor="pointer" isNumeric onClick={() => handleCSort("tonnesPerHour")}>T/H{csi("tonnesPerHour")}</Th>
                  <Th cursor="pointer" isNumeric onClick={() => handleCSort("dayCount")}>Days{csi("dayCount")}</Th>
                  <Th cursor="pointer" isNumeric onClick={() => handleCSort("jobsiteCount")}>Jobs{csi("jobsiteCount")}</Th>
                  <Th cursor="pointer" isNumeric onClick={() => handleCSort("percentFromAverage")}>vs Avg{csi("percentFromAverage")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedCrews.map((c, idx) => (
                  <Tr key={c.crewId}>
                    <Td color="gray.400" fontSize="xs">{idx + 1}</Td>
                    <Td fontSize="sm">{c.crewName}</Td>
                    <Td><Badge colorScheme="purple">{c.crewType}</Badge></Td>
                    <Td isNumeric fontSize="sm">{c.totalTonnes.toFixed(0)}</Td>
                    <Td isNumeric fontSize="sm">{c.totalCrewHours.toFixed(0)}</Td>
                    <Td isNumeric fontSize="sm">{c.tonnesPerHour != null ? c.tonnesPerHour.toFixed(2) : "—"}</Td>
                    <Td isNumeric fontSize="sm">{c.dayCount}</Td>
                    <Td isNumeric fontSize="sm">{c.jobsiteCount}</Td>
                    <Td isNumeric><PctBadge pct={c.percentFromAverage} /></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Productivity;
```

**Step 2: Type-check**

Run: `cd /home/dev/work/bow-mark/client && npm run type-check`
Expected: no errors

**Step 3: Commit**

```bash
git add client/src/components/pages/dashboard/Productivity.tsx
git commit -m "feat: add Productivity tab for business dashboard"
```

---

### Task 9: Navigation Link

**Files:**
- Modify: `client/src/components/Navbar/index.tsx` (find actual path with: `grep -rl "jobsite-reports\|Reports" client/src/components/ --include="*.tsx"`)

**Step 1: Find the nav file**

Run: `grep -rl "jobsite-reports\|master-report" client/src/components/ --include="*.tsx"`

Open the returned file(s) and find where report-related nav links are defined.

**Step 2: Add Dashboard link**

Match the existing link component pattern exactly. Add a link to `/dashboard` alongside the existing report links. Example (exact component name will differ):

```typescript
// If existing pattern uses NavItem or similar:
<NavItem href="/dashboard">Dashboard</NavItem>

// If using Next.js Link directly:
<NextLink href="/dashboard">Dashboard</NextLink>
```

**Step 3: Type-check and commit**

Run: `cd /home/dev/work/bow-mark/client && npm run type-check`
Expected: no errors

```bash
git add client/src/components/Navbar/  # or actual file path
git commit -m "feat: add Dashboard link to navigation"
```
