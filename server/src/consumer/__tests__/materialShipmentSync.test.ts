import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { truncateAllPgTables } from "@testing/vitestPgDB";
import { db } from "../../db";
import { materialShipmentSyncHandler } from "../handlers/materialShipmentSync";

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

      // jobsite_2 trucking rate: $120/hr, type = "Hour" (TruckingRateTypes.Hour enum value)
      // startTime 08:00, endTime 10:00 → 2 hours → total_cost = 240
      expect(Number(row!.rate)).toBe(120);
      expect(row!.rate_type).toBe("Hour");
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

      // invoice cost = 500, total shipment quantity = 10, so per-unit rate = 50
      expect(Number(row!.rate)).toBe(50);
      // Invoice rates are never estimated
      expect(row!.estimated).toBe(false);
    });
  });

  describe("delivered rate cost type", () => {
    it("writes to fact_material_shipment with correct quantity", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_delivered_rate_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_material_shipment")
        .selectAll()
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
      // sync_shipment_delivered_rate_1 has quantity = 8
      expect(Number(row!.quantity)).toBe(8);
    });

    it("resolves rate from the specific deliveredRate entry", async () => {
      const mongoId =
        documents.materialShipments.sync_shipment_delivered_rate_1._id.toString();
      await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_material_shipment")
        .select(["rate", "estimated", "delivered_rate_id"])
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      // sync_jobsite_material_delivered_rate deliveredRate "Tandem" has rate = 25
      expect(Number(row!.rate)).toBe(25);
      expect(row!.estimated).toBe(false);
      // delivered_rate_id should be stored on the fact row
      expect(row!.delivered_rate_id).toBeDefined();
    });
  });

  describe("scenario-based cost model", () => {
    describe("pickup scenario (delivered=false)", () => {
      it("writes to fact_material_shipment with rate from the scenario", async () => {
        const mongoId =
          documents.materialShipments.sync_shipment_scenario_pickup_1._id.toString();
        await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

        const row = await db
          .selectFrom("fact_material_shipment")
          .select(["quantity", "rate", "estimated", "rate_scenario_id"])
          .where("mongo_id", "=", mongoId)
          .executeTakeFirst();

        expect(row).toBeDefined();
        // sync_shipment_scenario_pickup_1 has quantity=6
        expect(Number(row!.quantity)).toBe(6);
        // Pickup scenario has rate=$30
        expect(Number(row!.rate)).toBe(30);
        expect(row!.estimated).toBe(false);
        // rate_scenario_id should be stored so PG can group by scenario
        expect(row!.rate_scenario_id).toBe("629a49205f76f65244785a15");
      });

      it("also writes to fact_trucking (pickup scenario has truckingRateId)", async () => {
        const mongoId =
          documents.materialShipments.sync_shipment_scenario_pickup_1._id.toString();
        await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

        const row = await db
          .selectFrom("fact_trucking")
          .select(["rate", "hours", "total_cost"])
          .where("mongo_id", "=", mongoId)
          .executeTakeFirst();

        // jobsite_2 trucking: $120/hr, startTime 08:00 endTime 10:00 → 2h → $240
        expect(row).toBeDefined();
        expect(Number(row!.rate)).toBe(120);
        expect(Number(row!.hours)).toBe(2);
        expect(Number(row!.total_cost)).toBe(240);
      });
    });

    describe("delivered scenario (delivered=true)", () => {
      it("writes to fact_material_shipment with rate from the scenario", async () => {
        const mongoId =
          documents.materialShipments.sync_shipment_scenario_delivered_1._id.toString();
        await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

        const row = await db
          .selectFrom("fact_material_shipment")
          .select(["quantity", "rate", "estimated", "rate_scenario_id"])
          .where("mongo_id", "=", mongoId)
          .executeTakeFirst();

        expect(row).toBeDefined();
        // sync_shipment_scenario_delivered_1 has quantity=4
        expect(Number(row!.quantity)).toBe(4);
        // Tandem Delivered scenario has rate=$45
        expect(Number(row!.rate)).toBe(45);
        // rate_scenario_id should be stored for the delivered scenario
        expect(row!.rate_scenario_id).toBe("629a49205f76f65244785a16");
      });

      it("does NOT write to fact_trucking (delivered scenario has no truckingRateId)", async () => {
        const mongoId =
          documents.materialShipments.sync_shipment_scenario_delivered_1._id.toString();
        await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

        const row = await db
          .selectFrom("fact_trucking")
          .where("mongo_id", "=", mongoId)
          .executeTakeFirst();

        expect(row).toBeUndefined();
      });
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
