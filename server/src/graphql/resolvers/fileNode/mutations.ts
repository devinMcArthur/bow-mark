import { Authorized, Resolver, Mutation, Arg, ID, Int } from "type-graphql";
import mongoose from "mongoose";
import { FileNode, Enrichment } from "@models";
import { UserRoles } from "@typescript/user";
import { shouldEnrichNow } from "@lib/enrichmentPolicy";
import { FileNodeSchema } from "../../../models/FileNode/schema";
import {
  normalizeNodeName,
  RESERVED_NAMESPACE_PATHS,
} from "@lib/fileTree/reservedRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import {
  ensureInvoiceFolder,
  InvoiceFolderKind,
} from "@lib/fileTree/ensureInvoiceFolder";
import { eventfulMutation } from "@lib/eventfulMutation";
import type { DomainEventInput } from "@lib/eventfulMutation";
import { getRequestContext } from "@lib/requestContext";
import { findOneAndUpdateVersioned } from "@lib/entityVersion";
import { moveNodeCore, reevaluateEnrichmentAfterMove } from "../../../models/FileNode/class/move";
import { publishEnrichedFileCreated } from "../../../rabbitmq/publisher";

function assertNonEmptyName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Name cannot be empty");
  // Reject characters that break path semantics or are hostile to most
  // filesystems / downstream tooling. The forward-slash especially — we
  // use it as a path separator in reservedRoots, so allowing it in a
  // name would create ambiguous cases. Length cap guards against absurd
  // inputs that would also break some filesystems (ext4 is 255 bytes).
  if (/[/\\\x00-\x1f]/.test(trimmed)) {
    throw new Error(
      "Name cannot contain slashes, backslashes, or control characters"
    );
  }
  if (trimmed.length > 240) {
    throw new Error("Name is too long (max 240 characters)");
  }
  return trimmed;
}

/**
 * Resolve the current actor's ObjectId from the ambient request context.
 * Returns undefined for unauthenticated paths so callers can leave
 * created_by / deleted_by unset rather than crashing.
 */
function getCtxActorId(): mongoose.Types.ObjectId | undefined {
  const ctx = getRequestContext();
  return ctx?.userId ? new mongoose.Types.ObjectId(ctx.userId) : undefined;
}

/**
 * Build a FileNode DomainEvent scoped to a parent folder.
 *
 * Design note: entityId on FileNode events is the PARENT folder's _id (not
 * the changed child). Clients viewing a folder subscribe to events for
 * `{ entityType: "FileNode", entityId: <folder> }` — any add/rename/trash/
 * restore/move-in/move-out lands on that subscription so the client can
 * refetch just the current folder's children.
 *
 * metadata carries the affected child's info so clients can render optimistic
 * UI hints (e.g. "Alice renamed foo.pdf") without re-querying.
 */
function fileNodeEvent(
  type: string,
  parentId: mongoose.Types.ObjectId,
  metadata: Record<string, unknown>
): DomainEventInput {
  return {
    type,
    actorKind: "user",
    entityType: "FileNode",
    entityId: parentId,
    toVersion: 1,
    diff: { forward: [], inverse: [] },
    metadata,
  };
}

