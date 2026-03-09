import { VehicleWork, VehicleWorkDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededVehicleWork {
  jobsite_1_base_1_1_skidsteer_1: VehicleWorkDocument;
}

const createVehicleWork = async (): Promise<SeededVehicleWork> => {
  const jobsite_1_base_1_1_skidsteer_1 = new VehicleWork({
    _id: _ids.vehicleWork.jobsite_1_base_1_1_skidsteer_1._id,
    startTime: new Date("2022-02-23 10:00 AM"),
    endTime: new Date("2022-02-23 1:00 PM"),
    jobTitle: "Prep work",
    hours: 3,
    vehicle: _ids.vehicles.skidsteer_1._id,
  });

  const vehicleWork = {
    jobsite_1_base_1_1_skidsteer_1,
  };

  for (let i = 0; i < Object.values(vehicleWork).length; i++) {
    await Object.values(vehicleWork)[i].save();
  }

  return vehicleWork;
};

export default createVehicleWork;
