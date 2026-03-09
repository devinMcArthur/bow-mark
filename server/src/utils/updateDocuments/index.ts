import updateDailyReport from "./dailyReport";
import updateEmployeeWork from "./employeeWork";
import updateJobsiteMaterials from "./jobsiteMaterial";
import updateMaterialShipment from "./materialShipment";
import updateOperatorDailyReports from "./operatorDailyReport";
import updateProduction from "./production";
import updateSystem from "./system";
import updateUser from "./user";
import updateVehicleIssues from "./vehicleIssue";
import updateVehicleWork from "./vehicleWork";

const updateDocuments = async () => {
  await updateEmployeeWork();
  await updateVehicleWork();
  await updateDailyReport();
  await updateProduction();
  await updateMaterialShipment();
  await updateUser();
  await updateJobsiteMaterials();
  await updateSystem();
  await updateVehicleIssues();
  await updateOperatorDailyReports();

  return;
};

export default updateDocuments;