@Resolver()
export default class FileNodeMutationResolver {
  /**
   * Idempotently provision a per-entity reserved root under a namespace
   * (e.g. `/jobsites/<id>/`). Returns the root FileNode — the same shape
   * the `entityRoot` query returns when the root already exists.
   *
   * Called lazily by client surfaces right before the first file goes in,
   * so entities with no attached files never accumulate empty folders.
   * Safe to call repeatedly — `createEntityRoot` is a get-or-create.
   */
  @Authorized()
  @Mutation(() => FileNodeSchema)
  async ensureEntityRoot(
    @Arg("namespace") namespace: string,
    @Arg("entityId", () => ID) entityId: string
  ): Promise<FileNodeSchema> {
    if (!mongoose.isValidObjectId(entityId)) {
      throw new Error("Invalid entityId");
    }
    // Accept either "jobsites" or "/jobsites" — the query-layer `entityRoot`
    // uses the bare form, `createEntityRoot` internally uses the slashed
    // form. Normalize here.
    const normalized = namespace.startsWith("/") ? namespace : `/${namespace}`;
    if (
      !(RESERVED_NAMESPACE_PATHS as readonly string[]).includes(normalized)
    ) {
      throw new Error(`Unknown namespace: ${namespace}`);
    }
    const entityOid = new mongoose.Types.ObjectId(entityId);

    await createEntityRoot({
      namespace: normalized as (typeof RESERVED_NAMESPACE_PATHS)[number],
      entityId: entityOid,
    });

    // Re-resolve under the namespace so we return the canonical node. The
    // bare namespace folder isn't necessarily the direct ancestor of every
    // entity root, but within reserved paths it's always one level deep.
    const nsName = normalized.slice(1); // "/jobsites" -> "jobsites"
    const ns = await FileNode.findOne({
      name: nsName,
      isReservedRoot: true,
      parentId: { $ne: null },
    }).lean();
    if (!ns) throw new Error("Namespace folder missing after ensure");
    const root = await FileNode.findOne({
      parentId: ns._id,
      name: entityOid.toString(),
      isReservedRoot: true,
    }).lean();
    if (!root) throw new Error("Entity root missing after ensure");
    return root as unknown as FileNodeSchema;
  }

  /**
   * Idempotently provision `/jobsites/<id>/Invoices/<Subcontractor|Revenue>/`
   * (including the jobsite's entity root if missing). Returns the leaf
   * folder id, which the client then passes as `parentFileNodeId` on
   * `uploadDocument` for the invoice file. The intermediate `Invoices`
   * and type folders are `systemManaged: true`, so users can't
   * rename/move/trash them out from under the invoice record.
   */
  @Authorized()
  @Mutation(() => FileNodeSchema)
  async ensureInvoiceFolder(
    @Arg("jobsiteId", () => ID) jobsiteId: string,
    @Arg("kind") kind: string
  ): Promise<FileNodeSchema> {
    if (!mongoose.isValidObjectId(jobsiteId)) {
      throw new Error("Invalid jobsiteId");
    }
    if (kind !== "subcontractor" && kind !== "revenue" && kind !== "material") {
      throw new Error(
        `Unknown invoice folder kind: ${kind} (expected "subcontractor", "revenue", or "material")`
      );
    }
    const leafId = await ensureInvoiceFolder(
      jobsiteId,
      kind as InvoiceFolderKind
    );
    const node = await FileNode.findById(leafId).lean();
    if (!node) throw new Error("Invoice folder missing after ensure");
    return node as unknown as FileNodeSchema;
  }

