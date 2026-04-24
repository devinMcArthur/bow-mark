import { System } from "@models";
import clearDatabase from "./clearDatabase";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
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
import createCrewKinds, { SeededCrewKinds } from "./documents/crewKinds";
import createRateBuildupTemplates, {
  SeededRateBuildupTemplates,
} from "./documents/rateBuildupTemplates";
import createTenderPricing, {
  SeededTenderPricing,
} from "./documents/tenderPricing";

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
  crewKinds: SeededCrewKinds;
  rateBuildupTemplates: SeededRateBuildupTemplates;
  tenderPricing: SeededTenderPricing;
}

const seedDatabase = async () => {
  console.log("Database seeding...");

  // Clear Database
  await clearDatabase();

  // Provision reserved FileNode roots (idempotent). Required by entity
  // creation paths (Tender/Jobsite/DailyReport) which provision per-entity
  // roots inside transactions.
  await bootstrapRoots();

  // Create documents

  await System.validateSystem();
  // Populate laborTypes so employee work dropdowns have selectable options in
  // E2E tests — validateSystem() seeds the singleton with an empty array.
  const system = await System.getSystem();
  if (system && system.laborTypes.length === 0) {
    await system.updateLaborTypes(["General labor", "Operator", "Foreman"]);
    await system.save();
  }

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

  // Tender pricing E2E fixtures — depend on materials and users seeded above.
  const crewKinds = await createCrewKinds();
  const rateBuildupTemplates = await createRateBuildupTemplates();
  const tenderPricing = await createTenderPricing();

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
    crewKinds,
    rateBuildupTemplates,
    tenderPricing,
  };
};

export default seedDatabase;
