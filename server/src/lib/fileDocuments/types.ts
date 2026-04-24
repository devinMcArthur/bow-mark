import { Types } from "mongoose";

/**
 * Normalised document shape returned by the adapter layer. Callers
 * (chat routers, MCP tools, pricing validation) consume this instead
 * of touching the raw EnrichedFile or Document models directly.
 */
export interface ResolvedDocument {
  documentId: Types.ObjectId;     // Document._id (which equals old EnrichedFile._id)
  fileId: Types.ObjectId;
  mimetype: string;
  originalFilename: string;
  size?: number;
  enrichmentStatus?: "pending" | "processing" | "ready" | "partial" | "failed" | "orphaned";
  enrichmentSummary?: unknown;
  enrichmentPageIndex?: Array<{ page: number; summary: string }>;
  /**
   * Folder path relative to the surface scope's root, e.g. "/Specs" for a
   * file under `/tenders/<id>/Specs/foo.pdf`, or "/" for a file at the
   * scope root. Only populated for new-shape documents (FileNode-backed);
   * legacy enrichedfiles don't have folder structure so this stays "/".
   */
  folderPath: string;
  source: "legacy-enrichedfile" | "new-document";
}

export interface ResolveContext {
  scope: "tender" | "jobsite" | "system" | "daily-report";
  entityId?: Types.ObjectId;   // not needed for "system"
  /** When provided on jobsite scope, filters by placement/entry minRole <= userRole */
  userRole?: number;
}
