/**
 * Daily Report Sync Handler
 *
 * When a DailyReport is created/updated, this handler:
 * 1. Fetches the full DailyReport with populated references
 * 2. Upserts dimension records (jobsite, crew, employees)
 * 3. Upserts fact_employee_work records for each EmployeeWork entry
 *
 * This transforms the MongoDB document structure into the PostgreSQL
 * star schema optimized for reporting queries.
 */

import {
  DailyReport,
  EmployeeWork,
  VehicleWork,
  type DailyReportDocument,
  type EmployeeWorkDocument,
  type VehicleWorkDocument,
  type EmployeeDocument,
  type VehicleDocument,
  type JobsiteDocument,
  type CrewDocument,
} from "@models";
import { db } from "../../db";
import { SyncHandler } from "./base";
import {
  upsertDimJobsite,
  upsertDimCrew,
  upsertDimEmployee,
  upsertDimVehicle,
  upsertDimDailyReport,
} from "./dimensions";
import { upsertFactEmployeeWork } from "./employeeWorkSync";
import { upsertFactVehicleWork } from "./vehicleWorkSync";

/** DailyReport with required populated references */
type PopulatedDailyReport = DailyReportDocument & {
  jobsite: JobsiteDocument;
  crew: CrewDocument;
};

/**
 * Sync handler for DailyReport entities
 */
class DailyReportSyncHandler extends SyncHandler<PopulatedDailyReport> {
  readonly entityName = "DailyReport";

  protected async fetchFromMongo(mongoId: string): Promise<PopulatedDailyReport | null> {
    const doc = await DailyReport.findById(mongoId)
      .populate("jobsite")
      .populate("crew")
      .exec();

    return doc as PopulatedDailyReport | null;
  }

  protected validate(doc: PopulatedDailyReport): boolean {
    if (!doc.jobsite || !doc.crew) {
      console.warn(
        `[${this.entityName}Sync] ${doc._id} missing jobsite or crew reference`
      );
      return false;
    }
    return true;
  }

  protected async syncToPostgres(dailyReport: PopulatedDailyReport): Promise<void> {
    // 1. Upsert dimension records
    const jobsiteId = await upsertDimJobsite(dailyReport.jobsite);
    const crewId = await upsertDimCrew(dailyReport.crew);
    const dailyReportId = await upsertDimDailyReport(dailyReport, jobsiteId, crewId);

    // 2. Sync EmployeeWork records
    await this.syncEmployeeWorks(dailyReport, dailyReportId, jobsiteId, crewId);

    // 3. Sync VehicleWork records
    await this.syncVehicleWorks(dailyReport, dailyReportId, jobsiteId, crewId);
  }

  private async syncEmployeeWorks(
    dailyReport: PopulatedDailyReport,
    dailyReportId: string,
    jobsiteId: string,
    crewId: string
  ): Promise<void> {
    const employeeWorkIds = dailyReport.employeeWork || [];

    if (employeeWorkIds.length === 0) {
      await this.archiveOrphanedFacts("fact_employee_work", dailyReportId, []);
      return;
    }

    const employeeWorks = await EmployeeWork.find({
      _id: { $in: employeeWorkIds },
    })
      .populate("employee")
      .exec();

    const syncedMongoIds: string[] = [];

    for (const ew of employeeWorks) {
      if (!ew.employee) {
        console.warn(`[${this.entityName}Sync] EmployeeWork ${ew._id} missing employee reference`);
        continue;
      }

      try {
        const typedEw = ew as EmployeeWorkDocument & { employee: EmployeeDocument };
        const employeeId = await upsertDimEmployee(typedEw.employee);

        await upsertFactEmployeeWork({
          employeeWork: typedEw,
          dailyReport,
          dailyReportId,
          jobsiteId,
          crewId,
          employeeId,
        });
        syncedMongoIds.push(ew._id.toString());
      } catch (error) {
        console.error(`[${this.entityName}Sync] Failed to sync EmployeeWork ${ew._id}:`, error);
      }
    }

    await this.archiveOrphanedFacts("fact_employee_work", dailyReportId, syncedMongoIds);
  }

