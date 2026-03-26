
import { DailyReport, EmployeeWork } from "@models";
import { disconnectAndStopServer, prepareDatabase } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { IDailyReportCreate } from "@typescript/dailyReport";
import { timezoneStartOfDayinUTC } from "@utils/time";
import dayjs from "dayjs";

let documents: SeededDatabase;
const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  await prepareDatabase();

  await setupDatabase();
});

afterAll(async () => {
  await disconnectAndStopServer();
});

describe("Daily Report Class", () => {
  describe("CREATE", () => {
    describe("createDocument", () => {
      describe("success", () => {
        test("should successfully create a new daily report", async () => {
          const data: IDailyReportCreate = {
            date: new Date("2022-02-22 11:59 pm"),
            crew: documents.crews.base_1,
            jobsite: documents.jobsites.jobsite_1,
          };

          const dailyReport = await DailyReport.createDocument(data);

          const startOfDay = await timezoneStartOfDayinUTC(data.date);

          expect(dailyReport.date.toString()).toBe(startOfDay.toString());
          expect(dailyReport.crew?.toString()).toBe(data.crew._id.toString());
          expect(dailyReport.jobsite?.toString()).toBe(
            data.jobsite._id.toString()
          );
        });
      });

      describe("error", () => {
        test("should error if this report already exists", async () => {
          expect.assertions(1);

          const data: IDailyReportCreate = {
            date: new Date("2022-02-23 12:00 pm"),
            crew: documents.crews.base_1,
            jobsite: documents.jobsites.jobsite_1,
          };

          try {
            await DailyReport.createDocument(data);
          } catch (e) {
            expect((e as Error).message).toMatch("a report already exists");
          }
        });
      });
    });
  });

  describe("UPDATE", () => {
    describe("updateDocument", () => {
      describe("success", () => {
        test("should successfully update date and all relevant dates", async () => {
          const dailyReport = documents.dailyReports.jobsite_1_base_1_1;

          const newDate = new Date("2022-03-02");

          const { employeeWork } = await dailyReport.updateDocument({
            date: newDate,
            jobsiteId: dailyReport.jobsite || "",
          });

          expect(dailyReport.date).toEqual(newDate);

          // ensure it was different before
          const employeeWorkBefore = await EmployeeWork.getById(
            employeeWork[0]._id
          );
          expect(
            dayjs(employeeWorkBefore?.startTime).diff(newDate, "days")
          ).toBe(-6);
          expect(dayjs(employeeWorkBefore?.endTime).diff(newDate, "days")).toBe(
            -6
          );

          // ensure it matches now
          expect(dayjs(employeeWork[0].startTime).diff(newDate, "days")).toBe(
            0
          );
          expect(dayjs(employeeWork[0].endTime).diff(newDate, "days")).toBe(0);
        });

        test("should successfully update jobsite", async () => {
          const dailyReport = documents.dailyReports.jobsite_2_base_1_1;

          // Setup for update
          const originalMaterialShipments =
            await dailyReport.getMaterialShipments();
          for (let i = 0; i < originalMaterialShipments.length; i++) {
            originalMaterialShipments[i].noJobsiteMaterial = true;
            originalMaterialShipments[i].jobsiteMaterial = undefined;
            await originalMaterialShipments[i].save();
          }

          await dailyReport.updateDocument({
            jobsiteId: documents.jobsites.jobsite_1._id,
            date: dailyReport.date,
          });

          const materialShipments = await dailyReport.getMaterialShipments();

          expect(materialShipments.length).toBe(4);

          expect(materialShipments[0].vehicleObject?.truckingRateId).toEqual(
            documents.jobsites.jobsite_1.truckingRates[0]._id
          );
        });
      });
    });

    describe("addTemporaryEmployee", () => {
      describe("success", () => {
        test("should successfully add a temp employee to report", async () => {
          const dailyReport = documents.dailyReports.jobsite_1_base_1_1;

          expect(dailyReport.temporaryEmployees.length).toBe(1);

          await dailyReport.addTemporaryEmployee(documents.employees.temp_2);

          expect(dailyReport.temporaryEmployees.length).toBe(2);

          await setupDatabase();
        });

        test("should not add if employee is already a temp", async () => {
          const dailyReport = documents.dailyReports.jobsite_1_base_1_1;

          expect(dailyReport.temporaryEmployees.length).toBe(1);

          await dailyReport.addTemporaryEmployee(documents.employees.temp_1);

          expect(dailyReport.temporaryEmployees.length).toBe(1);
        });
      });

      describe("error", () => {
        test("should error if employee already exists in crew", async () => {
          expect.assertions(1);
          const dailyReport = documents.dailyReports.jobsite_1_base_1_1;

          try {
            await dailyReport.addTemporaryEmployee(
              documents.employees.base_foreman_1
            );
          } catch (e) {
            expect((e as Error).message).toMatch(
              "this employee already belongs to the crew"
            );
          }
        });
      });
    });

    describe("addTemporaryVehicle", () => {
      describe("success", () => {
        test("should successfully add a temp vehicle to report", async () => {
          const dailyReport = documents.dailyReports.jobsite_1_base_1_1;

          expect(dailyReport.temporaryVehicles.length).toBe(1);

          await dailyReport.addTemporaryVehicle(documents.vehicles.temp_2);

          expect(dailyReport.temporaryVehicles.length).toBe(2);

          await setupDatabase();
        });

        test("should not add if vehicle is already a temp", async () => {
          const dailyReport = documents.dailyReports.jobsite_1_base_1_1;

          expect(dailyReport.temporaryVehicles.length).toBe(1);

          await dailyReport.addTemporaryVehicle(documents.vehicles.temp_1);

          expect(dailyReport.temporaryVehicles.length).toBe(1);
        });
      });

      describe("error", () => {
        test("should error if vehicle already exists in crew", async () => {
          expect.assertions(1);
          const dailyReport = documents.dailyReports.jobsite_1_base_1_1;

          try {
            await dailyReport.addTemporaryVehicle(
              documents.vehicles.personnel_truck_1
            );
          } catch (e) {
            expect((e as Error).message).toMatch(
              "this vehicle already belongs to the crew"
            );
          }
        });
      });
    });
  });
});
