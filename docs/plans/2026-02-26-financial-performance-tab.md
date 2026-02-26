# Financial Performance Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Financial Performance" tab to the Jobsite Year Master Report that shows revenue, direct costs, net income, and the relationship between residual T/H (productivity vs size-adjusted expectation) and net margin — answering whether higher-productivity jobs are actually more profitable.

**Architecture:** New `financialPerformance` GraphQL query backed by a dedicated PostgreSQL resolver that joins `fact_invoice` (revenue), `fact_employee_work` + `fact_vehicle_work` + `fact_material_shipment` + `fact_trucking` (direct costs), and `fact_material_shipment` (tonnes) + `fact_employee_work` (crew hours) into a per-jobsite financial summary. The resolver reuses the same tonnes/hours aggregation pattern from `ProductivityBenchmarksResolver` and adds logarithmic regression to compute residual T/H % per jobsite. The client component is a new `FinancialPerformance.tsx` file wired into `ClientContent.tsx` as tab index 3.

**Tech Stack:** Type-GraphQL (server types + resolver), Kysely (PG queries), Recharts (scatter plot), Chakra UI (table + stats), GraphQL Code Generator (client types)

---

### Task 1: GraphQL Types

**Files:**
- Create: `server/src/graphql/types/financialPerformance.ts`

**Step 1: Create the types file**

```typescript
/**
 * GraphQL types for the Financial Performance tab on the
 * Jobsite Year Master Report.
 *
 * Per-jobsite: revenue invoices, direct operating costs (employee +
 * vehicle + material + trucking from fact tables), net income,
 * margin %, and T/H data for the residual T/H vs margin scatter.
 */

import { Field, Float, ID, InputType, Int, ObjectType } from "type-graphql";

@InputType()
export class FinancialPerformanceInput {
  @Field(() => Int)
  year!: number;
}

@ObjectType()
export class JobsiteFinancialItem {
  /** MongoDB ID — used for links */
  @Field(() => ID)
  jobsiteId!: string;

  @Field()
  jobsiteName!: string;

  @Field({ nullable: true })
  jobcode?: string;

  // --- Revenue ---
  @Field(() => Float)
  totalRevenue!: number;

  // --- Direct operating costs (from approved daily report fact tables) ---
  @Field(() => Float)
  employeeCost!: number;

  @Field(() => Float)
  vehicleCost!: number;

  @Field(() => Float)
  materialCost!: number;

  @Field(() => Float)
  truckingCost!: number;

  @Field(() => Float)
  totalDirectCost!: number; // sum of the four above

  // --- Net ---
  @Field(() => Float)
  netIncome!: number; // totalRevenue - totalDirectCost

  /** null when totalRevenue === 0 (avoid divide-by-zero) */
  @Field(() => Float, { nullable: true })
  netMarginPercent?: number;

  // --- Productivity (may be 0 if no tonnes data) ---
  @Field(() => Float)
  totalTonnes!: number;

  @Field(() => Float)
  totalCrewHours!: number;

  /** 0 when no tonnes or crew hours */
  @Field(() => Float)
  tonnesPerHour!: number;

  /** Expected T/H from log regression, 0 if insufficient data */
  @Field(() => Float)
  expectedTonnesPerHour!: number;

  /**
   * (actual T/H - expected T/H) / expected T/H * 100.
   * null when expectedTonnesPerHour === 0.
   */
  @Field(() => Float, { nullable: true })
  residualTonnesPerHourPercent?: number;
}

@ObjectType()
export class FinancialPerformanceReport {
  @Field(() => Int)
  year!: number;

  @Field(() => Float)
  totalRevenue!: number;

  @Field(() => Float)
  totalDirectCost!: number;

  @Field(() => Float)
  totalNetIncome!: number;

  /** Weighted average: totalNetIncome / totalRevenue * 100. null if no revenue. */
  @Field(() => Float, { nullable: true })
  averageNetMarginPercent?: number;

  /** Pearson r between residualTonnesPerHourPercent and netMarginPercent (jobsites with both). */
  @Field(() => Float, { nullable: true })
  correlationResidualThMargin?: number;

  @Field(() => [JobsiteFinancialItem])
  jobsites!: JobsiteFinancialItem[];
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd /home/dev/work/bow-mark/server && npm run build 2>&1 | head -30
```

