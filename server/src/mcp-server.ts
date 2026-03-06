import * as dotenv from "dotenv";
import path from "path";
import "reflect-metadata";

// Load env vars before importing DB
if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
  dotenv.config({ path: path.join(__dirname, "..", ".env.development") });
}

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { db } from "./db";
import { sql } from "kysely";
import mongoose from "mongoose";
import { DailyReport, ReportNote } from "@models";
import { CUBIC_METERS_TO_TONNES, TANDEM_TONNES_PER_LOAD } from "@constants/UnitConversions";

// ─── Unit conversion helper (matches businessDashboard) ───────────────────────

const getTonnesConversion = () => sql<number>`
  CASE
    WHEN LOWER(ms.unit) = 'tonnes' THEN ms.quantity
    WHEN LOWER(ms.unit) = 'loads' AND ms.vehicle_type ILIKE '%tandem%'
      THEN ms.quantity * ${TANDEM_TONNES_PER_LOAD}
    WHEN LOWER(ms.unit) = 'm3'
      THEN ms.quantity * ${CUBIC_METERS_TO_TONNES}
    ELSE NULL
  END
`;

// ─── MCP Server ───────────────────────────────────────────────────────────────

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "bow-mark-analytics",
    version: "1.0.0",
  });

  // ── search_jobsites ──────────────────────────────────────────────────────────
  // @ts-ignore — Zod 3.22.4/MCP SDK type mismatch
  server.tool(
    "search_jobsites",
    "Search for jobsites by name or jobcode. Returns matching jobsites with their IDs.",
    {
      query: z.string().describe("Name or jobcode to search for (partial match supported)"),
      limit: z.number().int().min(1).max(50).optional().default(10).describe("Max results to return"),
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
  // @ts-ignore — Zod 3.22.4/MCP SDK type mismatch
  server.tool(
    "list_jobsites",
    "List all jobsites with summary metrics (revenue, cost, net income, tonnes) for a given year.",
    {
      year: z.number().int().describe("Calendar year, e.g. 2025"),
    },
    async ({ year }) => {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

      const [jobsites, revenueRows, employeeRows, vehicleRows, materialRows, truckingRows, expenseRows, tonnesRows] =
        await Promise.all([
          db.selectFrom("dim_jobsite as j").select(["j.id", "j.mongo_id", "j.name", "j.jobcode"]).where("j.archived_at", "is", null).execute(),
          db.selectFrom("fact_invoice as i").select(["i.jobsite_id", sql<number>`SUM(i.amount)`.as("total")]).where("i.invoice_date", ">=", startDate).where("i.invoice_date", "<=", endDate).where("i.direction", "=", "revenue").groupBy("i.jobsite_id").execute(),
          db.selectFrom("fact_employee_work as ew").innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id").select(["ew.jobsite_id", sql<number>`SUM(ew.total_cost)`.as("total")]).where("ew.work_date", ">=", startDate).where("ew.work_date", "<=", endDate).where("ew.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).groupBy("ew.jobsite_id").execute(),
          db.selectFrom("fact_vehicle_work as vw").innerJoin("dim_daily_report as dr", "dr.id", "vw.daily_report_id").select(["vw.jobsite_id", sql<number>`SUM(vw.total_cost)`.as("total")]).where("vw.work_date", ">=", startDate).where("vw.work_date", "<=", endDate).where("vw.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).groupBy("vw.jobsite_id").execute(),
          db.selectFrom("fact_material_shipment as ms").innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id").select(["ms.jobsite_id", sql<number>`SUM(ms.total_cost)`.as("total")]).where("ms.work_date", ">=", startDate).where("ms.work_date", "<=", endDate).where("ms.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).groupBy("ms.jobsite_id").execute(),
          db.selectFrom("fact_trucking as t").innerJoin("dim_daily_report as dr", "dr.id", "t.daily_report_id").select(["t.jobsite_id", sql<number>`SUM(t.total_cost)`.as("total")]).where("t.work_date", ">=", startDate).where("t.work_date", "<=", endDate).where("t.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).groupBy("t.jobsite_id").execute(),
          db.selectFrom("fact_invoice as i").select(["i.jobsite_id", sql<number>`SUM(i.amount)`.as("total")]).where("i.invoice_date", ">=", startDate).where("i.invoice_date", "<=", endDate).where("i.direction", "=", "expense").groupBy("i.jobsite_id").execute(),
          db.selectFrom("fact_material_shipment as ms").innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id").innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id").innerJoin("dim_material as m", "m.id", "jm.material_id").select(["ms.jobsite_id", sql<number>`SUM(${getTonnesConversion()})`.as("total_tonnes")]).where("ms.work_date", ">=", startDate).where("ms.work_date", "<=", endDate).where("ms.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).groupBy("ms.jobsite_id").execute(),
        ]);

      const revenueMap = new Map(revenueRows.map((r) => [r.jobsite_id, Number(r.total)]));
      const employeeMap = new Map(employeeRows.map((r) => [r.jobsite_id, Number(r.total)]));
      const vehicleMap = new Map(vehicleRows.map((r) => [r.jobsite_id, Number(r.total)]));
      const materialMap = new Map(materialRows.map((r) => [r.jobsite_id, Number(r.total)]));
      const truckingMap = new Map(truckingRows.map((r) => [r.jobsite_id, Number(r.total)]));
      const expenseMap = new Map(expenseRows.map((r) => [r.jobsite_id, Number(r.total)]));
      const tonnesMap = new Map(tonnesRows.map((r) => [r.jobsite_id, Number(r.total_tonnes ?? 0)]));
      const jobsiteMap = new Map(jobsites.map((j) => [j.id, j]));

      const activeIds = new Set([
        ...revenueMap.keys(), ...employeeMap.keys(), ...vehicleMap.keys(),
        ...materialMap.keys(), ...truckingMap.keys(), ...expenseMap.keys(), ...tonnesMap.keys(),
      ]);

      const items = [];
      for (const pgId of activeIds) {
        const j = jobsiteMap.get(pgId);
        if (!j) continue;
        const revenue = revenueMap.get(pgId) ?? 0;
        const directCost =
          (employeeMap.get(pgId) ?? 0) + (vehicleMap.get(pgId) ?? 0) +
          (materialMap.get(pgId) ?? 0) + (truckingMap.get(pgId) ?? 0) +
          (expenseMap.get(pgId) ?? 0);
        const netIncome = revenue - directCost;
        items.push({
          id: j.mongo_id,
          name: j.name,
          jobcode: j.jobcode,
          revenue: Math.round(revenue),
          directCost: Math.round(directCost),
          netIncome: Math.round(netIncome),
          netMarginPercent: revenue > 0 ? Math.round((netIncome / revenue) * 1000) / 10 : null,
          totalTonnes: Math.round(tonnesMap.get(pgId) ?? 0),
        });
      }

      items.sort((a, b) => b.revenue - a.revenue);

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ year, jobsites: items }, null, 2) }],
      };
    }
  );

  // ── get_jobsite_performance ─────────────────────────────────────────────────
  // @ts-ignore — Zod 3.22.4/MCP SDK type mismatch
  server.tool(
    "get_jobsite_performance",
    "Get detailed financial and productivity performance for a specific jobsite over a date range.",
    {
      jobsiteMongoId: z.string().describe("MongoDB ID of the jobsite (from search_jobsites)"),
      startDate: z.string().describe("Start date in YYYY-MM-DD format"),
      endDate: z.string().describe("End date in YYYY-MM-DD format"),
    },
    async ({ jobsiteMongoId, startDate: startStr, endDate: endStr }) => {
      const jobsite = await db
        .selectFrom("dim_jobsite")
        .select(["id", "mongo_id", "name", "jobcode"])
        .where("mongo_id", "=", jobsiteMongoId)
        .executeTakeFirst();

      if (!jobsite) {
        return { content: [{ type: "text" as const, text: `Jobsite not found: ${jobsiteMongoId}` }] };
      }

      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      endDate.setHours(23, 59, 59, 999);

      const [revenueRow, expenseInvRow, employeeRow, vehicleRow, materialRow, truckingRow, tonnesRow, crewHoursRow] =
        await Promise.all([
          db.selectFrom("fact_invoice as i").select(sql<number>`COALESCE(SUM(i.amount), 0)`.as("total")).where("i.jobsite_id", "=", jobsite.id).where("i.invoice_date", ">=", startDate).where("i.invoice_date", "<=", endDate).where("i.direction", "=", "revenue").executeTakeFirst(),
          db.selectFrom("fact_invoice as i").select(sql<number>`COALESCE(SUM(i.amount), 0)`.as("total")).where("i.jobsite_id", "=", jobsite.id).where("i.invoice_date", ">=", startDate).where("i.invoice_date", "<=", endDate).where("i.direction", "=", "expense").executeTakeFirst(),
          db.selectFrom("fact_employee_work as ew").innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id").select(sql<number>`COALESCE(SUM(ew.total_cost), 0)`.as("total")).where("ew.jobsite_id", "=", jobsite.id).where("ew.work_date", ">=", startDate).where("ew.work_date", "<=", endDate).where("ew.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).executeTakeFirst(),
          db.selectFrom("fact_vehicle_work as vw").innerJoin("dim_daily_report as dr", "dr.id", "vw.daily_report_id").select(sql<number>`COALESCE(SUM(vw.total_cost), 0)`.as("total")).where("vw.jobsite_id", "=", jobsite.id).where("vw.work_date", ">=", startDate).where("vw.work_date", "<=", endDate).where("vw.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).executeTakeFirst(),
          db.selectFrom("fact_material_shipment as ms").innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id").select(sql<number>`COALESCE(SUM(ms.total_cost), 0)`.as("total")).where("ms.jobsite_id", "=", jobsite.id).where("ms.work_date", ">=", startDate).where("ms.work_date", "<=", endDate).where("ms.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).executeTakeFirst(),
          db.selectFrom("fact_trucking as t").innerJoin("dim_daily_report as dr", "dr.id", "t.daily_report_id").select(sql<number>`COALESCE(SUM(t.total_cost), 0)`.as("total")).where("t.jobsite_id", "=", jobsite.id).where("t.work_date", ">=", startDate).where("t.work_date", "<=", endDate).where("t.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).executeTakeFirst(),
          db.selectFrom("fact_material_shipment as ms").innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id").innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id").innerJoin("dim_material as m", "m.id", "jm.material_id").select(sql<number>`COALESCE(SUM(${getTonnesConversion()}), 0)`.as("total_tonnes")).where("ms.jobsite_id", "=", jobsite.id).where("ms.work_date", ">=", startDate).where("ms.work_date", "<=", endDate).where("ms.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).executeTakeFirst(),
          db.selectFrom(
            db.selectFrom("fact_employee_work as ew")
              .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
              .select(["ew.jobsite_id", "ew.daily_report_id", "ew.crew_id", sql<number>`MAX(ew.hours)`.as("crew_day_hours")])
              .where("ew.jobsite_id", "=", jobsite.id)
              .where("ew.work_date", ">=", startDate)
              .where("ew.work_date", "<=", endDate)
              .where("ew.archived_at", "is", null)
              .where("dr.approved", "=", true)
              .where("dr.archived", "=", false)
              .groupBy(["ew.jobsite_id", "ew.daily_report_id", "ew.crew_id"])
              .as("crew_daily")
          ).select(sql<number>`COALESCE(SUM(crew_daily.crew_day_hours), 0)`.as("total_hours")).executeTakeFirst(),
        ]);

      const revenue = Number(revenueRow?.total ?? 0);
      const expenseInv = Number(expenseInvRow?.total ?? 0);
      const employeeCost = Number(employeeRow?.total ?? 0);
      const vehicleCost = Number(vehicleRow?.total ?? 0);
      const materialCost = Number(materialRow?.total ?? 0);
      const truckingCost = Number(truckingRow?.total ?? 0);
      const directCost = employeeCost + vehicleCost + materialCost + truckingCost + expenseInv;
      const netIncome = revenue - directCost;
      const tonnes = Number(tonnesRow?.total_tonnes ?? 0);
      const crewHours = Number(crewHoursRow?.total_hours ?? 0);

      const result = {
        jobsite: { id: jobsite.mongo_id, name: jobsite.name, jobcode: jobsite.jobcode },
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
          netMarginPercent: revenue > 0 ? Math.round((netIncome / revenue) * 1000) / 10 : null,
        },
        productivity: {
          totalTonnes: Math.round(tonnes * 10) / 10,
          totalCrewHours: Math.round(crewHours * 10) / 10,
          tonnesPerHour: crewHours > 0 ? Math.round((tonnes / crewHours) * 100) / 100 : null,
        },
      };

      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── get_dashboard_overview ───────────────────────────────────────────────────
  // @ts-ignore — Zod 3.22.4/MCP SDK type mismatch
  server.tool(
    "get_dashboard_overview",
    "Get company-wide KPIs: total revenue, net income, tonnes, and T/H for a date range with year-over-year comparison.",
    {
      startDate: z.string().describe("Start date in YYYY-MM-DD format"),
      endDate: z.string().describe("End date in YYYY-MM-DD format"),
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
        db.selectFrom("fact_invoice as i").select(sql<number>`COALESCE(SUM(i.amount), 0)`.as("t")).where("i.invoice_date", ">=", s).where("i.invoice_date", "<=", e).where("i.direction", "=", "revenue").executeTakeFirst();

      const sumCost = async (s: Date, e: Date) => {
        const [emp, veh, mat, trk, exp] = await Promise.all([
          db.selectFrom("fact_employee_work as ew").innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id").select(sql<number>`COALESCE(SUM(ew.total_cost), 0)`.as("t")).where("ew.work_date", ">=", s).where("ew.work_date", "<=", e).where("ew.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).executeTakeFirst(),
          db.selectFrom("fact_vehicle_work as vw").innerJoin("dim_daily_report as dr", "dr.id", "vw.daily_report_id").select(sql<number>`COALESCE(SUM(vw.total_cost), 0)`.as("t")).where("vw.work_date", ">=", s).where("vw.work_date", "<=", e).where("vw.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).executeTakeFirst(),
          db.selectFrom("fact_material_shipment as ms").innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id").select(sql<number>`COALESCE(SUM(ms.total_cost), 0)`.as("t")).where("ms.work_date", ">=", s).where("ms.work_date", "<=", e).where("ms.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).executeTakeFirst(),
          db.selectFrom("fact_trucking as t2").innerJoin("dim_daily_report as dr", "dr.id", "t2.daily_report_id").select(sql<number>`COALESCE(SUM(t2.total_cost), 0)`.as("t")).where("t2.work_date", ">=", s).where("t2.work_date", "<=", e).where("t2.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).executeTakeFirst(),
          db.selectFrom("fact_invoice as i").select(sql<number>`COALESCE(SUM(i.amount), 0)`.as("t")).where("i.invoice_date", ">=", s).where("i.invoice_date", "<=", e).where("i.direction", "=", "expense").executeTakeFirst(),
        ]);
        return Number(emp?.t ?? 0) + Number(veh?.t ?? 0) + Number(mat?.t ?? 0) + Number(trk?.t ?? 0) + Number(exp?.t ?? 0);
      };

      const sumTonnes = async (s: Date, e: Date) =>
        db.selectFrom("fact_material_shipment as ms").innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id").innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id").innerJoin("dim_material as m", "m.id", "jm.material_id").select(sql<number>`COALESCE(SUM(${getTonnesConversion()}), 0)`.as("t")).where("ms.work_date", ">=", s).where("ms.work_date", "<=", e).where("ms.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).executeTakeFirst();

      const sumCrewHours = async (s: Date, e: Date) =>
        db.selectFrom(
          db.selectFrom("fact_employee_work as ew")
            .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
            .select(["ew.jobsite_id", "ew.daily_report_id", "ew.crew_id", sql<number>`MAX(ew.hours)`.as("h")])
            .where("ew.work_date", ">=", s).where("ew.work_date", "<=", e)
            .where("ew.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false)
            .groupBy(["ew.jobsite_id", "ew.daily_report_id", "ew.crew_id"])
            .as("cd")
        ).select(sql<number>`COALESCE(SUM(cd.h), 0)`.as("t")).executeTakeFirst();

      const [curRevRow, curCost, curTonnesRow, curHoursRow, priorRevRow, priorCost, priorTonnesRow, priorHoursRow] =
        await Promise.all([
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
        prior !== 0 ? Math.round(((cur - prior) / Math.abs(prior)) * 1000) / 10 : null;

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
                  netMarginPercent: curRev > 0 ? Math.round((curNetInc / curRev) * 1000) / 10 : null,
                  totalTonnes: Math.round(curTonnes),
                  tonnesPerHour: curTH ? Math.round(curTH * 100) / 100 : null,
                },
                priorYear: {
                  totalRevenue: Math.round(priorRev),
                  totalNetIncome: Math.round(priorNetInc),
                  totalTonnes: Math.round(priorTonnes),
                  tonnesPerHour: priorTH ? Math.round(priorTH * 100) / 100 : null,
                },
                changes: {
                  revenueChangePercent: pctChange(curRev, priorRev),
                  netIncomeChangePercent: pctChange(curNetInc, priorNetInc),
                  tonnesChangePercent: pctChange(curTonnes, priorTonnes),
                  tonnesPerHourChangePercent: curTH && priorTH ? pctChange(curTH, priorTH) : null,
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
  // @ts-ignore — Zod 3.22.4/MCP SDK type mismatch
  server.tool(
    "get_financial_performance",
    "Get revenue, costs breakdown, net income and margin for all jobsites for a given year.",
    {
      year: z.number().int().describe("Calendar year, e.g. 2025"),
    },
    async ({ year }) => {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

      const [jobsites, revenueRows, employeeRows, vehicleRows, materialRows, truckingRows, expenseRows] =
        await Promise.all([
          db.selectFrom("dim_jobsite as j").select(["j.id", "j.mongo_id", "j.name", "j.jobcode"]).where("j.archived_at", "is", null).execute(),
          db.selectFrom("fact_invoice as i").select(["i.jobsite_id", sql<number>`SUM(i.amount)`.as("total")]).where("i.invoice_date", ">=", startDate).where("i.invoice_date", "<=", endDate).where("i.direction", "=", "revenue").groupBy("i.jobsite_id").execute(),
          db.selectFrom("fact_employee_work as ew").innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id").select(["ew.jobsite_id", sql<number>`SUM(ew.total_cost)`.as("total")]).where("ew.work_date", ">=", startDate).where("ew.work_date", "<=", endDate).where("ew.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).groupBy("ew.jobsite_id").execute(),
          db.selectFrom("fact_vehicle_work as vw").innerJoin("dim_daily_report as dr", "dr.id", "vw.daily_report_id").select(["vw.jobsite_id", sql<number>`SUM(vw.total_cost)`.as("total")]).where("vw.work_date", ">=", startDate).where("vw.work_date", "<=", endDate).where("vw.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).groupBy("vw.jobsite_id").execute(),
          db.selectFrom("fact_material_shipment as ms").innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id").select(["ms.jobsite_id", sql<number>`SUM(ms.total_cost)`.as("total")]).where("ms.work_date", ">=", startDate).where("ms.work_date", "<=", endDate).where("ms.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).groupBy("ms.jobsite_id").execute(),
          db.selectFrom("fact_trucking as t").innerJoin("dim_daily_report as dr", "dr.id", "t.daily_report_id").select(["t.jobsite_id", sql<number>`SUM(t.total_cost)`.as("total")]).where("t.work_date", ">=", startDate).where("t.work_date", "<=", endDate).where("t.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false).groupBy("t.jobsite_id").execute(),
          db.selectFrom("fact_invoice as i").select(["i.jobsite_id", sql<number>`SUM(i.amount)`.as("total")]).where("i.invoice_date", ">=", startDate).where("i.invoice_date", "<=", endDate).where("i.direction", "=", "expense").groupBy("i.jobsite_id").execute(),
        ]);

      const rev = new Map(revenueRows.map((r) => [r.jobsite_id, Number(r.total ?? 0)]));
      const emp = new Map(employeeRows.map((r) => [r.jobsite_id, Number(r.total ?? 0)]));
      const veh = new Map(vehicleRows.map((r) => [r.jobsite_id, Number(r.total ?? 0)]));
      const mat = new Map(materialRows.map((r) => [r.jobsite_id, Number(r.total ?? 0)]));
      const trk = new Map(truckingRows.map((r) => [r.jobsite_id, Number(r.total ?? 0)]));
      const exp = new Map(expenseRows.map((r) => [r.jobsite_id, Number(r.total ?? 0)]));
      const jobsiteMap = new Map(jobsites.map((j) => [j.id, j]));

      const activeIds = new Set([...rev.keys(), ...emp.keys(), ...veh.keys(), ...mat.keys(), ...trk.keys(), ...exp.keys()]);
      const items = [];
      let totalRevenue = 0, totalCost = 0;

      for (const pgId of activeIds) {
        const j = jobsiteMap.get(pgId);
        if (!j) continue;
        const revenue = rev.get(pgId) ?? 0;
        const directCost = (emp.get(pgId) ?? 0) + (veh.get(pgId) ?? 0) + (mat.get(pgId) ?? 0) + (trk.get(pgId) ?? 0) + (exp.get(pgId) ?? 0);
        const netIncome = revenue - directCost;
        totalRevenue += revenue;
        totalCost += directCost;
        items.push({
          id: j.mongo_id, name: j.name, jobcode: j.jobcode,
          revenue: Math.round(revenue),
          employeeCost: Math.round(emp.get(pgId) ?? 0),
          vehicleCost: Math.round(veh.get(pgId) ?? 0),
          materialCost: Math.round(mat.get(pgId) ?? 0),
          truckingCost: Math.round(trk.get(pgId) ?? 0),
          expenseInvoiceCost: Math.round(exp.get(pgId) ?? 0),
          totalDirectCost: Math.round(directCost),
          netIncome: Math.round(netIncome),
          netMarginPercent: revenue > 0 ? Math.round((netIncome / revenue) * 1000) / 10 : null,
        });
      }
      items.sort((a, b) => b.revenue - a.revenue);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            year,
            summary: {
              totalRevenue: Math.round(totalRevenue),
              totalDirectCost: Math.round(totalCost),
              totalNetIncome: Math.round(totalRevenue - totalCost),
              netMarginPercent: totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 1000) / 10 : null,
            },
            jobsites: items,
          }, null, 2),
        }],
      };
    }
  );

  // ── get_crew_benchmarks ──────────────────────────────────────────────────────
  // @ts-ignore — Zod 3.22.4/MCP SDK type mismatch
  server.tool(
    "get_crew_benchmarks",
    "Get tonnes-per-hour and tonnes-per-man-hour rankings by crew for a date range.",
    {
      startDate: z.string().describe("Start date in YYYY-MM-DD format"),
      endDate: z.string().describe("End date in YYYY-MM-DD format"),
    },
    async ({ startDate: startStr, endDate: endStr }) => {
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      endDate.setHours(23, 59, 59, 999);

      const [crewRows, tonnesRows, crewHoursRows, manHoursRows] = await Promise.all([
        db.selectFrom("dim_crew as c").select(["c.id", "c.name", "c.type"]).execute(),
        db.selectFrom("fact_material_shipment as ms")
          .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
          .innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id")
          .innerJoin("dim_material as m", "m.id", "jm.material_id")
          .select(["ms.crew_id", sql<number>`COALESCE(SUM(${getTonnesConversion()}), 0)`.as("total_tonnes"), sql<number>`COUNT(DISTINCT ms.work_date)`.as("day_count"), sql<number>`COUNT(DISTINCT ms.jobsite_id)`.as("jobsite_count")])
          .where("ms.work_date", ">=", startDate).where("ms.work_date", "<=", endDate)
          .where("ms.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false)
          .groupBy("ms.crew_id").execute(),
        db.selectFrom(
          db.selectFrom("fact_employee_work as ew")
            .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
            .select(["ew.crew_id", "ew.daily_report_id", sql<number>`MAX(ew.hours)`.as("h")])
            .where("ew.work_date", ">=", startDate).where("ew.work_date", "<=", endDate)
            .where("ew.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false)
            .groupBy(["ew.crew_id", "ew.daily_report_id"]).as("cd")
        ).select(["cd.crew_id", sql<number>`SUM(cd.h)`.as("total_hours")]).groupBy("cd.crew_id").execute(),
        db.selectFrom("fact_employee_work as ew")
          .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
          .select(["ew.crew_id", sql<number>`SUM(ew.hours)`.as("total_man_hours")])
          .where("ew.work_date", ">=", startDate).where("ew.work_date", "<=", endDate)
          .where("ew.archived_at", "is", null).where("dr.approved", "=", true).where("dr.archived", "=", false)
          .groupBy("ew.crew_id").execute(),
      ]);

      const crewMap = new Map(crewRows.map((c) => [c.id, c]));
      const crewHoursMap = new Map(crewHoursRows.map((r) => [r.crew_id, Number(r.total_hours ?? 0)]));
      const manHoursMap = new Map(manHoursRows.map((r) => [r.crew_id, Number(r.total_man_hours ?? 0)]));

      const items = tonnesRows
        .map((r) => {
          const c = crewMap.get(r.crew_id);
          if (!c) return null;
          const tonnes = Number(r.total_tonnes);
          const crewHrs = crewHoursMap.get(r.crew_id) ?? 0;
          const manHrs = manHoursMap.get(r.crew_id) ?? 0;
          return {
            crewId: r.crew_id,
            crewName: c.name,
            crewType: c.type,
            totalTonnes: Math.round(tonnes * 10) / 10,
            totalCrewHours: Math.round(crewHrs * 10) / 10,
            tonnesPerHour: crewHrs > 0 ? Math.round((tonnes / crewHrs) * 100) / 100 : null,
            totalManHours: Math.round(manHrs * 10) / 10,
            tonnesPerManHour: manHrs > 0 ? Math.round((tonnes / manHrs) * 100) / 100 : null,
            dayCount: Number(r.day_count),
            jobsiteCount: Number(r.jobsite_count),
          };
        })
        .filter((i): i is NonNullable<typeof i> => i !== null)
        .sort((a, b) => (b.tonnesPerHour ?? 0) - (a.tonnesPerHour ?? 0));

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ period: { startDate: startStr, endDate: endStr }, crews: items }, null, 2) }],
      };
    }
  );

  // ── get_material_breakdown ───────────────────────────────────────────────────
  // @ts-ignore — Zod 3.22.4/MCP SDK type mismatch
  server.tool(
    "get_material_breakdown",
    "Get cost breakdown by material type and supplier for a given year.",
    {
      year: z.number().int().describe("Calendar year, e.g. 2025"),
      jobsiteMongoId: z.string().optional().describe("Filter to a specific jobsite (optional)"),
    },
    async ({ year, jobsiteMongoId }) => {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

      let pgJobsiteId: string | null = null;
      if (jobsiteMongoId) {
        const j = await db.selectFrom("dim_jobsite").select("id").where("mongo_id", "=", jobsiteMongoId).executeTakeFirst();
        if (!j) return { content: [{ type: "text" as const, text: `Jobsite not found: ${jobsiteMongoId}` }] };
        pgJobsiteId = j.id;
      }

      let query = db
        .selectFrom("fact_material_shipment as ms")
        .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
        .innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id")
        .innerJoin("dim_material as m", "m.id", "jm.material_id")
        .innerJoin("dim_company as c", "c.id", "jm.supplier_id")
        .select([
          "m.name as material_name",
          "c.name as supplier_name",
          sql<number>`SUM(ms.quantity)`.as("total_quantity"),
          sql<string>`MAX(ms.unit)`.as("unit"),
          sql<number>`SUM(ms.total_cost)`.as("total_cost"),
          sql<number>`COUNT(DISTINCT ms.jobsite_id)`.as("jobsite_count"),
        ])
        .where("ms.work_date", ">=", startDate)
        .where("ms.work_date", "<=", endDate)
        .where("ms.archived_at", "is", null)
        .where("dr.approved", "=", true)
        .where("dr.archived", "=", false);

      if (pgJobsiteId) {
        query = query.where("ms.jobsite_id", "=", pgJobsiteId);
      }

      const rows = await query.groupBy(["m.name", "c.name"]).orderBy("total_cost", "desc").execute();

      const totalCost = rows.reduce((s, r) => s + Number(r.total_cost ?? 0), 0);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            year,
            jobsiteMongoId: jobsiteMongoId ?? null,
            totalCost: Math.round(totalCost),
            materials: rows.map((r) => ({
              materialName: r.material_name,
              supplierName: r.supplier_name,
              totalQuantity: Math.round(Number(r.total_quantity) * 10) / 10,
              unit: r.unit,
              totalCost: Math.round(Number(r.total_cost ?? 0)),
              jobsiteCount: Number(r.jobsite_count),
              percentOfTotal: totalCost > 0 ? Math.round((Number(r.total_cost ?? 0) / totalCost) * 1000) / 10 : 0,
            })),
          }, null, 2),
        }],
      };
    }
  );

  // ── get_vehicle_utilization ──────────────────────────────────────────────────
  // @ts-ignore — Zod 3.22.4/MCP SDK type mismatch
  server.tool(
    "get_vehicle_utilization",
    "Get vehicle hours and costs for a date range.",
    {
      startDate: z.string().describe("Start date in YYYY-MM-DD format"),
      endDate: z.string().describe("End date in YYYY-MM-DD format"),
    },
    async ({ startDate: startStr, endDate: endStr }) => {
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      endDate.setHours(23, 59, 59, 999);

      const rows = await db
        .selectFrom("fact_vehicle_work as vw")
        .innerJoin("dim_vehicle as v", "v.id", "vw.vehicle_id")
        .innerJoin("dim_daily_report as dr", "dr.id", "vw.daily_report_id")
        .select([
          "v.id as vehicle_id",
          "v.name as vehicle_name",
          "v.vehicle_code",
          sql<number>`SUM(vw.hours)`.as("total_hours"),
          sql<number>`SUM(vw.total_cost)`.as("total_cost"),
          sql<number>`COUNT(DISTINCT vw.work_date)`.as("day_count"),
        ])
        .where("vw.work_date", ">=", startDate)
        .where("vw.work_date", "<=", endDate)
        .where("vw.archived_at", "is", null)
        .where("dr.approved", "=", true)
        .where("dr.archived", "=", false)
        .groupBy(["v.id", "v.name", "v.vehicle_code"])
        .orderBy("total_hours", "desc")
        .execute();

      const totalHours = rows.reduce((s, r) => s + Number(r.total_hours ?? 0), 0);
      const totalCost = rows.reduce((s, r) => s + Number(r.total_cost ?? 0), 0);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            period: { startDate: startStr, endDate: endStr },
            summary: { totalHours: Math.round(totalHours * 10) / 10, totalCost: Math.round(totalCost) },
            vehicles: rows.map((r) => ({
              vehicleId: r.vehicle_id,
              vehicleName: r.vehicle_name,
              vehicleCode: r.vehicle_code,
              totalHours: Math.round(Number(r.total_hours ?? 0) * 10) / 10,
              totalCost: Math.round(Number(r.total_cost ?? 0)),
              dayCount: Number(r.day_count),
            })),
          }, null, 2),
        }],
      };
    }
  );

  // ── get_daily_report_activity ─────────────────────────────────────────────
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
      const approvedPgIds = reports.filter((r) => r.approved).map((r) => r.id);

      // ── Aggregate metrics per report ──────────────────────────────────────────
      const [empRows, matRows, vehRows, truckRows] = approvedPgIds.length > 0
        ? await Promise.all([
          db.selectFrom("fact_employee_work as ew")
            .select([
              "ew.daily_report_id",
              sql<number>`COUNT(DISTINCT ew.employee_id)`.as("employee_count"),
              sql<number>`MAX(ew.hours)`.as("crew_hours"),
              sql<number>`SUM(ew.hours)`.as("man_hours"),
              sql<number>`SUM(ew.total_cost)`.as("employee_cost"),
            ])
            .where("ew.daily_report_id", "in", approvedPgIds)
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
            .where("ms.daily_report_id", "in", approvedPgIds)
            .where("ms.archived_at", "is", null)
            .groupBy("ms.daily_report_id").execute(),

          db.selectFrom("fact_vehicle_work as vw")
            .select([
              "vw.daily_report_id",
              sql<number>`COALESCE(SUM(vw.hours), 0)`.as("vehicle_hours"),
              sql<number>`COALESCE(SUM(vw.total_cost), 0)`.as("vehicle_cost"),
            ])
            .where("vw.daily_report_id", "in", approvedPgIds)
            .where("vw.archived_at", "is", null)
            .groupBy("vw.daily_report_id").execute(),

          db.selectFrom("fact_trucking as t")
            .select([
              "t.daily_report_id",
              sql<number>`COALESCE(SUM(t.total_cost), 0)`.as("trucking_cost"),
            ])
            .where("t.daily_report_id", "in", approvedPgIds)
            .where("t.archived_at", "is", null)
            .groupBy("t.daily_report_id").execute(),
        ])
        : [[], [], [], []];

      const empMap = new Map(empRows.map((r) => [r.daily_report_id, r]));
      const matMap = new Map(matRows.map((r) => [r.daily_report_id, r]));
      const vehMap = new Map(vehRows.map((r) => [r.daily_report_id, r]));
      const truckMap = new Map(truckRows.map((r) => [r.daily_report_id, r]));

      // ── Fetch notes from MongoDB ──────────────────────────────────────────────
      const noteMap = new Map<string, string>();
      if (mongoose.connection.readyState === 1) {
        try {
          const mongoIds = reports.map((r) => r.mongo_id);
          const dailyReportDocs = await DailyReport.find(
            { _id: { $in: mongoIds } },
            { _id: 1, reportNote: 1 }
          ).lean();

          const noteIds = (dailyReportDocs as any[])
            .filter((d) => d.reportNote)
            .map((d) => d.reportNote);

          const noteDocs =
            noteIds.length > 0
              ? await ReportNote.find(
                  { _id: { $in: noteIds } },
                  { note: 1 }
                ).lean()
              : [];

          const noteById = new Map(
            (noteDocs as any[]).map((n) => [String(n._id), n.note as string])
          );

          for (const doc of dailyReportDocs as any[]) {
            if (doc.reportNote) {
              const note = noteById.get(String(doc.reportNote));
              if (note) noteMap.set(String(doc._id), note);
            }
          }
        } catch (err) {
          console.error("MCP: failed to fetch report notes from MongoDB", err);
        }
      }

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

  return server;
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

const transports: Map<string, StreamableHTTPServerTransport> = new Map();

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // New session
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    onsessioninitialized: (sid) => {
      transports.set(sid, transport);
    },
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      transports.delete(transport.sessionId);
    }
  };

  const server = createMcpServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.close();
    transports.delete(sessionId);
  }
  res.status(204).send();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "bow-mark-mcp-analytics" });
});

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
