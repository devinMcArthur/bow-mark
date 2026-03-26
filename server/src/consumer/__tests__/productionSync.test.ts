import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { truncateAllPgTables } from "@testing/vitestPgDB";
import { db } from "../../db";
import { productionSyncHandler } from "../handlers/productionSync";

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

describe("productionSyncHandler", () => {
  describe("created action", () => {
    it("writes a fact_production row with correct quantity and unit", async () => {
      const mongoId =
        documents.productions.sync_production_1._id.toString();
      await productionSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_production")
        .selectAll()
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
      // sync_production_1 has quantity = 150, unit = "tonnes"
      expect(Number(row!.quantity)).toBe(150);
      expect(row!.unit).toBe("tonnes");
    });

    it("links the row to the correct daily_report_id and jobsite_id", async () => {
      const mongoId =
        documents.productions.sync_production_1._id.toString();
      await productionSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_production")
        .select(["daily_report_id", "jobsite_id"])
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();

      // Verify daily_report_id maps to the dim_daily_report for jobsite_1_base_1_sync_1
      const dimReport = await db
        .selectFrom("dim_daily_report")
        .select("mongo_id")
        .where("id", "=", row!.daily_report_id)
        .executeTakeFirst();
      expect(dimReport).toBeDefined();
      expect(dimReport!.mongo_id).toBe(
        documents.dailyReports.jobsite_1_base_1_sync_1._id.toString()
      );

      // Verify jobsite_id maps to jobsite_1
      const dimJobsite = await db
        .selectFrom("dim_jobsite")
        .select("mongo_id")
        .where("id", "=", row!.jobsite_id)
        .executeTakeFirst();
      expect(dimJobsite).toBeDefined();
      expect(dimJobsite!.mongo_id).toBe(
        documents.jobsites.jobsite_1._id.toString()
      );
    });

    it("is idempotent — running twice does not create duplicate rows", async () => {
      const mongoId =
        documents.productions.sync_production_1._id.toString();
      await productionSyncHandler.handle({ mongoId, action: "created" });
      await productionSyncHandler.handle({ mongoId, action: "created" });

      const rows = await db
        .selectFrom("fact_production")
        .where("mongo_id", "=", mongoId)
        .execute();

      expect(rows.length).toBe(1);
    });
  });

  describe("deleted action", () => {
    it("removes the fact_production row (hard delete)", async () => {
      const mongoId =
        documents.productions.sync_production_1._id.toString();
      await productionSyncHandler.handle({ mongoId, action: "created" });

      // Confirm the row exists before deletion
      const before = await db
        .selectFrom("fact_production")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();
      expect(before).toBeDefined();

      await productionSyncHandler.handle({ mongoId, action: "deleted" });

      // Row should be gone
      const after = await db
        .selectFrom("fact_production")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();
      expect(after).toBeUndefined();
    });

    it("does not error when deleting a non-existent record", async () => {
      const fakeMongoId = "000000000000000000000000";
      await expect(
        productionSyncHandler.handle({
          mongoId: fakeMongoId,
          action: "deleted",
        })
      ).resolves.not.toThrow();
    });
  });
});
