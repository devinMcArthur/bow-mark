# Business Dashboard Design

## Goal

A new `/dashboard` page — separate from the existing jobsite year master report — that serves as the primary executive-facing business health dashboard. Supports arbitrary date ranges defaulting to the current year. Replaces the need to navigate multiple report pages for a high-level view of the business.

## Audience & Use Cases

- **Winter (retrospective):** Review how the year went — revenue, margins, productivity rankings
- **Summer (in-season):** Monitor active jobs — are jobs performing, has revenue come in
- The date range picker makes the same page serve both modes

## Architecture

### Route
`/dashboard` — new Next.js page, no relation to `/jobsite-year-master-report`

### Date Range
- Start date + end date pickers at top-right of page
- Default: Jan 1 – today (current year)
- Quick presets: `This Year`, `Last Year`, `Last 6 Months`
- All three tab queries re-fire on date range change

### Backend: Three New GraphQL Queries
Each query accepts `startDate: Date!, endDate: Date!` (ISO date strings). New resolvers — existing queries untouched.

1. `dashboardOverview(input: DashboardInput)` — KPIs + jobsite summaries
2. `dashboardFinancial(input: DashboardInput)` — Full cost breakdown per jobsite
3. `dashboardProductivity(input: DashboardInput)` — T/H metrics per jobsite and crew

All three query PostgreSQL fact tables filtered by `work_date` / `invoice_date` between startDate and endDate.

Year-over-year comparison cards: each overview KPI also fetches the same metrics for the equivalent prior-year date range (e.g., Jan 1 – today last year) to show `↑ 12% vs last year`.

### Frontend: Tabs, No Page Scroll
- Page frame never scrolls
- Tables within tabs have fixed height + internal scroll + sticky headers
- Tab queries loaded lazily (Financial and Productivity only fetch when tab is first opened)

---

## Tab 1: Overview

### KPI Cards (Row 1, 5 cards)
| Metric | Source |
|--------|--------|
| Total Revenue | Sum of revenue invoices |
| Net Income | Revenue − total direct costs |
| Avg Net Margin % | Avg margin across jobsites |
| Total Tonnes | Sum of material shipments (tonnes) |
| Avg T/H | Fleet-wide tonnes ÷ crew hours |

Each card shows current value + `↑/↓ X% vs last year` comparison.

### Callout Panels (Row 2, side-by-side)
- **Top Performers** (left): Top 5 jobsites by Net Margin % — shows name, margin %, T/H
- **Needs Attention** (right): Bottom 5 jobsites by Net Margin % — same columns

### All Jobs Table (Row 3, fills remaining height)
Columns: Jobsite | Revenue | Net Income | Margin % | Tonnes | T/H

- Default sort: Margin % descending
- All columns sortable
- Margin % color-coded: green ≥ 15%, yellow 0–15%, red < 0%
- Row click → navigates to `/jobsite-year-report/[id]`

---

## Tab 2: Financial

### Summary Row (4 stat cards)
Total Revenue · Total Direct Costs · Net Income · Avg Margin %

### Full Jobsite Cost Table (fills remaining height)
Columns: Jobsite | Revenue | Labor | Equipment | Material | Trucking | Exp. Invoices | Total Cost | Net Income | Margin % | T/H

- Default sort: Margin % descending
- All columns sortable
- Margin % color-coded (same scheme as Overview)
- Row click → navigates to `/jobsite-year-report/[id]`

---

## Tab 3: Productivity

### Summary Row (4 stat cards)
Avg T/H · Total Tonnes · Total Crew Hours · Jobsite Count

### View Toggle
`By Jobsite` / `By Crew` — switches the table below

### Material Filter
Same pattern as existing ProductivityBenchmarks — multi-select material filter chips

### Rankings Table (fills remaining height)

**By Jobsite columns:** Jobsite | Tonnes | Crew Hours | T/H | vs Average | Jobs Count
**By Crew columns:** Crew | Type | Tonnes | Hours | T/H | Days | vs Average

- Default sort: T/H descending
- `vs Average` color-coded badge (green > +10%, red < -10%)
- No scatter chart in v1 — keep it clean

---

## Data Flow

```
Date Range Picker (startDate, endDate)
    ↓
Three lazy GraphQL queries (one per tab)
    ↓
New PostgreSQL resolvers (filter fact tables by date range)
    ↓
React components (cards, callout panels, tables)
```

---

## Files to Create / Modify

### Server (new)
- `server/src/graphql/types/dashboard.ts` — All new input/output types
- `server/src/graphql/resolvers/dashboard/index.ts` — Three resolvers

### Client (new)
- `client/src/pages/dashboard.tsx` — Page with date range state + tabs
- `client/src/components/pages/dashboard/Overview.tsx`
- `client/src/components/pages/dashboard/Financial.tsx`
- `client/src/components/pages/dashboard/Productivity.tsx`
- `client/src/graphql/dashboard.graphql` — Three query documents

### Client (modified)
- `client/src/components/common/Navigation.tsx` (or equivalent) — Add Dashboard nav link
- Run `npm run codegen` after server types are defined

---

## Out of Scope (v1)
- Invoice payment status / outstanding receivables
- Late invoice alerts
- Mobile layout
- Export to PDF/CSV
- Job status indicators (active/complete)
- Scatter chart in Productivity tab
