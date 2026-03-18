import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import vitestLogin from "@testing/vitestLogin";
import { RatesData } from "@graphql/types/mutation";
import { Vehicle } from "@models";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "http";

let mongoServer: MongoMemoryServer, documents: SeededDatabase, app: Server;
let adminToken: string;
let pmToken: string;
let foremanToken: string;

const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  mongoServer = await prepareDatabase();

  app = await createApp();

  await setupDatabase();

  adminToken = await vitestLogin(app, "admin@bowmark.ca");
  pmToken = await vitestLogin(app, "pm@bowmark.ca");
  foremanToken = await vitestLogin(app, "baseforeman1@bowmark.ca");
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});

describe("Vehicle Resolver", () => {
  describe("QUERIES", () => {
    describe("vehicle", () => {
      const vehicleQuery = `
        query Vehicle($id: String!) {
          vehicle(id: $id) {
            _id
            name
            crews {
              name
            }
          }
        }
      `;

      describe("success", () => {
        test("should fetch and get all requested fields", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({
              query: vehicleQuery,
              variables: {
                id: _ids.vehicles.skidsteer_1._id,
              },
            });

          expect(res.status).toBe(200);

          expect(res.body.data.vehicle).toBeDefined();
          const vehicle = res.body.data.vehicle;

          expect(vehicle.name).toBe(documents.vehicles.skidsteer_1.name);

          expect(vehicle.crews.length).toBeGreaterThan(0);
          expect(vehicle.crews[0].name).toBe(documents.crews.base_1.name);
        });
      });

      describe("validation", () => {
        it("returns null for a non-existent vehicle id", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", adminToken)
            .send({
              query: `query { vehicle(id: "000000000000000000000001") { _id } }`,
            });
          expect(res.body.data.vehicle).toBeNull();
        });
      });
    });
  });

  describe("MUTATIONS", () => {
    describe("vehicleCreate", () => {
      const mutation = `
        mutation VehicleCreate($data: VehicleCreateData!) {
          vehicleCreate(data: $data) {
            _id
            name
          }
        }
      `;
      const variables = {
        data: { name: "New Vehicle", vehicleCode: "NV-1", vehicleType: "Truck" },
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

    describe("vehicleUpdate", () => {
      const mutation = `
        mutation VehicleUpdate($id: ID!, $data: VehicleUpdateData!) {
          vehicleUpdate(id: $id, data: $data) {
            _id
            name
          }
        }
      `;
      const variables = {
        id: _ids.vehicles.skidsteer_1._id.toString(),
        data: { name: "Updated Vehicle" },
      };

      it("succeeds as Admin", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
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

    describe("vehicleUpdateRates", () => {
      const vehicleUpdateRates = `
        mutation VehicleUpdateRates($id: String!, $data: [RatesData!]!) {
          vehicleUpdateRates(id: $id, data: $data) {
            _id
            rates {
              date
              rate
            }
          }
        }
      `;

      describe("success", () => {
        test("should successfully update vehicle rates", async () => {
          const token = await vitestLogin(app, documents.users.admin_user.email);

          const data: RatesData[] = [
            {
              date: new Date("2021-01-01"),
              rate: 18,
            },
            {
              date: new Date("2022-01-02"),
              rate: 20,
            },
          ];

          const res = await request(app)
            .post("/graphql")
            .send({
              query: vehicleUpdateRates,
              variables: {
                id: documents.vehicles.gravel_truck_1._id,
                data,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.vehicleUpdateRates._id).toBeDefined();

          const vehicle = await Vehicle.getById(
            res.body.data.vehicleUpdateRates._id,
            { throwError: true }
          );

          expect(vehicle?.rates.length).toBe(2);

          expect(vehicle?.rates[0]).toMatchObject(data[0]);
          expect(vehicle?.rates[1]).toMatchObject(data[1]);
        });
      });

      describe("authorization", () => {
        const variables = {
          id: _ids.vehicles.gravel_truck_1._id.toString(),
          data: [{ date: new Date().toISOString(), rate: 25 }],
        };

        it("rejects Foreman", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", foremanToken)
            .send({ query: vehicleUpdateRates, variables });
          expect(res.body.errors).toBeDefined();
        });

        it("rejects unauthenticated", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({ query: vehicleUpdateRates, variables });
          expect(res.body.errors).toBeDefined();
        });
      });
    });

    describe("vehicleArchive", () => {
      const mutation = `
        mutation VehicleArchive($id: ID!) {
          vehicleArchive(id: $id) {
            _id
          }
        }
      `;
      const variables = { id: _ids.vehicles.gravel_truck_2._id.toString() };

      it("succeeds as Admin", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
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
