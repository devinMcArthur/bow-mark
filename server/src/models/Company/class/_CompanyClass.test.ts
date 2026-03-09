import { MongoMemoryServer } from "mongodb-memory-server";

import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { disconnectAndStopServer, prepareDatabase } from "@testing/jestDB";
import { Company } from "@models";
import { ICompanyCreate } from "@typescript/company";

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

describe("Company Class", () => {
  describe("CREATE", () => {
    describe("success", () => {
      test("should successfully create a new unique company", async () => {
        const data: ICompanyCreate = {
          name: "New Unique Company",
        };

        const company = await Company.createDocument(data);

        expect(company).toBeDefined();

        await company.save();
      });
    });

    describe("error", () => {
      test("should error if name is not unique", async () => {
        expect.assertions(1);

        const data: ICompanyCreate = {
          name: documents.companies.company_1.name.toLowerCase(),
        };

        try {
          await Company.createDocument(data);
        } catch (e) {
          expect((e as Error).message).toBe("This company already exists");
        }
      });
    });
  });
});
