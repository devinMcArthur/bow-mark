import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import vitestLogin from "@testing/vitestLogin";
import { FileCreateData } from "@graphql/resolvers/file/mutations";
import path from "path";
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

      describe("validation", () => {
        it("returns an error for a non-existent daily report id", async () => {
          const res = await request(app)
            .post("/graphql")
            .set("Authorization", adminToken)
            .send({
              query: `query { dailyReport(id: "000000000000000000000001") { _id } }`,
            });
          expect(res.body.errors).toBeDefined();
          expect(res.body.data).toBeNull();
        });
      });
    });
  });

  describe("MUTATIONS", () => {
    describe("dailyReportCreate", () => {
      const mutation = `
        mutation DailyReportCreate($data: DailyReportCreateData!) {
          dailyReportCreate(data: $data) {
            _id
          }
        }
      `;
      const variables = {
        data: {
          date: new Date().toISOString(),
          crewId: _ids.crews.base_1._id.toString(),
          jobsiteId: _ids.jobsites.jobsite_1._id.toString(),
        },
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

    describe("dailyReportUpdate", () => {
      const mutation = `
        mutation DailyReportUpdate($id: String!, $data: DailyReportUpdateData!) {
          dailyReportUpdate(id: $id, data: $data) {
            _id
          }
        }
      `;
      const variables = {
        id: _ids.dailyReports.jobsite_1_base_1_1._id.toString(),
        data: {
          date: new Date().toISOString(),
          jobsiteId: _ids.jobsites.jobsite_1._id.toString(),
        },
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

    describe("dailyReportJobCostApprovalUpdate", () => {
      const mutation = `
        mutation DailyReportJobCostApprovalUpdate($id: String!, $approved: Boolean!) {
          dailyReportJobCostApprovalUpdate(id: $id, approved: $approved) {
            _id
          }
        }
      `;
      const variables = {
        id: _ids.dailyReports.jobsite_1_base_1_1._id.toString(),
        approved: true,
      };

      it("succeeds as Admin", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", adminToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeUndefined();
      });

      it("rejects ProjectManager", async () => {
        const res = await request(app)
          .post("/graphql")
          .set("Authorization", pmToken)
          .send({ query: mutation, variables });
        expect(res.body.errors).toBeDefined();
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

    describe("dailyReportPayrollCompleteUpdate", () => {
      const mutation = `
        mutation DailyReportPayrollCompleteUpdate($id: String!, $complete: Boolean!) {
          dailyReportPayrollCompleteUpdate(id: $id, complete: $complete) {
            _id
          }
        }
      `;
      const variables = {
        id: _ids.dailyReports.jobsite_1_base_1_1._id.toString(),
        complete: true,
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

    describe("dailyReportAddTemporaryEmployee", () => {
      const mutation = `
        mutation DailyReportAddTemporaryEmployee($id: String!, $employeeId: String!) {
          dailyReportAddTemporaryEmployee(id: $id, employeeId: $employeeId) {
            _id
          }
        }
      `;
      const variables = {
        id: _ids.dailyReports.jobsite_1_base_1_1._id.toString(),
        employeeId: _ids.employees.temp_1._id.toString(),
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

    describe("dailyReportAddTemporaryVehicle", () => {
      const mutation = `
        mutation DailyReportAddTemporaryVehicle($id: String!, $vehicleId: String!) {
          dailyReportAddTemporaryVehicle(id: $id, vehicleId: $vehicleId) {
            _id
          }
        }
      `;
      const variables = {
        id: _ids.dailyReports.jobsite_1_base_1_1._id.toString(),
        vehicleId: _ids.vehicles.temp_1._id.toString(),
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

    describe("dailyReportArchive", () => {
      const mutation = `
        mutation DailyReportArchive($id: ID!) {
          dailyReportArchive(id: $id) {
            _id
          }
        }
      `;
      const variables = {
        id: _ids.dailyReports.jobsite_1_base_1_3._id.toString(),
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
          const token = await vitestLogin(
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
          const token = await vitestLogin(
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

      describe("authorization", () => {
        it("rejects unauthenticated", async () => {
          const data: FileCreateData = {
            description: "Unauth test",
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
            );

          expect(res.body.errors).toBeDefined();
        });
      });
    });
  });
});
