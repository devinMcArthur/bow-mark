# MCP Daily Report Activity + Employee Productivity Tools — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two new tools to the MCP analytics server — `get_daily_report_activity` (quantitative metrics + foreman notes from MongoDB) and `get_employee_productivity` (per-employee hours, cost, job title, and approximate T/H).

**Architecture:** `mcp-server.ts` gains a Mongoose connection on startup alongside its existing Kysely/PostgreSQL connection. `get_daily_report_activity` queries Postgres for metrics then batch-fetches note text from MongoDB by `mongo_id`. `get_employee_productivity` is pure Postgres — joins `fact_employee_work` with `dim_employee` and approximates T/H via daily report tonnage.

**Tech Stack:** `@modelcontextprotocol/sdk`, Kysely (PostgreSQL), Mongoose (MongoDB), `@models` path alias (Typegoose models), TypeScript 4.6.3

---

### Task 1: Add Mongoose connection to mcp-server.ts

**Files:**
- Modify: `server/src/mcp-server.ts` (top of file, before tool registration)

The existing server connects to MongoDB via `mongoose.connect()` with these options:
```ts
await mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});
```

`reflect-metadata` is already imported at the top of `mcp-server.ts` — required for Typegoose.

**Step 1: Add the mongoose import and connect call**

After the dotenv block (around line 10) and before the express/MCP imports, add:

```ts
import mongoose from "mongoose";
```

Then at the bottom of the file, replace the `app.listen(...)` call with an async startup function:

```ts
const PORT = process.env.MCP_PORT || 8081;

const start = async () => {
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      });
      console.log("MCP: MongoDB connected");
    } catch (err) {
      console.error("MCP: MongoDB connection failed — notes unavailable", err);
    }
  }

  app.listen(PORT, () => {
    console.log(`MCP Analytics server running on port ${PORT}`);
  });
};

start();
```

**Step 2: Verify**

Check the MCP pod logs after nodemon restarts:
```bash
kubectl logs $(kubectl get pods -o name | grep mcp-analytics) --tail=20
```
Expected: `MCP: MongoDB connected` followed by `MCP Analytics server running on port 8081`

**Step 3: Commit**

```bash
git add server/src/mcp-server.ts
git commit -m "feat: add mongoose connection to MCP analytics server"
```

---

### Task 2: Add `get_daily_report_activity` tool — Postgres side

**Files:**
- Modify: `server/src/mcp-server.ts` — add tool registration before `return server`

This tool takes `startDate`, `endDate`, and optional `jobsiteMongoId`.

**Step 1: Add the tool with Postgres query**

Add this before `return server;` in `createMcpServer()`:

