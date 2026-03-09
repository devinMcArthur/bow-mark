import { EmployeeWorkDocument } from "@models";

const fullDelete = async (employeeWork: EmployeeWorkDocument) => {
  const dailyReport = await employeeWork.getDailyReport();

  if (dailyReport) {
    await dailyReport.removeEmployeeWork(employeeWork);

    await dailyReport.save();
  }

  await employeeWork.remove();

  return;
};

export default {
  fullDelete,
};
