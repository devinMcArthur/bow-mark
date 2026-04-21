import { Types } from "mongoose";

/**
 * Reserved namespace paths under root. Immutable — users cannot rename,
 * move, or delete these folders. Policy decisions anchor here.
 */
export const RESERVED_NAMESPACE_PATHS = [
  "/system",
  "/system/specs",
  "/tenders",
  "/jobsites",
  "/daily-reports",
] as const;

export type ReservedNamespacePath = (typeof RESERVED_NAMESPACE_PATHS)[number];

/** Sentinel id used for the filesystem root before it's bootstrapped. */
export const RESERVED_NAMESPACE_ROOT_ID = new Types.ObjectId("000000000000000000000001");

/**
 * Enrichment policy keyed at the namespace level. Per-entity roots
 * (e.g. /tenders/<id>/) inherit from their namespace.
 */
export const ENRICHABLE_NAMESPACES: Record<string, boolean> = {
  "/system/specs": true,
  "/tenders": true,
  "/jobsites": true,
  "/daily-reports": false,
};

/**
 * Given the ancestor-path chain of a node (from root to parent, expressed
 * as path strings like ["/", "/tenders", "/tenders/abc123"]), return the
 * outermost reserved namespace (longest prefix match among namespace
 * paths — NOT per-entity roots).
 */
export function namespaceRootForPath(pathChain: string[]): ReservedNamespacePath | null {
  let match: ReservedNamespacePath | null = null;
  for (const p of pathChain) {
    if ((RESERVED_NAMESPACE_PATHS as readonly string[]).includes(p)) {
      if (!match || p.length > match.length) {
        match = p as ReservedNamespacePath;
      }
    }
  }
  return match;
}

/**
 * Canonical name normalization for sibling-uniqueness checks.
 * NFC Unicode normalization + case fold + whitespace trim + inner
 * whitespace collapse. Must be reproducible server- and client-side.
 */
export function normalizeNodeName(name: string): string {
  return name
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
