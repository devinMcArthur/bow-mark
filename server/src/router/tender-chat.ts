import { Router } from "express";
import mongoose from "mongoose";
import { Tender, User, System } from "@models";
import { isDocument } from "@typegoose/typegoose";
import { streamConversation } from "../lib/streamConversation";
import { READ_DOCUMENT_TOOL, makeReadDocumentExecutor } from "../lib/readDocumentExecutor";
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

  const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are an AI assistant helping to analyze tender documents for Bow-Mark, a paving and concrete company.

You are working on tender: **${tender.name}** (Job Code: ${tender.jobcode})${tender.description ? `\nTender description: ${tender.description}` : ""}

## Tender Documents

${fileIndex || "No tender documents have been processed yet."}${pendingNotice}${specFileIndex ? `\n\n## Reference Specifications (shared across all tenders)\n\n${specFileIndex}` : ""}

## Instructions

**Clarify before assuming.** Construction documents often contain multiple instances of similar things — two crossings, two structures, two phases, two contract items with similar names. If a question could apply to more than one thing, ask which one the user means before loading a document. It is better to ask one focused question than to answer the wrong thing confidently.

**Ask when uncertain.** If you read a document and are not confident it contains the answer, say so explicitly and ask the user if they want you to look in a different document or provide more context. Do not guess or fill gaps with general knowledge.

**Loading documents.** Use the document summaries and filenames to identify the most relevant file, then use read_document to load it. Load one document at a time. If the first document doesn't contain what you need, say so and ask the user whether to try another. Be aware that information about a single item — a crossing, a structure, a detail — can span multiple drawings. If a document references another drawing by number, note it and offer to check that drawing as well.

**Citations.** When you reference a specific fact, requirement, section, or drawing from a document you have read, include a page link in this format: **[[Document Type, p.X]](URL#page=X)**. Only cite pages you have actually read — do not guess page numbers. If you are not certain of the exact page, note it as approximate: **[[Spec, p.~12]](URL#page=12)**.

**Drawings.** If a document is a drawing, describe what you see as part of your answer.

**Scope.** Answer only from the tender documents and reference specs provided. If the answer is not in the documents, say so clearly rather than drawing on general knowledge.`;

  // ── Stream ─────────────────────────────────────────────────────────────────
  await streamConversation({
    res,
    userId: req.userId,
    conversationId,
    tenderId,
    messages,
    systemPrompt,
    tools: [READ_DOCUMENT_TOOL],
    toolChoice: { type: "auto", disable_parallel_tool_use: true },
    maxTokens: 8192,
    executeTool: makeReadDocumentExecutor([...tenderFiles, ...specFiles]),
    logPrefix: "[tender-chat]",
  });
});

export default router;
