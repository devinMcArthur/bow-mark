import {
  DailyReport,
  DailyReportDocument,
  Vehicle,
  VehicleDocument,
  VehicleWorkDocument,
  VehicleWorkModel,
} from "@models";
import { GetByIDOptions, Id } from "@typescript/models";
import populateOptions from "@utils/populateOptions";

/**
 * ----- Static Methods -----
 */

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  VehicleWork: VehicleWorkModel,
  id: Id,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<VehicleWorkDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const vehicleWork = await VehicleWork.findById(id);

  if (!vehicleWork && options.throwError) {
    throw new Error("VehicleWork.getById: Unable to find vehicle work");
  }

  return vehicleWork;
};

/**
 * ----- Methods -----
 */

const vehicle = async (
  vehicleWork: VehicleWorkDocument
): Promise<VehicleDocument | null> => {
  const vehicle = await Vehicle.getById(vehicleWork.vehicle || "");

  return vehicle;
};

const dailyReport = async (
  vehicleWork: VehicleWorkDocument
): Promise<DailyReportDocument | null> => {
  const dailyReport = await DailyReport.findOne({
    vehicleWork: vehicleWork._id,
  });

  return dailyReport;
};

export default {
  byId,
  vehicle,
  dailyReport,
};
