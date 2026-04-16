import { Router } from "express";
import mongoose from "mongoose";
import Anthropic from "@anthropic-ai/sdk";
import { Tender, User, System } from "@models";
import { isDocument } from "@typegoose/typegoose";
import { streamConversation, ToolExecutionResult } from "../lib/streamConversation";
import { connectMcp } from "../lib/mcpClient";
import { buildFileIndex } from "../lib/buildFileIndex";
import { requireAuth } from "../lib/authMiddleware";
import { UserRoles } from "../typescript/user";

const router = Router();

router.post("/message", requireAuth, async (req, res) => {
  const { messages, conversationId, tenderId } = req.body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    conversationId?: string;
    tenderId: string;
  };

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }
  if (!tenderId) {
    res.status(400).json({ error: "tenderId required" });
    return;
  }
  if (!mongoose.isValidObjectId(tenderId)) {
    res.status(400).json({ error: "Invalid tenderId" });
    return;
  }

  // ── Load context data ──────────────────────────────────────────────────────
  const [tender, systemDoc, user] = await Promise.all([
    Tender.findById(tenderId)
      .populate({ path: "files", populate: { path: "file" } })
      .populate({ path: "notes.savedBy", select: "name" })
      .lean(),
    System.getSystem(),
    User.findById(req.userId).populate("employee"),
  ]);

  if (!tender) {
    res.status(404).json({ error: "Tender not found" });
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

  const tenderFiles = (tender.files as any[]);
  const specFiles = ((systemDoc?.specFiles ?? []) as any[]);

  const serverBase = process.env.API_BASE_URL || `${req.protocol}://${req.get("host")}`;
  const { fileIndex, specFileIndex, pendingNotice } = buildFileIndex(
    tenderFiles,
    specFiles,
    serverBase,
    req.token
  );

  // ── Notes context ──────────────────────────────────────────────────────────
  const tenderNotes = ((tender as any).notes ?? []) as Array<{
    _id: any;
    content: string;
    savedBy?: any;
    savedAt: Date;
  }>;

  const notesBlock =
    tenderNotes.length > 0
      ? `\n\n## Job Notes\n${tenderNotes
          .map((n) => {
            const who = n.savedBy?.name ?? "team";
            const when = new Date(n.savedAt).toLocaleDateString();
            return `- [id:${n._id}] ${n.content} (saved by ${who}, ${when})`;
          })
          .join("\n")}`
      : "";

  const jobSummary = (tender as any).jobSummary as
    | { content: string; generatedAt: Date }
    | undefined;

  const summaryBlock = jobSummary?.content
    ? `\n\n## Job Summary\n${jobSummary.content}`
    : "";

  // ── Query decomposition ────────────────────────────────────────────────────
  // Split multi-part questions into focused sub-questions before the main call.
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

  const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are an AI assistant helping estimators analyze tender documents for Bow Mark, a paving and concrete company. The people using this tool are pricing jobs, planning execution, and writing bid proposals — their questions are typically about scope, quantities, spec constraints, sequencing, equipment needs, and anything that would affect cost or how the job gets built.

You are working on tender: **${tender.name}** (Job Code: ${tender.jobcode})${tender.description ? `\nTender description: ${tender.description}` : ""}

## Tender Documents

${fileIndex || "No tender documents have been processed yet."}${pendingNotice}${specFileIndex ? `\n\n## Reference Specifications (shared across all tenders)\n\n${specFileIndex}` : ""}${notesBlock}${summaryBlock}
${decompositionBlock}
## Instructions

**Clarify before assuming.** Construction documents often contain multiple instances of similar things — two crossings, two structures, two phases, two contract items with similar names. If a question could apply to more than one thing, ask which one the user means before loading a document.

**Ask when uncertain.** If you read a document and are not confident it contains the answer, say so explicitly and ask the user if they want you to look in a different document or provide more context. Do not guess or fill gaps with general knowledge.

**Loading documents — two steps.** For documents that have a page index, call list_document_pages first to see the page-by-page breakdown, then call read_document with only the specific pages you need. This is much cheaper and faster than loading large page ranges blindly. Only skip list_document_pages if the document has no page index (the navigation hint will say so).

**Citations.** When you reference a specific fact, requirement, section, or drawing from a document you have read, include a page link in this format: **[[Document Type, p.X]](URL#page=X)**. Only cite pages you have actually read. If you are not certain of the exact page, note it as approximate: **[[Spec, p.~12]](URL#page=12)**.

**Drawings.** If a document is a drawing, describe what you see as part of your answer.

**Cross-references.** When you read a page that references another drawing, document, or standard (e.g. "see Drawing C-3", "per OPSS 1150"), note it explicitly. If it directly answers the question, follow it automatically. If tangential, mention it so the user can decide whether to pursue it.

**Completeness.** Before giving your final answer, confirm you have addressed all parts of the question. If you found cross-references you have not checked, note what is outstanding so the user can decide.

**Saving job notes.** If the user mentions something important that is not in the documents — owner preferences, site context, verbal agreements, known risks — draft a 1-2 sentence note and ask "Should I save that to the job notes?" before calling save_tender_note. Never save without explicit confirmation.

**Addendum synthesis.** When answering questions about scope, requirements, or quantities, always reflect the net state after all addendums. If an addendum modifies or adds a work item, your answer should incorporate that change — not just the original documents. If you find a conflict between an addendum and the original spec, the addendum takes precedence; note the conflict explicitly.

**Scope.** Answer only from the tender documents, reference specs, and job notes provided. If the answer is not in the documents, say so clearly rather than drawing on general knowledge.

## Pricing sheet edits

When creating or updating line items on the pricing sheet:

**Work in batches.** Never create more than 25–50 rows in a single call. After each batch, call get_tender_pricing_rows to verify the results are correct before continuing with the next batch. If the schedule of quantities has 100+ items, tell the user you'll work through it in sections.

**Spec references are the priority.** Every line item should have a specification reference (docRef) if one exists in the uploaded documents. Look for the spec first — drawing references are supplementary (nice-to-have, not required). If you can find the spec but not a drawing, add the spec. If you can find a drawing but not the spec, add the drawing AND add a note: "Spec reference not found in uploaded documents."

**Be confident or explicit.** Only add a docRef or note when you are confident it is correct. If you cannot find a specification or drawing for a line item, do not guess — instead add a note stating what you looked for and could not find (e.g. "No spec found for granular base course — checked OPSS index, not listed"). Never leave a line item silently without references.

**Self-correct.** After creating rows and verifying with get_tender_pricing_rows, review your own work. If you added an incorrect note or doc reference, use replaceNotes to fix the note or removeDocRefIds to remove the bad reference. Do not leave incorrect references in place.`;

  // ── Connect to MCP server (auth + tender + conversation bound via headers) ─
  const conn = await connectMcp(
    "tender-chat",
    "[tender-chat]",
    res,
    { authToken: req.token, tenderId, conversationId },
  );
  if (!conn) return; // connectMcp already wrote the 503

  try {
    await streamConversation({
      res,
      userId: req.userId,
      conversationId,
      tenderId,
      messages,
      systemPrompt,
      tools: conn.tools,
      toolChoice: { type: "auto", disable_parallel_tool_use: true },
      maxTokens: 8192,
      executeTool: async (name, input): Promise<ToolExecutionResult> => {
        const result = await conn.client.callTool({
          name,
          arguments: input as Record<string, unknown>,
        });
        // MCP returns content as either an array of typed blocks or a plain
        // string (the spreadsheet branch of read_document does the latter).
        // Normalize to an array of blocks before deriving the summary.
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
        return {
          content: blocks as any,
          summary,
        };
      },
      logPrefix: "[tender-chat]",
    });
  } finally {
    await conn.client.close().catch(() => undefined);
  }
});

export default router;
