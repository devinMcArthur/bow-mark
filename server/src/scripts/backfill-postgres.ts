/**
 * Backfill PostgreSQL from MongoDB
 *
 * This script syncs all existing DailyReport data from MongoDB to PostgreSQL.
 * Run this once to populate the reporting database with historical data.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/backfill-postgres.ts
 *
 * Options:
 *   --jobsite <mongoId>  Only sync a specific jobsite
 *   --year <year>        Only sync a specific year
 *   --limit <n>          Limit number of reports to sync
 *   --dry-run            Show what would be synced without syncing
 */

import "reflect-metadata";
import * as dotenv from "dotenv";
import path from "path";

// Setup environment variables
dotenv.config({ path: path.join(__dirname, "..", "..", ".env.development") });

import mongoose from "mongoose";
import {
  DailyReport,
  EmployeeWork,
  VehicleWork,
  MaterialShipment,
  Production,
  Invoice,
  Jobsite,
  type DailyReportDocument,
  type EmployeeWorkDocument,
  type VehicleWorkDocument,
  type MaterialShipmentDocument,
  type ProductionDocument,
  type InvoiceDocument,
  type EmployeeDocument,
  type VehicleDocument,
  type JobsiteDocument,
  type CrewDocument,
  type JobsiteMaterialDocument,
  type MaterialDocument,
  type CompanyDocument,
} from "@models";
import { checkConnection, closeConnection } from "../db";
import {
  upsertDimJobsite,
  upsertDimCrew,
  upsertDimEmployee,
  upsertDimVehicle,
  upsertDimDailyReport,
} from "../consumer/handlers/dimensions";
import { upsertFactEmployeeWork } from "../consumer/handlers/employeeWorkSync";
import { upsertFactVehicleWork } from "../consumer/handlers/vehicleWorkSync";
import { upsertFactMaterialShipment } from "../consumer/handlers/materialShipmentSync";
import { upsertFactProduction } from "../consumer/handlers/productionSync";
import { upsertFactInvoice } from "../consumer/handlers/invoiceSync";

// How many daily reports to process concurrently.
// Higher values reduce wall-clock time but increase DB connection usage.
const CONCURRENCY = 5;

/**
 * Process-level dimension cache.
 * Stores Promises so that concurrent lookups of the same mongo_id never
 * trigger a second INSERT (the first caller stores the in-flight Promise;
 * subsequent callers await the same one).
 */
const dimCache = new Map<string, Promise<string>>();

function cachedDim(key: string, fn: () => Promise<string>): Promise<string> {
  if (!dimCache.has(key)) {
    dimCache.set(key, fn());
  }
  return dimCache.get(key)!;
}

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const jobsiteFilter = getArg("jobsite");
const yearFilter = getArg("year") ? parseInt(getArg("year")!) : undefined;
const limit = getArg("limit") ? parseInt(getArg("limit")!) : undefined;
const dryRun = hasFlag("dry-run");

interface SyncStats {
  dailyReports: number;
  employeeWork: number;
  vehicleWork: number;
  materialShipments: number;
  nonCostedMaterials: number;
  trucking: number;
  production: number;
  invoices: number;
  errors: number;
}

const stats: SyncStats = {
  dailyReports: 0,
  employeeWork: 0,
  vehicleWork: 0,
  materialShipments: 0,
  nonCostedMaterials: 0,
  trucking: 0,
  production: 0,
  invoices: 0,
  errors: 0,
};

