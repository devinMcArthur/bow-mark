# Equipment Utilization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add equipment utilization percentages (vehicle hours / avg employee hours) to the jobsite report Breakdown tab and as a new MCP tool for AI queries.

**Architecture:** Two independent changes with no new PostgreSQL views, GraphQL types, or codegen. The frontend computes utilization from data already returned by the existing `jobsiteReport` query. The MCP tool uses a Kysely CTE query inline. See design doc: `docs/plans/2026-03-10-equipment-utilization-design.md`.

**Tech Stack:** TypeScript, Kysely (PostgreSQL query builder), React, Chakra UI

---

## Background: Key Concepts

**Utilization formula:** `vehicle hours / avg employee hours` per daily report.
- "Avg employee hours" on a given day = `total employee hours that day / number of employees that day` = the shift length proxy.
- A paver that ran 6 hours on a day where the crew averaged 8 hours = **75% utilization**.
- Overall utilization for a vehicle over a period = `SUM(vehicle hours on active days) / SUM(avg employee hours on those same days)`.

**Why avg (not max or sum)?** The crew members all work roughly the same hours — it's the shift length. Averaging normalizes for crew size.

**Existing data flow:** The `Breakdown` tab uses the `jobsiteReport` GraphQL query, which returns `dayReports`. Each `dayReport` has `employees` (array with `hours` per employee) and `vehicles` (array with `hours` per vehicle). Both are already in the component's data — no new backend fields needed.

---

## Task 1: MCP Tool — `get_equipment_utilization`

**Files:**
- Modify: `server/src/mcp-server.ts` (add new tool after line ~1217, after the `get_vehicle_utilization` tool)

There are no automated tests for MCP tools — the test is manual verification via the dev environment.

### Step 1: Add the tool registration

Open `server/src/mcp-server.ts`. Find the comment `// ── get_daily_report_activity` (around line 1219). Insert the new tool **above** it.

The tool uses two CTEs:
1. `daily_shifts` — computes avg employee hours per daily report
2. `vehicle_daily` — aggregates vehicle hours per (vehicle, daily_report) with the shift hours attached

Then the final query groups by vehicle to produce utilization %.

