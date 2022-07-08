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

const jobsite = async (
  dailyReport: DailyReportDocument,
  jobsite: JobsiteDocument
) => {
  const materialShipments = await dailyReport.getMaterialShipments();
  let canUpdate = true;
  for (let i = 0; i < materialShipments.length; i++) {
    if (
      materialShipments[i].noJobsiteMaterial === false &&
      materialShipments[i].jobsiteMaterial
    ) {
      canUpdate = false;
    }
  }

  if (canUpdate) dailyReport.jobsite = jobsite._id;

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