async function syncDailyReport(
  dailyReport: DailyReportDocument & {
    jobsite: JobsiteDocument;
    crew: CrewDocument;
  }
): Promise<void> {
  // Upsert shared dimensions via cache (avoids repeated PG round trips for
  // the same jobsite/crew across hundreds of reports).
  const [jobsiteId, crewId] = await Promise.all([
    cachedDim(`jobsite:${dailyReport.jobsite._id}`, () => upsertDimJobsite(dailyReport.jobsite)),
    cachedDim(`crew:${dailyReport.crew._id}`, () => upsertDimCrew(dailyReport.crew)),
  ]);
  const dailyReportId = await upsertDimDailyReport(dailyReport, jobsiteId, crewId);

  const employeeWorkIds = dailyReport.employeeWork || [];
  const vehicleWorkIds = dailyReport.vehicleWork || [];
  const materialShipmentIds = dailyReport.materialShipment || [];
  const productionIds = dailyReport.production || [];

  // Fetch all sub-documents in parallel — four sequential queries become one round-trip.
  const [employeeWorks, vehicleWorks, materialShipments, productions] = await Promise.all([
    employeeWorkIds.length > 0
      ? EmployeeWork.find({ _id: { $in: employeeWorkIds } }).populate("employee").exec()
      : Promise.resolve([]),
    vehicleWorkIds.length > 0
      ? VehicleWork.find({ _id: { $in: vehicleWorkIds } }).populate("vehicle").exec()
      : Promise.resolve([]),
    materialShipmentIds.length > 0
      ? MaterialShipment.find({ _id: { $in: materialShipmentIds } })
          .populate({ path: "jobsiteMaterial", populate: [{ path: "material" }, { path: "supplier" }] })
          .exec()
      : Promise.resolve([]),
    productionIds.length > 0
      ? Production.find({ _id: { $in: productionIds } }).exec()
      : Promise.resolve([]),
  ]);

  // Sync EmployeeWork
  for (const ew of employeeWorks) {
    if (!ew.employee) continue;
    try {
      const typedEw = ew as EmployeeWorkDocument & { employee: EmployeeDocument };
      const employeeId = await cachedDim(`employee:${typedEw.employee._id}`, () =>
        upsertDimEmployee(typedEw.employee)
      );
      await upsertFactEmployeeWork({
        employeeWork: typedEw,
        dailyReport,
        dailyReportId,
        jobsiteId,
        crewId,
        employeeId,
      });
      stats.employeeWork++;
    } catch (error) {
      console.error(`  Error syncing EmployeeWork ${ew._id}:`, error);
      stats.errors++;
    }
  }

  // Sync VehicleWork
  for (const vw of vehicleWorks) {
    if (!vw.vehicle) continue;
    try {
      const typedVw = vw as VehicleWorkDocument & { vehicle: VehicleDocument };
      const vehicleId = await cachedDim(`vehicle:${typedVw.vehicle._id}`, () =>
        upsertDimVehicle(typedVw.vehicle)
      );
      await upsertFactVehicleWork({
        vehicleWork: typedVw,
        dailyReport,
        dailyReportId,
        jobsiteId,
        crewId,
        vehicleId,
      });
      stats.vehicleWork++;
    } catch (error) {
      console.error(`  Error syncing VehicleWork ${vw._id}:`, error);
      stats.errors++;
    }
  }

  // Sync MaterialShipments
  for (const ms of materialShipments) {
    try {
      const typedMs = ms as MaterialShipmentDocument & {
        jobsiteMaterial?: JobsiteMaterialDocument & {
          material: MaterialDocument;
          supplier: CompanyDocument;
        };
      };
      await upsertFactMaterialShipment({
        materialShipment: typedMs,
        dailyReport,
        dailyReportId,
        jobsiteId,
        crewId,
      });
      if (typedMs.noJobsiteMaterial) {
        stats.nonCostedMaterials++;
      } else {
        stats.materialShipments++;
      }
      if (typedMs.vehicleObject?.truckingRateId) {
        stats.trucking++;
      }
    } catch (error) {
      console.error(`  Error syncing MaterialShipment ${ms._id}:`, error);
      stats.errors++;
    }
  }

  // Sync Production
  for (const prod of productions) {
    try {
      await upsertFactProduction({
        production: prod as ProductionDocument,
        dailyReport,
        dailyReportId,
        jobsiteId,
        crewId,
      });
      stats.production++;
    } catch (error) {
      console.error(`  Error syncing Production ${prod._id}:`, error);
      stats.errors++;
    }
  }

  stats.dailyReports++;
}

/**
 * Sync invoices for a jobsite
 */
