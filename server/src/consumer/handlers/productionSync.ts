/**
 * Production Sync Handler
 *
 * Syncs Production records to fact_production in PostgreSQL.
 * Production tracks what work was done (job title, quantity, unit, time range).
 */

import {
  DailyReport,
  Production,
  type DailyReportDocument,
  type ProductionDocument,
  type JobsiteDocument,
  type CrewDocument,
} from "@models";
import { db } from "../../db";
import { SyncHandler } from "./base";
import {
  upsertDimJobsite,
  upsertDimCrew,
  upsertDimDailyReport,
} from "./dimensions";

/** Context needed to sync a Production record to the fact table */
export interface ProductionSyncContext {
  production: ProductionDocument;
  dailyReport: DailyReportDocument & {
    jobsite: JobsiteDocument;
    crew: CrewDocument;
  };
  dailyReportId: string;
  jobsiteId: string;
  crewId: string;
}

/**
 * Sync handler for Production entities
 */
class ProductionSyncHandler extends SyncHandler<ProductionDocument> {
  readonly entityName = "Production";

  protected async fetchFromMongo(mongoId: string): Promise<ProductionDocument | null> {
    return Production.findById(mongoId).exec();
  }

  protected validate(_doc: ProductionDocument): boolean {
    // Production records are always valid if they exist
    return true;
  }

  protected async syncToPostgres(production: ProductionDocument): Promise<void> {
    // Find the parent DailyReport
    const dailyReport = await DailyReport.findOne({
      production: production._id,
    })
      .populate("jobsite")
      .populate("crew")
      .exec();

    if (!dailyReport) {
      console.warn(
        `[${this.entityName}Sync] No parent DailyReport found for Production ${production._id}`
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

    // Sync the fact record
    await upsertFactProduction({
      production,
      dailyReport: typedDailyReport,
      dailyReportId,
      jobsiteId,
      crewId,
    });
  }

  protected async handleDelete(mongoId: string): Promise<void> {
    // Delete the production fact record (no archive needed, just remove)
    await db
      .deleteFrom("fact_production")
      .where("mongo_id", "=", mongoId)
      .execute();
  }
}

/**
 * Upsert a fact_production record
 */
export async function upsertFactProduction(ctx: ProductionSyncContext): Promise<void> {
  const { production, dailyReport, dailyReportId, jobsiteId, crewId } = ctx;
  const mongoId = production._id.toString();
  const workDate = dailyReport.date;
  const crewType = (dailyReport as any).crew?.type || "Unknown";

  // Check if fact record exists
  const existing = await db
    .selectFrom("fact_production")
    .select("id")
    .where("mongo_id", "=", mongoId)
    .executeTakeFirst();

  const factData = {
    daily_report_id: dailyReportId,
    jobsite_id: jobsiteId,
    crew_id: crewId,
    crew_type: crewType,
    work_date: workDate,
    job_title: production.jobTitle,
    quantity: production.quantity.toString(),
    unit: production.unit,
    start_time: production.startTime,
    end_time: production.endTime,
    description: production.description || null,
    synced_at: new Date(),
  };

  if (existing) {
    await db
      .updateTable("fact_production")
      .set(factData)
      .where("id", "=", existing.id)
      .execute();
  } else {
    await db
      .insertInto("fact_production")
      .values({
        mongo_id: mongoId,
        ...factData,
      })
      .execute();
  }
}

// Export singleton instance
export const productionSyncHandler = new ProductionSyncHandler();
