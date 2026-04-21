import { Resolver, Mutation, Arg, ID, Int } from "type-graphql";
import mongoose from "mongoose";
import { FileNode } from "@models";
import { FileNodeSchema } from "../../../models/FileNode/schema";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { eventfulMutation } from "@lib/eventfulMutation";
import { findOneAndUpdateVersioned } from "@lib/entityVersion";
import { moveNodeCore, reevaluateEnrichmentAfterMove } from "../../../models/FileNode/class/move";
import { publishEnrichedFileCreated } from "../../../rabbitmq/publisher";

function assertNonEmptyName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Name cannot be empty");
  return trimmed;
}

@Resolver()
export default class FileNodeMutationResolver {
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

    return eventfulMutation(async (session) => {
      try {
        const created = await FileNode.create(
          [
            {
              type: "folder",
              name,
              normalizedName: normalizeNodeName(name),
              parentId: new mongoose.Types.ObjectId(parentId),
              aiManaged: false,
              sortKey: "5000",
              isReservedRoot: false,
              version: 0,
            },
          ],
          { session }
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { result: (created as any)[0] as FileNodeSchema, event: null };
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
        return { result: updated as unknown as FileNodeSchema, event: null };
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

  @Mutation(() => FileNodeSchema)
  async trashNode(
    @Arg("id", () => ID) id: string,
    @Arg("expectedVersion", () => Int) expectedVersion: number
  ): Promise<FileNodeSchema> {
    if (!mongoose.isValidObjectId(id)) throw new Error("Invalid id");
    const node = await FileNode.findById(id).lean();
    if (!node) throw new Error("Node not found");
    if (node.isReservedRoot) throw new Error("Cannot trash a reserved-root node");
    if (node.deletedAt) throw new Error("Node is already trashed");

    return eventfulMutation(async (session) => {
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
          { $project: { _id: "$desc._id" } },
        ]).session(session);
        const descendantIds = descendants.map((d: { _id: mongoose.Types.ObjectId }) => d._id);
        if (descendantIds.length > 0) {
          await FileNode.updateMany(
            { _id: { $in: descendantIds } },
            { $set: { deletedAt: new Date(), updatedAt: new Date() } },
            { session }
          );
        }
      }
      const updated = await findOneAndUpdateVersioned(
        FileNode,
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: { deletedAt: new Date(), updatedAt: new Date() } },
        { expectedVersion, session }
      );
      if (!updated) throw new Error("Node not found");
      return { result: updated as unknown as FileNodeSchema, event: null };
    });
  }

  @Mutation(() => FileNodeSchema)
  async moveNode(
    @Arg("id", () => ID) id: string,
    @Arg("destinationParentId", () => ID) destinationParentId: string,
    @Arg("expectedVersion", () => Int) expectedVersion: number
  ): Promise<FileNodeSchema> {
    if (!mongoose.isValidObjectId(id)) throw new Error("Invalid id");
    if (!mongoose.isValidObjectId(destinationParentId)) throw new Error("Invalid destinationParentId");

    const { updated, affectedDocumentIds } = await eventfulMutation(async (session) => {
      const { updated, affectedDocumentIds } = await moveNodeCore({
        nodeId: new mongoose.Types.ObjectId(id),
        destinationParentId: new mongoose.Types.ObjectId(destinationParentId),
        expectedVersion,
        session,
      });
      return {
        result: { updated, affectedDocumentIds },
        event: null,
      };
    });

    // Side effect — published after commit, NOT inside the transaction.
    await reevaluateEnrichmentAfterMove(affectedDocumentIds, async (docId, fileId) => {
      await publishEnrichedFileCreated(docId, fileId);
    });

    return updated as FileNodeSchema;
  }

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

    return eventfulMutation(async (session) => {
      const updated = await findOneAndUpdateVersioned(
        FileNode,
        { _id: new mongoose.Types.ObjectId(id) },
        { $unset: { deletedAt: "", deletedBy: "" }, $set: { updatedAt: new Date() } },
        { expectedVersion, session }
      );
      if (!updated) throw new Error("Node not found");
      return { result: updated as unknown as FileNodeSchema, event: null };
    });
  }
}