```typescript
  // ── get_equipment_utilization ─────────────────────────────────────────────
  server.registerTool(
    "get_equipment_utilization",
    {
      description:
        "Get equipment/vehicle utilization percentages for a jobsite and date range. " +
        "Utilization = vehicle operational hours / avg crew shift hours per day. " +
        "Returns overall utilization summary and per-vehicle breakdown.",
      inputSchema: {
        jobsiteMongoId: z
          .string()
          .describe("MongoDB ObjectId of the jobsite (use search_jobsites to find it)"),
        startDate: z.string().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().describe("End date in YYYY-MM-DD format"),
        crewType: z
          .string()
          .optional()
          .describe("Filter to a specific crew type (optional — omit for all crews)"),
      },
    },
    async ({ jobsiteMongoId, startDate: startStr, endDate: endStr, crewType }) => {
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      endDate.setHours(23, 59, 59, 999);

      // Resolve jobsite mongo_id → postgres id
      const jobsite = await db
        .selectFrom("dim_jobsite as j")
        .select(["j.id", "j.name", "j.jobcode"])
        .where("j.mongo_id", "=", jobsiteMongoId)
        .executeTakeFirst();

      if (!jobsite) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Jobsite not found: ${jobsiteMongoId}`,
            },
          ],
        };
      }

      // CTE 1: avg employee hours per daily report
      // CTE 2: vehicle hours per (vehicle, daily_report) with shift hours attached
      // Final: aggregate by vehicle → total hours, total cost, days active, utilization %
      const rows = await db
        .with("daily_shifts", (db) =>
          db
            .selectFrom("fact_employee_work as ew")
            .select([
              "ew.daily_report_id",
              sql<number>`SUM(ew.hours) / NULLIF(COUNT(DISTINCT ew.employee_id), 0)`.as(
                "avg_employee_hours"
              ),
            ])
            .where("ew.archived_at", "is", null)
            .groupBy("ew.daily_report_id")
        )
        .with("vehicle_daily", (db) =>
          db
            .selectFrom("fact_vehicle_work as vw")
            .innerJoin("dim_daily_report as dr", "dr.id", "vw.daily_report_id")
            .leftJoin(
              "daily_shifts as ds",
              "ds.daily_report_id",
              "vw.daily_report_id"
            )
            .$if(!!crewType, (qb) =>
              qb.where("vw.crew_type", "ilike", crewType!)
            )
            .select([
              "vw.vehicle_id",
              "vw.daily_report_id",
              sql<number>`SUM(vw.hours)`.as("vehicle_hours"),
              sql<number>`SUM(vw.total_cost)`.as("vehicle_cost"),
              sql<number>`MAX(ds.avg_employee_hours)`.as("avg_employee_hours"),
            ])
            .where("vw.jobsite_id", "=", jobsite.id)
            .where("vw.work_date", ">=", startDate)
            .where("vw.work_date", "<=", endDate)
            .where("vw.archived_at", "is", null)
            .where("dr.approved", "=", true)
            .where("dr.archived", "=", false)
            .groupBy(["vw.vehicle_id", "vw.daily_report_id", "ds.avg_employee_hours"])
        )
        .selectFrom("vehicle_daily as vd")
        .innerJoin("dim_vehicle as v", "v.id", "vd.vehicle_id")
        .select([
          "v.id as vehicle_id",
          "v.name as vehicle_name",
          "v.vehicle_code",
          sql<number>`SUM(vd.vehicle_hours)`.as("total_hours"),
          sql<number>`SUM(vd.vehicle_cost)`.as("total_cost"),
          sql<number>`COUNT(*)`.as("days_active"),
          sql<number>`SUM(vd.vehicle_hours) / NULLIF(SUM(vd.avg_employee_hours), 0) * 100`.as(
            "utilization_pct"
          ),
        ])
        .groupBy(["v.id", "v.name", "v.vehicle_code"])
        .orderBy("utilization_pct", "desc")
        .execute();

      const totalHours = rows.reduce((s, r) => s + Number(r.total_hours ?? 0), 0);
      const totalCost = rows.reduce((s, r) => s + Number(r.total_cost ?? 0), 0);
      const avgUtilization =
        rows.length > 0
          ? rows.reduce((s, r) => s + Number(r.utilization_pct ?? 0), 0) /
            rows.length
          : null;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                jobsite: `${jobsite.name}${jobsite.jobcode ? ` (${jobsite.jobcode})` : ""}`,
                period: { startDate: startStr, endDate: endStr },
                crewType: crewType ?? "all",
                summary: {
                  overallAvgUtilizationPct:
                    avgUtilization != null
                      ? Math.round(avgUtilization * 10) / 10
                      : null,
                  totalVehicleHours: Math.round(totalHours * 10) / 10,
                  totalVehicleCost: Math.round(totalCost),
                },
                vehicles: rows.map((r) => ({
                  vehicleName: r.vehicle_name,
                  vehicleCode: r.vehicle_code,
                  utilizationPct:
                    r.utilization_pct != null
                      ? Math.round(Number(r.utilization_pct) * 10) / 10
                      : null,
                  totalHours: Math.round(Number(r.total_hours ?? 0) * 10) / 10,
                  totalCost: Math.round(Number(r.total_cost ?? 0)),
                  daysActive: Number(r.days_active),
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
```

### Step 2: Check k8s server logs after saving

The dev server runs with `nodemon` + `ts-node`. After saving `mcp-server.ts`, the pod restarts automatically. Wait ~15 seconds then check for errors:

```bash
kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=20
```

Expected: no `TSError` or `SyntaxError`. If there's a crash, fix the TypeScript before continuing.

### Step 3: Verify via the MCP chat UI

Open the chat interface (http://localhost:3000/chat). Ask the AI assistant:
> "What is the equipment utilization for [a jobsite you know has vehicle data] in 2025?"

The AI should call `search_jobsites` first (to get the mongo ID), then call `get_equipment_utilization`. The response should show vehicles with a `utilizationPct` value.

If utilization is `null` for all vehicles, it means the employee data isn't in `fact_employee_work` for those daily reports. Check by querying:
```sql
SELECT daily_report_id, COUNT(*) as emp_count, SUM(hours) as total_hours
FROM fact_employee_work
WHERE archived_at IS NULL
LIMIT 10;
```
in the Tilt UI's Postgres terminal or a kubectl exec.

### Step 4: Commit

```bash
git add server/src/mcp-server.ts
git commit -m "feat: add get_equipment_utilization MCP tool"
```

---

## Task 2: Frontend — Utilization in Breakdown.tsx

**Files:**
- Modify: `client/src/components/pages/jobsite-report/Breakdown.tsx`

No tests — visual verification in the browser.

### Step 1: Add `shiftHoursByDate` to `CrewData`

In `Breakdown.tsx`, find the `CrewData` interface (around line 74). Add one field:

```typescript
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
  shiftHoursByDate: Map<string, number>; // date → avg employee hours (shift length)
}
```

Also update `emptyCrewData()` (around line 89) to initialize it:

```typescript
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
    shiftHoursByDate: new Map(),
  };
}
```

### Step 2: Compute shift hours in `aggregateDayReports`

The function loops through `day.employees` to build the employee map. We need to also accumulate, per crew per date, the total employee hours and count — then divide at the end.

Add a temporary accumulator map inside the function, before the `for (const day of dayReports)` loop:

```typescript
// Accumulator: crewType → date → { totalHours, count }
const empAccByCrewDate = new Map<string, Map<string, { totalHours: number; count: number }>>();
```

Inside the `for (const emp of day.employees)` block, after updating the employee entry, add:

```typescript
// Accumulate for shift hours calculation
if (!empAccByCrewDate.has(emp.crewType)) empAccByCrewDate.set(emp.crewType, new Map());
const acc = empAccByCrewDate.get(emp.crewType)!;
const prev = acc.get(dateStr) ?? { totalHours: 0, count: 0 };
acc.set(dateStr, { totalHours: prev.totalHours + emp.hours, count: prev.count + 1 });
```

After the main `for (const day of dayReports)` loop ends, derive `shiftHoursByDate` from the accumulator:

```typescript
// Compute shift hours per date per crew
for (const [crewType, dateMap] of empAccByCrewDate.entries()) {
  const crew = crewMap.get(crewType);
  if (!crew) continue;
  for (const [date, { totalHours, count }] of dateMap.entries()) {
    if (count > 0) crew.shiftHoursByDate.set(date, totalHours / count);
  }
}
```

### Step 3: Add a `computeUtilization` helper near the top of the file

Add this helper function after the `formatCurrency` function (around line 206):

```typescript
/**
 * Compute utilization % for a vehicle over a period.
 * Returns null if no shift data is available.
 * Only includes days where the vehicle was active (avoids diluting with absent days).
 */
