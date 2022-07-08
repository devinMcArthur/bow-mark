import { VehicleWork } from "@models";
import errorHandler from "@utils/errorHandler";
import dayjs from "dayjs";

const updateToV2 = async () => {
  const vehicleWorks = await VehicleWork.find({
    $or: [
      {
        schemaVersion: 1,
      },
      {
        schemaVersion: undefined,
      },
    ],
  });

  if (vehicleWorks.length > 0) {
    console.log(
      `Updating ${vehicleWorks.length} VehicleWork document(s) to Schema Version 2...`
    );

    for (let i = 0; i < vehicleWorks.length; i++) {
      // Mark as archived if parent daily report is archived
      const vehicleWork = vehicleWorks[i];
      const dailyReport = await vehicleWork.getDailyReport();

      if (dailyReport && dailyReport.archived) {
        await vehicleWork.archive();
      }

      if (vehicleWork.hours === null || vehicleWork === undefined) {
        let hours = 0;
        if (vehicleWork.startTime && vehicleWork.endTime) {
          hours = dayjs(vehicleWork.endTime).diff(
            dayjs(vehicleWork.startTime),
            "hour"
          );
        }

        vehicleWork.hours = Math.abs(hours);
      }

      vehicleWork.schemaVersion = 2;

      try {
        await vehicleWork.save();
      } catch (e) {
        errorHandler("Vehicle Work update to v2 save failed", e);
      }
    }

    console.log(
      `...successfully updated ${vehicleWorks.length} VehicleWork document(s) to Schema Version 2.`
    );
  }
};

const updateVehicleWork = async () => {
  await updateToV2();

  return;
};

export default updateVehicleWork;
