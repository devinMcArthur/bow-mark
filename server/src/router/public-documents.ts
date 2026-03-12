import { Router } from "express";
import { isDocument } from "@typegoose/typegoose";
import { PublicDocument } from "@models";
import { getFileSignedUrl } from "@utils/fileStorage";

const router = Router();

/**
 * GET /public/:slug
 *
 * No authentication required. Increments view count and redirects
 * to a time-limited signed URL for the underlying file.
 */
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  const doc = await PublicDocument.findOne({ slug }).populate("file");
  if (!doc) {
    res.status(404).send("Document not found");
    return;
  }

  const file = isDocument(doc.file) ? doc.file : null;
  if (!file) {
    res.status(404).send("File not found");
    return;
  }

  // Increment view count (fire-and-forget — don't block the redirect)
  PublicDocument.findByIdAndUpdate(doc._id, { $inc: { viewCount: 1 } }).catch(
    () => {}
  );

  const signedUrl = await getFileSignedUrl(file._id.toString());
  res.redirect(302, signedUrl as string);
});

export default router;
