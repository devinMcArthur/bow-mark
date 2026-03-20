import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { truncateAllPgTables } from "@testing/vitestPgDB";
import { db } from "../../db";
import { vehicleWorkSyncHandler } from "../handlers/vehicleWorkSync";

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

describe("vehicleWorkSync", () => {
  describe("writes fact_vehicle_work row with correct hours and vehicle rate", () => {
    it("stores hours = 3 and the skidsteer_1 rate (85) for sync_vehicle_work_1", async () => {
      const vehicleWork = documents.vehicleWork.sync_vehicle_work_1;
      const mongoId = vehicleWork._id.toString();

      await vehicleWorkSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_vehicle_work")
        .selectAll()
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
      // hours stored as Numeric — compare as number
      expect(Number(row!.hours)).toBe(3);
      // skidsteer_1 rate is 85
      expect(Number(row!.hourly_rate)).toBe(85);
    });
  });

  describe("creates dimension records", () => {
    it("upserts dim_vehicle, dim_crew, dim_jobsite, and dim_daily_report", async () => {
      const vehicleWork = documents.vehicleWork.sync_vehicle_work_1;
      const mongoId = vehicleWork._id.toString();

      await vehicleWorkSyncHandler.handle({ mongoId, action: "created" });

      const [vehicle, crew, jobsite, dailyReport] = await Promise.all([
        db.selectFrom("dim_vehicle").selectAll().executeTakeFirst(),
        db.selectFrom("dim_crew").selectAll().executeTakeFirst(),
        db.selectFrom("dim_jobsite").selectAll().executeTakeFirst(),
        db.selectFrom("dim_daily_report").selectAll().executeTakeFirst(),
      ]);

      expect(vehicle).toBeDefined();
      expect(crew).toBeDefined();
      expect(jobsite).toBeDefined();
      expect(dailyReport).toBeDefined();
    });
  });

  describe("idempotency", () => {
    it("does not create duplicate rows when handler runs twice", async () => {
      const vehicleWork = documents.vehicleWork.sync_vehicle_work_1;
      const mongoId = vehicleWork._id.toString();

      await vehicleWorkSyncHandler.handle({ mongoId, action: "created" });
      await vehicleWorkSyncHandler.handle({ mongoId, action: "updated" });

      const rows = await db
        .selectFrom("fact_vehicle_work")
        .selectAll()
        .where("mongo_id", "=", mongoId)
        .execute();

      expect(rows).toHaveLength(1);
    });
  });

  describe("delete sets archived_at", () => {
    it("marks the fact row archived after a deleted action", async () => {
      const vehicleWork = documents.vehicleWork.sync_vehicle_work_1;
      const mongoId = vehicleWork._id.toString();

      // First create the fact row
      await vehicleWorkSyncHandler.handle({ mongoId, action: "created" });

      // Then delete it
      await vehicleWorkSyncHandler.handle({ mongoId, action: "deleted" });

      const row = await db
        .selectFrom("fact_vehicle_work")
        .selectAll()
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
      expect(row!.archived_at).not.toBeNull();
    });
  });
});
