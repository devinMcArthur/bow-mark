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

    const [
      jobsiteRows, crewRows,
      tonnesPerJobsiteRows, crewHoursPerJobsiteRows,
      tonnesPerCrewRows, crewHoursPerCrewRows,
      materialRows,
    ] = await Promise.all([
      this.getJobsites(),
      this.getCrews(),
      this.getTonnesPerJobsite(startDate, endDate, input.selectedMaterials ?? undefined),
      this.getCrewHoursPerJobsite(startDate, endDate),
      this.getTonnesPerCrew(startDate, endDate, input.selectedMaterials ?? undefined),
      this.getCrewHoursPerCrew(startDate, endDate),
      this.getAvailableMaterials(startDate, endDate),
    ]);

    const jobsiteMongoMap = new Map(jobsiteRows.map(j => [j.id, j]));
    const crewMap = new Map(crewRows.map(c => [c.id, c]));
    const crewHoursJobsiteMap = new Map(crewHoursPerJobsiteRows.map(r => [r.jobsite_id, Number(r.total_hours)]));
    const crewHoursCrewMap = new Map(crewHoursPerCrewRows.map(r => [r.crew_id, Number(r.total_hours)]));

    // Jobsite items
    let totalTonnes = 0, totalCrewHours = 0;
    const jobsiteItems: DashboardProductivityJobsiteItem[] = [];
    for (const row of tonnesPerJobsiteRows) {
      const j = jobsiteMongoMap.get(row.jobsite_id);
      if (!j) continue;
      const tonnes = Number(row.total_tonnes ?? 0);
      const crewHrs = crewHoursJobsiteMap.get(row.jobsite_id) ?? 0;
      totalTonnes += tonnes;
      totalCrewHours += crewHrs;
      jobsiteItems.push({
        jobsiteId: j.mongo_id,
        jobsiteName: j.name,
        jobcode: j.jobcode ?? undefined,
        totalTonnes: tonnes,
        totalCrewHours: crewHrs,
        tonnesPerHour: crewHrs > 0 ? tonnes / crewHrs : undefined,
        percentFromAverage: undefined,
      });
    }

    const validJobsites = jobsiteItems.filter(j => j.tonnesPerHour != null);
    const avgJobsiteTH = validJobsites.length > 0
      ? validJobsites.reduce((s, j) => s + (j.tonnesPerHour ?? 0), 0) / validJobsites.length
      : undefined;
    if (avgJobsiteTH != null) {
      for (const item of jobsiteItems) {
        if (item.tonnesPerHour != null)
          item.percentFromAverage = ((item.tonnesPerHour - avgJobsiteTH) / avgJobsiteTH) * 100;
      }
    }

    // Crew items
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

    const validCrews = crewItems.filter(c => c.tonnesPerHour != null);
    const avgCrewTH = validCrews.length > 0
      ? validCrews.reduce((s, c) => s + (c.tonnesPerHour ?? 0), 0) / validCrews.length
      : undefined;
    if (avgCrewTH != null) {
      for (const item of crewItems) {
        if (item.tonnesPerHour != null)
          item.percentFromAverage = ((item.tonnesPerHour - avgCrewTH) / avgCrewTH) * 100;
      }
    }

    const availableMaterials: DashboardMaterialOption[] = materialRows.map(r => ({
      materialName: r.material_name,
      key: r.material_name,
    }));

    return {
      avgTonnesPerHour: avgJobsiteTH,
      totalTonnes,
      totalCrewHours,
      jobsiteCount: jobsiteItems.length,
      availableMaterials,
      jobsites: jobsiteItems,
      crews: crewItems,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

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

  private async getAvailableMaterials(startDate: Date, endDate: Date) {
    return db
      .selectFrom("fact_material_shipment as ms")
      .innerJoin("dim_daily_report as dr", "dr.id", "ms.daily_report_id")
      .innerJoin("dim_jobsite_material as jm", "jm.id", "ms.jobsite_material_id")
      .innerJoin("dim_material as m", "m.id", "jm.material_id")
      .select(["m.name as material_name"])
      .where("ms.work_date", ">=", startDate)
      .where("ms.work_date", "<=", endDate)
      .where("ms.archived_at", "is", null)
      .where("dr.approved", "=", true)
      .where("dr.archived", "=", false)
      .groupBy("m.name")
      .orderBy("m.name")
      .execute();
  }
}
