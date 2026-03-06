import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { ChatConversation } from "../models/ChatConversation";

const router = Router();

// Middleware: verify JWT and extract userId
const auth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization;
  if (!token || !process.env.JWT_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    req.userId = decoded?.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// GET /conversations — list user's conversations (no messages)
router.get("/", auth, async (req: any, res) => {
  const convos = await ChatConversation.find(
    { user: req.userId },
    "title model totalInputTokens totalOutputTokens updatedAt createdAt"
  )
    .sort({ updatedAt: -1 })
    .lean();

  res.json(
    convos.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      model: c.model,
      totalInputTokens: c.totalInputTokens,
      totalOutputTokens: c.totalOutputTokens,
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    }))
  );
});

// GET /conversations/:id — full conversation
router.get("/:id", auth, async (req: any, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const convo = await ChatConversation.findById(req.params.id).lean();
  if (!convo) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (convo.user.toString() !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json({
    id: convo._id.toString(),
    title: convo.title,
    model: convo.model,
    messages: convo.messages,
    totalInputTokens: convo.totalInputTokens,
    totalOutputTokens: convo.totalOutputTokens,
    updatedAt: convo.updatedAt,
    createdAt: convo.createdAt,
  });
});

// PATCH /conversations/:id/title — rename
router.patch("/:id/title", auth, async (req: any, res) => {
  const { title } = req.body as { title: string };
  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title required" });
    return;
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const convo = await ChatConversation.findById(req.params.id);
  if (!convo) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (convo.user.toString() !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  convo.title = title.trim();
  await convo.save();
  res.json({ id: convo._id.toString(), title: convo.title });
});

// DELETE /conversations/:id
router.delete("/:id", auth, async (req: any, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const convo = await ChatConversation.findById(req.params.id);
  if (!convo) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (convo.user.toString() !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await convo.deleteOne();
  res.json({ success: true });
});

export default router;
