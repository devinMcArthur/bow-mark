import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Jobsite, User, System, EnrichedFile } from "@models";
import { isDocument } from "@typegoose/typegoose";
import { streamConversation } from "../lib/streamConversation";
import { READ_DOCUMENT_TOOL, makeReadDocumentExecutor } from "../lib/readDocumentExecutor";
import { buildFileIndex } from "../lib/buildFileIndex";
import { UserRoles } from "../typescript/user";

const router = Router();

router.post("/message", async (req, res) => {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const token = req.headers.authorization;
  if (!token || !process.env.JWT_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let userId: string;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
    userId = decoded?.userId;
    if (!userId) {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const { messages, conversationId, jobsiteId } = req.body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    conversationId?: string;
    jobsiteId: string;
  };

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }
  if (!jobsiteId || !mongoose.isValidObjectId(jobsiteId)) {
    res.status(400).json({ error: "valid jobsiteId required" });
    return;
  }

  // ── Load context ──────────────────────────────────────────────────────────
  const [jobsite, systemDoc, user] = await Promise.all([
    Jobsite.findById(jobsiteId).lean(),
    System.getSystem(),
    User.findById(userId).populate("employee"),
  ]);

  if (!jobsite) {
    res.status(404).json({ error: "Jobsite not found" });
    return;
  }

  const employee = isDocument(user?.employee) ? user!.employee : null;
  const userContext = [
    user?.name && `The worker's name is ${user.name}.`,
    employee?.jobTitle && `Their job title is ${employee.jobTitle}.`,
  ]
    .filter(Boolean)
    .join(" ");

  // Foreman chat: respect per-file minRole access
  const userRole = user?.role ?? UserRoles.User;
  const allEntries = ((jobsite?.enrichedFiles ?? []) as any[]);
  const allowedEntries = allEntries.filter(
    (entry: any) => (entry.minRole ?? UserRoles.ProjectManager) <= userRole
  );
  const allowedEnrichedFileIds = allowedEntries.map((e: any) => e.enrichedFile);
  const jobsiteFiles = await EnrichedFile.find({ _id: { $in: allowedEnrichedFileIds } }).populate("file").lean();
  const specFiles = ((systemDoc?.specFiles ?? []) as any[]);

  const serverBase = process.env.API_BASE_URL || `${req.protocol}://${req.get("host")}`;
  const { fileIndex, specFileIndex, pendingNotice } = buildFileIndex(
    jobsiteFiles,
    specFiles,
    serverBase,
    token
  );

  const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are a field assistant helping foremen and crew at Bow-Mark, a paving and concrete company.

You are helping with jobsite: **${(jobsite as any).name}**${(jobsite as any).jobcode ? ` (Job Code: ${(jobsite as any).jobcode})` : ""}

## Jobsite Documents

${fileIndex || "No documents have been uploaded yet."}${pendingNotice}${specFileIndex ? `\n\n## Reference Specifications\n\n${specFileIndex}` : ""}

## Instructions

- Write at an 8th grade reading level. Use plain, simple language. Avoid jargon.
- Respond in the same language the user writes in. Workers may write in Spanish, French, or other languages — always reply in their language.
- Focus on practical, actionable information: what needs to be done, safety requirements, material specs for the current work.
- Use document summaries to find the right document, then use read_document to load it.
- Load ONE document at a time. Never call read_document more than once per response.
- There is a strict 90-page limit per conversation turn.
- When quoting requirements, include the page number: e.g. "According to the specs (p. 12)..."
- Keep answers short and focused. Workers are in the field.`;

  await streamConversation({
    res,
    userId,
    conversationId,
    jobsiteId,
    chatType: "jobsite-foreman",
    messages,
    systemPrompt,
    tools: [READ_DOCUMENT_TOOL],
    toolChoice: { type: "auto", disable_parallel_tool_use: true },
    maxTokens: 4096,
    executeTool: makeReadDocumentExecutor([...jobsiteFiles, ...specFiles]),
    logPrefix: "[foreman-jobsite-chat]",
  });
});

export default router;
