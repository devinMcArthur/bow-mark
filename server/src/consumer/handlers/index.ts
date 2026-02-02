/**
 * Sync Handlers
 *
 * Export all sync handlers for use in the consumer.
 */

// Base class for creating new handlers
export { SyncHandler } from "./base";

// Handler instances
export { dailyReportSyncHandler } from "./dailyReportSync";
export { employeeWorkSyncHandler, upsertFactEmployeeWork } from "./employeeWorkSync";
export { vehicleWorkSyncHandler, upsertFactVehicleWork } from "./vehicleWorkSync";
export { materialShipmentSyncHandler, upsertFactMaterialShipment } from "./materialShipmentSync";
export { productionSyncHandler, upsertFactProduction } from "./productionSync";
export { invoiceSyncHandler, upsertFactInvoice } from "./invoiceSync";

// Dimension helpers (shared across handlers)
export {
  upsertDimJobsite,
  upsertDimCrew,
  upsertDimEmployee,
  upsertDimDailyReport,
  upsertDimVehicle,
  upsertDimMaterial,
  upsertDimCompany,
  upsertDimJobsiteMaterial,
  getEmployeeRateForDate,
  getVehicleRateForDate,
  getJobsiteMaterialRateForDate,
} from "./dimensions";
