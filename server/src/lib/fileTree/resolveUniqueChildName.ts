import mongoose from "mongoose";
import { FileNode } from "@models";
import { normalizeNodeName } from "./reservedRoots";

/**
 * Resolve a non-colliding name within a folder by appending a numeric
 * suffix before the extension when the desired name is taken by a live
 * sibling. Examples:
 *
 *   desired: "invoice.pdf"   → "invoice.pdf"   if free
 *   desired: "invoice.pdf"   → "invoice (2).pdf" if taken
 *   desired: "notes"         → "notes (2)"      if taken (no extension)
 *
 * Scans live siblings once; picks the first free " (N)" starting at 2.
 * If two concurrent requests race past this check, the unique partial
 * index on `{ parentId, normalizedName }` (deletedAt: null) catches it —
 * this is best-effort collision avoidance, not a hard guarantee.
 */
export const resolveUniqueChildName = async (
  desired: string,
  parentId: mongoose.Types.ObjectId
): Promise<string> => {
  const lastDot = desired.lastIndexOf(".");
  // Treat a leading-dot name like ".gitignore" as having no separable ext.
  const hasExt = lastDot > 0 && lastDot < desired.length - 1;
  const base = hasExt ? desired.slice(0, lastDot) : desired;
  const ext = hasExt ? desired.slice(lastDot) : "";

  const siblings = await FileNode.find(
    { parentId, deletedAt: null },
    { normalizedName: 1 }
  ).lean();
  const taken = new Set(siblings.map((s) => s.normalizedName));

  if (!taken.has(normalizeNodeName(desired))) return desired;

  for (let n = 2; n < 1000; n++) {
    const candidate = `${base} (${n})${ext}`;
    if (!taken.has(normalizeNodeName(candidate))) return candidate;
  }
  // Pathological: 1000 collisions in one folder. Bubble up so the upload
  // fails explicitly rather than silently picking a weird name.
  throw new Error("Unable to find a unique name in this folder");
};
