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
 */
export async function bootstrapRoots(): Promise<void> {
  // Root sentinel name is "/" (non-empty to satisfy Mongoose's required validator;
  // conventional for filesystem root). Users never see this name.
  let root = await FileNode.findOne({ parentId: null, name: "/" });
  if (!root) {
    root = await FileNode.create({
      type: "folder",
      name: "/",
      normalizedName: "/",
      parentId: null,
      isReservedRoot: true,
      aiManaged: false,
      sortKey: "0000",
      version: 0,
    });
  }

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

    const existing = await FileNode.findOne({ parentId, name: def.name });
    if (!existing) {
      await FileNode.create({
        type: "folder",
        name: def.name,
        normalizedName: normalizeNodeName(def.name),
        parentId,
        isReservedRoot: true,
        aiManaged: false,
        sortKey: "0000",
        version: 0,
      });
    }
  }
}
