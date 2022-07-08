import {
  Company,
  CompanyDocument,
  Employee,
  EmployeeDocument,
  EmployeeReportClass,
  JobsiteDayReportDocument,
  JobsiteMaterial,
  JobsiteMaterialDocument,
  Material,
  MaterialDocument,
  MaterialReportClass,
  TruckingReportClass,
  Vehicle,
  VehicleDocument,
  VehicleReportClass,
} from "@models";
import { CrewTypes } from "@typescript/crew";
import ExcelJS from "exceljs";
import { CellLocations } from "./creation";

type JobsiteMaterialObject = {
  jobsiteMaterial: JobsiteMaterialDocument;
  material: MaterialDocument;
  company: CompanyDocument;
};

export interface IDocumentIndex {
  dayReports: JobsiteDayReportDocument[];
  employees: Record<string, EmployeeDocument>;
  vehicles: Record<string, VehicleDocument>;
  jobsiteMaterials: Record<string, JobsiteMaterialObject>;
}

export const generateDocumentIndex = async (
  dayReports: JobsiteDayReportDocument[]
): Promise<IDocumentIndex> => {
  const employees: IDocumentIndex["employees"] = {};
  const vehicles: IDocumentIndex["vehicles"] = {};
  const jobsiteMaterials: IDocumentIndex["jobsiteMaterials"] = {};

  for (let i = 0; i < dayReports.length; i++) {
    const dayReport = dayReports[i];

    // Employees
    for (let j = 0; j < dayReport.employees.length; j++) {
      const employeeReport = dayReport.employees[j];
      if (employeeReport.employee) {
        if (!employees[employeeReport.employee.toString()]) {
          const employee = await Employee.getById(employeeReport.employee);
          if (employee) {
            employees[employeeReport.employee.toString()] = employee;
          }
        }
      }
    }

    // Vehicles
    for (let j = 0; j < dayReport.vehicles.length; j++) {
      const vehicleReport = dayReport.vehicles[j];
      if (vehicleReport.vehicle) {
        if (!vehicles[vehicleReport.vehicle.toString()]) {
          const vehicle = await Vehicle.getById(vehicleReport.vehicle);
          if (vehicle) {
            vehicles[vehicleReport.vehicle.toString()] = vehicle;
          }
        }
      }
    }

    // Jobsite Materials
    for (let j = 0; j < dayReport.materials.length; j++) {
      const materialReport = dayReport.materials[j];
      if (materialReport.jobsiteMaterial) {
        if (!jobsiteMaterials[materialReport.jobsiteMaterial.toString()]) {
          const jobsiteMaterial = await JobsiteMaterial.getById(
            materialReport.jobsiteMaterial
          );
          if (jobsiteMaterial) {
            const company = await Company.getById(
              jobsiteMaterial.supplier || ""
            );
            const material = await Material.getById(
              jobsiteMaterial.material || ""
            );
            if (company && material)
              jobsiteMaterials[materialReport.jobsiteMaterial.toString()] = {
                jobsiteMaterial,
                material,
                company,
              };
          }
        }
      }
    }
  }

  return {
    dayReports,
    employees,
    vehicles,
    jobsiteMaterials,
  };
};

export interface IEmployeeReportCatalog {
  employee: EmployeeDocument;
  reports: (EmployeeReportClass | null)[];
  totalHours: number;
  totalCost: number;
}

/**
 * Generates a catalog of employees and relevant reports for easy rendering
 * into a table
 * @param crewType
 * @param documentIndex
 * @returns
 */
