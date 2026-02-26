/**
 * Financial Performance Resolver
 *
 * Computes per-jobsite revenue, direct costs, net income, and T/H for
 * the Financial Performance tab on the Jobsite Year Master Report.
 *
 * Revenue = sum of revenue invoices for the year.
 * Direct cost = employee + vehicle + material + trucking costs from
 *   approved daily report fact tables.
 * Net income = revenue - direct cost.
 *
 * Note: expense invoices are NOT included in direct cost to avoid
 * double-counting materials with costType='invoice'.
 */

import { Arg, Query, Resolver } from "type-graphql";
import { db } from "../../../db";
import { sql } from "kysely";
import {
  FinancialPerformanceInput,
  FinancialPerformanceReport,
  JobsiteFinancialItem,
} from "../../types/financialPerformance";
import {
  CUBIC_METERS_TO_TONNES,
  TANDEM_TONNES_PER_LOAD,
} from "@constants/UnitConversions";

/** Converts material shipment units to tonnes (same logic as ProductivityBenchmarksResolver) */
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

@Resolver()
export default class FinancialPerformanceResolver {
  @Query(() => FinancialPerformanceReport)
  async financialPerformance(
    @Arg("input") input: FinancialPerformanceInput
  ): Promise<FinancialPerformanceReport> {
    const { year } = input;
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    // Run all data fetches in parallel
    const [revenueRows, employeeRows, vehicleRows, materialRows, truckingRows, tonnesRows, crewHoursRows] =
      await Promise.all([
        this.getRevenue(startDate, endDate),
        this.getEmployeeCosts(startDate, endDate),
        this.getVehicleCosts(startDate, endDate),
        this.getMaterialCosts(startDate, endDate),
        this.getTruckingCosts(startDate, endDate),
        this.getTonnesPerDailyReport(startDate, endDate),
        this.getCrewHoursPerDailyReport(startDate, endDate),
      ]);

    // Build lookup maps keyed by PG jobsite UUID
    const revenueMap = new Map<string, number>();
    for (const r of revenueRows) {
      if (r.jobsite_id) revenueMap.set(r.jobsite_id, Number(r.total_revenue ?? 0));
    }

    const employeeMap = new Map<string, number>();
    for (const r of employeeRows) {
      if (r.jobsite_id) employeeMap.set(r.jobsite_id, Number(r.employee_cost ?? 0));
    }

    const vehicleMap = new Map<string, number>();
    for (const r of vehicleRows) {
      if (r.jobsite_id) vehicleMap.set(r.jobsite_id, Number(r.vehicle_cost ?? 0));
    }

    const materialMap = new Map<string, number>();
    for (const r of materialRows) {
      if (r.jobsite_id) materialMap.set(r.jobsite_id, Number(r.material_cost ?? 0));
    }

    const truckingMap = new Map<string, number>();
    for (const r of truckingRows) {
      if (r.jobsite_id) truckingMap.set(r.jobsite_id, Number(r.trucking_cost ?? 0));
    }

    // Aggregate tonnes per jobsite (sum over daily reports)
    interface JobsiteMeta {
      pgId: string;
      mongoId: string;
      name: string;
      jobcode: string | null;
      totalTonnes: number;
      dailyReportIds: Set<string>;
    }
    const jobsiteMetaMap = new Map<string, JobsiteMeta>();
    for (const r of tonnesRows) {
      if (!r.jobsite_id) continue;
      const existing = jobsiteMetaMap.get(r.jobsite_id) ?? {
        pgId: r.jobsite_id,
        mongoId: r.jobsite_mongo_id,
        name: r.jobsite_name,
        jobcode: r.jobcode,
        totalTonnes: 0,
        dailyReportIds: new Set<string>(),
      };
      existing.totalTonnes += Number(r.tonnes ?? 0);
      if (r.daily_report_id) existing.dailyReportIds.add(r.daily_report_id);
      jobsiteMetaMap.set(r.jobsite_id, existing);
    }

    // Crew hours lookup: daily_report_id → avg hours
    const crewHoursMap = new Map<string, number>();
    for (const r of crewHoursRows) {
      if (r.daily_report_id) crewHoursMap.set(r.daily_report_id, Number(r.crew_hours ?? 0));
    }

    // Collect all jobsite PG IDs that have ANY data
    const allJobsiteIds = new Set<string>([
      ...revenueMap.keys(),
      ...employeeMap.keys(),
      ...vehicleMap.keys(),
      ...materialMap.keys(),
      ...truckingMap.keys(),
      ...jobsiteMetaMap.keys(),
    ]);

    // Fetch name/mongo_id for jobsites not covered by the tonnes query
    const missingIds = [...allJobsiteIds].filter((id) => !jobsiteMetaMap.has(id));
    if (missingIds.length > 0) {
      const extraJobsites = await db
        .selectFrom("dim_jobsite")
        .select(["id", "mongo_id", "name", "jobcode"])
        .where("id", "in", missingIds)
        .execute();
      for (const j of extraJobsites) {
        jobsiteMetaMap.set(j.id, {
          pgId: j.id,
          mongoId: j.mongo_id,
          name: j.name,
          jobcode: j.jobcode,
          totalTonnes: 0,
          dailyReportIds: new Set(),
        });
      }
    }

    // Build per-jobsite raw items
    const rawItems: Array<{
      pgId: string;
      mongoId: string;
      name: string;
      jobcode: string | null;
      totalRevenue: number;
      employeeCost: number;
      vehicleCost: number;
      materialCost: number;
      truckingCost: number;
      totalTonnes: number;
      totalCrewHours: number;
      tonnesPerHour: number;
    }> = [];

    for (const pgId of allJobsiteIds) {
      const meta = jobsiteMetaMap.get(pgId);
      if (!meta) continue;

      const totalRevenue = revenueMap.get(pgId) ?? 0;
      const employeeCost = employeeMap.get(pgId) ?? 0;
      const vehicleCost = vehicleMap.get(pgId) ?? 0;
      const materialCost = materialMap.get(pgId) ?? 0;
      const truckingCost = truckingMap.get(pgId) ?? 0;

      let totalCrewHours = 0;
      for (const drId of meta.dailyReportIds) {
        totalCrewHours += crewHoursMap.get(drId) ?? 0;
      }

      const tonnesPerHour =
        meta.totalTonnes > 0 && totalCrewHours > 0
          ? meta.totalTonnes / totalCrewHours
          : 0;

      rawItems.push({
        pgId,
        mongoId: meta.mongoId,
        name: meta.name,
        jobcode: meta.jobcode,
        totalRevenue,
        employeeCost,
        vehicleCost,
        materialCost,
        truckingCost,
        totalTonnes: meta.totalTonnes,
        totalCrewHours,
        tonnesPerHour,
      });
    }

    // Log regression on T/H vs ln(tonnes)
    const { intercept, slope } = this.calculateRegressionCoefficients(
      rawItems.filter((j) => j.totalTonnes > 0 && j.tonnesPerHour > 0)
    );

    // Build final JobsiteFinancialItem objects
    const jobsites: JobsiteFinancialItem[] = rawItems.map((item) => {
      const totalDirectCost =
        item.employeeCost + item.vehicleCost + item.materialCost + item.truckingCost;
      const netIncome = item.totalRevenue - totalDirectCost;
      const netMarginPercent =
        item.totalRevenue > 0 ? (netIncome / item.totalRevenue) * 100 : undefined;

      const expectedTonnesPerHour =
        item.totalTonnes > 0 && slope !== 0
          ? intercept + slope * Math.log(item.totalTonnes)
          : 0;

      const residualTonnesPerHourPercent =
        expectedTonnesPerHour > 0
          ? ((item.tonnesPerHour - expectedTonnesPerHour) / expectedTonnesPerHour) * 100
          : undefined;

      return {
        jobsiteId: item.mongoId,
        jobsiteName: item.name,
        jobcode: item.jobcode ?? undefined,
        totalRevenue: item.totalRevenue,
        employeeCost: item.employeeCost,
        vehicleCost: item.vehicleCost,
        materialCost: item.materialCost,
        truckingCost: item.truckingCost,
        totalDirectCost,
        netIncome,
        netMarginPercent,
        totalTonnes: item.totalTonnes,
        totalCrewHours: item.totalCrewHours,
        tonnesPerHour: item.tonnesPerHour,
        expectedTonnesPerHour,
        residualTonnesPerHourPercent,
      };
    });

    // Sort by net income descending
    jobsites.sort((a, b) => b.netIncome - a.netIncome);

    // Report-level totals
    const totalRevenue = jobsites.reduce((s, j) => s + j.totalRevenue, 0);
    const totalDirectCost = jobsites.reduce((s, j) => s + j.totalDirectCost, 0);
    const totalNetIncome = totalRevenue - totalDirectCost;
    const averageNetMarginPercent =
      totalRevenue > 0 ? (totalNetIncome / totalRevenue) * 100 : undefined;

    const correlationResidualThMargin = this.pearsonCorrelation(
      jobsites
        .filter(
          (j) =>
            j.residualTonnesPerHourPercent != null && j.netMarginPercent != null
        )
        .map((j) => ({
          x: j.residualTonnesPerHourPercent!,
          y: j.netMarginPercent!,
        }))
    );

    return {
      year,
      totalRevenue,
      totalDirectCost,
      totalNetIncome,
      averageNetMarginPercent,
      correlationResidualThMargin: correlationResidualThMargin ?? undefined,
      jobsites,
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────

  private async getRevenue(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_invoice as fi")
      .select([
        "fi.jobsite_id",
        sql<number>`SUM(fi.amount)`.as("total_revenue"),
      ])
      .where("fi.invoice_date", ">=", startDate)
      .where("fi.invoice_date", "<=", endDate)
      .where("fi.direction", "=", "revenue")
      .groupBy("fi.jobsite_id")
      .execute();
  }

  private async getEmployeeCosts(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select([
        "ew.jobsite_id",
        sql<number>`SUM(ew.total_cost)`.as("employee_cost"),
      ])
      .where("ew.work_date", ">=", startDate)
      .where("ew.work_date", "<=", endDate)
      .where("ew.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy("ew.jobsite_id")
      .execute();
  }

  private async getVehicleCosts(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_vehicle_work as vw")
      .innerJoin("dim_daily_report as dr", "dr.id", "vw.daily_report_id")
      .select([
        "vw.jobsite_id",
        sql<number>`SUM(vw.total_cost)`.as("vehicle_cost"),
      ])
      .where("vw.work_date", ">=", startDate)
      .where("vw.work_date", "<=", endDate)
      .where("vw.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy("vw.jobsite_id")
      .execute();
  }

  private async getMaterialCosts(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .select([
        "ms.jobsite_id",
        sql<number>`SUM(ms.total_cost)`.as("material_cost"),
      ])
      .where("ms.work_date", ">=", startDate)
      .where("ms.work_date", "<=", endDate)
      .where("ms.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy("ms.jobsite_id")
      .execute();
  }

  private async getTruckingCosts(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_trucking as tr")
      .innerJoin("dim_daily_report as dr", "dr.id", "tr.daily_report_id")
      .select([
        "tr.jobsite_id",
        sql<number>`SUM(tr.total_cost)`.as("trucking_cost"),
      ])
      .where("tr.work_date", ">=", startDate)
      .where("tr.work_date", "<=", endDate)
      .where("tr.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy("tr.jobsite_id")
      .execute();
  }

  private async getTonnesPerDailyReport(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .innerJoin("dim_jobsite as j", "j.id", "ms.jobsite_id")
      .select([
        "ms.jobsite_id",
        "j.mongo_id as jobsite_mongo_id",
        "j.name as jobsite_name",
        "j.jobcode",
        "ms.daily_report_id",
        sql<number>`COALESCE(SUM(${getTonnesConversion()}), 0)`.as("tonnes"),
      ])
      .where("ms.work_date", ">=", startDate)
      .where("ms.work_date", "<=", endDate)
      .where("ms.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .where((eb) =>
        eb.or([
          eb(sql`LOWER(ms.unit)`, "=", "tonnes"),
          eb(sql`LOWER(ms.unit)`, "=", "m3"),
          eb.and([
            eb(sql`LOWER(ms.unit)`, "=", "loads"),
            eb(sql`ms.vehicle_type`, "ilike", "%tandem%"),
          ]),
        ])
      )
      .groupBy([
        "ms.jobsite_id",
        "j.mongo_id",
        "j.name",
        "j.jobcode",
        "ms.daily_report_id",
      ])
      .execute();
  }

  private async getCrewHoursPerDailyReport(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select([
        "ew.daily_report_id",
        "ew.jobsite_id",
        sql<number>`AVG(ew.hours)`.as("crew_hours"),
      ])
      .where("ew.work_date", ">=", startDate)
      .where("ew.work_date", "<=", endDate)
      .where("ew.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy(["ew.daily_report_id", "ew.jobsite_id"])
      .execute();
  }

  private calculateRegressionCoefficients(
    points: Array<{ totalTonnes: number; tonnesPerHour: number }>
  ): { intercept: number; slope: number } {
    if (points.length < 2) return { intercept: 0, slope: 0 };
    const transformed = points.map((p) => ({
      x: Math.log(p.totalTonnes),
      y: p.tonnesPerHour,
    }));
    const n = transformed.length;
    const meanX = transformed.reduce((s, p) => s + p.x, 0) / n;
    const meanY = transformed.reduce((s, p) => s + p.y, 0) / n;
    let num = 0;
    let den = 0;
    for (const p of transformed) {
      num += (p.x - meanX) * (p.y - meanY);
      den += (p.x - meanX) ** 2;
    }
    if (den === 0) return { intercept: meanY, slope: 0 };
    const slope = num / den;
    return { intercept: meanY - slope * meanX, slope };
  }

  private pearsonCorrelation(
    pairs: Array<{ x: number; y: number }>
  ): number | null {
    if (pairs.length < 3) return null;
    const n = pairs.length;
    const meanX = pairs.reduce((s, p) => s + p.x, 0) / n;
    const meanY = pairs.reduce((s, p) => s + p.y, 0) / n;
    let num = 0;
    let denX = 0;
    let denY = 0;
    for (const p of pairs) {
      const dx = p.x - meanX;
      const dy = p.y - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    const den = Math.sqrt(denX * denY);
    if (den === 0) return null;
    return num / den;
  }
}
