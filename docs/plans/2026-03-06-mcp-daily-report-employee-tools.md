# MCP Analytics: Daily Report Activity + Employee Productivity Tools

## Context

The MCP analytics server currently has 8 tools covering financial performance, crew
benchmarks, material breakdown, and vehicle utilization — all backed exclusively by
PostgreSQL. This design adds two new tools that combine PostgreSQL quantitative data
with MongoDB qualitative data (report notes), giving Claude the ability to answer both
"how is the job performing?" and "what's actually happening on the ground?"

## New Tools

### `get_daily_report_activity`

**Purpose:** Retrieve daily report activity for a date range, optionally scoped to a
single jobsite. Combines quantitative metrics (hours, tonnes, costs) with the free-text
note written by the foreman.

**Parameters:**
- `startDate: string` — YYYY-MM-DD
- `endDate: string` — YYYY-MM-DD
- `jobsiteMongoId?: string` — optional; if omitted, returns all jobsites

**Data sources:**
1. **PostgreSQL** — `dim_daily_report` joined with `dim_jobsite` and `dim_crew`.
   Per report, aggregate from fact tables:
   - Employee count, total crew hours, total man-hours (`fact_employee_work`)
   - Total tonnes, material cost (`fact_material_shipment`)
   - Vehicle hours (`fact_vehicle_work`)
   - Trucking cost (`fact_trucking`)
2. **MongoDB** — batch fetch `DailyReport` documents by `mongo_id`, populate
   `reportNote`, extract `note` string.

**Response shape (per report):**
```json
{
  "date": "2026-03-01",
  "jobsite": { "id": "...", "name": "...", "jobcode": "..." },
  "crew": { "name": "...", "type": "..." },
  "approved": true,
  "metrics": {
    "employeeCount": 8,
    "crewHours": 9.5,
    "manHours": 76.0,
    "totalTonnes": 412.5,
    "materialCost": 18400,
    "vehicleHours": 28.0,
    "truckingCost": 3200
  },
  "note": "Good day, paving went smoothly. Minor delay in the morning due to..."
}
```

Returns sorted by date descending. Empty `note` string if no note exists.

---

### `get_employee_productivity`

**Purpose:** Per-employee breakdown of hours, cost, job title, jobsites worked, and
an approximate T/H metric for a date range.

**Parameters:**
- `startDate: string` — YYYY-MM-DD
- `endDate: string` — YYYY-MM-DD
- `jobsiteMongoId?: string` — optional filter to a single jobsite

**Data sources:** Entirely PostgreSQL.

**T/H approximation:** Tonnes are tracked at the crew/report level, not per employee.
T/H per employee = sum of tonnes on daily reports the employee appeared on, divided by
that employee's hours on those reports. This matches the crew-level T/H methodology.

**Response shape (per employee):**
```json
{
  "name": "John Smith",
  "jobTitle": "Equipment Operator",
  "totalHours": 184.5,
  "totalCost": 5167.50,
  "dayCount": 22,
  "jobsiteCount": 3,
  "tonnesPerHour": 48.2
}
```

Returns sorted by total hours descending. `tonnesPerHour` is null if no material
shipments are associated with the employee's reports.

---

## Architecture Change: MongoDB Connection

The MCP server currently connects only to PostgreSQL. To fetch report note text, it
needs a Mongoose connection.

**Approach:** Add a Mongoose connection in `mcp-server.ts` on startup, using `MONGO_URI`
(already available in the environment). Import only `DailyReport` and `ReportNote`
models. Connection errors are caught and logged; the server continues running and tools
that need MongoDB return a graceful message if the connection is unavailable.

---

## Out of Scope

- Syncing notes to PostgreSQL (adds consumer complexity for no meaningful benefit)
- Per-employee T/H with exact attribution (requires schema changes)
- Note editing or mutations via MCP
