import {
  DailyReport,
  DailyReportDocument,
  JobsiteMaterial,
  JobsiteMaterialDocument,
  MaterialShipmentDocument,
  MaterialShipmentModel,
  Vehicle,
  VehicleDocument,
} from "@models";
import { GetByIDOptions, Id } from "@typescript/models";
import populateOptions from "@utils/populateOptions";

const byIdDefaultOptions: GetByIDOptions = {
  throwError: false,
};
const byId = async (
  MaterialShipment: MaterialShipmentModel,
  id: Id,
  options: GetByIDOptions = byIdDefaultOptions
): Promise<MaterialShipmentDocument | null> => {
  options = populateOptions(options, byIdDefaultOptions);

  const materialShipment = await MaterialShipment.findById(id);

  if (!materialShipment && options.throwError) {
    throw new Error(
      "MaterialShipment.getById: unable to find material shipment"
    );
  }

  return materialShipment;
};

const vehicle = async (
  materialShipment: MaterialShipmentDocument
): Promise<VehicleDocument | null> => {
  const vehicle = await Vehicle.getById(materialShipment.vehicle || "");

  return vehicle;
};

const dailyReport = async (
  materialShipment: MaterialShipmentDocument
): Promise<DailyReportDocument | null> => {
  const dailyReport = await DailyReport.findOne({
    materialShipment: materialShipment._id,
  });

  return dailyReport;
};

const jobsiteMaterial = async (
  materialShipment: MaterialShipmentDocument
): Promise<JobsiteMaterialDocument | null> => {
  if (materialShipment.jobsiteMaterial) {
    const jobsiteMaterial = await JobsiteMaterial.getById(
      materialShipment.jobsiteMaterial?.toString() || ""
    );

    return jobsiteMaterial;
  } else return null;
};

export default {
  byId,
  vehicle,
  dailyReport,
  jobsiteMaterial,
};
