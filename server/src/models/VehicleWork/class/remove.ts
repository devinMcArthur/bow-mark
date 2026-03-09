import { VehicleWorkDocument } from "@models";

const fullDelete = async (vehicleWork: VehicleWorkDocument) => {
  const dailyReport = await vehicleWork.getDailyReport();

  if (dailyReport) {
    await dailyReport.removeVehicleWork(vehicleWork);

    await dailyReport.save();
  }

  await vehicleWork.remove();

  return;
};

export default {
  fullDelete,
};
