import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { System } from "@models";
import { getFileSignedUrl } from "@utils/fileStorage";

const router = Router();

// GET /api/spec-files/:fileObjectId?token=JWT
//
// Same redirect pattern as tender-files — generates a fresh signed URL
// on every click so citations in chat never go stale.

router.get("/:fileObjectId", async (req, res) => {
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

  const { fileObjectId } = req.params;

  if (!mongoose.isValidObjectId(fileObjectId)) {
    res.status(400).send("Invalid ID");
    return;
  }

  const system = await System.getSystem();
  if (!system) {
    res.status(404).send("System not found");
    return;
  }

  const fileObj = system.specFiles.find(
    (f) => f._id.toString() === fileObjectId
  );
  if (!fileObj?.file) {
    res.status(404).send("File not found");
    return;
  }

  const fileId =
    fileObj.file && typeof (fileObj.file as any)._id !== "undefined"
      ? (fileObj.file as any)._id.toString()
      : fileObj.file.toString();

  const signedUrl = (await getFileSignedUrl(fileId)) as string;

  const page = req.query.page ? parseInt(req.query.page as string, 10) : null;
  const redirectUrl = page && !isNaN(page) ? `${signedUrl}#page=${page}` : signedUrl;

  res.redirect(302, redirectUrl);
});

export default router;
