import { Vehicle, VehicleWorkDocument, VehicleWorkModel } from "@models";
import { Id } from "@typescript/models";
import { IVehicleWorkCreate } from "@typescript/vehicleWork";

const document = async (
  VehicleWork: VehicleWorkModel,
  data: IVehicleWorkCreate
): Promise<VehicleWorkDocument> => {
  // validate vehicle
  const vehicle = await Vehicle.getById(data.vehicleId);
  if (!vehicle)
    throw new Error("VehicleWork.createDocument: unable to find vehicle");

  const vehicleWork = new VehicleWork({
    jobTitle: data.jobTitle,
    hours: data.hours,
    vehicle: data.vehicleId,
  });

  await data.dailyReport.addVehicleWork(vehicleWork);

  return vehicleWork;
};

const perVehicle = async (
  VehicleWork: VehicleWorkModel,
  data: Omit<IVehicleWorkCreate, "vehicleId">,
  vehicles: Id[]
): Promise<VehicleWorkDocument[]> => {
  const vehicleWorks: VehicleWorkDocument[] = [];

  if (vehicles.length === 0)
    throw new Error(
      "VehicleWork.createPerVehicle: must provide a vehicles array"
    );

  for (let i = 0; i < vehicles.length; i++) {
    vehicleWorks.push(
      await VehicleWork.createDocument({
        ...data,
        vehicleId: vehicles[i],
      })
    );
  }

  return vehicleWorks;
};

export default {
  document,
  perVehicle,
};
