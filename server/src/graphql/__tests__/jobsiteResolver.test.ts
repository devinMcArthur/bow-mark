import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/jestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import jestLogin from "@testing/jestLogin";
import { JobsiteMaterialCreateData } from "@graphql/resolvers/jobsiteMaterial/mutations";
import { Invoice, Jobsite, JobsiteMaterial, System } from "@models";
import { InvoiceData } from "@graphql/resolvers/invoice/mutations";
import { JobsiteCreateData } from "@graphql/resolvers/jobsite/mutations";
import { TruckingRateTypes } from "@typescript/jobsite";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "http";
import { JobsiteMaterialCostType } from "@typescript/jobsiteMaterial";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

let mongoServer: MongoMemoryServer, documents: SeededDatabase, app: Server;
const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  mongoServer = await prepareDatabase();

  app = await createApp();

  await setupDatabase();
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});

describe("Jobsite Resolver", () => {
  describe("QUERIES", () => {
    describe("jobsite", () => {
      const jobsiteQuery = `
        query Jobsite($id: String!) {
          jobsite(id: $id) {
            _id 
            name
            crews {
              name
            }
            dailyReports {
              date
            }
          }
        }
      `;

      describe("success", () => {
        test("should fetch and get all requested fields", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({
              query: jobsiteQuery,
              variables: {
                id: _ids.jobsites.jobsite_1._id,
              },
            });

          expect(res.status).toBe(200);

          expect(res.body.data.jobsite).toBeDefined();
          const jobsite = res.body.data.jobsite;

          expect(jobsite.name).toBe(documents.jobsites.jobsite_1.name);

          expect(jobsite.crews.length).toBe(
            documents.jobsites.jobsite_1.crews.length
          );
          expect(jobsite.crews[0].name).toBe(documents.crews.base_1.name);

          expect(jobsite.dailyReports.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("MUTATIONS", () => {
    describe("jobsiteCreate", () => {
      const jobsiteCreate = `
        mutation JobsiteCreate($data: JobsiteCreateData!) {
          jobsiteCreate(data: $data) {
            _id
            name
            truckingRates {
              title
              rates {
                rate
                date
                type
              }
            }
          }
        }
      `;

      describe("success", () => {
        test("should successfully create a jobsite", async () => {
          const token = await jestLogin(app, documents.users.admin_user.email);

          const data: JobsiteCreateData = {
            jobcode: "1",
            name: "test",
            description: "description",
          };

          const res = await request(app)
            .post("/graphql")
            .send({
              query: jobsiteCreate,
              variables: {
                data,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.jobsiteCreate._id).toBeDefined();

          const jobsite = await Jobsite.getById(
            res.body.data.jobsiteCreate._id,
            { throwError: true }
          );

          const system = await System.getSystem();

          expect(jobsite?.truckingRates.length).toBe(
            system.materialShipmentVehicleTypeDefaults.length
          );

          expect(jobsite?.truckingRates[0].title).toBe(
            system.materialShipmentVehicleTypeDefaults[0].title
          );
          expect(jobsite?.truckingRates[0].rates.length).toBe(
            system.materialShipmentVehicleTypeDefaults[0].rates.length
          );
          expect(jobsite?.truckingRates[0].rates[0].type).toBe(
            TruckingRateTypes.Hour
          );
        });
      });
    });

    describe("jobsiteAddMaterial", () => {
      const jobsiteAddMaterial = `
        mutation JobsiteAddMaterial($jobsiteId: String!, $data: JobsiteMaterialCreateData!) {
          jobsiteAddMaterial(jobsiteId: $jobsiteId, data: $data) {
            _id
            materials {
              _id
              material {
                name
              }
              supplier {
                name
              }
              quantity
              unit
              rates {
                date
                rate
              }
            }
          }
        }
      `;

      describe("success", () => {
        test("should successfully create a jobsite material w/o delievered", async () => {
          const token = await jestLogin(app, documents.users.admin_user.email);

          const data: JobsiteMaterialCreateData = {
            materialId: documents.materials.material_1._id.toString(),
            supplierId: documents.companies.company_1._id.toString(),
            quantity: 1000,
            rates: [
              {
                date: new Date(),
                rate: 125,
                estimated: true,
              },
            ],
            unit: "tonnes",
            costType: JobsiteMaterialCostType.rate,
            deliveredRates: [],
          };

          const res = await request(app)
            .post("/graphql")
            .send({
              query: jobsiteAddMaterial,
              variables: {
                jobsiteId: documents.jobsites.jobsite_2._id,
                data,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.jobsiteAddMaterial._id).toBe(
            documents.jobsites.jobsite_2._id.toString()
          );

          const jobsite = await Jobsite.getById(
            documents.jobsites.jobsite_2._id
          );

          expect(jobsite?.materials.length).toBe(2);

          const jobsiteMaterial = await JobsiteMaterial.getById(
            jobsite?.materials[1]?.toString() || ""
          );

          expect(jobsiteMaterial?.supplier?.toString()).toBe(data.supplierId);

          expect(jobsiteMaterial?.rates[0].estimated).toBeTruthy();

          await setupDatabase();
        });

        test("should successfully create a jobsite material w/o delievered", async () => {
          const token = await jestLogin(app, documents.users.admin_user.email);

          const data: JobsiteMaterialCreateData = {
            materialId: documents.materials.material_1._id.toString(),
            supplierId: documents.companies.company_1._id.toString(),
            quantity: 1000,
            rates: [],
            unit: "tonnes",
            costType: JobsiteMaterialCostType.deliveredRate,
            deliveredRates: [
              {
                title: "Tandem",
                rates: [
                  {
                    date: new Date(),
                    rate: 125,
                    estimated: true,
                  },
                ],
              },
            ],
          };

          const res = await request(app)
            .post("/graphql")
            .send({
              query: jobsiteAddMaterial,
              variables: {
                jobsiteId: documents.jobsites.jobsite_2._id,
                data,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.jobsiteAddMaterial._id).toBe(
            documents.jobsites.jobsite_2._id.toString()
          );

          const jobsite = await Jobsite.getById(
            documents.jobsites.jobsite_2._id
          );

          expect(jobsite?.materials.length).toBe(2);

          const jobsiteMaterial = await JobsiteMaterial.getById(
            jobsite?.materials[1]?.toString() || ""
          );

          expect(jobsiteMaterial?.supplier?.toString()).toBe(data.supplierId);

          expect(
            jobsiteMaterial?.deliveredRates[0].rates[0].estimated
          ).toBeTruthy();

          await setupDatabase();
        });
      });
    });

    describe("jobsiteAddExpenseInvoice", () => {
      const jobsiteAddExpenseInvoice = `
        mutation JobsiteAddExpenseInvoice($jobsiteId: String!, $data: InvoiceData!) {
          jobsiteAddExpenseInvoice(jobsiteId: $jobsiteId, data: $data) {
            _id
            expenseInvoices {
              _id
              cost
              company {
                name
              }
              invoiceNumber
              internal
              description
            }
          }
        }
      `;

      describe("success", () => {
        test("should successfully create an invoice", async () => {
          const token = await jestLogin(app, documents.users.admin_user.email);

          const data: InvoiceData = {
            companyId: documents.companies.company_1._id.toString(),
            cost: 100,
            internal: false,
            date: new Date(),
            invoiceNumber: "12345",
            description: "Description of invoice",
            accrual: false,
          };

          const res = await request(app)
            .post("/graphql")
            .send({
              query: jobsiteAddExpenseInvoice,
              variables: {
                jobsiteId: documents.jobsites.jobsite_2._id,
                data,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.jobsiteAddExpenseInvoice._id).toBe(
            documents.jobsites.jobsite_2._id.toString()
          );

          const jobsite = await Jobsite.getById(
            documents.jobsites.jobsite_2._id
          );

          expect(jobsite?.expenseInvoices.length).toBe(1);

          const invoice = await Invoice.getById(
            jobsite?.expenseInvoices[0]?.toString() || ""
          );

          expect(invoice?.company?.toString()).toBe(data.companyId);
        });
      });
    });
  });
});
