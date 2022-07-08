import { VehicleWorkDocument } from "@models";
import { IVehicleWorkUpdate } from "@typescript/vehicleWork";

const document = async (
  vehicleWork: VehicleWorkDocument,
  data: IVehicleWorkUpdate
) => {
  vehicleWork.jobTitle = data.jobTitle;

  vehicleWork.hours = data.hours;

  return;
};

const archive = (vehicleWork: VehicleWorkDocument) => {
  vehicleWork.archivedAt = new Date();
};

export default {
  document,
  archive,
};
