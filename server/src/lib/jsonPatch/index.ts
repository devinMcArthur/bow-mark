import * as jsonpatch from "fast-json-patch";

/**
 * RFC 6902 operation. We narrow to the ops we actually emit, rejecting
 * `test`/`copy` which we never generate and would be confusing in an
 * audit log. Also rules out the `move` op because we canonicalise moves
 * as remove+add pairs (simpler to render, simpler to invert).
 */
export type PatchOp =
  | { op: "add"; path: string; value: unknown }
  | { op: "remove"; path: string }
  | { op: "replace"; path: string; value: unknown };

export type JsonPatch = PatchOp[];

export function computeForward(before: unknown, after: unknown): JsonPatch {
  const ops = jsonpatch.compare(before as object, after as object);
  return ops.filter((op) => op.op !== "test") as JsonPatch;
}

export function computeInverse(before: unknown, after: unknown): JsonPatch {
  // Diffing in the opposite direction yields the inverse patch.
  const ops = jsonpatch.compare(after as object, before as object);
  return ops.filter((op) => op.op !== "test") as JsonPatch;
}

/**
 * Apply a patch to a document, returning a new document. The input is
 * cloned so callers don't need to worry about mutation.
 */
export function applyPatch<T>(doc: T, patch: JsonPatch): T {
  const clone = jsonpatch.deepClone(doc);
  return jsonpatch.applyPatch(clone, patch as jsonpatch.Operation[]).newDocument as T;
}
