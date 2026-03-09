import {
  DailyReportDocument,
  EmployeeWorkDocument,
  MaterialShipmentDocument,
  ProductionDocument,
  VehicleWorkDocument,
} from "@models";

const employeeWork = async (
  dailyReport: DailyReportDocument,
  employeeWork: EmployeeWorkDocument
) => {
  const workIndex = dailyReport.employeeWork.findIndex(
    (id) => id === employeeWork._id
  );

  if (workIndex !== -1) {
    dailyReport.employeeWork.splice(workIndex, 1);
  }

  return;
};

const vehicleWork = async (
  dailyReport: DailyReportDocument,
  vehicleWork: VehicleWorkDocument
) => {
  const workIndex = dailyReport.vehicleWork.findIndex(
    (id) => id === vehicleWork._id
  );

  if (workIndex !== -1) {
    dailyReport.vehicleWork.splice(workIndex, 1);
  }

  return;
};

const production = async (
  dailyReport: DailyReportDocument,
  production: ProductionDocument
) => {
  const productionIndex = dailyReport.production.findIndex(
    (id) => id === production._id
  );

  if (productionIndex !== -1) {
    dailyReport.production.splice(productionIndex, 1);
  }

  return;
};

const materialShipment = async (
  dailyReport: DailyReportDocument,
  materialShipment: MaterialShipmentDocument
) => {
  const materialShipmentIndex = dailyReport.materialShipment.findIndex(
    (id) => id === materialShipment._id
  );

  if (materialShipmentIndex !== -1) {
    dailyReport.materialShipment.splice(materialShipmentIndex, 1);
  }

  return;
};

export default {
  employeeWork,
  vehicleWork,
  production,
  materialShipment,
};
