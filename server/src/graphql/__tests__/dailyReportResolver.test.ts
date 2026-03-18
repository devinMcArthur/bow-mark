import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/jestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import jestLogin from "@testing/jestLogin";
import { FileCreateData } from "@graphql/resolvers/file/mutations";
import path from "path";
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

describe("DailyReport Resolver", () => {
  describe("QUERIES", () => {
    describe("dailyReport", () => {
      const dailyReportQuery = `
        query DailyReport($id: String!) {
          dailyReport(id: $id) {
            _id 
            date
            crew {
              name
            }
            jobsite {
              name
            }
            employeeWork {
              startTime
              employee {
                name
              }
            }
            vehicleWork {
              startTime
              vehicle {
                name
              }
            }
            productions {
              jobTitle
            }
            materialShipments {
              shipmentType
              vehicle {
                name
              }
            }
            reportNote {
              note
            }
          }
        }
      `;

      describe("success", () => {
        test("should fetch and get all requested fields", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({
              query: dailyReportQuery,
              variables: {
                id: _ids.dailyReports.jobsite_1_base_1_1._id,
              },
            });

          expect(res.status).toBe(200);

          expect(res.body.data.dailyReport).toBeDefined();
          const dailyReport = res.body.data.dailyReport;

          expect(dailyReport.crew.name).toBe(documents.crews.base_1.name);
          expect(dailyReport.jobsite.name).toBe(
            documents.jobsites.jobsite_1.name
          );

          expect(dailyReport.employeeWork.length).toBe(
            documents.dailyReports.jobsite_1_base_1_1.employeeWork.length
          );
          expect(dailyReport.employeeWork.length).toBeGreaterThan(0);
          expect(dailyReport.employeeWork[0].employee.name).toBeDefined();

          expect(dailyReport.vehicleWork.length).toBe(
            documents.dailyReports.jobsite_1_base_1_1.vehicleWork.length
          );
          expect(dailyReport.vehicleWork.length).toBeGreaterThan(0);
          expect(dailyReport.vehicleWork[0].vehicle.name).toBe(
            documents.vehicles.skidsteer_1.name
          );

          expect(dailyReport.productions.length).toBe(
            documents.dailyReports.jobsite_1_base_1_1.production.length
          );
          expect(dailyReport.productions.length).toBeGreaterThan(0);

          expect(dailyReport.materialShipments.length).toBe(
            documents.dailyReports.jobsite_1_base_1_1.materialShipment.length
          );
          expect(dailyReport.materialShipments.length).toBeGreaterThan(0);
          expect(dailyReport.materialShipments[0].vehicle.name).toBe(
            documents.vehicles.gravel_truck_1.name
          );

          expect(dailyReport.reportNote).toBeDefined();
        });
      });
    });
  });

  describe("MUTATIONS", () => {
    describe("dailyReportAddNoteFile", () => {
      const addFileMutation = `
        mutation AddFile($id: String!, $data: FileCreateData!) {
          dailyReportAddNoteFile(id: $id, data: $data) {
            _id 
            reportNote {
              note
              files {
                mimetype
                buffer
                description
              }
            }
          }
        }
      `;

      describe("success", () => {
        test("should successfully add a file to report note", async () => {
          const token = await jestLogin(
            app,
            documents.users.base_foreman_1_user.email
          );

          const data: FileCreateData = {
            description: "A Description",
            // @ts-expect-error - must be null to attach field
            file: null,
          };

          const filename = "concrete.jpg";
          const res = await request(app)
            .post("/graphql")
            .field(
              "operations",
              JSON.stringify({
                query: addFileMutation,
                variables: {
                  id: documents.dailyReports.jobsite_1_base_1_1._id,
                  data,
                },
              })
            )
            .field(
              "map",
              JSON.stringify({
                1: ["variables.data.file"],
              })
            )
            .attach(
              "1",
              path.resolve(__dirname, `../../testing/assets/${filename}`)
            )
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.dailyReportAddNoteFile.reportNote).toBeDefined();
          const reportNote = res.body.data.dailyReportAddNoteFile.reportNote;

          expect(reportNote.files.length).toBe(2);

          const file = reportNote.files[1];
          expect(file.description).toBe(data.description);
          expect(file.buffer).toBeDefined();
          expect(file.mimetype).toBe("image/jpeg");
        });

        test("should successfully add a file a non-existant report note", async () => {
          const token = await jestLogin(
            app,
            documents.users.base_foreman_1_user.email
          );

          const data: FileCreateData = {
            description: "A Description 2",
            // @ts-expect-error - must be null to attach field
            file: null,
          };

          const filename = "concrete.jpg";
          const res = await request(app)
            .post("/graphql")
            .field(
              "operations",
              JSON.stringify({
                query: addFileMutation,
                variables: {
                  id: documents.dailyReports.jobsite_1_base_1_2._id,
                  data,
                },
              })
            )
            .field(
              "map",
              JSON.stringify({
                1: ["variables.data.file"],
              })
            )
            .attach(
              "1",
              path.resolve(__dirname, `../../testing/assets/${filename}`)
            )
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.dailyReportAddNoteFile.reportNote).toBeDefined();
          const reportNote = res.body.data.dailyReportAddNoteFile.reportNote;

          expect(reportNote.files.length).toBe(1);

          const file = reportNote.files[0];
          expect(file.description).toBe(data.description);
          expect(file.buffer).toBeDefined();
          expect(file.mimetype).toBe("image/jpeg");
        });
      });
    });
  });
});
