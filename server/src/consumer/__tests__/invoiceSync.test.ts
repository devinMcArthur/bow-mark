import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { truncateAllPgTables } from "@testing/vitestPgDB";
import { db } from "../../db";
import { invoiceSyncHandler } from "../handlers/invoiceSync";
import { Jobsite } from "@models";

let documents: SeededDatabase;

beforeAll(async () => {
  await prepareDatabase();
  documents = await seedDatabase();

  // Attach sync invoices to jobsite_1 so findJobsiteAndDirection can resolve them.
  // sync_invoice_revenue_1 → revenueInvoices, sync_invoice_expense_1 → expenseInvoices.
  await Jobsite.findByIdAndUpdate(documents.jobsites.jobsite_1._id, {
    $push: {
      revenueInvoices: documents.invoices.sync_invoice_revenue_1._id,
      expenseInvoices: documents.invoices.sync_invoice_expense_1._id,
    },
  });
});

beforeEach(async () => {
  await truncateAllPgTables();
});

afterAll(async () => {
  await disconnectAndStopServer();
});

describe("invoiceSyncHandler", () => {
  describe("revenue invoice (internal=false)", () => {
    it("writes a fact_invoice row with correct amount and direction=revenue", async () => {
      const mongoId =
        documents.invoices.sync_invoice_revenue_1._id.toString();
      await invoiceSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_invoice")
        .selectAll()
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
      // sync_invoice_revenue_1 has cost = 25000
      expect(Number(row!.amount)).toBe(25000);
      expect(row!.direction).toBe("revenue");
    });

    it("sets invoice_type=external for a non-internal invoice", async () => {
      const mongoId =
        documents.invoices.sync_invoice_revenue_1._id.toString();
      await invoiceSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_invoice")
        .select("invoice_type")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row!.invoice_type).toBe("external");
    });

    it("is idempotent — running twice does not create duplicate rows", async () => {
      const mongoId =
        documents.invoices.sync_invoice_revenue_1._id.toString();
      await invoiceSyncHandler.handle({ mongoId, action: "created" });
      await invoiceSyncHandler.handle({ mongoId, action: "created" });

      const rows = await db
        .selectFrom("fact_invoice")
        .where("mongo_id", "=", mongoId)
        .execute();

      expect(rows.length).toBe(1);
    });
  });

  describe("expense invoice (internal=true)", () => {
    it("writes a fact_invoice row with correct amount and direction=expense", async () => {
      const mongoId =
        documents.invoices.sync_invoice_expense_1._id.toString();
      await invoiceSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_invoice")
        .selectAll()
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
      // sync_invoice_expense_1 has cost = 8000
      expect(Number(row!.amount)).toBe(8000);
      expect(row!.direction).toBe("expense");
    });

    it("sets invoice_type=internal for an internal invoice", async () => {
      const mongoId =
        documents.invoices.sync_invoice_expense_1._id.toString();
      await invoiceSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_invoice")
        .select("invoice_type")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row!.invoice_type).toBe("internal");
    });

    it("is idempotent — running twice does not create duplicate rows", async () => {
      const mongoId =
        documents.invoices.sync_invoice_expense_1._id.toString();
      await invoiceSyncHandler.handle({ mongoId, action: "created" });
      await invoiceSyncHandler.handle({ mongoId, action: "created" });

      const rows = await db
        .selectFrom("fact_invoice")
        .where("mongo_id", "=", mongoId)
        .execute();

      expect(rows.length).toBe(1);
    });
  });

  describe("deleted action", () => {
    it("removes the fact_invoice row (hard delete)", async () => {
      const mongoId =
        documents.invoices.sync_invoice_revenue_1._id.toString();
      await invoiceSyncHandler.handle({ mongoId, action: "created" });

      // Confirm the row exists before deletion
      const before = await db
        .selectFrom("fact_invoice")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();
      expect(before).toBeDefined();

      await invoiceSyncHandler.handle({ mongoId, action: "deleted" });

      // Row should be gone
      const after = await db
        .selectFrom("fact_invoice")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();
      expect(after).toBeUndefined();
    });

    it("does not error when deleting a non-existent record", async () => {
      const fakeMongoId = "000000000000000000000000";
      await expect(
        invoiceSyncHandler.handle({
          mongoId: fakeMongoId,
          action: "deleted",
        })
      ).resolves.not.toThrow();
    });
  });
});
