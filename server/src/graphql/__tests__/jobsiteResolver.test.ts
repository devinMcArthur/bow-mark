import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import vitestLogin from "@testing/vitestLogin";
import { JobsiteMaterialCreateData } from "@graphql/resolvers/jobsiteMaterial/mutations";
import { Invoice, Jobsite, JobsiteMaterial, System } from "@models";
import { InvoiceData } from "@graphql/resolvers/invoice/mutations";
import { JobsiteCreateData } from "@graphql/resolvers/jobsite/mutations";
import { TruckingRateTypes } from "@typescript/jobsite";
import { Server } from "http";
import { JobsiteMaterialCostType } from "@typescript/jobsiteMaterial";

let documents: SeededDatabase, app: Server;
let adminToken: string;
let pmToken: string;
let foremanToken: string;

const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  await prepareDatabase();

  app = await createApp();

  await setupDatabase();

  adminToken = await vitestLogin(app, "admin@bowmark.ca");
  pmToken = await vitestLogin(app, "pm@bowmark.ca");
  foremanToken = await vitestLogin(app, "baseforeman1@bowmark.ca");
});

afterAll(async () => {
  await disconnectAndStopServer();
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

      describe("validation", () => {
        it("returns an error for a non-existent jobsite id", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", adminToken)
            .send({
              query: `query { jobsite(id: "000000000000000000000001") { _id } }`,
            });
          expect(res.body.errors).toBeDefined();
          expect(res.body.data).toBeNull();
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
          const token = await vitestLogin(app, documents.users.admin_user.email);

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

      describe("authorization", () => {
        const variables = {
          data: { jobcode: "AUTH1", name: "Auth Test", description: "test" },
        };

        it("rejects ProjectManager", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", pmToken)
            .send({ query: jobsiteCreate, variables });
          expect(res.body.errors).toBeDefined();
        });

        it("rejects Foreman", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", foremanToken)
            .send({ query: jobsiteCreate, variables });
          expect(res.body.errors).toBeDefined();
        });

        it("rejects unauthenticated", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({ query: jobsiteCreate, variables });
          expect(res.body.errors).toBeDefined();
        });
      });
    });

    describe("jobsiteUpdate", () => {
      const mutation = `
        mutation JobsiteUpdate($id: ID!, $data: JobsiteUpdateData!) {
          jobsiteUpdate(id: $id, data: $data) {
            _id
            name
          }
        }
      `;
      const variables = {
        id: _ids.jobsites.jobsite_1._id.toString(),
        data: { name: "Updated Jobsite" },
      };

      it("succeeds as Admin", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
      });

      it("rejects Foreman", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", foremanToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });

      it("rejects unauthenticated", async () => {
        const res = await request(app)
          .post("/graphql")
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });
    });

    describe("jobsiteGenerateDayReports", () => {
      const mutation = `
        mutation JobsiteGenerateDayReports($id: String!) {
          jobsiteGenerateDayReports(id: $id) {
            _id
          }
        }
      `;
      const variables = { id: _ids.jobsites.jobsite_1._id.toString() };

      it("succeeds as Admin", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
      });

      it("succeeds as ProjectManager", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", pmToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
      });

      it("rejects Foreman", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", foremanToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });

      it("rejects unauthenticated", async () => {
        const res = await request(app)
          .post("/graphql")
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
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
        afterEach(async () => {
          await setupDatabase();
        });

        test("should successfully create a jobsite material w/o delievered", async () => {
          const token = await vitestLogin(app, documents.users.admin_user.email);

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

          expect(documents.jobsites.jobsite_2.materials.length).toBe(2);

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

          expect(jobsite?.materials.length).toBe(3);

          const jobsiteMaterial = await JobsiteMaterial.getById(
            jobsite?.materials[2]?.toString() || ""
          );

          expect(jobsiteMaterial?.supplier?.toString()).toBe(data.supplierId);

          expect(jobsiteMaterial?.rates[0].estimated).toBeTruthy();
        });

        test("should successfully create a jobsite material w/o delievered", async () => {
          const token = await vitestLogin(app, documents.users.admin_user.email);

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

          expect(documents.jobsites.jobsite_2.materials.length).toBe(2);

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

          expect(jobsite?.materials.length).toBe(3);

          const jobsiteMaterial = await JobsiteMaterial.getById(
            jobsite?.materials[2]?.toString() || ""
          );

          expect(jobsiteMaterial?.supplier?.toString()).toBe(data.supplierId);

          expect(
            jobsiteMaterial?.deliveredRates[0].rates[0].estimated
          ).toBeTruthy();

          await setupDatabase();
        });
      });

      describe("authorization", () => {
        const variables = {
          jobsiteId: _ids.jobsites.jobsite_2._id.toString(),
          data: {
            materialId: _ids.materials.material_1._id.toString(),
            supplierId: _ids.companies.company_1._id.toString(),
            quantity: 100,
            rates: [{ date: new Date().toISOString(), rate: 50, estimated: false }],
            unit: "tonnes",
            costType: "rate",
            deliveredRates: [],
          },
        };

        it("rejects Foreman", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", foremanToken)
            .send({ query: jobsiteAddMaterial, variables });
          expect(res.body.errors).toBeDefined();
        });

        it("rejects unauthenticated", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({ query: jobsiteAddMaterial, variables });
          expect(res.body.errors).toBeDefined();
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
          const token = await vitestLogin(app, documents.users.admin_user.email);

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

      describe("authorization", () => {
        const variables = {
          jobsiteId: _ids.jobsites.jobsite_2._id.toString(),
          data: {
            companyId: _ids.companies.company_1._id.toString(),
            cost: 50,
            internal: false,
            date: new Date().toISOString(),
            invoiceNumber: "AUTH1",
            description: "auth test",
            accrual: false,
          },
        };

        it("rejects Foreman", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", foremanToken)
            .send({ query: jobsiteAddExpenseInvoice, variables });
          expect(res.body.errors).toBeDefined();
        });

        it("rejects unauthenticated", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({ query: jobsiteAddExpenseInvoice, variables });
          expect(res.body.errors).toBeDefined();
        });
      });
    });

    describe("jobsiteAddRevenueInvoice", () => {
      const mutation = `
        mutation JobsiteAddRevenueInvoice($jobsiteId: String!, $data: InvoiceData!) {
          jobsiteAddRevenueInvoice(jobsiteId: $jobsiteId, data: $data) {
            _id
          }
        }
      `;
      const variables = {
        jobsiteId: _ids.jobsites.jobsite_2._id.toString(),
        data: {
          companyId: _ids.companies.company_1._id.toString(),
          cost: 500,
          internal: false,
          date: new Date().toISOString(),
          invoiceNumber: "REV1",
          description: "revenue",
          accrual: false,
        },
      };

      it("succeeds as Admin", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
      });

      it("rejects Foreman", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", foremanToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });

      it("rejects unauthenticated", async () => {
        const res = await request(app)
          .post("/graphql")
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });
    });

    describe("jobsiteArchive", () => {
      const mutation = `
        mutation JobsiteArchive($id: ID!) {
          jobsiteArchive(id: $id) {
            _id
          }
        }
      `;
      const variables = { id: _ids.jobsites.jobsite_3._id.toString() };

      it("succeeds as Admin", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
      });

      it("rejects Foreman", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", foremanToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });

      it("rejects unauthenticated", async () => {
        const res = await request(app)
          .post("/graphql")
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });
    });
  });
});
