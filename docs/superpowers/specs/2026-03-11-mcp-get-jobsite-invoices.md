# MCP Tool: get_jobsite_invoices

**Date:** 2026-03-11
**File:** `server/src/mcp/tools/financial.ts`

## Goal

Give the chat AI access to invoice data for a specific jobsite so it can answer questions like "who were our most expensive subcontractors on this job?" or "what did we bill the client over Q3?"

## Tool Definition

**Name:** `get_jobsite_invoices`

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `jobsiteMongoId` | string | Yes | MongoDB `_id` of the jobsite |
| `startDate` | string (ISO date) | No | Filter invoices on or after this date |
| `endDate` | string (ISO date) | No | Filter invoices on or before this date |
| `direction` | `"expense"` \| `"revenue"` \| `"all"` | No | Default: `"all"` |

**Output:** Array of invoice records sorted by `date` descending, each containing:

| Field | Source |
|---|---|
| `company_name` | `dim_company.name` |
| `company_id` | `dim_company.mongo_id` |
| `amount` | `fact_invoice.amount` |
| `date` | `fact_invoice.invoice_date` |
| `invoice_number` | `fact_invoice.invoice_number` |
| `description` | `fact_invoice.description` |
| `direction` | `fact_invoice.direction` (`"expense"` or `"revenue"`) |
| `invoice_type` | `fact_invoice.invoice_type` (`"external"`, `"internal"`, or `"accrual"`) |

The `invoice_type` field allows the model to distinguish true subcontractor/vendor bills (`external`) from inter-division charges (`internal`) and accounting entries (`accrual`) when forming its analysis.

## Implementation

Single addition to `server/src/mcp/tools/financial.ts` using the existing Kysely `db` instance.

**Query:** `fact_invoice` inner-joined with `dim_jobsite` (filter by `mongo_id`) and `dim_company` (return company name). Optional `WHERE` clauses on `invoice_date` and `direction`. Order by `invoice_date DESC`.

No aggregation in SQL — raw rows returned so the model can reason freely.

## Placement

Added to the existing `register(server)` function in `financial.ts`. No new files needed.