```ts
// @ts-ignore — Zod 3.22.4/MCP SDK type mismatch
server.tool(
  "get_daily_report_activity",
  "Get daily report activity for a date range, optionally scoped to a single jobsite. Returns quantitative metrics and foreman notes for each report day.",
  {
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().describe("End date in YYYY-MM-DD format"),
    jobsiteMongoId: z.string().optional().describe("Filter to a specific jobsite (optional — omit for all jobsites)"),
  },
  async ({ startDate: startStr, endDate: endStr, jobsiteMongoId }) => {
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    endDate.setHours(23, 59, 59, 999);

    // ── Resolve optional jobsite filter ──────────────────────────────────────
    let pgJobsiteId: string | undefined;
    if (jobsiteMongoId) {
      const j = await db.selectFrom("dim_jobsite").select("id")
        .where("mongo_id", "=", jobsiteMongoId).executeTakeFirst();
      if (!j) return { content: [{ type: "text" as const, text: `Jobsite not found: ${jobsiteMongoId}` }] };
      pgJobsiteId = j.id;
    }

    // ── Fetch daily reports ───────────────────────────────────────────────────
    let reportsQuery = db
      .selectFrom("dim_daily_report as dr")
      .innerJoin("dim_jobsite as j", "j.id", "dr.jobsite_id")
      .innerJoin("dim_crew as c", "c.id", "dr.crew_id")
      .select([
        "dr.id", "dr.mongo_id", "dr.report_date", "dr.approved",
        "j.mongo_id as jobsite_mongo_id", "j.name as jobsite_name", "j.jobcode",
        "c.name as crew_name", "c.type as crew_type",
      ])
      .where("dr.report_date", ">=", startDate)
      .where("dr.report_date", "<=", endDate)
      .where("dr.archived", "=", false);

    if (pgJobsiteId) {
      reportsQuery = reportsQuery.where("dr.jobsite_id", "=", pgJobsiteId);
    }

    const reports = await reportsQuery.orderBy("dr.report_date", "desc").execute();

    if (reports.length === 0) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ period: { startDate: startStr, endDate: endStr }, reports: [] }, null, 2) }] };
    }

    const pgIds = reports.map((r) => r.id);

    // ── Aggregate metrics per report ──────────────────────────────────────────
    const [empRows, matRows, vehRows, truckRows] = await Promise.all([
      db.selectFrom("fact_employee_work as ew")
        .select([
          "ew.daily_report_id",
          sql<number>`COUNT(DISTINCT ew.employee_id)`.as("employee_count"),
          sql<number>`MAX(ew.hours)`.as("crew_hours"),
          sql<number>`SUM(ew.hours)`.as("man_hours"),
          sql<number>`SUM(ew.total_cost)`.as("employee_cost"),
        ])
        .where("ew.daily_report_id", "in", pgIds)
        .where("ew.archived_at", "is", null)
        .groupBy("ew.daily_report_id").execute(),

      db.selectFrom("fact_material_shipment as ms")
        .innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id")
        .innerJoin("dim_material as m", "m.id", "jm.material_id")
        .select([
          "ms.daily_report_id",
          sql<number>`COALESCE(SUM(${getTonnesConversion()}), 0)`.as("total_tonnes"),
          sql<number>`COALESCE(SUM(ms.total_cost), 0)`.as("material_cost"),
        ])
        .where("ms.daily_report_id", "in", pgIds)
        .where("ms.archived_at", "is", null)
        .groupBy("ms.daily_report_id").execute(),

      db.selectFrom("fact_vehicle_work as vw")
        .select([
          "vw.daily_report_id",
          sql<number>`COALESCE(SUM(vw.hours), 0)`.as("vehicle_hours"),
          sql<number>`COALESCE(SUM(vw.total_cost), 0)`.as("vehicle_cost"),
        ])
        .where("vw.daily_report_id", "in", pgIds)
        .where("vw.archived_at", "is", null)
        .groupBy("vw.daily_report_id").execute(),

      db.selectFrom("fact_trucking as t")
        .select([
          "t.daily_report_id",
          sql<number>`COALESCE(SUM(t.total_cost), 0)`.as("trucking_cost"),
        ])
        .where("t.daily_report_id", "in", pgIds)
        .where("t.archived_at", "is", null)
        .groupBy("t.daily_report_id").execute(),
    ]);

    const empMap = new Map(empRows.map((r) => [r.daily_report_id, r]));
    const matMap = new Map(matRows.map((r) => [r.daily_report_id, r]));
    const vehMap = new Map(vehRows.map((r) => [r.daily_report_id, r]));
    const truckMap = new Map(truckRows.map((r) => [r.daily_report_id, r]));

    // ── Fetch notes from MongoDB ──────────────────────────────────────────────
    // (populated in Task 3 — placeholder for now)
    const noteMap = new Map<string, string>();

    // ── Assemble response ─────────────────────────────────────────────────────
    const result = reports.map((r) => {
      const emp = empMap.get(r.id);
      const mat = matMap.get(r.id);
      const veh = vehMap.get(r.id);
      const truck = truckMap.get(r.id);
      return {
        date: r.report_date,
        jobsite: { id: r.jobsite_mongo_id, name: r.jobsite_name, jobcode: r.jobcode },
        crew: { name: r.crew_name, type: r.crew_type },
        approved: r.approved,
        metrics: {
          employeeCount: Number(emp?.employee_count ?? 0),
          crewHours: Math.round(Number(emp?.crew_hours ?? 0) * 10) / 10,
          manHours: Math.round(Number(emp?.man_hours ?? 0) * 10) / 10,
          employeeCost: Math.round(Number(emp?.employee_cost ?? 0)),
          totalTonnes: Math.round(Number(mat?.total_tonnes ?? 0) * 10) / 10,
          materialCost: Math.round(Number(mat?.material_cost ?? 0)),
          vehicleHours: Math.round(Number(veh?.vehicle_hours ?? 0) * 10) / 10,
          vehicleCost: Math.round(Number(veh?.vehicle_cost ?? 0)),
          truckingCost: Math.round(Number(truck?.trucking_cost ?? 0)),
        },
        note: noteMap.get(r.mongo_id) ?? "",
      };
    });

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ period: { startDate: startStr, endDate: endStr }, reportCount: result.length, reports: result }, null, 2) }],
    };
  }
);
```

