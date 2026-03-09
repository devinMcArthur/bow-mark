import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/jestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import jestLogin from "@testing/jestLogin";
import { RatesData } from "@graphql/types/mutation";
import { Employee } from "@models";
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

describe("Employee Resolver", () => {
  describe("QUERIES", () => {
    describe("employee", () => {
      const employeeQuery = `
        query Employee($id: String!) {
          employee(id: $id) {
            _id 
            name
            jobTitle
            user {
              name
            }
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
              query: employeeQuery,
              variables: {
                id: _ids.employees.base_foreman_1._id,
              },
            });

          expect(res.status).toBe(200);

          expect(res.body.data.employee).toBeDefined();
          const employee = res.body.data.employee;

          expect(employee.name).toBe(documents.employees.base_foreman_1.name);

          expect(employee.user.name).toBe(
            documents.users.base_foreman_1_user.name
          );

          expect(employee.crews.length).toBe(1);
          expect(employee.crews[0].name).toBe(documents.crews.base_1.name);
        });
      });
    });
  });

  describe("MUTATIONS", () => {
    describe("employeeUpdateRates", () => {
      const employeeUpdateRates = `
        mutation EmployeeUpdateRates($id: String!, $data: [RatesData!]!) {
          employeeUpdateRates(id: $id, data: $data) {
            _id
            rates {
              date
              rate
            }
          }
        }
      `;

      describe("success", () => {
        test("should successfully update employee rates", async () => {
          const token = await jestLogin(app, documents.users.admin_user.email);

          const data: RatesData[] = [
            {
              date: new Date("2022-01-01"),
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
              query: employeeUpdateRates,
              variables: {
                id: documents.employees.base_laborer_1._id,
                data,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.employeeUpdateRates._id).toBeDefined();

          const employee = await Employee.getById(
            res.body.data.employeeUpdateRates._id,
            { throwError: true }
          );

          expect(employee?.rates.length).toBe(2);

          expect(employee?.rates[0]).toMatchObject(data[0]);
          expect(employee?.rates[1]).toMatchObject(data[1]);
        });
      });

      describe("error", () => {
        test("should error if no data is provided", async () => {
          const token = await jestLogin(app, documents.users.admin_user.email);

          const data: RatesData[] = [];

          const res = await request(app)
            .post("/graphql")
            .send({
              query: employeeUpdateRates,
              variables: {
                id: documents.employees.base_laborer_1._id,
                data,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.errors[0].message).toBe(
            "Must provide at least one rate"
          );
        });
      });
    });
  });
});
