# Jobsite Dashboard Design

## Goal

Build a new time-filterable jobsite report page at `/jobsite/[id]/report` that replaces the existing `/jobsite-year-report/[id]` and `/jobsite-month-report/[id]` pages. The new page is fully PostgreSQL-backed, supports arbitrary date ranges, and replicates the structure and content of the existing MongoDB-backed jobsite reports with additional productivity analytics. The old report pages are not removed — the new page is built independently first.

## Architecture

Fully PostgreSQL-backed — no MongoDB queries. The existing `jobsiteYearReportPG` resolver (which accepts a fixed `year`) is adapted into a new `jobsiteReport` resolver accepting `startDate`/`endDate`. The existing `jobsiteProductivity` query powers the Productivity tab unchanged.

The company dashboard's All Jobs table (Overview and Financial tabs) links to this page, carrying the current `startDate`/`endDate` through as query params.

## URL Structure

```
/jobsite/[id]/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&tab=0
```

- `[id]` — MongoDB jobsite `_id` (same ID the company dashboard already exposes)
- `startDate` / `endDate` — date range, defaults to current year if absent
- `tab` — active tab index (0 = Summary, 1 = Breakdown, 2 = Productivity)

## Page Header

Jobsite name + jobcode as the page title. Date range controls identical to the company dashboard: preset buttons (This Year / Last Year / Last 6 Months) highlighted in solid blue when active, plus custom date inputs. Controls and tab list share a single bottom border. URL kept in sync via `router.replace` (shallow).

---

## Tab 1: Summary

Three sections stacked vertically:

### Financial Summary Card
- **Total Revenue** — broken down as Internal + External + Accrual
- **Total Direct Costs** — marked-up value as the primary figure (internal costs + 15% overhead, external invoices + 3%); raw pre-markup total shown as subdued subtitle beneath it
- **Net Income** — derived from marked-up figures
- **Net Margin %**
- Overhead calculation shown in tooltip on the costs figure

### Invoice Cards (2-column grid)
- Left: Expense Invoices — invoice number, company, amount
- Right: Revenue Invoices — invoice number, company, amount

### On-Job Stats Grid (5 stats)
- Wages: total cost + total hours
- Equipment: total cost + total hours
- Materials: total cost + total quantity
- Trucking: total cost
- Total On-Site: combined with overhead applied

---

## Tab 2: Breakdown

One collapsible card per crew type found in the date range (collapsed by default). Each card contains:

1. **Crew On-Job Summary** — small stats row: Wages, Equipment, Materials, Trucking, subtotal for that crew
2. **Employees table** — Employee name | Total Hours | Total Cost | one column per date (horizontal scroll) | footer totals
3. **Vehicles table** — Vehicle name/code | Total Hours | Total Cost | per-date columns | footer totals
4. **Materials table** — Material + supplier | Total quantity + unit | Total cost | per-date columns | rate | estimated flag
5. **Non-Costed Materials table** — same structure, no cost column
6. **Trucking table** — Type | Quantity | Hours | Rate | Cost | per-date columns

Data comes from the `dayReports[]` array returned by the new `jobsiteReport` query, aggregated and pivoted client-side by crew type and date.

---

## Tab 3: Productivity

Powered entirely by the existing `jobsiteProductivity` query (no server changes needed for this tab).

1. **Overall stats row** — Overall T/H, Total Tonnes, Total Crew Hours, Materials Tracked count
2. **Material Productivity table** — grouping dropdown (Material Only / Material + Crew Type / Material + Job Title), expandable rows with daily breakdown, checkbox multi-select, trend line chart for selected materials. Columns: Material | Tonnes | Crew Hours | T/H | Shipments
3. **Labor Type Hours** — per crew type, columns: Job Title | Total Hours | Avg/Day | Days Worked | Employees
4. **Daily Breakdown** (bottom) — 4 sub-tabs: Summary by date | Employees by date | Vehicles by date | Materials by date. Horizontal scrollable tables.

---

## Server-Side Changes

### New GraphQL query: `jobsiteReport`

```graphql
query JobsiteReport($jobsiteMongoId: String!, $startDate: Date!, $endDate: Date!) {
  jobsiteReport(jobsiteMongoId: $jobsiteMongoId, startDate: $startDate, endDate: $endDate) {
    jobsite { _id, name, jobcode }
    crewTypes
    summary {
      totalRevenue
      internalRevenue
      externalRevenue
      accrualRevenue
      totalDirectCost       # pre-markup
      totalMarkedUpCost     # with 15% on internal, 3% on external
      internalCost
      externalCost
      accrualCost
      netIncome
      netMarginPercent
    }
    onJobSummary {
      employeeCost, employeeHours
      vehicleCost, vehicleHours
      materialCost, materialQuantity
      truckingCost
      totalCost
    }
    dayReports {
      id, date, crewTypes
      employees { id, name, hours, cost, crewType }
      vehicles { id, name, code, hours, cost, crewType }
      materials { name, supplier, quantity, unit, rate, cost, estimated, crewType }
      nonCostedMaterials { name, supplier, quantity, unit, crewType }
      trucking { type, quantity, hours, rate, cost, crewType }
    }
    invoices {
      number, company, amount, type, date
    }
  }
}
```

**Resolver**: Adapts the existing `jobsiteYearReportPG` resolver to accept `startDate`/`endDate` instead of `year`. Queries the same PG star schema tables with `WHERE date BETWEEN startDate AND endDate`. No DB migrations required.

### New GraphQL types: `JobsiteReportResult` (and sub-types)

Mirrors the existing `JobsiteYearReportPG` type shape but with the markup-aware summary fields added.

### No changes to `jobsiteProductivity` query or resolver

---

## Client-Side Changes

### New page: `client/src/pages/jobsite/[id]/report.tsx`
- Date range state + URL sync (same pattern as `dashboard.tsx`)
- Fetches `jobsiteReport` and `jobsiteProductivity` queries
- Renders tab shell + passes data to tab components

### New components: `client/src/components/pages/jobsite-report/`
- `Summary.tsx` — financial summary card, invoice cards, on-job stats grid
- `Breakdown.tsx` — crew-type collapsible cards, aggregates `dayReports[]` by crew type
- `Productivity.tsx` — wraps existing `ProductivityAnalytics` component + daily breakdown tabs

### Company dashboard links
- `Overview.tsx` All Jobs table: jobsite name becomes a link
- `Financial.tsx` jobsite rows: jobsite name becomes a link
- Both carry `startDate`/`endDate` as query params

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `server/src/graphql/types/jobsiteReport.ts` | New — GraphQL types for the new query |
| `server/src/graphql/resolvers/jobsiteReport/index.ts` | New — resolver adapting jobsiteYearReportPG logic |
| `client/src/pages/jobsite/[id]/report.tsx` | New — page shell |
| `client/src/components/pages/jobsite-report/Summary.tsx` | New |
| `client/src/components/pages/jobsite-report/Breakdown.tsx` | New |
| `client/src/components/pages/jobsite-report/Productivity.tsx` | New |
| `client/src/graphql/queries/JobsiteReport.graphql` | New |
| `client/src/components/pages/dashboard/Overview.tsx` | Modify — add jobsite links |
| `client/src/components/pages/dashboard/Financial.tsx` | Modify — add jobsite links |

---

## Not In Scope

- Removing old jobsite-year-report / jobsite-month-report pages
- Real-time update subscriptions (the old pages have WebSocket subscriptions for report generation; the new page is a direct PG query, always current)
- A `/jobsite/[id]` overview page (the `/report` sub-route stands alone for now)
