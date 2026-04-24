import { Resolver, Query, Arg, Ctx, ID, FieldResolver, Root } from "type-graphql";
import mongoose from "mongoose";
import {
  FileNode,
  File as FileModel,
  Document as DocumentModel,
  Enrichment,
  User,
} from "@models";
import { UserRoles } from "@typescript/user";
import { IContext } from "@typescript/graphql";
import { FileNodeSchema } from "../../../models/FileNode/schema";
import { EnrichmentSchema } from "../../../models/Enrichment/schema";

/**
 * Normalize any role value — number (1–4), string ("User", "Admin", …), or
 * nullish — into its numeric weight. Makes comparisons robust to whichever
 * form lands in the DB or request context (legacy rows sometimes carry the
 * string form). Unknown values collapse to 0 (the public/no-access baseline).
 */
export function roleWeight(role: unknown): number {
  if (typeof role === "number" && Number.isFinite(role)) return role;
  if (typeof role === "string") {
    const weight = (UserRoles as unknown as Record<string, number>)[role];
    if (typeof weight === "number") return weight;
  }
  return 0;
}

/**
 * Pull the viewer's role weight from the GraphQL context's `user`. We use
 * this instead of the ALS-backed RequestContext because the ALS frame is
 * not guaranteed to propagate through every edge of Apollo's resolver
 * pipeline, which had been causing authenticated users' file lists to be
 * filtered as if they were anonymous.
 */
function viewerRoleWeightFromCtx(ctx: IContext): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (ctx.user as any)?.role as unknown;
  return roleWeight(role);
}

/**
 * True if the viewer can see a node based on its minRole. Unset minRole is
 * treated as public (everyone). If minRole is set, the viewer must have
 * role >= minRole. Both sides normalized to numeric weights so legacy
 * string-valued role data can't produce NaN comparisons.
 */
function canSeeNode(
  node: { minRole?: unknown },
  viewerWeight: number
): boolean {
  if (node.minRole == null) return true;
  return viewerWeight >= roleWeight(node.minRole);
}

// In-request memoization for user-name lookups. Field resolvers fire once
// per row; with 50 rows each with createdBy + deletedBy + uploadedBy that's
// 150 User lookups. Cache by id within a request to collapse down to N
// distinct users. Async-safe because each request is its own async frame.
async function resolveUserName(
  id: mongoose.Types.ObjectId | string | null | undefined
): Promise<string | null> {
  if (!id) return null;
  const u = await User.findById(id).select("name").lean();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((u as any)?.name as string | undefined) ?? null;
}

@Resolver(() => FileNodeSchema)
export default class FileNodeResolver {
  /**
   * Resolve the mimetype of the File behind this node's Document, if any.
   * Walks: FileNode.documentId → Document.currentFileId → File.mimetype.
   * Returns null for folders or nodes whose Document/File can't be resolved.
   */
  @FieldResolver(() => String, { nullable: true })
  async mimetype(@Root() node: FileNodeSchema): Promise<string | null> {
    if (node.type !== "file" || !node.documentId) return null;
    const doc = await DocumentModel.findById(node.documentId).lean();
    if (!doc || !doc.currentFileId) return null;
    const file = await FileModel.findById(doc.currentFileId).lean();
    return file?.mimetype ?? null;
  }