const computeUtilization = (
  vehicleByDate: Map<string, { hours: number; cost: number }>,
  shiftHoursByDate: Map<string, number>
): number | null => {
  let totalVehicleHours = 0;
  let totalShiftHours = 0;
  let hasData = false;

  for (const [date, { hours }] of vehicleByDate.entries()) {
    const shiftHours = shiftHoursByDate.get(date);
    if (shiftHours && shiftHours > 0) {
      totalVehicleHours += hours;
      totalShiftHours += shiftHours;
      hasData = true;
    }
  }

  if (!hasData || totalShiftHours === 0) return null;
  return (totalVehicleHours / totalShiftHours) * 100;
};
```

### Step 4: Update the Equipment table in `CrewCard`

The `CrewCard` component (around line 214) receives `crew: CrewData` which now has `shiftHoursByDate`. Update the Equipment table section (the `{crew.vehicles.size > 0 && ...}` block):

**Header row** — change `Total Hrs` to `Total Hrs / Util`:

```tsx
<Th isNumeric>Total Hrs / Util</Th>
```

**Data rows** — replace the existing Total Hrs `<Td>` with one that shows hours + utilization:

```tsx
<Td isNumeric>
  <Text as="span">{formatNumber(entry.totalHours)}</Text>
  {(() => {
    const util = computeUtilization(entry.byDate, crew.shiftHoursByDate);
    if (util == null) return null;
    return (
      <Text as="span" color="gray.500" fontSize="xs" ml={1}>
        ({Math.round(util)}%)
      </Text>
    );
  })()}
</Td>
```

**Date column cells** — replace the existing per-day `<Td>` in the vehicles map with one that shows hours + daily utilization:

```tsx
{dates.map((d) => {
  const day = entry.byDate.get(d);
  const shiftHours = crew.shiftHoursByDate.get(d);
  const dailyUtil =
    day && shiftHours && shiftHours > 0
      ? Math.round((day.hours / shiftHours) * 100)
      : null;
  return (
    <Td key={d} isNumeric color={day ? undefined : "gray.300"}>
      {day ? (
        <>
          <Text as="span">{formatNumber(day.hours)}</Text>
          {dailyUtil != null && (
            <Text as="span" color="gray.500" fontSize="xs" ml={1}>
              ({dailyUtil}%)
            </Text>
          )}
        </>
      ) : (
        "—"
      )}
    </Td>
  );
})}
```

### Step 5: Verify in the browser

Open any jobsite report that has equipment data (the Breakdown tab). Expand a crew card that has vehicles. You should see:

- The "Total Hrs / Util" column header
- Each vehicle row showing e.g. `12.5 (68%)` in the total column
- Date cells showing e.g. `6.5 (81%)` or `—`

If utilization shows `null` / doesn't appear, the crew has no matching employee data for those dates. Check that the `shiftHoursByDate` map is being populated by adding a `console.log(crew.shiftHoursByDate)` temporarily.

### Step 6: Commit

```bash
git add client/src/components/pages/jobsite-report/Breakdown.tsx
git commit -m "feat: show equipment utilization % in jobsite report breakdown"
```

---

## Final Verification

1. In the Breakdown tab, a vehicle that was on site all day should show ~100%. One that ran half the shift should show ~50%. Cross-check one or two values manually against a daily report you know.

2. In the AI chat, ask: "What was equipment utilization for [jobsite name] last year?" — the AI should return a structured response with per-vehicle utilization %.

3. Ask the AI a cross-cutting question: "Which vehicles have the highest utilization across all jobs this year?" — this requires `list_jobsites` + multiple `get_equipment_utilization` calls. The AI may not do this automatically but should handle it if asked step-by-step.
