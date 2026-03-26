
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { disconnectAndStopServer, prepareDatabase } from "@testing/vitestDB";
import { Jobsite, JobsiteMaterial } from "@models";
import {
  IJobsiteMaterialCreate,
  IRateScenarioData,
  JobsiteMaterialCostModel,
  JobsiteMaterialCostType,
} from "@typescript/jobsiteMaterial";

let documents: SeededDatabase;
const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  await prepareDatabase();

  await setupDatabase();
});

afterAll(async () => {
  await disconnectAndStopServer();
});

describe("Jobsite Material Class", () => {
  describe("GET", () => {
    describe("getCompletedQuantity", () => {
      describe("success", () => {
        test("should successfully get completed quantity", async () => {
          const completed =
            await documents.jobsiteMaterials.jobsite_2_material_1.getCompletedQuantity();

          // getCompletedQuantity now returns quantities grouped by year.
          // jobsite_2_material_1 has three shipments in the seed data that
          // belong to daily reports: jobsite_2_base_1_1_shipment_1 (200),
          // sync_shipment_costed_1 (5), and sync_shipment_trucking_1 (2).
          const total = Object.values(completed).reduce(
            (sum, q) => sum + q,
            0
          );
          const expected =
            documents.materialShipments.jobsite_2_base_1_1_shipment_1
              .quantity +
            documents.materialShipments.sync_shipment_costed_1.quantity +
            documents.materialShipments.sync_shipment_trucking_1.quantity;
          expect(total).toBe(expected);
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

        test("should error when costModel is set but scenarios is empty", async () => {
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
            costModel: JobsiteMaterialCostModel.rate,
            scenarios: [],
          };

          try {
            await JobsiteMaterial.createDocument(data);
          } catch (e) {
            expect((e as Error).message).toBe("Must provide at least one scenario");
          }
        });
      });
    });
  });

  describe("UPDATE", () => {
    describe("scenario management", () => {
      const scenarioData: IRateScenarioData = {
        label: "Pickup",
        delivered: false,
        rates: [{ date: new Date("2022-01-01"), rate: 30, estimated: false }],
      };

      test("addScenario: should add a scenario to the scenarios array", async () => {
        const jm = documents.jobsiteMaterials.sync_jobsite_material_scenario;

        const originalCount = jm.scenarios?.length ?? 0;

        await jm.addScenario({
          label: "T&P Delivered",
          delivered: true,
          rates: [{ date: new Date("2022-01-01"), rate: 50, estimated: true }],
        });

        expect(jm.scenarios?.length).toBe(originalCount + 1);
        const added = jm.scenarios![jm.scenarios!.length - 1];
        expect(added.label).toBe("T&P Delivered");
        expect(added.delivered).toBe(true);
        expect(added.rates[0].rate).toBe(50);
        expect(added._id).toBeDefined();
      });

      test("updateScenario: should update label, delivered flag, and rates", async () => {
        const jm = documents.jobsiteMaterials.sync_jobsite_material_scenario;
        // Use the first scenario (Pickup) seeded in the fixture
        const scenario = jm.scenarios![0];
        const scenarioId = scenario._id.toString();

        await jm.updateScenario(scenarioId, {
          label: "Pickup Updated",
          delivered: false,
          rates: [{ date: new Date("2023-01-01"), rate: 35, estimated: true }],
        });

        const updated = jm.scenarios!.find(
          (s) => s._id.toString() === scenarioId
        );
        expect(updated?.label).toBe("Pickup Updated");
        expect(updated?.rates[0].rate).toBe(35);
      });

      test("updateScenario: should throw when scenario not found", async () => {
        const jm = documents.jobsiteMaterials.sync_jobsite_material_scenario;

        await expect(
          jm.updateScenario("000000000000000000000000", scenarioData)
        ).rejects.toThrow("Scenario not found");
      });

      test("removeScenario: should remove the scenario by id", async () => {
        const jm = documents.jobsiteMaterials.sync_jobsite_material_scenario;
        // Add a temporary scenario to remove
        await jm.addScenario({
          label: "To Remove",
          delivered: false,
          rates: [{ date: new Date("2022-01-01"), rate: 10, estimated: false }],
        });

        const toRemove = jm.scenarios![jm.scenarios!.length - 1];
        const countBefore = jm.scenarios!.length;

        await jm.removeScenario(toRemove._id.toString());

        expect(jm.scenarios!.length).toBe(countBefore - 1);
        expect(
          jm.scenarios!.find((s) => s._id.toString() === toRemove._id.toString())
        ).toBeUndefined();
      });

      test("removeScenario: should throw when scenario not found", async () => {
        const jm = documents.jobsiteMaterials.sync_jobsite_material_scenario;

        await expect(
          jm.removeScenario("000000000000000000000000")
        ).rejects.toThrow("Scenario not found");
      });

      test("removeScenario: should throw when dependent shipments exist", async () => {
        const jm = documents.jobsiteMaterials.sync_jobsite_material_scenario;
        // The seeded sync_shipment_scenario_pickup_1 references scenarioPickupId
        const pickupScenarioId =
          jm.scenarios![0]._id.toString(); // Pickup scenario is first

        await expect(
          jm.removeScenario(pickupScenarioId)
        ).rejects.toThrow("Cannot remove scenario");
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
