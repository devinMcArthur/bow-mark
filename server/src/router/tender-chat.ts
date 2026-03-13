import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Tender, User, System } from "@models";
import { isDocument } from "@typegoose/typegoose";
import { streamConversation } from "../lib/streamConversation";
import { READ_DOCUMENT_TOOL, makeReadDocumentExecutor } from "../lib/readDocumentExecutor";
import { buildFileIndex } from "../lib/buildFileIndex";

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
    User.findById(userId).populate("employee"),
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
    token
  );

  const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are an AI assistant helping to analyze tender documents for Bow-Mark, a paving and concrete company.

You are working on tender: **${tender.name}** (Job Code: ${tender.jobcode})${tender.description ? `\nTender description: ${tender.description}` : ""}

## Tender Documents

${fileIndex || "No tender documents have been processed yet."}${pendingNotice}${specFileIndex ? `\n\n## Reference Specifications (shared across all tenders)\n\n${specFileIndex}` : ""}

## Instructions

- Use document summaries to identify the most likely relevant document, then use read_document to load it.
- Load ONE document at a time. Never call read_document more than once per response — read a document, then answer. Only load a second document if the first was clearly insufficient.
- There is a strict 90-page limit per conversation turn across all loaded documents. Loading multiple large PDFs in one turn will fail.
- **Citations are mandatory.** Every specific fact, requirement, clause, section, or drawing you reference MUST include an inline page link. Use this format: **[[Document Type, p.X]](URL#page=X)** — the file URL comes from the document list above, with #page=X appended. If no URL is available use plain text: [Document Type, p.X].
- When you mention a specific drawing number (e.g. "Std Drawing 454.1010.004"), section number (e.g. "Section 3.4"), or clause, you must link to the page it appears on. If you are not certain of the exact page, give your best estimate from the page range you read and note it as approximate: **[[Std Drawing 454.1010.004, p.~47]](URL#page=47)**.
- Never name a drawing, section, or spec requirement without a page citation. A reference with no page number is incomplete.
- If a document is a drawing, describe what you see in the drawing as part of your answer.
- Be accurate. If you are unsure, say so and recommend the user verify in the source document.
- If a question spans multiple documents, answer from the most relevant one first and note which other documents may also contain relevant information.`;

  // ── Stream ─────────────────────────────────────────────────────────────────
  await streamConversation({
    res,
    userId,
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