  /** Display name of the user who created this FileNode. */
  @FieldResolver(() => String, { nullable: true })
  async createdByName(@Root() node: FileNodeSchema): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resolveUserName((node as any).createdBy);
  }

  /** Display name of the user who trashed this FileNode (null if live). */
  @FieldResolver(() => String, { nullable: true })
  async deletedByName(@Root() node: FileNodeSchema): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resolveUserName((node as any).deletedBy);
  }

  /**
   * Display name of the user who uploaded the File behind this node's
   * Document. Null for folders or if the File has no uploadedBy stamp.
   */
  @FieldResolver(() => String, { nullable: true })
  async uploadedByName(@Root() node: FileNodeSchema): Promise<string | null> {
    if (node.type !== "file" || !node.documentId) return null;
    const doc = await DocumentModel.findById(node.documentId).lean();
    if (!doc || !doc.currentFileId) return null;
    const file = await FileModel.findById(doc.currentFileId).lean();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resolveUserName((file as any)?.uploadedBy);
  }

  /**
   * Full Enrichment record for the Document behind this node, if any.
   * Returns null for folders and for files in non-enrichable namespaces
   * (e.g. /daily-reports/) where no Enrichment was ever created.
   */
  @FieldResolver(() => EnrichmentSchema, { nullable: true })
  async enrichment(@Root() node: FileNodeSchema): Promise<EnrichmentSchema | null> {
    if (node.type !== "file" || !node.documentId) return null;
    const enr = await Enrichment.findOne({ documentId: node.documentId }).lean();
    return (enr as unknown as EnrichmentSchema | null) ?? null;
  }

  @Query(() => FileNodeSchema, { nullable: true })
  async fileNodeRoot(): Promise<FileNodeSchema | null> {
    const root = await FileNode.findOne({ parentId: null, name: "/" }).lean();
    return (root as FileNodeSchema | null) ?? null;
  }

  /**
   * Resolve the global spec library root at `/system/specs`. System has
   * no per-entity variant like tender/jobsite, so this is a zero-arg
   * query returning the single shared FileNode under which all reference
   * specification documents live.
   */
  @Query(() => FileNodeSchema, { nullable: true })
  async systemSpecsRoot(): Promise<FileNodeSchema | null> {
    const systemNs = await FileNode.findOne({
      name: "system",
      isReservedRoot: true,
      parentId: { $ne: null },
    }).lean();
    if (!systemNs) return null;
    const specs = await FileNode.findOne({
      parentId: systemNs._id,
      name: "specs",
      isReservedRoot: true,
    }).lean();
    return (specs as FileNodeSchema | null) ?? null;
  }

  /**
   * Resolve the per-entity reserved root for a surface scope —
   * e.g. `/tenders/<tenderId>/` or `/jobsites/<jobsiteId>/`. Callers
   * (tender / jobsite pages) use this to hand the FileBrowser component
   * a surface-scoped rootId. Returns null if the namespace isn't
   * bootstrapped or the entity doesn't yet have a root (pre-migration
   * entities, very rare).
   */
  @Query(() => FileNodeSchema, { nullable: true })
  async entityRoot(
    @Arg("namespace") namespace: string,
    @Arg("entityId", () => ID) entityId: string
  ): Promise<FileNodeSchema | null> {
    if (!mongoose.isValidObjectId(entityId)) return null;
    // Namespace name comes in as "tenders" / "jobsites" / "daily-reports".
    // We don't accept the path-style "/tenders" to keep the arg tidy.
    const ns = await FileNode.findOne({
      name: namespace,
      isReservedRoot: true,
      parentId: { $ne: null },
    }).lean();
    if (!ns) return null;
    const root = await FileNode.findOne({
      parentId: ns._id,
      name: entityId,
      isReservedRoot: true,
    }).lean();
    return (root as FileNodeSchema | null) ?? null;
  }

  @Query(() => FileNodeSchema, { nullable: true })
  async fileNode(
    @Arg("id", () => ID) id: string,
    @Ctx() ctx: IContext
  ): Promise<FileNodeSchema | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const node = await FileNode.findOne({ _id: id, deletedAt: null }).lean();
    if (!node) return null;
    const viewerWeight = viewerRoleWeightFromCtx(ctx);
    return canSeeNode(node as FileNodeSchema, viewerWeight)
      ? (node as FileNodeSchema)
      : null;
  }

  @Query(() => [FileNodeSchema])
  async fileNodeChildren(
    @Arg("parentId", () => ID) parentId: string,
    @Ctx() ctx: IContext,
    @Arg("includeTrashed", { nullable: true }) includeTrashed?: boolean
  ): Promise<FileNodeSchema[]> {
    if (!mongoose.isValidObjectId(parentId)) return [];
    const filter: Record<string, unknown> = {
      parentId: new mongoose.Types.ObjectId(parentId),
    };
    if (!includeTrashed) filter.deletedAt = null;
    const children = await FileNode.find(filter)
      .sort({ sortKey: 1, name: 1 })
      .lean();
    const viewerWeight = viewerRoleWeightFromCtx(ctx);
    return (children as FileNodeSchema[]).filter((n) =>
      canSeeNode(n, viewerWeight)
    );
  }

  @Query(() => [FileNodeSchema])
  async fileNodeBreadcrumbs(
    @Arg("id", () => ID) id: string
  ): Promise<FileNodeSchema[]> {
    if (!mongoose.isValidObjectId(id)) return [];

    // Walk upward via $graphLookup starting at the target, connecting parentId.
    const result = await FileNode.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $graphLookup: {
          from: "filenodes",
          startWith: "$parentId",
          connectFromField: "parentId",
          connectToField: "_id",
          as: "ancestors",
          depthField: "depth",
        },
      },
    ]);

    if (result.length === 0) return [];
    const self = result[0];
    const ancestors = (self.ancestors ?? []) as Array<
      FileNodeSchema & { depth: number }
    >;
    // ancestors[] from $graphLookup are unordered; sort by depth DESCENDING so
    // higher depth numbers (closer to root) come first.
    ancestors.sort((a, b) => b.depth - a.depth);
    const selfNoAncestors: FileNodeSchema = { ...self };
    // Strip the ancestors field so the returned `self` node matches the schema.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (selfNoAncestors as any).ancestors;
    return [
      ...ancestors.map((a) => {
        const { depth: _depth, ...rest } = a;
        return rest as FileNodeSchema;
      }),
      selfNoAncestors,
    ];
  }
}
