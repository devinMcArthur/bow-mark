import { VehicleWorkDocument } from "@models";

const requestUpdate = async (vehicleWork: VehicleWorkDocument) => {
  const dailyReport = await vehicleWork.getDailyReport();

  await dailyReport?.requestReportUpdate();

  return;
};

export default {
  requestUpdate,
};
