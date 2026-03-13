import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Jobsite, User, System, EnrichedFile } from "@models";
import { isDocument } from "@typegoose/typegoose";
import { streamConversation } from "../lib/streamConversation";
import { READ_DOCUMENT_TOOL, makeReadDocumentExecutor } from "../lib/readDocumentExecutor";
import { UserRoles } from "../typescript/user";

const router = Router();

router.post("/message", async (req, res) => {
  // ── Auth ───────────────────────────────────────────────────────────────────
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
  if (!jobsiteId) {
    res.status(400).json({ error: "jobsiteId required" });
    return;
  }
  if (!mongoose.isValidObjectId(jobsiteId)) {
    res.status(400).json({ error: "Invalid jobsiteId" });
    return;
  }

  // ── Load context data ──────────────────────────────────────────────────────
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
    user?.name && `The user's name is ${user.name}.`,
    employee?.jobTitle && `Their job title is ${employee.jobTitle}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const userRole = user?.role ?? UserRoles.User;
  const allEntries = ((jobsite?.enrichedFiles ?? []) as any[]);
  const allowedEntries = allEntries.filter(
    (entry: any) => (entry.minRole ?? UserRoles.ProjectManager) <= userRole
  );
  const allowedEnrichedFileIds = allowedEntries.map((e: any) => e.enrichedFile);
  const jobsiteFiles = await EnrichedFile.find({ _id: { $in: allowedEnrichedFileIds } }).populate("file").lean();
  const specFiles = ((systemDoc?.specFiles ?? []) as any[]);
  const readyFiles = jobsiteFiles.filter((f: any) => f.summaryStatus === "ready");
  const pendingFiles = jobsiteFiles.filter(
    (f: any) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
  );
  const readySpecFiles = specFiles.filter((f: any) => f.summaryStatus === "ready");

  const serverBase = process.env.API_BASE_URL || `${req.protocol}://${req.get("host")}`;

  const buildFileEntry = (f: any) => {
    const summary = f.summary as any;
    const chunks = summary?.chunks as Array<{ startPage: number; endPage: number; overview: string; keyTopics: string[] }> | undefined;
    const chunkIndex =
      chunks && chunks.length > 1
        ? `\nPage Sections:\n${chunks.map((c) => `  Pages ${c.startPage}–${c.endPage}: ${c.keyTopics.slice(0, 6).join(", ")}`).join("\n")}`
        : "";
    return [
      `**File ID: ${f._id}**`,
      `Type: ${summary?.documentType || f.documentType || "Unknown"}`,
      `URL: ${serverBase}/api/enriched-files/${f._id}?token=${token}`,
      summary
        ? `Overview: ${summary.overview}\nKey Topics: ${(summary.keyTopics as string[]).join(", ")}${chunkIndex}`
        : "Summary: not yet available",
    ].join("\n");
  };

  const fileIndex = readyFiles.map(buildFileEntry).join("\n\n---\n\n");
  const specFileIndex = readySpecFiles.map(buildFileEntry).join("\n\n---\n\n");
  const pendingNotice =
    pendingFiles.length > 0
      ? `\n\nNOTE: ${pendingFiles.length} document(s) are still being processed and are not yet available.`
      : "";

  const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are an AI assistant helping with jobsite documents for Bow-Mark, a paving and concrete company.

You are working on jobsite: **${jobsite.name}**${(jobsite as any).jobcode ? ` (Job Code: ${(jobsite as any).jobcode})` : ""}${(jobsite as any).description ? `\nJobsite description: ${(jobsite as any).description}` : ""}

## Jobsite Documents

${fileIndex || "No documents have been uploaded yet."}${pendingNotice}${specFileIndex ? `\n\n## Reference Specifications (shared across all jobsites)\n\n${specFileIndex}` : ""}

## Instructions

- Use document summaries to identify the most likely relevant document, then use read_document to load it.
- Load ONE document at a time. Never call read_document more than once per response.
- There is a strict 90-page limit per conversation turn across all loaded documents.
- **Citations are mandatory.** Every specific fact, requirement, clause, or drawing you reference MUST include an inline page link. Use this format: **[[Document Type, p.X]](URL#page=X)**
- Be accurate. If you are unsure, say so and recommend the user verify in the source document.`;

  // ── Stream ─────────────────────────────────────────────────────────────────
  await streamConversation({
    res,
    userId,
    conversationId,
    jobsiteId,
    messages,
    systemPrompt,
    tools: [READ_DOCUMENT_TOOL],
    toolChoice: { type: "auto", disable_parallel_tool_use: true },
    maxTokens: 8192,
    executeTool: makeReadDocumentExecutor([...jobsiteFiles, ...specFiles]),
    logPrefix: "[jobsite-chat]",
  });
});

export default router;
