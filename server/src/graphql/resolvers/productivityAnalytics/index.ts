/**
 * PostgreSQL-backed Productivity Analytics Resolver
 *
 * Provides productivity metrics:
 * 1. Hours by Labor Type - Time spent on each job_title per jobsite
 * 2. Tonnes per Hour (T/H) - Material productivity using crew hours
 *
 * Key Calculation:
 * - Crew hours = MAX(employee hours) per daily report (not SUM)
 * - Multiple crews of same type on same day: AVERAGE their crew hours
 */

import { Arg, Query, Resolver } from "type-graphql";
import { db } from "../../../db";
import { sql } from "kysely";
import {
  JobsiteProductivityReport,
  DateRangeInput,
  LaborTypeHours,
  MaterialProductivity,
  CrewHoursDetail,
  MaterialGrouping,
} from "../../types/productivityAnalytics";

@Resolver()
export default class ProductivityAnalyticsResolver {
  /**
   * Get productivity metrics for a jobsite over a date range
   */
  @Query(() => JobsiteProductivityReport, { nullable: true })
  async jobsiteProductivity(
    @Arg("jobsiteMongoId") jobsiteMongoId: string,
    @Arg("dateRange") dateRange: DateRangeInput,
    @Arg("includeCrewHoursDetail", { nullable: true, defaultValue: false })
    includeCrewHoursDetail: boolean,
    @Arg("materialGrouping", () => MaterialGrouping, {
      nullable: true,
      defaultValue: MaterialGrouping.CREW_TYPE,
    })
    materialGrouping: MaterialGrouping
  ): Promise<JobsiteProductivityReport | null> {
    // Get the jobsite from dimension table
    const jobsite = await db
      .selectFrom("dim_jobsite")
      .select(["id", "mongo_id", "name", "jobcode"])
      .where("mongo_id", "=", jobsiteMongoId)
      .executeTakeFirst();

    if (!jobsite) {
      return null;
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    // Fetch all data in parallel
    const [
      laborTypeHours,
      materialProductivity,
      overallProductivity,
      crewHoursDetail,
    ] = await Promise.all([
      this.getLaborTypeHours(jobsite.id, startDate, endDate),
      this.getMaterialProductivity(jobsite.id, startDate, endDate, materialGrouping),
      this.getOverallProductivity(jobsite.id, startDate, endDate),
      includeCrewHoursDetail
        ? this.getCrewHoursDetail(jobsite.id, startDate, endDate)
        : Promise.resolve(undefined),
    ]);

    // Use overall productivity metrics (correctly calculated)
    const { totalTonnes, totalCrewHours, overallTonnesPerHour } =
      overallProductivity;

    return {
      jobsiteId: jobsite.mongo_id,
      jobsiteName: jobsite.name,
      jobcode: jobsite.jobcode || undefined,
      startDate,
      endDate,
      laborTypeHours,
      materialProductivity,
      overallTonnesPerHour,
      totalTonnes,
      totalCrewHours,
      crewHoursDetail,
    };
  }

  /**
   * Get hours breakdown by work type (job_title) and crew type
   *
   * job_title = work type (Subgrade Prep, Base Gravel, etc.)
   *
   * Calculation:
   * - Per day per work type: MAX(employee hours) = crew time on this work
   * - Total: Sum of daily MAX values across all days
   *
   * Example: Day 1 has 3 employees doing Subgrade Prep for 8, 10, 9 hours
   * → Crew spent 10 hours on Subgrade Prep that day (MAX)
   */
  private async getLaborTypeHours(
    jobsiteId: string,
    startDate: Date,
    endDate: Date
  ): Promise<LaborTypeHours[]> {
    // Step 1: Get MAX hours per job_title per day
    // This represents "crew time spent on this work type" for each day
    const dailyMaxHours = await db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select([
        "ew.job_title",
        "ew.crew_type",
        "ew.work_date",
        sql<number>`MAX(ew.hours)`.as("max_hours"),
        sql<number>`COUNT(DISTINCT ew.employee_id)`.as("employee_count"),
      ])
      .where("ew.jobsite_id", "=", jobsiteId)
      .where("ew.work_date", ">=", startDate)
      .where("ew.work_date", "<=", endDate)
      .where("ew.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy(["ew.job_title", "ew.crew_type", "ew.work_date"])
      .execute();

    // Step 2: Aggregate by job_title and crew_type
    // Sum the daily MAX values and count distinct employees
    const statsMap = new Map<
      string,
      {
        jobTitle: string;
        crewType: string;
        totalHours: number;
        dayCount: number;
        employees: Set<string>;
      }
    >();

    for (const row of dailyMaxHours) {
      const key = `${row.job_title}|${row.crew_type}`;
      const existing = statsMap.get(key);

      if (existing) {
        existing.totalHours += Number(row.max_hours);
        existing.dayCount += 1;
        // Note: employee_count here is per-day, we track unique across all days below
      } else {
        statsMap.set(key, {
          jobTitle: row.job_title,
          crewType: row.crew_type,
          totalHours: Number(row.max_hours),
          dayCount: 1,
          employees: new Set(),
        });
      }
    }

    // Step 3: Get distinct employee count per job_title/crew_type
    const employeeCounts = await db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select([
        "ew.job_title",
        "ew.crew_type",
        sql<number>`COUNT(DISTINCT ew.employee_id)`.as("employee_count"),
      ])
      .where("ew.jobsite_id", "=", jobsiteId)
      .where("ew.work_date", ">=", startDate)
      .where("ew.work_date", "<=", endDate)
      .where("ew.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy(["ew.job_title", "ew.crew_type"])
      .execute();

    const employeeCountMap = new Map<string, number>();
    for (const row of employeeCounts) {
      employeeCountMap.set(
        `${row.job_title}|${row.crew_type}`,
        Number(row.employee_count)
      );
    }

    // Build result array
    const result: LaborTypeHours[] = [];
    for (const [key, stats] of statsMap) {
      result.push({
        jobTitle: stats.jobTitle,
        crewType: stats.crewType,
        totalManHours: stats.totalHours,
        avgHoursPerDay:
          stats.dayCount > 0 ? stats.totalHours / stats.dayCount : 0,
        dayCount: stats.dayCount,
        employeeCount: employeeCountMap.get(key) || 0,
      });
    }

    // Sort by crew type, then by total hours descending
    result.sort((a, b) => {
      if (a.crewType !== b.crewType) {
        return a.crewType.localeCompare(b.crewType);
      }
      return b.totalManHours - a.totalManHours;
    });

    return result;
  }

  /**
   * Conversion factor for loads to tonnes based on vehicle type.
   * Tandem dump trucks typically carry 12-16 tonnes per load.
   */
  private static readonly TANDEM_TONNES_PER_LOAD = 14;

  /**
   * Get material breakdown with flexible grouping dimensions
   *
   * Grouping options:
   * - MATERIAL_ONLY: Group by material name only (original behavior)
   * - CREW_TYPE: Group by material + crew_type (separates Paving/Patch/Base)
   * - JOB_TITLE: Group by material + dominant job_title per daily report
   *
   * When multiple materials are delivered by the same crew on the same day,
   * crew hours are split proportionally by tonnes.
   *
   * Handles unit conversion:
   * - 'tonnes' → used directly
   * - 'loads' with vehicle_type containing 'Tandem' → converted to tonnes (14t per load)
   */
  private async getMaterialProductivity(
    jobsiteId: string,
    startDate: Date,
    endDate: Date,
    grouping: MaterialGrouping
  ): Promise<MaterialProductivity[]> {
    // SQL CASE expression for converting loads to tonnes
    const tonnesConversion = sql<number>`
      CASE
        WHEN LOWER(ms.unit) = 'tonnes' THEN ms.quantity
        WHEN LOWER(ms.unit) = 'loads' AND ms.vehicle_type ILIKE '%tandem%'
          THEN ms.quantity * ${ProductivityAnalyticsResolver.TANDEM_TONNES_PER_LOAD}
        ELSE NULL
      END
    `;

    // Step 1: Get tonnes per material per daily_report, including crew_type
    const tonnesPerMaterialCrew = await db
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
        "ms.daily_report_id",
        "ms.crew_type",
        sql<number>`COALESCE(SUM(${tonnesConversion}), 0)`.as("tonnes"),
        sql<number>`COUNT(*)`.as("shipment_count"),
      ])
      .where("ms.jobsite_id", "=", jobsiteId)
      .where("ms.work_date", ">=", startDate)
      .where("ms.work_date", "<=", endDate)
      .where("ms.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .where((eb) =>
        eb.or([
          eb(sql`LOWER(ms.unit)`, "=", "tonnes"),
          eb.and([
            eb(sql`LOWER(ms.unit)`, "=", "loads"),
            eb(sql`ms.vehicle_type`, "ilike", "%tandem%"),
          ]),
        ])
      )
      .groupBy(["m.name", "ms.daily_report_id", "ms.crew_type"])
      .execute();

    // Step 2: Get total tonnes per daily_report (for proportional allocation)
    const totalTonnesPerCrew = await db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .select([
        "ms.daily_report_id",
        sql<number>`COALESCE(SUM(${tonnesConversion}), 0)`.as("total_tonnes"),
      ])
      .where("ms.jobsite_id", "=", jobsiteId)
      .where("ms.work_date", ">=", startDate)
      .where("ms.work_date", "<=", endDate)
      .where("ms.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .where((eb) =>
        eb.or([
          eb(sql`LOWER(ms.unit)`, "=", "tonnes"),
          eb.and([
            eb(sql`LOWER(ms.unit)`, "=", "loads"),
            eb(sql`ms.vehicle_type`, "ilike", "%tandem%"),
          ]),
        ])
      )
      .groupBy(["ms.daily_report_id"])
      .execute();

    // Step 3: Get crew hours per daily_report
    const crewHoursPerReport = await db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select([
        "ew.daily_report_id",
        sql<number>`AVG(ew.hours)`.as("crew_hours"),
      ])
      .where("ew.jobsite_id", "=", jobsiteId)
      .where("ew.work_date", ">=", startDate)
      .where("ew.work_date", "<=", endDate)
      .where("ew.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy(["ew.daily_report_id"])
      .execute();

    // Step 4: For JOB_TITLE grouping, get dominant job_title per daily_report
    // Dominant = job_title with most total hours for that daily report
    let dominantJobTitleMap = new Map<string, string>();
    if (grouping === MaterialGrouping.JOB_TITLE) {
      const jobTitleHours = await db
        .selectFrom("fact_employee_work as ew")
        .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
        .select([
          "ew.daily_report_id",
          "ew.job_title",
          sql<number>`SUM(ew.hours)`.as("total_hours"),
        ])
        .where("ew.jobsite_id", "=", jobsiteId)
        .where("ew.work_date", ">=", startDate)
        .where("ew.work_date", "<=", endDate)
        .where("ew.archived_at", "is", null)
        .where("dr.approved", "=", true)
        .where("dr.archived", "=", false)
        .groupBy(["ew.daily_report_id", "ew.job_title"])
        .execute();

      // Find the dominant (max hours) job_title per daily_report
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

      for (const [dailyReportId, data] of hoursMap) {
        dominantJobTitleMap.set(dailyReportId, data.jobTitle);
      }
    }

    // Build lookup maps
    const totalTonnesMap = new Map<string, number>();
    for (const row of totalTonnesPerCrew) {
      if (row.daily_report_id) {
        totalTonnesMap.set(row.daily_report_id, Number(row.total_tonnes));
      }
    }

    const crewHoursMap = new Map<string, number>();
    for (const row of crewHoursPerReport) {
      if (row.daily_report_id) {
        crewHoursMap.set(row.daily_report_id, Number(row.crew_hours || 0));
      }
    }

    // Step 5: Calculate proportional hours and aggregate by grouping key
    interface DailyData {
      tonnes: number;
      crewHours: number;
    }
    interface MaterialStats {
      materialName: string;
      crewType?: string;
      jobTitle?: string;
      totalTonnes: number;
      totalProportionalHours: number;
      shipmentCount: number;
      dailyReportIds: Set<string>;
      dailyData: Map<string, DailyData>;
    }
    const materialStats = new Map<string, MaterialStats>();

    for (const row of tonnesPerMaterialCrew) {
      if (!row.daily_report_id) continue;

      const tonnes = Number(row.tonnes);
      const totalCrewTonnes = totalTonnesMap.get(row.daily_report_id) || 0;
      const crewHours = crewHoursMap.get(row.daily_report_id) || 0;

      // Proportional hours = (material tonnes / total crew tonnes) * crew hours
      const proportionalHours =
        totalCrewTonnes > 0 ? (tonnes / totalCrewTonnes) * crewHours : 0;

      // Build grouping key based on selected dimension
      let groupKey: string;
      let crewType: string | undefined;
      let jobTitle: string | undefined;

      switch (grouping) {
        case MaterialGrouping.CREW_TYPE:
          crewType = row.crew_type || "Unknown";
          groupKey = `${row.material_name}|${crewType}`;
          break;
        case MaterialGrouping.JOB_TITLE:
          jobTitle = dominantJobTitleMap.get(row.daily_report_id) || "Unknown";
          groupKey = `${row.material_name}|${jobTitle}`;
          break;
        case MaterialGrouping.MATERIAL_ONLY:
        default:
          groupKey = row.material_name;
          break;
      }

      const existing = materialStats.get(groupKey) || {
        materialName: row.material_name,
        crewType,
        jobTitle,
        totalTonnes: 0,
        totalProportionalHours: 0,
        shipmentCount: 0,
        dailyReportIds: new Set<string>(),
        dailyData: new Map<string, DailyData>(),
      };

      existing.dailyReportIds.add(row.daily_report_id);

      // Track daily breakdown data
      const existingDaily = existing.dailyData.get(row.daily_report_id) || {
        tonnes: 0,
        crewHours: 0,
      };
      existing.dailyData.set(row.daily_report_id, {
        tonnes: existingDaily.tonnes + tonnes,
        crewHours: existingDaily.crewHours + proportionalHours,
      });

      materialStats.set(groupKey, {
        ...existing,
        totalTonnes: existing.totalTonnes + tonnes,
        totalProportionalHours: existing.totalProportionalHours + proportionalHours,
        shipmentCount: existing.shipmentCount + Number(row.shipment_count),
      });
    }

    // Step 6: Get mongo_id and report_date for all daily reports
    const allDailyReportIds = new Set<string>();
    for (const stats of materialStats.values()) {
      for (const id of stats.dailyReportIds) {
        allDailyReportIds.add(id);
      }
    }

    const dailyReportInfo = await db
      .selectFrom("dim_daily_report")
      .select(["id", "mongo_id", "report_date"])
      .where("id", "in", [...allDailyReportIds])
      .execute();

    const dailyReportMap = new Map<string, { mongoId: string; date: Date }>();
    for (const row of dailyReportInfo) {
      dailyReportMap.set(row.id, {
        mongoId: row.mongo_id,
        date: new Date(row.report_date),
      });
    }

    // Convert to result array and sort alphabetically by material name
    const result: MaterialProductivity[] = [];
    for (const stats of materialStats.values()) {
      // Build daily reports list, sorted by date
      const dailyReports = [...stats.dailyReportIds]
        .map((id) => dailyReportMap.get(id))
        .filter((info): info is { mongoId: string; date: Date } => info !== undefined)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((info) => ({ id: info.mongoId, date: info.date }));

      // Build daily breakdown with T/H per day
      const dailyBreakdown = [...stats.dailyData.entries()]
        .map(([dailyReportId, data]) => {
          const reportInfo = dailyReportMap.get(dailyReportId);
          return {
            date: reportInfo?.date || new Date(),
            dailyReportId: reportInfo?.mongoId || dailyReportId,
            tonnes: data.tonnes,
            crewHours: data.crewHours,
            tonnesPerHour: data.crewHours > 0 ? data.tonnes / data.crewHours : 0,
          };
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      result.push({
        materialName: stats.materialName,
        crewType: stats.crewType,
        jobTitle: stats.jobTitle,
        totalTonnes: stats.totalTonnes,
        totalCrewHours: stats.totalProportionalHours,
        tonnesPerHour:
          stats.totalProportionalHours > 0
            ? stats.totalTonnes / stats.totalProportionalHours
            : 0,
        shipmentCount: stats.shipmentCount,
        dailyReports,
        dailyBreakdown,
      });
    }

    result.sort((a, b) => a.materialName.localeCompare(b.materialName));
    return result;
  }

  /**
   * Calculate overall T/H productivity
   *
   * T/H = Total tonnes (all materials) / Total crew hours (from specific crews that ordered materials)
   *
   * Handles unit conversion:
   * - 'tonnes' → used directly
   * - 'loads' with vehicle_type containing 'Tandem' → converted to tonnes (14t per load)
   *
   * Uses the specific crew's hours (via daily_report_id) that ordered materials,
   * not averaged hours across crew types.
   */
  private async getOverallProductivity(
    jobsiteId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalTonnes: number;
    totalCrewHours: number;
    overallTonnesPerHour: number;
  }> {
    // SQL CASE expression for converting loads to tonnes
    const tonnesConversion = sql<number>`
      CASE
        WHEN LOWER(ms.unit) = 'tonnes' THEN ms.quantity
        WHEN LOWER(ms.unit) = 'loads' AND ms.vehicle_type ILIKE '%tandem%'
          THEN ms.quantity * ${ProductivityAnalyticsResolver.TANDEM_TONNES_PER_LOAD}
        ELSE NULL
      END
    `;

    // Get total tonnes from all material shipments (including converted loads)
    const tonnesResult = await db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .select([sql<number>`COALESCE(SUM(${tonnesConversion}), 0)`.as("total_tonnes")])
      .where("ms.jobsite_id", "=", jobsiteId)
      .where("ms.work_date", ">=", startDate)
      .where("ms.work_date", "<=", endDate)
      .where("ms.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .where((eb) =>
        eb.or([
          eb(sql`LOWER(ms.unit)`, "=", "tonnes"),
          eb.and([
            eb(sql`LOWER(ms.unit)`, "=", "loads"),
            eb(sql`ms.vehicle_type`, "ilike", "%tandem%"),
          ]),
        ])
      )
      .executeTakeFirst();

    const totalTonnes = Number(tonnesResult?.total_tonnes || 0);

    // Get distinct daily_report_ids that had material shipments (tonnes or convertible loads)
    const materialCrews = await db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .select(["ms.daily_report_id"])
      .distinct()
      .where("ms.jobsite_id", "=", jobsiteId)
      .where("ms.work_date", ">=", startDate)
      .where("ms.work_date", "<=", endDate)
      .where("ms.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .where((eb) =>
        eb.or([
          eb(sql`LOWER(ms.unit)`, "=", "tonnes"),
          eb.and([
            eb(sql`LOWER(ms.unit)`, "=", "loads"),
            eb(sql`ms.vehicle_type`, "ilike", "%tandem%"),
          ]),
        ])
      )
      .execute();

    // Get crew hours for those specific daily reports
    // Uses AVG(employee hours) per daily_report instead of MAX
    const crewHoursPerReport = await db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select([
        "ew.daily_report_id",
        sql<number>`AVG(ew.hours)`.as("crew_hours"),
      ])
      .where("ew.jobsite_id", "=", jobsiteId)
      .where("ew.work_date", ">=", startDate)
      .where("ew.work_date", "<=", endDate)
      .where("ew.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy(["ew.daily_report_id"])
      .execute();

    // Build lookup map
    const crewHoursMap = new Map<string, number>();
    for (const row of crewHoursPerReport) {
      if (row.daily_report_id) {
        crewHoursMap.set(row.daily_report_id, Number(row.crew_hours || 0));
      }
    }

    // Sum only hours from crews that ordered materials
    let totalCrewHours = 0;
    for (const row of materialCrews) {
      if (row.daily_report_id) {
        totalCrewHours += crewHoursMap.get(row.daily_report_id) || 0;
      }
    }

    const overallTonnesPerHour =
      totalCrewHours > 0 ? totalTonnes / totalCrewHours : 0;

    return { totalTonnes, totalCrewHours, overallTonnesPerHour };
  }

  /**
   * Get detailed crew hours breakdown per day (optional)
   */
  private async getCrewHoursDetail(
    jobsiteId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CrewHoursDetail[]> {
    const result = await db
      .selectFrom("crew_hours_by_day")
      .select([
        "work_date",
        "crew_type",
        "avg_crew_hours",
        "total_man_hours",
        "total_employees",
        "crew_count",
      ])
      .where("jobsite_id", "=", jobsiteId)
      .where("work_date", ">=", startDate)
      .where("work_date", "<=", endDate)
      .orderBy("work_date", "asc")
      .orderBy("crew_type", "asc")
      .execute();

    return result
      .filter((row) => row.work_date !== null && row.crew_type !== null)
      .map((row) => ({
        date: new Date(row.work_date!),
        crewType: row.crew_type!,
        avgCrewHours: Number(row.avg_crew_hours || 0),
        totalManHours: Number(row.total_man_hours || 0),
        totalEmployees: Number(row.total_employees || 0),
        crewCount: Number(row.crew_count || 0),
      }));
  }
}