async function syncJobsiteInvoices(jobsite: JobsiteDocument): Promise<void> {
  // Sync revenue invoices
  const revenueInvoiceIds = jobsite.revenueInvoices || [];
  if (revenueInvoiceIds.length > 0) {
    const revenueInvoices = await Invoice.find({
      _id: { $in: revenueInvoiceIds },
    })
      .populate("company")
      .exec();

    for (const inv of revenueInvoices) {
      if (!inv.company) continue;

      try {
        await upsertFactInvoice({
          invoice: inv as InvoiceDocument & { company: CompanyDocument },
          jobsite,
          direction: "revenue",
        });
        stats.invoices++;
      } catch (error) {
        console.error(`  Error syncing revenue Invoice ${inv._id}:`, error);
        stats.errors++;
      }
    }
  }

  // Sync expense invoices
  const expenseInvoiceIds = jobsite.expenseInvoices || [];
  if (expenseInvoiceIds.length > 0) {
    const expenseInvoices = await Invoice.find({
      _id: { $in: expenseInvoiceIds },
    })
      .populate("company")
      .exec();

    for (const inv of expenseInvoices) {
      if (!inv.company) continue;

      try {
        await upsertFactInvoice({
          invoice: inv as InvoiceDocument & { company: CompanyDocument },
          jobsite,
          direction: "expense",
        });
        stats.invoices++;
      } catch (error) {
        console.error(`  Error syncing expense Invoice ${inv._id}:`, error);
        stats.errors++;
      }
    }
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("PostgreSQL Backfill Script");
  console.log("=".repeat(60));

  if (dryRun) {
    console.log("\n*** DRY RUN MODE - No data will be written ***\n");
  }

  // Connect to MongoDB
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI environment variable is required");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  });
  console.log("MongoDB connected");

  // Connect to PostgreSQL
  console.log("Connecting to PostgreSQL...");
  const pgConnected = await checkConnection();
  if (!pgConnected) {
    throw new Error("Failed to connect to PostgreSQL");
  }
  console.log("PostgreSQL connected");

  // Build query
  const query: Record<string, unknown> = {
    archived: { $ne: true },
  };

  if (jobsiteFilter) {
    // Find jobsite by mongo ID
    const jobsite = await Jobsite.findById(jobsiteFilter);
    if (!jobsite) {
      throw new Error(`Jobsite not found: ${jobsiteFilter}`);
    }
    query.jobsite = jobsite._id;
    console.log(`\nFiltering by jobsite: ${jobsite.name}`);
  }

  if (yearFilter) {
    const startOfYear = new Date(yearFilter, 0, 1);
    const endOfYear = new Date(yearFilter, 11, 31, 23, 59, 59);
    query.date = { $gte: startOfYear, $lte: endOfYear };
    console.log(`Filtering by year: ${yearFilter}`);
  }

  // Count total
  const totalCount = await DailyReport.countDocuments(query);
  const toProcess = limit ? Math.min(limit, totalCount) : totalCount;
  console.log(`\nFound ${totalCount} daily reports to sync`);
  if (limit) {
    console.log(`Limiting to ${limit} reports`);
  }

  if (dryRun) {
    console.log("\nDry run complete. No data was written.");
    return;
  }

  let processed = 0;

  console.log(`\nProcessing ${toProcess} reports (concurrency=${CONCURRENCY})...\n`);

  // Use paginated batch fetching instead of a cursor. MongoDB Atlas does not
  // honour noCursorTimeout for regular database users, so any long-lived cursor
  // will be killed after ~10 minutes. Fetching fresh batches avoids this entirely.
  const FETCH_BATCH = 100;
  let offset = 0;

  while (true) {
    if (limit && processed >= limit) break;

    const batch = await DailyReport.find(query)
      .populate("jobsite")
      .populate("crew")
      .sort({ date: 1 })
      .skip(offset)
      .limit(FETCH_BATCH)
      .exec() as Array<DailyReportDocument & { jobsite: JobsiteDocument; crew: CrewDocument }>;

    if (batch.length === 0) break;

    // Sliding window: keep up to CONCURRENCY tasks in flight at once.
    const inFlight: Promise<void>[] = [];

    for (const dailyReport of batch) {
      if (!dailyReport.jobsite || !dailyReport.crew) {
        console.log(`Skipping ${dailyReport._id} - missing jobsite or crew`);
        continue;
      }

      const task = syncDailyReport(dailyReport)
        .then(() => {
          processed++;
          if (processed % 10 === 0) {
            const percent = ((processed / toProcess) * 100).toFixed(1);
            console.log(
              `Progress: ${processed}/${toProcess} (${percent}%) - ` +
              `EW: ${stats.employeeWork}, VW: ${stats.vehicleWork}, MS: ${stats.materialShipments}, ` +
              `NC: ${stats.nonCostedMaterials}, TR: ${stats.trucking}, PR: ${stats.production}, Errors: ${stats.errors}`
            );
          }
        })
        .catch((error) => {
          console.error(`Error processing DailyReport ${dailyReport._id}:`, error);
          stats.errors++;
        });

      inFlight.push(task);

      if (inFlight.length >= CONCURRENCY) {
        await inFlight.shift();
      }
    }

    // Drain remaining tasks before fetching the next batch.
    await Promise.all(inFlight);

    offset += batch.length;
  }

  // Sync invoices (separate from daily reports)
  console.log("\nSyncing invoices...");

  // Get jobsites to sync invoices for
  let jobsitesToSync: JobsiteDocument[];
  if (jobsiteFilter) {
    const jobsite = await Jobsite.findById(jobsiteFilter)
      .populate("revenueInvoices")
      .populate("expenseInvoices");
    jobsitesToSync = jobsite ? [jobsite] : [];
  } else {
    // Get all jobsites that have invoices
    jobsitesToSync = await Jobsite.find({
      $or: [
        { revenueInvoices: { $exists: true, $ne: [] } },
        { expenseInvoices: { $exists: true, $ne: [] } },
      ],
    });
  }

  console.log(`Found ${jobsitesToSync.length} jobsites with invoices`);

  for (const jobsite of jobsitesToSync) {
    try {
      await syncJobsiteInvoices(jobsite);
    } catch (error) {
      console.error(`Error syncing invoices for jobsite ${jobsite._id}:`, error);
      stats.errors++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Backfill Complete!");
  console.log("=".repeat(60));
  console.log(`Daily Reports synced: ${stats.dailyReports}`);
  console.log(`Employee Work records: ${stats.employeeWork}`);
  console.log(`Vehicle Work records: ${stats.vehicleWork}`);
  console.log(`Material Shipments: ${stats.materialShipments}`);
  console.log(`Non-costed Materials: ${stats.nonCostedMaterials}`);
  console.log(`Trucking records: ${stats.trucking}`);
  console.log(`Production records: ${stats.production}`);
  console.log(`Invoices: ${stats.invoices}`);
  console.log(`Errors: ${stats.errors}`);
}

main()
  .then(async () => {
    await closeConnection();
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Fatal error:", error);
    await closeConnection();
    await mongoose.disconnect();
    process.exit(1);
  });
