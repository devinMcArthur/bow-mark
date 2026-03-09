import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/jestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import jestLogin from "@testing/jestLogin";
import { DefaultRateData } from "@graphql/types/mutation";
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

describe("System Resolver", () => {
  describe("MUTATIONS", () => {
    describe("systemUpdateCompanyVehicleTypeDefaults", () => {
      const systemUpdateCompanyVehicleTypeDefaults = `
        mutation SystemUpdateCompanyVehicleTypeDefaults($data: [DefaultRateData!]!) {
          systemUpdateCompanyVehicleTypeDefaults(data: $data) {
            _id
            companyVehicleTypeDefaults {
              _id
              title
              rates {
                date
                rate
              }
            }
          }
        }
      `;

      describe("success", () => {
        test("should successfully update system vehicle rates", async () => {
          const token = await jestLogin(app, documents.users.admin_user.email);

          const data: DefaultRateData[] = [
            {
              title: "First",
              rates: [
                {
                  date: new Date(),
                  rate: 150,
                },
              ],
            },
          ];

          const res = await request(app)
            .post("/graphql")
            .send({
              query: systemUpdateCompanyVehicleTypeDefaults,
              variables: {
                data,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(
            res.body.data.systemUpdateCompanyVehicleTypeDefaults
          ).toBeDefined();

          const system = res.body.data.systemUpdateCompanyVehicleTypeDefaults;

          expect(system?.companyVehicleTypeDefaults.length).toBe(data.length);

          expect(system?.companyVehicleTypeDefaults[0].title).toBe(
            data[0].title
          );
          expect(system?.companyVehicleTypeDefaults[0].rates.length).toBe(
            data[0].rates.length
          );
        });
      });
    });

    describe("systemUpdateMaterialShipmentVehicleTypeDefaults", () => {
      const systemUpdateMaterialShipmentVehicleTypeDefaults = `
        mutation SystemUpdateMaterialShipmentVehicleTypeDefaults($data: [DefaultRateData!]!) {
          systemUpdateMaterialShipmentVehicleTypeDefaults(data: $data) {
            _id
            materialShipmentVehicleTypeDefaults {
              _id
              title
              rates {
                date
                rate
              }
            }
          }
        }
      `;

      describe("success", () => {
        test("should successfully update system vehicle rates", async () => {
          const token = await jestLogin(app, documents.users.admin_user.email);

          const data: DefaultRateData[] = [
            {
              title: "First",
              rates: [
                {
                  date: new Date(),
                  rate: 150,
                },
              ],
            },
          ];

          const res = await request(app)
            .post("/graphql")
            .send({
              query: systemUpdateMaterialShipmentVehicleTypeDefaults,
              variables: {
                data,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(
            res.body.data.systemUpdateMaterialShipmentVehicleTypeDefaults
          ).toBeDefined();

          const system =
            res.body.data.systemUpdateMaterialShipmentVehicleTypeDefaults;

          expect(system?.materialShipmentVehicleTypeDefaults.length).toBe(
            data.length
          );

          expect(system?.materialShipmentVehicleTypeDefaults[0].title).toBe(
            data[0].title
          );
          expect(
            system?.materialShipmentVehicleTypeDefaults[0].rates.length
          ).toBe(data[0].rates.length);
        });
      });
    });
  });
});
