import { MongoMemoryServer } from "mongodb-memory-server";

import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { disconnectAndStopServer, prepareDatabase } from "@testing/vitestDB";

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

describe("Crew Class", () => {
  describe("GET", () => {
    describe("getEmployees", () => {
      describe("success", () => {
        test("should get array of all employees", async () => {
          const employees = await documents.crews.base_1.getEmployees();

          expect(employees.length).toBe(5);
        });
      });
    });
  });
});
