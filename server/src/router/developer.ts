import { Request, Response, Router } from "express";
import { Conversation } from "@models";
import { requireAuth, requireDeveloper } from "../lib/authMiddleware";

const router = Router();

// GET /api/developer/ratings
// Returns all rated assistant messages across all conversations.
router.get("/ratings", requireAuth, requireDeveloper, async (req: Request, res: Response) => {
  try {
    const { rating, reason, from, to } = req.query as {
      rating?: "up" | "down";
      reason?: string;
      from?: string;
      to?: string;
    };

    const convos = await Conversation.find({
      "messages.rating": { $exists: true },
    })
      .populate("user", "name")
      .populate("jobsiteId", "name")
      .populate("tenderId", "name")
      .lean();

    const results: any[] = [];

    for (const convo of convos) {
      const messages = convo.messages as any[];

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (!msg.rating) continue;

        // Apply filters
        if (rating && msg.rating !== rating) continue;
        if (reason && (!msg.ratingReasons || !msg.ratingReasons.includes(reason))) continue;
        if (from && msg.ratedAt && new Date(msg.ratedAt) < new Date(from)) continue;
        if (to && msg.ratedAt && new Date(msg.ratedAt) > new Date(to)) continue;

        // Find preceding user message for context
        const userMessage = messages
          .slice(0, i)
          .reverse()
          .find((m) => m.role === "user");

        const contextType = convo.jobsiteId
          ? "jobsite"
          : convo.tenderId
          ? "tender"
          : null;

        const context = convo.jobsiteId
          ? (convo.jobsiteId as any).name
          : convo.tenderId
          ? (convo.tenderId as any).name
          : "Unknown";

        const ratedByUser = convo.user as any;

        results.push({
          conversationId: convo._id.toString(),
          context,
          contextType,
          userMessage: userMessage?.content ?? "",
          assistantMessage: msg.content,
          rating: msg.rating,
          reasons: msg.ratingReasons,
          comment: msg.ratingComment,
          ratedAt: msg.ratedAt,
          ratedByUserId: ratedByUser?._id?.toString() ?? "",
          ratedByUserName: ratedByUser?.name ?? "",
        });
      }
    }

    // Sort newest first
    results.sort((a, b) => {
      if (!a.ratedAt) return 1;
      if (!b.ratedAt) return -1;
      return new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime();
    });

    res.json(results);
  } catch (err) {
    console.error("GET /developer/ratings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
