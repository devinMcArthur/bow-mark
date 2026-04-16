import Anthropic from "@anthropic-ai/sdk";
import { Router } from "express";
import mongoose from "mongoose";
import { Jobsite, User, System, EnrichedFile } from "@models";
import { isDocument } from "@typegoose/typegoose";
import { streamConversation, ToolExecutionResult } from "../lib/streamConversation";
import { buildFileIndex } from "../lib/buildFileIndex";
import { UserRoles } from "../typescript/user";
import { requireAuth } from "../lib/authMiddleware";
import { connectMcp } from "../lib/mcpClient";
import { adaptMcpContent, deriveSummary } from "../lib/mcpContentAdapter";

const router = Router();

router.post("/message", requireAuth, async (req, res) => {
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
    User.findById(req.userId).populate("employee"),
  ]);

  if (!jobsite) {
    res.status(404).json({ error: "Jobsite not found" });
    return;
  }

  // Server-side role guard: only PMs and Admins can use this endpoint
  if (!user || (user.role ?? UserRoles.User) < UserRoles.ProjectManager) {
    res.status(403).json({ error: "Forbidden: PM or Admin role required" });
    return;
  }

  const employee = isDocument(user?.employee) ? user!.employee : null;
  const userContext = [
    user?.name && `The user's name is ${user.name}.`,
    employee?.jobTitle && `Their job title is ${employee.jobTitle}.`,
  ]
    .filter(Boolean)
    .join(" ");

  // PM chat: full PM-level document access
  // Default to UserRoles.User (least privilege) when role is unknown
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
    req.token
  );

  // ── Query decomposition ────────────────────────────────────────────────────
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  let decomposedQuestions: string[] = [];
  if (lastUserMessage.trim()) {
    try {
      const anthropicForDecomp = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const decompResponse = await anthropicForDecomp.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `Does this question contain multiple distinct parts that should each be answered separately from a document?
If yes, list each part as a short, focused question (one per line, no numbering or bullets).
If no, reply with exactly: SINGLE

Question: "${lastUserMessage}"`,
          },
        ],
      });
      const decompText =
        decompResponse.content[0]?.type === "text"
          ? decompResponse.content[0].text.trim()
          : "SINGLE";
      if (decompText !== "SINGLE") {
        decomposedQuestions = decompText
          .split("\n")
          .map((q) => q.trim())
          .filter(Boolean);
      }
    } catch {
      // Non-fatal — proceed without decomposition
    }
  }

  const decompositionBlock =
    decomposedQuestions.length > 1
      ? `\n## This Question\nThis question has multiple parts — address each one:\n${decomposedQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n`
      : "";

  const APP_NAME = process.env.APP_NAME || "paving";

  const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are a Project Manager assistant for Bow Mark's ${APP_NAME} division.

You are currently focused on jobsite: **${(jobsite as any).name}**${(jobsite as any).jobcode ? ` (Job Code: ${(jobsite as any).jobcode})` : ""}${(jobsite as any).description ? `\nJobsite description: ${(jobsite as any).description}` : ""}

You have access to two types of tools:
1. **list_document_pages** / **read_document** — navigate and read jobsite specification and contract documents
2. **Analytics tools** — query the company's PostgreSQL reporting database for financial performance, productivity metrics, crew data, and more

## Jobsite Documents

${fileIndex || "No documents have been uploaded yet."}${pendingNotice}${specFileIndex ? `\n\n## Reference Specifications\n\n${specFileIndex}` : ""}
${decompositionBlock}
## Instructions

- For questions about specifications, contracts, or compliance: use document tools.
- For questions about financial performance, productivity, crew hours, material costs, or comparisons: use analytics tools.
- **Loading documents — two steps.** For documents with a page index, call list_document_pages first to see the page-by-page breakdown, then call read_document with only the specific pages you need. Only skip list_document_pages if the document has no page index.
- **Clarify before assuming.** If a question could apply to more than one thing, ask which one the user means before loading a document.
- **Cross-references.** When you read a page that references another drawing, document, or standard, note it explicitly. Follow it automatically if it directly answers the question.
- **Completeness.** Before giving your final answer, confirm you have addressed all parts of the question.
- You can compare this jobsite to others — analytics tools are company-wide, not restricted to this jobsite.
- Always use tools to fetch real data. Do not make up numbers.
- When asked about this jobsite's performance, use search_jobsites to find it by jobcode/name, then fetch data.
- Format currency as $X,XXX,XXX. Format percentages to one decimal place. Format tonnes/hour to two decimal places.
- Be concise and lead with the key numbers or findings, then provide context.
- Link named entities when their ID is known from tool results:
  - Jobsite: [Name](/jobsite/{mongo_id})
  - Daily report: [date](/daily-report/{mongo_id})
  - Employee: [Name](/employee/{mongo_id})
- Citations for document quotes: **[[Document Type, p.X]](URL#page=X)**`;

  // ── Connect to MCP server with jobsite binding ────────────────────────────
  // The MCP server's read_document / list_document_pages tools now handle
  // jobsite context via X-Jobsite-Id and apply per-file minRole filtering
  // inside loadChatFiles, so we no longer need inline doc tools here.
  const conn = await connectMcp(
    "bow-mark-pm-chat",
    "[pm-jobsite-chat]",
    res,
    { authToken: req.token, jobsiteId },
  );
  if (!conn) return;

  try {
    await streamConversation({
      res,
      userId: req.userId,
      conversationId,
      jobsiteId,
      chatType: "jobsite-pm",
      messages,
      systemPrompt,
      tools: conn.tools,
      maxTokens: 8192,
      executeTool: async (name, input): Promise<ToolExecutionResult> => {
        const result = await conn.client.callTool({
          name,
          arguments: input as Record<string, unknown>,
        });
        const blocks = adaptMcpContent(result.content);
        return {
          content: blocks as any,
          summary: deriveSummary(blocks, name),
        };
      },
      logPrefix: "[pm-jobsite-chat]",
    });
  } finally {
    await conn.client.close().catch(() => undefined);
  }
});

export default router;
