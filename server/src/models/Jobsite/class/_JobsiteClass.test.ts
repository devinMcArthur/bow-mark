import { MongoMemoryServer } from "mongodb-memory-server";

import { File, Jobsite, System } from "@models";
import { disconnectAndStopServer, prepareDatabase } from "@testing/jestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import {
  IJobsiteContract,
  IJobsiteCreate,
  IJobsiteUpdate,
} from "@typescript/jobsite";
import { UserRoles } from "@typescript/user";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";

let documents: SeededDatabase, mongoServer: MongoMemoryServer;
const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  mongoServer = await prepareDatabase();

  await setupDatabase();
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});

describe("Jobsite Class", () => {
  describe("GET", () => {
    describe("getNonCostedMaterialShipments", () => {
      describe("success", () => {
        test("should get all material shipments without costing", async () => {
          const materialShipments =
            await documents.jobsites.jobsite_2.getNonCostedMaterialShipments();

          expect(materialShipments.length).toBe(1);
          expect(materialShipments[0]._id.toString()).toBe(
            documents.materialShipments.jobsite_2_base_1_1_shipment_2._id.toString()
          );
        });
      });
    });
  });

  describe("CREATE", () => {
    describe("createDocument", () => {
      describe("success", () => {
        test("should successfully create jobsite", async () => {
          const data: IJobsiteCreate = {
            name: "Test Jobsite",
            jobcode: "28-001",
            description: "A short description",
          };

          const jobsite = await Jobsite.createDocument(data);

          await jobsite.save();

          expect(jobsite).toMatchObject(data);
        });

        test("should successfully create jobsite w/ contract", async () => {
          const data: IJobsiteCreate = {
            name: "Test Jobsite",
            jobcode: "28-002",
            description: "A short description",
            contract: {
              expectedProfit: 20000,
              bidValue: 250000,
            },
          };

          const jobsite = await Jobsite.createDocument(data);

          await jobsite.save();

          expect(jobsite).toMatchObject(data);
        });
      });
    });
  });

  describe("UPDATE", () => {
    describe("updateDocument", () => {
      describe("success", () => {
        test("should successfully update jobsite", async () => {
          const jobsite = documents.jobsites.jobsite_1;

          const data: IJobsiteUpdate = {
            name: "New Name",
          };
          await jobsite.updateDocument(data);

          expect(jobsite.name).toBe(data.name);
        });
      });
    });

    describe("updateContract", () => {
      describe("success", () => {
        test("should successfully update contract", async () => {
          const jobsite = documents.jobsites.jobsite_1;

          expect(jobsite.contract).toBeDefined();

          const data: IJobsiteContract = {
            expectedProfit: 60000.5,
            bidValue: 500000,
          };

          await jobsite.updateContract(data);

          expect(jobsite.contract).toMatchObject(data);
        });
      });
    });

    describe("setAllEmptyTruckingRates", () => {
      afterAll(async () => {
        await setupDatabase();
      });

      describe("success", () => {
        test("should successfully update all empty trucking rates", async () => {
          expect(documents.jobsites.jobsite_3.truckingRates.length).toBe(0);

          const jobsites = await Jobsite.setAllEmptyTruckingRates();

          expect(jobsites.length).toBe(1);

          await jobsites[0].save();

          const system = await System.getSystem();
          expect(jobsites[0].truckingRates.length).toBe(
            system.materialShipmentVehicleTypeDefaults.length
          );

          const anotherAttempt = await Jobsite.setAllEmptyTruckingRates();
          expect(anotherAttempt.length).toBe(0);
        });
      });
    });

    describe("addTruckingRateToAll", () => {
      describe("success", () => {
        afterEach(async () => {
          await setupDatabase();
        });

        test("should successfully add trucking rate to all", async () => {
          const newRate = {
            date: dayjs().add(1, "year").toDate(),
            rate: 145,
          };

          const system = await System.getSystem();
          system.materialShipmentVehicleTypeDefaults[0].rates.push(newRate);
          await system.save();

          expect(
            documents.jobsites.jobsite_2.truckingRates[0].rates.length
          ).toBe(1);

          const jobsites = await Jobsite.addTruckingRateToAll(0, 1);

          expect(jobsites.length).toBe(2);

          expect(jobsites[1]._id.toString()).toBe(
            documents.jobsites.jobsite_2._id.toString()
          );

          expect(jobsites[1].truckingRates[0].rates.length).toBe(2);
          expect(jobsites[1].truckingRates[0].rates[1]).toMatchObject(newRate);
        });

        test("should not add trucking rate if requested rate is before the already assigned jobsite rate", async () => {
          const newRate = {
            date: new Date(),
            rate: 145,
          };

          const system = await System.getSystem();
          system.materialShipmentVehicleTypeDefaults[0].rates.push(newRate);
          await system.save();

          expect(
            documents.jobsites.jobsite_2.truckingRates[0].rates.length
          ).toBe(1);

          expect(
            system.materialShipmentVehicleTypeDefaults[0].rates.length
          ).toBe(2);

          const jobsites = await Jobsite.addTruckingRateToAll(0, 1);

          expect(jobsites.length).toBe(0);
        });

        test("should add new rate item to all jobsites", async () => {
          const newRateItem = {
            title: "New",
            rates: [
              {
                date: new Date(),
                rate: 40,
              },
            ],
          };

          const system = await System.getSystem();
          system.materialShipmentVehicleTypeDefaults.push(newRateItem);
          await system.save();

          expect(documents.jobsites.jobsite_2.truckingRates.length).toBe(1);

          const jobsites = await Jobsite.addTruckingRateToAll(
            system.materialShipmentVehicleTypeDefaults.length - 1,
            0
          );

          expect(jobsites.length).toBe(2);

          expect(jobsites[1]._id.toString()).toBe(
            documents.jobsites.jobsite_2._id.toString()
          );

          expect(jobsites[1].truckingRates.length).toBe(2);

          expect(jobsites[1].truckingRates[1].title).toBe(newRateItem.title);
          expect(jobsites[1].truckingRates[1].rates.length).toBe(
            newRateItem.rates.length
          );
        });
      });
    });

    describe("addFileObject", () => {
      describe("success", () => {
        afterEach(async () => {
          await setupDatabase();
        });

        test("should successfully add a file object", async () => {
          const jobsite = documents.jobsites.jobsite_1;
          expect(jobsite.fileObjects.length).toBe(1);

          const file = await jobsite.addFileObject({
            file: {
              mimetype: "image/jpeg",
              stream: fs.createReadStream(
                path.join(
                  __dirname,
                  "..",
                  "..",
                  "..",
                  "testing",
                  "assets",
                  "concrete.jpg"
                )
              ),
              description: "description",
            },
            minRole: UserRoles.User,
          });

          expect(file.description).toBe("description");

          await jobsite.save();

          expect(jobsite.fileObjects.length).toBe(2);
        });
      });
    });
  });

  describe("REMOVE", () => {
    describe("removeFileObject", () => {
      describe("success", () => {
        test("should successfully remove file object", async () => {
          const jobsite = documents.jobsites.jobsite_1;

          expect(jobsite.fileObjects.length).toBe(1);

          const fileObject = JSON.parse(JSON.stringify(jobsite.fileObjects[0]));

          const foundFile = await File.getById(fileObject.file || "");
          expect(foundFile).toBeDefined();

          await jobsite.removeFileObject(fileObject._id || "");

          expect(jobsite.fileObjects.length).toBe(0);

          const notFound = await File.getById(fileObject.file || "");
          expect(notFound).toBeNull();
        });
      });
    });

    describe("removeDocument", () => {
      describe("success", () => {
        afterEach(async () => {
          await setupDatabase();
        });

        test("should successfully remove jobsite, transfer materials and daily reports", async () => {
          const jobsite = documents.jobsites.jobsite_2;

          const originalTransferJobsite = await Jobsite.getById(
            documents.jobsites.jobsite_1._id
          );

          const jobsiteDailyReportsLength = (await jobsite.getDailyReports())
            .length;
          const originalTransferJobsiteDRLength = (
            await originalTransferJobsite?.getDailyReports()
          )?.length;

          await jobsite.removeDocument(documents.jobsites.jobsite_1._id);

          const notFound = await Jobsite.getById(
            documents.jobsites.jobsite_2._id
          );
          expect(notFound).toBeNull();

          const transferJobsite = await Jobsite.getById(
            documents.jobsites.jobsite_1._id
          );

          // Transfered materials
          expect(transferJobsite?.materials.length).toBe(
            jobsite.materials.length
          );

          // Transferred daily reports
          const dailyReports = await transferJobsite?.getDailyReports();
          expect(dailyReports?.length).toBe(
            jobsiteDailyReportsLength + (originalTransferJobsiteDRLength || 0)
          );
        });

        test("should successfully remove jobsite, transfer invoices", async () => {
          const jobsite = documents.jobsites.jobsite_3;

          await jobsite.removeDocument(documents.jobsites.jobsite_1._id);

          const notFound = await Jobsite.getById(
            documents.jobsites.jobsite_3._id
          );
          expect(notFound).toBeNull();

          const transferJobsite = await Jobsite.getById(
            documents.jobsites.jobsite_1._id
          );

          // Revenue invoices
          expect(transferJobsite?.revenueInvoices.length).toBe(
            jobsite.revenueInvoices.length
          );

          // Revenue invoices
          expect(transferJobsite?.expenseInvoices.length).toBe(
            jobsite.expenseInvoices.length
          );
        });
      });

      describe("error", () => {
        test("should throw error if no tranfer jobsite is provided when it should", async () => {
          const jobsite = documents.jobsites.jobsite_2;

          await expect(jobsite.removeDocument()).rejects.toThrowError();
        });
      });
    });
  });
});
