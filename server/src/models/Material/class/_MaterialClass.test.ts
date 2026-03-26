
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { disconnectAndStopServer, prepareDatabase } from "@testing/vitestDB";
import { Material } from "@models";
import { IMaterialCreate } from "@typescript/material";

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

describe("Material Class", () => {
  describe("GET", () => {
    describe("getList", () => {
      describe("success", () => {
        test("should successfully get full list in alphabetical order", async () => {
          const materials = await Material.getList();

          expect(materials[0].name).toBe(documents.materials.material_3.name);
        });
      });
    });
  });

  describe("CREATE", () => {
    describe("success", () => {
      test("should successfully create a new unique material", async () => {
        const data: IMaterialCreate = {
          name: "New Unique Material",
        };

        const material = await Material.createDocument(data);

        expect(material).toBeDefined();

        await material.save();
      });
    });

    describe("error", () => {
      test("should error if name is not unique", async () => {
        expect.assertions(1);

        const data: IMaterialCreate = {
          name: documents.materials.material_1.name.toLowerCase(),
        };

        try {
          await Material.createDocument(data);
        } catch (e) {
          expect((e as Error).message).toBe("This material already exists");
        }
      });
    });
  });
});
