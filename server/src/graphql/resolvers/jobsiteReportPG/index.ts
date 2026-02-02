/**
 * PostgreSQL-backed Jobsite Report Resolver
 *
 * This resolver fetches report data directly from PostgreSQL views
 * and fact tables instead of pre-computed MongoDB documents.
 *
 * Usage:
 *   query {
 *     jobsiteYearReportPG(jobsiteMongoId: "...", year: 2024) { ... }
 *   }
 */

import { Arg, Int, Query, Resolver } from "type-graphql";
import { db } from "../../../db";
import { sql } from "kysely";
import {
  JobsiteYearReportPG,
  JobsiteDayReportPG,
  OnSiteSummaryPG,
  CrewTypeSummaryPG,
  InvoiceSummaryPG,
  EmployeeReportPG,
  VehicleReportPG,
  MaterialReportPG,
  NonCostedMaterialReportPG,
  TruckingReportPG,
  InvoiceReportPG,
  ReportIssuePG,
  ReportIssueTypePG,
  JobsiteInfoPG,
} from "../../types/jobsiteReportPG";

@Resolver()
export default class JobsiteReportPGResolver {
  /**
   * Get a year report for a jobsite from PostgreSQL
   */
  @Query(() => JobsiteYearReportPG, { nullable: true })
  async jobsiteYearReportPG(
    @Arg("jobsiteMongoId") jobsiteMongoId: string,
    @Arg("year", () => Int) year: number
  ): Promise<JobsiteYearReportPG | null> {
    // Get the jobsite from dimension table
    const jobsite = await db
      .selectFrom("dim_jobsite")
      .select(["id", "mongo_id", "name", "jobcode"])
      .where("mongo_id", "=", jobsiteMongoId)
      .executeTakeFirst();

    if (!jobsite) {
      return null;
    }

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    // Fetch all data in parallel
    const [
      dayReports,
      invoiceSummary,
      expenseInvoices,
      revenueInvoices,
      issues,
      crewTypes,
    ] = await Promise.all([
      this.getDayReports(jobsite.id, startOfYear, endOfYear),
      this.getInvoiceSummary(jobsite.id, startOfYear, endOfYear),
      this.getInvoices(jobsite.id, startOfYear, endOfYear, "expense"),
      this.getInvoices(jobsite.id, startOfYear, endOfYear, "revenue"),
      this.getIssues(jobsite.id, startOfYear, endOfYear),
      this.getCrewTypes(jobsite.id, startOfYear, endOfYear),
    ]);

    const jobsiteInfo: JobsiteInfoPG = {
      _id: jobsite.mongo_id,
      name: jobsite.name,
      jobcode: jobsite.jobcode || undefined,
    };

    return {
      _id: `${jobsite.mongo_id}_${year}`,
      jobsite: jobsiteInfo,
      startOfYear,
      crewTypes,
      summary: invoiceSummary,
      dayReports,
      expenseInvoices,
      revenueInvoices,
      issues,
    };
  }

