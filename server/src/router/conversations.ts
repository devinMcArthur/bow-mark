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
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
    req.userId = decoded?.userId;
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// GET /conversations — list user's conversations (no messages)
router.get("/", auth, async (req: any, res) => {
  try {
    const convos = await ChatConversation.find(
      { user: req.userId },
      "title aiModel totalInputTokens totalOutputTokens updatedAt createdAt"
    )
      .sort({ updatedAt: -1 })
      .lean();

    res.json(
      convos.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        model: c.aiModel,
        totalInputTokens: c.totalInputTokens,
        totalOutputTokens: c.totalOutputTokens,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
      }))
    );
  } catch (err) {
    console.error("GET /conversations error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /conversations/:id — full conversation
router.get("/:id", auth, async (req: any, res) => {
  try {
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
      model: convo.aiModel,
      messages: convo.messages,
      totalInputTokens: convo.totalInputTokens,
      totalOutputTokens: convo.totalOutputTokens,
      updatedAt: convo.updatedAt,
      createdAt: convo.createdAt,
    });
  } catch (err) {
    console.error("GET /conversations/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /conversations/:id/title — rename
router.patch("/:id/title", auth, async (req: any, res) => {
  try {
    const { title } = req.body as { title: string };
    if (!title || typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "title required" });
      return;
    }
    if (title.trim().length > 200) {
      res.status(400).json({ error: "title too long (max 200 characters)" });
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
  } catch (err) {
    console.error("PATCH /conversations/:id/title error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /conversations/:id/last-exchange — remove last user+assistant pair
router.delete("/:id/last-exchange", auth, async (req: any, res) => {
  try {
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
    // Find the last user message and trim from there
    const msgs = convo.messages as any[];
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) {
      res.status(400).json({ error: "No exchange to remove" });
      return;
    }
    convo.messages = msgs.slice(0, lastUserIdx) as any;
    await convo.save();
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /conversations/:id/last-exchange error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /conversations/:id
router.delete("/:id", auth, async (req: any, res) => {
  try {
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
  } catch (err) {
    console.error("DELETE /conversations/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
