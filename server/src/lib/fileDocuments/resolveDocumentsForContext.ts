import { Types } from "mongoose";
import {
  EnrichedFile,
  File,
  Tender,
  Jobsite,
  System,
  FileNode,
  Document as DocumentModel,
  Enrichment,
} from "@models";
import type { ResolveContext, ResolvedDocument } from "./types";

/**
 * Resolve documents for a given surface scope, transparently reading from
 * the new FileNode tree if present and falling back to the legacy
 * parent-entity arrays. Callers get a normalised shape.
 */
export async function resolveDocumentsForContext(
  ctx: ResolveContext
): Promise<ResolvedDocument[]> {
  const newShape = await readNewShape(ctx);
  if (newShape.length > 0) return newShape;
  return readOldShape(ctx);
}

async function readNewShape(ctx: ResolveContext): Promise<ResolvedDocument[]> {
  const nsName = nsNameForScope(ctx.scope);
  if (!nsName) return [];

  // Find the namespace reserved root (e.g. /tenders, /system).
  const nsRoot = await FileNode.findOne({
    name: nsName,
    isReservedRoot: true,
  }).lean();
  if (!nsRoot) return [];

  // Resolve the scoped root (per-entity for tender/jobsite/daily-report;
  // per-specs for system).
  let scopedRootId: Types.ObjectId = nsRoot._id;
  if (ctx.entityId && ctx.scope !== "system") {
    const entityRoot = await FileNode.findOne({
      parentId: nsRoot._id,
      name: ctx.entityId.toString(),
    }).lean();
    if (!entityRoot) return [];
    scopedRootId = entityRoot._id;
  } else if (ctx.scope === "system") {
    const specs = await FileNode.findOne({
      parentId: nsRoot._id,
      name: "specs",
    }).lean();
    if (!specs) return [];
    scopedRootId = specs._id;
  }

  // Walk all descendants via $graphLookup; keep only file-type non-deleted nodes.
  const descendants = await FileNode.aggregate([
    { $match: { _id: scopedRootId } },
    {
      $graphLookup: {
        from: "filenodes",
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "parentId",
        as: "descendants",
      },
    },
    { $unwind: "$descendants" },
    { $replaceRoot: { newRoot: "$descendants" } },
    { $match: { type: "file", deletedAt: null, documentId: { $exists: true } } },
  ]);

  if (descendants.length === 0) return [];

  const docIds = descendants.map((n) => n.documentId as Types.ObjectId);
  const [documents, enrichments] = await Promise.all([
    DocumentModel.find({ _id: { $in: docIds } }).lean(),
    Enrichment.find({ documentId: { $in: docIds } }).lean(),
  ]);
  const fileIds = documents.map((d) => d.currentFileId!);
  const files = await File.find({ _id: { $in: fileIds } }).lean();
  const fileMap = new Map(files.map((f) => [f._id.toString(), f]));
  const enrichMap = new Map(enrichments.map((e) => [e.documentId!.toString(), e]));

  return documents.map((d) => {
    const f = fileMap.get((d.currentFileId as Types.ObjectId).toString());
    const e = enrichMap.get(d._id.toString());
    return {
      documentId: d._id,
      fileId: d.currentFileId as Types.ObjectId,
      mimetype: f?.mimetype ?? "application/octet-stream",
      originalFilename: f?.originalFilename ?? "",
      size: f?.size,
      enrichmentStatus: e?.status,
      enrichmentSummary: e?.summary,
      enrichmentPageIndex: e?.pageIndex as Array<{ page: number; summary: string }> | undefined,
      source: "new-document" as const,
    };
  });
}

async function readOldShape(ctx: ResolveContext): Promise<ResolvedDocument[]> {
  let enrichedFileIds: Types.ObjectId[] = [];

  if (ctx.scope === "tender" && ctx.entityId) {
    const tender = await Tender.findById(ctx.entityId).select("files").lean();
    enrichedFileIds = ((tender as any)?.files as Types.ObjectId[]) ?? [];
  } else if (ctx.scope === "jobsite" && ctx.entityId) {
    const jobsite = await Jobsite.findById(ctx.entityId).select("enrichedFiles").lean();
    enrichedFileIds = (((jobsite as any)?.enrichedFiles as any[]) ?? []).map(
      (j) => j.enrichedFile as Types.ObjectId
    );
  } else if (ctx.scope === "system") {
    const system = await System.getSystem();
    enrichedFileIds = ((system as any)?.specFiles as Types.ObjectId[]) ?? [];
  }

  if (enrichedFileIds.length === 0) return [];

  const enrichedFiles = await EnrichedFile.find({
    _id: { $in: enrichedFileIds },
  })
    .populate("file")
    .lean();

  return enrichedFiles.map((ef: any) => ({
    documentId: ef._id,
    fileId: ef.file?._id ?? ef.file,
    mimetype: ef.file?.mimetype ?? "application/octet-stream",
    originalFilename: ef.file?.originalFilename ?? ef.file?.description ?? "",
    size: ef.file?.size,
    enrichmentStatus: ef.summaryStatus,
    enrichmentSummary: ef.summary,
    enrichmentPageIndex: ef.pageIndex,
    source: "legacy-enrichedfile" as const,
  }));
}

function nsNameForScope(scope: ResolveContext["scope"]): string | null {
  switch (scope) {
    case "tender":
      return "tenders";
    case "jobsite":
      return "jobsites";
    case "system":
      return "system";
    case "daily-report":
      return "daily-reports";
    default:
      return null;
  }
}
