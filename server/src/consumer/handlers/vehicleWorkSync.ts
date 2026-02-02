/**
 * VehicleWork Sync Handler
 *
 * When a VehicleWork record is created/updated/deleted directly,
 * this handler syncs the change to fact_vehicle_work in PostgreSQL.
 */

import {
  DailyReport,
  VehicleWork,
  type DailyReportDocument,
  type VehicleWorkDocument,
  type VehicleDocument,
  type JobsiteDocument,
  type CrewDocument,
} from "@models";
import { db } from "../../db";
import { SyncHandler } from "./base";
import {
  upsertDimJobsite,
  upsertDimCrew,
  upsertDimVehicle,
  upsertDimDailyReport,
  getVehicleRateForDate,
} from "./dimensions";

/** VehicleWork with required populated references */
type PopulatedVehicleWork = VehicleWorkDocument & {
  vehicle: VehicleDocument;
};

/** Context needed to sync a VehicleWork to the fact table */
export interface VehicleWorkSyncContext {
  vehicleWork: PopulatedVehicleWork;
  dailyReport: DailyReportDocument & { crew: CrewDocument };
  dailyReportId: string;
  jobsiteId: string;
  crewId: string;
  vehicleId: string;
}

/**
 * Sync handler for VehicleWork entities
 */
class VehicleWorkSyncHandler extends SyncHandler<PopulatedVehicleWork> {
  readonly entityName = "VehicleWork";

  protected async fetchFromMongo(mongoId: string): Promise<PopulatedVehicleWork | null> {
    const doc = await VehicleWork.findById(mongoId)
      .populate("vehicle")
      .exec();

    return doc as PopulatedVehicleWork | null;
  }

  protected validate(doc: PopulatedVehicleWork): boolean {
    if (!doc.vehicle) {
      console.warn(`[${this.entityName}Sync] ${doc._id} missing vehicle reference`);
      return false;
    }
    return true;
  }

  protected async syncToPostgres(vehicleWork: PopulatedVehicleWork): Promise<void> {
    // Find the parent DailyReport that contains this VehicleWork
    const dailyReport = await DailyReport.findOne({
      vehicleWork: vehicleWork._id,
    })
      .populate("jobsite")
      .populate("crew")
      .exec();

    if (!dailyReport) {
      console.warn(
        `[${this.entityName}Sync] No parent DailyReport found for VehicleWork ${vehicleWork._id}`
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
    const vehicleId = await upsertDimVehicle(vehicleWork.vehicle);

    // Sync the fact record
    await upsertFactVehicleWork({
      vehicleWork,
      dailyReport: typedDailyReport,
      dailyReportId,
      jobsiteId,
      crewId,
      vehicleId,
    });
  }

  protected async handleDelete(mongoId: string): Promise<void> {
    const existing = await db
      .selectFrom("fact_vehicle_work")
      .select("id")
      .where("mongo_id", "=", mongoId)
      .executeTakeFirst();

    if (!existing) {
      console.log(`[${this.entityName}Sync] No fact_vehicle_work found for ${mongoId}`);
      return;
    }

    await db
      .updateTable("fact_vehicle_work")
      .set({ archived_at: new Date(), synced_at: new Date() })
      .where("id", "=", existing.id)
      .execute();
  }
}

/**
 * Upsert a fact_vehicle_work record
 *
 * Shared utility for both VehicleWorkSyncHandler and DailyReportSyncHandler.
 */
export async function upsertFactVehicleWork(ctx: VehicleWorkSyncContext): Promise<void> {
  const { vehicleWork, dailyReport, dailyReportId, jobsiteId, crewId, vehicleId } = ctx;
  const mongoId = vehicleWork._id.toString();

  // Get the applicable rate for this work date
  const workDate = dailyReport.date;
  const hourlyRate = await getVehicleRateForDate(vehicleId, workDate);

  // Check if fact record exists
  const existing = await db
    .selectFrom("fact_vehicle_work")
    .select("id")
    .where("mongo_id", "=", mongoId)
    .executeTakeFirst();

  const factData = {
    daily_report_id: dailyReportId,
    jobsite_id: jobsiteId,
    vehicle_id: vehicleId,
    crew_id: crewId,
    crew_type: dailyReport.crew.type,
    work_date: workDate,
    job_title: vehicleWork.jobTitle || null,
    hours: vehicleWork.hours.toString(),
    hourly_rate: hourlyRate.toString(),
    archived_at: vehicleWork.archivedAt || null,
    synced_at: new Date(),
  };

  if (existing) {
    await db
      .updateTable("fact_vehicle_work")
      .set(factData)
      .where("id", "=", existing.id)
      .execute();
  } else {
    await db
      .insertInto("fact_vehicle_work")
      .values({
        mongo_id: mongoId,
        ...factData,
      })
      .execute();
  }
}

// Export singleton instance
export const vehicleWorkSyncHandler = new VehicleWorkSyncHandler();
