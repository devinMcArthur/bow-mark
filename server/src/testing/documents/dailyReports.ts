import { DailyReport, DailyReportDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededDailyReports {
  jobsite_1_base_1_1: DailyReportDocument;
  jobsite_1_base_1_2: DailyReportDocument;
  jobsite_2_base_1_1: DailyReportDocument;
  jobsite_2_base_1_2: DailyReportDocument;
  jobsite_1_base_1_3: DailyReportDocument;
}

const createDailyReports = async (): Promise<SeededDailyReports> => {
  const jobsite_1_base_1_1 = new DailyReport({
    _id: _ids.dailyReports.jobsite_1_base_1_1._id,
    date: new Date("2022-02-23 7:00 am"),
    jobsite: _ids.jobsites.jobsite_1._id,
    crew: _ids.crews.base_1._id,
    approved: true,
    employeeWork: [
      _ids.employeeWork.jobsite_1_base_1_1_base_foreman_1._id,
      _ids.employeeWork.jobsite_1_base_1_1_base_foreman_2._id,
    ],
    vehicleWork: [_ids.vehicleWork.jobsite_1_base_1_1_skidsteer_1._id],
    production: [_ids.productions.jobsite_1_base_1_1_production_1._id],
    materialShipment: [
      _ids.materialShipments.jobsite_1_base_1_1_shipment_1._id,
    ],
    reportNote: _ids.reportNotes.jobsite_1_base_1_1_note_1._id,
    temporaryEmployees: [_ids.employees.temp_1._id],
    temporaryVehicles: [_ids.vehicles.temp_1._id],
  });

  const jobsite_1_base_1_3 = new DailyReport({
    _id: _ids.dailyReports.jobsite_1_base_1_3._id,
    // same date to test jobsite day report creation
    date: new Date("2022-02-23 7:00 am"),
    jobsite: _ids.jobsites.jobsite_1._id,
    crew: _ids.crews.base_1._id,
    approved: true,
    employeeWork: [],
    vehicleWork: [],
    production: [],
    materialShipment: [],
    temporaryEmployees: [],
    temporaryVehicles: [],
  });

  const jobsite_1_base_1_2 = new DailyReport({
    _id: _ids.dailyReports.jobsite_1_base_1_2._id,
    date: new Date("2022-02-24 7:00 am"),
    jobsite: _ids.jobsites.jobsite_1._id,
    crew: _ids.crews.base_1._id,
    approved: true,
    employeeWork: [],
    vehicleWork: [],
    production: [],
    materialShipment: [],
    temporaryEmployees: [],
    temporaryVehicles: [],
  });

  const jobsite_2_base_1_1 = new DailyReport({
    _id: _ids.dailyReports.jobsite_2_base_1_1._id,
    date: new Date("2022-02-25 7:00 am"),
    jobsite: _ids.jobsites.jobsite_2._id,
    crew: _ids.crews.base_1._id,
    materialShipment: [
      _ids.materialShipments.jobsite_2_base_1_1_shipment_1._id,
      _ids.materialShipments.jobsite_2_base_1_1_shipment_2._id,
      _ids.materialShipments.jobsite_2_base_1_1_shipment_3._id,
      _ids.materialShipments.jobsite_2_base_1_1_shipment_4._id,
    ],
  });

  const jobsite_2_base_1_2 = new DailyReport({
    _id: _ids.dailyReports.jobsite_2_base_1_2._id,
    date: new Date("2022-03-02 7:00 am"),
    jobsite: _ids.jobsites.jobsite_2._id,
    crew: _ids.crews.base_1._id,
    materialShipment: [
      _ids.materialShipments.jobsite_2_base_1_2_shipment_1._id,
    ],
  });

  const dailyReports = {
    jobsite_1_base_1_1,
    jobsite_1_base_1_2,
    jobsite_1_base_1_3,
    jobsite_2_base_1_1,
    jobsite_2_base_1_2,
  };

  for (let i = 0; i < Object.values(dailyReports).length; i++) {
    await Object.values(dailyReports)[i].save();
  }

  return dailyReports;
};

export default createDailyReports;
