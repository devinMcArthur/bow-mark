import {
  Employee,
  EmployeeDocument,
  OperatorDailyReport,
  VehicleDocument,
  VehicleIssueModel,
} from "@models";
import { IVehicleIssueCreate } from "@typescript/vehicleIssue";

const document = async (
  VehicleIssue: VehicleIssueModel,
  vehicle: VehicleDocument,
  author: EmployeeDocument,
  data: IVehicleIssueCreate
) => {
  // Validate operator daily report
  if (data.operatorDailyReport) {
    const operatorDailyReport = await OperatorDailyReport.getById(
      data.operatorDailyReport
    );
    if (!operatorDailyReport)
      throw new Error("Unable to find operator daily report");

    if (operatorDailyReport.vehicle?.toString() !== vehicle._id.toString())
      throw new Error("Operator daily report is for another vehicle");
  }

  // Validate assign to
  if (data.assignedTo) {
    const assignedTo = await Employee.getById(data.assignedTo);
    if (!assignedTo) throw new Error("Unable to find employee to assign to");
  }

  const vehicleIssue = new VehicleIssue({
    vehicle: vehicle._id,
    author: author._id,
    ...data,
  });

  return vehicleIssue;
};

export default {
  document,
};
