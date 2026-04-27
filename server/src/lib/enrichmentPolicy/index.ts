import { Types } from "mongoose";
import { FileNode, File, Document as DocumentModel } from "@models";
import {
  ENRICHABLE_NAMESPACES,
  RESERVED_NAMESPACE_PATHS,
} from "@lib/fileTree/reservedRoots";

/**
 * MIME allowlist. Must mirror (or extend) the existing
 * SupportedMimeTypes enum so we don't regress on anything the current
 * pipeline handles.
 *
 * Spreadsheets cover both modern .xlsx (OOXML) and legacy .xls (BIFF) —
 * the consumer handler uses the `xlsx` library which reads both formats,
 * so dropping .xls here would silently strand legacy uploads at the gate
 * even though the handler is ready for them.
 */
export const ENRICHABLE_MIMETYPES = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

/**
 * Walk from a FileNode up to the filesystem root, collecting the cumulative
 * path at each step (e.g. ["/tenders/<id>/specs", "/tenders/<id>", "/tenders", "/"]).
 * Used for namespace-root membership checks.
 */
async function collectPathChain(nodeId: Types.ObjectId): Promise<string[]> {
  const nodes: { id: Types.ObjectId; name: string }[] = [];
  let currentId: Types.ObjectId | null = nodeId;
  const visited = new Set<string>();
  while (currentId) {
    const idStr = currentId.toString();
    if (visited.has(idStr)) break;
    visited.add(idStr);
    const node = (await FileNode.findById(currentId)
      .select("name parentId")
      .lean()) as
      | { _id: Types.ObjectId; name: string; parentId: Types.ObjectId | null }
      | null;
    if (!node) break;
    nodes.unshift({ id: node._id, name: node.name });
    currentId = node.parentId ?? null;
  }
  // Rebuild cumulative paths from top to node.
  const chain: string[] = [];
  let acc = "";
  for (const n of nodes) {
    if (n.name === "/") {
      chain.push("/");
      acc = "";
    } else {
      acc = `${acc}/${n.name}`;
      chain.push(acc);
    }
  }
  return chain;
}

/**
 * Should this Document be enriched right now, based on current placements?
 *
 *  1. enrichmentLocked on Document → false
 *  2. currentFileId's mimetype not enrichable → false
 *  3. At least one non-deleted placement under an enrichable namespace → true
 *  4. Otherwise → false
 *
 * Only checks if enrichment SHOULD START; it does not check whether an
 * Enrichment already exists. Caller should combine with an Enrichment lookup
 * to decide whether to actually enqueue.
 */
export async function shouldEnrichNow(
  documentId: Types.ObjectId
): Promise<boolean> {
  const doc = await DocumentModel.findById(documentId).lean();
  if (!doc) return false;
  if (doc.enrichmentLocked) return false;

  const file = await File.findById(doc.currentFileId).lean();
  if (!file) return false;
  if (!ENRICHABLE_MIMETYPES.has(file.mimetype)) return false;

  const placements = await FileNode.find({
    documentId,
    deletedAt: null,
  })
    .select("_id")
    .lean();

  for (const p of placements) {
    const pathChain = await collectPathChain(p._id);
    // Find the outermost reserved namespace in this chain.
    let namespaceHit: string | null = null;
    for (const path of pathChain) {
      if ((RESERVED_NAMESPACE_PATHS as readonly string[]).includes(path)) {
        if (!namespaceHit || path.length > namespaceHit.length) {
          namespaceHit = path;
        }
      }
    }
    if (namespaceHit && ENRICHABLE_NAMESPACES[namespaceHit] === true) {
      return true;
    }
  }
  return false;
}
