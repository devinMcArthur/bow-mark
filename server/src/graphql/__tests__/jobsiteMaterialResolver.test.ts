import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import vitestLogin from "@testing/vitestLogin";
import { JobsiteMaterialUpdateData } from "@graphql/resolvers/jobsiteMaterial/mutations";
import { JobsiteMaterial } from "@models";
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

describe("Jobsite Material Resolver", () => {
  describe("QUERIES", () => {
    describe("jobsiteMaterial", () => {
      describe("validation", () => {
        it("returns an error for a non-existent jobsite material id", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", adminToken)
            .send({
              query: `query { jobsiteMaterial(id: "000000000000000000000001") { _id } }`,
            });
          expect(res.body.errors).toBeDefined();
          expect(res.body.data).toBeNull();
        });
      });
    });
  });

  describe("MUTATIONS", () => {
    describe("jobsiteMaterialUpdate", () => {
      const jobsiteMaterialUpdate = `
        mutation JobsiteMaterialUpdate($id: String!, $data: JobsiteMaterialUpdateData!) {
          jobsiteMaterialUpdate(id: $id, data: $data) {
            _id
            supplier {
              name
            }
            material {
              _id
            }
            quantity
            unit
            rates {
              rate
              date
              estimated
            }
            deliveredRates {
              title
              rates {
                rate
                date
                estimated
              }
            }
          }
        }
      `;

      const updateVariables = {
        data: {
          quantity: 15,
          rates: [{ date: new Date().toISOString(), rate: 125, estimated: true }],
          supplierId: _ids.companies.company_1._id.toString(),
          unit: "tonnes",
          costType: "rate",
          deliveredRates: [],
        },
        id: _ids.jobsiteMaterials.jobsite_2_material_1._id.toString(),
      };

      describe("success", () => {
        test("should successfully update invoice w/o delivered", async () => {
          const token = await vitestLogin(app, documents.users.admin_user.email);

          const data: JobsiteMaterialUpdateData = {
            quantity: 15,
            rates: [
              {
                date: new Date(),
                rate: 125,
                estimated: true,
              },
            ],
            supplierId: documents.companies.company_1._id.toString(),
            unit: "tonnes",
            costType: JobsiteMaterialCostType.rate,
            deliveredRates: [],
          };

          const res = await request(app)
            .post("/graphql")
            .send({
              query: jobsiteMaterialUpdate,
              variables: {
                data,
                id: documents.jobsiteMaterials.jobsite_2_material_1._id,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.jobsiteMaterialUpdate._id).toBe(
            documents.jobsiteMaterials.jobsite_2_material_1._id.toString()
          );

          const jobsiteMaterial = await JobsiteMaterial.getById(
            documents.jobsiteMaterials.jobsite_2_material_1._id
          );

          expect(jobsiteMaterial).toBeDefined();

          expect(jobsiteMaterial?.supplier?.toString()).toBe(data.supplierId);
          expect(jobsiteMaterial?.quantity).toBe(data.quantity);
          expect(jobsiteMaterial?.rates.length).toBe(data.rates.length);
          expect(jobsiteMaterial?.unit).toBe(data.unit);

          expect(jobsiteMaterial?.rates[0].estimated).toBeTruthy();
        });

        test("should successfully update invoice w/ delivered", async () => {
          const token = await vitestLogin(app, documents.users.admin_user.email);

          const data: JobsiteMaterialUpdateData = {
            quantity: 15,
            rates: [],
            supplierId: documents.companies.company_1._id.toString(),
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
              query: jobsiteMaterialUpdate,
              variables: {
                data,
                id: documents.jobsiteMaterials.jobsite_2_material_1._id,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.jobsiteMaterialUpdate._id).toBe(
            documents.jobsiteMaterials.jobsite_2_material_1._id.toString()
          );

          const jobsiteMaterial = await JobsiteMaterial.getById(
            documents.jobsiteMaterials.jobsite_2_material_1._id
          );

          expect(jobsiteMaterial).toBeDefined();

          expect(jobsiteMaterial?.supplier?.toString()).toBe(data.supplierId);
          expect(jobsiteMaterial?.quantity).toBe(data.quantity);
          expect(jobsiteMaterial?.deliveredRates.length).toBe(
            data.deliveredRates.length
          );
          expect(jobsiteMaterial?.unit).toBe(data.unit);

          expect(
            jobsiteMaterial?.deliveredRates[0].rates[0].estimated
          ).toBeTruthy();
        });
      });

      describe("authorization", () => {
        it("rejects ProjectManager", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", pmToken)
            .send({ query: jobsiteMaterialUpdate, variables: updateVariables });
          expect(res.body.errors).toBeDefined();
        });

        it("rejects Foreman", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", foremanToken)
            .send({ query: jobsiteMaterialUpdate, variables: updateVariables });
          expect(res.body.errors).toBeDefined();
        });

        it("rejects unauthenticated", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({ query: jobsiteMaterialUpdate, variables: updateVariables });
          expect(res.body.errors).toBeDefined();
        });
      });
    });

    describe("jobsiteMaterialRemove", () => {
      const mutation = `
        mutation JobsiteMaterialRemove($id: ID!) {
          jobsiteMaterialRemove(id: $id)
        }
      `;
      const variables = {
        id: _ids.jobsiteMaterials.jobsite_3_material_1._id.toString(),
      };

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

    describe("jobsiteMaterialAddInvoice", () => {
      const mutation = `
        mutation JobsiteMaterialAddInvoice($jobsiteMaterialId: ID!, $data: InvoiceData!) {
          jobsiteMaterialAddInvoice(jobsiteMaterialId: $jobsiteMaterialId, data: $data) {
            _id
          }
        }
      `;
      const variables = {
        jobsiteMaterialId: _ids.jobsiteMaterials.jobsite_2_material_2._id.toString(),
        data: {
          companyId: _ids.companies.company_1._id.toString(),
          cost: 200,
          date: new Date().toISOString(),
          internal: false,
          invoiceNumber: "INV-TEST-999",
          description: "test invoice",
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
  });
});
