import { logger } from "@logger";
import {
  Company,
  Crew,
  DailyReport,
  Employee,
  Jobsite,
  Material,
  Vehicle,
} from "@models";
import {
  search_UpdateCompany,
  search_UpdateCrew,
  search_UpdateDailyReport,
  search_UpdateEmployee,
  search_UpdateJobsite,
  search_UpdateMaterial,
  search_UpdateVehicle,
} from "@search";
import errorHandler from "@utils/errorHandler";
import isEmpty from "@utils/isEmpty";

export enum SkipSave {
  Employee,
  Vehicle,
  Jobsite,
  DailyReport,
  Crew,
  Material,
  Company,
}

const saveAll = async (
  skip?: SkipSave[],
  type: "save" | "search" = "search"
) => {
  console.log("Saving all documents");

  // Employee
  if (!skip?.includes(SkipSave.Employee)) {
    const employees = await Employee.find();
    logger.info(`Saving ${employees.length} employee documents`);
    for (let i = 0; i < employees.length; i++) {
      try {
        if (!employees[i].name) employees[i].name = "Placeholder";

        if (type === "save") {
          await employees[i].save();
        } else if (type === "search") {
          await search_UpdateEmployee(employees[i]);
        }
      } catch (e) {
        errorHandler("Employee Save All error", e);
      }
    }
  }

  // Vehicle
  if (!skip?.includes(SkipSave.Vehicle)) {
    const vehicles = await Vehicle.find();
    logger.info(`Saving ${vehicles.length} vehicle documents`);
    for (let i = 0; i < vehicles.length; i++) {
      try {
        if (type === "save") {
          await vehicles[i].save();
        } else if (type === "search") {
          await search_UpdateVehicle(vehicles[i]);
        }
      } catch (e) {
        errorHandler("Vehicle Save All error", e);
      }
    }
  }

  // Jobsite
  if (!skip?.includes(SkipSave.Jobsite)) {
    const jobsites = await Jobsite.find();
    logger.info(`Saving ${jobsites.length} jobsite documents`);
    for (let i = 0; i < jobsites.length; i++) {
      try {
        if (!jobsites[i].name) jobsites[i].name = "Placeholder";

        if (type === "save") {
          await jobsites[i].save();
        } else if (type === "search") {
          await search_UpdateJobsite(jobsites[i]);
        }
      } catch (e) {
        errorHandler("Jobsite Save All error", e);
      }
    }
  }

  // DailyReport
  if (!skip?.includes(SkipSave.DailyReport)) {
    const dailyReports = await DailyReport.find();
    logger.info(`Saving ${dailyReports.length} dailyReport documents`);
    for (let i = 0; i < dailyReports.length; i++) {
      if (isEmpty(dailyReports[i].reportNote)) {
        dailyReports[i].reportNote = undefined;
      }

      try {
        if (type === "save") {
          await dailyReports[i].save();
        } else if (type === "search") {
          await search_UpdateDailyReport(dailyReports[i]);
        }
      } catch (e) {
        errorHandler("Daily Report Save All error", e);
      }
    }
  }

  // Crew
  if (!skip?.includes(SkipSave.Crew)) {
    const crews = await Crew.find();
    logger.info(`Saving ${crews.length} crew documents`);
    for (let i = 0; i < crews.length; i++) {
      try {
        if (type === "save") {
          await crews[i].save();
        } else if (type === "search") {
          await search_UpdateCrew(crews[i]);
        }
      } catch (e) {
        errorHandler("Crew Save All error", e);
      }
    }
  }

  // Material
  if (!skip?.includes(SkipSave.Material)) {
    const materials = await Material.find();
    logger.info(`Saving ${materials.length} material documents`);
    for (let i = 0; i < materials.length; i++) {
      try {
        if (type === "save") {
          await materials[i].save();
        } else if (type === "search") {
          await search_UpdateMaterial(materials[i]);
        }
      } catch (e) {
        errorHandler("Material Save All error", e);
      }
    }
  }

  // Company
  if (!skip?.includes(SkipSave.Company)) {
    const companies = await Company.find();
    logger.info(`Saving ${companies.length} company documents`);
    for (let i = 0; i < companies.length; i++) {
      try {
        if (type === "save") {
          await companies[i].save();
        } else if (type === "search") {
          await search_UpdateCompany(companies[i]);
        }
      } catch (e) {
        errorHandler("Company Save All error", e);
      }
    }
  }

  console.log("Finished saving");

  return;
};

export default saveAll;