  /**
   * Idempotently ensure a chain of folders exists from `rootId` down.
   * Walks the segments in order; at each step, finds the existing child
   * by normalizedName or creates it. Safe to call repeatedly with the
   * same path — returns the same leaf FileNode. Used by client-side
   * folder upload to materialize the directory structure before placing
   * files.
   *
   * Emits one fileNode.created event per folder actually created (not
   * per existing one).
   */
  @Authorized()
  @Mutation(() => FileNodeSchema)
  async ensureFolderPath(
    @Arg("rootId", () => ID) rootId: string,
    @Arg("segments", () => [String]) segments: string[]
  ): Promise<FileNodeSchema> {
    if (!mongoose.isValidObjectId(rootId)) throw new Error("Invalid rootId");
    const root = await FileNode.findById(rootId).lean();
    if (!root) throw new Error("Root folder not found");
    if (root.deletedAt) throw new Error("Root folder is trashed");
    if (root.type !== "folder") throw new Error("Root must be a folder");

    const cleanSegments = segments
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (cleanSegments.length === 0) {
      // No-op — return the root itself.
      return root as unknown as FileNodeSchema;
    }

    const createdBy = getCtxActorId();
    return eventfulMutation(async (session) => {
      let currentParent: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(
        rootId
      );
      let currentNode: FileNodeSchema | null = null;
      const createdEvents: DomainEventInput[] = [];

      for (const segment of cleanSegments) {
        const normalized = normalizeNodeName(segment);
        // eslint-disable-next-line no-await-in-loop
        let existing = await FileNode.findOne({
          parentId: currentParent,
          normalizedName: normalized,
          deletedAt: null,
        })
          .session(session)
          .lean();

        if (!existing) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const created = await FileNode.create(
              [
                {
                  type: "folder",
                  name: segment,
                  normalizedName: normalized,
                  parentId: currentParent,
                  systemManaged: false,
                  sortKey: "5000",
                  isReservedRoot: false,
                  version: 0,
                  ...(createdBy ? { createdBy } : {}),
                },
              ],
              { session }
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            existing = (created as any)[0];
            createdEvents.push(
              fileNodeEvent("fileNode.created", currentParent, {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                childId: ((existing as any)._id as mongoose.Types.ObjectId).toString(),
                name: segment,
                childType: "folder",
              })
            );
          } catch (err) {
            // Race: another caller created the same folder between our
            // findOne and create. Re-query to pick up theirs.
            if (
              typeof err === "object" &&
              err !== null &&
              (err as { code?: number }).code === 11000
            ) {
              // eslint-disable-next-line no-await-in-loop
              existing = await FileNode.findOne({
                parentId: currentParent,
                normalizedName: normalized,
                deletedAt: null,
              })
                .session(session)
                .lean();
              if (!existing)
                throw new Error(
                  "Unique constraint fired but existing folder not found — inconsistent state"
                );
            } else {
              throw err;
            }
          }
        }

        if (existing!.type !== "folder") {
          throw new Error(
            `Path segment "${segment}" exists but is a file, not a folder`
          );
        }
        currentNode = existing as unknown as FileNodeSchema;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentParent = (existing as any)._id as mongoose.Types.ObjectId;
      }

      return {
        result: currentNode as FileNodeSchema,
        // If nothing was created, no event to emit (idempotent no-op).
        event: createdEvents[0] ?? null,
        cascade: createdEvents.slice(1),
      };
    });
  }

  @Authorized()
  @Mutation(() => FileNodeSchema)
  async createFolder(
    @Arg("parentId", () => ID) parentId: string,
    @Arg("name") nameRaw: string
  ): Promise<FileNodeSchema> {
    if (!mongoose.isValidObjectId(parentId)) throw new Error("Invalid parentId");
    const parent = await FileNode.findById(parentId).lean();
    if (!parent) throw new Error("Parent folder not found");
    if (parent.deletedAt) throw new Error("Parent folder is trashed");
    if (parent.parentId == null && parent.name === "/")
      throw new Error("Cannot create folders at the filesystem root");
    const name = assertNonEmptyName(nameRaw);

    const parentObjectId = new mongoose.Types.ObjectId(parentId);
    const createdBy = getCtxActorId();
    return eventfulMutation(async (session) => {
      try {
        const created = await FileNode.create(
          [
            {
              type: "folder",
              name,
              normalizedName: normalizeNodeName(name),
              parentId: parentObjectId,
              systemManaged: false,
              sortKey: "5000",
              isReservedRoot: false,
              version: 0,
              ...(createdBy ? { createdBy } : {}),
            },
          ],
          { session }
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const child = (created as any)[0] as FileNodeSchema;
        return {
          result: child,
          event: fileNodeEvent("fileNode.created", parentObjectId, {
            childId: (child._id as mongoose.Types.ObjectId).toString(),
            name: child.name,
            childType: "folder",
          }),
        };
      } catch (err: unknown) {
        if (
          typeof err === "object" &&
          err !== null &&
          (err as { code?: number }).code === 11000
        ) {
          throw new Error("A node with this name already exists in this folder");
        }
        throw err;
      }
    });
  }

  @Authorized()
  @Mutation(() => FileNodeSchema)
  async renameNode(
    @Arg("id", () => ID) id: string,
    @Arg("expectedVersion", () => Int) expectedVersion: number,
    @Arg("name") nameRaw: string
  ): Promise<FileNodeSchema> {
    if (!mongoose.isValidObjectId(id)) throw new Error("Invalid id");
    const node = await FileNode.findById(id).lean();
    if (!node) throw new Error("Node not found");
    if (node.isReservedRoot) throw new Error("Cannot rename a reserved-root node");
    if (node.systemManaged)
      throw new Error("Cannot rename a system-managed folder");
    if (node.deletedAt) throw new Error("Cannot rename a trashed node");
    const name = assertNonEmptyName(nameRaw);

    return eventfulMutation(async (session) => {
      try {
        const updated = await findOneAndUpdateVersioned(
          FileNode,
          { _id: new mongoose.Types.ObjectId(id) },
          {
            $set: {
              name,
              normalizedName: normalizeNodeName(name),
              updatedAt: new Date(),
            },
          },
          { expectedVersion, session }
        );
        if (!updated) throw new Error("Node not found");
        const parentId = node.parentId as mongoose.Types.ObjectId | null;
        const metadata = { childId: id, oldName: node.name, newName: name };
        // Emit on parent (so folder-content viewers refetch) + self (so a
        // viewer of this node sees its breadcrumb update).
        const selfEvent = fileNodeEvent(
          "fileNode.renamed",
          new mongoose.Types.ObjectId(id),
          metadata
        );
        return {
          result: updated as unknown as FileNodeSchema,
          event: parentId
            ? fileNodeEvent("fileNode.renamed", parentId, metadata)
            : selfEvent,
          cascade: parentId ? [selfEvent] : undefined,
        };
      } catch (err: unknown) {
        if (
          typeof err === "object" &&
          err !== null &&
          (err as { code?: number }).code === 11000
        ) {
          throw new Error("A node with this name already exists in this folder");
        }
        throw err;
      }
    });
  }

  /**
   * Set (or clear) the minimum role required to see this node's Document
   * via chat / file-list endpoints. Passing null clears the field — the
   * node becomes visible to all roles.
   *
   * Gated to Admin + PM (mirrors the legacy jobsite update-role mutation).
   * Emits on the parent folder (so viewers refetch and pick up the new
   * value in the row) plus the self id (so detail viewers see it too).
   */
  @Authorized(["ADMIN", "PM"])
  @Mutation(() => FileNodeSchema)
  async setFileNodeMinRole(
    @Arg("id", () => ID) id: string,
    @Arg("expectedVersion", () => Int) expectedVersion: number,
    @Arg("minRole", () => UserRoles, { nullable: true })
    minRole: UserRoles | null
  ): Promise<FileNodeSchema> {
    if (!mongoose.isValidObjectId(id)) throw new Error("Invalid id");
    const node = await FileNode.findById(id).lean();
    if (!node) throw new Error("Node not found");
    if (node.deletedAt) throw new Error("Cannot set role on a trashed node");

    return eventfulMutation(async (session) => {
      const update =
        minRole == null
          ? {
              $set: { updatedAt: new Date() },
              $unset: { minRole: "" },
            }
          : {
              $set: { minRole, updatedAt: new Date() },
            };
      const updated = await findOneAndUpdateVersioned(
        FileNode,
        { _id: new mongoose.Types.ObjectId(id) },
        update,
        { expectedVersion, session }
      );
      if (!updated) throw new Error("Node not found");

      const parentId = node.parentId as mongoose.Types.ObjectId | null;
      const metadata = {
        childId: id,
        name: node.name,
        oldMinRole: node.minRole ?? null,
        newMinRole: minRole,
      };
      const selfEvent = fileNodeEvent(
        "fileNode.minRoleChanged",
        new mongoose.Types.ObjectId(id),
        metadata
      );
      return {
        result: updated as unknown as FileNodeSchema,
        event: parentId
          ? fileNodeEvent("fileNode.minRoleChanged", parentId, metadata)
          : selfEvent,
        cascade: parentId ? [selfEvent] : undefined,
      };
    });
  }

  @Authorized()
  @Mutation(() => FileNodeSchema)
  async trashNode(
    @Arg("id", () => ID) id: string,
    @Arg("expectedVersion", () => Int) expectedVersion: number
  ): Promise<FileNodeSchema> {
    if (!mongoose.isValidObjectId(id)) throw new Error("Invalid id");
    const node = await FileNode.findById(id).lean();
    if (!node) throw new Error("Node not found");
    if (node.isReservedRoot) throw new Error("Cannot trash a reserved-root node");
    if (node.systemManaged)
      throw new Error("Cannot trash a system-managed folder");
    if (node.deletedAt) throw new Error("Node is already trashed");

    // Stamp deletedAt/deletedBy atomically — both root and all cascaded
    // descendants get the same `now`, so a query like "everything deleted
    // at <timestamp>" returns the whole subtree together.
    const deletedBy = getCtxActorId();
    const now = new Date();
    const deleteSet = deletedBy
      ? { deletedAt: now, deletedBy, updatedAt: now }
      : { deletedAt: now, updatedAt: now };

    // Collect documentIds of every file-type node that will be trashed,
    // so we can post-commit check whether each still has a live placement
    // and orphan the Enrichment if not. Returned out of the transaction.
    const affectedDocIds: mongoose.Types.ObjectId[] = [];
    if (node.type === "file" && node.documentId) {
      affectedDocIds.push(node.documentId as mongoose.Types.ObjectId);
    }

    const result = await eventfulMutation(async (session) => {
      if (node.type === "folder") {
        // $graphLookup to find all live descendants.
        const descendants = await FileNode.aggregate([
          { $match: { _id: new mongoose.Types.ObjectId(id) } },
          {
            $graphLookup: {
              from: "filenodes",
              startWith: "$_id",
              connectFromField: "_id",
              connectToField: "parentId",
              as: "desc",
            },
          },
          { $unwind: "$desc" },
          { $match: { "desc.deletedAt": null } },
          {
            $project: {
              _id: "$desc._id",
              type: "$desc.type",
              documentId: "$desc.documentId",
            },
          },
        ]).session(session);
        const descendantIds = descendants.map((d: { _id: mongoose.Types.ObjectId }) => d._id);
        for (const d of descendants) {
          if (d.type === "file" && d.documentId) {
            affectedDocIds.push(d.documentId as mongoose.Types.ObjectId);
          }
        }
        if (descendantIds.length > 0) {
          await FileNode.updateMany(
            { _id: { $in: descendantIds } },
            { $set: deleteSet },
            { session }
          );
        }
      }
      const updated = await findOneAndUpdateVersioned(
        FileNode,
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: deleteSet },
        { expectedVersion, session }
      );
      if (!updated) throw new Error("Node not found");
      const parentId = node.parentId as mongoose.Types.ObjectId | null;
      const metadata = { childId: id, name: node.name, childType: node.type };
      const selfEvent = fileNodeEvent(
        "fileNode.trashed",
        new mongoose.Types.ObjectId(id),
        metadata
      );
      return {
        result: updated as unknown as FileNodeSchema,
        event: parentId
          ? fileNodeEvent("fileNode.trashed", parentId, metadata)
          : selfEvent,
        cascade: parentId ? [selfEvent] : undefined,
      };
    });

    // Post-commit: orphan in-flight Enrichments whose Document now has no
    // live placement. `orphaned` is a terminal state the handler's claim
    // predicate refuses, so any pending job won't be picked up; any in-
    // flight handler's final write is gated on processingVersion, so
    // incrementing it silently suppresses a stale write.
    for (const docId of affectedDocIds) {
      if (!(await shouldEnrichNow(docId))) {
        await Enrichment.updateOne(
          {
            documentId: docId,
            status: { $in: ["pending", "processing", "partial"] },
          },
          {
            $set: {
              status: "orphaned",
              summaryError: "All placements trashed",
            },
            $inc: { processingVersion: 1 },
            $unset: { processingStartedAt: "", summaryProgress: "" },
          }
        );
      }
    }

    return result;
  }

  @Authorized()
  @Mutation(() => FileNodeSchema)
  async moveNode(
    @Arg("id", () => ID) id: string,
    @Arg("destinationParentId", () => ID) destinationParentId: string,
    @Arg("expectedVersion", () => Int) expectedVersion: number
  ): Promise<FileNodeSchema> {
    if (!mongoose.isValidObjectId(id)) throw new Error("Invalid id");
    if (!mongoose.isValidObjectId(destinationParentId)) throw new Error("Invalid destinationParentId");

    const destObjectId = new mongoose.Types.ObjectId(destinationParentId);
    const nodeObjectId = new mongoose.Types.ObjectId(id);

    const { updated, affectedDocumentIds } = await eventfulMutation(async (session) => {
      // Capture the source parent BEFORE the move so we can emit a
      // "moved-out" event on the old parent's subscription feed.
      const before = await FileNode.findById(nodeObjectId).session(session).lean();
      const sourceParentId = (before?.parentId as mongoose.Types.ObjectId | null) ?? null;

      const { updated, affectedDocumentIds } = await moveNodeCore({
        nodeId: nodeObjectId,
        destinationParentId: destObjectId,
        expectedVersion,
        session,
      });

      const metadata = {
        childId: id,
        fromParentId: sourceParentId ? sourceParentId.toString() : null,
        toParentId: destinationParentId,
        name: before?.name,
        childType: before?.type,
      };

      // Emit up to three events:
      //   1. root event on the source parent (it lost a child)
      //   2. cascade event on the destination parent (it gained one)
      //   3. cascade event on the moved node itself (so a viewer of this
      //      folder sees its breadcrumbs update)
      // Consumers subscribing to any of these feeds get the relevant notice.
      const rootEvent = sourceParentId
        ? fileNodeEvent("fileNode.moved", sourceParentId, metadata)
        : fileNodeEvent("fileNode.moved", destObjectId, metadata);
      const cascade: DomainEventInput[] = [];
      if (sourceParentId && sourceParentId.toString() !== destObjectId.toString()) {
        cascade.push(fileNodeEvent("fileNode.moved", destObjectId, metadata));
      }
      cascade.push(fileNodeEvent("fileNode.moved", nodeObjectId, metadata));

      return {
        result: { updated, affectedDocumentIds },
        event: rootEvent,
        cascade: cascade.length > 0 ? cascade : undefined,
      };
    });

    // Side effect — published after commit, NOT inside the transaction.
    await reevaluateEnrichmentAfterMove(affectedDocumentIds, async (docId, fileId) => {
      await publishEnrichedFileCreated(docId, fileId);
    });

    return updated as FileNodeSchema;
  }

  @Authorized()
  @Mutation(() => FileNodeSchema)
  async restoreNode(
    @Arg("id", () => ID) id: string,
    @Arg("expectedVersion", () => Int) expectedVersion: number
  ): Promise<FileNodeSchema> {
    if (!mongoose.isValidObjectId(id)) throw new Error("Invalid id");
    const node = await FileNode.findById(id).lean();
    if (!node) throw new Error("Node not found");
    if (!node.deletedAt) throw new Error("Node is not trashed");

    // Walk ancestors to check for any that are also trashed.
    let cursorId: mongoose.Types.ObjectId | null =
      (node.parentId as mongoose.Types.ObjectId) ?? null;
    const visited = new Set<string>();
    while (cursorId) {
      const key = cursorId.toString();
      if (visited.has(key)) break;
      visited.add(key);
      // eslint-disable-next-line no-await-in-loop
      const anc: (typeof node) | null = await FileNode.findById(cursorId).lean();
      if (!anc) break;
      if (anc.deletedAt) {
        throw new Error(
          "Cannot restore because an ancestor is still trashed; restore the ancestor first or move this node to a live parent"
        );
      }
      cursorId = (anc.parentId as mongoose.Types.ObjectId) ?? null;
    }

    // Collect documentIds that are about to come back to life — both the
    // clicked node (if it's a file) and every descendant that was trashed
    // in the SAME cascade (same deletedAt timestamp). We re-evaluate
    // their Enrichment state post-commit so any doc that landed in
    // "orphaned" when its last placement was trashed can transition back.
    const affectedDocIds: mongoose.Types.ObjectId[] = [];
    if (node.type === "file" && node.documentId) {
      affectedDocIds.push(node.documentId as mongoose.Types.ObjectId);
    }

    return eventfulMutation(async (session) => {
      // Sibling-uniqueness guard. The compound unique index is partial on
      // { deletedAt: null } — a trashed node is invisible to the index, so
      // someone could drop an identically-named file after this one was
      // trashed. Restoring then creates two live siblings with the same
      // normalizedName unless we check explicitly here (defense-in-depth
      // even if the partial index is present).
      const parentId = node.parentId as mongoose.Types.ObjectId | null;
      if (parentId) {
        const collision = await FileNode.findOne({
          parentId,
          normalizedName: node.normalizedName,
          deletedAt: null,
          _id: { $ne: new mongoose.Types.ObjectId(id) },
        })
          .session(session)
          .lean();
        if (collision) {
          throw new Error(
            `Cannot restore — another "${node.name}" already exists in this folder. ` +
              `Rename it first, then retry.`
          );
        }
      }

      // Cascade: everything trashed in the same sweep as this node.
      // trashNode stamps a shared `deletedAt` across root + descendants,
      // so matching on that timestamp scoped to this subtree restores
      // exactly what went down together (and nothing trashed later in a
      // separate operation).
      if (node.type === "folder") {
        const cascadeDescendants = await FileNode.aggregate([
          { $match: { _id: new mongoose.Types.ObjectId(id) } },
          {
            $graphLookup: {
              from: "filenodes",
              startWith: "$_id",
              connectFromField: "_id",
              connectToField: "parentId",
              as: "desc",
            },
          },
          { $unwind: "$desc" },
          { $match: { "desc.deletedAt": node.deletedAt } },
          {
            $project: {
              _id: "$desc._id",
              type: "$desc.type",
              documentId: "$desc.documentId",
            },
          },
        ]).session(session);
        const cascadeIds = cascadeDescendants.map(
          (d: { _id: mongoose.Types.ObjectId }) => d._id
        );
        for (const d of cascadeDescendants) {
          if (d.type === "file" && d.documentId) {
            affectedDocIds.push(d.documentId as mongoose.Types.ObjectId);
          }
        }
        if (cascadeIds.length > 0) {
          await FileNode.updateMany(
            { _id: { $in: cascadeIds } },
            {
              $unset: { deletedAt: "", deletedBy: "" },
              $set: { updatedAt: new Date() },
            },
            { session }
          );
        }
      }

      const updated = await findOneAndUpdateVersioned(
        FileNode,
        { _id: new mongoose.Types.ObjectId(id) },
        { $unset: { deletedAt: "", deletedBy: "" }, $set: { updatedAt: new Date() } },
        { expectedVersion, session }
      );
      if (!updated) throw new Error("Node not found");
      const metadata = { childId: id, name: node.name, childType: node.type };
      const selfEvent = fileNodeEvent(
        "fileNode.restored",
        new mongoose.Types.ObjectId(id),
        metadata
      );
      return {
        result: updated as unknown as FileNodeSchema,
        event: parentId
          ? fileNodeEvent("fileNode.restored", parentId, metadata)
          : selfEvent,
        cascade: parentId ? [selfEvent] : undefined,
      };
    }).then(async (result) => {
      // Post-commit side effect — re-evaluate enrichment for every file
      // that came back to life. Documents previously stamped "orphaned"
      // (because their last placement was trashed) get a republished
      // enrichment job here; the handler's claim predicate uses
      // processingVersion to fence out stale writes from the prior run.
      if (affectedDocIds.length > 0) {
        await reevaluateEnrichmentAfterMove(
          affectedDocIds,
          async (docId, fileId) => {
            await publishEnrichedFileCreated(docId, fileId);
          }
        );
      }
      return result;
    });
  }
}
