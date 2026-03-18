import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/jestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import { EmployeeWorkCreateData } from "@graphql/resolvers/employeeWork/mutations";
import jestLogin from "@testing/jestLogin";
import { DailyReport, EmployeeWork } from "@models";
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

describe("Employee Work Resolver", () => {
  describe("MUTATIONS", () => {
    describe("employeeWorkCreate", () => {
      const employeeWorkCreateMutation = `
        mutation EmployeeWorkCreate($dailyReportId: String!, $data: [EmployeeWorkCreateData!]!) {
          employeeWorkCreate(dailyReportId: $dailyReportId, data: $data) {
            _id 
            jobTitle
            startTime
            endTime
            employee {
              name
            }
          }
        }
      `;

      describe("success", () => {
        test("should successfully create a batch of employee work", async () => {
          const token = await jestLogin(
            app,
            documents.users.base_foreman_1_user.email
          );

          const data: EmployeeWorkCreateData[] = [
            {
              employees: [documents.employees.base_foreman_1._id.toString()],
              jobs: [
                {
                  jobTitle: "First Foreman Thing",
                  startTime: new Date("2022-03-01 6:00 am"),
                  endTime: new Date("2022-03-01 8:00 am"),
                },
                {
                  jobTitle: "Second Foreman Thing",
                  startTime: new Date("2022-03-01 8:00 am"),
                  endTime: new Date("2022-03-01 12:00 pm"),
                },
              ],
            },
            {
              employees: [
                documents.employees.base_laborer_1._id.toString(),
                documents.employees.base_laborer_2._id.toString(),
                documents.employees.base_laborer_3._id.toString(),
              ],
              jobs: [
                {
                  jobTitle: "Laborer Thing 1",
                  startTime: new Date("2022-03-01 6:00 am"),
                  endTime: new Date("2022-03-01 12:00 pm"),
                },
                {
                  jobTitle: "Laborer Thing 2",
                  startTime: new Date("2022-03-01 12:00 pm"),
                  endTime: new Date("2022-03-01 4:00 pm"),
                },
              ],
            },
          ];

          const res = await request(app)
            .post("/graphql")
            .send({
              query: employeeWorkCreateMutation,
              variables: {
                dailyReportId: _ids.dailyReports.jobsite_1_base_1_1._id,
                data,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          const employeeWorks = res.body.data.employeeWorkCreate;

          expect(employeeWorks.length).toBe(8);

          // ensure works saved
          const work = await EmployeeWork.getById(employeeWorks[0]._id);
          expect(work).toBeDefined();

          // ensure daily report has added records
          const dailyReport = await DailyReport.getById(
            documents.dailyReports.jobsite_1_base_1_1._id
          );
          expect(dailyReport?.employeeWork.includes(work?._id));
        });
      });

      describe("error", () => {
        test("should error if a job title is missing", async () => {
          const token = await jestLogin(
            app,
            documents.users.base_foreman_1_user.email
          );

          const data: EmployeeWorkCreateData[] = [
            {
              employees: [documents.employees.base_foreman_1._id.toString()],
              jobs: [
                {
                  jobTitle: "",
                  startTime: new Date("2022-03-01 6:00 am"),
                  endTime: new Date("2022-03-01 8:00 am"),
                },
              ],
            },
          ];

          const res = await request(app)
            .post("/graphql")
            .send({
              query: employeeWorkCreateMutation,
              variables: {
                dailyReportId: _ids.dailyReports.jobsite_1_base_1_1._id,
                data,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.errors[0].message).toMatch(
            "must provide a valid job title"
          );
        });

        test("should error on empty employees array", async () => {
          const token = await jestLogin(
            app,
            documents.users.base_foreman_1_user.email
          );

          const data: EmployeeWorkCreateData[] = [
            {
              employees: [],
              jobs: [
                {
                  jobTitle: "Title",
                  startTime: new Date("2022-03-01 6:00 am"),
                  endTime: new Date("2022-03-01 8:00 am"),
                },
              ],
            },
          ];

          const res = await request(app)
            .post("/graphql")
            .send({
              query: employeeWorkCreateMutation,
              variables: {
                dailyReportId: _ids.dailyReports.jobsite_1_base_1_1._id,
                data,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.errors[0].message).toMatch(
            "must provide an employees array"
          );
        });
      });
    });
  });
});
