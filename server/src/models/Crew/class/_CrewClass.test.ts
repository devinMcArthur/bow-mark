
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { disconnectAndStopServer, prepareDatabase } from "@testing/vitestDB";

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
