import { Vehicle, VehicleDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededVehicles {
  personnel_truck_1: VehicleDocument;
  skidsteer_1: VehicleDocument;
  gravel_truck_1: VehicleDocument;
  temp_1: VehicleDocument;
  temp_2: VehicleDocument;
}

const createVehicles = async (): Promise<SeededVehicles> => {
  const personnel_truck_1 = new Vehicle({
    _id: _ids.vehicles.personnel_truck_1._id,
    name: "T-52",
    vehicleCode: "T-52",
    vehicleType: "1 Ton",
    crews: [_ids.crews.base_1._id],
  });

  const skidsteer_1 = new Vehicle({
    _id: _ids.vehicles.skidsteer_1._id,
    name: "G-25",
    vehicleCode: "G-25",
    vehicleType: "Skidsteer",
    crews: [_ids.crews.base_1._id],
  });

  const gravel_truck_1 = new Vehicle({
    _id: _ids.vehicles.gravel_truck_1._id,
    name: "T-12",
    vehicleCode: "T-12",
    vehicleType: "Gravel Truck",
    crews: [_ids.crews.base_1._id],
  });

  const temp_1 = new Vehicle({
    _id: _ids.vehicles.temp_1._id,
    name: "temp-1",
    vehicleCode: "tmp-1",
    vehicleType: "Truck",
  });

  const temp_2 = new Vehicle({
    _id: _ids.vehicles.temp_2._id,
    name: "temp-2",
    vehicleCode: "tmp-2",
    vehicleType: "Truck",
  });

  const vehicles = {
    personnel_truck_1,
    skidsteer_1,
    gravel_truck_1,
    temp_1,
    temp_2,
  };

  for (let i = 0; i < Object.values(vehicles).length; i++) {
    await Object.values(vehicles)[i].save();
  }

  return vehicles;
};

export default createVehicles;
