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

// Dimension helpers (shared across handlers)
export {
  upsertDimJobsite,
  upsertDimCrew,
  upsertDimEmployee,
  upsertDimDailyReport,
  upsertDimVehicle,
  getEmployeeRateForDate,
  getVehicleRateForDate,
} from "./dimensions";
