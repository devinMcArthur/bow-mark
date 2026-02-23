/**
 * EmployeeWork Sync Handler
 *
 * When an EmployeeWork record is created/updated/deleted directly,
 * this handler syncs the change to fact_employee_work in PostgreSQL.
 *
 * This handles the case where a user edits an EmployeeWork entry
 * without modifying the parent DailyReport.
 */

import {
  DailyReport,
  EmployeeWork,
  type DailyReportDocument,
  type EmployeeWorkDocument,
  type EmployeeDocument,
  type JobsiteDocument,
  type CrewDocument,
} from "@models";
import { db } from "../../db";
import { SyncHandler } from "./base";
import {
  upsertDimJobsite,
  upsertDimCrew,
  upsertDimEmployee,
  upsertDimDailyReport,
  getEmployeeRateForDate,
} from "./dimensions";

/** EmployeeWork with required populated references */
type PopulatedEmployeeWork = EmployeeWorkDocument & {
  employee: EmployeeDocument;
};

/** Context needed to sync an EmployeeWork to the fact table */
export interface EmployeeWorkSyncContext {
  employeeWork: PopulatedEmployeeWork;
  dailyReport: DailyReportDocument;
  dailyReportId: string;
  jobsiteId: string;
  crewId: string;
  employeeId: string;
}

/**
 * Sync handler for EmployeeWork entities
 */
class EmployeeWorkSyncHandler extends SyncHandler<PopulatedEmployeeWork> {
  readonly entityName = "EmployeeWork";

  protected async fetchFromMongo(mongoId: string): Promise<PopulatedEmployeeWork | null> {
    const doc = await EmployeeWork.findById(mongoId)
      .populate("employee")
      .exec();

    return doc as PopulatedEmployeeWork | null;
  }

  protected validate(doc: PopulatedEmployeeWork): boolean {
    if (!doc.employee) {
      console.warn(`[${this.entityName}Sync] ${doc._id} missing employee reference`);
      return false;
    }
    return true;
  }

  protected async syncToPostgres(employeeWork: PopulatedEmployeeWork): Promise<void> {
    // Find the parent DailyReport that contains this EmployeeWork
    const dailyReport = await DailyReport.findOne({
      employeeWork: employeeWork._id,
    })
      .populate("jobsite")
      .populate("crew")
      .exec();

    if (!dailyReport) {
      console.warn(
        `[${this.entityName}Sync] No parent DailyReport found for EmployeeWork ${employeeWork._id}`
      );
      return;
    }

    if (!dailyReport.jobsite || !dailyReport.crew) {
      console.warn(
        `[${this.entityName}Sync] Parent DailyReport ${dailyReport._id} missing jobsite or crew`
      );
      return;
    }

    const typedDailyReport = dailyReport as DailyReportDocument & {
      jobsite: JobsiteDocument;
      crew: CrewDocument;
    };

    // Upsert dimension records
    const jobsiteId = await upsertDimJobsite(typedDailyReport.jobsite);
    const crewId = await upsertDimCrew(typedDailyReport.crew);
    const dailyReportId = await upsertDimDailyReport(typedDailyReport, jobsiteId, crewId);
    const employeeId = await upsertDimEmployee(employeeWork.employee);

    // Sync the fact record
    await upsertFactEmployeeWork({
      employeeWork,
      dailyReport: typedDailyReport,
      dailyReportId,
      jobsiteId,
      crewId,
      employeeId,
    });
  }

  protected async handleDelete(mongoId: string): Promise<void> {
    // Mark the fact record as archived
    const existing = await db
      .selectFrom("fact_employee_work")
      .select("id")
      .where("mongo_id", "=", mongoId)
      .executeTakeFirst();

    if (!existing) {
      console.log(`[${this.entityName}Sync] No fact_employee_work found for ${mongoId}`);
      return;
    }

    await db
      .updateTable("fact_employee_work")
      .set({ archived_at: new Date(), synced_at: new Date() })
      .where("id", "=", existing.id)
      .execute();
  }
}

/**
 * Upsert a fact_employee_work record
 *
 * This is the shared utility that can be used by both:
 * - EmployeeWorkSyncHandler (direct EmployeeWork updates)
 * - DailyReportSyncHandler (bulk sync of all EmployeeWork in a report)
 */
export async function upsertFactEmployeeWork(ctx: EmployeeWorkSyncContext): Promise<void> {
  const { employeeWork, dailyReport, dailyReportId, jobsiteId, crewId, employeeId } = ctx;
  const mongoId = employeeWork._id.toString();

  // Get the applicable rate for this work date
  const workDate = dailyReport.date;
  const hourlyRate = await getEmployeeRateForDate(employeeId, workDate);

  // Check if fact record exists
  const existing = await db
    .selectFrom("fact_employee_work")
    .select("id")
    .where("mongo_id", "=", mongoId)
    .executeTakeFirst();

  const factData = {
    daily_report_id: dailyReportId,
    jobsite_id: jobsiteId,
    employee_id: employeeId,
    crew_id: crewId,
    crew_type: (dailyReport as any).crew?.type || "Unknown",
    work_date: workDate,
    start_time: employeeWork.startTime,
    end_time: employeeWork.endTime,
    job_title: employeeWork.jobTitle,
    hourly_rate: hourlyRate.toString(),
    archived_at: employeeWork.archivedAt || null,
    synced_at: new Date(),
  };

  if (existing) {
    await db
      .updateTable("fact_employee_work")
      .set(factData)
      .where("id", "=", existing.id)
      .execute();
  } else {
    await db
      .insertInto("fact_employee_work")
      .values({
        mongo_id: mongoId,
        ...factData,
      })
      .execute();
  }
}

// Export singleton instance
export const employeeWorkSyncHandler = new EmployeeWorkSyncHandler();
