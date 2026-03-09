import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/jestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import jestLogin from "@testing/jestLogin";
import { RatesData } from "@graphql/types/mutation";
import { Vehicle } from "@models";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "http";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

let mongoServer: MongoMemoryServer, documents: SeededDatabase, app: Server;
const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  mongoServer = await prepareDatabase();

  app = await createApp();

  await setupDatabase();
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
    });
  });

  describe("MUTATIONS", () => {
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
          const token = await jestLogin(app, documents.users.admin_user.email);

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
    });
  });
});
