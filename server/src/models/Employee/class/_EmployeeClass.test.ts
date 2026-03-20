
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { disconnectAndStopServer, prepareDatabase } from "@testing/vitestDB";
import { Employee } from "@models";
import { IEmployeeCreate } from "@typescript/employee";

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

describe("Employee Class", () => {
  describe("CREATE", () => {
    describe("createDocument", () => {
      describe("success", () => {
        test("should successfully create a new employee", async () => {
          const data: IEmployeeCreate = {
            name: "New Employee",
            jobTitle: "Test",
          };

          const employee = await Employee.createDocument(data);

          expect(employee.name).toBe(data.name);
          expect(employee.jobTitle).toBe(data.jobTitle);
        });
      });

      describe("error", () => {
        test("should error if name is already taken", async () => {
          expect.assertions(1);

          const data: IEmployeeCreate = {
            name: documents.employees.base_foreman_1.name.toLowerCase(),
            jobTitle: "Title",
          };

          try {
            await Employee.createDocument(data);
          } catch (e: unknown) {
            expect((e as Error).message).toBe(
              "Employee.createDocument: employee already exists with this name"
            );
          }
        });
      });
    });
  });
});
