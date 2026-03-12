import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Tender } from "@models";
import { getFileSignedUrl } from "@utils/fileStorage";

const router = Router();

// GET /api/tender-files/:tenderId/:fileObjectId?page=N
//
// Accepts JWT via Authorization header OR ?token= query param (needed for
// browser-navigation links embedded in chat citations).
// Generates a fresh signed URL and redirects — links never go stale.

router.get("/:tenderId/:fileObjectId", async (req, res) => {
  const token =
    (req.headers.authorization as string | undefined) ||
    (req.query.token as string | undefined);

  if (!token || !process.env.JWT_SECRET) {
    res.status(401).send("Unauthorized");
    return;
  }

  let userId: string;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
    userId = decoded?.userId;
    if (!userId) throw new Error("No userId");
  } catch {
    res.status(401).send("Invalid token");
    return;
  }

  const { tenderId, fileObjectId } = req.params;

  if (
    !mongoose.isValidObjectId(tenderId) ||
    !mongoose.isValidObjectId(fileObjectId)
  ) {
    res.status(400).send("Invalid ID");
    return;
  }

  const tender = await Tender.findById(tenderId).lean();
  if (!tender) {
    res.status(404).send("Tender not found");
    return;
  }

  const fileObj = tender.files.find(
    (f) => f._id.toString() === fileObjectId
  );
  if (!fileObj?.file) {
    res.status(404).send("File not found");
    return;
  }

  const signedUrl = await getFileSignedUrl(fileObj.file.toString()) as string;

  const page = req.query.page ? parseInt(req.query.page as string, 10) : null;
  const redirectUrl = page && !isNaN(page)
    ? `${signedUrl}#page=${page}`
    : signedUrl;

  res.redirect(302, redirectUrl);
});

export default router;
