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

  // Idempotent insert. Two pods hitting this helper concurrently can
  // both miss the findOne and race into create — the partial unique
  // index on {parentId, normalizedName} then throws E11000 on the
  // loser. Catch it and treat as success (the winning pod created the
  // root we wanted).
  const name = entityId.toString();
  const existing = await FileNode.findOne({
    parentId,
    name,
  }).session(session ?? null);
  if (existing) return;

  try {
    await FileNode.create(
      [
        {
          type: "folder",
          name,
          normalizedName: normalizeNodeName(name),
          parentId,
          isReservedRoot: true,
          systemManaged: false,
          sortKey: "0000",
          version: 0,
        },
      ],
      { session }
    );
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { code?: number }).code === 11000
    ) {
      // Concurrent creator beat us to it. Re-fetch so the caller can rely
      // on the root existing after this returns; also validates the
      // index didn't fire for some unrelated reason.
      const now = await FileNode.findOne({ parentId, name }).session(
        session ?? null
      );
      if (now) return;
    }
    throw err;
  }
}
