import { MongoMemoryServer } from "mongodb-memory-server";

import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { disconnectAndStopServer, prepareDatabase } from "@testing/vitestDB";
import { Vehicle } from "@models";
import { IVehicleCreate } from "@typescript/vehicle";

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

describe("Vehicle Class", () => {
  describe("CREATE", () => {
    describe("createDocument", () => {
      describe("success", () => {
        test("should successfully create a new vehicle", async () => {
          const data: IVehicleCreate = {
            name: "New Employee",
            vehicleCode: "T-99",
            vehicleType: "Personnel",
            sourceCompany: "Burnco",
          };

          const vehicle = await Vehicle.createDocument(data);

          expect(vehicle.name).toBe(data.name);
          expect(vehicle.vehicleCode).toBe(data.vehicleCode);
          expect(vehicle.vehicleType).toBe(data.vehicleType);
          expect(vehicle.sourceCompany).toBe(data.sourceCompany);
        });
      });

      describe("error", () => {
        test("should error if name is already taken", async () => {
          expect.assertions(1);

          const data: IVehicleCreate = {
            name: "New Employee",
            vehicleCode: documents.vehicles.gravel_truck_1.vehicleCode,
            vehicleType: "Personnel",
            sourceCompany: "Burnco",
          };

          try {
            await Vehicle.createDocument(data);
          } catch (e) {
            expect((e as Error).message).toBe(
              "Vehicle.createDocument: a vehicle already exists with this code"
            );
          }
        });
      });
    });
  });
});
