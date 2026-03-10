# Equipment Utilization Design

**Goal:** Surface vehicle/equipment utilization percentages (operational hours as a fraction of shift length) in the jobsite report Breakdown tab and via a new MCP tool for AI queries.

**Date:** 2026-03-10

---

## Background

For a paving crew, equipment utilization = what percentage of the time the crew was on site was a paver (or other piece of equipment) actually operational. The hours logged by foremen for both employees and vehicles are already operational hours, so no new data collection is needed.

**Formula:** `utilization % = vehicle hours / avg employee hours` per daily report (average employee hours = shift length proxy).

All raw data exists in PostgreSQL: `fact_vehicle_work.hours` and `fact_employee_work.hours`, both linked via `daily_report_id` to `dim_daily_report`.

---

## Architecture Decision

**Option A chosen: Frontend computation + standalone MCP tool (no new PG views).**

Rationale: The Breakdown component already receives per-employee and per-vehicle hours per day from the existing `jobsiteReport` GraphQL query. Utilization is arithmetic that can be computed from that data with no new backend fields. The MCP tool is self-contained and can compute the same logic inline via a Kysely CTE. A PostgreSQL view would add a migration and shared infrastructure for logic that currently only needs to live in two places. If a third consumer appears (e.g. the daily email report), extract to a view then.

---

## Component 1: Frontend (Breakdown.tsx)

**No GraphQL schema changes. No codegen.**

### Changes to `aggregateDayReports`

Add to `CrewData`:
```typescript
shiftHoursByDate: Map<string, number>; // date → avg employee hours that day
```

While iterating `day.employees`, accumulate per crew per date:
```typescript
empAccByDate: Map<string, { totalHours: number; count: number }>
```

After all days processed, derive:
```typescript
shiftHours = totalHours / count  // per date
```

### Changes to Equipment table in `CrewCard`

No new column. Richer cells:

- **Total Hrs cell:** `12.5 hrs (68%)` — total vehicle hours + overall utilization for the period
- **Date column cells:** `6.5 (81%)` — hours + daily utilization, or `—` if no vehicle work

**Overall utilization for a vehicle (period):**
```
sum(vehicleHours on days vehicle was active) / sum(shiftHours on those same days)
```
This avoids diluting the average with days where the vehicle wasn't present at all.

---

## Component 2: MCP Tool

**Tool name:** `get_equipment_utilization`

**File:** `server/src/mcp-server.ts` (add alongside existing `get_vehicle_utilization` tool)

### Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobsite_mongo_id` | string | yes | MongoDB ObjectId of the jobsite |
| `start_date` | string | yes | YYYY-MM-DD |
| `end_date` | string | yes | YYYY-MM-DD |
| `crew_type` | string | no | Filter to a specific crew type |

### SQL Logic (Kysely inline CTEs)

1. **`daily_shifts` CTE** — per `daily_report_id`, compute avg employee hours:
   ```sql
   SELECT daily_report_id,
          SUM(hours) / NULLIF(COUNT(DISTINCT employee_id), 0) AS avg_employee_hours
   FROM fact_employee_work
   WHERE archived_at IS NULL
   GROUP BY daily_report_id
   ```

2. **`vehicle_daily` CTE** — join vehicle work with shifts, filter by jobsite + date range + approved:
   ```sql
   SELECT fvw.vehicle_id, dv.name, dv.vehicle_code,
          fvw.daily_report_id, fvw.hours AS vehicle_hours,
          fvw.total_cost, dr.work_date, fvw.crew_type,
          ds.avg_employee_hours,
          CASE WHEN ds.avg_employee_hours > 0
               THEN fvw.hours / ds.avg_employee_hours * 100
               ELSE NULL END AS utilization_pct
   FROM fact_vehicle_work fvw
   JOIN dim_vehicle dv ON fvw.vehicle_id = dv.id
   JOIN dim_daily_report dr ON fvw.daily_report_id = dr.id
   JOIN dim_jobsite dj ON fvw.jobsite_id = dj.id
   LEFT JOIN daily_shifts ds ON fvw.daily_report_id = ds.daily_report_id
   WHERE dj.mongo_id = $jobsite_mongo_id
     AND dr.work_date BETWEEN $start_date AND $end_date
     AND dr.approved = true
     AND dr.archived = false
     AND fvw.archived_at IS NULL
   ```

3. **Final aggregation** — group by vehicle:
   ```sql
   SELECT vehicle_id, name, vehicle_code,
          SUM(vehicle_hours) AS total_hours,
          SUM(total_cost) AS total_cost,
          COUNT(*) AS days_active,
          SUM(vehicle_hours) / NULLIF(SUM(avg_employee_hours), 0) * 100 AS utilization_pct
   FROM vehicle_daily
   GROUP BY vehicle_id, name, vehicle_code
   ORDER BY utilization_pct DESC
   ```

### Output Shape

```json
{
  "jobsite": "Job Name (JC-2025-01)",
  "period": { "startDate": "2025-01-01", "endDate": "2025-12-31" },
  "summary": {
    "overallUtilizationPct": 72.4,
    "totalVehicleHours": 340.5,
    "totalVehicleCost": 28400.00
  },
  "vehicles": [
    {
      "name": "Paver #1",
      "code": "PAV-01",
      "utilizationPct": 81.2,
      "totalHours": 156.0,
      "totalCost": 14200.00,
      "daysActive": 22
    }
  ]
}
```

---

## Testing

**MCP tool:** Run against a known jobsite in Tilt dev environment. A vehicle present for a full shift should be near 100%; one that ran half the day should be ~50%. Verify against raw data in the Breakdown tab.

**Frontend:** Visual check in the Breakdown tab on any jobsite with vehicle data. Confirm utilization % appears in Total Hrs cell and date cells. Confirm days with no vehicle work still show `—`.

---

## Future Considerations

- If a third consumer needs utilization data (e.g. daily email report, dashboard), extract the CTE logic into a PostgreSQL view `v_vehicle_utilization` and reference it from both the MCP tool and any new consumer.
- Cross-jobsite fleet utilization (which vehicle is most utilized company-wide) would follow the same pattern with a different filter.
- Crew-level benchmarking (which crew gets the most out of their equipment) = group by `crew_id` instead of `vehicle_id`.
