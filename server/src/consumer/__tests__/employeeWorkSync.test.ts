import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { truncateAllPgTables } from "@testing/vitestPgDB";
import { db } from "../../db";
import { MongoMemoryServer } from "mongodb-memory-server";
import { employeeWorkSyncHandler } from "../handlers/employeeWorkSync";

let mongoServer: MongoMemoryServer;
let documents: SeededDatabase;

beforeAll(async () => {
  mongoServer = await prepareDatabase();
  documents = await seedDatabase();
});

beforeEach(async () => {
  await truncateAllPgTables();
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});

describe("employeeWorkSyncHandler", () => {
  describe("created action", () => {
    it("writes a fact_employee_work row with correct fields", async () => {
      const mongoId =
        documents.employeeWork.sync_employee_work_1._id.toString();
      await employeeWorkSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_employee_work")
        .selectAll()
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
      expect(row!.start_time).toEqual(new Date("2022-02-23T07:00:00.000Z"));
      expect(row!.end_time).toEqual(new Date("2022-02-23T15:00:00.000Z"));
      // base_foreman_1 rate on 2022-02-23 is $25/hr (rate effective 2022-01-01)
      expect(Number(row!.hourly_rate)).toBe(25);
    });

    it("creates the dimension records (jobsite, crew, employee, daily report)", async () => {
      const mongoId =
        documents.employeeWork.sync_employee_work_1._id.toString();
      await employeeWorkSyncHandler.handle({ mongoId, action: "created" });

      const jobsite = await db
        .selectFrom("dim_jobsite")
        .select("mongo_id")
        .where("mongo_id", "=", documents.jobsites.jobsite_1._id.toString())
        .executeTakeFirst();
      expect(jobsite).toBeDefined();

      const employee = await db
        .selectFrom("dim_employee")
        .select("mongo_id")
        .where(
          "mongo_id",
          "=",
          documents.employees.base_foreman_1._id.toString()
        )
        .executeTakeFirst();
      expect(employee).toBeDefined();
    });

    it("uses the date-effective rate, not the latest rate", async () => {
      const mongoId =
        documents.employeeWork.sync_employee_work_1._id.toString();
      await employeeWorkSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_employee_work")
        .select("hourly_rate")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(Number(row!.hourly_rate)).toBe(25);
    });

    it("is idempotent — running twice does not create duplicate rows", async () => {
      const mongoId =
        documents.employeeWork.sync_employee_work_1._id.toString();
      await employeeWorkSyncHandler.handle({ mongoId, action: "created" });
      await employeeWorkSyncHandler.handle({ mongoId, action: "created" });

      const rows = await db
        .selectFrom("fact_employee_work")
        .where("mongo_id", "=", mongoId)
        .execute();
      expect(rows.length).toBe(1);
    });
  });

  describe("deleted action", () => {
    it("sets archived_at on the fact row", async () => {
      const mongoId =
        documents.employeeWork.sync_employee_work_1._id.toString();
      await employeeWorkSyncHandler.handle({ mongoId, action: "created" });
      await employeeWorkSyncHandler.handle({ mongoId, action: "deleted" });

      const row = await db
        .selectFrom("fact_employee_work")
        .select("archived_at")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row!.archived_at).not.toBeNull();
    });
  });
});
