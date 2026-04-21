import mongoose, { ClientSession, Types } from "mongoose";
import { FileNode } from "@models";
import { normalizeNodeName, RESERVED_NAMESPACE_PATHS } from "./reservedRoots";

type NamespacePath = (typeof RESERVED_NAMESPACE_PATHS)[number];

export interface CreateEntityRootInput {
  namespace: NamespacePath;
  entityId: Types.ObjectId;
  session?: ClientSession;
}

/**
 * Create an immutable per-entity reserved-root folder under a namespace.
 * Idempotent. Designed to run inside the same transaction as the entity's
 * own creation (via eventfulMutation) so partial state is impossible.
 *
 * Example: `createEntityRoot({ namespace: "/tenders", entityId: tenderId, session })`
 * creates `/tenders/<tenderId>/` if it doesn't already exist.
 */
export async function createEntityRoot(
  input: CreateEntityRootInput
): Promise<void> {
  const { namespace, entityId, session } = input;

  // Walk from filesystem root (name="/") to the namespace folder.
  const pathSegments = namespace.slice(1).split("/"); // "/system/specs" -> ["system", "specs"]
  const root = await FileNode.findOne({ parentId: null, name: "/" }).session(
    session ?? null
  );
  if (!root) {
    throw new Error("createEntityRoot: filesystem root not bootstrapped");
  }
  let parentId: mongoose.Types.ObjectId = root._id;
  for (const seg of pathSegments) {
    const next = await FileNode.findOne({ parentId, name: seg }).session(
      session ?? null
    );
    if (!next) {
      throw new Error(
        `createEntityRoot: namespace segment "${seg}" not found under ${parentId}`
      );
    }
    parentId = next._id;
  }

  // Idempotent insert.
  const name = entityId.toString();
  const existing = await FileNode.findOne({
    parentId,
    name,
  }).session(session ?? null);
  if (existing) return;

  await FileNode.create(
    [
      {
        type: "folder",
        name,
        normalizedName: normalizeNodeName(name),
        parentId,
        isReservedRoot: true,
        aiManaged: false,
        sortKey: "0000",
        version: 0,
      },
    ],
    { session }
  );
}
