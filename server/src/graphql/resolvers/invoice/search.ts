import mongoose from "mongoose";
import { Field, ObjectType, registerEnumType } from "type-graphql";
import {
  Company,
  Invoice,
  InvoiceClass,
  InvoiceDocument,
  Jobsite,
  JobsiteMaterial,
  JobsiteMaterialClass,
  JobsiteMaterialDocument,
} from "@models";

/**
 * Server-side invoice search scoped to a single jobsite. Walks the
 * jobsite's expense + revenue invoice refs AND every JobsiteMaterial's
 * invoices list, filters by a case-insensitive match on company name,
 * invoice number, or description, and returns results tagged with the
 * "kind" so the client can badge each card. Caps at SEARCH_LIMIT hits —
 * the UI is for pinpointing a specific invoice, not browsing.
 */

export enum JobsiteInvoiceKind {
  Subcontractor = "SUBCONTRACTOR",
  Revenue = "REVENUE",
  Material = "MATERIAL",
}

registerEnumType(JobsiteInvoiceKind, {
  name: "JobsiteInvoiceKind",
});

@ObjectType()
export class JobsiteInvoiceSearchHit {
  @Field(() => JobsiteInvoiceKind)
  public kind!: JobsiteInvoiceKind;

  @Field(() => InvoiceClass)
  public invoice!: InvoiceClass;

  // Only set for MATERIAL hits — lets the client show which material
  // the invoice is filed under, since material invoices don't otherwise
  // surface their parent on the card.
  @Field(() => JobsiteMaterialClass, { nullable: true })
  public jobsiteMaterial?: JobsiteMaterialClass | null;
}

const SEARCH_LIMIT = 50;

const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const jobsiteInvoiceSearch = async (
  jobsiteId: string,
  query: string
): Promise<JobsiteInvoiceSearchHit[]> => {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const jobsite = await Jobsite.getById(jobsiteId, { throwError: true });
  if (!jobsite) return [];

  // Collect every invoice id attached to this jobsite, tagged by kind.
  // A single Invoice can't appear twice — each id lives in exactly one
  // of these three buckets by construction.
  const taggedIds = new Map<
    string,
    { kind: JobsiteInvoiceKind; jobsiteMaterial?: JobsiteMaterialDocument }
  >();
  for (const id of jobsite.expenseInvoices ?? []) {
    if (id) taggedIds.set(id.toString(), { kind: JobsiteInvoiceKind.Subcontractor });
  }
  for (const id of jobsite.revenueInvoices ?? []) {
    if (id) taggedIds.set(id.toString(), { kind: JobsiteInvoiceKind.Revenue });
  }

  // The relation is Jobsite → materials[] (JobsiteMaterial has no
  // jobsite back-ref), so we look up by the ids stored on the jobsite.
  const jobsiteMaterials = await JobsiteMaterial.find({
    _id: { $in: jobsite.materials ?? [] },
  });
  for (const jm of jobsiteMaterials) {
    for (const id of jm.invoices ?? []) {
      if (!id) continue;
      taggedIds.set(id.toString(), {
        kind: JobsiteInvoiceKind.Material,
        jobsiteMaterial: jm,
      });
    }
  }

  if (taggedIds.size === 0) return [];

  // Resolve company name matches first — invoice schema only carries a
  // ref, so matching "Acme" needs the company lookup up front.
  const pattern = new RegExp(escapeRegex(trimmed), "i");
  const matchedCompanies = await Company.find(
    { name: pattern },
    { _id: 1 }
  ).lean();
  const matchedCompanyIds = matchedCompanies.map(
    (c) => c._id as mongoose.Types.ObjectId
  );

  const invoiceIds = Array.from(taggedIds.keys()).map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  const hits: InvoiceDocument[] = await Invoice.find({
    _id: { $in: invoiceIds },
    $or: [
      { invoiceNumber: pattern },
      { description: pattern },
      ...(matchedCompanyIds.length > 0
        ? [{ company: { $in: matchedCompanyIds } }]
        : []),
    ],
  })
    .sort({ date: -1 })
    .limit(SEARCH_LIMIT);

  return hits.map((invoice) => {
    const tag = taggedIds.get(invoice._id.toString());
    return {
      kind: tag?.kind ?? JobsiteInvoiceKind.Subcontractor,
      invoice: invoice as unknown as InvoiceClass,
      jobsiteMaterial:
        (tag?.jobsiteMaterial as unknown as JobsiteMaterialClass) ?? null,
    };
  });
};
