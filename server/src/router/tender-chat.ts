import { Router } from "express";
import mongoose from "mongoose";
import Anthropic from "@anthropic-ai/sdk";
import { Tender, User } from "@models";
import { isDocument } from "@typegoose/typegoose";
import { streamConversation, ToolExecutionResult } from "../lib/streamConversation";
import { connectMcp } from "../lib/mcpClient";
import { adaptMcpContent, deriveSummary } from "../lib/mcpContentAdapter";
import { buildFileIndex } from "../lib/buildFileIndex";
import { requireAuth } from "../lib/authMiddleware";
import { UserRoles } from "../typescript/user";
import { resolveDocumentsForContext } from "../lib/fileDocuments/resolveDocumentsForContext";

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
  const [tender, user] = await Promise.all([
    Tender.findById(tenderId)
      .populate({ path: "notes.savedBy", select: "name" })
      .lean(),
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

  // Resolve documents with role filtering applied (hides files whose
  // minRole exceeds the viewer's role, if any were set on the tender side).
  const userRole = user.role ?? UserRoles.User;
  const [tenderFiles, specFiles] = await Promise.all([
    resolveDocumentsForContext({
      scope: "tender",
      entityId: new mongoose.Types.ObjectId(tenderId),
      userRole,
    }),
    resolveDocumentsForContext({ scope: "system", userRole }),
  ]);

  const employee = isDocument(user?.employee) ? user!.employee : null;
  const userContext = [
    user?.name && `The user's name is ${user.name}.`,
    employee?.jobTitle && `Their job title is ${employee.jobTitle}.`,
  ]
    .filter(Boolean)
    .join(" ");

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

**HARD RULE — cite or disclaim.** Every factual claim you make about this project MUST include a citation to a specific document and page you have actually loaded and read. If you cannot point to a specific page that supports what you are about to say, you MUST say "I was not able to find this in the uploaded documents" instead of stating it as fact. This applies especially to:
- Where something appears on a drawing ("shown on sheet C-3" — only say this if you loaded and read sheet C-3)
- What a spec requires ("OPSS 1150 requires..." — only say this if you loaded and read that spec page)
- Quantities, dimensions, or locations ("the 300mm storm sewer runs along..." — only if you read the page showing it)

Do NOT rely on general construction knowledge to fill gaps. If the documents don't contain the answer, say so. Being wrong is far more costly to an estimator than saying "I don't know — I checked these documents and couldn't find it."

**Self-check before responding.** Before you state where something is located on a drawing or what a spec says, verify: did I actually call read_document and load that specific page? If the answer is no, you are about to hallucinate. Stop, and either load the page first or tell the user you haven't been able to find it.

**Folder context.** Files are organized into folders (e.g. /Specs, /Drawings, /Addendums) — each entry in the document list shows its folder with "in /FolderName". Treat folder placement as a signal about how the user has categorized the file, not as ground truth. If the filename or contents clearly conflict with the folder (e.g. addendum-3.pdf sitting at the root, or a drawing filed under /Specs), trust the filename and contents over the folder. Folder hints are most useful when the filename alone is ambiguous — an /Addendums folder, for example, is a strong signal that files inside it are addendums even if the filenames are generic.

**Clarify before assuming.** Construction documents often contain multiple instances of similar things — two crossings, two structures, two phases, two contract items with similar names. If a question could apply to more than one thing, ask which one the user means before loading a document.

**Loading documents — two steps.** For documents that have a page index, call list_document_pages first to see the page-by-page breakdown, then call read_document with only the specific pages you need. This is much cheaper and faster than loading large page ranges blindly. Only skip list_document_pages if the document has no page index (the navigation hint will say so).

**Citations.** When you reference a specific fact, requirement, section, or drawing from a document you have read, include a page link in this format: **[[Document Type, p.X]](URL#page=X)**. Only cite pages you have actually read. If you are not certain of the exact page, note it as approximate: **[[Spec, p.~12]](URL#page=12)**.

**Naming files.** Whenever you name any file in prose — answering "do you have X?", listing files, describing what's attached — render the filename as a markdown link to its document URL. Use the filename text inside the brackets and the exact URL given in the Tender Documents section, e.g. **[[tender-spec-2026.pdf]](URL)**. NEVER output a raw "File ID: xxx" or ObjectId in the answer; users expect clickable file references, not identifiers.

**Drawings.** If a document is a drawing, describe what you see as part of your answer.

**Cross-references.** When you read a page that references another drawing, document, or standard (e.g. "see Drawing C-3", "per OPSS 1150"), note it explicitly. If it directly answers the question, follow it automatically. If tangential, mention it so the user can decide whether to pursue it.

**Completeness.** Before giving your final answer, confirm you have addressed all parts of the question. If you found cross-references you have not checked, note what is outstanding so the user can decide.

**When you can't find something.** If you've searched the available documents and can't locate what the user is asking about, say so directly: "I searched [list which documents you checked] and was not able to find [what they asked about]. It may be in a document that hasn't been uploaded, or I may have missed it — would you like me to check specific pages?" This is infinitely more helpful than guessing.

**Saving job notes.** If the user mentions something important that is not in the documents — owner preferences, site context, verbal agreements, known risks — draft a 1-2 sentence note and ask "Should I save that to the job notes?" before calling save_tender_note. Never save without explicit confirmation.

**Addendum synthesis.** When answering questions about scope, requirements, or quantities, always reflect the net state after all addendums. If an addendum modifies or adds a work item, your answer should incorporate that change — not just the original documents. If you find a conflict between an addendum and the original spec, the addendum takes precedence; note the conflict explicitly.

**Scope.** Answer only from the tender documents, reference specs, and job notes provided. If the answer is not in the documents, say so clearly rather than drawing on general knowledge.

## Pricing sheet edits

When creating or updating line items on the pricing sheet:

**Work in batches.** Never create more than 25–50 rows in a single call. After each batch, call get_tender_pricing_rows to verify the results are correct before continuing with the next batch. If the schedule of quantities has 100+ items, tell the user you'll work through it in sections.

**Three-tier referencing.** For every line item, attempt to find BOTH a specification reference and a drawing location. Your note must reflect which tier the item falls into:

1. **Found both** — add the spec docRef + drawing docRef. Note includes the spec section and where it appears on the drawing (sheet number, label/callout text you read).
2. **Found spec only** — add the spec docRef. Note: "Spec: [section]. Drawing location: NOT FOUND — searched sheets [list which you checked]. Manual review needed."
3. **Found neither** — no docRefs. Note: "NEEDS REVIEW — no spec or drawing reference found. Searched: [list documents/pages checked]."

Spec references come from text-searchable spec books — you CAN reliably find these by reading tables of contents and section headings. Drawing locations are harder: you can only find items that are LABELED on drawings (callout tags, legend entries, title block references, detail labels). You CANNOT trace unlabeled lines, measure pipe runs, or identify items that are only represented visually without a text label. When a drawing doesn't have a clear label for an item, say so — do not guess based on what typically appears on construction drawings.

**Confidence rule.** Only add a docRef when you have loaded the page AND can see the item referenced on it. Never add a speculative docRef. A note saying "NOT FOUND" with which documents you searched is far more useful to the estimator than a wrong reference they'll waste time chasing.

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
        const blocks = adaptMcpContent(result.content);
        return {
          content: blocks as any,
          summary: deriveSummary(blocks, name),
        };
      },
      logPrefix: "[tender-chat]",
    });
  } finally {
    await conn.client.close().catch(() => undefined);
  }
});

export default router;