export const generateCrewEmployeeCatalog = async (
  crewType: CrewTypes,
  documentIndex: IDocumentIndex
): Promise<{
  employeeCatalog: IEmployeeReportCatalog[];
  relevantReports: JobsiteDayReportDocument[];
}> => {
  const reportCatalog: IEmployeeReportCatalog[] = [];

  const relevantReports = documentIndex.dayReports.filter(
    (report) =>
      report.employees.length > 0 &&
      report.employees.map((employee) => employee.crewType).includes(crewType)
  );

  const populatedReportIndices: number[][] = [];

  // Instantiate catalog
  for (let i = 0; i < relevantReports.length; i++) {
    const relevantReport = relevantReports[i];

    populatedReportIndices[i] = [];

    for (let j = 0; j < relevantReport.employees.length; j++) {
      const employeeReport = relevantReport.employees[j];

      // Only add if crewType matches
      if (employeeReport.crewType === crewType) {
        const existingIndex = reportCatalog.findIndex(
          (catalog) =>
            catalog.employee._id.toString() ===
            employeeReport.employee?.toString()
        );

        // Add to catalog
        if (
          employeeReport.employee &&
          documentIndex.employees[employeeReport.employee.toString()]
        ) {
          if (existingIndex === -1) {
            // Add new catalog item
            reportCatalog.push({
              employee:
                documentIndex.employees[employeeReport.employee.toString()],
              reports: [employeeReport],
              totalCost: 0,
              totalHours: 0,
            });
            populatedReportIndices[i].push(reportCatalog.length - 1);
          } else {
            // Add to existing item
            reportCatalog[existingIndex].reports.push(employeeReport);
            populatedReportIndices[i].push(existingIndex);
          }
        }
      }
    }
  }

  // Set null for each material report that wasn't seen
  for (let i = 0; i < populatedReportIndices.length; i++) {
    for (let j = 0; j < reportCatalog.length; j++) {
      if (!populatedReportIndices[i].includes(j)) {
        reportCatalog[j].reports.splice(i, 0, null);
      }
    }
  }

  // Generate totals
  for (let i = 0; i < reportCatalog.length; i++) {
    const catalog = reportCatalog[i];

    let totalHours = 0,
      totalCost = 0;
    for (let j = 0; j < catalog.reports.length; j++) {
      const report = catalog.reports[j];

      if (report) {
        totalHours += report.hours;
        totalCost += report.hours * report.rate;
      }
    }

    catalog.totalCost = totalCost;
    catalog.totalHours = totalHours;
  }

  return { employeeCatalog: reportCatalog, relevantReports };
};

export interface IEquipmentReportCatalog {
  vehicle: VehicleDocument;
  reports: (VehicleReportClass | null)[];
  totalHours: number;
  totalCost: number;
}

/**
 * Generates a catalog of equipment and relevant reports for easy rendering
 * into a table
 * @param crewType
 * @param documentIndex
 * @returns
 */
export const generateCrewEquipmentCatalog = async (
  crewType: CrewTypes,
  documentIndex: IDocumentIndex
): Promise<{
  equipmentCatalog: IEquipmentReportCatalog[];
  relevantReports: JobsiteDayReportDocument[];
}> => {
  const reportCatalog: IEquipmentReportCatalog[] = [];

  const relevantReports = documentIndex.dayReports.filter(
    (report) =>
      report.vehicles.length > 0 &&
      report.vehicles.map((employee) => employee.crewType).includes(crewType)
  );

  const populatedReportIndices: number[][] = [];

  // Instantiate catalog
  for (let i = 0; i < relevantReports.length; i++) {
    const relevantReport = relevantReports[i];

    populatedReportIndices[i] = [];

    for (let j = 0; j < relevantReport.vehicles.length; j++) {
      const vehicleReport = relevantReport.vehicles[j];

      // Only add if crewType matches
      if (vehicleReport.crewType === crewType) {
        const existingIndex = reportCatalog.findIndex(
          (catalog) =>
            catalog.vehicle._id.toString() === vehicleReport.vehicle?.toString()
        );

        // Add to catalog
        if (
          vehicleReport.vehicle &&
          documentIndex.vehicles[vehicleReport.vehicle.toString()]
        ) {
          if (existingIndex === -1) {
            // Add new catalog item
            reportCatalog.push({
              vehicle: documentIndex.vehicles[vehicleReport.vehicle.toString()],
              reports: [vehicleReport],
              totalCost: 0,
              totalHours: 0,
            });
            populatedReportIndices[i].push(reportCatalog.length - 1);
          } else {
            // Add to existing item
            reportCatalog[existingIndex].reports.push(vehicleReport);
            populatedReportIndices[i].push(existingIndex);
          }
        }
      }
    }
  }

  // Set null for each equipment report that wasn't seen
  for (let i = 0; i < populatedReportIndices.length; i++) {
    for (let j = 0; j < reportCatalog.length; j++) {
      if (!populatedReportIndices[i].includes(j)) {
        reportCatalog[j].reports.splice(i, 0, null);
      }
    }
  }

  // Generate totals
  for (let i = 0; i < reportCatalog.length; i++) {
    const catalog = reportCatalog[i];

    let totalHours = 0,
      totalCost = 0;
    for (let j = 0; j < catalog.reports.length; j++) {
      const report = catalog.reports[j];

      if (report) {
        totalHours += report.hours;
        totalCost += report.hours * report.rate;
      }
    }

    catalog.totalCost = totalCost;
    catalog.totalHours = totalHours;
  }

  return { equipmentCatalog: reportCatalog, relevantReports };
};

