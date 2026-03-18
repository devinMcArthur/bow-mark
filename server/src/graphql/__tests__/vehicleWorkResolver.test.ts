import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/jestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import { VehicleWorkCreateData } from "@graphql/resolvers/vehicleWork/mutations";
import jestLogin from "@testing/jestLogin";
import { DailyReport, VehicleWork } from "@models";
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

describe("Vehicle Work Resolver", () => {
  describe("MUTATIONS", () => {
    describe("vehicleWorkCreate", () => {
      const vehicleWorkCreateMutation = `
        mutation VehicleWorkCreate($dailyReportId: String!, $data: [VehicleWorkCreateData!]!) {
          vehicleWorkCreate(dailyReportId: $dailyReportId, data: $data) {
            _id 
            jobTitle
            hours
            vehicle {
              name
            }
          }
        }
      `;

      describe("success", () => {
        test("should successfully create a batch of vehicle work", async () => {
          const token = await jestLogin(
            app,
            documents.users.base_foreman_1_user.email
          );

          const data: VehicleWorkCreateData[] = [
            {
              vehicles: [documents.vehicles.skidsteer_1._id.toString()],
              jobs: [
                {
                  jobTitle: "First Skidsteer Thing",
                  hours: 3,
                },
                {
                  jobTitle: "Second Skidsteer Thing",
                  hours: 4,
                },
              ],
            },
            {
              vehicles: [
                documents.vehicles.gravel_truck_1._id.toString(),
                documents.vehicles.personnel_truck_1._id.toString(),
              ],
              jobs: [
                {
                  jobTitle: "Other Thing 1",
                  hours: 2,
                },
                {
                  jobTitle: "Other Thing 2",
                  hours: 5,
                },
              ],
            },
          ];

          const res = await request(app)
            .post("/graphql")
            .send({
              query: vehicleWorkCreateMutation,
              variables: {
                dailyReportId: _ids.dailyReports.jobsite_1_base_1_1._id,
                data,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          const vehicleWorks = res.body.data.vehicleWorkCreate;

          expect(vehicleWorks.length).toBe(6);

          // ensure works saved
          const work = await VehicleWork.getById(vehicleWorks[0]._id);
          expect(work).toBeDefined();

          // ensure daily report has added records
          const dailyReport = await DailyReport.getById(
            documents.dailyReports.jobsite_1_base_1_1._id
          );
          expect(dailyReport?.vehicleWork.includes(work?._id));
        });
      });

      describe("error", () => {
        test("should error on empty vehicles array", async () => {
          const token = await jestLogin(
            app,
            documents.users.base_foreman_1_user.email
          );

          const data: VehicleWorkCreateData[] = [
            {
              vehicles: [],
              jobs: [
                {
                  jobTitle: "Title",
                  hours: 1,
                },
              ],
            },
          ];

          const res = await request(app)
            .post("/graphql")
            .send({
              query: vehicleWorkCreateMutation,
              variables: {
                dailyReportId: _ids.dailyReports.jobsite_1_base_1_1._id,
                data,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.errors[0].message).toMatch(
            "must provide a vehicles array"
          );
        });
      });
    });
  });
});
