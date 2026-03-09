import { MongoMemoryServer } from "mongodb-memory-server";

import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { disconnectAndStopServer, prepareDatabase } from "@testing/jestDB";
import { UserRoles } from "@typescript/user";

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

describe("User Class", () => {
  describe("UPDATE", () => {
    describe("updateRole", () => {
      describe("success", () => {
        test("should successfully update user role", async () => {
          const user = documents.users.base_foreman_1_user;

          expect(user.role).toBe(1);

          await user.updateRole(2);

          expect(user.role).toBe(UserRoles.ProjectManager);
        });
      });
    });
  });
});