**Step 2: Verify it compiles (nodemon restart)**

```bash
kubectl logs $(kubectl get pods -o name | grep mcp-analytics) --tail=15
```
Expected: no TSError, server running on port 8081.

**Step 3: Commit**

```bash
git add server/src/mcp-server.ts
git commit -m "feat: add get_daily_report_activity tool (postgres metrics, notes placeholder)"
```

---

### Task 3: Wire MongoDB notes into `get_daily_report_activity`

**Files:**
- Modify: `server/src/mcp-server.ts`

**Step 1: Import DailyReport and ReportNote models**

Add after the mongoose import (top of file):

```ts
import { DailyReport, ReportNote } from "@models";
```

**Step 2: Replace the notes placeholder with a real batch fetch**

Find the `// ── Fetch notes from MongoDB` section and replace:

```ts
    // ── Fetch notes from MongoDB ──────────────────────────────────────────────
    const noteMap = new Map<string, string>();
    if (mongoose.connection.readyState === 1) {
      try {
        const mongoIds = reports.map((r) => r.mongo_id);
        const dailyReportDocs = await DailyReport.find(
          { _id: { $in: mongoIds } },
          { _id: 1, reportNote: 1 }
        ).lean();

        const noteIds = dailyReportDocs
          .filter((d) => d.reportNote)
          .map((d) => d.reportNote);

        const noteDocs = await ReportNote.find(
          { _id: { $in: noteIds } },
          { note: 1 }
        ).lean();

        const noteById = new Map(noteDocs.map((n) => [String(n._id), n.note as string]));

        for (const doc of dailyReportDocs) {
          if (doc.reportNote) {
            const note = noteById.get(String(doc.reportNote));
            if (note) noteMap.set(String(doc._id), note);
          }
        }
      } catch (err) {
        console.error("MCP: failed to fetch report notes from MongoDB", err);
      }
    }
```

**Step 3: Verify via chat UI or MCP inspector**

Ask the chat: *"What happened on [known jobsite] last week?"*

Expected: Claude calls `search_jobsites` then `get_daily_report_activity` and returns a list of days with metrics and any note text.

**Step 4: Commit**

```bash
git add server/src/mcp-server.ts
git commit -m "feat: add MongoDB note fetching to get_daily_report_activity"
```

---

### Task 4: Add `get_employee_productivity` tool

**Files:**
- Modify: `server/src/mcp-server.ts` — add tool before `return server`

**Step 1: Add the tool**

