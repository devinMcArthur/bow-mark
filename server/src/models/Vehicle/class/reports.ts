import { VehicleDocument, JobsiteDayReport } from "@models";

const requestUpdate = async (vehicle: VehicleDocument) => {
  const reports = await JobsiteDayReport.getByVehicle(vehicle);

  for (let i = 0; i < reports.length; i++) {
    await reports[i].requestUpdate();
    await reports[i].save();
  }

  return;
};

export default {
  requestUpdate,
};