export interface IMaterialReportCatalog {
  jobsiteMaterial: JobsiteMaterialObject;
  deliveredRateId?: string;
  reports: (MaterialReportClass | null)[];
  totalQuantity: number;
  totalCost: number;
}

/**
 * Generates a catalog of materials and relevant reports for easy rendering
 * into a table
 * @param crewType
 * @param documentIndex
 * @returns
 */
export const generateCrewMaterialCatalog = async (
  crewType: CrewTypes,
  documentIndex: IDocumentIndex
): Promise<{
  materialCatalog: IMaterialReportCatalog[];
  relevantReports: JobsiteDayReportDocument[];
}> => {
  const reportCatalog: IMaterialReportCatalog[] = [];

  const relevantReports = documentIndex.dayReports.filter(
    (report) =>
      report.materials.length > 0 &&
      report.materials.map((employee) => employee.crewType).includes(crewType)
  );

  const populatedReportIndices: number[][] = [];

  // Instantiate catalog
  for (let i = 0; i < relevantReports.length; i++) {
    const relevantReport = relevantReports[i];

    populatedReportIndices[i] = [];

    for (let j = 0; j < relevantReport.materials.length; j++) {
      const materialReport = relevantReport.materials[j];

      // Only add if crewType matches
      if (materialReport.crewType === crewType) {
        const existingIndex = reportCatalog.findIndex(
          (catalog) =>
            catalog.jobsiteMaterial.jobsiteMaterial._id.toString() ===
              materialReport.jobsiteMaterial?.toString() &&
            catalog.deliveredRateId === materialReport.deliveredRateId
        );

        // Add to catalog
        if (
          materialReport.jobsiteMaterial &&
          documentIndex.jobsiteMaterials[
            materialReport.jobsiteMaterial.toString()
          ]
        ) {
          if (existingIndex === -1) {
            // Add new catalog item
            reportCatalog.push({
              jobsiteMaterial:
                documentIndex.jobsiteMaterials[
                  materialReport.jobsiteMaterial.toString()
                ],
              reports: [materialReport],
              totalCost: 0,
              totalQuantity: 0,
              deliveredRateId: materialReport.deliveredRateId?.toString(),
            });
            populatedReportIndices[i].push(reportCatalog.length - 1);
          } else {
            // Add to existing item
            reportCatalog[existingIndex].reports.push(materialReport);
            populatedReportIndices[i].push(existingIndex);
          }
        }
      }
    }
  }

  // Set null for each material report that wasn't seen
  for (let i = 0; i < populatedReportIndices.length; i++) {
    for (let j = 0; j < reportCatalog.length; j++) {
      if (!populatedReportIndices[i].includes(j)) {
        reportCatalog[j].reports.splice(i, 0, null);
      }
    }
  }

  // Generate totals
  for (let i = 0; i < reportCatalog.length; i++) {
    const catalog = reportCatalog[i];

    let totalQuantity = 0,
      totalCost = 0;
    for (let j = 0; j < catalog.reports.length; j++) {
      const report = catalog.reports[j];

      if (report) {
        totalQuantity += report.quantity;
        totalCost += report.quantity * report.rate;
      }
    }

    catalog.totalCost = totalCost;
    catalog.totalQuantity = totalQuantity;
  }

  return { materialCatalog: reportCatalog, relevantReports };
};

export interface ITruckingReportCatalog {
  truckingType: string;
  reports: (TruckingReportClass | null)[];
  totalHours: number;
  totalQuantity: number;
  totalCost: number;
}

/**
 * Generates a catalog of trucking and relevant reports for easy rendering
 * into a table
 * @param crewType
 * @param documentIndex
 * @returns
 */
