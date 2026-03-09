import { VehicleDocument, VehicleModel } from "@models";
import { IVehicleCreate } from "@typescript/vehicle";

const document = async (
  Vehicle: VehicleModel,
  data: IVehicleCreate
): Promise<VehicleDocument> => {
  const sameCode = await Vehicle.getByCode(data.vehicleCode);
  if (sameCode)
    throw new Error(
      "Vehicle.createDocument: a vehicle already exists with this code"
    );

  const vehicle = new Vehicle({
    ...data,
  });

  return vehicle;
};

export default {
  document,
};