  /**
   * Get all distinct crew types for the period
   */
  private async getCrewTypes(
    jobsiteId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string[]> {
    const result = await db
      .selectFrom("fact_employee_work")
      .select("crew_type")
      .distinct()
      .where("jobsite_id", "=", jobsiteId)
      .where("work_date", ">=", startDate)
      .where("work_date", "<=", endDate)
      .where("archived_at", "is", null)
      .execute();

    return result.map((r) => r.crew_type);
  }

  /**
   * Get invoice summary aggregated for the period
   */
  private async getInvoiceSummary(
    jobsiteId: string,
    startDate: Date,
    endDate: Date
  ): Promise<InvoiceSummaryPG> {
    const result = await db
      .selectFrom("fact_invoice")
      .select([
        sql<number>`COALESCE(SUM(CASE WHEN direction = 'expense' AND invoice_type = 'external' THEN amount ELSE 0 END), 0)`.as(
          "external_expense"
        ),
        sql<number>`COALESCE(SUM(CASE WHEN direction = 'expense' AND invoice_type = 'internal' THEN amount ELSE 0 END), 0)`.as(
          "internal_expense"
        ),
        sql<number>`COALESCE(SUM(CASE WHEN direction = 'expense' AND invoice_type = 'accrual' THEN amount ELSE 0 END), 0)`.as(
          "accrual_expense"
        ),
        sql<number>`COALESCE(SUM(CASE WHEN direction = 'revenue' AND invoice_type = 'external' THEN amount ELSE 0 END), 0)`.as(
          "external_revenue"
        ),
        sql<number>`COALESCE(SUM(CASE WHEN direction = 'revenue' AND invoice_type = 'internal' THEN amount ELSE 0 END), 0)`.as(
          "internal_revenue"
        ),
        sql<number>`COALESCE(SUM(CASE WHEN direction = 'revenue' AND invoice_type = 'accrual' THEN amount ELSE 0 END), 0)`.as(
          "accrual_revenue"
        ),
      ])
      .where("jobsite_id", "=", jobsiteId)
      .where("invoice_date", ">=", startDate)
      .where("invoice_date", "<=", endDate)
      .executeTakeFirst();

    return {
      externalExpenseInvoiceValue: Number(result?.external_expense || 0),
      internalExpenseInvoiceValue: Number(result?.internal_expense || 0),
      accrualExpenseInvoiceValue: Number(result?.accrual_expense || 0),
      externalRevenueInvoiceValue: Number(result?.external_revenue || 0),
      internalRevenueInvoiceValue: Number(result?.internal_revenue || 0),
      accrualRevenueInvoiceValue: Number(result?.accrual_revenue || 0),
    };
  }

  /**
   * Get individual invoices for the period
   */
  private async getInvoices(
    jobsiteId: string,
    startDate: Date,
    endDate: Date,
    direction: "expense" | "revenue"
  ): Promise<InvoiceReportPG[]> {
    const invoices = await db
      .selectFrom("fact_invoice")
      .innerJoin("dim_company", "dim_company.id", "fact_invoice.company_id")
      .select([
        "fact_invoice.id",
        "fact_invoice.invoice_number",
        "fact_invoice.amount",
        "fact_invoice.description",
        "fact_invoice.invoice_type",
        "fact_invoice.invoice_date",
        "dim_company.name as company_name",
      ])
      .where("fact_invoice.jobsite_id", "=", jobsiteId)
      .where("fact_invoice.invoice_date", ">=", startDate)
      .where("fact_invoice.invoice_date", "<=", endDate)
      .where("fact_invoice.direction", "=", direction)
      .orderBy("fact_invoice.invoice_date", "asc")
      .execute();

    return invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      companyName: inv.company_name,
      amount: Number(inv.amount),
      description: inv.description || undefined,
      invoiceType: inv.invoice_type,
      date: new Date(inv.invoice_date),
    }));
  }

  /**
   * Get report issues for the period
   */
  private async getIssues(
    jobsiteId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ReportIssuePG[]> {
    // Query the issues view
    const issues = await db
      .selectFrom("jobsite_report_issues")
      .select([
        "issue_type",
        "entity_id",
        "entity_name",
        sql<number>`SUM(occurrence_count)`.as("count"),
      ])
      .where("jobsite_id", "=", jobsiteId)
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
      .groupBy(["issue_type", "entity_id", "entity_name"])
      .execute();

    return issues.map((issue) => ({
      type: issue.issue_type as ReportIssueTypePG,
      entityId: issue.entity_id || undefined,
      entityName: issue.entity_name || undefined,
      count: Number(issue.count),
    }));
  }

  /**
   * Get day reports for the period
   */
  private async getDayReports(
    jobsiteId: string,
    startDate: Date,
    endDate: Date
  ): Promise<JobsiteDayReportPG[]> {
    // Get unique dates that have work
    const dates = await db
      .selectFrom("fact_employee_work")
      .select("work_date")
      .distinct()
      .where("jobsite_id", "=", jobsiteId)
      .where("work_date", ">=", startDate)
      .where("work_date", "<=", endDate)
      .where("archived_at", "is", null)
      .union(
        db
          .selectFrom("fact_vehicle_work")
          .select("work_date")
          .distinct()
          .where("jobsite_id", "=", jobsiteId)
          .where("work_date", ">=", startDate)
          .where("work_date", "<=", endDate)
          .where("archived_at", "is", null)
      )
      .orderBy("work_date", "asc")
      .execute();

    // Build day reports for each date
    const dayReports: JobsiteDayReportPG[] = [];

    for (const { work_date } of dates) {
      const date = new Date(work_date);
      const dayReport = await this.buildDayReport(jobsiteId, date);
      if (dayReport) {
        dayReports.push(dayReport);
      }
    }

    return dayReports;
  }

  /**
   * Build a single day report
   */
  private async buildDayReport(
    jobsiteId: string,
    date: Date
  ): Promise<JobsiteDayReportPG | null> {
    const [
      employees,
      vehicles,
      materials,
      nonCostedMaterials,
      trucking,
    ] = await Promise.all([
      this.getEmployeesForDay(jobsiteId, date),
      this.getVehiclesForDay(jobsiteId, date),
      this.getMaterialsForDay(jobsiteId, date),
      this.getNonCostedMaterialsForDay(jobsiteId, date),
      this.getTruckingForDay(jobsiteId, date),
    ]);

    // If no data, skip this day
    if (
      employees.length === 0 &&
      vehicles.length === 0 &&
      materials.length === 0 &&
      nonCostedMaterials.length === 0 &&
      trucking.length === 0
    ) {
      return null;
    }

    // Calculate summary
    const summary = this.calculateSummary(
      employees,
      vehicles,
      materials,
      nonCostedMaterials,
      trucking
    );

    // Get crew types
    const crewTypes = [
      ...new Set([
        ...employees.map((e) => e.crewType),
        ...vehicles.map((v) => v.crewType),
        ...materials.map((m) => m.crewType),
        ...nonCostedMaterials.map((m) => m.crewType),
        ...trucking.map((t) => t.crewType),
      ]),
    ];

    return {
      id: `${jobsiteId}_${date.toISOString().split("T")[0]}`,
      date,
      crewTypes,
      summary,
      employees,
      vehicles,
      materials,
      nonCostedMaterials,
      trucking,
    };
  }

  /**
   * Get employee work for a specific day
   */
  private async getEmployeesForDay(
    jobsiteId: string,
    date: Date
  ): Promise<EmployeeReportPG[]> {
    const employees = await db
      .selectFrom("fact_employee_work")
      .innerJoin(
        "dim_employee",
        "dim_employee.id",
        "fact_employee_work.employee_id"
      )
      .select([
        "fact_employee_work.id",
        "fact_employee_work.employee_id",
        "dim_employee.name as employee_name",
        "fact_employee_work.hours",
        "fact_employee_work.total_cost",
        "fact_employee_work.crew_type",
      ])
      .where("fact_employee_work.jobsite_id", "=", jobsiteId)
      .where("fact_employee_work.work_date", "=", date)
      .where("fact_employee_work.archived_at", "is", null)
      .execute();

    return employees.map((e) => ({
      id: e.id,
      employeeId: e.employee_id,
      employeeName: e.employee_name,
      hours: Number(e.hours || 0),
      cost: Number(e.total_cost || 0),
      crewType: e.crew_type,
    }));
  }

  /**
   * Get vehicle work for a specific day
   */
  private async getVehiclesForDay(
    jobsiteId: string,
    date: Date
  ): Promise<VehicleReportPG[]> {
    const vehicles = await db
      .selectFrom("fact_vehicle_work")
      .innerJoin(
        "dim_vehicle",
        "dim_vehicle.id",
        "fact_vehicle_work.vehicle_id"
      )
      .select([
        "fact_vehicle_work.id",
        "fact_vehicle_work.vehicle_id",
        "dim_vehicle.name as vehicle_name",
        "dim_vehicle.vehicle_code",
        "fact_vehicle_work.hours",
        "fact_vehicle_work.total_cost",
        "fact_vehicle_work.crew_type",
      ])
      .where("fact_vehicle_work.jobsite_id", "=", jobsiteId)
      .where("fact_vehicle_work.work_date", "=", date)
      .where("fact_vehicle_work.archived_at", "is", null)
      .execute();

    return vehicles.map((v) => ({
      id: v.id,
      vehicleId: v.vehicle_id,
      vehicleName: v.vehicle_name,
      vehicleCode: v.vehicle_code,
      hours: Number(v.hours),
      cost: Number(v.total_cost || 0),
      crewType: v.crew_type,
    }));
  }

  /**
   * Get material shipments for a specific day
   */
  private async getMaterialsForDay(
    jobsiteId: string,
    date: Date
  ): Promise<MaterialReportPG[]> {
    const materials = await db
      .selectFrom("fact_material_shipment")
      .innerJoin(
        "dim_jobsite_material",
        "dim_jobsite_material.id",
        "fact_material_shipment.jobsite_material_id"
      )
      .innerJoin(
        "dim_material",
        "dim_material.id",
        "dim_jobsite_material.material_id"
      )
      .innerJoin(
        "dim_company",
        "dim_company.id",
        "dim_jobsite_material.supplier_id"
      )
      .select([
        "fact_material_shipment.id",
        "dim_material.name as material_name",
        "dim_company.name as supplier_name",
        "fact_material_shipment.quantity",
        "fact_material_shipment.unit",
        "fact_material_shipment.rate",
        "fact_material_shipment.total_cost",
        "fact_material_shipment.estimated",
        "fact_material_shipment.crew_type",
      ])
      .where("fact_material_shipment.jobsite_id", "=", jobsiteId)
      .where("fact_material_shipment.work_date", "=", date)
      .where("fact_material_shipment.archived_at", "is", null)
      .execute();

    return materials.map((m) => ({
      id: m.id,
      materialName: m.material_name,
      supplierName: m.supplier_name,
      quantity: Number(m.quantity),
      unit: m.unit,
      rate: Number(m.rate),
      cost: Number(m.total_cost || 0),
      estimated: m.estimated,
      crewType: m.crew_type,
    }));
  }

  /**
   * Get non-costed materials for a specific day
   */
  private async getNonCostedMaterialsForDay(
    jobsiteId: string,
    date: Date
  ): Promise<NonCostedMaterialReportPG[]> {
    const materials = await db
      .selectFrom("fact_non_costed_material")
      .select([
        "id",
        "material_name",
        "supplier_name",
        "quantity",
        "unit",
        "crew_type",
      ])
      .where("jobsite_id", "=", jobsiteId)
      .where("work_date", "=", date)
      .where("archived_at", "is", null)
      .execute();

    return materials.map((m) => ({
      id: m.id,
      materialName: m.material_name,
      supplierName: m.supplier_name,
      quantity: Number(m.quantity),
      unit: m.unit || undefined,
      crewType: m.crew_type,
    }));
  }

  /**
   * Get trucking for a specific day
   */
  private async getTruckingForDay(
    jobsiteId: string,
    date: Date
  ): Promise<TruckingReportPG[]> {
    const trucking = await db
      .selectFrom("fact_trucking")
      .select([
        "id",
        "trucking_type",
        "quantity",
        "hours",
        "rate",
        "rate_type",
        "total_cost",
        "crew_type",
      ])
      .where("jobsite_id", "=", jobsiteId)
      .where("work_date", "=", date)
      .where("archived_at", "is", null)
      .execute();

    return trucking.map((t) => ({
      id: t.id,
      truckingType: t.trucking_type,
      quantity: Number(t.quantity),
      hours: t.hours ? Number(t.hours) : undefined,
      rate: Number(t.rate),
      rateType: t.rate_type,
      cost: Number(t.total_cost),
      crewType: t.crew_type,
    }));
  }

  /**
   * Calculate summary from day data
   */
  private calculateSummary(
    employees: EmployeeReportPG[],
    vehicles: VehicleReportPG[],
    materials: MaterialReportPG[],
    nonCostedMaterials: NonCostedMaterialReportPG[],
    trucking: TruckingReportPG[]
  ): OnSiteSummaryPG {
    // Get all crew types
    const crewTypes = [
      ...new Set([
        ...employees.map((e) => e.crewType),
        ...vehicles.map((v) => v.crewType),
        ...materials.map((m) => m.crewType),
        ...nonCostedMaterials.map((m) => m.crewType),
        ...trucking.map((t) => t.crewType),
      ]),
    ];

    // Calculate totals
    const totals = {
      employeeHours: employees.reduce((sum, e) => sum + e.hours, 0),
      employeeCost: employees.reduce((sum, e) => sum + e.cost, 0),
      vehicleHours: vehicles.reduce((sum, v) => sum + v.hours, 0),
      vehicleCost: vehicles.reduce((sum, v) => sum + v.cost, 0),
      materialQuantity: materials.reduce((sum, m) => sum + m.quantity, 0),
      materialCost: materials.reduce((sum, m) => sum + m.cost, 0),
      nonCostedMaterialQuantity: nonCostedMaterials.reduce(
        (sum, m) => sum + m.quantity,
        0
      ),
      truckingQuantity: trucking.reduce((sum, t) => sum + t.quantity, 0),
      truckingHours: trucking.reduce((sum, t) => sum + (t.hours || 0), 0),
      truckingCost: trucking.reduce((sum, t) => sum + t.cost, 0),
    };

    // Calculate crew type summaries
    const crewTypeSummaries: CrewTypeSummaryPG[] = crewTypes.map((crewType) => ({
      crewType,
      employeeHours: employees
        .filter((e) => e.crewType === crewType)
        .reduce((sum, e) => sum + e.hours, 0),
      employeeCost: employees
        .filter((e) => e.crewType === crewType)
        .reduce((sum, e) => sum + e.cost, 0),
      vehicleHours: vehicles
        .filter((v) => v.crewType === crewType)
        .reduce((sum, v) => sum + v.hours, 0),
      vehicleCost: vehicles
        .filter((v) => v.crewType === crewType)
        .reduce((sum, v) => sum + v.cost, 0),
      materialQuantity: materials
        .filter((m) => m.crewType === crewType)
        .reduce((sum, m) => sum + m.quantity, 0),
      materialCost: materials
        .filter((m) => m.crewType === crewType)
        .reduce((sum, m) => sum + m.cost, 0),
      nonCostedMaterialQuantity: nonCostedMaterials
        .filter((m) => m.crewType === crewType)
        .reduce((sum, m) => sum + m.quantity, 0),
      truckingQuantity: trucking
        .filter((t) => t.crewType === crewType)
        .reduce((sum, t) => sum + t.quantity, 0),
      truckingHours: trucking
        .filter((t) => t.crewType === crewType)
        .reduce((sum, t) => sum + (t.hours || 0), 0),
      truckingCost: trucking
        .filter((t) => t.crewType === crewType)
        .reduce((sum, t) => sum + t.cost, 0),
    }));

    return {
      ...totals,
      crewTypeSummaries,
    };
  }
}
