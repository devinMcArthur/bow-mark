// @ts-nocheck — see mcp-server.ts for explanation
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sql } from "kysely";
import { db } from "../../db";
import { getTonnesConversion } from "../shared";

export function register(server: McpServer): void {
  // ── get_crew_benchmarks ──────────────────────────────────────────────────────
  server.registerTool(
    "get_crew_benchmarks",
    {
      description:
        "Get tonnes-per-hour and tonnes-per-man-hour rankings by crew for a date range.",
      inputSchema: {
        startDate: z.string().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().describe("End date in YYYY-MM-DD format"),
      },
    },
    async ({ startDate: startStr, endDate: endStr }) => {
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      endDate.setHours(23, 59, 59, 999);

      const [crewRows, tonnesRows, crewHoursRows, manHoursRows] =
        await Promise.all([
          db
            .selectFrom("dim_crew as c")
            .select(["c.id", "c.name", "c.type"])
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
              "ms.crew_id",
              sql<number>`COALESCE(SUM(${getTonnesConversion()}), 0)`.as(
                "total_tonnes"
              ),
              sql<number>`COUNT(DISTINCT ms.work_date)`.as("day_count"),
              sql<number>`COUNT(DISTINCT ms.jobsite_id)`.as("jobsite_count"),
            ])
            .where("ms.work_date", ">=", startDate)
            .where("ms.work_date", "<=", endDate)
            .where("ms.archived_at", "is", null)
            .where("dr.approved", "=", true)
            .where("dr.archived", "=", false)
            .groupBy("ms.crew_id")
            .execute(),
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
                  "ew.crew_id",
                  "ew.daily_report_id",
                  sql<number>`MAX(ew.hours)`.as("h"),
                ])
                .where("ew.work_date", ">=", startDate)
                .where("ew.work_date", "<=", endDate)
                .where("ew.archived_at", "is", null)
                .where("dr.approved", "=", true)
                .where("dr.archived", "=", false)
                .groupBy(["ew.crew_id", "ew.daily_report_id"])
                .as("cd")
            )
            .select(["cd.crew_id", sql<number>`SUM(cd.h)`.as("total_hours")])
            .groupBy("cd.crew_id")
            .execute(),
          db
            .selectFrom("fact_employee_work as ew")
            .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
            .select([
              "ew.crew_id",
              sql<number>`SUM(ew.hours)`.as("total_man_hours"),
            ])
            .where("ew.work_date", ">=", startDate)
            .where("ew.work_date", "<=", endDate)
            .where("ew.archived_at", "is", null)
            .where("dr.approved", "=", true)
            .where("dr.archived", "=", false)
            .groupBy("ew.crew_id")
            .execute(),
        ]);

      const crewMap = new Map(crewRows.map((c) => [c.id, c]));
      const crewHoursMap = new Map(
        crewHoursRows.map((r) => [r.crew_id, Number(r.total_hours ?? 0)])
      );
      const manHoursMap = new Map(
        manHoursRows.map((r) => [r.crew_id, Number(r.total_man_hours ?? 0)])
      );

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
            tonnesPerHour:
              crewHrs > 0 ? Math.round((tonnes / crewHrs) * 100) / 100 : null,
            totalManHours: Math.round(manHrs * 10) / 10,
            tonnesPerManHour:
              manHrs > 0 ? Math.round((tonnes / manHrs) * 100) / 100 : null,
            dayCount: Number(r.day_count),
            jobsiteCount: Number(r.jobsite_count),
          };
        })
        .filter((i): i is NonNullable<typeof i> => i !== null)
        .sort((a, b) => (b.tonnesPerHour ?? 0) - (a.tonnesPerHour ?? 0));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period: { startDate: startStr, endDate: endStr },
                crews: items,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── get_equipment_utilization ─────────────────────────────────────────────
  server.registerTool(
    "get_equipment_utilization",
    {
      description:
        "Get equipment/vehicle utilization percentages for a jobsite and date range. " +
        "Utilization = vehicle operational hours / avg crew shift hours per day. " +
        "Returns overall utilization summary and per-vehicle breakdown.",
      inputSchema: {
        jobsiteMongoId: z
          .string()
          .describe("MongoDB ObjectId of the jobsite (use search_jobsites to find it)"),
        startDate: z.string().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().describe("End date in YYYY-MM-DD format"),
        crewType: z
          .string()
          .optional()
          .describe("Filter to a specific crew type (optional — omit for all crews)"),
      },
    },
    async ({ jobsiteMongoId, startDate: startStr, endDate: endStr, crewType }) => {
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      endDate.setHours(23, 59, 59, 999);

      // Resolve jobsite mongo_id → postgres id
      const jobsite = await db
        .selectFrom("dim_jobsite as j")
        .select(["j.id", "j.name", "j.jobcode"])
        .where("j.mongo_id", "=", jobsiteMongoId)
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

      // CTE 1: avg employee hours per daily report
      // CTE 2: vehicle hours per (vehicle, daily_report) with shift hours attached
      // Final: aggregate by vehicle → total hours, total cost, days active, utilization %
      const rows = await db
        .with("daily_shifts", (db) =>
          db
            .selectFrom("fact_employee_work as ew")
            .select([
              "ew.daily_report_id",
              sql<number>`SUM(ew.hours) / NULLIF(COUNT(DISTINCT ew.employee_id), 0)`.as(
                "avg_employee_hours"
              ),
            ])
            .where("ew.archived_at", "is", null)
            .$if(!!crewType, (qb) => qb.where("ew.crew_type", "ilike", crewType!))
            .groupBy("ew.daily_report_id")
        )
        .with("vehicle_daily", (db) =>
          db
            .selectFrom("fact_vehicle_work as vw")
            .innerJoin("dim_daily_report as dr", "dr.id", "vw.daily_report_id")
            .leftJoin(
              "daily_shifts as ds",
              "ds.daily_report_id",
              "vw.daily_report_id"
            )
            .$if(!!crewType, (qb) =>
              qb.where("vw.crew_type", "ilike", crewType!)
            )
            .select([
              "vw.vehicle_id",
              "vw.daily_report_id",
              sql<number>`SUM(vw.hours)`.as("vehicle_hours"),
              sql<number>`SUM(vw.total_cost)`.as("vehicle_cost"),
              sql<number>`MAX(ds.avg_employee_hours)`.as("avg_employee_hours"),
            ])
            .where("vw.jobsite_id", "=", jobsite.id)
            .where("vw.work_date", ">=", startDate)
            .where("vw.work_date", "<=", endDate)
            .where("vw.archived_at", "is", null)
            .where("dr.approved", "=", true)
            .where("dr.archived", "=", false)
            .groupBy(["vw.vehicle_id", "vw.daily_report_id"])
        )
        .selectFrom("vehicle_daily as vd")
        .innerJoin("dim_vehicle as v", "v.id", "vd.vehicle_id")
        .select([
          "v.id as vehicle_id",
          "v.name as vehicle_name",
          "v.vehicle_code",
          sql<number>`SUM(vd.vehicle_hours)`.as("total_hours"),
          sql<number>`SUM(vd.vehicle_cost)`.as("total_cost"),
          sql<number>`COUNT(*)`.as("days_active"),
          sql<number>`SUM(vd.vehicle_hours) / NULLIF(SUM(vd.avg_employee_hours), 0) * 100`.as(
            "utilization_pct"
          ),
        ])
        .groupBy(["v.id", "v.name", "v.vehicle_code"])
        .orderBy("utilization_pct", "desc")
        .execute();

      const totalHours = rows.reduce((s, r) => s + Number(r.total_hours ?? 0), 0);
      const totalCost = rows.reduce((s, r) => s + Number(r.total_cost ?? 0), 0);

      // Weighted average: vehicles with more hours contribute proportionally more to the overall %
      // Computed as: sum(vehicle_hours * utilization_pct) / sum(vehicle_hours)
      const weightedUtilNum = rows.reduce(
        (s, r) => s + Number(r.total_hours ?? 0) * Number(r.utilization_pct ?? 0),
        0
      );
      const avgUtilization =
        totalHours > 0 ? weightedUtilNum / totalHours : null;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                jobsite: `${jobsite.name}${jobsite.jobcode ? ` (${jobsite.jobcode})` : ""}`,
                period: { startDate: startStr, endDate: endStr },
                crewType: crewType ?? "all",
                summary: {
                  overallAvgUtilizationPct:
                    avgUtilization != null
                      ? Math.round(avgUtilization * 10) / 10
                      : null,
                  totalVehicleHours: Math.round(totalHours * 10) / 10,
                  totalVehicleCost: Math.round(totalCost),
                },
                vehicles: rows.map((r) => ({
                  vehicleName: r.vehicle_name,
                  vehicleCode: r.vehicle_code,
                  utilizationPct:
                    r.utilization_pct != null
                      ? Math.round(Number(r.utilization_pct) * 10) / 10
                      : null,
                  totalHours: Math.round(Number(r.total_hours ?? 0) * 10) / 10,
                  totalCost: Math.round(Number(r.total_cost ?? 0)),
                  daysActive: Number(r.days_active),
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

  // ── get_employee_productivity ─────────────────────────────────────────────
  server.registerTool(
    "get_employee_productivity",
    {
      description:
        "Get per-employee breakdown of hours, cost, job title, and approximate tonnes-per-hour for a date range. Optionally filter to a single jobsite.",
      inputSchema: {
        startDate: z.string().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().describe("End date in YYYY-MM-DD format"),
        jobsiteMongoId: z
          .string()
          .optional()
          .describe("Filter to a specific jobsite (optional)"),
      },
    },
    async ({ startDate: startStr, endDate: endStr, jobsiteMongoId }) => {
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      endDate.setHours(23, 59, 59, 999);

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

      // ── Per-employee hours, cost, job title ───────────────────────────────────
      let empQuery = db
        .selectFrom("fact_employee_work as ew")
        .innerJoin("dim_employee as e", "e.id", "ew.employee_id")
        .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
        .select([
          "ew.employee_id",
          "e.name as employee_name",
          sql<string>`MAX(ew.job_title)`.as("job_title"),
          sql<number>`SUM(ew.hours)`.as("total_hours"),
          sql<number>`SUM(ew.total_cost)`.as("total_cost"),
          sql<number>`COUNT(DISTINCT ew.work_date)`.as("day_count"),
          sql<number>`COUNT(DISTINCT ew.jobsite_id)`.as("jobsite_count"),
          sql<string[]>`array_agg(DISTINCT ew.daily_report_id::text)`.as(
            "daily_report_ids"
          ),
        ])
        .where("ew.work_date", ">=", startDate)
        .where("ew.work_date", "<=", endDate)
        .where("ew.archived_at", "is", null)
        .where("dr.approved", "=", true)
        .where("dr.archived", "=", false);

      if (pgJobsiteId) {
        empQuery = empQuery.where("ew.jobsite_id", "=", pgJobsiteId);
      }

      const empRows = await empQuery
        .groupBy(["ew.employee_id", "e.name"])
        .execute();

      if (empRows.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  period: { startDate: startStr, endDate: endStr },
                  employees: [],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // ── Tonnes per daily report (for T/H approximation) ───────────────────────
      const allDailyReportIds = [
        ...new Set(
          ([] as string[]).concat(
            ...empRows.map((r: any) => r.daily_report_ids ?? [])
          )
        ),
      ] as string[];

      const tonnesRows =
        allDailyReportIds.length > 0
          ? await db
              .selectFrom("fact_material_shipment as ms")
              .innerJoin(
                "dim_jobsite_material as jm",
                "jm.id",
                "ms.jobsite_material_id"
              )
              .innerJoin("dim_material as m", "m.id", "jm.material_id")
              .innerJoin(
                "dim_daily_report as dr",
                "dr.id",
                "ms.daily_report_id"
              )
              .select([
                sql<string>`ms.daily_report_id::text`.as("daily_report_id"),
                sql<number>`COALESCE(SUM(${getTonnesConversion()}), 0)`.as(
                  "total_tonnes"
                ),
              ])
              .where("ms.daily_report_id", "in", allDailyReportIds)
              .where("ms.archived_at", "is", null)
              .where("dr.approved", "=", true)
              .where("dr.archived", "=", false)
              .groupBy("ms.daily_report_id")
              .execute()
          : [];

      const tonnesByReport = new Map(
        (
          tonnesRows as Array<{ daily_report_id: string; total_tonnes: number }>
        ).map((r) => [r.daily_report_id, Number(r.total_tonnes)])
      );

      // ── Assemble response ─────────────────────────────────────────────────────
      const employees = empRows.map((r) => {
        const totalHours = Number(r.total_hours ?? 0);
        const reportIds = r.daily_report_ids ?? [];
        const totalTonnes = reportIds.reduce(
          (sum, id) => sum + (tonnesByReport.get(id) ?? 0),
          0
        );

        return {
          name: r.employee_name,
          jobTitle: r.job_title,
          totalHours: Math.round(totalHours * 10) / 10,
          totalCost: Math.round(Number(r.total_cost ?? 0)),
          dayCount: Number(r.day_count),
          jobsiteCount: Number(r.jobsite_count),
          totalTonnes: Math.round(totalTonnes * 10) / 10,
          tonnesPerHour:
            totalHours > 0 && totalTonnes > 0
              ? Math.round((totalTonnes / totalHours) * 100) / 100
              : null,
        };
      });

      employees.sort((a, b) => b.totalHours - a.totalHours);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period: { startDate: startStr, endDate: endStr },
                jobsiteMongoId: jobsiteMongoId ?? null,
                employeeCount: employees.length,
                employees,
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
