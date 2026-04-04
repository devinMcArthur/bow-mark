import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import vitestLogin from "@testing/vitestLogin";
import { DefaultRateData } from "@graphql/types/mutation";
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
          const token = await vitestLogin(app, documents.users.admin_user.email);

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

      describe("authorization", () => {
        const variables = {
          data: [{ title: "Auth Test", rates: [{ date: new Date().toISOString(), rate: 100 }] }],
        };

        it("rejects ProjectManager", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", pmToken)
            .send({ query: systemUpdateCompanyVehicleTypeDefaults, variables });
          expect(res.body.errors).toBeDefined();
        });

        it("rejects Foreman", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", foremanToken)
            .send({ query: systemUpdateCompanyVehicleTypeDefaults, variables });
          expect(res.body.errors).toBeDefined();
        });

        it("rejects unauthenticated", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({ query: systemUpdateCompanyVehicleTypeDefaults, variables });
          expect(res.body.errors).toBeDefined();
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
          const token = await vitestLogin(app, documents.users.admin_user.email);

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

      describe("authorization", () => {
        const variables = {
          data: [{ title: "Auth Test", rates: [{ date: new Date().toISOString(), rate: 100 }] }],
        };

        it("rejects Foreman", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", foremanToken)
            .send({ query: systemUpdateMaterialShipmentVehicleTypeDefaults, variables });
          expect(res.body.errors).toBeDefined();
        });

        it("rejects unauthenticated", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({ query: systemUpdateMaterialShipmentVehicleTypeDefaults, variables });
          expect(res.body.errors).toBeDefined();
        });
      });
    });

    describe("systemUpdateUnitExtras", () => {
      const mutation = `
        mutation SystemUpdateUnitExtras($data: [String!]!) {
          systemUpdateUnitExtras(data: $data) {
            _id
          }
        }
      `;
      const variables = { data: ["tonnes", "litres"] };

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

    describe("systemUpdateLaborTypes", () => {
      const mutation = `
        mutation SystemUpdateLaborTypes($data: [String!]!) {
          systemUpdateLaborTypes(data: $data) {
            _id
          }
        }
      `;
      const variables = { data: ["Paving", "Concrete"] };

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

    describe("systemUpdateFluidTypes", () => {
      const mutation = `
        mutation SystemUpdateFluidTypes($data: [String!]!) {
          systemUpdateFluidTypes(data: $data) {
            _id
          }
        }
      `;
      const variables = { data: ["Diesel", "Gasoline"] };

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

    describe("systemUpdateInternalExpenseOverheadRate", () => {
      const mutation = `
        mutation SystemUpdateInternalExpenseOverheadRate($data: [RatesData!]!) {
          systemUpdateInternalExpenseOverheadRate(data: $data) {
            _id
          }
        }
      `;
      const variables = {
        data: [{ date: new Date().toISOString(), rate: 0.15 }],
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
  });
});
