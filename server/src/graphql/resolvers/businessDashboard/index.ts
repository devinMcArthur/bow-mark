import { Arg, Query, Resolver } from "type-graphql";
import { sql } from "kysely";
import { db } from "../../../db";
import {
  CUBIC_METERS_TO_TONNES,
  TANDEM_TONNES_PER_LOAD,
} from "@constants/UnitConversions";

import {
  DashboardInput,
  DashboardProductivityInput,
  DashboardOverviewReport,
  DashboardOverviewItem,
  DashboardFinancialReport,
  DashboardFinancialItem,
  DashboardProductivityReport,
  DashboardProductivityJobsiteItem,
  DashboardProductivityCrewItem,
  DashboardMaterialOption,
} from "../../types/businessDashboard";
import { MaterialGrouping } from "../../types/productivityAnalytics";

/**
 * Converts material shipment quantity to tonnes using unit + vehicle type.
 * Same conversion logic as FinancialPerformanceResolver and ProductivityBenchmarksResolver.
 * Tandem loads: 22 T/load. Cubic metres: 1.5 T/m³.
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
export default class BusinessDashboardResolver {

  // ─── Overview ─────────────────────────────────────────────────────────────

  @Query(() => DashboardOverviewReport)
  async dashboardOverview(
    @Arg("input") input: DashboardInput
  ): Promise<DashboardOverviewReport> {
    // Clone dates — startDate/endDate are already Date objects from Type-GraphQL
    const startDate = new Date(input.startDate.getTime());
    const endDate = new Date(input.endDate.getTime());
    endDate.setHours(23, 59, 59, 999);

    // Prior year equivalent period for YoY comparison
    const priorStart = new Date(startDate);
    priorStart.setFullYear(priorStart.getFullYear() - 1);
    const priorEnd = new Date(endDate);
    priorEnd.setFullYear(priorEnd.getFullYear() - 1);

    const [
      jobsiteRows,
      revenueRows, employeeRows, vehicleRows, materialRows, truckingRows,
      expenseRows, tonnesRows, crewHoursRows,
      priorRevenueRows, priorEmployeeRows, priorVehicleRows, priorMaterialRows,
      priorTruckingRows, priorExpenseRows, priorTonnesRows, priorCrewHoursRows,
    ] = await Promise.all([
      this.getJobsites(),
      this.getRevenue(startDate, endDate),
      this.getEmployeeCosts(startDate, endDate),
      this.getVehicleCosts(startDate, endDate),
      this.getMaterialCosts(startDate, endDate),
      this.getTruckingCosts(startDate, endDate),
      this.getExpenseInvoiceCosts(startDate, endDate),
      this.getTonnesPerJobsite(startDate, endDate),
      this.getCrewHoursPerJobsite(startDate, endDate),
      this.getRevenue(priorStart, priorEnd),
      this.getEmployeeCosts(priorStart, priorEnd),
      this.getVehicleCosts(priorStart, priorEnd),
      this.getMaterialCosts(priorStart, priorEnd),
      this.getTruckingCosts(priorStart, priorEnd),
      this.getExpenseInvoiceCosts(priorStart, priorEnd),
      this.getTonnesPerJobsite(priorStart, priorEnd),
      this.getCrewHoursPerJobsite(priorStart, priorEnd),
    ]);

    // Build lookup maps keyed by PG jobsite UUID
    const revenueMap = new Map(revenueRows.map(r => [r.jobsite_id, Number(r.total_revenue)]));
    const employeeMap = new Map(employeeRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const vehicleMap = new Map(vehicleRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const materialMap = new Map(materialRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const truckingMap = new Map(truckingRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const expenseMap = new Map(expenseRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const tonnesMap = new Map(tonnesRows.map(r => [r.jobsite_id, Number(r.total_tonnes ?? 0)]));
    const crewHoursMap = new Map(crewHoursRows.map(r => [r.jobsite_id, Number(r.total_hours)]));

    const jobsiteMongoMap = new Map(jobsiteRows.map(j => [j.id, j]));

    // Only include jobsites with some activity in this period
    const activeIds = new Set([
      ...revenueMap.keys(), ...employeeMap.keys(),
      ...vehicleMap.keys(), ...materialMap.keys(),
      ...truckingMap.keys(), ...expenseMap.keys(),
      ...tonnesMap.keys(),
    ]);

    const items: DashboardOverviewItem[] = [];
    for (const pgId of activeIds) {
      const j = jobsiteMongoMap.get(pgId);
      if (!j) continue;
      const revenue = revenueMap.get(pgId) ?? 0;
      const directCost =
        (employeeMap.get(pgId) ?? 0) + (vehicleMap.get(pgId) ?? 0) +
        (materialMap.get(pgId) ?? 0) + (truckingMap.get(pgId) ?? 0) +
        (expenseMap.get(pgId) ?? 0);
      const netIncome = revenue - directCost;
      const tonnes = tonnesMap.get(pgId) ?? 0;
      const crewHrs = crewHoursMap.get(pgId) ?? 0;
      items.push({
        jobsiteId: j.mongo_id,
        jobsiteName: j.name,
        jobcode: j.jobcode ?? undefined,
        totalRevenue: revenue,
        totalDirectCost: directCost,
        netIncome,
        netMarginPercent: revenue > 0 ? (netIncome / revenue) * 100 : undefined,
        totalTonnes: tonnes,
        tonnesPerHour: crewHrs > 0 ? tonnes / crewHrs : undefined,
      });
    }

    // Current period totals
    const totalRevenue = items.reduce((s, j) => s + j.totalRevenue, 0);
    const totalNetIncome = items.reduce((s, j) => s + j.netIncome, 0);
    const totalTonnes = items.reduce((s, j) => s + j.totalTonnes, 0);
    const totalCrewHrs = crewHoursRows.reduce((s, r) => s + Number(r.total_hours), 0);
    const avgTonnesPerHour = totalCrewHrs > 0 ? totalTonnes / totalCrewHrs : undefined;
    // Equal-weight average (one vote per jobsite, not revenue-weighted) —
    // consistent with the design spec: "Avg margin across jobsites"
    const margined = items.filter(j => j.netMarginPercent != null);
    const avgNetMarginPercent = margined.length > 0
      ? margined.reduce((s, j) => s + (j.netMarginPercent ?? 0), 0) / margined.length
      : undefined;

    // Prior year totals for YoY
    const priorRevenue = priorRevenueRows.reduce((s, r) => s + Number(r.total_revenue), 0);
    const priorCost =
      priorEmployeeRows.reduce((s, r) => s + Number(r.total_cost), 0) +
      priorVehicleRows.reduce((s, r) => s + Number(r.total_cost), 0) +
      priorMaterialRows.reduce((s, r) => s + Number(r.total_cost), 0) +
      priorTruckingRows.reduce((s, r) => s + Number(r.total_cost), 0) +
      priorExpenseRows.reduce((s, r) => s + Number(r.total_cost), 0);
    const priorNetIncome = priorRevenue - priorCost;
    const priorTonnes = priorTonnesRows.reduce((s, r) => s + Number(r.total_tonnes ?? 0), 0);
    const priorCrewHrs = priorCrewHoursRows.reduce((s, r) => s + Number(r.total_hours), 0);
    const priorTH = priorCrewHrs > 0 ? priorTonnes / priorCrewHrs : 0;
    const currentTH = avgTonnesPerHour ?? 0;

    const pctChange = (cur: number, prior: number) =>
      prior !== 0 ? ((cur - prior) / Math.abs(prior)) * 100 : undefined;

    return {
      totalRevenue,
      totalNetIncome,
      avgNetMarginPercent,
      totalTonnes,
      avgTonnesPerHour,
      revenueChangePercent: pctChange(totalRevenue, priorRevenue),
      netIncomeChangePercent: pctChange(totalNetIncome, priorNetIncome),
      tonnesChangePercent: pctChange(totalTonnes, priorTonnes),
      tonnesPerHourChangePercent: pctChange(currentTH, priorTH),
      priorRevenue: priorRevenue > 0 ? priorRevenue : undefined,
      priorNetIncome: priorRevenue > 0 ? priorNetIncome : undefined,
      priorTonnes: priorTonnes > 0 ? priorTonnes : undefined,
      priorAvgTonnesPerHour: priorTH > 0 ? priorTH : undefined,
      jobsites: items,
    };
  }

  // ─── Financial ────────────────────────────────────────────────────────────

  @Query(() => DashboardFinancialReport)
  async dashboardFinancial(
    @Arg("input") input: DashboardInput
  ): Promise<DashboardFinancialReport> {
    const startDate = new Date(input.startDate.getTime());
    const endDate = new Date(input.endDate.getTime());
    endDate.setHours(23, 59, 59, 999);

    const [
      jobsiteRows, revenueRows, employeeRows, vehicleRows,
      materialRows, truckingRows, expenseRows, tonnesRows, crewHoursRows,
    ] = await Promise.all([
      this.getJobsites(),
      this.getRevenue(startDate, endDate),
      this.getEmployeeCosts(startDate, endDate),
      this.getVehicleCosts(startDate, endDate),
      this.getMaterialCosts(startDate, endDate),
      this.getTruckingCosts(startDate, endDate),
      this.getExpenseInvoiceCosts(startDate, endDate),
      this.getTonnesPerJobsite(startDate, endDate),
      this.getCrewHoursPerJobsite(startDate, endDate),
    ]);

    const revenueMap = new Map(revenueRows.map(r => [r.jobsite_id, Number(r.total_revenue)]));
    const employeeMap = new Map(employeeRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const vehicleMap = new Map(vehicleRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const materialMap = new Map(materialRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const truckingMap = new Map(truckingRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const expenseMap = new Map(expenseRows.map(r => [r.jobsite_id, Number(r.total_cost)]));
    const tonnesMap = new Map(tonnesRows.map(r => [r.jobsite_id, Number(r.total_tonnes ?? 0)]));
    const crewHoursMap = new Map(crewHoursRows.map(r => [r.jobsite_id, Number(r.total_hours)]));
    const jobsiteMongoMap = new Map(jobsiteRows.map(j => [j.id, j]));

    const activeIds = new Set([
      ...revenueMap.keys(), ...employeeMap.keys(),
      ...vehicleMap.keys(), ...materialMap.keys(),
      ...truckingMap.keys(), ...expenseMap.keys(),
      ...tonnesMap.keys(),
    ]);

    const items: DashboardFinancialItem[] = [];
    let totalRevenue = 0, totalDirectCost = 0, totalNetIncome = 0;
    const margins: number[] = [];

    for (const pgId of activeIds) {
      const j = jobsiteMongoMap.get(pgId);
      if (!j) continue;
      const revenue = revenueMap.get(pgId) ?? 0;
      const employee = employeeMap.get(pgId) ?? 0;
      const vehicle = vehicleMap.get(pgId) ?? 0;
      const material = materialMap.get(pgId) ?? 0;
      const trucking = truckingMap.get(pgId) ?? 0;
      const expenseInv = expenseMap.get(pgId) ?? 0;
      const directCost = employee + vehicle + material + trucking + expenseInv;
      const netIncome = revenue - directCost;
      const margin = revenue > 0 ? (netIncome / revenue) * 100 : undefined;
      const tonnes = tonnesMap.get(pgId) ?? 0;
      const crewHrs = crewHoursMap.get(pgId) ?? 0;

      totalRevenue += revenue;
      totalDirectCost += directCost;
      totalNetIncome += netIncome;
      if (margin != null) margins.push(margin);

      items.push({
        jobsiteId: j.mongo_id,
        jobsiteName: j.name,
        jobcode: j.jobcode ?? undefined,
        totalRevenue: revenue,
        employeeCost: employee,
        vehicleCost: vehicle,
        materialCost: material,
        truckingCost: trucking,
        expenseInvoiceCost: expenseInv,
        totalDirectCost: directCost,
        netIncome,
        netMarginPercent: margin,
        totalTonnes: tonnes,
        tonnesPerHour: crewHrs > 0 ? tonnes / crewHrs : undefined,
      });
    }

    return {
      totalRevenue,
      totalDirectCost,
      totalNetIncome,
      avgNetMarginPercent: margins.length > 0
        ? margins.reduce((s, m) => s + m, 0) / margins.length
        : undefined,
      jobsites: items,
    };
  }

  // ─── Productivity ─────────────────────────────────────────────────────────

  @Query(() => DashboardProductivityReport)
  async dashboardProductivity(
    @Arg("input") input: DashboardProductivityInput
  ): Promise<DashboardProductivityReport> {
    const startDate = new Date(input.startDate.getTime());
    const endDate = new Date(input.endDate.getTime());
    endDate.setHours(23, 59, 59, 999);

    const materialGrouping = input.materialGrouping ?? MaterialGrouping.MATERIAL_ONLY;

    // Parse filter criteria for jobsite benchmarks
    const filterCriteria = this.parseSelectedMaterials(
      input.selectedMaterials,
      materialGrouping
    );

    // Material names for crew filter (always by name only, strip composite key)
    const crewMaterialNames =
      input.selectedMaterials && input.selectedMaterials.length > 0
        ? input.selectedMaterials.map((k) => k.split("|")[0])
        : undefined;

    const [
      availableMaterials,
      shipmentsPerReport,
      crewHoursPerReport,
      crewRows,
      tonnesPerCrewRows,
      crewHoursPerCrewRows,
    ] = await Promise.all([
      this.getAvailableMaterials(startDate, endDate, materialGrouping),
      this.getShipmentsPerReport(startDate, endDate, materialGrouping, filterCriteria),
      this.getCrewHoursPerReport(startDate, endDate),
      this.getCrews(),
      this.getTonnesPerCrew(startDate, endDate, crewMaterialNames),
      this.getCrewHoursPerCrew(startDate, endDate),
    ]);

    // Build daily-report → crew_hours map for benchmarks aggregation
    const crewHoursDailyMap = new Map<string, number>();
    for (const row of crewHoursPerReport) {
      if (row.daily_report_id) {
        crewHoursDailyMap.set(row.daily_report_id, Number(row.crew_hours || 0));
      }
    }

    // Jobsite benchmarks (benchmarks pattern: per-report aggregation)
    const jobsiteStats = this.aggregateByJobsite(shipmentsPerReport, crewHoursDailyMap);
    const { jobsites, overallTonnes, overallCrewHours, regression } =
      this.buildJobsiteBenchmarks(jobsiteStats);

    const averageTonnesPerHour =
      overallCrewHours > 0 ? overallTonnes / overallCrewHours : 0;

    // Crew items (existing simple aggregation pattern)
    const crewMap = new Map(crewRows.map((c) => [c.id, c]));
    const crewHoursCrewMap = new Map(
      crewHoursPerCrewRows.map((r) => [r.crew_id, Number(r.total_hours)])
    );

    const crewItems: DashboardProductivityCrewItem[] = [];
    for (const row of tonnesPerCrewRows) {
      const c = crewMap.get(row.crew_id);
      if (!c) continue;
      const tonnes = Number(row.total_tonnes ?? 0);
      const crewHrs = crewHoursCrewMap.get(row.crew_id) ?? 0;
      crewItems.push({
        crewId: row.crew_id,
        crewName: c.name,
        crewType: c.type,
        totalTonnes: tonnes,
        totalCrewHours: crewHrs,
        tonnesPerHour: crewHrs > 0 ? tonnes / crewHrs : undefined,
        dayCount: Number(row.day_count),
        jobsiteCount: Number(row.jobsite_count),
        percentFromAverage: undefined,
      });
    }

    const validCrews = crewItems.filter((c) => c.tonnesPerHour != null);
    const avgCrewTH =
      validCrews.length > 0
        ? validCrews.reduce((s, c) => s + (c.tonnesPerHour ?? 0), 0) / validCrews.length
        : undefined;
    if (avgCrewTH != null) {
      for (const item of crewItems) {
        if (item.tonnesPerHour != null)
          item.percentFromAverage =
            ((item.tonnesPerHour - avgCrewTH) / avgCrewTH) * 100;
      }
    }

    return {
      averageTonnesPerHour,
      totalTonnes: overallTonnes,
      totalCrewHours: overallCrewHours,
      jobsiteCount: jobsites.length,
      availableMaterials,
      jobsites,
      crews: crewItems,
      regression,
    };
  }

  // ─── Productivity helpers (benchmarks pattern) ────────────────────────────

  /**
   * Available materials grouped by the selected dimension.
   * Mirrors ProductivityBenchmarksResolver.getAvailableMaterials but uses date range.
   */
  private async getAvailableMaterials(
    startDate: Date,
    endDate: Date,
    grouping: MaterialGrouping
  ): Promise<DashboardMaterialOption[]> {
    let dominantJobTitleMap = new Map<string, string>();
    if (grouping === MaterialGrouping.JOB_TITLE) {
      dominantJobTitleMap = await this.getDominantJobTitles(startDate, endDate);
    }

    const materialsResult = await db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id")
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

    const result: DashboardMaterialOption[] = [];
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

  /** Dominant job title per daily report (most hours) */
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
        hoursMap.set(row.daily_report_id, { jobTitle: row.job_title, hours });
      }
    }

    const result = new Map<string, string>();
    for (const [dailyReportId, data] of hoursMap) {
      result.set(dailyReportId, data.jobTitle);
    }
    return result;
  }

  /** Parse composite material keys into filter criteria */
  private parseSelectedMaterials(
    selectedMaterials: string[] | undefined,
    grouping: MaterialGrouping
  ): Array<{ materialName: string; crewType?: string; jobTitle?: string }> | null {
    if (!selectedMaterials || selectedMaterials.length === 0) return null;
    return selectedMaterials.map((key) => {
      const parts = key.split("|");
      const materialName = parts[0];
      if (grouping === MaterialGrouping.CREW_TYPE && parts.length > 1)
        return { materialName, crewType: parts[1] };
      if (grouping === MaterialGrouping.JOB_TITLE && parts.length > 1)
        return { materialName, jobTitle: parts[1] };
      return { materialName };
    });
  }

  /** Per-daily-report shipments with material/crew-type filtering */
  private async getShipmentsPerReport(
    startDate: Date,
    endDate: Date,
    grouping: MaterialGrouping,
    filterCriteria: Array<{ materialName: string; crewType?: string; jobTitle?: string }> | null
  ) {
    let dominantJobTitleMap = new Map<string, string>();
    if (grouping === MaterialGrouping.JOB_TITLE && filterCriteria) {
      dominantJobTitleMap = await this.getDominantJobTitles(startDate, endDate);
    }

    let query = db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .innerJoin("dim_jobsite as j", "j.id", "ms.jobsite_id")
      .innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id")
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

    if (filterCriteria && grouping === MaterialGrouping.JOB_TITLE) {
      const jobTitleFilters = new Set(
        filterCriteria.map((f) => `${f.materialName}|${f.jobTitle}`)
      );
      return results.filter((row) => {
        const jobTitle =
          dominantJobTitleMap.get(row.daily_report_id || "") || "Unknown";
        return jobTitleFilters.has(`${row.material_name}|${jobTitle}`);
      });
    }

    return results;
  }

  /** Crew hours per daily report (AVG hours across employees in that report) */
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

  /** Aggregate per-report shipments by jobsite, accumulating crew hours */
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
      if (row.daily_report_id) existing.dailyReportIds.add(row.daily_report_id);

      jobsiteStats.set(jobsiteId, existing);
    }

    for (const stats of jobsiteStats.values()) {
      let totalCrewHours = 0;
      for (const drId of stats.dailyReportIds) {
        totalCrewHours += crewHoursMap.get(drId) || 0;
      }
      stats.totalCrewHours = totalCrewHours;
    }

    return jobsiteStats;
  }

  /** Build final jobsite benchmarks with regression and size-adjusted metrics */
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
  ): {
    jobsites: DashboardProductivityJobsiteItem[];
    overallTonnes: number;
    overallCrewHours: number;
    regression: { intercept: number; slope: number };
  } {
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

    const { intercept, slope } =
      this.calculateRegressionCoefficients(jobsitesWithData);

    const jobsites: DashboardProductivityJobsiteItem[] = jobsitesWithData
      .map((stats) => {
        const percentFromAverage =
          averageTonnesPerHour > 0
            ? ((stats.tonnesPerHour - averageTonnesPerHour) / averageTonnesPerHour) * 100
            : 0;
        const expectedTonnesPerHour = this.calculateExpectedTonnesPerHour(
          stats.totalTonnes,
          intercept,
          slope
        );
        const percentFromExpected =
          expectedTonnesPerHour > 0
            ? ((stats.tonnesPerHour - expectedTonnesPerHour) / expectedTonnesPerHour) * 100
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

    return {
      jobsites,
      overallTonnes,
      overallCrewHours,
      regression: { intercept, slope },
    };
  }

  /** Log-linear regression: T/H = intercept + slope * ln(tonnes) */
  private calculateRegressionCoefficients(
    jobsites: Array<{ totalTonnes: number; tonnesPerHour: number }>
  ): { intercept: number; slope: number } {
    const validPoints = jobsites.filter(
      (j) => j.totalTonnes > 0 && j.tonnesPerHour > 0
    );
    if (validPoints.length < 2) return { intercept: 0, slope: 0 };

    const points = validPoints.map((j) => ({
      x: Math.log(j.totalTonnes),
      y: j.tonnesPerHour,
    }));
    const n = points.length;
    const meanX = points.reduce((s, p) => s + p.x, 0) / n;
    const meanY = points.reduce((s, p) => s + p.y, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (const p of points) {
      numerator += (p.x - meanX) * (p.y - meanY);
      denominator += (p.x - meanX) ** 2;
    }
    if (denominator === 0) return { intercept: meanY, slope: 0 };

    const slope = numerator / denominator;
    const intercept = meanY - slope * meanX;
    return { intercept, slope };
  }

  private calculateExpectedTonnesPerHour(
    totalTonnes: number,
    intercept: number,
    slope: number
  ): number {
    if (totalTonnes <= 0) return 0;
    return intercept + slope * Math.log(totalTonnes);
  }

  // ─── Shared private helpers ───────────────────────────────────────────────

  private async getJobsites() {
    return db
      .selectFrom("dim_jobsite as j")
      .select(["j.id", "j.mongo_id", "j.name", "j.jobcode"])
      .where("j.archived_at", "is", null)
      .execute();
  }

  private async getCrews() {
    return db
      .selectFrom("dim_crew as c")
      .select(["c.id", "c.name", "c.type"])
      .execute();
  }

  private async getRevenue(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_invoice as i")
      .select(["i.jobsite_id", sql<number>`SUM(i.amount)`.as("total_revenue")])
      .where("i.invoice_date", ">=", startDate)
      .where("i.invoice_date", "<=", endDate)
      .where("i.direction", "=", "revenue")
      .groupBy("i.jobsite_id")
      .execute();
  }

  private async getExpenseInvoiceCosts(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_invoice as i")
      .select(["i.jobsite_id", sql<number>`SUM(i.amount)`.as("total_cost")])
      .where("i.invoice_date", ">=", startDate)
      .where("i.invoice_date", "<=", endDate)
      .where("i.direction", "=", "expense")
      .groupBy("i.jobsite_id")
      .execute();
  }

  private async getEmployeeCosts(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select(["ew.jobsite_id", sql<number>`SUM(ew.total_cost)`.as("total_cost")])
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
      .select(["vw.jobsite_id", sql<number>`SUM(vw.total_cost)`.as("total_cost")])
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
      .select(["ms.jobsite_id", sql<number>`SUM(ms.total_cost)`.as("total_cost")])
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
      .selectFrom("fact_trucking as t")
      .innerJoin("dim_daily_report as dr", "dr.id", "t.daily_report_id")
      .select(["t.jobsite_id", sql<number>`SUM(t.total_cost)`.as("total_cost")])
      .where("t.work_date", ">=", startDate)
      .where("t.work_date", "<=", endDate)
      .where("t.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy("t.jobsite_id")
      .execute();
  }

  // Crew hours: MAX hours per (daily_report, crew) to count crew-hours not employee-hours
  private async getCrewHoursPerJobsite(startDate: Date, endDate: Date) {
    const sub = db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select([
        "ew.jobsite_id",
        "ew.daily_report_id",
        "ew.crew_id",
        sql<number>`MAX(ew.hours)`.as("crew_day_hours"),
      ])
      .where("ew.work_date", ">=", startDate)
      .where("ew.work_date", "<=", endDate)
      .where("ew.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy(["ew.jobsite_id", "ew.daily_report_id", "ew.crew_id"]);

    return db
      .selectFrom(sub.as("crew_daily"))
      .select(["crew_daily.jobsite_id", sql<number>`SUM(crew_daily.crew_day_hours)`.as("total_hours")])
      .groupBy("crew_daily.jobsite_id")
      .execute();
  }

  private async getCrewHoursPerCrew(startDate: Date, endDate: Date) {
    const sub = db
      .selectFrom("fact_employee_work as ew")
      .innerJoin("dim_daily_report as dr", "dr.id", "ew.daily_report_id")
      .select([
        "ew.crew_id",
        "ew.daily_report_id",
        sql<number>`MAX(ew.hours)`.as("crew_day_hours"),
      ])
      .where("ew.work_date", ">=", startDate)
      .where("ew.work_date", "<=", endDate)
      .where("ew.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy(["ew.crew_id", "ew.daily_report_id"]);

    return db
      .selectFrom(sub.as("crew_daily"))
      .select(["crew_daily.crew_id", sql<number>`SUM(crew_daily.crew_day_hours)`.as("total_hours")])
      .groupBy("crew_daily.crew_id")
      .execute();
  }

  private async getTonnesPerJobsite(startDate: Date, endDate: Date, selectedMaterials?: string[]) {
    let q = db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id")
      .innerJoin("dim_material as m", "m.id", "jm.material_id")
      .select(["ms.jobsite_id", sql<number>`SUM(${getTonnesConversion()})`.as("total_tonnes")])
      .where("ms.work_date", ">=", startDate)
      .where("ms.work_date", "<=", endDate)
      .where("ms.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false);

    if (selectedMaterials && selectedMaterials.length > 0)
      q = q.where("m.name", "in", selectedMaterials);

    return q.groupBy("ms.jobsite_id").execute();
  }

  private async getTonnesPerCrew(startDate: Date, endDate: Date, selectedMaterials?: string[]) {
    let q = db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id")
      .innerJoin("dim_material as m", "m.id", "jm.material_id")
      .select([
        "ms.crew_id",
        sql<number>`SUM(${getTonnesConversion()})`.as("total_tonnes"),
        sql<number>`COUNT(DISTINCT ms.work_date)`.as("day_count"),
        sql<number>`COUNT(DISTINCT ms.jobsite_id)`.as("jobsite_count"),
      ])
      .where("ms.work_date", ">=", startDate)
      .where("ms.work_date", "<=", endDate)
      .where("ms.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false);

    if (selectedMaterials && selectedMaterials.length > 0)
      q = q.where("m.name", "in", selectedMaterials);

    return q.groupBy("ms.crew_id").execute();
  }
}
