import mongoose from "mongoose";
import { FileNode } from "@models";
import { UserRoles } from "@typescript/user";
import { createEntityRoot } from "./createEntityRoot";
import { normalizeNodeName } from "./reservedRoots";

export type InvoiceFolderKind = "subcontractor" | "revenue" | "material";

const LABEL: Record<InvoiceFolderKind, string> = {
  subcontractor: "Subcontractor",
  revenue: "Revenue",
  material: "MaterialInvoices",
};

const SORT_KEY: Record<InvoiceFolderKind, string> = {
  subcontractor: "0100",
  revenue: "0200",
  material: "0300",
};

/**
 * Idempotently provisions the folder chain
 *   `/jobsites/<jobsiteId>/Invoices/<Subcontractor|Revenue>/`
 * and returns the leaf folder's id. Each intermediate folder is marked
 * `systemManaged: true` so the FileBrowser blocks user-initiated rename,
 * move, or trash on any of them — the structure belongs to the app, not
 * the user.
 *
 * Lazy: the jobsite's entity root (and both `Invoices/` + type subfolder)
 * are only created the first time an invoice file gets uploaded. Jobsites
 * without any invoice attachments never accumulate these folders.
 */
export async function ensureInvoiceFolder(
  jobsiteId: mongoose.Types.ObjectId | string,
  kind: InvoiceFolderKind
): Promise<mongoose.Types.ObjectId> {
  const jobsiteOid =
    typeof jobsiteId === "string"
      ? new mongoose.Types.ObjectId(jobsiteId)
      : jobsiteId;

  // 1. Entity root for this jobsite.
  await createEntityRoot({ namespace: "/jobsites", entityId: jobsiteOid });
  const jobsitesNs = await FileNode.findOne({
    name: "jobsites",
    isReservedRoot: true,
    parentId: { $ne: null },
  }).lean();
  if (!jobsitesNs) {
    throw new Error("ensureInvoiceFolder: jobsites namespace missing");
  }
  const entityRoot = await FileNode.findOne({
    parentId: jobsitesNs._id,
    name: jobsiteOid.toString(),
    isReservedRoot: true,
  }).lean();
  if (!entityRoot) {
    throw new Error("ensureInvoiceFolder: entity root missing after ensure");
  }

  // 2. `Invoices/` group folder. systemManaged so users can't rename/
  //    move/trash it; sortKey puts it near the top of the entity root.
  //    minRole = ProjectManager so foremen browsing the jobsite's file
  //    tree don't see invoice financials at all. FileNodeChildren filters
  //    nodes by viewer role, so this hides the folder outright.
  const invoicesFolderId = await upsertSystemFolder(
    entityRoot._id,
    "Invoices",
    "0100",
    UserRoles.ProjectManager
  );

  // 3. Kind-specific subfolder (Subcontractor / Revenue / MaterialInvoices).
  //    Same lock + minRole treatment. All material-invoice files land in
  //    a single shared folder, not nested per material.
  const leafId = await upsertSystemFolder(
    invoicesFolderId,
    LABEL[kind],
    SORT_KEY[kind],
    UserRoles.ProjectManager
  );

  return leafId;
}

async function upsertSystemFolder(
  parentId: mongoose.Types.ObjectId,
  name: string,
  sortKey: string,
  minRole?: UserRoles
): Promise<mongoose.Types.ObjectId> {
  const normalized = normalizeNodeName(name);
  // minRole goes through $set (not $setOnInsert) so it both applies on
  // insert AND retroactively gates existing folders that pre-date the
  // minRole plumbing. Mongo rejects the same field appearing in both
  // operators, so we keep it in exactly one.
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (minRole != null) set.minRole = minRole;
  await FileNode.updateOne(
    { parentId, normalizedName: normalized, type: "folder" },
    {
      $setOnInsert: {
        type: "folder",
        name,
        normalizedName: normalized,
        parentId,
        systemManaged: true,
        sortKey,
        isReservedRoot: false,
        version: 0,
        createdAt: new Date(),
      },
      $set: set,
    },
    { upsert: true }
  );
  const node = await FileNode.findOne({
    parentId,
    normalizedName: normalized,
    type: "folder",
  }).lean();
  if (!node) {
    throw new Error(
      `ensureInvoiceFolder: could not locate just-upserted folder '${name}'`
    );
  }
  return node._id;
}
