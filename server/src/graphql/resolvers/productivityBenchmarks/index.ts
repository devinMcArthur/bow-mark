/**
 * PostgreSQL-backed Productivity Benchmarks Resolver
 *
 * Compares T/H rates across all jobsites for a given year.
 * Supports material grouping by crew type or job title.
 */

import { Arg, Query, Resolver } from "type-graphql";
import { db } from "../../../db";
import { sql } from "kysely";
import {
  ProductivityBenchmarkInput,
  ProductivityBenchmarkReport,
  JobsiteBenchmark,
  BenchmarkMaterial,
  RegressionCoefficients,
} from "../../types/productivityBenchmarks";
import { MaterialGrouping } from "../../types/productivityAnalytics";
import {
  CUBIC_METERS_TO_TONNES,
  TANDEM_TONNES_PER_LOAD,
} from "@constants/UnitConversions";

/**
 * SQL CASE expression for converting various units to tonnes
 * Conversion constants defined in @constants/UnitConversions
 */
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
export default class ProductivityBenchmarksResolver {
  /**
   * Get productivity benchmarks across all jobsites for a year
   */
  @Query(() => ProductivityBenchmarkReport)
  async productivityBenchmarks(
    @Arg("input") input: ProductivityBenchmarkInput
  ): Promise<ProductivityBenchmarkReport> {
    const {
      year,
      materialGrouping = MaterialGrouping.CREW_TYPE,
      selectedMaterials,
    } = input;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    // Get available materials grouped by the selected dimension
    const availableMaterials = await this.getAvailableMaterials(
      startDate,
      endDate,
      materialGrouping
    );

    // Parse selected materials into filter criteria
    const filterCriteria = this.parseSelectedMaterials(
      selectedMaterials,
      materialGrouping
    );

    // Get shipments data with optional filtering
    const shipmentsPerReport = await this.getShipmentsPerReport(
      startDate,
      endDate,
      materialGrouping,
      filterCriteria
    );

    // Get crew hours per daily report
    const crewHoursPerReport = await this.getCrewHoursPerReport(
      startDate,
      endDate
    );

    // Build crew hours lookup map
    const crewHoursMap = new Map<string, number>();
    for (const row of crewHoursPerReport) {
      if (row.daily_report_id) {
        crewHoursMap.set(row.daily_report_id, Number(row.crew_hours || 0));
      }
    }

    // Aggregate by jobsite
    const jobsiteStats = this.aggregateByJobsite(shipmentsPerReport, crewHoursMap);

    // Calculate overall totals and build results
    const { jobsites, overallTonnes, overallCrewHours, regression } =
      this.buildJobsiteBenchmarks(jobsiteStats);

    const averageTonnesPerHour =
      overallCrewHours > 0 ? overallTonnes / overallCrewHours : 0;

    return {
      year,
      averageTonnesPerHour,
      totalTonnes: overallTonnes,
      totalCrewHours: overallCrewHours,
      jobsiteCount: jobsites.length,
      availableMaterials,
      jobsites,
      regression,
    };
  }