  private async syncVehicleWorks(
    dailyReport: PopulatedDailyReport,
    dailyReportId: string,
    jobsiteId: string,
    crewId: string
  ): Promise<void> {
    const vehicleWorkIds = dailyReport.vehicleWork || [];

    if (vehicleWorkIds.length === 0) {
      await this.archiveOrphanedFacts("fact_vehicle_work", dailyReportId, []);
      return;
    }

    const vehicleWorks = await VehicleWork.find({
      _id: { $in: vehicleWorkIds },
    })
      .populate("vehicle")
      .exec();

    const syncedMongoIds: string[] = [];

    for (const vw of vehicleWorks) {
      if (!vw.vehicle) {
        console.warn(`[${this.entityName}Sync] VehicleWork ${vw._id} missing vehicle reference`);
        continue;
      }

      try {
        const typedVw = vw as VehicleWorkDocument & { vehicle: VehicleDocument };
        const vehicleId = await upsertDimVehicle(typedVw.vehicle);

        await upsertFactVehicleWork({
          vehicleWork: typedVw,
          dailyReport,
          dailyReportId,
          jobsiteId,
          crewId,
          vehicleId,
        });
        syncedMongoIds.push(vw._id.toString());
      } catch (error) {
        console.error(`[${this.entityName}Sync] Failed to sync VehicleWork ${vw._id}:`, error);
      }
    }

    await this.archiveOrphanedFacts("fact_vehicle_work", dailyReportId, syncedMongoIds);
  }

  protected async handleDelete(mongoId: string): Promise<void> {
    // Find the dim_daily_report record
    const dailyReport = await db
      .selectFrom("dim_daily_report")
      .select("id")
      .where("mongo_id", "=", mongoId)
      .executeTakeFirst();

    if (!dailyReport) {
      console.log(`[${this.entityName}Sync] No dim_daily_report found for ${mongoId}`);
      return;
    }

    // Mark daily report as archived
    await db
      .updateTable("dim_daily_report")
      .set({ archived: true, synced_at: new Date() })
      .where("id", "=", dailyReport.id)
      .execute();

    // Mark all fact records as archived
    await db
      .updateTable("fact_employee_work")
      .set({ archived_at: new Date(), synced_at: new Date() })
      .where("daily_report_id", "=", dailyReport.id)
      .execute();

    await db
      .updateTable("fact_vehicle_work")
      .set({ archived_at: new Date(), synced_at: new Date() })
      .where("daily_report_id", "=", dailyReport.id)
      .execute();

    console.log(`[${this.entityName}Sync] Archived DailyReport ${mongoId} and its facts`);
  }

  // ---------------------------------------------------------------------------
  // Private helper methods
  // ---------------------------------------------------------------------------

  /**
   * Archive fact records that are no longer in the DailyReport
   */
  private async archiveOrphanedFacts(
    tableName: "fact_employee_work" | "fact_vehicle_work",
    dailyReportId: string,
    validMongoIds: string[]
  ): Promise<void> {
    if (validMongoIds.length === 0) {
      await db
        .updateTable(tableName)
        .set({ archived_at: new Date(), synced_at: new Date() })
        .where("daily_report_id", "=", dailyReportId)
        .where("archived_at", "is", null)
        .execute();
      return;
    }

    await db
      .updateTable(tableName)
      .set({ archived_at: new Date(), synced_at: new Date() })
      .where("daily_report_id", "=", dailyReportId)
      .where("archived_at", "is", null)
      .where("mongo_id", "not in", validMongoIds)
      .execute();
  }
}

// Export singleton instance
export const dailyReportSyncHandler = new DailyReportSyncHandler();
