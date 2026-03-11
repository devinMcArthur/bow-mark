// @ts-nocheck — TypeScript 5.x OOMs on deeply chained Zod+Kysely types
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sql } from "kysely";
import { db } from "../../db";
import { getTonnesConversion } from "../shared";

export function register(server: McpServer): void {
  // ── get_jobsite_performance ─────────────────────────────────────────────────
  server.registerTool(
    "get_jobsite_performance",
    {
      description:
        "Get detailed financial and productivity performance for a specific jobsite over a date range.",
      inputSchema: {
        jobsiteMongoId: z
          .string()
          .describe("MongoDB ID of the jobsite (from search_jobsites)"),
        startDate: z.string().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().describe("End date in YYYY-MM-DD format"),
      },
    },
    async ({ jobsiteMongoId, startDate: startStr, endDate: endStr }) => {
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

      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      endDate.setHours(23, 59, 59, 999);

      const [
        revenueRow,
        expenseInvRow,
        employeeRow,
        vehicleRow,
        materialRow,
        truckingRow,
        tonnesRow,
        crewHoursRow,
      ] = await Promise.all([
        db
          .selectFrom("fact_invoice as i")
          .select(sql<number>`COALESCE(SUM(i.amount), 0)`.as("total"))
          .where("i.jobsite_id", "=", jobsite.id)
          .where("i.invoice_date", ">=", startDate)
          .where("i.invoice_date", "<=", endDate)
          .where("i.direction", "=", "revenue")
          .executeTakeFirst(),
        db
          .selectFrom("fact_invoice as i")
          .select(sql<number>`COALESCE(SUM(i.amount), 0)`.as("total"))
          .where("i.jobsite_id", "=", jobsite.id)
          .where("i.invoice_date", ">=", startDate)
          .where("i.invoice_date", "<=", endDate)
          .where("i.direction", "=", "expense")
          .executeTakeFirst(),
        db
          .selectFrom("fact_employee_work as ew")
          .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
          .select(sql<number>`COALESCE(SUM(ew.total_cost), 0)`.as("total"))
          .where("ew.jobsite_id", "=", jobsite.id)
          .where("ew.work_date", ">=", startDate)
          .where("ew.work_date", "<=", endDate)
          .where("ew.archived_at", "is", null)
          .where("dr.approved", "=", true)
          .where("dr.archived", "=", false)
          .executeTakeFirst(),
        db
          .selectFrom("fact_vehicle_work as vw")
          .innerJoin("dim_daily_report as dr", "dr.id", "vw.daily_report_id")
          .select(sql<number>`COALESCE(SUM(vw.total_cost), 0)`.as("total"))
          .where("vw.jobsite_id", "=", jobsite.id)
          .where("vw.work_date", ">=", startDate)
          .where("vw.work_date", "<=", endDate)
          .where("vw.archived_at", "is", null)
          .where("dr.approved", "=", true)
          .where("dr.archived", "=", false)
          .executeTakeFirst(),
        db
          .selectFrom("fact_material_shipment as ms")
          .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
          .select(sql<number>`COALESCE(SUM(ms.total_cost), 0)`.as("total"))
          .where("ms.jobsite_id", "=", jobsite.id)
          .where("ms.work_date", ">=", startDate)
          .where("ms.work_date", "<=", endDate)
          .where("ms.archived_at", "is", null)
          .where("dr.approved", "=", true)
          .where("dr.archived", "=", false)
          .executeTakeFirst(),
        db
          .selectFrom("fact_trucking as t")
          .innerJoin("dim_daily_report as dr", "dr.id", "t.daily_report_id")
          .select(sql<number>`COALESCE(SUM(t.total_cost), 0)`.as("total"))
          .where("t.jobsite_id", "=", jobsite.id)
          .where("t.work_date", ">=", startDate)
          .where("t.work_date", "<=", endDate)
          .where("t.archived_at", "is", null)
          .where("dr.approved", "=", true)
          .where("dr.archived", "=", false)
          .executeTakeFirst(),
        db
          .selectFrom("fact_material_shipment as ms")
          .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
          .innerJoin(
            "dim_jobsite_material as jm",
            "jm.id",
            "ms.jobsite_material_id"
          )
          .innerJoin("dim_material as m", "m.id", "jm.material_id")
          .select(
            sql<number>`COALESCE(SUM(${getTonnesConversion()}), 0)`.as(
              "total_tonnes"
            )
          )
          .where("ms.jobsite_id", "=", jobsite.id)
          .where("ms.work_date", ">=", startDate)
          .where("ms.work_date", "<=", endDate)
          .where("ms.archived_at", "is", null)
          .where("dr.approved", "=", true)
          .where("dr.archived", "=", false)
          .executeTakeFirst(),
        db
          .selectFrom(
            db
              .selectFrom("fact_employee_work as ew")
              .innerJoin(
                "dim_daily_report as dr",
                "dr.id",
                "ew.daily_report_id"
              )
              .select([
                "ew.jobsite_id",
                "ew.daily_report_id",
                "ew.crew_id",
                sql<number>`MAX(ew.hours)`.as("crew_day_hours"),
              ])
              .where("ew.jobsite_id", "=", jobsite.id)
              .where("ew.work_date", ">=", startDate)
              .where("ew.work_date", "<=", endDate)
              .where("ew.archived_at", "is", null)
              .where("dr.approved", "=", true)
              .where("dr.archived", "=", false)
              .groupBy(["ew.jobsite_id", "ew.daily_report_id", "ew.crew_id"])
              .as("crew_daily")
          )
          .select(
            sql<number>`COALESCE(SUM(crew_daily.crew_day_hours), 0)`.as(
              "total_hours"
            )
          )
          .executeTakeFirst(),
      ]);

      const revenue = Number(revenueRow?.total ?? 0);
      const expenseInv = Number(expenseInvRow?.total ?? 0);
      const employeeCost = Number(employeeRow?.total ?? 0);
      const vehicleCost = Number(vehicleRow?.total ?? 0);
      const materialCost = Number(materialRow?.total ?? 0);
      const truckingCost = Number(truckingRow?.total ?? 0);
      const directCost =
        employeeCost + vehicleCost + materialCost + truckingCost + expenseInv;
      const netIncome = revenue - directCost;
      const tonnes = Number(tonnesRow?.total_tonnes ?? 0);
      const crewHours = Number(crewHoursRow?.total_hours ?? 0);

      const result = {
        jobsite: {
          id: jobsite.mongo_id,
          name: jobsite.name,
          jobcode: jobsite.jobcode,
        },
        period: { startDate: startStr, endDate: endStr },
        financial: {
          revenue: Math.round(revenue),
          employeeCost: Math.round(employeeCost),
          vehicleCost: Math.round(vehicleCost),
          materialCost: Math.round(materialCost),
          truckingCost: Math.round(truckingCost),
          expenseInvoiceCost: Math.round(expenseInv),
          totalDirectCost: Math.round(directCost),
          netIncome: Math.round(netIncome),
          netMarginPercent:
            revenue > 0 ? Math.round((netIncome / revenue) * 1000) / 10 : null,
        },
        productivity: {
          totalTonnes: Math.round(tonnes * 10) / 10,
          totalCrewHours: Math.round(crewHours * 10) / 10,
          tonnesPerHour:
            crewHours > 0 ? Math.round((tonnes / crewHours) * 100) / 100 : null,
        },
      };

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );

  // ── get_dashboard_overview ───────────────────────────────────────────────────
  server.registerTool(
    "get_dashboard_overview",
    {
      description:
        "Get company-wide KPIs: total revenue, net income, tonnes, and T/H for a date range with year-over-year comparison.",
      inputSchema: {
        startDate: z.string().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().describe("End date in YYYY-MM-DD format"),
      },
    },
    async ({ startDate: startStr, endDate: endStr }) => {
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      endDate.setHours(23, 59, 59, 999);

      const priorStart = new Date(startDate);
      priorStart.setFullYear(priorStart.getFullYear() - 1);
      const priorEnd = new Date(endDate);
      priorEnd.setFullYear(priorEnd.getFullYear() - 1);

      const sumRevenue = async (s: Date, e: Date) =>
        db
          .selectFrom("fact_invoice as i")
          .select(sql<number>`COALESCE(SUM(i.amount), 0)`.as("t"))
          .where("i.invoice_date", ">=", s)
          .where("i.invoice_date", "<=", e)
          .where("i.direction", "=", "revenue")
          .executeTakeFirst();

      const sumCost = async (s: Date, e: Date) => {
        const [emp, veh, mat, trk, exp] = await Promise.all([
          db
            .selectFrom("fact_employee_work as ew")
            .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
            .select(sql<number>`COALESCE(SUM(ew.total_cost), 0)`.as("t"))
            .where("ew.work_date", ">=", s)
            .where("ew.work_date", "<=", e)
            .where("ew.archived_at", "is", null)
            .where("dr.approved", "=", true)
            .where("dr.archived", "=", false)
            .executeTakeFirst(),
          db
            .selectFrom("fact_vehicle_work as vw")
            .innerJoin("dim_daily_report as dr", "dr.id", "vw.daily_report_id")
            .select(sql<number>`COALESCE(SUM(vw.total_cost), 0)`.as("t"))
            .where("vw.work_date", ">=", s)
            .where("vw.work_date", "<=", e)
            .where("vw.archived_at", "is", null)
            .where("dr.approved", "=", true)
            .where("dr.archived", "=", false)
            .executeTakeFirst(),
          db
            .selectFrom("fact_material_shipment as ms")
            .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
            .select(sql<number>`COALESCE(SUM(ms.total_cost), 0)`.as("t"))
            .where("ms.work_date", ">=", s)
            .where("ms.work_date", "<=", e)
            .where("ms.archived_at", "is", null)
            .where("dr.approved", "=", true)
            .where("dr.archived", "=", false)
            .executeTakeFirst(),
          db
            .selectFrom("fact_trucking as t2")
            .innerJoin("dim_daily_report as dr", "dr.id", "t2.daily_report_id")
            .select(sql<number>`COALESCE(SUM(t2.total_cost), 0)`.as("t"))
            .where("t2.work_date", ">=", s)
            .where("t2.work_date", "<=", e)
            .where("t2.archived_at", "is", null)
            .where("dr.approved", "=", true)
            .where("dr.archived", "=", false)
            .executeTakeFirst(),
          db
            .selectFrom("fact_invoice as i")
            .select(sql<number>`COALESCE(SUM(i.amount), 0)`.as("t"))
            .where("i.invoice_date", ">=", s)
            .where("i.invoice_date", "<=", e)
            .where("i.direction", "=", "expense")
            .executeTakeFirst(),
        ]);
        return (
          Number(emp?.t ?? 0) +
          Number(veh?.t ?? 0) +
          Number(mat?.t ?? 0) +
          Number(trk?.t ?? 0) +
          Number(exp?.t ?? 0)
        );
      };

      const sumTonnes = async (s: Date, e: Date) =>
        db
          .selectFrom("fact_material_shipment as ms")
          .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
          .innerJoin(
            "dim_jobsite_material as jm",
            "jm.id",
            "ms.jobsite_material_id"
          )
          .innerJoin("dim_material as m", "m.id", "jm.material_id")
          .select(
            sql<number>`COALESCE(SUM(${getTonnesConversion()}), 0)`.as("t")
          )
          .where("ms.work_date", ">=", s)
          .where("ms.work_date", "<=", e)
          .where("ms.archived_at", "is", null)
          .where("dr.approved", "=", true)
          .where("dr.archived", "=", false)
          .executeTakeFirst();

      const sumCrewHours = async (s: Date, e: Date) =>
        db
          .selectFrom(
            db
              .selectFrom("fact_employee_work as ew")
              .innerJoin(
                "dim_daily_report as dr",
                "dr.id",
                "ew.daily_report_id"
              )
              .select([
                "ew.jobsite_id",
                "ew.daily_report_id",
                "ew.crew_id",
                sql<number>`MAX(ew.hours)`.as("h"),
              ])
              .where("ew.work_date", ">=", s)
              .where("ew.work_date", "<=", e)
              .where("ew.archived_at", "is", null)
              .where("dr.approved", "=", true)
              .where("dr.archived", "=", false)
              .groupBy(["ew.jobsite_id", "ew.daily_report_id", "ew.crew_id"])
              .as("cd")
          )
          .select(sql<number>`COALESCE(SUM(cd.h), 0)`.as("t"))
          .executeTakeFirst();

      const [
        curRevRow,
        curCost,
        curTonnesRow,
        curHoursRow,
        priorRevRow,
        priorCost,
        priorTonnesRow,
        priorHoursRow,
      ] = await Promise.all([
        sumRevenue(startDate, endDate),
        sumCost(startDate, endDate),
        sumTonnes(startDate, endDate),
        sumCrewHours(startDate, endDate),
        sumRevenue(priorStart, priorEnd),
        sumCost(priorStart, priorEnd),
        sumTonnes(priorStart, priorEnd),
        sumCrewHours(priorStart, priorEnd),
      ]);

      const curRev = Number(curRevRow?.t ?? 0);
      const curNetInc = curRev - curCost;
      const curTonnes = Number(curTonnesRow?.t ?? 0);
      const curHours = Number(curHoursRow?.t ?? 0);
      const curTH = curHours > 0 ? curTonnes / curHours : null;

      const priorRev = Number(priorRevRow?.t ?? 0);
      const priorNetInc = priorRev - priorCost;
      const priorTonnes = Number(priorTonnesRow?.t ?? 0);
      const priorHours = Number(priorHoursRow?.t ?? 0);
      const priorTH = priorHours > 0 ? priorTonnes / priorHours : null;

      const pctChange = (cur: number, prior: number) =>
        prior !== 0
          ? Math.round(((cur - prior) / Math.abs(prior)) * 1000) / 10
          : null;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period: { startDate: startStr, endDate: endStr },
                current: {
                  totalRevenue: Math.round(curRev),
                  totalNetIncome: Math.round(curNetInc),
                  netMarginPercent:
                    curRev > 0
                      ? Math.round((curNetInc / curRev) * 1000) / 10
                      : null,
                  totalTonnes: Math.round(curTonnes),
                  tonnesPerHour: curTH ? Math.round(curTH * 100) / 100 : null,
                },
                priorYear: {
                  totalRevenue: Math.round(priorRev),
                  totalNetIncome: Math.round(priorNetInc),
                  totalTonnes: Math.round(priorTonnes),
                  tonnesPerHour: priorTH
                    ? Math.round(priorTH * 100) / 100
                    : null,
                },
                changes: {
                  revenueChangePercent: pctChange(curRev, priorRev),
                  netIncomeChangePercent: pctChange(curNetInc, priorNetInc),
                  tonnesChangePercent: pctChange(curTonnes, priorTonnes),
                  tonnesPerHourChangePercent:
                    curTH && priorTH ? pctChange(curTH, priorTH) : null,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── get_financial_performance ────────────────────────────────────────────────
  server.registerTool(
    "get_financial_performance",
    {
      description:
        "Get revenue, costs breakdown, net income and margin for all jobsites for a given year.",
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
      ]);

      const rev = new Map(
        revenueRows.map((r) => [r.jobsite_id, Number(r.total ?? 0)])
      );
      const emp = new Map(
        employeeRows.map((r) => [r.jobsite_id, Number(r.total ?? 0)])
      );
      const veh = new Map(
        vehicleRows.map((r) => [r.jobsite_id, Number(r.total ?? 0)])
      );
      const mat = new Map(
        materialRows.map((r) => [r.jobsite_id, Number(r.total ?? 0)])
      );
      const trk = new Map(
        truckingRows.map((r) => [r.jobsite_id, Number(r.total ?? 0)])
      );
      const exp = new Map(
        expenseRows.map((r) => [r.jobsite_id, Number(r.total ?? 0)])
      );
      const jobsiteMap = new Map(jobsites.map((j) => [j.id, j]));

      const activeIds = new Set([
        ...rev.keys(),
        ...emp.keys(),
        ...veh.keys(),
        ...mat.keys(),
        ...trk.keys(),
        ...exp.keys(),
      ]);
      const items = [];
      let totalRevenue = 0,
        totalCost = 0;

      for (const pgId of activeIds) {
        const j = jobsiteMap.get(pgId);
        if (!j) continue;
        const revenue = rev.get(pgId) ?? 0;
        const directCost =
          (emp.get(pgId) ?? 0) +
          (veh.get(pgId) ?? 0) +
          (mat.get(pgId) ?? 0) +
          (trk.get(pgId) ?? 0) +
          (exp.get(pgId) ?? 0);
        const netIncome = revenue - directCost;
        totalRevenue += revenue;
        totalCost += directCost;
        items.push({
          id: j.mongo_id,
          name: j.name,
          jobcode: j.jobcode,
          revenue: Math.round(revenue),
          employeeCost: Math.round(emp.get(pgId) ?? 0),
          vehicleCost: Math.round(veh.get(pgId) ?? 0),
          materialCost: Math.round(mat.get(pgId) ?? 0),
          truckingCost: Math.round(trk.get(pgId) ?? 0),
          expenseInvoiceCost: Math.round(exp.get(pgId) ?? 0),
          totalDirectCost: Math.round(directCost),
          netIncome: Math.round(netIncome),
          netMarginPercent:
            revenue > 0 ? Math.round((netIncome / revenue) * 1000) / 10 : null,
        });
      }
      items.sort((a, b) => b.revenue - a.revenue);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                year,
                summary: {
                  totalRevenue: Math.round(totalRevenue),
                  totalDirectCost: Math.round(totalCost),
                  totalNetIncome: Math.round(totalRevenue - totalCost),
                  netMarginPercent:
                    totalRevenue > 0
                      ? Math.round(
                          ((totalRevenue - totalCost) / totalRevenue) * 1000
                        ) / 10
                      : null,
                },
                jobsites: items,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

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
}
