/**
 * MaterialShipment Sync Handler
 *
 * Syncs MaterialShipment records to fact_material_shipment in PostgreSQL.
 * Also handles trucking records (fact_trucking) when a shipment has trucking info.
 */

import {
  DailyReport,
  MaterialShipment,
  JobsiteMaterial,
  type DailyReportDocument,
  type MaterialShipmentDocument,
  type JobsiteDocument,
  type CrewDocument,
  type JobsiteMaterialDocument,
  type MaterialDocument,
  type CompanyDocument,
} from "@models";
import { db } from "../../db";
import { SyncHandler } from "./base";
import {
  upsertDimJobsite,
  upsertDimCrew,
  upsertDimDailyReport,
  upsertDimMaterial,
  upsertDimCompany,
  upsertDimJobsiteMaterial,
  getJobsiteMaterialRateForDate,
} from "./dimensions";

/** MaterialShipment with required populated references */
type PopulatedMaterialShipment = MaterialShipmentDocument & {
  jobsiteMaterial?: JobsiteMaterialDocument & {
    material: MaterialDocument;
    supplier: CompanyDocument;
  };
};

/** Context needed to sync a MaterialShipment to the fact table */
export interface MaterialShipmentSyncContext {
  materialShipment: PopulatedMaterialShipment;
  dailyReport: DailyReportDocument & {
    jobsite: JobsiteDocument;
    crew: CrewDocument;
  };
  dailyReportId: string;
  jobsiteId: string;
  crewId: string;
}

/**
 * Sync handler for MaterialShipment entities
 */
class MaterialShipmentSyncHandler extends SyncHandler<PopulatedMaterialShipment> {
  readonly entityName = "MaterialShipment";

  protected async fetchFromMongo(mongoId: string): Promise<PopulatedMaterialShipment | null> {
    const doc = await MaterialShipment.findById(mongoId)
      .populate({
        path: "jobsiteMaterial",
        populate: [
          { path: "material" },
          { path: "supplier" },
        ],
      })
      .exec();

    return doc as PopulatedMaterialShipment | null;
  }

  protected validate(doc: PopulatedMaterialShipment): boolean {
    // MaterialShipments can exist without a jobsiteMaterial (noJobsiteMaterial=true)
    // In that case they become NonCostedMaterial records
    return true;
  }

