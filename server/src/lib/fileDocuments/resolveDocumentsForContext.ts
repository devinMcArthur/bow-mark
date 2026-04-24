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
import { UserRoles } from "@typescript/user";
import type { ResolveContext, ResolvedDocument } from "./types";

// Normalize any role value (number or string form) to its numeric weight so
// legacy string-valued role data can't produce NaN in comparisons.
function roleWeight(role: unknown): number {
  if (typeof role === "number" && Number.isFinite(role)) return role;
  if (typeof role === "string") {
    const weight = (UserRoles as unknown as Record<string, number>)[role];
    if (typeof weight === "number") return weight;
  }
  return 0;
}

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

  // Walk all descendants via $graphLookup. We pull folders AND files (no
  // type filter) so we can rebuild each file's path relative to the scoped
  // root by walking parentId up the tree.
  const allDescendants = await FileNode.aggregate([
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
    { $match: { deletedAt: null } },
  ]);

  if (allDescendants.length === 0) return [];

  // Build a parent-lookup map for path reconstruction. Include the scoped
  // root so files at the top level resolve to "/". We intentionally don't
  // emit the scoped root's own name in the path (callers know they're
  // scoped to a tender/jobsite — its name is just an ObjectId anyway).
  const nodeById = new Map<string, { parentId?: string; name: string }>();
  for (const n of allDescendants) {
    nodeById.set(n._id.toString(), {
      parentId: n.parentId ? n.parentId.toString() : undefined,
      name: n.name,
    });
  }

  const scopedRootIdStr = scopedRootId.toString();
  function folderPathFor(fileNode: { parentId?: Types.ObjectId }): string {
    if (!fileNode.parentId) return "/";
    const segments: string[] = [];
    let currentId: string | undefined = fileNode.parentId.toString();
    // Walk up until we hit the scoped root; accumulate folder names.
    while (currentId && currentId !== scopedRootIdStr) {
      const entry = nodeById.get(currentId);
      if (!entry) break; // safety: detached node, shouldn't happen
      segments.unshift(entry.name);
      currentId = entry.parentId;
    }
    return segments.length === 0 ? "/" : `/${segments.join("/")}`;
  }

  const descendants = allDescendants.filter(
    (n) => n.type === "file" && n.documentId
  );

  // Role-based filtering: keep only nodes where minRole is unset (public)
  // or minRole <= userRole. Applied across all surface scopes (tender,
  // jobsite, system) whenever userRole is known. When userRole is
  // undefined (internal callers that don't care about access control,
  // e.g. summary generators running under system context), everything
  // passes through. Both sides normalized to numeric weights.
  const filteredDescendants =
    ctx.userRole !== undefined
      ? (() => {
          const viewerWeight = roleWeight(ctx.userRole);
          return descendants.filter(
            (n) => n.minRole == null || roleWeight(n.minRole) <= viewerWeight
          );
        })()
      : descendants;

  if (filteredDescendants.length === 0) return [];

  const docIds = filteredDescendants.map((n) => n.documentId as Types.ObjectId);
  const [documents, enrichments] = await Promise.all([
    DocumentModel.find({ _id: { $in: docIds } }).lean(),
    Enrichment.find({ documentId: { $in: docIds } }).lean(),
  ]);
  const fileIds = documents.map((d) => d.currentFileId!);
  const files = await File.find({ _id: { $in: fileIds } }).lean();
  const fileMap = new Map(files.map((f) => [f._id.toString(), f]));
  const enrichMap = new Map(enrichments.map((e) => [e.documentId!.toString(), e]));

  // Index the filtered descendants by documentId for quick folderPath lookup.
  const nodeByDocId = new Map<string, (typeof filteredDescendants)[number]>();
  for (const n of filteredDescendants) {
    nodeByDocId.set(n.documentId.toString(), n);
  }

  return documents.map((d) => {
    const f = fileMap.get((d.currentFileId as Types.ObjectId).toString());
    const e = enrichMap.get(d._id.toString());
    const node = nodeByDocId.get(d._id.toString());
    return {
      documentId: d._id,
      fileId: d.currentFileId as Types.ObjectId,
      mimetype: f?.mimetype ?? "application/octet-stream",
      originalFilename: f?.originalFilename ?? "",
      size: f?.size,
      enrichmentStatus: e?.status,
      enrichmentSummary: e?.summary,
      enrichmentPageIndex: e?.pageIndex as Array<{ page: number; summary: string }> | undefined,
      folderPath: node ? folderPathFor(node) : "/",
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
    const allEntries = ((jobsite as any)?.enrichedFiles as any[]) ?? [];
    // Apply role-based filtering: keep entries where minRole <= userRole.
    // Default minRole to ProjectManager when not set (matches existing convention).
    const allowedEntries =
      ctx.userRole !== undefined
        ? allEntries.filter(
            (entry: any) =>
              (entry.minRole ?? UserRoles.ProjectManager) <= ctx.userRole!
          )
        : allEntries;
    enrichedFileIds = allowedEntries.map((j: any) => j.enrichedFile as Types.ObjectId);
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
    folderPath: "/",
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