```ts
// @ts-ignore — Zod 3.22.4/MCP SDK type mismatch
server.tool(
  "get_employee_productivity",
  "Get per-employee breakdown of hours, cost, job title, and approximate tonnes-per-hour for a date range. Optionally filter to a single jobsite.",
  {
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().describe("End date in YYYY-MM-DD format"),
    jobsiteMongoId: z.string().optional().describe("Filter to a specific jobsite (optional)"),
  },
  async ({ startDate: startStr, endDate: endStr, jobsiteMongoId }) => {
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    endDate.setHours(23, 59, 59, 999);

    let pgJobsiteId: string | undefined;
    if (jobsiteMongoId) {
      const j = await db.selectFrom("dim_jobsite").select("id")
        .where("mongo_id", "=", jobsiteMongoId).executeTakeFirst();
      if (!j) return { content: [{ type: "text" as const, text: `Jobsite not found: ${jobsiteMongoId}` }] };
      pgJobsiteId = j.id;
    }

    // ── Per-employee hours, cost, job title ───────────────────────────────────
    let empQuery = db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_employee as e", "e.id", "ew.employee_id")
      .select([
        "ew.employee_id",
        "e.name as employee_name",
        sql<string>`MAX(ew.job_title)`.as("job_title"),
        sql<number>`SUM(ew.hours)`.as("total_hours"),
        sql<number>`SUM(ew.total_cost)`.as("total_cost"),
        sql<number>`COUNT(DISTINCT ew.work_date)`.as("day_count"),
        sql<number>`COUNT(DISTINCT ew.jobsite_id)`.as("jobsite_count"),
        sql<string[]>`array_agg(DISTINCT ew.daily_report_id::text)`.as("daily_report_ids"),
      ])
      .where("ew.work_date", ">=", startDate)
      .where("ew.work_date", "<=", endDate)
      .where("ew.archived_at", "is", null);

    if (pgJobsiteId) {
      empQuery = empQuery.where("ew.jobsite_id", "=", pgJobsiteId);
    }

    const empRows = await empQuery.groupBy(["ew.employee_id", "e.name"]).execute();

    if (empRows.length === 0) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ period: { startDate: startStr, endDate: endStr }, employees: [] }, null, 2) }] };
    }

    // ── Tonnes per daily report (for T/H approximation) ───────────────────────
    const allDailyReportIds = [...new Set(empRows.flatMap((r) => r.daily_report_ids ?? []))];

    const tonnesRows = await db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id")
      .innerJoin("dim_material as m", "m.id", "jm.material_id")
      .select([
        "ms.daily_report_id",
        sql<number>`COALESCE(SUM(${getTonnesConversion()}), 0)`.as("total_tonnes"),
      ])
      .where("ms.daily_report_id", "in", allDailyReportIds)
      .where("ms.archived_at", "is", null)
      .groupBy("ms.daily_report_id")
      .execute();

    const tonnesByReport = new Map(tonnesRows.map((r) => [r.daily_report_id, Number(r.total_tonnes)]));

    // ── Assemble response ─────────────────────────────────────────────────────
    const employees = empRows.map((r) => {
      const totalHours = Number(r.total_hours ?? 0);
      const reportIds = r.daily_report_ids ?? [];
      const totalTonnes = reportIds.reduce((sum, id) => sum + (tonnesByReport.get(id) ?? 0), 0);

      return {
        name: r.employee_name,
        jobTitle: r.job_title,
        totalHours: Math.round(totalHours * 10) / 10,
        totalCost: Math.round(Number(r.total_cost ?? 0)),
        dayCount: Number(r.day_count),
        jobsiteCount: Number(r.jobsite_count),
        totalTonnes: Math.round(totalTonnes * 10) / 10,
        tonnesPerHour: totalHours > 0 && totalTonnes > 0
          ? Math.round((totalTonnes / totalHours) * 100) / 100
          : null,
      };
    });

    employees.sort((a, b) => b.totalHours - a.totalHours);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          period: { startDate: startStr, endDate: endStr },
          jobsiteMongoId: jobsiteMongoId ?? null,
          employeeCount: employees.length,
          employees,
        }, null, 2),
      }],
    };
  }
);
```

**Step 2: Verify via chat UI**

Ask: *"Who worked the most hours last month?"* or *"Show me employee productivity on [jobsite] this year."*

Expected: Claude calls `get_employee_productivity` and returns a ranked list with hours, cost, job title, and T/H.

**Step 3: Commit**

```bash
git add server/src/mcp-server.ts
git commit -m "feat: add get_employee_productivity tool"
```

---

### Task 5: Update the system prompt in the chat router

**Files:**
- Modify: `server/src/router/chat.ts` — update `SYSTEM_PROMPT` constant

The system prompt needs to tell Claude about the two new tools so it uses them correctly.

**Step 1: Add guidance for the new tools**

In `server/src/router/chat.ts`, update the `SYSTEM_PROMPT`:

```ts
const SYSTEM_PROMPT = `You are an analytics assistant for Bow-Mark, a construction and paving company.
You have access to tools that query the company's PostgreSQL reporting database and MongoDB.
Use these tools to answer questions about jobsite financial performance, productivity metrics, crew benchmarks, material costs, daily activity, and employee productivity.

Guidelines:
- Always use tools to fetch real data before answering. Do not make up numbers.
- When asked about a jobsite, use search_jobsites to find its ID first, then fetch performance data.
- For questions about "what happened" or "recent activity" on a jobsite, use get_daily_report_activity.
- For questions about specific employees, hours worked, or who was on site, use get_employee_productivity.
- Format currency values as dollars with commas (e.g. $1,234,567).
- Format percentages to one decimal place.
- Format tonnes/hour to two decimal places.
- If asked about "this year" or "current year", use the current calendar year (${new Date().getFullYear()}).
- If asked about multiple jobsites, compare them clearly in a table or list format.
- When report notes are present in daily activity, summarize qualitative themes alongside the numbers.
- Be concise and direct. Lead with the key numbers, then provide context.`;
```

**Step 2: Verify**

Ask: *"What's been happening on [jobsite] this month? Any issues noted?"*

Expected: Claude fetches activity, cites metrics, and summarizes note content.

**Step 3: Commit**

```bash
git add server/src/router/chat.ts
git commit -m "feat: update chat system prompt for daily activity and employee tools"
```