  protected async syncToPostgres(materialShipment: PopulatedMaterialShipment): Promise<void> {
    // Find the parent DailyReport
    const dailyReport = await DailyReport.findOne({
      materialShipment: materialShipment._id,
    })
      .populate("jobsite")
      .populate("crew")
      .exec();

    if (!dailyReport) {
      console.warn(
        `[${this.entityName}Sync] No parent DailyReport found for MaterialShipment ${materialShipment._id}`
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

    // Sync the fact record(s)
    await upsertFactMaterialShipment({
      materialShipment,
      dailyReport: typedDailyReport,
      dailyReportId,
      jobsiteId,
      crewId,
    });
  }

  protected async handleDelete(mongoId: string): Promise<void> {
    // Archive the material shipment fact record
    const existing = await db
      .selectFrom("fact_material_shipment")
      .select("id")
      .where("mongo_id", "=", mongoId)
      .executeTakeFirst();

    if (existing) {
      await db
        .updateTable("fact_material_shipment")
        .set({ archived_at: new Date(), synced_at: new Date() })
        .where("id", "=", existing.id)
        .execute();
    }

    // Also archive any related trucking record
    const truckingExisting = await db
      .selectFrom("fact_trucking")
      .select("id")
      .where("mongo_id", "=", mongoId)
      .executeTakeFirst();

    if (truckingExisting) {
      await db
        .updateTable("fact_trucking")
        .set({ archived_at: new Date(), synced_at: new Date() })
        .where("id", "=", truckingExisting.id)
        .execute();
    }
  }
}

/**
 * Upsert a fact_material_shipment record
 *
 * This handles:
 * - Costed materials (noJobsiteMaterial=false) -> fact_material_shipment
 * - Non-costed materials (noJobsiteMaterial=true) -> fact_non_costed_material
 * - Trucking (if vehicleObject.truckingRateId exists) -> fact_trucking
 */
export async function upsertFactMaterialShipment(ctx: MaterialShipmentSyncContext): Promise<void> {
  const { materialShipment, dailyReport, dailyReportId, jobsiteId, crewId } = ctx;
  const mongoId = materialShipment._id.toString();
  const workDate = dailyReport.date;
  const crewType = (dailyReport as any).crew?.type || "Unknown";

  // Handle non-costed materials separately
  if (materialShipment.noJobsiteMaterial) {
    await upsertFactNonCostedMaterial(ctx);
    return;
  }

  // For costed materials, we need the jobsiteMaterial
  if (!materialShipment.jobsiteMaterial) {
    console.warn(`[MaterialShipmentSync] ${mongoId} missing jobsiteMaterial reference`);
    return;
  }

  const jobsiteMaterial = materialShipment.jobsiteMaterial;

  if (!jobsiteMaterial.material || !jobsiteMaterial.supplier) {
    // Need to fetch with populated refs
    const fullJobsiteMaterial = await JobsiteMaterial.findById(jobsiteMaterial._id)
      .populate("material")
      .populate("supplier")
      .exec();

    if (!fullJobsiteMaterial || !fullJobsiteMaterial.material || !fullJobsiteMaterial.supplier) {
      console.warn(`[MaterialShipmentSync] ${mongoId} jobsiteMaterial missing material or supplier`);
      return;
    }

    // Update the reference
    (materialShipment as any).jobsiteMaterial = fullJobsiteMaterial;
  }

  const populatedJobsiteMaterial = materialShipment.jobsiteMaterial as JobsiteMaterialDocument & {
    material: MaterialDocument;
    supplier: CompanyDocument;
  };

  // Upsert material and company dimensions
  const materialId = await upsertDimMaterial(populatedJobsiteMaterial.material);
  const supplierId = await upsertDimCompany(populatedJobsiteMaterial.supplier);
  const jobsiteMaterialId = await upsertDimJobsiteMaterial(
    populatedJobsiteMaterial,
    jobsiteId,
    materialId,
    supplierId
  );

  // Get the rate for this date
  const deliveredRateId = materialShipment.vehicleObject?.deliveredRateId?.toString();
  const { rate, estimated } = await getJobsiteMaterialRateForDate(
    jobsiteMaterialId,
    workDate,
    deliveredRateId
  );

  // Check if fact record exists
  const existing = await db
    .selectFrom("fact_material_shipment")
    .select("id")
    .where("mongo_id", "=", mongoId)
    .executeTakeFirst();

  const factData = {
    daily_report_id: dailyReportId,
    jobsite_id: jobsiteId,
    jobsite_material_id: jobsiteMaterialId,
    crew_id: crewId,
    crew_type: crewType,
    work_date: workDate,
    quantity: materialShipment.quantity.toString(),
    unit: populatedJobsiteMaterial.unit,
    rate: rate.toString(),
    estimated,
    delivered_rate_id: deliveredRateId || null,
    archived_at: materialShipment.archivedAt || null,
    synced_at: new Date(),
  };

  if (existing) {
    await db
      .updateTable("fact_material_shipment")
      .set(factData)
      .where("id", "=", existing.id)
      .execute();
  } else {
    await db
      .insertInto("fact_material_shipment")
      .values({
        mongo_id: mongoId,
        ...factData,
      })
      .execute();
  }

  // Handle trucking if applicable
  if (materialShipment.vehicleObject?.truckingRateId) {
    await upsertFactTrucking(ctx, dailyReport.jobsite as JobsiteDocument);
  }
}

/**
 * Upsert a fact_non_costed_material record
 */
async function upsertFactNonCostedMaterial(ctx: MaterialShipmentSyncContext): Promise<void> {
  const { materialShipment, dailyReport, dailyReportId, jobsiteId, crewId } = ctx;
  const mongoId = materialShipment._id.toString();
  const workDate = dailyReport.date;
  const crewType = (dailyReport as any).crew?.type || "Unknown";

  const existing = await db
    .selectFrom("fact_non_costed_material")
    .select("id")
    .where("mongo_id", "=", mongoId)
    .executeTakeFirst();

  const factData = {
    daily_report_id: dailyReportId,
    jobsite_id: jobsiteId,
    crew_id: crewId,
    crew_type: crewType,
    work_date: workDate,
    material_name: materialShipment.shipmentType || "Unknown",
    supplier_name: materialShipment.supplier || "Unknown",
    quantity: materialShipment.quantity.toString(),
    unit: materialShipment.unit || "unit",
    archived_at: materialShipment.archivedAt || null,
    synced_at: new Date(),
  };

  if (existing) {
    await db
      .updateTable("fact_non_costed_material")
      .set(factData)
      .where("id", "=", existing.id)
      .execute();
  } else {
    await db
      .insertInto("fact_non_costed_material")
      .values({
        mongo_id: mongoId,
        ...factData,
      })
      .execute();
  }
}

/**
 * Upsert a fact_trucking record for a material shipment
 */
async function upsertFactTrucking(
  ctx: MaterialShipmentSyncContext,
  jobsite: JobsiteDocument
): Promise<void> {
  const { materialShipment, dailyReport, dailyReportId, jobsiteId, crewId } = ctx;
  const mongoId = materialShipment._id.toString();
  const workDate = dailyReport.date;
  const crewType = (dailyReport as any).crew?.type || "Unknown";

  const vehicleObject = materialShipment.vehicleObject;
  if (!vehicleObject?.truckingRateId) return;

  // Find the trucking rate on the jobsite
  const truckingRate = jobsite.truckingRates?.find(
    (rate) => rate._id?.toString() === vehicleObject.truckingRateId?.toString()
  );

  if (!truckingRate) {
    console.warn(`[MaterialShipmentSync] Trucking rate ${vehicleObject.truckingRateId} not found on jobsite`);
    return;
  }

  // Get the applicable rate for the date
  const getRateForDate = (truckingRate: any, date: Date) => {
    if (!truckingRate.rates || truckingRate.rates.length === 0) {
      return null;
    }

    // Sort rates by date descending and find the first one <= date
    const sortedRates = [...truckingRate.rates].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (const rate of sortedRates) {
      if (new Date(rate.date) <= date) {
        return rate;
      }
    }

    return sortedRates[sortedRates.length - 1]; // Return oldest if none found
  };

  const rateObj = getRateForDate(truckingRate, workDate);
  if (!rateObj) {
    console.warn(`[MaterialShipmentSync] No rate found for trucking rate ${truckingRate._id}`);
    return;
  }

  // Calculate hours if start/end time exists
  let hours: number | null = null;
  if (materialShipment.startTime && materialShipment.endTime) {
    const start = new Date(materialShipment.startTime).getTime();
    const end = new Date(materialShipment.endTime).getTime();
    hours = Math.abs(end - start) / (1000 * 60 * 60);
  }

  // Calculate total cost based on rate type
  let totalCost: number;
  if (rateObj.type === "quantity") {
    totalCost = materialShipment.quantity * rateObj.rate;
  } else {
    // hourly rate
    totalCost = (hours || 0) * rateObj.rate;
  }

  const existing = await db
    .selectFrom("fact_trucking")
    .select("id")
    .where("mongo_id", "=", mongoId)
    .executeTakeFirst();

  const factData = {
    daily_report_id: dailyReportId,
    jobsite_id: jobsiteId,
    crew_id: crewId,
    vehicle_id: null as string | null, // External trucking, no vehicle dimension
    crew_type: crewType,
    work_date: workDate,
    trucking_type: truckingRate.title,
    quantity: materialShipment.quantity.toString(),
    hours: hours?.toString() || null,
    rate: rateObj.rate.toString(),
    rate_type: rateObj.type,
    total_cost: totalCost.toString(),
    vehicle_source: vehicleObject.source || null,
    vehicle_type: vehicleObject.vehicleType || null,
    vehicle_code: vehicleObject.vehicleCode || null,
    trucking_rate_id: vehicleObject.truckingRateId?.toString() || null,
    archived_at: materialShipment.archivedAt || null,
    synced_at: new Date(),
  };

  if (existing) {
    await db
      .updateTable("fact_trucking")
      .set(factData)
      .where("id", "=", existing.id)
      .execute();
  } else {
    await db
      .insertInto("fact_trucking")
      .values({
        mongo_id: mongoId,
        ...factData,
      })
      .execute();
  }
}

// Export singleton instance
export const materialShipmentSyncHandler = new MaterialShipmentSyncHandler();
