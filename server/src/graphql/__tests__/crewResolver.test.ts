import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import vitestLogin from "@testing/vitestLogin";
import { Crew } from "@models";
import { CrewCreateData } from "@graphql/resolvers/crew/mutations";
import { Server } from "http";

let documents: SeededDatabase, app: Server;
let adminToken: string;
let pmToken: string;
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
  pmToken = await vitestLogin(app, "pm@bowmark.ca");
  foremanToken = await vitestLogin(app, "baseforeman1@bowmark.ca");
});

afterAll(async () => {
  await disconnectAndStopServer();
});

describe("Crew Resolver", () => {
  describe("QUERIES", () => {
    describe("crew", () => {
      describe("validation", () => {
        it("returns an error for a non-existent crew id", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", adminToken)
            .send({
              query: `query { crew(id: "000000000000000000000001") { _id } }`,
            });
          expect(res.body.errors).toBeDefined();
          expect(res.body.data).toBeNull();
        });
      });
    });
  });

  describe("MUTATIONS", () => {
    describe("crewCreate", () => {
      const crewCreate = `
        mutation CrewCreate($data: CrewCreateData!) {
          crewCreate(data: $data) {
            _id
            name
            type
          }
        }
      `;

      describe("success", () => {
        test("should successfully create a new crew", async () => {
          const token = await vitestLogin(app, documents.users.admin_user.email);

          const data: CrewCreateData = {
            name: "New Crew",
            //@ts-expect-error - testing to see if it accepts string
            type: "FormLineSetting",
          };

          const res = await request(app)
            .post("/graphql")
            .send({
              query: crewCreate,
              variables: { data },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.crewCreate).toBeDefined();

          expect(res.body.data.crewCreate.type).toBe(data.type);

          const crew = await Crew.getById(res.body.data.crewCreate._id);

          expect(crew?.name).toBe(data.name);
        });
      });

      describe("authorization", () => {
        it("succeeds as Admin", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", adminToken)
            .send({
              query: crewCreate,
              variables: { data: { name: "Auth Test Crew Admin", type: "Base" } },
            });
          expect(res.body.errors).toBeUndefined();
        });

        it("succeeds as ProjectManager", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", pmToken)
            .send({
              query: crewCreate,
              variables: { data: { name: "Auth Test Crew PM", type: "Base" } },
            });
          expect(res.body.errors).toBeUndefined();
        });

        it("rejects Foreman", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", foremanToken)
            .send({
              query: crewCreate,
              variables: { data: { name: "Auth Test Crew Foreman", type: "Base" } },
            });
          expect(res.body.errors).toBeDefined();
        });

        it("rejects unauthenticated", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({
              query: crewCreate,
              variables: { data: { name: "Auth Test Crew Unauth", type: "Base" } },
            });
          expect(res.body.errors).toBeDefined();
        });
      });
    });

    describe("crewUpdate", () => {
      const mutation = `
        mutation CrewUpdate($id: ID!, $data: CrewUpdateData!) {
          crewUpdate(id: $id, data: $data) {
            _id
            name
          }
        }
      `;
      const variables = {
        id: _ids.crews.base_1._id.toString(),
        data: { name: "Updated Crew", type: "Base" },
      };

      it("succeeds as Admin", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
      });

      it("rejects ProjectManager", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", pmToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });

      it("rejects Foreman", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", foremanToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });

      it("rejects unauthenticated", async () => {
        const res = await request(app)
          .post("/graphql")
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });
    });

    describe("crewAddEmployee", () => {
      const mutation = `
        mutation CrewAddEmployee($crewId: String!, $employeeId: String!) {
          crewAddEmployee(crewId: $crewId, employeeId: $employeeId) {
            _id
          }
        }
      `;
      const variables = {
        crewId: _ids.crews.base_1._id.toString(),
        employeeId: _ids.employees.base_laborer_3._id.toString(),
      };

      it("succeeds as Foreman (any authenticated)", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", foremanToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
      });

      it("rejects unauthenticated", async () => {
        const res = await request(app)
          .post("/graphql")
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });
    });

    describe("crewAddVehicle", () => {
      const mutation = `
        mutation CrewAddVehicle($crewId: String!, $vehicleId: String!) {
          crewAddVehicle(crewId: $crewId, vehicleId: $vehicleId) {
            _id
          }
        }
      `;
      const variables = {
        crewId: _ids.crews.base_1._id.toString(),
        vehicleId: _ids.vehicles.gravel_truck_2._id.toString(),
      };

      it("succeeds as Foreman (any authenticated)", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", foremanToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
      });

      it("rejects unauthenticated", async () => {
        const res = await request(app)
          .post("/graphql")
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });
    });

    describe("crewRemoveEmployee", () => {
      const mutation = `
        mutation CrewRemoveEmployee($crewId: String!, $employeeId: String!) {
          crewRemoveEmployee(crewId: $crewId, employeeId: $employeeId) {
            _id
          }
        }
      `;
      const variables = {
        crewId: _ids.crews.base_1._id.toString(),
        employeeId: _ids.employees.base_laborer_1._id.toString(),
      };

      it("succeeds as Foreman (any authenticated)", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", foremanToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
      });

      it("rejects unauthenticated", async () => {
        const res = await request(app)
          .post("/graphql")
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });
    });

    describe("crewRemoveVehicle", () => {
      const mutation = `
        mutation CrewRemoveVehicle($crewId: String!, $vehicleId: String!) {
          crewRemoveVehicle(crewId: $crewId, vehicleId: $vehicleId) {
            _id
          }
        }
      `;
      const variables = {
        crewId: _ids.crews.base_1._id.toString(),
        vehicleId: _ids.vehicles.skidsteer_1._id.toString(),
      };

      it("succeeds as Foreman (any authenticated)", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", foremanToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
      });

      it("rejects unauthenticated", async () => {
        const res = await request(app)
          .post("/graphql")
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });
    });

    describe("crewArchive", () => {
      const mutation = `
        mutation CrewArchive($id: ID!) {
          crewArchive(id: $id) {
            _id
          }
        }
      `;
      const variables = { id: _ids.crews.base_2._id.toString() };

      it("succeeds as Admin", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
      });

      it("rejects ProjectManager", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", pmToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });

      it("rejects Foreman", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", foremanToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });

      it("rejects unauthenticated", async () => {
        const res = await request(app)
          .post("/graphql")
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
      });
    });
  });
});
