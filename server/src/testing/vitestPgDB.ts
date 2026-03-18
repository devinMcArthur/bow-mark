import { db } from "../db";

/**
 * Truncates all PostgreSQL tables in dependency-safe order.
 * Fact tables are deleted first (they reference dimension tables via FKs),
 * then dimension tables are deleted.
 *
 * Call this in a beforeEach hook for consumer sync tests (Layer 2) and
 * report query tests (Layer 3) to ensure a clean slate between tests.
 */
export async function truncateAllPgTables(): Promise<void> {
  // Fact tables first — they hold FK references to dimension tables
  const factTables = [
    "fact_employee_work",
    "fact_vehicle_work",
    "fact_material_shipment",
    "fact_non_costed_material",
    "fact_trucking",
    "fact_production",
    "fact_invoice",
  ] as const;

  for (const table of factTables) {
    await db.deleteFrom(table as any).execute();
  }

  // Dimension tables — ordered to respect FK chains within dims
  // (dim_jobsite_material_rate → dim_jobsite_material → dim_jobsite / dim_material)
  // (dim_employee_rate → dim_employee)
  // (dim_vehicle_rate → dim_vehicle)
  // (dim_daily_report → dim_crew + dim_jobsite)
  const dimTables = [
    "dim_jobsite_material_rate",
    "dim_employee_rate",
    "dim_vehicle_rate",
    "dim_daily_report",
    "dim_jobsite_material",
    "dim_employee",
    "dim_vehicle",
    "dim_jobsite",
    "dim_material",
    "dim_company",
    "dim_crew",
  ] as const;

  for (const table of dimTables) {
    await db.deleteFrom(table as any).execute();
  }
}
