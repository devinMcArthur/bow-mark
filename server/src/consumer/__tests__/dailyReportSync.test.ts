import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { truncateAllPgTables } from "@testing/vitestPgDB";
import { db } from "../../db";
import { dailyReportSyncHandler } from "../handlers/dailyReportSync";

let documents: SeededDatabase;

beforeAll(async () => {
  await prepareDatabase();
  documents = await seedDatabase();
});

beforeEach(async () => {
  await truncateAllPgTables();
});

afterAll(async () => {
  await disconnectAndStopServer();
});

describe("dailyReportSyncHandler", () => {
  describe("created action", () => {
    it("creates a dim_daily_report row for jobsite_1_base_1_sync_1", async () => {
      const mongoId =
        documents.dailyReports.jobsite_1_base_1_sync_1._id.toString();
      await dailyReportSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("dim_daily_report")
        .selectAll()
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
      expect(row!.mongo_id).toBe(mongoId);
      expect(row!.approved).toBe(true);
    });

    it("links dim_daily_report to the correct jobsite and crew", async () => {
      const mongoId =
        documents.dailyReports.jobsite_1_base_1_sync_1._id.toString();
      await dailyReportSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("dim_daily_report")
        .select(["jobsite_id", "crew_id"])
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();

      const dimJobsite = await db
        .selectFrom("dim_jobsite")
        .select("mongo_id")
        .where("id", "=", row!.jobsite_id)
        .executeTakeFirst();
      expect(dimJobsite!.mongo_id).toBe(
        documents.jobsites.jobsite_1._id.toString()
      );

      const dimCrew = await db
        .selectFrom("dim_crew")
        .select("mongo_id")
        .where("id", "=", row!.crew_id)
        .executeTakeFirst();
      expect(dimCrew!.mongo_id).toBe(documents.crews.base_1._id.toString());
    });

    it("is idempotent — running twice does not create duplicate dim_daily_report rows", async () => {
      const mongoId =
        documents.dailyReports.jobsite_1_base_1_sync_1._id.toString();
      await dailyReportSyncHandler.handle({ mongoId, action: "created" });
      await dailyReportSyncHandler.handle({ mongoId, action: "created" });

      const rows = await db
        .selectFrom("dim_daily_report")
        .where("mongo_id", "=", mongoId)
        .execute();

      expect(rows.length).toBe(1);
    });

    it("creates fact_employee_work rows for all child EmployeeWork entries", async () => {
      const mongoId =
        documents.dailyReports.jobsite_1_base_1_sync_1._id.toString();
      await dailyReportSyncHandler.handle({ mongoId, action: "created" });

      // jobsite_1_base_1_sync_1 has employeeWork: [sync_employee_work_1]
      const ewMongoId =
        documents.employeeWork.sync_employee_work_1._id.toString();

      const row = await db
        .selectFrom("fact_employee_work")
        .selectAll()
        .where("mongo_id", "=", ewMongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
    });

    it("creates fact_production rows for all child Production entries", async () => {
      const mongoId =
        documents.dailyReports.jobsite_1_base_1_sync_1._id.toString();
      await dailyReportSyncHandler.handle({ mongoId, action: "created" });

      // jobsite_1_base_1_sync_1 has production: [sync_production_1]
      const prodMongoId =
        documents.productions.sync_production_1._id.toString();

      const row = await db
        .selectFrom("fact_production")
        .selectAll()
        .where("mongo_id", "=", prodMongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
      expect(Number(row!.quantity)).toBe(150);
    });
  });

  describe("deleted action", () => {
    it("sets archived=true on the dim_daily_report row", async () => {
      const mongoId =
        documents.dailyReports.jobsite_1_base_1_sync_1._id.toString();
      await dailyReportSyncHandler.handle({ mongoId, action: "created" });
      await dailyReportSyncHandler.handle({ mongoId, action: "deleted" });

      const row = await db
        .selectFrom("dim_daily_report")
        .select("archived")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
      expect(row!.archived).toBe(true);
    });

    it("sets archived_at on child fact_employee_work rows", async () => {
      const mongoId =
        documents.dailyReports.jobsite_1_base_1_sync_1._id.toString();
      await dailyReportSyncHandler.handle({ mongoId, action: "created" });
      await dailyReportSyncHandler.handle({ mongoId, action: "deleted" });

      const ewMongoId =
        documents.employeeWork.sync_employee_work_1._id.toString();

      const row = await db
        .selectFrom("fact_employee_work")
        .select("archived_at")
        .where("mongo_id", "=", ewMongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
      expect(row!.archived_at).not.toBeNull();
    });

    it("does not error when deleting a non-existent record", async () => {
      const fakeMongoId = "000000000000000000000000";
      await expect(
        dailyReportSyncHandler.handle({
          mongoId: fakeMongoId,
          action: "deleted",
        })
      ).resolves.not.toThrow();
    });
  });
});