Expected: no errors related to `financialPerformance.ts` (the new file has no imports from app yet, so it compiles in isolation — you may see unrelated errors which is fine).

**Step 3: Commit**

```bash
cd /home/dev/work/bow-mark
git add server/src/graphql/types/financialPerformance.ts
git commit -m "feat: add GraphQL types for financial performance report"
```

---

### Task 2: Resolver

**Files:**
- Create: `server/src/graphql/resolvers/financialPerformance/index.ts`
- Modify: `server/src/app.ts` (register resolver)

The resolver runs 5 parallel PG queries per call, merges them by PG jobsite ID, then computes log regression (same approach as `ProductivityBenchmarksResolver`) to get residual T/H per jobsite.

**Step 1: Create the resolver file**

```typescript
/**
 * Financial Performance Resolver
 *
 * Computes per-jobsite revenue, direct costs, net income, and T/H for
 * the Financial Performance tab on the Jobsite Year Master Report.
 *
 * Revenue = sum of revenue invoices for the year.
 * Direct cost = employee + vehicle + material + trucking costs from
 *   approved daily report fact tables.
 * Net income = revenue - direct cost.
 *
 * Note: expense invoices are NOT included in direct cost to avoid
 * double-counting materials with costType='invoice'.
 */

import { Arg, Query, Resolver } from "type-graphql";
import { db } from "../../../db";
import { sql } from "kysely";
import {
  FinancialPerformanceInput,
  FinancialPerformanceReport,
  JobsiteFinancialItem,
} from "../../types/financialPerformance";
import {
  CUBIC_METERS_TO_TONNES,
  TANDEM_TONNES_PER_LOAD,
} from "@constants/UnitConversions";

/** Converts material shipment units to tonnes (same logic as ProductivityBenchmarksResolver) */
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

@Resolver()
export default class FinancialPerformanceResolver {
  @Query(() => FinancialPerformanceReport)
  async financialPerformance(
    @Arg("input") input: FinancialPerformanceInput
  ): Promise<FinancialPerformanceReport> {
    const { year } = input;
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    // Run all 5 data fetches in parallel
    const [revenueRows, employeeRows, vehicleRows, materialRows, truckingRows, tonnesRows, crewHoursRows] =
      await Promise.all([
        this.getRevenue(startDate, endDate),
        this.getEmployeeCosts(startDate, endDate),
        this.getVehicleCosts(startDate, endDate),
        this.getMaterialCosts(startDate, endDate),
        this.getTruckingCosts(startDate, endDate),
        this.getTonnesPerDailyReport(startDate, endDate),
        this.getCrewHoursPerDailyReport(startDate, endDate),
      ]);

    // Build lookup maps keyed by PG jobsite UUID
    const revenueMap = new Map<string, number>();
    for (const r of revenueRows) {
      if (r.jobsite_id) revenueMap.set(r.jobsite_id, Number(r.total_revenue ?? 0));
    }

    const employeeMap = new Map<string, number>();
    for (const r of employeeRows) {
      if (r.jobsite_id) employeeMap.set(r.jobsite_id, Number(r.employee_cost ?? 0));
    }

    const vehicleMap = new Map<string, number>();
    for (const r of vehicleRows) {
      if (r.jobsite_id) vehicleMap.set(r.jobsite_id, Number(r.vehicle_cost ?? 0));
    }

    const materialMap = new Map<string, number>();
    for (const r of materialRows) {
      if (r.jobsite_id) materialMap.set(r.jobsite_id, Number(r.material_cost ?? 0));
    }

    const truckingMap = new Map<string, number>();
    for (const r of truckingRows) {
      if (r.jobsite_id) truckingMap.set(r.jobsite_id, Number(r.trucking_cost ?? 0));
    }

    // Aggregate tonnes per jobsite (sum over daily reports)
    // tonnesRows: { jobsite_id, jobsite_mongo_id, jobsite_name, jobcode, daily_report_id, tonnes }
    interface JobsiteMeta {
      pgId: string;
      mongoId: string;
      name: string;
      jobcode: string | null;
      totalTonnes: number;
      dailyReportIds: Set<string>;
    }
    const jobsiteMetaMap = new Map<string, JobsiteMeta>();
    for (const r of tonnesRows) {
      if (!r.jobsite_id) continue;
      const existing = jobsiteMetaMap.get(r.jobsite_id) ?? {
        pgId: r.jobsite_id,
        mongoId: r.jobsite_mongo_id,
        name: r.jobsite_name,
        jobcode: r.jobcode,
        totalTonnes: 0,
        dailyReportIds: new Set<string>(),
      };
      existing.totalTonnes += Number(r.tonnes ?? 0);
      if (r.daily_report_id) existing.dailyReportIds.add(r.daily_report_id);
      jobsiteMetaMap.set(r.jobsite_id, existing);
    }

    // Crew hours lookup: daily_report_id → avg hours (represents crew hours for that report)
    const crewHoursMap = new Map<string, number>();
    for (const r of crewHoursRows) {
      if (r.daily_report_id) crewHoursMap.set(r.daily_report_id, Number(r.crew_hours ?? 0));
    }

    // Collect all jobsite PG IDs that have ANY data (revenue, costs, or tonnes)
    const allJobsiteIds = new Set<string>([
      ...revenueMap.keys(),
      ...employeeMap.keys(),
      ...vehicleMap.keys(),
      ...materialMap.keys(),
      ...truckingMap.keys(),
      ...jobsiteMetaMap.keys(),
    ]);

    // We need mongo IDs and names for all jobsites — fetch any missing from dim_jobsite
    const missingIds = [...allJobsiteIds].filter((id) => !jobsiteMetaMap.has(id));
    if (missingIds.length > 0) {
      const extraJobsites = await db
        .selectFrom("dim_jobsite")
        .select(["id", "mongo_id", "name", "jobcode"])
        .where("id", "in", missingIds)
        .execute();
      for (const j of extraJobsites) {
        jobsiteMetaMap.set(j.id, {
          pgId: j.id,
          mongoId: j.mongo_id,
          name: j.name,
          jobcode: j.jobcode,
          totalTonnes: 0,
          dailyReportIds: new Set(),
        });
      }
    }

    // Build per-jobsite items
    const rawItems: Array<{
      pgId: string;
      mongoId: string;
      name: string;
      jobcode: string | null;
      totalRevenue: number;
      employeeCost: number;
      vehicleCost: number;
      materialCost: number;
      truckingCost: number;
      totalTonnes: number;
      totalCrewHours: number;
      tonnesPerHour: number;
    }> = [];

    for (const pgId of allJobsiteIds) {
      const meta = jobsiteMetaMap.get(pgId);
      if (!meta) continue;

      const totalRevenue = revenueMap.get(pgId) ?? 0;
      const employeeCost = employeeMap.get(pgId) ?? 0;
      const vehicleCost = vehicleMap.get(pgId) ?? 0;
      const materialCost = materialMap.get(pgId) ?? 0;
      const truckingCost = truckingMap.get(pgId) ?? 0;

      // Sum crew hours for this jobsite's daily reports
      let totalCrewHours = 0;
      for (const drId of meta.dailyReportIds) {
        totalCrewHours += crewHoursMap.get(drId) ?? 0;
      }

      const tonnesPerHour =
        meta.totalTonnes > 0 && totalCrewHours > 0
          ? meta.totalTonnes / totalCrewHours
          : 0;

      rawItems.push({
        pgId,
        mongoId: meta.mongoId,
        name: meta.name,
        jobcode: meta.jobcode,
        totalRevenue,
        employeeCost,
        vehicleCost,
        materialCost,
        truckingCost,
        totalTonnes: meta.totalTonnes,
        totalCrewHours,
        tonnesPerHour,
      });
    }

    // Calculate log regression on T/H vs ln(tonnes) (same as ProductivityBenchmarksResolver)
    const { intercept, slope } = this.calculateRegressionCoefficients(
      rawItems.filter((j) => j.totalTonnes > 0 && j.tonnesPerHour > 0)
    );

    // Build final items
    const jobsites: JobsiteFinancialItem[] = rawItems.map((item) => {
      const totalDirectCost =
        item.employeeCost + item.vehicleCost + item.materialCost + item.truckingCost;
      const netIncome = item.totalRevenue - totalDirectCost;
      const netMarginPercent =
        item.totalRevenue > 0 ? (netIncome / item.totalRevenue) * 100 : undefined;

      const expectedTonnesPerHour =
        item.totalTonnes > 0 && slope !== 0
          ? intercept + slope * Math.log(item.totalTonnes)
          : 0;

      const residualTonnesPerHourPercent =
        expectedTonnesPerHour > 0
          ? ((item.tonnesPerHour - expectedTonnesPerHour) / expectedTonnesPerHour) * 100
          : undefined;

      return {
        jobsiteId: item.mongoId,
        jobsiteName: item.name,
        jobcode: item.jobcode ?? undefined,
        totalRevenue: item.totalRevenue,
        employeeCost: item.employeeCost,
        vehicleCost: item.vehicleCost,
        materialCost: item.materialCost,
        truckingCost: item.truckingCost,
        totalDirectCost,
        netIncome,
        netMarginPercent,
        totalTonnes: item.totalTonnes,
        totalCrewHours: item.totalCrewHours,
        tonnesPerHour: item.tonnesPerHour,
        expectedTonnesPerHour,
        residualTonnesPerHourPercent,
      };
    });

    // Sort by net income descending
    jobsites.sort((a, b) => b.netIncome - a.netIncome);

    // Compute report-level totals
    const totalRevenue = jobsites.reduce((s, j) => s + j.totalRevenue, 0);
    const totalDirectCost = jobsites.reduce((s, j) => s + j.totalDirectCost, 0);
    const totalNetIncome = totalRevenue - totalDirectCost;
    const averageNetMarginPercent =
      totalRevenue > 0 ? (totalNetIncome / totalRevenue) * 100 : undefined;

    // Pearson correlation between residual T/H % and margin %
    const correlationResidualThMargin = this.pearsonCorrelation(
      jobsites
        .filter(
          (j) =>
            j.residualTonnesPerHourPercent != null && j.netMarginPercent != null
        )
        .map((j) => ({
          x: j.residualTonnesPerHourPercent!,
          y: j.netMarginPercent!,
        }))
    );

    return {
      year,
      totalRevenue,
      totalDirectCost,
      totalNetIncome,
      averageNetMarginPercent,
      correlationResidualThMargin,
      jobsites,
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────

  private async getRevenue(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_invoice as fi")
      .select([
        "fi.jobsite_id",
        sql<number>`SUM(fi.amount)`.as("total_revenue"),
      ])
      .where("fi.invoice_date", ">=", startDate)
      .where("fi.invoice_date", "<=", endDate)
      .where("fi.direction", "=", "revenue")
      .groupBy("fi.jobsite_id")
      .execute();
  }

  private async getEmployeeCosts(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select([
        "ew.jobsite_id",
        sql<number>`SUM(ew.total_cost)`.as("employee_cost"),
      ])
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
      .select([
        "vw.jobsite_id",
        sql<number>`SUM(vw.total_cost)`.as("vehicle_cost"),
      ])
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
      .select([
        "ms.jobsite_id",
        sql<number>`SUM(ms.total_cost)`.as("material_cost"),
      ])
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
      .selectFrom("fact_trucking as tr")
      .innerJoin("dim_daily_report as dr", "dr.id", "tr.daily_report_id")
      .select([
        "tr.jobsite_id",
        sql<number>`SUM(tr.total_cost)`.as("trucking_cost"),
      ])
      .where("tr.work_date", ">=", startDate)
      .where("tr.work_date", "<=", endDate)
      .where("tr.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy("tr.jobsite_id")
      .execute();
  }

  /** Tonnes per daily report (all approved reports, all convertible units) */
  private async getTonnesPerDailyReport(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .innerJoin("dim_jobsite as j", "j.id", "ms.jobsite_id")
      .select([
        "ms.jobsite_id",
        "j.mongo_id as jobsite_mongo_id",
        "j.name as jobsite_name",
        "j.jobcode",
        "ms.daily_report_id",
        sql<number>`COALESCE(SUM(${getTonnesConversion()}), 0)`.as("tonnes"),
      ])
      .where("ms.work_date", ">=", startDate)
      .where("ms.work_date", "<=", endDate)
      .where("ms.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .where((eb) =>
        eb.or([
          eb(sql`LOWER(ms.unit)`, "=", "tonnes"),
          eb(sql`LOWER(ms.unit)`, "=", "m3"),
          eb.and([
            eb(sql`LOWER(ms.unit)`, "=", "loads"),
            eb(sql`ms.vehicle_type`, "ilike", "%tandem%"),
          ]),
        ])
      )
      .groupBy([
        "ms.jobsite_id",
        "j.mongo_id",
        "j.name",
        "j.jobcode",
        "ms.daily_report_id",
      ])
      .execute();
  }

  /**
   * Average employee hours per daily report (represents "crew hours" for that day).
   * Same logic as ProductivityBenchmarksResolver.getCrewHoursPerReport().
   */
  private async getCrewHoursPerDailyReport(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select([
        "ew.daily_report_id",
        "ew.jobsite_id",
        sql<number>`AVG(ew.hours)`.as("crew_hours"),
      ])
      .where("ew.work_date", ">=", startDate)
      .where("ew.work_date", "<=", endDate)
      .where("ew.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy(["ew.daily_report_id", "ew.jobsite_id"])
      .execute();
  }

  /**
   * Logarithmic regression: T/H = intercept + slope * ln(tonnes)
   * Copied from ProductivityBenchmarksResolver to keep resolvers self-contained.
   */
  private calculateRegressionCoefficients(
    points: Array<{ totalTonnes: number; tonnesPerHour: number }>
  ): { intercept: number; slope: number } {
    if (points.length < 2) return { intercept: 0, slope: 0 };

    const transformed = points.map((p) => ({
      x: Math.log(p.totalTonnes),
      y: p.tonnesPerHour,
    }));

    const n = transformed.length;
    const meanX = transformed.reduce((s, p) => s + p.x, 0) / n;
    const meanY = transformed.reduce((s, p) => s + p.y, 0) / n;

    let num = 0;
    let den = 0;
    for (const p of transformed) {
      num += (p.x - meanX) * (p.y - meanY);
      den += (p.x - meanX) ** 2;
    }

    if (den === 0) return { intercept: meanY, slope: 0 };
    const slope = num / den;
    return { intercept: meanY - slope * meanX, slope };
  }

  /** Pearson r for an array of (x, y) pairs. Returns null if < 3 points. */
  private pearsonCorrelation(
    pairs: Array<{ x: number; y: number }>
  ): number | null {
    if (pairs.length < 3) return null;
    const n = pairs.length;
    const meanX = pairs.reduce((s, p) => s + p.x, 0) / n;
    const meanY = pairs.reduce((s, p) => s + p.y, 0) / n;
    let num = 0;
    let denX = 0;
    let denY = 0;
    for (const p of pairs) {
      const dx = p.x - meanX;
      const dy = p.y - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    const den = Math.sqrt(denX * denY);
    if (den === 0) return null;
    return num / den;
  }
}
```

