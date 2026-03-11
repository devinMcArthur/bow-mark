# Jobsite Report — Invoice Analysis Enhancement

**Date:** 2026-03-11

## Goal

Improve the invoice sections on the Jobsite Report page with richer columns, a grouped-by-company default view with subtotals, and a flat sortable view — making it practical to analyse a large number of invoices at a glance.

## Scope

Affects two existing components:
- `client/src/components/Common/JobsiteReport/ExpenseInvoices.tsx`
- `client/src/components/Common/JobsiteReport/RevenueInvoices.tsx`

`InvoiceSummary.tsx` (the External/Internal/Accrual totals header) is **unchanged**.

No server-side changes required — `date` and `description` are already in the `InvoiceCardSnippet` GraphQL fragment.

## Columns

Both views show the same columns:

| Column | Source | Notes |
|---|---|---|
| Date | `invoice.date` | Formatted as locale date string |
| Company | `invoice.company.name` | Hidden in grouped view (it's the group header) |
| Invoice # | `invoice.invoiceNumber` | |
| Description | `invoice.description` | Empty cell if null |
| Type | `invoice.internal` / `invoice.accrual` | Badge: "Internal" or "Accrual"; blank for external |
| Cost | `invoiceReport.value` | Right-aligned, formatted currency |

## View Modes

A **"Grouped / Flat"** segmented control sits in the top-right corner of each section header. The two sections (Expense, Revenue) each have their own independent toggle. Default is **Grouped**.

### Grouped View (default)

- One collapsible header row per company, showing: company name · invoice count · subtotal
- All groups expanded by default
- Groups sorted by subtotal **descending** (most expensive first)
- Invoices within each group sorted by date **descending**
- Company column hidden (redundant with group header)

### Flat View

- Single table of all invoices
- Default sort: date descending
- Clicking **Date** or **Cost** column header toggles ascending/descending sort on that column
- Active sort column shows a sort direction indicator (▲ / ▼)

## Component Structure

Extract shared logic into a new file to avoid duplicating the grouped/flat rendering between `ExpenseInvoices` and `RevenueInvoices`:

```
client/src/components/Common/JobsiteReport/
  InvoiceTable.tsx        ← NEW: shared grouped+flat table component
  ExpenseInvoices.tsx     ← MODIFIED: use InvoiceTable
  RevenueInvoices.tsx     ← MODIFIED: use InvoiceTable
  InvoiceSummary.tsx      ← UNCHANGED
```

`InvoiceTable` accepts:
- `invoiceReports: InvoiceReportSnippetFragment[]` — the invoice data
- no other props needed (manages its own view-mode and sort state internally)

## Data Flow

No GraphQL changes. The existing `InvoiceCardSnippet` fragment already fetches `date` and `description`. The `InvoiceReportSnippetFragment` wraps this with `value`, `internal`, `accrual`.

All grouping, sorting, and filtering is done in-component from the already-fetched data.
