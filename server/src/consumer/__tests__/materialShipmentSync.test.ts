import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { truncateAllPgTables } from "@testing/vitestPgDB";
import { db } from "../../db";
import { MongoMemoryServer } from "mongodb-memory-server";
import { materialShipmentSyncHandler } from "../handlers/materialShipmentSync";

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

describe("materialShipmentSyncHandler", () => {
  describe("costed material (noJobsiteMaterial=false, rate cost type)", () => {
    it("writes to fact_material_shipment with correct quantity", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_costed_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_material_shipment")
        .selectAll()
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
      // sync_shipment_costed_1 has quantity = 5
      expect(Number(row!.quantity)).toBe(5);
    });

    it("stores the rate from the jobsite material rate table", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_costed_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_material_shipment")
        .select(["rate", "estimated"])
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      // jobsite_2_material_1 has rate = 10
      expect(Number(row!.rate)).toBe(10);
    });

    it("is idempotent — running twice does not create duplicate rows", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_costed_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

      const rows = await db
        .selectFrom("fact_material_shipment")
        .where("mongo_id", "=", mongoId)
        .execute();

      expect(rows.length).toBe(1);
    });
  });

  describe("non-costed material (noJobsiteMaterial=true)", () => {
    it("writes to fact_non_costed_material, not fact_material_shipment", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_non_costed_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

      const factRow = await db
        .selectFrom("fact_material_shipment")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();
      // Must NOT be written to fact_material_shipment
      expect(factRow).toBeUndefined();

      const nonCostedRow = await db
        .selectFrom("fact_non_costed_material")
        .selectAll()
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(nonCostedRow).toBeDefined();
      // sync_shipment_non_costed_1 has quantity = 3
      expect(Number(nonCostedRow!.quantity)).toBe(3);
    });

    it("stores material_name and supplier_name from the shipment", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_non_costed_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_non_costed_material")
        .select(["material_name", "supplier_name"])
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      // sync_shipment_non_costed_1: shipmentType = "Gravel", supplier = "Local Supplier"
      expect(row!.material_name).toBe("Gravel");
      expect(row!.supplier_name).toBe("Local Supplier");
    });

    it("is idempotent — running twice does not create duplicate rows", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_non_costed_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

      const rows = await db
        .selectFrom("fact_non_costed_material")
        .where("mongo_id", "=", mongoId)
        .execute();

      expect(rows.length).toBe(1);
    });
  });

  describe("trucking (vehicleObject.truckingRateId present)", () => {
    it("writes to fact_trucking", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_trucking_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_trucking")
        .selectAll()
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
    });

    it("also writes to fact_material_shipment (shipment is costed)", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_trucking_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

      const materialRow = await db
        .selectFrom("fact_material_shipment")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      // sync_shipment_trucking_1 has noJobsiteMaterial=false, so costed path runs first
      expect(materialRow).toBeDefined();
    });

    it("calculates total_cost from hourly rate and hours worked", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_trucking_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_trucking")
        .select(["rate", "rate_type", "hours", "total_cost", "trucking_type"])
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      // jobsite_2 trucking rate: $120/hr, type = "hour"
      // startTime 08:00, endTime 10:00 → 2 hours → total_cost = 240
      expect(Number(row!.rate)).toBe(120);
      expect(row!.rate_type).toBe("hour");
      expect(Number(row!.hours)).toBe(2);
      expect(Number(row!.total_cost)).toBe(240);
      expect(row!.trucking_type).toBe("Tandem");
    });

    it("is idempotent — running twice does not create duplicate trucking rows", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_trucking_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

      const rows = await db
        .selectFrom("fact_trucking")
        .where("mongo_id", "=", mongoId)
        .execute();

      expect(rows.length).toBe(1);
    });
  });

  describe("invoice cost type (highest-risk path)", () => {
    it("resolves rate from invoice and writes to fact_material_shipment", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_invoice_cost_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_material_shipment")
        .selectAll()
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
      // sync_shipment_invoice_cost_1 has quantity = 10
      expect(Number(row!.quantity)).toBe(10);
    });

    it("derives per-unit rate from invoice cost / total shipment quantity", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_invoice_cost_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_material_shipment")
        .select(["rate", "estimated"])
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      // sync_invoice_for_shipment_rate: cost=$500, date=2022-02-01 (Feb 2022)
      // Only shipment for sync_jobsite_material_invoice_cost in Feb 2022: quantity=10
      // rate = 500 / 10 = 50
      expect(Number(row!.rate)).toBe(50);
      // Invoice rates are never estimated
      expect(row!.estimated).toBe(false);
    });
  });

  describe("delete action", () => {
    it("sets archived_at on fact_material_shipment", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_costed_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });
      await materialShipmentSyncHandler.handle({ mongoId, action: "deleted" });

      const row = await db
        .selectFrom("fact_material_shipment")
        .select("archived_at")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row!.archived_at).not.toBeNull();
    });

    it("sets archived_at on fact_trucking when deleting a trucking shipment", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_trucking_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });
      await materialShipmentSyncHandler.handle({ mongoId, action: "deleted" });

      const truckingRow = await db
        .selectFrom("fact_trucking")
        .select("archived_at")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(truckingRow!.archived_at).not.toBeNull();
    });

    it("does not error when deleting a non-existent record", async () => {
      const fakeMongoId = "000000000000000000000000";
      await expect(
        materialShipmentSyncHandler.handle({
          mongoId: fakeMongoId,
          action: "deleted",
        })
      ).resolves.not.toThrow();
    });
  });
});
