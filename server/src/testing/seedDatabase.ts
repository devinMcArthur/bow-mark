import { System } from "@models";
import clearDatabase from "./clearDatabase";
import createCompanies, { SeededCompanies } from "./documents/company";

import createCrews, { SeededCrews } from "./documents/crews";
import createDailyReports, {
  SeededDailyReports,
} from "./documents/dailyReports";
import createEmployees, { SeededEmployees } from "./documents/employees";
import createEmployeeWork, {
  SeededEmployeeWork,
} from "./documents/employeeWork";
import createFiles, { SeededFiles } from "./documents/files";
import createInvoices, { SeededInvoices } from "./documents/invoices";
import createJobsiteMaterials, {
  SeededJobsiteMaterials,
} from "./documents/jobsiteMaterials";
import createJobsites, { SeededJobsites } from "./documents/jobsites";
import createMaterials, { SeededMaterials } from "./documents/materials";
import createMaterialShipments, {
  SeededMaterialShipments,
} from "./documents/materialShipments";
import createProductions, { SeededProduction } from "./documents/productions";
import createReportNotes, { SeededReportNotes } from "./documents/reportNotes";
import createSignups, { SeededSignups } from "./documents/signups";
import createUsers, { SeededUsers } from "./documents/users";
import createVehicles, { SeededVehicles } from "./documents/vehicles";
import createVehicleWork, { SeededVehicleWork } from "./documents/vehicleWork";

export interface SeededDatabase {
  companies: SeededCompanies;
  crews: SeededCrews;
  dailyReports: SeededDailyReports;
  employees: SeededEmployees;
  employeeWork: SeededEmployeeWork;
  files: SeededFiles;
  invoices: SeededInvoices;
  jobsites: SeededJobsites;
  jobsiteMaterials: SeededJobsiteMaterials;
  materials: SeededMaterials;
  materialShipments: SeededMaterialShipments;
  productions: SeededProduction;
  reportNotes: SeededReportNotes;
  signups: SeededSignups;
  users: SeededUsers;
  vehicles: SeededVehicles;
  vehicleWork: SeededVehicleWork;
}

const seedDatabase = async () => {
  console.log("Database seeding...");

  // Clear Database
  await clearDatabase();

  // Create documents

  const jobsites = await createJobsites();

  const companies = await createCompanies();
  const crews = await createCrews();
  const dailyReports = await createDailyReports();
  const employees = await createEmployees();
  const employeeWork = await createEmployeeWork();
  const files = await createFiles();
  const invoices = await createInvoices();
  const jobsiteMaterials = await createJobsiteMaterials();
  const materials = await createMaterials();
  const materialShipments = await createMaterialShipments();
  const productions = await createProductions();
  const reportNotes = await createReportNotes();
  const signups = await createSignups();
  const users = await createUsers();
  const vehicles = await createVehicles();
  const vehicleWork = await createVehicleWork();

  await System.validateSystem();

  console.log("seeded");

  return {
    companies,
    crews,
    dailyReports,
    employees,
    employeeWork,
    files,
    invoices,
    jobsites,
    jobsiteMaterials,
    materials,
    materialShipments,
    productions,
    reportNotes,
    signups,
    users,
    vehicles,
    vehicleWork,
  };
};

export default seedDatabase;
