import { VehicleWork, VehicleWorkDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededVehicleWork {
  jobsite_1_base_1_1_skidsteer_1: VehicleWorkDocument;
  sync_vehicle_work_1: VehicleWorkDocument;
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

  const sync_vehicle_work_1 = new VehicleWork({
    _id: _ids.vehicleWork.sync_vehicle_work_1._id,
    startTime: new Date("2022-02-23T08:00:00"),
    endTime: new Date("2022-02-23T11:00:00"),
    hours: 3,
    jobTitle: "Grading work",
    vehicle: _ids.vehicles.skidsteer_1._id,
  });

  const vehicleWork = {
    jobsite_1_base_1_1_skidsteer_1,
    sync_vehicle_work_1,
  };

  for (let i = 0; i < Object.values(vehicleWork).length; i++) {
    await Object.values(vehicleWork)[i].save();
  }

  return vehicleWork;
};

export default createVehicleWork;
