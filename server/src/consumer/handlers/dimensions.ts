/**
 * Dimension table upsert helpers
 *
 * These functions ensure dimension records exist in PostgreSQL
 * before inserting fact records. They follow an "upsert" pattern:
 * - If record exists (by mongo_id), update it
 * - If not, insert it
 *
 * Returns the PostgreSQL ID for use as foreign key in fact tables.
 */

import { db } from "../../db";
import type {
  CrewDocument,
  EmployeeDocument,
  JobsiteDocument,
  DailyReportDocument,
  VehicleDocument,
} from "@models";

/**
 * Upsert a jobsite dimension record
 * @returns PostgreSQL id for the jobsite
 */
export async function upsertDimJobsite(
  jobsite: JobsiteDocument
): Promise<string> {
  const mongoId = jobsite._id.toString();

  // Check if exists
  const existing = await db
    .selectFrom("dim_jobsite")
    .select("id")
    .where("mongo_id", "=", mongoId)
    .executeTakeFirst();

  if (existing) {
    // Update existing record
    await db
      .updateTable("dim_jobsite")
      .set({
        name: jobsite.name,
        jobcode: jobsite.jobcode || null,
        active: jobsite.active,
        archived_at: jobsite.archivedAt || null,
        synced_at: new Date(),
      })
      .where("id", "=", existing.id)
      .execute();

    return existing.id;
  }

  // Insert new record
  const result = await db
    .insertInto("dim_jobsite")
    .values({
      mongo_id: mongoId,
      name: jobsite.name,
      jobcode: jobsite.jobcode || null,
      active: jobsite.active,
      archived_at: jobsite.archivedAt || null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return result.id;
}

/**
 * Upsert a crew dimension record
 * @returns PostgreSQL id for the crew
 */
export async function upsertDimCrew(crew: CrewDocument): Promise<string> {
  const mongoId = crew._id.toString();

  const existing = await db
    .selectFrom("dim_crew")
    .select("id")
    .where("mongo_id", "=", mongoId)
    .executeTakeFirst();

  if (existing) {
    await db
      .updateTable("dim_crew")
      .set({
        name: crew.name,
        type: crew.type,
        synced_at: new Date(),
      })
      .where("id", "=", existing.id)
      .execute();

    return existing.id;
  }

  const result = await db
    .insertInto("dim_crew")
    .values({
      mongo_id: mongoId,
      name: crew.name,
      type: crew.type,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return result.id;
}

/**
 * Upsert an employee dimension record
 * @returns PostgreSQL id for the employee
 */
export async function upsertDimEmployee(
  employee: EmployeeDocument
): Promise<string> {
  const mongoId = employee._id.toString();

  const existing = await db
    .selectFrom("dim_employee")
    .select("id")
    .where("mongo_id", "=", mongoId)
    .executeTakeFirst();

  if (existing) {
    await db
      .updateTable("dim_employee")
      .set({
        name: employee.name,
        job_title: employee.jobTitle || null,
        archived_at: employee.archivedAt || null,
        synced_at: new Date(),
      })
      .where("id", "=", existing.id)
      .execute();

    // Sync rates for this employee
    await syncEmployeeRates(existing.id, employee);

    return existing.id;
  }

  const result = await db
    .insertInto("dim_employee")
    .values({
      mongo_id: mongoId,
      name: employee.name,
      job_title: employee.jobTitle || null,
      archived_at: employee.archivedAt || null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  // Sync rates for new employee
  await syncEmployeeRates(result.id, employee);

  return result.id;
}

/**
 * Sync employee rates (SCD Type 2 - keep all historical rates)
 *
 * For simplicity, we delete and re-insert all rates.
 * This is safe because rates are append-only in the source.
 */
async function syncEmployeeRates(
  employeeId: string,
  employee: EmployeeDocument
): Promise<void> {
  if (!employee.rates || employee.rates.length === 0) {
    return;
  }

  // Delete existing rates for this employee
  await db
    .deleteFrom("dim_employee_rate")
    .where("employee_id", "=", employeeId)
    .execute();

  // Insert all rates
  const rateValues = employee.rates.map((r) => ({
    employee_id: employeeId,
    rate: r.rate.toString(), // Numeric type expects string
    effective_date: r.date,
  }));

  if (rateValues.length > 0) {
    await db.insertInto("dim_employee_rate").values(rateValues).execute();
  }
}

/**
 * Get the applicable hourly rate for an employee on a given date
 *
 * Finds the most recent rate that was effective on or before the given date.
 * If no rate is found, returns 0.
 */
export async function getEmployeeRateForDate(
  employeeId: string,
  date: Date
): Promise<number> {
  const result = await db
    .selectFrom("dim_employee_rate")
    .select("rate")
    .where("employee_id", "=", employeeId)
    .where("effective_date", "<=", date)
    .orderBy("effective_date", "desc")
    .limit(1)
    .executeTakeFirst();

  return result ? parseFloat(result.rate) : 0;
}

/**
 * Upsert a daily report dimension record
 * @returns PostgreSQL id for the daily report
 */
export async function upsertDimDailyReport(
  dailyReport: DailyReportDocument,
  jobsiteId: string,
  crewId: string
): Promise<string> {
  const mongoId = dailyReport._id.toString();

  const existing = await db
    .selectFrom("dim_daily_report")
    .select("id")
    .where("mongo_id", "=", mongoId)
    .executeTakeFirst();

  if (existing) {
    await db
      .updateTable("dim_daily_report")
      .set({
        jobsite_id: jobsiteId,
        crew_id: crewId,
        report_date: dailyReport.date,
        approved: dailyReport.approved,
        payroll_complete: dailyReport.payrollComplete,
        archived: dailyReport.archived,
        synced_at: new Date(),
      })
      .where("id", "=", existing.id)
      .execute();

    return existing.id;
  }

  const result = await db
    .insertInto("dim_daily_report")
    .values({
      mongo_id: mongoId,
      jobsite_id: jobsiteId,
      crew_id: crewId,
      report_date: dailyReport.date,
      approved: dailyReport.approved,
      payroll_complete: dailyReport.payrollComplete,
      archived: dailyReport.archived,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return result.id;
}

/**
 * Upsert a vehicle dimension record
 * @returns PostgreSQL id for the vehicle
 */
export async function upsertDimVehicle(
  vehicle: VehicleDocument
): Promise<string> {
  const mongoId = vehicle._id.toString();

  const existing = await db
    .selectFrom("dim_vehicle")
    .select("id")
    .where("mongo_id", "=", mongoId)
    .executeTakeFirst();

  if (existing) {
    await db
      .updateTable("dim_vehicle")
      .set({
        name: vehicle.name,
        vehicle_code: vehicle.vehicleCode,
        vehicle_type: vehicle.vehicleType,
        is_rental: vehicle.rental,
        source_company: vehicle.sourceCompany,
        archived_at: vehicle.archivedAt || null,
        synced_at: new Date(),
      })
      .where("id", "=", existing.id)
      .execute();

    // Sync rates for this vehicle
    await syncVehicleRates(existing.id, vehicle);

    return existing.id;
  }

  const result = await db
    .insertInto("dim_vehicle")
    .values({
      mongo_id: mongoId,
      name: vehicle.name,
      vehicle_code: vehicle.vehicleCode,
      vehicle_type: vehicle.vehicleType,
      is_rental: vehicle.rental,
      source_company: vehicle.sourceCompany,
      archived_at: vehicle.archivedAt || null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  // Sync rates for new vehicle
  await syncVehicleRates(result.id, vehicle);

  return result.id;
}

/**
 * Sync vehicle rates (SCD Type 2 - keep all historical rates)
 */
async function syncVehicleRates(
  vehicleId: string,
  vehicle: VehicleDocument
): Promise<void> {
  if (!vehicle.rates || vehicle.rates.length === 0) {
    return;
  }

  // Delete existing rates for this vehicle
  await db
    .deleteFrom("dim_vehicle_rate")
    .where("vehicle_id", "=", vehicleId)
    .execute();

  // Insert all rates
  const rateValues = vehicle.rates.map((r) => ({
    vehicle_id: vehicleId,
    rate: r.rate.toString(),
    effective_date: r.date,
  }));

  if (rateValues.length > 0) {
    await db.insertInto("dim_vehicle_rate").values(rateValues).execute();
  }
}

/**
 * Get the applicable hourly rate for a vehicle on a given date
 */
export async function getVehicleRateForDate(
  vehicleId: string,
  date: Date
): Promise<number> {
  const result = await db
    .selectFrom("dim_vehicle_rate")
    .select("rate")
    .where("vehicle_id", "=", vehicleId)
    .where("effective_date", "<=", date)
    .orderBy("effective_date", "desc")
    .limit(1)
    .executeTakeFirst();

  return result ? parseFloat(result.rate) : 0;
}
