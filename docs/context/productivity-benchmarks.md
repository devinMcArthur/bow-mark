# Productivity Benchmarks Feature

**Date**: February 2026
**Branch**: `report-refactor`

## Overview

Comparative productivity analysis across jobsites for a given year. Shows how each jobsite's tonnes-per-hour (T/H) compares to both the flat average and a size-adjusted expectation using logarithmic regression.

## Problem Solved

1. **Missing material costs**: Invoice-type materials (costType=`invoice`) had zero rate in PostgreSQL sync. Fixed by replicating MongoDB's invoice rate calculation (`totalInvoiceCost / totalQuantity` per month) in the consumer sync handler.

2. **Concrete (m³) excluded from productivity**: SQL only handled `tonnes` and `loads` units. Added `m3` with ×2.4 conversion factor.

3. **Flat average misleading**: Comparing all jobsites to a single average T/H is misleading because larger jobs naturally have higher T/H due to economies of scale. Solved with logarithmic regression.

## Architecture

### Backend

**Resolver**: `server/src/graphql/resolvers/productivityBenchmarks/index.ts`
- Queries PostgreSQL star schema (fact_material_shipment, fact_employee_work, dim_* tables)
- Supports material grouping by: material only, crew type, or job title
- Material filtering via `selectedMaterials` input
- Calculates **dynamic logarithmic regression** from current dataset:
  - `T/H = intercept + slope × ln(totalTonnes)`
  - Coefficients recalculated per query so they stay accurate with any filters applied
  - No hardcoded constants
- Crew hours = `AVG(employee.hours)` per daily report (represents shift length, not total person-hours)

**Types**: `server/src/graphql/types/productivityBenchmarks.ts`
- `ProductivityBenchmarkReport` - top-level response with summary stats + regression coefficients
- `JobsiteBenchmark` - per-jobsite data with actual T/H, expected T/H, % deviations
- `RegressionCoefficients` - intercept + slope returned to frontend for chart rendering
- `BenchmarkMaterial` - available material filters with grouping keys

**Unit Conversions**: `server/src/constants/UnitConversions.ts`
- `CUBIC_METERS_TO_TONNES = 2.4`
- `TANDEM_TONNES_PER_LOAD = 14`
- `CUBIC_YARDS_TO_TONNES = 1.83`

SQL CASE expression in resolver converts all units to tonnes:
```sql
CASE
  WHEN LOWER(ms.unit) = 'tonnes' THEN ms.quantity
  WHEN LOWER(ms.unit) = 'loads' AND ms.vehicle_type ILIKE '%tandem%'
    THEN ms.quantity * 14
  WHEN LOWER(ms.unit) = 'm3'
    THEN ms.quantity * 2.4
  ELSE NULL
END
```

### Frontend

**Component**: `client/src/components/pages/jobsite-year-master-report/ProductivityBenchmarks.tsx`

**Features**:
1. **Material grouping control** - Select: Material Only / Material + Crew Type / Material + Job Title
2. **Material filter** - Checkbox list with search, select all/clear
3. **Summary stats** - Average T/H, total tonnes, total crew hours, jobsite count
4. **Scatter plot** (Recharts ScatterChart):
   - X-axis: Total tonnes (log scale)
   - Y-axis: T/H
   - Green dots = above expected, red dots = below expected
   - Blue regression line rendered as Scatter with `line` prop and `shape={() => null}`
   - Gray dashed reference line for flat average
   - Custom tooltip showing jobsite name, tonnes, T/H, expected, % deviation
5. **Sortable table** - 8 sortable columns, default: vs Expected descending
6. **Jobsite search & highlight**:
   - Search input in scatter card header
   - Dropdown shows matching jobsites with preview stats
   - Selected jobsite: larger blue dot in scatter, blue row in table with auto-scroll
   - Click table rows to select/deselect
   - Jobsite name links still navigate (stopPropagation)

**GraphQL Query**: `client/src/graphql/queries/ProductivityBenchmarks.graphql`
- Fetches full benchmark data including regression coefficients

### Invoice Rate Fix

**File**: `server/src/consumer/handlers/dimensions.ts`
- Added `getInvoiceMonthRate()` function
- For `costType === 'invoice'`: finds invoices for the material's supplier in the month, sums costs, divides by total shipped quantity
- Updated `getMaterialShipmentRate()` to handle all three cost types: `rate`, `deliveredRate`, `invoice`

**File**: `server/src/consumer/handlers/materialShipmentSync.ts`
- Updated to pass full `jobsiteMaterial` document to rate function
- Uses `getMaterialShipmentRate()` instead of `getJobsiteMaterialRateForDate()`

## Dynamic Regression - How It Works

1. Fetch all jobsite data (tonnes, crew hours) - already needed for the table
2. Filter to valid points (positive tonnes and T/H)
3. Transform x values: `x = ln(totalTonnes)`
4. Calculate means: `x̄ = mean(x)`, `ȳ = mean(T/H)`
5. Calculate slope: `b = Σ((x - x̄)(y - ȳ)) / Σ((x - x̄)²)`
6. Calculate intercept: `a = ȳ - b × x̄`
7. Per jobsite: `expectedT/H = a + b × ln(tonnes)`
8. Deviation: `% = ((actual - expected) / expected) × 100`

Performance: O(n) arithmetic on already-fetched data, negligible overhead.

## Key Design Decisions

- **Dynamic regression over hardcoded**: Coefficients were initially hardcoded (intercept=1.04, slope=0.99) from historical analysis. Changed to dynamic because: adding concrete data shifted the population, filtering changes the dataset, year-over-year improvements wouldn't be reflected.
- **ScatterChart over ComposedChart**: ComposedChart had coordinate mapping bugs with log scale when using separate data arrays for Line and Scatter. ScatterChart handles this correctly.
- **Client-side jobsite search**: Only 50-200 jobsites per year, already loaded in component. No need for Meilisearch round-trip.
- **Rules of Hooks compliance**: `sortedJobsites` useMemo must be before early returns to avoid hook ordering violations that cause re-render loops.

## Statistical Context

- Correlation between job size and T/H: r = 0.195 (weak positive)
- R² = 0.038 (3.8% of variance explained by job size)
- Most variation comes from other factors (crew skill, job complexity, weather, etc.)
- The regression is still useful for size-adjusted benchmarking even with weak correlation
- See `PRODUCTIVITY_ANALYSIS.md` in project root for detailed analysis
