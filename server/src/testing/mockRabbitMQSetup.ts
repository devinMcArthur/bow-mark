/**
 * Pre-populates require.cache with a no-op RabbitMQ publisher mock.
 *
 * Loaded via ts-node --require before any model code runs, so Mongoose
 * post-save hooks that call publishXxxChange() get the mock instead of
 * trying to connect to a real RabbitMQ broker.
 *
 * The key must match what ts-node resolves "@rabbitmq/publisher" to.
 * Since there's no @rabbitmq path alias, models import from the relative
 * path which ts-node resolves to the absolute path below.
 */
import path from "path";

const noOp = () => Promise.resolve(false);

const realPath = path.resolve(__dirname, "../rabbitmq/publisher.ts");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(require.cache as Record<string, any>)[realPath] = {
  id: realPath,
  filename: realPath,
  loaded: true,
  exports: {
    publishEmployeeChange: noOp,
    publishJobsiteChange: noOp,
    publishCrewChange: noOp,
    publishDailyReportChange: noOp,
    publishEmployeeWorkChange: noOp,
    publishVehicleWorkChange: noOp,
    publishMaterialShipmentChange: noOp,
    publishProductionChange: noOp,
    publishInvoiceChange: noOp,
    publishEnrichedFileCreated: noOp,
  },
  children: [],
  parent: null,
};
