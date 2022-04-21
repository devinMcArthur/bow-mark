import {
  DailyReportDocument,
  JobsiteMaterial,
  JobsiteMaterialDocument,
  MaterialShipmentDocument,
} from "@models";
import {
  IMaterialShipmentShipmentUpdate,
  IMaterialShipmentUpdate,
} from "@typescript/materialShipment";
import isEmpty from "@utils/isEmpty";
import dayjs from "dayjs";

const document = (
  materialShipment: MaterialShipmentDocument,
  data: IMaterialShipmentUpdate
) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      materialShipment.quantity = data.quantity;

      materialShipment.startTime = data.startTime;

      materialShipment.endTime = data.endTime;

      const dailyReport = await materialShipment.getDailyReport();
      if (!dailyReport)
        throw new Error(
          "could not find material shipments daily report for update"
        );

      await materialShipment.updateShipment(data, dailyReport);

      await materialShipment.validateDocument();

      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

const shipment = (
  materialShipment: MaterialShipmentDocument,
  shipment: IMaterialShipmentShipmentUpdate,
  dailyReport: DailyReportDocument
) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      if (shipment.noJobsiteMaterial) {
        if (isEmpty(shipment.shipmentType))
          throw new Error("Must provide a shipment type");

        if (isEmpty(shipment.supplier))
          throw new Error("Must provide a supplier");

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

      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

const date = (materialShipment: MaterialShipmentDocument, date: Date) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
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

      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

const jobsiteMaterial = (
  materialShipment: MaterialShipmentDocument,
  jobsiteMaterial: JobsiteMaterialDocument,
  dailyReport: DailyReportDocument
) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      if (materialShipment.schemaVersion > 1) {
        const jobsite = await dailyReport.getJobsite();
        if (!jobsite.materials.includes(jobsiteMaterial._id))
          throw new Error("this material does not belong to this jobsite");

        materialShipment.jobsiteMaterial = jobsiteMaterial._id;

        // Validate vehicle object
        if (jobsiteMaterial.delivered) {
          if (!materialShipment.vehicleObject?.deliveredRateId)
            throw new Error("Must provide a delivered rate Id");

          const rate = jobsiteMaterial.deliveredRates.find(
            (rate) =>
              rate._id?.toString() ===
              materialShipment.vehicleObject?.deliveredRateId!.toString()
          );
          if (!rate) throw new Error("Could not find the delivered rate");

          materialShipment.vehicleObject.truckingRateId = undefined;
        } else {
          if (!materialShipment.vehicleObject?.truckingRateId)
            throw new Error("Must provide a trucking rate Id");

          const rate = jobsite.truckingRates.find(
            (rate) =>
              rate._id?.toString() ===
              materialShipment.vehicleObject?.truckingRateId!.toString()
          );
          if (!rate) throw new Error("Could not find trucking rate");

          materialShipment.vehicleObject.deliveredRateId = undefined;
        }
      } else
        throw new Error("cannot add jobsite material to v1 material shipment");

      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

export default {
  document,
  date,
  jobsiteMaterial,
  shipment,
};
