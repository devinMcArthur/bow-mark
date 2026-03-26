import { Router } from "express";
import mongoose from "mongoose";
import Anthropic from "@anthropic-ai/sdk";
import { Tender, User, System } from "@models";
import { isDocument } from "@typegoose/typegoose";
import { streamConversation } from "../lib/streamConversation";
import { READ_DOCUMENT_TOOL, LIST_DOCUMENT_PAGES_TOOL, makeReadDocumentExecutor } from "../lib/readDocumentExecutor";
import { buildFileIndex } from "../lib/buildFileIndex";
import { requireAuth } from "../lib/authMiddleware";

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
      .lean(),
    System.getSystem(),
    User.findById(req.userId).populate("employee"),
  ]);

  if (!tender) {
    res.status(404).json({ error: "Tender not found" });
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

  const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are an AI assistant helping to analyze tender documents for Bow-Mark, a paving and concrete company.

You are working on tender: **${tender.name}** (Job Code: ${tender.jobcode})${tender.description ? `\nTender description: ${tender.description}` : ""}

## Tender Documents

${fileIndex || "No tender documents have been processed yet."}${pendingNotice}${specFileIndex ? `\n\n## Reference Specifications (shared across all tenders)\n\n${specFileIndex}` : ""}
${decompositionBlock}
## Instructions

**Clarify before assuming.** Construction documents often contain multiple instances of similar things — two crossings, two structures, two phases, two contract items with similar names. If a question could apply to more than one thing, ask which one the user means before loading a document.

**Ask when uncertain.** If you read a document and are not confident it contains the answer, say so explicitly and ask the user if they want you to look in a different document or provide more context. Do not guess or fill gaps with general knowledge.

**Loading documents — two steps.** For documents that have a page index, call list_document_pages first to see the page-by-page breakdown, then call read_document with only the specific pages you need. This is much cheaper and faster than loading large page ranges blindly. Only skip list_document_pages if the document has no page index (the navigation hint will say so).

**Citations.** When you reference a specific fact, requirement, section, or drawing from a document you have read, include a page link in this format: **[[Document Type, p.X]](URL#page=X)**. Only cite pages you have actually read. If you are not certain of the exact page, note it as approximate: **[[Spec, p.~12]](URL#page=12)**.

**Drawings.** If a document is a drawing, describe what you see as part of your answer.

**Cross-references.** When you read a page that references another drawing, document, or standard (e.g. "see Drawing C-3", "per OPSS 1150"), note it explicitly. If it directly answers the question, follow it automatically. If tangential, mention it so the user can decide whether to pursue it.

**Completeness.** Before giving your final answer, confirm you have addressed all parts of the question. If you found cross-references you have not checked, note what is outstanding so the user can decide.

**Scope.** Answer only from the tender documents and reference specs provided. If the answer is not in the documents, say so clearly rather than drawing on general knowledge.`;

  // ── Stream ─────────────────────────────────────────────────────────────────
  await streamConversation({
    res,
    userId: req.userId,
    conversationId,
    tenderId,
    messages,
    systemPrompt,
    tools: [LIST_DOCUMENT_PAGES_TOOL, READ_DOCUMENT_TOOL],
    toolChoice: { type: "auto", disable_parallel_tool_use: true },
    maxTokens: 8192,
    executeTool: makeReadDocumentExecutor([...tenderFiles, ...specFiles]),
    logPrefix: "[tender-chat]",
  });
});

export default router;
