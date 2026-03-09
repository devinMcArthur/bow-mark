import { EmployeeDocument, JobsiteDayReport } from "@models";

const requestUpdate = async (employee: EmployeeDocument) => {
  const reports = await JobsiteDayReport.getByEmployee(employee);

  for (let i = 0; i < reports.length; i++) {
    await reports[i].requestUpdate();
    await reports[i].save();
  }

  return;
};

export default {
  requestUpdate,
};
