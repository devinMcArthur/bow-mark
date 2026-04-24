import mongoose from "mongoose";
import { FileNode } from "@models";
import { normalizeNodeName } from "./reservedRoots";

interface RootDef {
  name: string;
  parentPath: string[]; // walk from literal filesystem root
}

const ROOT_TREE: RootDef[] = [
  { name: "system", parentPath: [] },
  { name: "specs", parentPath: ["system"] },
  { name: "tenders", parentPath: [] },
  { name: "jobsites", parentPath: [] },
  { name: "daily-reports", parentPath: [] },
];

/**
 * Idempotently provision the filesystem root (name="") and all reserved
 * namespace folders. Call once at server startup.
 *
 * Concurrency: multi-replica deployments will race on this during rollout
 * (every pod runs it). We use try/catch-E11000-and-refetch rather than
 * find-then-create so the loser of the race succeeds gracefully instead
 * of crashing the pod before the liveness probe fires.
 */
export async function bootstrapRoots(): Promise<void> {
  // Root sentinel name is "/" (non-empty to satisfy Mongoose's required validator;
  // conventional for filesystem root). Users never see this name.
  const root = await upsertRoot({
    parentId: null,
    name: "/",
    normalizedName: "/",
    sortKey: "0000",
  });

  for (const def of ROOT_TREE) {
    let parentId: mongoose.Types.ObjectId = root._id;
    for (const segment of def.parentPath) {
      const next = await FileNode.findOne({ parentId, name: segment });
      if (!next) {
        throw new Error(
          `bootstrapRoots: expected parent "${segment}" under ${parentId} but not found`
        );
      }
      parentId = next._id;
    }

    await upsertRoot({
      parentId,
      name: def.name,
      normalizedName: normalizeNodeName(def.name),
      sortKey: "0000",
    });
  }
}

async function upsertRoot(input: {
  parentId: mongoose.Types.ObjectId | null;
  name: string;
  normalizedName: string;
  sortKey: string;
}): Promise<{ _id: mongoose.Types.ObjectId }> {
  const { parentId, name, normalizedName, sortKey } = input;
  const existing = await FileNode.findOne({ parentId, name });
  if (existing) return { _id: existing._id };

  try {
    const created = await FileNode.create({
      type: "folder",
      name,
      normalizedName,
      parentId,
      isReservedRoot: true,
      systemManaged: false,
      sortKey,
      version: 0,
    });
    return { _id: created._id };
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { code?: number }).code === 11000
    ) {
      // Raced with another pod — the winner created the folder, we
      // re-fetch and proceed.
      const now = await FileNode.findOne({ parentId, name });
      if (now) return { _id: now._id };
    }
    throw err;
  }
}
