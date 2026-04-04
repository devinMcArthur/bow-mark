import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { EnrichedFile } from "@models";
import { getFile, getFileSignedUrl } from "@utils/fileStorage";

const router = Router();

// GET /api/enriched-files/:enrichedFileId?token=JWT&page=N
//
// Accepts JWT via Authorization header OR ?token= query param.
// Loads the EnrichedFile doc, resolves the S3 file key, and redirects
// to a fresh signed URL so citations never go stale.

router.get("/:enrichedFileId", async (req, res) => {
  const token =
    (req.headers.authorization as string | undefined) ||
    (req.query.token as string | undefined);

  if (!token || !process.env.JWT_SECRET) {
    res.status(401).send("Unauthorized");
    return;
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401).send("Invalid token");
    return;
  }

  const { enrichedFileId } = req.params;

  if (!mongoose.isValidObjectId(enrichedFileId)) {
    res.status(400).send("Invalid ID");
    return;
  }

  const enrichedFile = await EnrichedFile.findById(enrichedFileId).populate("file");
  if (!enrichedFile?.file) {
    res.status(404).send("File not found");
    return;
  }

  const fileId =
    typeof enrichedFile.file === "object" && (enrichedFile.file as any)._id
      ? (enrichedFile.file as any)._id.toString()
      : enrichedFile.file.toString();

  // ?stream=1 — proxy the file content directly (avoids cross-origin redirect
  // issues when embedding in react-pdf or similar client-side viewers).
  if (req.query.stream === "1") {
    const fileObj = await getFile(fileId);
    if (!fileObj?.Body) {
      res.status(404).send("File not found");
      return;
    }
    const mimetype = (enrichedFile.file as any).mimetype ?? "application/octet-stream";
    res.setHeader("Content-Type", mimetype);
    res.setHeader("Cache-Control", "private, max-age=300");
    if (typeof (fileObj.Body as any).pipe === "function") {
      (fileObj.Body as any).pipe(res);
    } else {
      res.send(fileObj.Body);
    }
    return;
  }

  const signedUrl = (await getFileSignedUrl(fileId)) as string;

  const page = req.query.page ? parseInt(req.query.page as string, 10) : null;
  const redirectUrl = page && !isNaN(page) ? `${signedUrl}#page=${page}` : signedUrl;

  res.redirect(302, redirectUrl);
});

export default router;
