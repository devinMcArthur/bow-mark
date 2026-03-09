import { MongoMemoryServer } from "mongodb-memory-server";

import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { disconnectAndStopServer, prepareDatabase } from "@testing/jestDB";
import { MaterialShipment } from "@models";
import {
  IMaterialShipmentCreate,
  IMaterialShipmentUpdate,
} from "@typescript/materialShipment";
import _ids from "@testing/_ids";

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

describe("Material Shipment Class", () => {
  describe("CREATE", () => {
    describe("createDocument", () => {
      describe("success", () => {
        test("should successfully create a new material shipment", async () => {
          const data: IMaterialShipmentCreate = {
            dailyReport: documents.dailyReports.jobsite_2_base_1_1,
            jobsiteMaterial: documents.jobsiteMaterials.jobsite_2_material_1,
            quantity: 100,
            vehicleObject: {
              source: "Burnco",
              vehicleCode: "12",
              vehicleType: "Tandem",
              truckingRateId:
                documents.jobsites.jobsite_2.truckingRates[0]._id?.toString(),
            },
            noJobsiteMaterial: false,
            startTime: new Date("2022-02-25 11:00am"),
            endTime: new Date("2022-02-25 2:00pm"),
          };

          const materialShipment = await MaterialShipment.createDocument(data);

          expect(materialShipment).toBeDefined();
        });

        test("should successfully create a material shipment w/ no jobsite material", async () => {
          const data: IMaterialShipmentCreate = {
            dailyReport: documents.dailyReports.jobsite_2_base_1_1,
            shipmentType: documents.materials.material_1.name,
            supplier: documents.companies.company_1.name,
            quantity: 50,
            unit: "tonnes",
            vehicleObject: {
              source: "Lafarge",
              vehicleCode: "11",
              vehicleType: "Tandem",
              truckingRateId:
                documents.jobsites.jobsite_2.truckingRates[0]._id?.toString(),
            },
            noJobsiteMaterial: true,
          };

          const materialShipment = await MaterialShipment.createDocument(data);

          expect(materialShipment).toBeDefined();

          expect(materialShipment.shipmentType).toBe(
            documents.materials.material_1.name
          );
          expect(materialShipment.supplier).toBe(
            documents.companies.company_1.name
          );
        });

        test("should create material shipment w/ jobsite material and no vehicle object", async () => {
          const data: IMaterialShipmentCreate = {
            dailyReport: documents.dailyReports.jobsite_2_base_1_1,
            jobsiteMaterial: documents.jobsiteMaterials.jobsite_2_material_1,
            quantity: 100,
            noJobsiteMaterial: false,
            startTime: new Date("2022-02-25 11:00am"),
            endTime: new Date("2022-02-25 2:00pm"),
          };

          const materialShipment = await MaterialShipment.createDocument(data);

          expect(materialShipment).toBeDefined();
        });

        test("should create material shipment w/o jobsite material and no vehicle object", async () => {
          const data: IMaterialShipmentCreate = {
            dailyReport: documents.dailyReports.jobsite_2_base_1_1,
            shipmentType: documents.materials.material_1.name,
            supplier: documents.companies.company_1.name,
            quantity: 50,
            unit: "tonnes",
            noJobsiteMaterial: true,
          };

          const materialShipment = await MaterialShipment.createDocument(data);

          expect(materialShipment).toBeDefined();

          expect(materialShipment.shipmentType).toBe(
            documents.materials.material_1.name
          );
          expect(materialShipment.supplier).toBe(
            documents.companies.company_1.name
          );
        });
      });

      describe("error", () => {
        test("should error if jobsite material does not belong to jobsite of report", async () => {
          expect.assertions(1);
          const data: IMaterialShipmentCreate = {
            dailyReport: documents.dailyReports.jobsite_2_base_1_1,
            jobsiteMaterial: documents.jobsiteMaterials.jobsite_3_material_1,
            quantity: 100,
            vehicleObject: {
              source: "Burnco",
              vehicleCode: "12",
              vehicleType: "Tandem",
              truckingRateId:
                documents.jobsites.jobsite_2.truckingRates[0]._id?.toString(),
            },
            noJobsiteMaterial: false,
            startTime: new Date("2022-02-25 11:00am"),
            endTime: new Date("2022-02-25 2:00pm"),
          };

          try {
            await MaterialShipment.createDocument(data);
          } catch (e: unknown) {
            expect((e as Error).message).toBe(
              "this material does not belong to this jobsite"
            );
          }
        });

        test("should error if no jobsite material provided when it should be", async () => {
          const data: IMaterialShipmentCreate = {
            dailyReport: documents.dailyReports.jobsite_2_base_1_1,
            quantity: 100,
            vehicleObject: {
              source: "Burnco",
              vehicleCode: "12",
              vehicleType: "Tandem",
              truckingRateId:
                documents.jobsites.jobsite_2.truckingRates[0]._id?.toString(),
            },
            noJobsiteMaterial: false,
            startTime: new Date("2022-02-25 11:00am"),
            endTime: new Date("2022-02-25 2:00pm"),
          };

          expect.assertions(1);

          try {
            await MaterialShipment.createDocument(data);
          } catch (e) {
            expect((e as Error).message).toBe(
              "Must provide a jobsite material"
            );
          }
        });

        test("should error if no material is provided when it should be", async () => {
          const data: IMaterialShipmentCreate = {
            dailyReport: documents.dailyReports.jobsite_2_base_1_1,
            supplier: documents.companies.company_1.name,
            quantity: 50,
            unit: "tonnes",
            vehicleObject: {
              source: "Burnco",
              vehicleCode: "12",
              vehicleType: "Tandem",
              truckingRateId:
                documents.jobsites.jobsite_2.truckingRates[0]._id?.toString(),
            },
            noJobsiteMaterial: true,
            startTime: new Date("2022-02-25 11:00am"),
            endTime: new Date("2022-02-25 2:00pm"),
          };

          expect.assertions(1);

          try {
            await MaterialShipment.createDocument(data);
          } catch (e) {
            expect((e as Error).message).toBe("Must provide a shipment type");
          }
        });

        test("should error if no supplier is provided when it should be", async () => {
          const data: IMaterialShipmentCreate = {
            dailyReport: documents.dailyReports.jobsite_2_base_1_1,
            shipmentType: documents.materials.material_1.name,
            quantity: 50,
            unit: "tonnes",
            vehicleObject: {
              source: "Lafarge",
              vehicleCode: "11",
              vehicleType: "Tandem",
              truckingRateId:
                documents.jobsites.jobsite_2.truckingRates[0]._id?.toString(),
            },
            noJobsiteMaterial: true,
          };

          expect.assertions(1);

          try {
            await MaterialShipment.createDocument(data);
          } catch (e) {
            expect((e as Error).message).toBe("Must provide a supplier");
          }
        });

        test("should error if no unit is provided when it should be", async () => {
          const data: IMaterialShipmentCreate = {
            dailyReport: documents.dailyReports.jobsite_2_base_1_1,
            shipmentType: documents.materials.material_1.name,
            supplier: documents.companies.company_1.name,
            quantity: 50,
            vehicleObject: {
              source: "Lafarge",
              vehicleCode: "11",
              vehicleType: "Tandem",
              truckingRateId:
                documents.jobsites.jobsite_2.truckingRates[0]._id?.toString(),
            },
            noJobsiteMaterial: true,
          };

          expect.assertions(1);

          try {
            await MaterialShipment.createDocument(data);
          } catch (e) {
            expect((e as Error).message).toBe("Must provide a unit");
          }
        });
      });
    });
  });

  describe("UPDATE", () => {
    describe("updateDocument", () => {
      describe("success", () => {
        test("should successfully update shipment w/ jobsite material", async () => {
          const materialShipment =
            documents.materialShipments.jobsite_2_base_1_1_shipment_1;

          const data: IMaterialShipmentUpdate = {
            noJobsiteMaterial: false,
            jobsiteMaterial: _ids.jobsiteMaterials.jobsite_2_material_1._id,
            quantity: 300,
          };

          await materialShipment.updateDocument(data);

          expect(materialShipment.quantity).toBe(data.quantity);
        });

        test("should successfully update shipment w/o jobsite material", async () => {
          const materialShipment =
            documents.materialShipments.jobsite_1_base_1_1_shipment_1;

          const data: IMaterialShipmentUpdate = {
            noJobsiteMaterial: true,
            quantity: 36,
            shipmentType: "Type",
            supplier: "Lafarge",
            unit: "tonnes",
          };

          await materialShipment.updateDocument(data);

          expect(materialShipment).toMatchObject(data);
        });
      });
    });
  });
});
