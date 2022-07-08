import { JobsiteDayReportDocument, JobsiteDocument } from "@models";
import {
  IssuesGenerationArray,
  ReportIssueTypes,
} from "@typescript/jobsiteReports";
import { Id } from "@typescript/models";

export const dayReportIssueGeneration = (
  dayReports: JobsiteDayReportDocument[]
) => {
  const issues: IssuesGenerationArray[] = [];

  const foundZeroEmployee: Id[] = [],
    foundZeroVehicle: Id[] = [],
    foundZeroMaterial: Id[] = [],
    foundEstimatedMaterial: Id[] = [];
  for (let i = 0; i < dayReports.length; i++) {
    const dayReport = dayReports[i];
    // Employee
    for (let j = 0; j < dayReport.employees.length; j++) {
      const employeeReport = dayReport.employees[j];

      // Rate is 0
      if (employeeReport.rate === 0) {
        if (
          employeeReport.employee &&
          !foundZeroEmployee.includes(employeeReport.employee.toString())
        ) {
          issues.push({
            type: ReportIssueTypes.EmployeeRateZero,
            employee: employeeReport.employee,
          });

          foundZeroEmployee.push(employeeReport.employee.toString());
        }
      }
    }

    // Vehicle
    for (let j = 0; j < dayReport.vehicles.length; j++) {
      const vehicleReport = dayReport.vehicles[j];

      // Rate is 0
      if (vehicleReport.rate === 0) {
        if (
          vehicleReport.vehicle &&
          !foundZeroVehicle.includes(vehicleReport.vehicle.toString())
        ) {
          issues.push({
            type: ReportIssueTypes.VehicleRateZero,
            vehicle: vehicleReport.vehicle,
          });

          foundZeroVehicle.push(vehicleReport.vehicle.toString());
        }
      }
    }

    // Materials
    for (let j = 0; j < dayReport.materials.length; j++) {
      const materialReport = dayReport.materials[j];

      // Rate is 0
      if (materialReport.rate === 0) {
        if (
          materialReport.jobsiteMaterial &&
          !foundZeroMaterial.includes(materialReport.jobsiteMaterial.toString())
        ) {
          issues.push({
            type: ReportIssueTypes.MaterialRateZero,
            jobsiteMaterial: materialReport.jobsiteMaterial,
          });

          foundZeroMaterial.push(materialReport.jobsiteMaterial.toString());
        }
      }

      // Rate is estimated
      if (materialReport.estimated) {
        if (
          materialReport.jobsiteMaterial &&
          !foundEstimatedMaterial.includes(
            materialReport.jobsiteMaterial.toString()
          )
        ) {
          issues.push({
            type: ReportIssueTypes.MaterialEstimatedRate,
            jobsiteMaterial: materialReport.jobsiteMaterial,
          });

          foundEstimatedMaterial.push(
            materialReport.jobsiteMaterial.toString()
          );
        }
      }
    }
  }

  return issues;
};

export const jobsiteReportIssueGenerator = async (
  jobsite: JobsiteDocument,
  dateRange?: { startTime: Date; endTime: Date }
) => {
  const issues: IssuesGenerationArray[] = [];

  const nonCostedMaterials = await jobsite.getNonCostedMaterialShipments(
    dateRange
  );
  if (nonCostedMaterials.length > 0) {
    issues.push({
      type: ReportIssueTypes.NonCostedMaterials,
      amount: nonCostedMaterials.length,
    });
  }

  return issues;
};
