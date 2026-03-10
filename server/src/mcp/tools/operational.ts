// @ts-nocheck — see mcp-server.ts for explanation
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sql } from "kysely";
import { db } from "../../db";
import mongoose from "mongoose";
import { DailyReport, ReportNote } from "@models";
import { getTonnesConversion } from "../shared";

export function register(server: McpServer): void {
  // ── get_material_breakdown ───────────────────────────────────────────────────
  server.registerTool(
    "get_material_breakdown",
    {
      description:
        "Get cost breakdown by material type and supplier for a given year.",
      inputSchema: {
        year: z.number().int().describe("Calendar year, e.g. 2025"),
        jobsiteMongoId: z
          .string()
          .optional()
          .describe("Filter to a specific jobsite (optional)"),
      },
    },
    async ({ year, jobsiteMongoId }) => {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

      let pgJobsiteId: string | null = null;
      if (jobsiteMongoId) {
        const j = await db
          .selectFrom("dim_jobsite")
          .select("id")
          .where("mongo_id", "=", jobsiteMongoId)
          .executeTakeFirst();
        if (!j)
          return {
            content: [
              {
                type: "text" as const,
                text: `Jobsite not found: ${jobsiteMongoId}`,
              },
            ],
          };
        pgJobsiteId = j.id;
      }

      let query = db
        .selectFrom("fact_material_shipment as ms")
        .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
        .innerJoin(
          "dim_jobsite_material as jm",
          "jm.id",
          "ms.jobsite_material_id"
        )
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

      const rows = await query
        .groupBy(["m.name", "c.name"])
        .orderBy("total_cost", "desc")
        .execute();

      const totalCost = rows.reduce((s, r) => s + Number(r.total_cost ?? 0), 0);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
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
                  percentOfTotal:
                    totalCost > 0
                      ? Math.round(
                          (Number(r.total_cost ?? 0) / totalCost) * 1000
                        ) / 10
                      : 0,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── get_vehicle_utilization ──────────────────────────────────────────────────
  server.registerTool(
    "get_vehicle_utilization",
    {
      description: "Get vehicle hours and costs for a date range.",
      inputSchema: {
        startDate: z.string().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().describe("End date in YYYY-MM-DD format"),
      },
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

      const totalHours = rows.reduce(
        (s, r) => s + Number(r.total_hours ?? 0),
        0
      );
      const totalCost = rows.reduce((s, r) => s + Number(r.total_cost ?? 0), 0);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period: { startDate: startStr, endDate: endStr },
                summary: {
                  totalHours: Math.round(totalHours * 10) / 10,
                  totalCost: Math.round(totalCost),
                },
                vehicles: rows.map((r) => ({
                  vehicleId: r.vehicle_id,
                  vehicleName: r.vehicle_name,
                  vehicleCode: r.vehicle_code,
                  totalHours: Math.round(Number(r.total_hours ?? 0) * 10) / 10,
                  totalCost: Math.round(Number(r.total_cost ?? 0)),
                  dayCount: Number(r.day_count),
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── get_daily_report_activity ─────────────────────────────────────────────
  server.registerTool(
    "get_daily_report_activity",
    {
      description:
        "Get daily report activity for a date range, optionally scoped to a single jobsite. Returns quantitative metrics and foreman notes for each report day.",
      inputSchema: {
        startDate: z.string().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().describe("End date in YYYY-MM-DD format"),
        jobsiteMongoId: z
          .string()
          .optional()
          .describe(
            "Filter to a specific jobsite (optional — omit for all jobsites)"
          ),
      },
    },
    async ({ startDate: startStr, endDate: endStr, jobsiteMongoId }) => {
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      endDate.setHours(23, 59, 59, 999);

      // ── Resolve optional jobsite filter ──────────────────────────────────────
      let pgJobsiteId: string | undefined;
      if (jobsiteMongoId) {
        const j = await db
          .selectFrom("dim_jobsite")
          .select("id")
          .where("mongo_id", "=", jobsiteMongoId)
          .executeTakeFirst();
        if (!j)
          return {
            content: [
              {
                type: "text" as const,
                text: `Jobsite not found: ${jobsiteMongoId}`,
              },
            ],
          };
        pgJobsiteId = j.id;
      }

      // ── Fetch daily reports ───────────────────────────────────────────────────
      let reportsQuery = db
        .selectFrom("dim_daily_report as dr")
        .innerJoin("dim_jobsite as j", "j.id", "dr.jobsite_id")
        .innerJoin("dim_crew as c", "c.id", "dr.crew_id")
        .select([
          "dr.id",
          "dr.mongo_id",
          "dr.report_date",
          "dr.approved",
          "j.mongo_id as jobsite_mongo_id",
          "j.name as jobsite_name",
          "j.jobcode",
          "c.name as crew_name",
          "c.type as crew_type",
        ])
        .where("dr.report_date", ">=", startDate)
        .where("dr.report_date", "<=", endDate)
        .where("dr.archived", "=", false);

      if (pgJobsiteId) {
        reportsQuery = reportsQuery.where("dr.jobsite_id", "=", pgJobsiteId);
      }

      const reports = await reportsQuery
        .orderBy("dr.report_date", "desc")
        .execute();

      if (reports.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  period: { startDate: startStr, endDate: endStr },
                  reports: [],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const approvedPgIds = reports.filter((r) => r.approved).map((r) => r.id);

      // ── Aggregate metrics per report ──────────────────────────────────────────
      const [empRows, matRows, vehRows, truckRows] =
        approvedPgIds.length > 0
          ? await Promise.all([
              db
                .selectFrom("fact_employee_work as ew")
                .select([
                  "ew.daily_report_id",
                  sql<number>`COUNT(DISTINCT ew.employee_id)`.as(
                    "employee_count"
                  ),
                  sql<number>`MAX(ew.hours)`.as("crew_hours"), // proxy for shift length — matches pattern in other MCP tools
                  sql<number>`SUM(ew.hours)`.as("man_hours"),
                  sql<number>`SUM(ew.total_cost)`.as("employee_cost"),
                ])
                .where("ew.daily_report_id", "in", approvedPgIds)
                .where("ew.archived_at", "is", null)
                .groupBy("ew.daily_report_id")
                .execute(),

              db
                .selectFrom("fact_material_shipment as ms")
                .innerJoin(
                  "dim_jobsite_material as jm",
                  "jm.id",
                  "ms.jobsite_material_id"
                )
                .innerJoin("dim_material as m", "m.id", "jm.material_id")
                .select([
                  "ms.daily_report_id",
                  sql<number>`COALESCE(SUM(${getTonnesConversion()}), 0)`.as(
                    "total_tonnes"
                  ),
                  sql<number>`COALESCE(SUM(ms.total_cost), 0)`.as(
                    "material_cost"
                  ),
                ])
                .where("ms.daily_report_id", "in", approvedPgIds)
                .where("ms.archived_at", "is", null)
                .groupBy("ms.daily_report_id")
                .execute(),

              db
                .selectFrom("fact_vehicle_work as vw")
                .select([
                  "vw.daily_report_id",
                  sql<number>`COALESCE(SUM(vw.hours), 0)`.as("vehicle_hours"),
                  sql<number>`COALESCE(SUM(vw.total_cost), 0)`.as(
                    "vehicle_cost"
                  ),
                ])
                .where("vw.daily_report_id", "in", approvedPgIds)
                .where("vw.archived_at", "is", null)
                .groupBy("vw.daily_report_id")
                .execute(),

              db
                .selectFrom("fact_trucking as t")
                .select([
                  "t.daily_report_id",
                  sql<number>`COALESCE(SUM(t.total_cost), 0)`.as(
                    "trucking_cost"
                  ),
                ])
                .where("t.daily_report_id", "in", approvedPgIds)
                .where("t.archived_at", "is", null)
                .groupBy("t.daily_report_id")
                .execute(),
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
          jobsite: {
            id: r.jobsite_mongo_id,
            name: r.jobsite_name,
            jobcode: r.jobcode,
          },
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
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period: { startDate: startStr, endDate: endStr },
                reportCount: result.length,
                reports: result,
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
