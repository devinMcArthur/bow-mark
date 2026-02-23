/**
 * Invoice Sync Handler
 *
 * Syncs Invoice records to fact_invoice in PostgreSQL.
 * Invoices are linked to jobsites via:
 * - Jobsite.revenueInvoices (revenue)
 * - Jobsite.expenseInvoices (expense)
 * - JobsiteMaterial.invoices (expense, material-related)
 */

import {
  Invoice,
  Jobsite,
  JobsiteMaterial,
  type InvoiceDocument,
  type JobsiteDocument,
  type CompanyDocument,
} from "@models";
import { db } from "../../db";
import { SyncHandler } from "./base";
import { upsertDimJobsite, upsertDimCompany } from "./dimensions";

/** Invoice with required populated references */
type PopulatedInvoice = InvoiceDocument & {
  company: CompanyDocument;
};

/** Direction of an invoice */
type InvoiceDirection = "expense" | "revenue";

/** Type of invoice (derived from internal/accrual flags) */
type InvoiceType = "external" | "internal" | "accrual";

/** Context needed to sync an Invoice to the fact table */
export interface InvoiceSyncContext {
  invoice: PopulatedInvoice;
  jobsite: JobsiteDocument;
  direction: InvoiceDirection;
}

/**
 * Determine the invoice type based on flags
 */
function getInvoiceType(invoice: InvoiceDocument): InvoiceType {
  if (invoice.accrual) return "accrual";
  if (invoice.internal) return "internal";
  return "external";
}

/**
 * Find the jobsite and direction for an invoice
 */
async function findJobsiteAndDirection(
  invoice: InvoiceDocument
): Promise<{ jobsite: JobsiteDocument; direction: InvoiceDirection } | null> {
  // First check if it's in a JobsiteMaterial (expense)
  const jobsiteMaterial = await JobsiteMaterial.findOne({
    invoices: { $in: [invoice._id] },
  });

  if (jobsiteMaterial) {
    const jobsite = await Jobsite.findOne({
      materials: { $in: [jobsiteMaterial._id] },
    });
    if (jobsite) {
      return { jobsite, direction: "expense" };
    }
  }

  // Check if it's a revenue invoice on a jobsite
  const revenueJobsite = await Jobsite.findOne({
    revenueInvoices: { $in: [invoice._id] },
  });
  if (revenueJobsite) {
    return { jobsite: revenueJobsite, direction: "revenue" };
  }

  // Check if it's an expense invoice on a jobsite
  const expenseJobsite = await Jobsite.findOne({
    expenseInvoices: { $in: [invoice._id] },
  });
  if (expenseJobsite) {
    return { jobsite: expenseJobsite, direction: "expense" };
  }

  return null;
}

/**
 * Sync handler for Invoice entities
 */
class InvoiceSyncHandler extends SyncHandler<PopulatedInvoice> {
  readonly entityName = "Invoice";

  protected async fetchFromMongo(mongoId: string): Promise<PopulatedInvoice | null> {
    const doc = await Invoice.findById(mongoId)
      .populate("company")
      .exec();

    return doc as PopulatedInvoice | null;
  }

  protected validate(doc: PopulatedInvoice): boolean {
    if (!doc.company) {
      console.warn(`[${this.entityName}Sync] ${doc._id} missing company reference`);
      return false;
    }
    return true;
  }

  protected async syncToPostgres(invoice: PopulatedInvoice): Promise<void> {
    // Find the parent jobsite and direction
    const result = await findJobsiteAndDirection(invoice);

    if (!result) {
      console.warn(
        `[${this.entityName}Sync] No parent Jobsite found for Invoice ${invoice._id}`
      );
      return;
    }

    const { jobsite, direction } = result;

    // Sync the fact record
    await upsertFactInvoice({
      invoice,
      jobsite,
      direction,
    });
  }

  protected async handleDelete(mongoId: string): Promise<void> {
    // Delete the invoice fact record
    await db
      .deleteFrom("fact_invoice")
      .where("mongo_id", "=", mongoId)
      .execute();
  }
}

/**
 * Upsert a fact_invoice record
 */
export async function upsertFactInvoice(ctx: InvoiceSyncContext): Promise<void> {
  const { invoice, jobsite, direction } = ctx;
  const mongoId = invoice._id.toString();

  // Upsert dimension records
  const jobsiteId = await upsertDimJobsite(jobsite);
  const companyId = await upsertDimCompany(invoice.company);

  // Determine invoice type
  const invoiceType = getInvoiceType(invoice);

  // Check if fact record exists
  const existing = await db
    .selectFrom("fact_invoice")
    .select("id")
    .where("mongo_id", "=", mongoId)
    .executeTakeFirst();

  const factData = {
    jobsite_id: jobsiteId,
    company_id: companyId,
    invoice_date: invoice.date,
    direction,
    invoice_type: invoiceType,
    invoice_number: invoice.invoiceNumber,
    amount: invoice.cost.toString(),
    description: invoice.description || null,
    synced_at: new Date(),
  };

  if (existing) {
    await db
      .updateTable("fact_invoice")
      .set(factData)
      .where("id", "=", existing.id)
      .execute();
  } else {
    await db
      .insertInto("fact_invoice")
      .values({
        mongo_id: mongoId,
        ...factData,
      })
      .execute();
  }
}

// Export singleton instance
export const invoiceSyncHandler = new InvoiceSyncHandler();
