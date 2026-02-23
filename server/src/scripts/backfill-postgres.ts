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
  // Upsert dimensions
  const jobsiteId = await upsertDimJobsite(dailyReport.jobsite);
  const crewId = await upsertDimCrew(dailyReport.crew);
  const dailyReportId = await upsertDimDailyReport(dailyReport, jobsiteId, crewId);

  // Sync EmployeeWork
  const employeeWorkIds = dailyReport.employeeWork || [];
  if (employeeWorkIds.length > 0) {
    const employeeWorks = await EmployeeWork.find({
      _id: { $in: employeeWorkIds },
    })
      .populate("employee")
      .exec();

    for (const ew of employeeWorks) {
      if (!ew.employee) continue;

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
        stats.employeeWork++;
      } catch (error) {
        console.error(`  Error syncing EmployeeWork ${ew._id}:`, error);
        stats.errors++;
      }
    }
  }

  // Sync VehicleWork
  const vehicleWorkIds = dailyReport.vehicleWork || [];
  if (vehicleWorkIds.length > 0) {
    const vehicleWorks = await VehicleWork.find({
      _id: { $in: vehicleWorkIds },
    })
      .populate("vehicle")
      .exec();

    for (const vw of vehicleWorks) {
      if (!vw.vehicle) continue;

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
        stats.vehicleWork++;
      } catch (error) {
        console.error(`  Error syncing VehicleWork ${vw._id}:`, error);
        stats.errors++;
      }
    }
  }

  // Sync MaterialShipments (includes non-costed materials and trucking)
  const materialShipmentIds = dailyReport.materialShipment || [];
  if (materialShipmentIds.length > 0) {
    const materialShipments = await MaterialShipment.find({
      _id: { $in: materialShipmentIds },
    })
      .populate({
        path: "jobsiteMaterial",
        populate: [
          { path: "material" },
          { path: "supplier" },
        ],
      })
      .exec();

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
  }

  // Sync Production
  const productionIds = dailyReport.production || [];
  if (productionIds.length > 0) {
    const productions = await Production.find({
      _id: { $in: productionIds },
    }).exec();

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

  // Process in batches
  const batchSize = 50;
  let processed = 0;

  console.log(`\nProcessing ${toProcess} reports in batches of ${batchSize}...\n`);

  const cursor = DailyReport.find(query)
    .populate("jobsite")
    .populate("crew")
    .sort({ date: 1 })
    .limit(limit || 0)
    .cursor();

  for await (const doc of cursor) {
    const dailyReport = doc as DailyReportDocument & {
      jobsite: JobsiteDocument;
      crew: CrewDocument;
    };

    if (!dailyReport.jobsite || !dailyReport.crew) {
      console.log(`Skipping ${dailyReport._id} - missing jobsite or crew`);
      continue;
    }

    try {
      await syncDailyReport(dailyReport);
      processed++;

      if (processed % 10 === 0) {
        const percent = ((processed / toProcess) * 100).toFixed(1);
        console.log(
          `Progress: ${processed}/${toProcess} (${percent}%) - ` +
          `EW: ${stats.employeeWork}, VW: ${stats.vehicleWork}, MS: ${stats.materialShipments}, ` +
          `NC: ${stats.nonCostedMaterials}, TR: ${stats.trucking}, PR: ${stats.production}, Errors: ${stats.errors}`
        );
      }
    } catch (error) {
      console.error(`Error processing DailyReport ${dailyReport._id}:`, error);
      stats.errors++;
    }
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
