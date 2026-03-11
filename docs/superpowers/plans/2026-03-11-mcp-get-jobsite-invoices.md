# MCP get_jobsite_invoices Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `get_jobsite_invoices` MCP tool that returns all invoices for a jobsite (with optional date and direction filters) so the chat AI can answer questions like "who were our most expensive subcontractors?"

**Architecture:** Single `server.registerTool` block added to the existing `register()` function in `financial.ts`. Queries `fact_invoice` joined with `dim_company` and filtered via `dim_jobsite.mongo_id`. Returns raw invoice rows — no aggregation — so the model can reason freely.

**Tech Stack:** Kysely (PostgreSQL query builder), Zod (input validation), `@modelcontextprotocol/sdk` MCP server, existing `db` instance from `../../db`.

**Note:** This project has no test suite. Verification is done via TypeScript build check (`npm run build`).

**Design doc:** `docs/superpowers/specs/2026-03-11-mcp-get-jobsite-invoices.md`

---

## Phase 1: Implementation

### Task 1: Add `get_jobsite_invoices` tool to financial.ts

**Files:**
- Modify: `server/src/mcp/tools/financial.ts`

- [ ] **Step 1: Read the current file**

Read `server/src/mcp/tools/financial.ts` to understand current structure before editing. The file has `// @ts-nocheck` at the top and a single `register(server: McpServer): void` function. Tools are registered via `server.registerTool(name, schema, handler)`. Add the new tool **before the closing `}` of the `register` function** (after the `get_financial_performance` block).

- [ ] **Step 2: Add the tool**

Append the following block inside the `register` function, immediately before its closing `}`:

```typescript
  // ── get_jobsite_invoices ─────────────────────────────────────────────────────
  server.registerTool(
    "get_jobsite_invoices",
    {
      description:
        "Get all invoices for a specific jobsite. Returns individual invoice records with company, amount, date, type, and direction so you can analyse subcontractor costs, revenue, or any invoice breakdown. Optionally filter by date range and/or direction (expense/revenue).",
      inputSchema: {
        jobsiteMongoId: z
          .string()
          .describe("MongoDB ID of the jobsite (from search_jobsites)"),
        startDate: z
          .string()
          .optional()
          .describe("Filter invoices on or after this date (YYYY-MM-DD)"),
        endDate: z
          .string()
          .optional()
          .describe("Filter invoices on or before this date (YYYY-MM-DD)"),
        direction: z
          .enum(["expense", "revenue", "all"])
          .optional()
          .describe(
            'Filter by direction: "expense" (vendor/subcontractor costs), "revenue" (customer billing), or "all" (default)'
          ),
      },
    },
    async ({ jobsiteMongoId, startDate: startStr, endDate: endStr, direction }) => {
      const jobsite = await db
        .selectFrom("dim_jobsite")
        .select(["id", "mongo_id", "name", "jobcode"])
        .where("mongo_id", "=", jobsiteMongoId)
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

      let query = db
        .selectFrom("fact_invoice as i")
        .innerJoin("dim_company as c", "c.id", "i.company_id")
        .select([
          "c.name as company_name",
          "c.mongo_id as company_id",
          "i.amount",
          "i.invoice_date as date",
          "i.invoice_number",
          "i.description",
          "i.direction",
          "i.invoice_type",
        ])
        .where("i.jobsite_id", "=", jobsite.id)
        .orderBy("i.invoice_date", "desc");

      if (startStr) {
        query = query.where("i.invoice_date", ">=", new Date(startStr));
      }
      if (endStr) {
        const end = new Date(endStr);
        end.setHours(23, 59, 59, 999);
        query = query.where("i.invoice_date", "<=", end);
      }
      if (direction && direction !== "all") {
        query = query.where("i.direction", "=", direction);
      }

      const rows = await query.execute();

      const invoices = rows.map((r) => ({
        company_name: r.company_name,
        company_id: r.company_id,
        amount: Math.round(Number(r.amount) * 100) / 100,
        date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : r.date,
        invoice_number: r.invoice_number,
        description: r.description ?? null,
        direction: r.direction,
        invoice_type: r.invoice_type,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                jobsite: {
                  id: jobsite.mongo_id,
                  name: jobsite.name,
                  jobcode: jobsite.jobcode,
                },
                filters: {
                  startDate: startStr ?? null,
                  endDate: endStr ?? null,
                  direction: direction ?? "all",
                },
                count: invoices.length,
                invoices,
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

- [ ] **Step 3: Verify TypeScript build**

```bash
cd /home/dev/work/bow-mark/server && npm run build 2>&1 | grep -E "^.*error" | head -20
```

Expected: no errors (the file has `// @ts-nocheck` so type errors are suppressed, but syntax errors and import issues will still surface).

- [ ] **Step 4: Commit**

```bash
cd /home/dev/work/bow-mark
git add server/src/mcp/tools/financial.ts
git commit -m "feat(mcp): add get_jobsite_invoices tool for invoice analysis"
```
