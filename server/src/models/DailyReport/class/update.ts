import {
  DailyReportDocument,
  EmployeeDocument,
  EmployeeWorkDocument,
  Jobsite,
  JobsiteDocument,
  MaterialShipmentDocument,
  ProductionDocument,
  ReportNoteDocument,
  VehicleDocument,
  VehicleWorkDocument,
} from "@models";
import { IDailyReportUpdate } from "@typescript/dailyReport";
import populateOptions from "@utils/populateOptions";

const document = async (
  dailyReport: DailyReportDocument,
  data: IDailyReportUpdate
): Promise<{
  employeeWork: EmployeeWorkDocument[];
  materialShipments: MaterialShipmentDocument[];
}> => {
  const jobsite = await Jobsite.getById(data.jobsiteId);
  if (!jobsite) throw new Error("Could not find this Jobsite");
  await dailyReport.updateJobsite(jobsite);

  const { employeeWork, materialShipments } = await dailyReport.updateDate(
    data.date
  );

  return { employeeWork, materialShipments };
};

const date = async (
  dailyReport: DailyReportDocument,
  date: Date
): Promise<{
  employeeWork: EmployeeWorkDocument[];
  materialShipments: MaterialShipmentDocument[];
}> => {
  dailyReport.date = date;

  const employeeWork = await dailyReport.getEmployeeWork();
  for (let i = 0; i < employeeWork.length; i++) {
    await employeeWork[i].updateDate(date);
  }

  const materialShipments = await dailyReport.getMaterialShipments();
  for (let i = 0; i < materialShipments.length; i++) {
    await materialShipments[i].updateDate(date);
  }

  return { employeeWork, materialShipments };
};

export interface IUpdateJobsiteOptions {
  checkMaterials?: boolean;
  checkTrucking?: boolean;
}
const jobsiteDefaultOptions: IUpdateJobsiteOptions = {
  checkMaterials: true,
  checkTrucking: true,
};
const jobsite = async (
  dailyReport: DailyReportDocument,
  jobsite: JobsiteDocument,
  options?: IUpdateJobsiteOptions
) => {
  options = populateOptions(options, jobsiteDefaultOptions);

  const currentJobsite = await dailyReport.getJobsite();

  const materialShipments = await dailyReport.getMaterialShipments();
  let canUpdate = true;
  for (let i = 0; i < materialShipments.length; i++) {
    // Handle materials
    if (
      options?.checkMaterials &&
      materialShipments[i].noJobsiteMaterial === false &&
      materialShipments[i].jobsiteMaterial
    ) {
      canUpdate = false;
    }

    const materialShipment = materialShipments[i];
    // Handle trucking rates
    if (
      canUpdate &&
      options?.checkTrucking &&
      materialShipment.vehicleObject?.truckingRateId
    ) {
      // Find current trucking rate
      const currentTruckingRate = currentJobsite.truckingRates.find(
        (rate) =>
          rate._id?.toString() ===
          materialShipment.vehicleObject?.truckingRateId?.toString()
      );

      if (currentTruckingRate) {
        // Try find matching trucking rate in new jobsite
        const truckingRate = jobsite.truckingRates.find((rate) => {
          return rate.title.toString() === currentTruckingRate.title;
        });

        if (truckingRate) {
          // Set trucking rate to rate with matching title in new jobsite
          materialShipment.vehicleObject.truckingRateId = truckingRate._id;
          materialShipments[i].vehicleObject = materialShipment.vehicleObject;

          await materialShipments[i].save();
        } else {
          throw new Error(
            `Unable to find matching trucking rate for daily report ${dailyReport._id}. Please manually update trucking for material shipment.`
          );
        }
      }
    }
  }

  if (canUpdate) {
    dailyReport.jobsite = jobsite._id;
    await currentJobsite.requestGenerateDayReports();
    await jobsite.requestGenerateDayReports();
  }

  return;
};

const jobCodeApproval = async (
  dailyReport: DailyReportDocument,
  approved: boolean
) => {
  dailyReport.approved = approved;

  return;
};

const payrollComplete = async (
  dailyReport: DailyReportDocument,
  complete: boolean
) => {
  dailyReport.payrollComplete = complete;

  return;
};

const addEmployeeWork = async (
  dailyReport: DailyReportDocument,
  employeeWork: EmployeeWorkDocument
) => {
  dailyReport.employeeWork.push(employeeWork._id);

  return;
};

const addVehicleWork = async (
  dailyReport: DailyReportDocument,
  vehicleWork: VehicleWorkDocument
) => {
  dailyReport.vehicleWork.push(vehicleWork._id);

  return;
};

const addProduction = async (
  dailyReport: DailyReportDocument,
  production: ProductionDocument
) => {
  dailyReport.production.push(production._id);

  return;
};

const addMaterialShipment = async (
  dailyReport: DailyReportDocument,
  materialShipment: MaterialShipmentDocument
) => {
  dailyReport.materialShipment.push(materialShipment._id);

  return;
};

const setReportNote = async (
  dailyReport: DailyReportDocument,
  reportNote: ReportNoteDocument
) => {
  if (dailyReport.reportNote)
    throw new Error("dailyReport.setReportNote: this report already has notes");

  dailyReport.reportNote = reportNote._id;

  return;
};

const addTemporaryEmployee = async (
  dailyReport: DailyReportDocument,
  employee: EmployeeDocument
) => {
  const crew = await dailyReport.getCrew();
  if (crew.employees.includes(employee._id.toString()))
    throw new Error(
      "dailyReport.addTemporaryEmployee: this employee already belongs to the crew"
    );

  if (!dailyReport.temporaryEmployees.includes(employee._id.toString())) {
    dailyReport.temporaryEmployees.push(employee._id);
  }

  return;
};

const archive = async (
  dailyReport: DailyReportDocument
): Promise<{
  employeeWork: EmployeeWorkDocument[];
  materialShipments: MaterialShipmentDocument[];
  vehicleWork: VehicleWorkDocument[];
}> => {
  dailyReport.archived = true;

  dailyReport.approved = false;

  // Archive all employee work
  const employeeWork = await dailyReport.getEmployeeWork();
  for (let i = 0; i < employeeWork.length; i++) {
    await employeeWork[i].archive();
  }

  // Archive all vehicle work
  const vehicleWork = await dailyReport.getVehicleWork();
  for (let i = 0; i < vehicleWork.length; i++) {
    await vehicleWork[i].archive();
  }

  // Archive all material shipments
  const materialShipments = await dailyReport.getMaterialShipments();
  for (let i = 0; i < materialShipments.length; i++) {
    await materialShipments[i].archive();
  }

  return { employeeWork, materialShipments, vehicleWork };
};

const addTemporaryVehicle = async (
  dailyReport: DailyReportDocument,
  vehicle: VehicleDocument
) => {
  const crew = await dailyReport.getCrew();
  if (crew.vehicles.includes(vehicle._id.toString()))
    throw new Error(
      "dailyReport.addTemporaryVehicle: this vehicle already belongs to the crew"
    );

  if (!dailyReport.temporaryVehicles.includes(vehicle._id.toString())) {
    dailyReport.temporaryVehicles.push(vehicle._id);
  }

  return;
};

export default {
  document,
  date,
  jobsite,
  jobCodeApproval,
  payrollComplete,
  addEmployeeWork,
  addVehicleWork,
  addProduction,
  addMaterialShipment,
  setReportNote,
  addTemporaryEmployee,
  addTemporaryVehicle,
  archive,
};
