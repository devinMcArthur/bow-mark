import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import { SignupData } from "@graphql/resolvers/user/mutations";
import { Signup, User } from "@models";
import { decode, JwtPayload } from "jsonwebtoken";
import jestLogin from "@testing/vitestLogin";
import { UserRoles } from "@typescript/user";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "http";


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

describe("User Resolver", () => {
  describe("INTEGRATION TESTS", () => {
    describe("password reset", () => {
      const passwordResetRequest = `
        mutation UserPasswordResetRequest($email: String!) {
          userPasswordResetRequest(email: $email)
        }
      `;

      const userByPasswordResetToken = `
        query UserByPasswordRequestToken($query: UserQuery!) {
          user(query: $query) {
            _id
            name
          }
        }
      `;

      const userPasswordReset = `
        mutation UserPasswordReset($password: String!, $token: String!) {
          userPasswordReset(password: $password, token: $token)
        }
      `;

      describe("success", () => {
        test("should successfully reset password", async () => {
          // Request password reset

          const passwordRequestResponse = await request(app)
            .post("/graphql")
            .send({
              query: passwordResetRequest,
              variables: {
                email: documents.users.base_foreman_1_user.email,
              },
            });

          expect(passwordRequestResponse.status).toBe(200);

          expect(
            passwordRequestResponse.body.data.userPasswordResetRequest
          ).toBe(true);

          // get user

          let user = await User.getById(
            documents.users.base_foreman_1_user._id
          );
          expect(user?.resetPasswordToken).toBeDefined();

          const userByTokenResponse = await request(app)
            .post("/graphql")
            .send({
              query: userByPasswordResetToken,
              variables: {
                query: {
                  resetPasswordToken: user?.resetPasswordToken,
                },
              },
            });

          expect(userByTokenResponse.status).toBe(200);
          expect(userByTokenResponse.body.data.user.name).toBe(
            documents.users.base_foreman_1_user.name
          );

          const passwordResetResponse = await request(app)
            .post("/graphql")
            .send({
              query: userPasswordReset,
              variables: {
                password: "newpassword",
                token: user?.resetPasswordToken,
              },
            });

          expect(passwordResetResponse.status).toBe(200);
          expect(passwordResetResponse.body.data.userPasswordReset).toBe(true);

          user = await User.getById(documents.users.base_foreman_1_user._id);

          expect(await user?.checkPassword("newpassword")).toBe(true);
        });
      });
    });
  });

  describe("QUERIES", () => {
    describe("user", () => {
      const userQuery = `
        query User($query: UserQuery!) {
          user(query: $query) {
            _id 
            name
            email
            password
            employee {
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
              query: userQuery,
              variables: {
                query: {
                  id: _ids.users.base_foreman_1_user._id,
                },
              },
            });

          expect(res.status).toBe(200);

          expect(res.body.data.user).toBeDefined();
          const user = res.body.data.user;

          expect(user.name).toBe(documents.users.base_foreman_1_user.name);

          expect(user.employee.name).toBe(
            documents.employees.base_foreman_1.name
          );
        });
      });
    });
  });

  describe("MUTATIONS", () => {
    describe("signup", () => {
      const signupMutation = `
        mutation Signup($signupId: String!, $data: SignupData!) {
          signup(signupId: $signupId, data: $data)
        }
      `;

      describe("success", () => {
        test("should successfully signup a new user and remove signup document", async () => {
          const data: SignupData = {
            name: "New User",
            email: "new@user.com",
            password: "testpassword",
          };

          const signupId = _ids.signups.base_laborer_3_signup._id;

          const res = await request(app).post("/graphql").send({
            query: signupMutation,
            variables: {
              signupId,
              data,
            },
          });

          expect(res.status).toBe(200);

          expect(res.body.data.signup).toBeDefined();

          const user = await User.getById(
            (decode(res.body.data.signup) as JwtPayload).userId
          );

          const employee = await user?.getEmployee();
          expect(employee?._id.toString()).toBe(
            _ids.employees.base_laborer_3._id.toString()
          );

          expect(user).toBeDefined();

          const passwordMatch = await user?.checkPassword(data.password);
          expect(passwordMatch).toBeTruthy();

          const signup = await Signup.getById(signupId);
          expect(signup).toBeNull();
        });

        afterAll(async () => {
          await setupDatabase();
        });
      });

      describe("error", () => {
        test("should error if using a taken email", async () => {
          const data: SignupData = {
            name: "New User",
            email: documents.users.base_foreman_1_user.email,
            password: "testpassword",
          };

          const signupId = _ids.signups.base_laborer_3_signup._id;

          const res = await request(app)
            .post("/graphql")
            .send({
              query: signupMutation,
              variables: {
                signupId,
                data: data,
              },
            });

          expect(res.status).toBe(200);

          expect(res.body.errors.length).toBe(1);
        });
      });
    });

    describe("userUpdateRole", () => {
      const userUpdateRole = `
        mutation UserUpdateRole($id: String!, $role: UserRoles!) {
          userUpdateRole(id: $id, role: $role) {
            _id
            role
          }
        }
      `;

      describe("success", () => {
        test("should successfully update user role", async () => {
          const token = await jestLogin(app, documents.users.admin_user.email);

          const res = await request(app)
            .post("/graphql")
            .send({
              query: userUpdateRole,
              variables: {
                id: documents.users.base_foreman_1_user._id,
                role: "ProjectManager",
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.userUpdateRole._id).toBeDefined();

          const user = await User.getById(res.body.data.userUpdateRole._id);

          expect(user?.role).toBe(UserRoles.ProjectManager);
        });
      });
    });
  });
});
