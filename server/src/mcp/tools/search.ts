// @ts-nocheck — see mcp-server.ts for explanation
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sql } from "kysely";
import { db } from "../../db";
import { getTonnesConversion } from "../shared";

export function register(server: McpServer): void {
  server.registerTool(
    "search_jobsites",
    {
      description:
        "Search for jobsites by name or jobcode. Returns matching jobsites with their IDs.",
      inputSchema: {
        query: z
          .string()
          .describe("Name or jobcode to search for (partial match supported)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .default(10)
          .describe("Max results to return"),
      },
    },
    async ({ query, limit }) => {
      const rows = await db
        .selectFrom("dim_jobsite as j")
        .select(["j.id", "j.mongo_id", "j.name", "j.jobcode"])
        .where("j.archived_at", "is", null)
        .where((eb) =>
          eb.or([
            eb("j.name", "ilike", `%${query}%`),
            eb("j.jobcode", "ilike", `%${query}%`),
          ])
        )
        .orderBy("j.name", "asc")
        .limit(limit ?? 10)
        .execute();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              rows.map((r) => ({
                id: r.mongo_id,
                name: r.name,
                jobcode: r.jobcode,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── list_jobsites ────────────────────────────────────────────────────────────
  server.registerTool(
    "list_jobsites",
    {
      description:
        "List all jobsites with summary metrics (revenue, cost, net income, tonnes) for a given year.",
      inputSchema: {
        year: z.number().int().describe("Calendar year, e.g. 2025"),
      },
    },
    async ({ year }) => {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

      const [
        jobsites,
        revenueRows,
        employeeRows,
        vehicleRows,
        materialRows,
        truckingRows,
        expenseRows,
        tonnesRows,
      ] = await Promise.all([
        db
          .selectFrom("dim_jobsite as j")
          .select(["j.id", "j.mongo_id", "j.name", "j.jobcode"])
          .where("j.archived_at", "is", null)
          .execute(),
        db
          .selectFrom("fact_invoice as i")
          .select(["i.jobsite_id", sql<number>`SUM(i.amount)`.as("total")])
          .where("i.invoice_date", ">=", startDate)
          .where("i.invoice_date", "<=", endDate)
          .where("i.direction", "=", "revenue")
          .groupBy("i.jobsite_id")
          .execute(),
        db
          .selectFrom("fact_employee_work as ew")
          .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
          .select([
            "ew.jobsite_id",
            sql<number>`SUM(ew.total_cost)`.as("total"),
          ])
          .where("ew.work_date", ">=", startDate)
          .where("ew.work_date", "<=", endDate)
          .where("ew.archived_at", "is", null)
          .where("dr.approved", "=", true)
          .where("dr.archived", "=", false)
          .groupBy("ew.jobsite_id")
          .execute(),
        db
          .selectFrom("fact_vehicle_work as vw")
          .innerJoin("dim_daily_report as dr", "dr.id", "vw.daily_report_id")
          .select([
            "vw.jobsite_id",
            sql<number>`SUM(vw.total_cost)`.as("total"),
          ])
          .where("vw.work_date", ">=", startDate)
          .where("vw.work_date", "<=", endDate)
          .where("vw.archived_at", "is", null)
          .where("dr.approved", "=", true)
          .where("dr.archived", "=", false)
          .groupBy("vw.jobsite_id")
          .execute(),
        db
          .selectFrom("fact_material_shipment as ms")
          .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
          .select([
            "ms.jobsite_id",
            sql<number>`SUM(ms.total_cost)`.as("total"),
          ])
          .where("ms.work_date", ">=", startDate)
          .where("ms.work_date", "<=", endDate)
          .where("ms.archived_at", "is", null)
          .where("dr.approved", "=", true)
          .where("dr.archived", "=", false)
          .groupBy("ms.jobsite_id")
          .execute(),
        db
          .selectFrom("fact_trucking as t")
          .innerJoin("dim_daily_report as dr", "dr.id", "t.daily_report_id")
          .select(["t.jobsite_id", sql<number>`SUM(t.total_cost)`.as("total")])
          .where("t.work_date", ">=", startDate)
          .where("t.work_date", "<=", endDate)
          .where("t.archived_at", "is", null)
          .where("dr.approved", "=", true)
          .where("dr.archived", "=", false)
          .groupBy("t.jobsite_id")
          .execute(),
        db
          .selectFrom("fact_invoice as i")
          .select(["i.jobsite_id", sql<number>`SUM(i.amount)`.as("total")])
          .where("i.invoice_date", ">=", startDate)
          .where("i.invoice_date", "<=", endDate)
          .where("i.direction", "=", "expense")
          .groupBy("i.jobsite_id")
          .execute(),
        db
          .selectFrom("fact_material_shipment as ms")
          .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
          .innerJoin(
            "dim_jobsite_material as jm",
            "jm.id",
            "ms.jobsite_material_id"
          )
          .innerJoin("dim_material as m", "m.id", "jm.material_id")
          .select([
            "ms.jobsite_id",
            sql<number>`SUM(${getTonnesConversion()})`.as("total_tonnes"),
          ])
          .where("ms.work_date", ">=", startDate)
          .where("ms.work_date", "<=", endDate)
          .where("ms.archived_at", "is", null)
          .where("dr.approved", "=", true)
          .where("dr.archived", "=", false)
          .groupBy("ms.jobsite_id")
          .execute(),
      ]);

      const revenueMap = new Map(
        revenueRows.map((r) => [r.jobsite_id, Number(r.total)])
      );
      const employeeMap = new Map(
        employeeRows.map((r) => [r.jobsite_id, Number(r.total)])
      );
      const vehicleMap = new Map(
        vehicleRows.map((r) => [r.jobsite_id, Number(r.total)])
      );
      const materialMap = new Map(
        materialRows.map((r) => [r.jobsite_id, Number(r.total)])
      );
      const truckingMap = new Map(
        truckingRows.map((r) => [r.jobsite_id, Number(r.total)])
      );
      const expenseMap = new Map(
        expenseRows.map((r) => [r.jobsite_id, Number(r.total)])
      );
      const tonnesMap = new Map(
        tonnesRows.map((r) => [r.jobsite_id, Number(r.total_tonnes ?? 0)])
      );
      const jobsiteMap = new Map(jobsites.map((j) => [j.id, j]));

      const activeIds = new Set([
        ...revenueMap.keys(),
        ...employeeMap.keys(),
        ...vehicleMap.keys(),
        ...materialMap.keys(),
        ...truckingMap.keys(),
        ...expenseMap.keys(),
        ...tonnesMap.keys(),
      ]);

      const items = [];
      for (const pgId of activeIds) {
        const j = jobsiteMap.get(pgId);
        if (!j) continue;
        const revenue = revenueMap.get(pgId) ?? 0;
        const directCost =
          (employeeMap.get(pgId) ?? 0) +
          (vehicleMap.get(pgId) ?? 0) +
          (materialMap.get(pgId) ?? 0) +
          (truckingMap.get(pgId) ?? 0) +
          (expenseMap.get(pgId) ?? 0);
        const netIncome = revenue - directCost;
        items.push({
          id: j.mongo_id,
          name: j.name,
          jobcode: j.jobcode,
          revenue: Math.round(revenue),
          directCost: Math.round(directCost),
          netIncome: Math.round(netIncome),
          netMarginPercent:
            revenue > 0 ? Math.round((netIncome / revenue) * 1000) / 10 : null,
          totalTonnes: Math.round(tonnesMap.get(pgId) ?? 0),
        });
      }

      items.sort((a, b) => b.revenue - a.revenue);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ year, jobsites: items }, null, 2),
          },
        ],
      };
    }
  );
}
