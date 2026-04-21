import mongoose, { ClientSession, Types } from "mongoose";
import { FileNode, Document as DocumentModel, Enrichment, File as FileModel } from "@models";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { findOneAndUpdateVersioned } from "@lib/entityVersion";
import { shouldEnrichNow } from "@lib/enrichmentPolicy";

export interface MoveNodeInput {
  nodeId: Types.ObjectId;
  destinationParentId: Types.ObjectId;
  expectedVersion: number;
  session: ClientSession;
}

/**
 * Core move logic. Runs inside a mongo transaction (caller's session).
 * Validations:
 *  - Node exists, not soft-deleted, not isReservedRoot.
 *  - Destination parent exists, not soft-deleted, is a folder (or the filesystem root).
 *  - Destination is NOT inside the node's own subtree (cycle prevention).
 *  - No sibling exists with the same normalizedName under the destination.
 * Effect:
 *  - Updates node.parentId with OCC.
 *  - Returns the updated node + the set of Document IDs whose enrichment
 *    status may need re-evaluation (the moved node if it's a file, plus
 *    every file-type descendant with a documentId).
 */
export async function moveNodeCore(
  input: MoveNodeInput
): Promise<{
  updated: any;
  affectedDocumentIds: Types.ObjectId[];
}> {
  const { nodeId, destinationParentId, expectedVersion, session } = input;

  const node = await FileNode.findById(nodeId).session(session).lean();
  if (!node) throw new Error("Node not found");
  if (node.deletedAt) throw new Error("Cannot move a trashed node");
  if (node.isReservedRoot) throw new Error("Cannot move a reserved-root node");

  const dest = await FileNode.findById(destinationParentId).session(session).lean();
  if (!dest) throw new Error("Destination parent not found");
  if (dest.deletedAt) throw new Error("Destination parent is trashed");
  if (dest.type !== "folder") throw new Error("Destination parent must be a folder");

  // Cycle check: is destinationParentId inside the moved subtree?
  if (destinationParentId.toString() === nodeId.toString()) {
    throw new Error("Cannot move a node into itself");
  }
  const descCheck = await FileNode.aggregate([
    { $match: { _id: nodeId } },
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
    { $match: { "desc._id": destinationParentId } },
    { $limit: 1 },
  ]).session(session);
  if (descCheck.length > 0) {
    throw new Error("Cannot move a node into its own subtree");
  }

  // Sibling uniqueness at new parent.
  const collision = await FileNode.findOne({
    parentId: destinationParentId,
    normalizedName: node.normalizedName,
    deletedAt: null,
    _id: { $ne: nodeId },
  })
    .session(session)
    .lean();
  if (collision) {
    throw new Error("A node with this name already exists in the destination");
  }

  // Apply the move with OCC.
  const updated = await findOneAndUpdateVersioned(
    FileNode,
    { _id: nodeId },
    { $set: { parentId: destinationParentId, updatedAt: new Date() } },
    { expectedVersion, session }
  );
  if (!updated) throw new Error("Node not found");

  // Collect affected documentIds: the moved node if it's a file, plus every
  // file-type descendant with a documentId.
  const affected: Types.ObjectId[] = [];
  if (node.type === "file" && node.documentId) {
    affected.push(node.documentId as Types.ObjectId);
  }
  const descendants = await FileNode.aggregate([
    { $match: { _id: nodeId } },
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
    { $match: { "desc.type": "file", "desc.deletedAt": null, "desc.documentId": { $exists: true } } },
    { $project: { _id: 0, documentId: "$desc.documentId" } },
  ]).session(session);
  for (const d of descendants) {
    if (d.documentId) affected.push(d.documentId as Types.ObjectId);
  }

  return { updated, affectedDocumentIds: affected };
}

/**
 * For each affected documentId, if shouldEnrichNow returns true AND no
 * Enrichment exists (or exists in a terminal non-ready state like "orphaned"
 * — where a move to an enrichable namespace should trigger a retry), publish
 * an enrichment job. Returns the list of documentIds we published for.
 *
 * Called AFTER the transaction commits — NOT inside the eventfulMutation
 * session, because publishing to RabbitMQ is a side effect we don't want to
 * retry on transaction rollback.
 */
export async function reevaluateEnrichmentAfterMove(
  documentIds: Types.ObjectId[],
  publish: (documentId: string, fileId: string) => Promise<unknown>
): Promise<string[]> {
  const published: string[] = [];
  for (const docId of documentIds) {
    if (await shouldEnrichNow(docId)) {
      const doc = await DocumentModel.findById(docId).lean();
      if (!doc || !doc.currentFileId) continue;
      // Check for existing ready enrichment — skip re-publish if already
      // successfully enriched (a move doesn't reset a successful summary).
      const existing = await Enrichment.findOne({ documentId: docId }).lean();
      if (existing && existing.status === "ready") continue;
      await publish(docId.toString(), doc.currentFileId.toString());
      published.push(docId.toString());
    }
  }
  return published;
}
