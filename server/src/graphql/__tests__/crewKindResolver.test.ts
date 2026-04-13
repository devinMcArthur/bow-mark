import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import vitestLogin from "@testing/vitestLogin";
import { CrewKind } from "@models";
import { Server } from "http";

let documents: SeededDatabase, app: Server;
let adminToken: string;
let foremanToken: string;

const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  await prepareDatabase();

  app = await createApp();

  await setupDatabase();

  adminToken = await vitestLogin(app, "admin@bowmark.ca");
  foremanToken = await vitestLogin(app, "baseforeman1@bowmark.ca");
});

afterAll(async () => {
  await disconnectAndStopServer();
});

describe("CrewKind Resolver", () => {
  // Track IDs created during tests for later mutation tests
  let firstId: string;
  let secondId: string;

  describe("MUTATIONS", () => {
    describe("crewKindCreate", () => {
      const crewKindCreate = `
        mutation CrewKindCreate($data: CrewKindCreateData!) {
          crewKindCreate(data: $data) {
            _id
            name
            description
          }
        }
      `;

      test("should successfully create a crew kind as admin", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: crewKindCreate,
            variables: {
              data: {
                name: "Test Crew Kind",
                description: "A test crew kind",
              },
            },
          });

        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.crewKindCreate.name).toBe("Test Crew Kind");
        expect(res.body.data.crewKindCreate.description).toBe(
          "A test crew kind"
        );
        firstId = res.body.data.crewKindCreate._id;
      });

      test("should reject non-admin (foreman)", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", foremanToken)
          .send({
            query: crewKindCreate,
            variables: {
              data: {
                name: "Unauthorized Kind",
              },
            },
          });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain("Access denied");
      });
    });

    describe("crewKindUpdate", () => {
      const crewKindUpdate = `
        mutation CrewKindUpdate($id: ID!, $data: CrewKindUpdateData!) {
          crewKindUpdate(id: $id, data: $data) {
            _id
            name
            description
          }
        }
      `;

      test("should update name and description", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: crewKindUpdate,
            variables: {
              id: firstId,
              data: {
                name: "Updated Kind",
                description: "Updated description",
              },
            },
          });

        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.crewKindUpdate.name).toBe("Updated Kind");
        expect(res.body.data.crewKindUpdate.description).toBe(
          "Updated description"
        );
      });

      test("should reject duplicate name", async () => {
        // Create a second crew kind
        const createRes = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: `
              mutation CrewKindCreate($data: CrewKindCreateData!) {
                crewKindCreate(data: $data) { _id name }
              }
            `,
            variables: {
              data: { name: "Second Kind" },
            },
          });

        secondId = createRes.body.data.crewKindCreate._id;

        // Try to rename second to first's current name
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: crewKindUpdate,
            variables: {
              id: secondId,
              data: { name: "Updated Kind" },
            },
          });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain("already exists");
      });
    });

    describe("crewKindArchive / crewKindUnarchive", () => {
      const crewKindArchive = `
        mutation CrewKindArchive($id: ID!) {
          crewKindArchive(id: $id) {
            _id
            archivedAt
          }
        }
      `;

      const crewKindUnarchive = `
        mutation CrewKindUnarchive($id: ID!) {
          crewKindUnarchive(id: $id) {
            _id
            archivedAt
          }
        }
      `;

      test("should archive and then unarchive a crew kind", async () => {
        // Archive
        const archiveRes = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: crewKindArchive,
            variables: { id: firstId },
          });

        expect(archiveRes.body.errors).toBeUndefined();
        expect(archiveRes.body.data.crewKindArchive.archivedAt).toBeTruthy();

        // Unarchive
        const unarchiveRes = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: crewKindUnarchive,
            variables: { id: firstId },
          });

        expect(unarchiveRes.body.errors).toBeUndefined();
        expect(
          unarchiveRes.body.data.crewKindUnarchive.archivedAt
        ).toBeNull();
      });
    });

    describe("crewKindRemove", () => {
      const crewKindRemove = `
        mutation CrewKindRemove($id: ID!) {
          crewKindRemove(id: $id)
        }
      `;

      test("should hard-delete a crew kind", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({
            query: crewKindRemove,
            variables: { id: secondId },
          });

        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.crewKindRemove).toBe(true);

        // Verify it's gone from the database
        const doc = await CrewKind.findById(secondId);
        expect(doc).toBeNull();
      });
    });
  });

  describe("QUERIES", () => {
    describe("crewKinds", () => {
      const crewKinds = `
        query CrewKinds {
          crewKinds {
            _id
            name
            description
          }
        }
      `;

      test("should return a list with length > 0", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({ query: crewKinds });

        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.crewKinds.length).toBeGreaterThan(0);
      });
    });
  });
});
