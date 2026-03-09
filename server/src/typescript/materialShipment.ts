import { DailyReportDocument, JobsiteMaterialDocument } from "@models";
import { Id } from "./models";

interface IMaterialShipmentVehicleObject {
  source: string;
  vehicleType: string;
  vehicleCode: string;
  truckingRateId?: string;
  deliveredRateId?: Id;
}

interface IMaterialShipmentCreateBase {
  startTime?: Date;
  endTime?: Date;
  vehicleObject?: IMaterialShipmentVehicleObject;
  dailyReport: DailyReportDocument;
}

export interface IMaterialShipmentShipmentUpdate {
  noJobsiteMaterial: boolean;
  jobsiteMaterial?: JobsiteMaterialDocument;
  shipmentType?: string;
  supplier?: string;
  unit?: string;
}

export interface IMaterialShipmentCreate
  extends IMaterialShipmentCreateBase,
    IMaterialShipmentShipmentUpdate {
  quantity: number;
}

export interface IMaterialShipmentUpdate
  extends IMaterialShipmentShipmentUpdate {
  quantity: number;
  startTime?: Date;
  endTime?: Date;
  vehicleObject?: IMaterialShipmentVehicleObject;
}
