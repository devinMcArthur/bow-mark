import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/jestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import jestLogin from "@testing/jestLogin";
import { JobsiteMaterialUpdateData } from "@graphql/resolvers/jobsiteMaterial/mutations";
import { JobsiteMaterial } from "@models";
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

describe("Jobsite Material Resolver", () => {
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

      describe("success", () => {
        test("should successfully update invoice w/o delivered", async () => {
          const token = await jestLogin(app, documents.users.admin_user.email);

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
          const token = await jestLogin(app, documents.users.admin_user.email);

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
    });
  });
});
