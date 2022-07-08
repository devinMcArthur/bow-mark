import {
  DailyReportDocument,
  JobsiteMaterialDocument,
  MaterialShipmentDocument,
} from "@models";
import { JobsiteMaterialCostType } from "@typescript/jobsiteMaterial";
import {
  IMaterialShipmentShipmentUpdate,
  IMaterialShipmentUpdate,
} from "@typescript/materialShipment";
import isEmpty from "@utils/isEmpty";
import dayjs from "dayjs";

const document = async (
  materialShipment: MaterialShipmentDocument,
  data: IMaterialShipmentUpdate
) => {
  materialShipment.quantity = data.quantity;

  materialShipment.startTime = data.startTime;

  materialShipment.endTime = data.endTime;

  materialShipment.vehicleObject = data.vehicleObject;

  const dailyReport = await materialShipment.getDailyReport();
  if (!dailyReport)
    throw new Error(
      "could not find material shipments daily report for update"
    );

  await materialShipment.updateShipment(data, dailyReport);

  await materialShipment.validateDocument();

  return;
};

const shipment = async (
  materialShipment: MaterialShipmentDocument,
  shipment: IMaterialShipmentShipmentUpdate,
  dailyReport: DailyReportDocument
) => {
  if (shipment.noJobsiteMaterial) {
    if (isEmpty(shipment.shipmentType))
      throw new Error("Must provide a shipment type");

    if (isEmpty(shipment.supplier)) throw new Error("Must provide a supplier");

    if (isEmpty(shipment.unit)) throw new Error("Must provide a unit");

    materialShipment.shipmentType = shipment.shipmentType;
    materialShipment.supplier = shipment.supplier;
    materialShipment.unit = shipment.unit;

    materialShipment.jobsiteMaterial = undefined;
  } else {
    if (!shipment.jobsiteMaterial)
      throw new Error("Must provide a jobsite material");

    await materialShipment.updateJobsiteMaterial(
      shipment.jobsiteMaterial,
      dailyReport
    );
  }

  materialShipment.noJobsiteMaterial = shipment.noJobsiteMaterial;

  return;
};

const date = async (materialShipment: MaterialShipmentDocument, date: Date) => {
  const year = dayjs(date).get("year");
  const month = dayjs(date).get("month");
  const day = dayjs(date).get("date");

  if (materialShipment.startTime)
    materialShipment.startTime = dayjs(materialShipment.startTime)
      .set("year", year)
      .set("month", month)
      .set("date", day)
      .toDate();

  if (materialShipment.endTime)
    materialShipment.endTime = dayjs(materialShipment.endTime)
      .set("year", year)
      .set("month", month)
      .set("date", day)
      .toDate();

  return;
};

const jobsiteMaterial = async (
  materialShipment: MaterialShipmentDocument,
  jobsiteMaterial: JobsiteMaterialDocument,
  dailyReport: DailyReportDocument
) => {
  if (materialShipment.schemaVersion > 1) {
    const jobsite = await dailyReport.getJobsite();
    if (!jobsite.materials.includes(jobsiteMaterial._id))
      throw new Error("this material does not belong to this jobsite");

    materialShipment.jobsiteMaterial = jobsiteMaterial._id;

    // Validate vehicle object if provided
    if (materialShipment.vehicleObject) {
      // Check for delivered rate costType
      if (jobsiteMaterial.costType === JobsiteMaterialCostType.deliveredRate) {
        if (!materialShipment.vehicleObject?.deliveredRateId)
          throw new Error("Must provide a delivered rate Id");

        const rate = jobsiteMaterial.deliveredRates.find(
          (rate) =>
            rate._id?.toString() ===
            materialShipment.vehicleObject?.deliveredRateId?.toString()
        );
        if (!rate) throw new Error("Could not find the delivered rate");

        materialShipment.vehicleObject.truckingRateId = undefined;
      } else {
        if (!materialShipment.vehicleObject?.truckingRateId)
          throw new Error("Must provide a trucking rate Id");

        const rate = jobsite.truckingRates.find(
          (rate) =>
            rate._id?.toString() ===
            materialShipment.vehicleObject?.truckingRateId?.toString()
        );
        if (!rate) throw new Error("Could not find trucking rate");

        materialShipment.vehicleObject.deliveredRateId = undefined;
      }
    }
  } else throw new Error("cannot add jobsite material to v1 material shipment");

  return;
};

const archive = async (materialShipment: MaterialShipmentDocument) => {
  materialShipment.archivedAt = new Date();
};

export default {
  document,
  date,
  jobsiteMaterial,
  shipment,
  archive,
};
