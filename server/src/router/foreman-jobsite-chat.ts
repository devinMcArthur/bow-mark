import { Router } from "express";
import mongoose from "mongoose";
import Anthropic from "@anthropic-ai/sdk";
import { Jobsite, User, System, EnrichedFile } from "@models";
import { isDocument } from "@typegoose/typegoose";
import { streamConversation, ToolExecutionResult } from "../lib/streamConversation";
import { buildFileIndex } from "../lib/buildFileIndex";
import { UserRoles } from "../typescript/user";
import { requireAuth } from "../lib/authMiddleware";
import { connectMcp } from "../lib/mcpClient";

// Foremen get the narrowest possible tool surface: document reading only.
// The MCP server exposes many other tools (tender pricing, analytics,
// financial data) — we allowlist by name so a field worker can never
// call a revenue query, a tender pricing lookup, or anything else
// regardless of what the MCP server adds in the future.
const FOREMAN_ALLOWED_TOOLS = new Set(["list_document_pages", "read_document"]);

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

  const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are a field assistant helping foremen and crew at Bow Mark, a paving and concrete company.

You are helping with jobsite: **${(jobsite as any).name}**${(jobsite as any).jobcode ? ` (Job Code: ${(jobsite as any).jobcode})` : ""}

## Jobsite Documents

${fileIndex || "No documents have been uploaded yet."}${pendingNotice}${specFileIndex ? `\n\n## Reference Specifications\n\n${specFileIndex}` : ""}
${decompositionBlock}
## Instructions

- Write at an 8th grade reading level. Use plain, simple language. Avoid jargon.
- Respond in the same language the user writes in. Workers may write in Spanish, French, or other languages — always reply in their language.
- Focus on practical, actionable information: what needs to be done, safety requirements, material specs for the current work.
- **Loading documents — two steps.** For documents with a page index, call list_document_pages first to see the page-by-page breakdown, then call read_document with only the specific pages you need. Only skip list_document_pages if the document has no page index.
- Load ONE document at a time. Never call read_document more than once per response.
- There is a strict 90-page limit per conversation turn.
- **Citations.** When you reference a specific fact, requirement, or drawing from a document, include a clickable page link in this format: **[[Document Type, p.X]](URL#page=X)**. Use the URL from the document list above. Only cite pages you have actually read. Tapping the link opens the document at that page.
- **Cross-references.** If a page references another drawing or standard, note it so the worker knows where else to look.
- **Completeness.** Before answering, confirm you have addressed all parts of the question.
- Keep answers short and focused. Workers are in the field.`;

  // ── Connect to MCP server with jobsite binding ────────────────────────────
  // The MCP doc tools load jobsite files from context and apply the per-file
  // minRole gate inside loadChatFiles, so foremen only see files they're
  // authorized for. The allowlist below prevents Claude from ever calling
  // any tool beyond document reading, regardless of what the MCP server
  // exposes in its tool list.
  const conn = await connectMcp(
    "foreman-jobsite-chat",
    "[foreman-jobsite-chat]",
    res,
    { authToken: req.token, jobsiteId },
  );
  if (!conn) return;

  const allowedTools = conn.tools.filter((t) =>
    FOREMAN_ALLOWED_TOOLS.has(t.name),
  );

  try {
    await streamConversation({
      res,
      userId: req.userId,
      conversationId,
      jobsiteId,
      chatType: "jobsite-foreman",
      messages,
      systemPrompt,
      tools: allowedTools,
      toolChoice: { type: "auto", disable_parallel_tool_use: true },
      maxTokens: 4096,
      executeTool: async (name, input): Promise<ToolExecutionResult> => {
        if (!FOREMAN_ALLOWED_TOOLS.has(name)) {
          throw new Error(`Tool ${name} is not available in this chat`);
        }
        const result = await conn.client.callTool({
          name,
          arguments: input as Record<string, unknown>,
        });
        const raw = result.content ?? [];
        const blocks: Array<{ type: string; text?: string }> =
          typeof raw === "string"
            ? [{ type: "text", text: raw }]
            : (raw as Array<{ type: string; text?: string }>);
        const firstText = blocks.find((b) => b.type === "text")?.text ?? "";
        const summary =
          firstText.length > 200
            ? firstText.slice(0, 200) + "…"
            : firstText || `${name} completed`;
        return { content: blocks as any, summary };
      },
      logPrefix: "[foreman-jobsite-chat]",
    });
  } finally {
    await conn.client.close().catch(() => undefined);
  }
});

export default router;
