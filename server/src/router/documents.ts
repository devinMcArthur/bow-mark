import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  EnrichedFile,
  Document as DocumentModel,
  File as FileModel,
  FileNode,
  User,
} from "@models";
import { UserRoles } from "@typescript/user";
import { roleWeight } from "@graphql/resolvers/fileNode";
import { getFile, getFileSignedUrl } from "@utils/fileStorage";

const router = Router();

// GET /api/documents/:documentId?token=JWT[&page=N][&stream=1][&filename=...]
//
// Accepts JWT via Authorization header OR ?token= query param.
// Resolves the Document's currentFileId (or, for legacy-migrated files,
// the matching EnrichedFile) to storage, then redirects to a fresh signed
// URL so citations never go stale. Alias route at /api/enriched-files/:id
// forwards here to preserve historical chat citations.

router.get("/:documentId", async (req, res) => {
  const token =
    (req.headers.authorization as string | undefined) ||
    (req.query.token as string | undefined);

  if (!token || !process.env.JWT_SECRET) {
    res.status(401).send("Unauthorized");
    return;
  }

  let decodedUserId: string | undefined;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
    decodedUserId = typeof decoded?.userId === "string" ? decoded.userId : undefined;
  } catch {
    res.status(401).send("Invalid token");
    return;
  }

  const { documentId } = req.params;

  if (!mongoose.isValidObjectId(documentId)) {
    res.status(400).send("Invalid ID");
    return;
  }

  // Per-file access check: if any live FileNode placement for this Document
  // has a minRole, the viewer must satisfy it. A Document can have multiple
  // placements (rare — e.g. moved in-tree); we apply the least restrictive
  // rule: if the viewer has access via any live placement, they can read.
  // Documents with no FileNode placements (legacy EnrichedFile-only) fall
  // through as public — the legacy UI had its own role guard that's being
  // retired along with the enrichedFiles array.
  const placements = await FileNode.find({
    documentId: new mongoose.Types.ObjectId(documentId),
    deletedAt: null,
  })
    .select("minRole")
    .lean();

  if (placements.length > 0) {
    const weights = placements
      .map((p) => roleWeight(p.minRole))
      .filter((w) => w > 0);
    if (weights.length > 0) {
      // Least-restrictive rule: if ANY placement grants access, allow the
      // download. Otherwise, the viewer must satisfy the strictest one
      // among the placements that do gate.
      const minRequired = Math.min(...weights);
      const user = decodedUserId
        ? await User.findById(decodedUserId).select("role").lean()
        : null;
      const viewerWeight = roleWeight(
        (user as { role?: unknown } | null)?.role ?? UserRoles.User
      );
      if (viewerWeight < minRequired) {
        res.status(403).send("Forbidden");
        return;
      }
    }
  }

  // Resolve to the underlying File. Priority order:
  //   1. Legacy EnrichedFile (Document._id === EnrichedFile._id for migrated files)
  //   2. Document (net-new uploads via uploadDocument have no EnrichedFile)
  let fileId: string | null = null;
  let mimetype = "application/octet-stream";
  let originalFilename: string | undefined;

  const enrichedFile = await EnrichedFile.findById(documentId).populate("file");
  if (enrichedFile?.file) {
    fileId =
      typeof enrichedFile.file === "object" && (enrichedFile.file as any)._id
        ? (enrichedFile.file as any)._id.toString()
        : enrichedFile.file.toString();
    mimetype = (enrichedFile.file as any).mimetype ?? mimetype;
    originalFilename = (enrichedFile.file as any).originalFilename ?? (enrichedFile.file as any).description ?? undefined;
  } else {
    const doc = await DocumentModel.findById(documentId).lean();
    if (doc?.currentFileId) {
      const file = await FileModel.findById(doc.currentFileId).lean();
      if (file) {
        fileId = file._id.toString();
        mimetype = file.mimetype ?? mimetype;
        originalFilename = file.originalFilename ?? file.description ?? undefined;
      }
    }
  }

  if (!fileId) {
    res.status(404).send("File not found");
    return;
  }

  // Prefer caller-provided display name (e.g. the current FileNode name),
  // falling back to the File's originalFilename.
  const callerFilename =
    typeof req.query.filename === "string" && req.query.filename.trim()
      ? req.query.filename.trim()
      : undefined;
  const downloadFilename = callerFilename ?? originalFilename;

  // ?stream=1 — proxy the file content directly (avoids cross-origin redirect
  // issues when embedding in react-pdf or similar client-side viewers).
  if (req.query.stream === "1") {
    const fileObj = await getFile(fileId);
    if (!fileObj?.Body) {
      res.status(404).send("File not found");
      return;
    }
    res.setHeader("Content-Type", mimetype);
    res.setHeader("Cache-Control", "private, max-age=300");
    if (downloadFilename) {
      const safe = downloadFilename.replace(/"/g, "");
      const encoded = encodeURIComponent(downloadFilename);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${safe}"; filename*=UTF-8''${encoded}`
      );
    }
    if (typeof (fileObj.Body as any).pipe === "function") {
      (fileObj.Body as any).pipe(res);
    } else {
      res.send(fileObj.Body);
    }
    return;
  }

  const signedUrl = (await getFileSignedUrl(fileId, {
    downloadFilename,
    disposition: "inline",
  })) as string;

  const page = req.query.page ? parseInt(req.query.page as string, 10) : null;
  const redirectUrl = page && !isNaN(page) ? `${signedUrl}#page=${page}` : signedUrl;

  res.redirect(302, redirectUrl);
});

export default router;
