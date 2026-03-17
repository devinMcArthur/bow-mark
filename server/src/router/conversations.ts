import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Conversation, Jobsite, Tender } from "@models";

const VALID_REASONS = new Set([
  "wrong_answer",
  "hallucinated_citation",
  "couldnt_find_it",
  "wrong_document",
  "too_vague",
  "misunderstood_question",
]);

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
// ?jobsiteId=<id>  → jobsite-scoped conversations
// (no param)       → general (no context) conversations only
router.get("/", auth, async (req: any, res) => {
  try {
    const { jobsiteId, scope, chatType } = req.query as { jobsiteId?: string; scope?: string; chatType?: string };

    if (scope === "all") {
      // Return all conversations for this user across all contexts
      const convos = await Conversation.find(
        { user: req.userId },
        "title aiModel totalInputTokens totalOutputTokens updatedAt createdAt jobsiteId tenderId chatType"
      )
        .sort({ updatedAt: -1 })
        .lean();

      // Collect unique jobsite/tender IDs for name lookup
      const jobsiteIds = [...new Set(convos.filter((c: any) => c.jobsiteId).map((c: any) => c.jobsiteId!.toString()))];
      const tenderIds = [...new Set(convos.filter((c: any) => c.tenderId).map((c: any) => c.tenderId!.toString()))];

      const [jobsites, tenders] = await Promise.all([
        jobsiteIds.length > 0
          ? Jobsite.find({ _id: { $in: jobsiteIds } }, "name jobcode").lean()
          : [],
        tenderIds.length > 0
          ? Tender.find({ _id: { $in: tenderIds } }, "name").lean()
          : [],
      ]);

      const jobsiteMap = new Map((jobsites as any[]).map((j: any) => [j._id.toString(), j]));
      const tenderMap = new Map((tenders as any[]).map((t: any) => [t._id.toString(), t]));

      return res.json(
        convos.map((c: any) => {
          let context: { type: string; id: string; name: string } | undefined;
          if (c.jobsiteId) {
            const j = jobsiteMap.get(c.jobsiteId.toString()) as any;
            context = {
              type: "jobsite",
              id: c.jobsiteId.toString(),
              name: j ? (j.jobcode ? `${j.jobcode} — ${j.name}` : j.name) : "Unknown jobsite",
            };
          } else if (c.tenderId) {
            const t = tenderMap.get(c.tenderId.toString()) as any;
            context = {
              type: "tender",
              id: c.tenderId.toString(),
              name: t?.name ?? "Unknown tender",
            };
          }
          return {
            id: c._id.toString(),
            title: c.title,
            model: c.aiModel,
            totalInputTokens: c.totalInputTokens,
            totalOutputTokens: c.totalOutputTokens,
            updatedAt: c.updatedAt,
            createdAt: c.createdAt,
            ...(context ? { context } : {}),
            ...(c.chatType ? { chatType: c.chatType } : {}),
          };
        })
      );
    }

    const query: Record<string, unknown> = { user: req.userId };
    if (jobsiteId && mongoose.isValidObjectId(jobsiteId)) {
      query.jobsiteId = new mongoose.Types.ObjectId(jobsiteId);
      if (chatType) query.chatType = chatType;
    } else {
      // General chat: exclude any context-scoped conversations
      query.tenderId = { $exists: false };
      query.jobsiteId = { $exists: false };
    }

    const convos = await Conversation.find(
      query,
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
    const convo = await Conversation.findById(req.params.id).lean();
    if (!convo) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (String(convo.user) !== req.userId) {
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
    const convo = await Conversation.findById(req.params.id);
    if (!convo) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (String(convo.user) !== req.userId) {
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
    const convo = await Conversation.findById(req.params.id);
    if (!convo) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (String(convo.user) !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
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
    const convo = await Conversation.findById(req.params.id);
    if (!convo) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (String(convo.user) !== req.userId) {
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

// PATCH /conversations/:id/messages/:msgId/rating
router.patch("/:id/messages/:msgId/rating", auth, async (req: any, res) => {
  try {
    if (
      !mongoose.isValidObjectId(req.params.id) ||
      !mongoose.isValidObjectId(req.params.msgId)
    ) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const { rating, reasons, comment } = req.body as {
      rating: "up" | "down" | null;
      reasons?: string[];
      comment?: string;
    };

    if (rating !== "up" && rating !== "down" && rating !== null) {
      res.status(400).json({ error: "rating must be 'up', 'down', or null" });
      return;
    }

    if (rating === "down") {
      if (!reasons || !Array.isArray(reasons) || reasons.length === 0) {
        res.status(400).json({ error: "reasons required for downvote" });
        return;
      }
      if (reasons.some((r) => !VALID_REASONS.has(r))) {
        res.status(400).json({ error: "invalid reason value" });
        return;
      }
    }

    const convo = await Conversation.findById(req.params.id);
    if (!convo) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (String(convo.user) !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const msgs = convo.messages as any[];
    const msgIdx = msgs.findIndex((m) => String(m._id) === req.params.msgId);
    if (msgIdx === -1) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    if (rating === null) {
      msgs[msgIdx].rating = undefined;
      msgs[msgIdx].ratingReasons = undefined;
      msgs[msgIdx].ratingComment = undefined;
    } else if (rating === "up") {
      msgs[msgIdx].rating = "up";
      msgs[msgIdx].ratingReasons = undefined;
      msgs[msgIdx].ratingComment = undefined;
    } else {
      msgs[msgIdx].rating = "down";
      msgs[msgIdx].ratingReasons = reasons;
      msgs[msgIdx].ratingComment = comment || undefined;
    }

    convo.markModified("messages");
    await convo.save();

    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /conversations/:id/messages/:msgId/rating error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