  /**
   * Get available materials grouped by the selected dimension
   */
  private async getAvailableMaterials(
    startDate: Date,
    endDate: Date,
    grouping: MaterialGrouping
  ): Promise<BenchmarkMaterial[]> {
    // For JOB_TITLE grouping, we need dominant job title per daily report
    let dominantJobTitleMap = new Map<string, string>();
    if (grouping === MaterialGrouping.JOB_TITLE) {
      dominantJobTitleMap = await this.getDominantJobTitles(startDate, endDate);
    }

    // Base query for materials
    const materialsResult = await db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .innerJoin(
        "dim_jobsite_material as jm",
        "jm.id",
        "ms.jobsite_material_id"
      )
      .innerJoin("dim_material as m", "m.id", "jm.material_id")
      .select([
        "m.name as material_name",
        "ms.crew_type",
        "ms.daily_report_id",
        sql<number>`COALESCE(SUM(${getTonnesConversion()}), 0)`.as("total_tonnes"),
        sql<number>`COUNT(*)`.as("shipment_count"),
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
      .groupBy(["m.name", "ms.crew_type", "ms.daily_report_id"])
      .execute();

    // Aggregate by grouping dimension
    const materialStats = new Map<
      string,
      {
        materialName: string;
        crewType?: string;
        jobTitle?: string;
        totalTonnes: number;
        shipmentCount: number;
      }
    >();

    for (const row of materialsResult) {
      let key: string;
      let crewType: string | undefined;
      let jobTitle: string | undefined;

      switch (grouping) {
        case MaterialGrouping.CREW_TYPE:
          crewType = row.crew_type || "Unknown";
          key = `${row.material_name}|${crewType}`;
          break;
        case MaterialGrouping.JOB_TITLE:
          jobTitle =
            dominantJobTitleMap.get(row.daily_report_id || "") || "Unknown";
          key = `${row.material_name}|${jobTitle}`;
          break;
        case MaterialGrouping.MATERIAL_ONLY:
        default:
          key = row.material_name;
          break;
      }

      const existing = materialStats.get(key) || {
        materialName: row.material_name,
        crewType,
        jobTitle,
        totalTonnes: 0,
        shipmentCount: 0,
      };

      existing.totalTonnes += Number(row.total_tonnes);
      existing.shipmentCount += Number(row.shipment_count);
      materialStats.set(key, existing);
    }

    // Convert to array and sort
    const result: BenchmarkMaterial[] = [];
    for (const [key, stats] of materialStats) {
      result.push({
        materialName: stats.materialName,
        crewType: stats.crewType,
        jobTitle: stats.jobTitle,
        key,
        totalTonnes: stats.totalTonnes,
        shipmentCount: stats.shipmentCount,
      });
    }

    result.sort((a, b) => {
      const nameCompare = a.materialName.localeCompare(b.materialName);
      if (nameCompare !== 0) return nameCompare;
      const aGroup = a.crewType || a.jobTitle || "";
      const bGroup = b.crewType || b.jobTitle || "";
      return aGroup.localeCompare(bGroup);
    });

    return result;
  }

  /**
   * Get dominant job title per daily report (most hours)
   */
  private async getDominantJobTitles(
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, string>> {
    const jobTitleHours = await db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select([
        "ew.daily_report_id",
        "ew.job_title",
        sql<number>`SUM(ew.hours)`.as("total_hours"),
      ])
      .where("ew.work_date", ">=", startDate)
      .where("ew.work_date", "<=", endDate)
      .where("ew.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy(["ew.daily_report_id", "ew.job_title"])
      .execute();

    const hoursMap = new Map<string, { jobTitle: string; hours: number }>();
    for (const row of jobTitleHours) {
      if (!row.daily_report_id) continue;
      const existing = hoursMap.get(row.daily_report_id);
      const hours = Number(row.total_hours || 0);
      if (!existing || hours > existing.hours) {
        hoursMap.set(row.daily_report_id, {
          jobTitle: row.job_title,
          hours,
        });
      }
    }

    const result = new Map<string, string>();
    for (const [dailyReportId, data] of hoursMap) {
      result.set(dailyReportId, data.jobTitle);
    }
    return result;
  }

  /**
   * Parse selected materials into filter criteria
   */
  private parseSelectedMaterials(
    selectedMaterials: string[] | undefined,
    grouping: MaterialGrouping
  ): Array<{ materialName: string; crewType?: string; jobTitle?: string }> | null {
    if (!selectedMaterials || selectedMaterials.length === 0) {
      return null;
    }

    return selectedMaterials.map((key) => {
      const parts = key.split("|");
      const materialName = parts[0];

      if (grouping === MaterialGrouping.CREW_TYPE && parts.length > 1) {
        return { materialName, crewType: parts[1] };
      } else if (grouping === MaterialGrouping.JOB_TITLE && parts.length > 1) {
        return { materialName, jobTitle: parts[1] };
      }
      return { materialName };
    });
  }

  /**
   * Get shipments per daily report with optional filtering
   */
  private async getShipmentsPerReport(
    startDate: Date,
    endDate: Date,
    grouping: MaterialGrouping,
    filterCriteria: Array<{ materialName: string; crewType?: string; jobTitle?: string }> | null
  ) {
    // For JOB_TITLE filtering, we need the dominant job titles
    let dominantJobTitleMap = new Map<string, string>();
    if (grouping === MaterialGrouping.JOB_TITLE && filterCriteria) {
      dominantJobTitleMap = await this.getDominantJobTitles(startDate, endDate);
    }

    let query = db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .innerJoin("dim_jobsite as j", "j.id", "ms.jobsite_id")
      .innerJoin(
        "dim_jobsite_material as jm",
        "jm.id",
        "ms.jobsite_material_id"
      )
      .innerJoin("dim_material as m", "m.id", "jm.material_id")
      .select([
        "j.id as jobsite_id",
        "j.mongo_id as jobsite_mongo_id",
        "j.name as jobsite_name",
        "j.jobcode",
        "ms.daily_report_id",
        "m.name as material_name",
        "ms.crew_type",
        sql<number>`COALESCE(SUM(${getTonnesConversion()}), 0)`.as("tonnes"),
        sql<number>`COUNT(*)`.as("shipment_count"),
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
      );

    // Apply material/crew type filter for CREW_TYPE grouping
    if (filterCriteria && grouping === MaterialGrouping.CREW_TYPE) {
      const crewTypeFilters = filterCriteria.filter((f) => f.crewType);
      if (crewTypeFilters.length > 0) {
        query = query.where((eb) =>
          eb.or(
            crewTypeFilters.map((f) =>
              eb.and([
                eb("m.name", "=", f.materialName),
                eb("ms.crew_type", "=", f.crewType!),
              ])
            )
          )
        );
      }
    } else if (filterCriteria && grouping === MaterialGrouping.MATERIAL_ONLY) {
      const materialNames = filterCriteria.map((f) => f.materialName);
      query = query.where("m.name", "in", materialNames);
    }

    const results = await query
      .groupBy([
        "j.id",
        "j.mongo_id",
        "j.name",
        "j.jobcode",
        "ms.daily_report_id",
        "m.name",
        "ms.crew_type",
      ])
      .execute();

    // For JOB_TITLE grouping, filter in memory
    if (filterCriteria && grouping === MaterialGrouping.JOB_TITLE) {
      const jobTitleFilters = new Set(
        filterCriteria.map((f) => `${f.materialName}|${f.jobTitle}`)
      );
      return results.filter((row) => {
        const jobTitle =
          dominantJobTitleMap.get(row.daily_report_id || "") || "Unknown";
        const key = `${row.material_name}|${jobTitle}`;
        return jobTitleFilters.has(key);
      });
    }

    return results;
  }

  /**
   * Get crew hours per daily report
   */
  private async getCrewHoursPerReport(startDate: Date, endDate: Date) {
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

  /**
   * Aggregate shipments by jobsite
   */
  private aggregateByJobsite(
    shipmentsPerReport: Array<{
      jobsite_id: string;
      jobsite_mongo_id: string;
      jobsite_name: string;
      jobcode: string | null;
      daily_report_id: string | null;
      tonnes: number;
      shipment_count: number;
    }>,
    crewHoursMap: Map<string, number>
  ) {
    interface JobsiteStats {
      jobsiteId: string;
      jobsiteMongoId: string;
      jobsiteName: string;
      jobcode: string | null;
      totalTonnes: number;
      totalCrewHours: number;
      shipmentCount: number;
      dailyReportIds: Set<string>;
    }

    const jobsiteStats = new Map<string, JobsiteStats>();

    for (const row of shipmentsPerReport) {
      const jobsiteId = row.jobsite_id;
      const dailyReportId = row.daily_report_id;
      const tonnes = Number(row.tonnes);
      const shipmentCount = Number(row.shipment_count);

      const existing = jobsiteStats.get(jobsiteId) || {
        jobsiteId,
        jobsiteMongoId: row.jobsite_mongo_id,
        jobsiteName: row.jobsite_name,
        jobcode: row.jobcode,
        totalTonnes: 0,
        totalCrewHours: 0,
        shipmentCount: 0,
        dailyReportIds: new Set<string>(),
      };

      existing.totalTonnes += tonnes;
      existing.shipmentCount += shipmentCount;
      if (dailyReportId) {
        existing.dailyReportIds.add(dailyReportId);
      }

      jobsiteStats.set(jobsiteId, existing);
    }

    // Calculate crew hours for each jobsite
    for (const stats of jobsiteStats.values()) {
      let totalCrewHours = 0;
      for (const dailyReportId of stats.dailyReportIds) {
        totalCrewHours += crewHoursMap.get(dailyReportId) || 0;
      }
      stats.totalCrewHours = totalCrewHours;
    }

    return jobsiteStats;
  }

  /**
   * Calculate logarithmic regression coefficients from jobsite data
   * Formula: T/H = intercept + slope * ln(totalTonnes)
   *
   * Calculates dynamically from current dataset so coefficients stay accurate
   * as data changes or filters are applied.
   */
  private calculateRegressionCoefficients(
    jobsites: Array<{ totalTonnes: number; tonnesPerHour: number }>
  ): { intercept: number; slope: number } {
    // Filter to valid data points (positive tonnes and T/H)
    const validPoints = jobsites.filter(
      (j) => j.totalTonnes > 0 && j.tonnesPerHour > 0
    );

    if (validPoints.length < 2) {
      // Not enough data for regression, return neutral coefficients
      return { intercept: 0, slope: 0 };
    }

    // Transform x to ln(tonnes)
    const points = validPoints.map((j) => ({
      x: Math.log(j.totalTonnes),
      y: j.tonnesPerHour,
    }));

    // Calculate means
    const n = points.length;
    const meanX = points.reduce((sum, p) => sum + p.x, 0) / n;
    const meanY = points.reduce((sum, p) => sum + p.y, 0) / n;

    // Calculate slope: Σ((x - x̄)(y - ȳ)) / Σ((x - x̄)²)
    let numerator = 0;
    let denominator = 0;
    for (const p of points) {
      const xDiff = p.x - meanX;
      const yDiff = p.y - meanY;
      numerator += xDiff * yDiff;
      denominator += xDiff * xDiff;
    }

    // Avoid division by zero (all x values identical)
    if (denominator === 0) {
      return { intercept: meanY, slope: 0 };
    }

    const slope = numerator / denominator;
    const intercept = meanY - slope * meanX;

    return { intercept, slope };
  }

  /**
   * Calculate expected T/H based on job size using regression coefficients
   */
  private calculateExpectedTonnesPerHour(
    totalTonnes: number,
    intercept: number,
    slope: number
  ): number {
    if (totalTonnes <= 0) return 0;
    return intercept + slope * Math.log(totalTonnes);
  }

  /**
   * Build final jobsite benchmarks with percent from average and size-adjusted metrics
   */
  private buildJobsiteBenchmarks(
    jobsiteStats: Map<
      string,
      {
        jobsiteId: string;
        jobsiteMongoId: string;
        jobsiteName: string;
        jobcode: string | null;
        totalTonnes: number;
        totalCrewHours: number;
        shipmentCount: number;
      }
    >
  ) {
    let overallTonnes = 0;
    let overallCrewHours = 0;

    const jobsitesWithData: Array<{
      jobsiteMongoId: string;
      jobsiteName: string;
      jobcode: string | null;
      totalTonnes: number;
      totalCrewHours: number;
      shipmentCount: number;
      tonnesPerHour: number;
    }> = [];

    for (const stats of jobsiteStats.values()) {
      if (stats.totalTonnes > 0 && stats.totalCrewHours > 0) {
        const tonnesPerHour = stats.totalTonnes / stats.totalCrewHours;
        jobsitesWithData.push({ ...stats, tonnesPerHour });
        overallTonnes += stats.totalTonnes;
        overallCrewHours += stats.totalCrewHours;
      }
    }

    const averageTonnesPerHour =
      overallCrewHours > 0 ? overallTonnes / overallCrewHours : 0;

    // Calculate regression coefficients from current dataset
    const { intercept, slope } =
      this.calculateRegressionCoefficients(jobsitesWithData);

    const jobsites: JobsiteBenchmark[] = jobsitesWithData
      .map((stats) => {
        const percentFromAverage =
          averageTonnesPerHour > 0
            ? ((stats.tonnesPerHour - averageTonnesPerHour) /
                averageTonnesPerHour) *
              100
            : 0;

        // Size-adjusted expected T/H using dynamically calculated regression
        const expectedTonnesPerHour = this.calculateExpectedTonnesPerHour(
          stats.totalTonnes,
          intercept,
          slope
        );

        const percentFromExpected =
          expectedTonnesPerHour > 0
            ? ((stats.tonnesPerHour - expectedTonnesPerHour) /
                expectedTonnesPerHour) *
              100
            : 0;

        return {
          jobsiteId: stats.jobsiteMongoId,
          jobsiteName: stats.jobsiteName,
          jobcode: stats.jobcode || undefined,
          totalTonnes: stats.totalTonnes,
          totalCrewHours: stats.totalCrewHours,
          tonnesPerHour: stats.tonnesPerHour,
          shipmentCount: stats.shipmentCount,
          percentFromAverage,
          expectedTonnesPerHour,
          percentFromExpected,
        };
      })
      .sort((a, b) => b.tonnesPerHour - a.tonnesPerHour);

    return { jobsites, overallTonnes, overallCrewHours, regression: { intercept, slope } };
  }
}