export const generateCrewTruckingCatalog = async (
  crewType: CrewTypes,
  documentIndex: IDocumentIndex
): Promise<{
  truckingCatalog: ITruckingReportCatalog[];
  relevantReports: JobsiteDayReportDocument[];
}> => {
  const reportCatalog: ITruckingReportCatalog[] = [];

  const relevantReports = documentIndex.dayReports.filter(
    (report) =>
      report.trucking.length > 0 &&
      report.trucking.map((trucking) => trucking.crewType).includes(crewType)
  );

  const populatedReportIndices: number[][] = [];

  // Instantiate catalog
  for (let i = 0; i < relevantReports.length; i++) {
    const relevantReport = relevantReports[i];

    populatedReportIndices[i] = [];

    for (let j = 0; j < relevantReport.trucking.length; j++) {
      const truckingReport = relevantReport.trucking[j];

      // Only add if crewType matches
      if (truckingReport.crewType === crewType) {
        const existingIndex = reportCatalog.findIndex(
          (catalog) => catalog.truckingType === truckingReport.truckingType
        );

        // Add to catalog
        if (existingIndex === -1) {
          // Add new catalog item
          reportCatalog.push({
            truckingType: truckingReport.truckingType,
            reports: [truckingReport],
            totalCost: 0,
            totalHours: 0,
            totalQuantity: 0,
          });
          populatedReportIndices[i].push(reportCatalog.length - 1);
        } else {
          // Add to existing item
          reportCatalog[existingIndex].reports.push(truckingReport);
          populatedReportIndices[i].push(existingIndex);
        }
      }
    }
  }

  // Set null for each trucking report that wasn't seen
  for (let i = 0; i < populatedReportIndices.length; i++) {
    for (let j = 0; j < reportCatalog.length; j++) {
      if (!populatedReportIndices[i].includes(j)) {
        reportCatalog[j].reports.splice(i, 0, null);
      }
    }
  }

  // Generate totals
  for (let i = 0; i < reportCatalog.length; i++) {
    const catalog = reportCatalog[i];

    let totalHours = 0,
      totalCost = 0,
      totalQuantity = 0;
    for (let j = 0; j < catalog.reports.length; j++) {
      const report = catalog.reports[j];

      if (report) {
        totalHours += report.hours || 0;
        totalCost += (report.hours || 0) * report.rate;
        totalQuantity += report.quantity;
      }
    }

    catalog.totalCost = totalCost;
    catalog.totalHours = totalHours;
    catalog.totalQuantity = totalQuantity;
  }

  return { truckingCatalog: reportCatalog, relevantReports };
};

/**
 * given current table positions,
 * provides the column to start the next group of tables
 * @param worksheet
 * @param cellLocations
 * @param options
 * @returns
 */
export const getStartingColumnCell = (
  worksheet: ExcelJS.Worksheet,
  cellLocations: CellLocations[],
  options?: {
    row?: ExcelJS.Row;
    startingColumn?: number;
  }
) => {
  const index = cellLocations.length - 1;
  if (index === 0 && options?.row) {
    return options.row.getCell(options?.startingColumn || 1);
  } else {
    const cellLocation = cellLocations[index - 1];

    const colNumbers: number[] = [];
    if (cellLocation.wages) {
      colNumbers.push(parseInt(cellLocation.wages.bottomRight.col));
    }

    if (cellLocation.equipment) {
      colNumbers.push(parseInt(cellLocation.equipment.bottomRight.col));
    }

    if (cellLocation.material) {
      colNumbers.push(parseInt(cellLocation.material.bottomRight.col));
    }

    if (cellLocation.trucking) {
      colNumbers.push(parseInt(cellLocation.trucking.bottomRight.col));
    }

    const sorted = colNumbers.sort((a, b) => b - a);

    if (cellLocation.wages)
      return worksheet
        .getRow(
          options?.row
            ? options.row.number
            : parseInt(cellLocation.wages.topLeft.row)
        )
        .getCell(sorted[0] + 2);
  }

  return undefined;
};

/**
 * @desc given previous table locations, provides the row on which
 *       to place your next item
 * @param worksheet
 * @param cellLocations
 * @returns
 */
export const getStartRowCell = (
  worksheet: ExcelJS.Worksheet,
  cellLocations: CellLocations[]
) => {
  const index = cellLocations.length - 1;
  const cellLocation = cellLocations[index];

  // Must be ordered from bottom to top
  if (cellLocation.trucking) {
    return worksheet
      .getRow(parseInt(cellLocation.trucking.bottomRight.row) + 2)
      .getCell(parseInt(cellLocation.trucking.topLeft.col));
  } else if (cellLocation.material) {
    return worksheet
      .getRow(parseInt(cellLocation.material.bottomRight.row) + 2)
      .getCell(parseInt(cellLocation.material.topLeft.col));
  } else if (cellLocation.equipment) {
    return worksheet
      .getRow(parseInt(cellLocation.equipment.bottomRight.row) + 2)
      .getCell(parseInt(cellLocation.equipment.topLeft.col));
  } else if (cellLocation.wages) {
    return worksheet
      .getRow(parseInt(cellLocation.wages.bottomRight.row) + 2)
      .getCell(parseInt(cellLocation.wages.topLeft.col));
  } else {
    return worksheet.getRow(2).getCell(1);
  }
};

export const safeCrewTableName = (name: string) => {
  return name.replace(/\s+|\/+/g, "");
};
