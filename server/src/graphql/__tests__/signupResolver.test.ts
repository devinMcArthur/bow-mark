import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import { Signup } from "@models";
import vitestLogin from "@testing/vitestLogin";
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

describe("Signup Resolver", () => {
  describe("QUERIES", () => {
    describe("signup", () => {
      describe("validation", () => {
        it("returns null for a non-existent signup id", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({
              query: `query { signup(id: "000000000000000000000001") { _id } }`,
            });
          expect(res.body.data.signup).toBeNull();
        });
      });
    });
  });

  describe("MUTATIONS", () => {
    describe("signupCreate", () => {
      const signupCreate = `
        mutation SignupCreate($employeeId: String!) {
          signupCreate(employeeId: $employeeId) {
            _id
            employee {
              name
              _id
            }
          }
        }
      `;

      describe("success", () => {
        test("should successfully create a signup for an employee w/ an existing document", async () => {
          const token = await vitestLogin(
            app,
            documents.users.base_foreman_1_user.email
          );

          const employeeId = _ids.employees.base_laborer_3._id;

          const res = await request(app)
            .post("/graphql")
            .send({
              query: signupCreate,
              variables: {
                employeeId,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.signupCreate).toBeDefined();

          const signup = res.body.data.signupCreate;

          expect(signup.employee._id).toBe(employeeId.toString());

          const fetchedSignup = await Signup.getById(signup._id);
          expect(fetchedSignup).toBeDefined();
        });
      });

      describe("authorization", () => {
        it("succeeds as Foreman (any authenticated)", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", foremanToken)
            .send({
              query: signupCreate,
              variables: {
                employeeId: _ids.employees.base_laborer_2._id.toString(),
              },
            });
          expect(res.body.errors).toBeUndefined();
        });

        it("rejects unauthenticated", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({
              query: signupCreate,
              variables: {
                employeeId: _ids.employees.base_laborer_2._id.toString(),
              },
            });
          expect(res.body.errors).toBeDefined();
        });
      });
    });
  });
});