**Step 2: Register the resolver in `server/src/app.ts`**

Find the section where `ProductivityBenchmarksResolver` is imported and registered (lines ~42 and ~102 in `app.ts`). Add the new resolver in the same pattern:

```typescript
// Near the other PG resolver imports (around line 42):
import FinancialPerformanceResolver from "@graphql/resolvers/financialPerformance";

// In the resolvers array (around line 102, after ProductivityBenchmarksResolver):
FinancialPerformanceResolver,
```

**Step 3: Verify TypeScript compiles**

```bash
cd /home/dev/work/bow-mark/server && npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no TypeScript errors. If there are Kysely type errors about column names not existing in the schema, check `server/src/db/types.ts` to confirm column names (e.g., `fact_invoice` has `direction`, `fact_trucking` has `archived_at`).

**Step 4: Commit**

```bash
cd /home/dev/work/bow-mark
git add server/src/graphql/resolvers/financialPerformance/index.ts server/src/app.ts
git commit -m "feat: add financial performance resolver with revenue, costs, and T/H data"
```

---

### Task 3: Client GraphQL Query + Codegen

**Files:**
- Create: `client/src/graphql/queries/FinancialPerformance.graphql`
- Run codegen to regenerate `client/src/generated/graphql.tsx`

**Step 1: Write the GraphQL query file**

```graphql
query FinancialPerformance($input: FinancialPerformanceInput!) {
  financialPerformance(input: $input) {
    year
    totalRevenue
    totalDirectCost
    totalNetIncome
    averageNetMarginPercent
    correlationResidualThMargin
    jobsites {
      jobsiteId
      jobsiteName
      jobcode
      totalRevenue
      employeeCost
      vehicleCost
      materialCost
      truckingCost
      totalDirectCost
      netIncome
      netMarginPercent
      totalTonnes
      totalCrewHours
      tonnesPerHour
      expectedTonnesPerHour
      residualTonnesPerHourPercent
    }
  }
}
```

**Step 2: Run codegen**

The server must be running (or at least its schema must be accessible). If the dev environment is up via Tilt:

```bash
cd /home/dev/work/bow-mark/client && npm run codegen
```

Expected: `client/src/generated/graphql.tsx` updated — look for `useFinancialPerformanceQuery` hook and `FinancialPerformanceInput` type in the generated file.

If codegen fails because the server schema is not accessible, build and start the server first:

```bash
cd /home/dev/work/bow-mark/server && npm run build && npm run start:dev &
# wait a few seconds, then:
cd /home/dev/work/bow-mark/client && npm run codegen
```

**Step 3: Commit**

```bash
cd /home/dev/work/bow-mark
git add client/src/graphql/queries/FinancialPerformance.graphql client/src/generated/graphql.tsx
git commit -m "feat: add financial performance GraphQL query and regenerate types"
```

---

### Task 4: FinancialPerformance Component

**Files:**
- Create: `client/src/components/pages/jobsite-year-master-report/FinancialPerformance.tsx`

Look at `ProductivityBenchmarks.tsx` as the reference for patterns (Card, sortable table, Recharts scatter, Chakra UI). The new component is self-contained and does not modify the existing component.

**Step 1: Create `FinancialPerformance.tsx`**

```typescript
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
        default:
          aVal = (a as Record<string, number>)[sortColumn] ?? 0;
          bVal = (b as Record<string, number>)[sortColumn] ?? 0;
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
              <Badge colorScheme="purple" fontSize="sm" px={2} py={1}>
                {correlationLabel}
              </Badge>
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
                  {scatterData.map((entry, idx) => (
                    <Cell
                      key={idx}
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
                    <Td isNumeric>{formatCurrency(j.materialCost)}</Td>
                    <Td isNumeric>{formatCurrency(j.truckingCost)}</Td>
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
          from approved daily reports (expense invoices excluded to avoid
          double-counting).{" "}
          <strong>Residual T/H%:</strong> how much actual T/H exceeded or
          missed the size-adjusted expectation.
        </Text>
      </Card>
    </Box>
  );
};

export default FinancialPerformance;
```

**Step 2: Run type-check to verify**

```bash
cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors in `FinancialPerformance.tsx`.

**Step 3: Commit**

```bash
cd /home/dev/work/bow-mark
git add client/src/components/pages/jobsite-year-master-report/FinancialPerformance.tsx
git commit -m "feat: add FinancialPerformance component with summary, scatter, and table"
```

---

### Task 5: Wire Into ClientContent.tsx

**Files:**
- Modify: `client/src/components/pages/jobsite-year-master-report/ClientContent.tsx`

**Step 1: Make three edits to `ClientContent.tsx`**

**Edit 1** — Add import at the top (after the `ProductivityBenchmarks` import on line 15):
```typescript
import FinancialPerformance from "./FinancialPerformance";
```

**Edit 2** — Update the tab index validation in the `useEffect` (line 36). Change `tab > 2` to `tab > 3`:
```typescript
setTabIndex(isNaN(tab) || tab < 0 || tab > 3 ? 0 : tab);
```

**Edit 3** — Add the new Tab and TabPanel inside the `<Tabs>` block. In `TabList`, add after `<Tab>Productivity Benchmarks</Tab>`:
```tsx
<Tab>Financial Performance</Tab>
```

In `TabPanels`, add after the `</TabPanel>` that wraps `<ProductivityBenchmarks>`:
```tsx
<TabPanel px={0}>
  {year && <FinancialPerformance year={year} />}
</TabPanel>
```

**Step 2: Run type-check**

```bash
cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
cd /home/dev/work/bow-mark
git add client/src/components/pages/jobsite-year-master-report/ClientContent.tsx
git commit -m "feat: add Financial Performance tab to Jobsite Year Master Report"
```

---

## Verification

After all tasks complete:

1. Navigate to the Jobsite Year Master Report page (any year with data)
2. Confirm the fourth tab "Financial Performance" appears and loads
3. Check the summary stats show non-zero values
4. Confirm the scatter plot renders (will only show if ≥3 jobsites have both T/H and revenue data)
5. Sort the table by "Net Income" and "Margin %" — confirm both directions work
6. Click a jobsite name link — confirm it navigates to the jobsite page
7. Check Residual T/H% column — jobsites without tonnes data should show "—"
8. Run `npm run type-check` in client — no errors
