import { EmployeeWorkDocument } from "@models";

const requestUpdate = async (employeeWork: EmployeeWorkDocument) => {
  const dailyReport = await employeeWork.getDailyReport();

  await dailyReport?.requestReportUpdate();

  return;
};

export default {
  requestUpdate,
};
