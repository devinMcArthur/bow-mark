import { MongoMemoryServer } from "mongodb-memory-server";

import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { disconnectAndStopServer, prepareDatabase } from "@testing/jestDB";
import { Jobsite, JobsiteMaterial } from "@models";
import {
  IJobsiteMaterialCreate,
  JobsiteMaterialCostType,
} from "@typescript/jobsiteMaterial";

let documents: SeededDatabase, mongoServer: MongoMemoryServer;
const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  mongoServer = await prepareDatabase();

  await setupDatabase();
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});

describe("Jobsite Material Class", () => {
  describe("GET", () => {
    describe("getCompletedQuantity", () => {
      describe("success", () => {
        test("should successfully get completed quantity", async () => {
          const completed =
            await documents.jobsiteMaterials.jobsite_2_material_1.getCompletedQuantity();

          expect(completed).toBe(
            documents.materialShipments.jobsite_2_base_1_1_shipment_1.quantity
          );
        });
      });
    });

    describe("getInvoiceMonthRate", () => {
      describe("success", () => {
        test("should successfully generate a monthly rate for this material", async () => {
          const jobsiteMaterial =
            documents.jobsiteMaterials.jobsite_2_material_2;

          // First month
          const firstRate = await jobsiteMaterial.getInvoiceMonthRate(
            documents.dailyReports.jobsite_2_base_1_1.date
          );

          expect(firstRate).toBe(10);

          const secondRate = await jobsiteMaterial.getInvoiceMonthRate(
            documents.dailyReports.jobsite_2_base_1_2.date
          );

          expect(secondRate).toBe(100);
        });
      });
    });
  });

  describe("CREATE", () => {
    describe("createDocument", () => {
      describe("success", () => {
        test("should successfully create new jobsite materials, not delivered", async () => {
          const data: IJobsiteMaterialCreate = {
            jobsite: documents.jobsites.jobsite_2,
            material: documents.materials.material_1,
            supplier: documents.companies.company_1,
            quantity: 1000,
            rates: [
              {
                date: new Date(),
                rate: 125,
                estimated: true,
              },
            ],
            unit: "tonnes",
            deliveredRates: [],
            costType: JobsiteMaterialCostType.rate,
          };

          const jobsiteMaterial = await JobsiteMaterial.createDocument(data);

          await jobsiteMaterial.save();

          await documents.jobsites.jobsite_2.save();

          expect(jobsiteMaterial).toBeDefined();

          expect(
            data.jobsite.materials.includes(jobsiteMaterial._id.toString())
          ).toBeTruthy();

          expect(jobsiteMaterial.rates[0].estimated).toBeTruthy();
        });

        test("should successfully create new jobsite materials, delivered", async () => {
          const data: IJobsiteMaterialCreate = {
            jobsite: documents.jobsites.jobsite_2,
            material: documents.materials.material_1,
            supplier: documents.companies.company_1,
            quantity: 1000,
            rates: [],
            unit: "tonnes",
            deliveredRates: [
              {
                title: "Tandem",
                rates: [
                  {
                    date: new Date(),
                    rate: 100,
                    estimated: false,
                  },
                ],
              },
            ],
            costType: JobsiteMaterialCostType.deliveredRate,
          };

          const jobsiteMaterial = await JobsiteMaterial.createDocument(data);

          await jobsiteMaterial.save();

          await documents.jobsites.jobsite_2.save();

          expect(jobsiteMaterial).toBeDefined();

          expect(
            data.jobsite.materials.includes(jobsiteMaterial._id.toString())
          ).toBeTruthy();

          expect(
            jobsiteMaterial.deliveredRates[0].rates[0].estimated
          ).toBeFalsy();
        });
      });

      describe("error", () => {
        test("should error without rates if not delivered", async () => {
          expect.assertions(1);

          const data: IJobsiteMaterialCreate = {
            jobsite: documents.jobsites.jobsite_2,
            material: documents.materials.material_1,
            supplier: documents.companies.company_1,
            quantity: 1000,
            rates: [],
            unit: "tonnes",
            deliveredRates: [],
            costType: JobsiteMaterialCostType.rate,
          };

          try {
            await JobsiteMaterial.createDocument(data);
          } catch (e) {
            expect((e as Error).message).toBe("Must provide rates");
          }
        });

        test("should error without delivered rates if necessary", async () => {
          expect.assertions(1);

          const data: IJobsiteMaterialCreate = {
            jobsite: documents.jobsites.jobsite_2,
            material: documents.materials.material_1,
            supplier: documents.companies.company_1,
            quantity: 1000,
            rates: [],
            unit: "tonnes",
            costType: JobsiteMaterialCostType.deliveredRate,
            deliveredRates: [],
          };

          try {
            await JobsiteMaterial.createDocument(data);
          } catch (e) {
            expect((e as Error).message).toBe("Must provide delivered rates");
          }
        });
      });
    });
  });

  describe("REMOVE", () => {
    describe("removeIfPossible", () => {
      describe("success", () => {
        test("should successfully remove unused jobsite material", async () => {
          const jobsiteMaterial =
            documents.jobsiteMaterials.jobsite_3_material_1;

          const materialIndexBefore =
            documents.jobsites.jobsite_3.materials.findIndex(
              (material) =>
                material?.toString() === jobsiteMaterial._id.toString()
            );
          expect(materialIndexBefore).toBe(0);

          await jobsiteMaterial.removeIfPossible();

          const jobsite = await Jobsite.getById(
            documents.jobsites.jobsite_3._id
          );
          const materialIndexAfter = jobsite?.materials.findIndex(
            (material) =>
              material?.toString() === jobsiteMaterial._id.toString()
          );
          expect(materialIndexAfter).toBe(-1);
        });
      });
    });
  });
});
