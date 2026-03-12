import Anthropic from "@anthropic-ai/sdk";
import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { PDFDocument } from "pdf-lib";
import { Tender, User, System } from "@models";
import { TenderConversation } from "../models/TenderConversation";
import { getFile } from "@utils/fileStorage";
import { isDocument } from "@typegoose/typegoose";
import { IToolResult } from "../models/ChatConversation";

// Max PDF bytes to send in a single document block (~4 MB base64 after encoding)
const MAX_READABLE_PDF_BYTES = 3 * 1024 * 1024;

const router = Router();

const READ_DOCUMENT_TOOL: Anthropic.Tool = {
  name: "read_document",
  description:
    "Load the contents of one specific document. For large documents (spec books, etc.) only a page range is loaded at a time — the response will tell you the total page count so you can request other sections if needed. IMPORTANT: Call this tool for ONE document at a time only — never request multiple documents in the same response.",
  input_schema: {
    type: "object" as const,
    properties: {
      file_object_id: {
        type: "string",
        description: "The _id of the file object from the document list",
      },
      start_page: {
        type: "number",
        description: "First page to read (1-indexed, inclusive). Omit to start from the beginning.",
      },
      end_page: {
        type: "number",
        description: "Last page to read (1-indexed, inclusive). Omit to read as far as the size limit allows.",
      },
    },
    required: ["file_object_id"],
  },
};

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

  const { messages, conversationId, tenderId } = req.body as {
    messages: Anthropic.MessageParam[];
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

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    return;
  }

  // ── Load tender ───────────────────────────────────────────────────────────
  const [tender, systemDoc] = await Promise.all([
    Tender.findById(tenderId)
      .populate({ path: "files", populate: { path: "file" } })
      .lean(),
    System.getSystem(),
  ]);
  if (!tender) {
    res.status(404).json({ error: "Tender not found" });
    return;
  }

  // ── Load user context ─────────────────────────────────────────────────────
  const user = await User.findById(userId).populate("employee");
  const employee = isDocument(user?.employee) ? user!.employee : null;
  const userContext = [
    user?.name && `The user's name is ${user.name}.`,
    employee?.jobTitle && `Their job title is ${employee.jobTitle}.`,
  ]
    .filter(Boolean)
    .join(" ");

  // ── Build system prompt from tender data ──────────────────────────────────
  const tenderFiles = (tender.files as any[]);
  const specFiles = ((systemDoc?.specFiles ?? []) as any[]);
  const readyFiles = tenderFiles.filter((f: any) => f.summaryStatus === "ready");
  const pendingFiles = tenderFiles.filter(
    (f: any) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
  );
  const readySpecFiles = specFiles.filter((f: any) => f.summaryStatus === "ready");

  // Build stable redirect URLs for each file — these go through /api/tender-files
  // which generates a fresh signed URL on every click, so citations never go stale.
  const serverBase =
    process.env.API_BASE_URL ||
    `${req.protocol}://${req.get("host")}`;

  const buildFileEntry = (f: any, urlPath: string) => {
    const summary = f.summary as any;
    const chunks = summary?.chunks as Array<{ startPage: number; endPage: number; overview: string; keyTopics: string[] }> | undefined;
    const chunkIndex = chunks && chunks.length > 1
      ? `\nPage Sections:\n${chunks.map((c) => `  Pages ${c.startPage}–${c.endPage}: ${c.keyTopics.slice(0, 6).join(", ")}`).join("\n")}`
      : "";
    return [
      `**File ID: ${f._id}**`,
      `Type: ${summary?.documentType || f.documentType || "Unknown"}`,
      `URL: ${urlPath}`,
      summary
        ? `Overview: ${summary.overview}\nKey Topics: ${(summary.keyTopics as string[]).join(", ")}${chunkIndex}`
        : "Summary: not yet available",
    ].join("\n");
  };

  const fileIndex = readyFiles
    .map((f) =>
      buildFileEntry(f, `${serverBase}/api/enriched-files/${f._id}?token=${token}`)
    )
    .join("\n\n---\n\n");

  const specFileIndex = readySpecFiles
    .map((f) =>
      buildFileEntry(f, `${serverBase}/api/enriched-files/${f._id}?token=${token}`)
    )
    .join("\n\n---\n\n");

  const pendingNotice =
    pendingFiles.length > 0
      ? `\n\nNOTE: ${pendingFiles.length} document(s) are still being processed and are not yet available for reading. Mention this if your answer may be incomplete.`
      : "";

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

  // ── Load or create conversation ──────────────────────────────────────────
  let convo: Awaited<
    ReturnType<typeof TenderConversation.findById>
  > | null = null;
  let isNewConversation = false;

  try {
    if (conversationId) {
      if (!mongoose.isValidObjectId(conversationId)) {
        res.status(400).json({ error: "Invalid conversationId" });
        return;
      }
      convo = await TenderConversation.findById(conversationId);
      if (!convo || convo.user.toString() !== userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (convo.tender.toString() !== tenderId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    } else {
      convo = await TenderConversation.create({
        tender: tenderId,
        user: userId,
        title: "New conversation",
        aiModel: "claude-opus-4-6",
        messages: [],
        totalInputTokens: 0,
        totalOutputTokens: 0,
      });
      isNewConversation = true;
    }
  } catch (err) {
    console.error("Conversation load/create error:", err);
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  // ── Instantiate Anthropic client early (needed for parallel classification) ──
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ── Start query complexity classification in background ──────────────────
  const lastUserContent = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.content;
  const queryText =
    typeof lastUserContent === "string" ? lastUserContent : null;

  const classificationPromise: Promise<"simple" | "complex"> = queryText
    ? anthropic.messages
        .create({
          model: "claude-haiku-4-5",
          max_tokens: 10,
          messages: [
            {
              role: "user",
              content: `Classify this construction tender question as SIMPLE or COMPLEX.

SIMPLE: A single direct lookup — one specific fact, clause, or requirement from one document.
COMPLEX: Synthesis across documents, comparisons, summaries, anything requiring reading multiple documents.

Err towards COMPLEX when uncertain.

Query: "${queryText}"

Reply with exactly one word: SIMPLE or COMPLEX`,
            },
          ],
        })
        .then((r) => {
          const text =
            r.content[0]?.type === "text"
              ? r.content[0].text.trim().toUpperCase()
              : "";
          return text === "SIMPLE" ? "simple" : "complex";
        })
        .catch(() => "complex" as const)
    : Promise.resolve("complex" as const);

  // ── Await classification result → choose model ───────────────────────────
  const complexity = await classificationPromise;
  const MODEL =
    complexity === "simple" ? "claude-sonnet-4-6" : "claude-opus-4-6";
  console.log(`[tender-chat] complexity=${complexity} → model=${MODEL}`);

  // Update stored model to reflect what was actually used this turn
  convo!.aiModel = MODEL;

  // ── Streaming response setup ─────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Transfer-Encoding", "chunked");

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Keepalive: send a SSE comment every 20s so the connection isn't dropped
  // by any intermediate proxy or browser timeout during long PDF operations.
  const keepalive = setInterval(() => {
    res.write(": ping\n\n");
  }, 20000);

  // Emit conversation_id for new conversations immediately
  if (isNewConversation) {
    sendEvent({ type: "conversation_id", id: convo!._id.toString() });
  }

  const conversationMessages: Anthropic.MessageParam[] = [...messages];

  // Track whether this is the first turn (no saved messages yet)
  const isFirstTurn = convo!.messages.length === 0;
  // Capture the first user message content for title generation
  const firstUserMessage = messages.find((m) => m.role === "user")?.content;

  // ── Agentic loop ─────────────────────────────────────────────────────────
  // Snapshot tokens before loop so we can compute this request's total usage
  const tokensBefore = {
    input: convo!.totalInputTokens,
    output: convo!.totalOutputTokens,
  };

  // Accumulates streamed text so we can do a partial save if the stream dies
  let streamedText = "";

  // ── PDF page budget tracking ──────────────────────────────────────────────
  // Anthropic enforces a hard 100-page limit across all document blocks per
  // request. We track pages loaded this turn and refuse to load docs that
  // would push us over, returning a helpful message to Claude instead.
  const PDF_PAGE_LIMIT = 90; // conservative buffer below the 100-page hard limit
  let pdfPagesLoaded = 0;
  const loadedFileIds = new Set<string>(); // prevent redundant reloads

  try {
    let continueLoop = true;
    const turnToolResults: IToolResult[] = [];

    while (continueLoop) {
      // Per-stream abort timeout — if Anthropic goes silent for 5 minutes the
      // stream will never resolve or reject, hanging the request indefinitely.
      const controller = new AbortController();
      const streamTimeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 8192,
        system: systemPrompt,
        tools: [READ_DOCUMENT_TOOL],
        tool_choice: { type: "auto", disable_parallel_tool_use: true },
        messages: conversationMessages,
      }, { signal: controller.signal });

      stream.on("text", (delta: string) => {
        streamedText += delta;
        sendEvent({ type: "text_delta", delta });
      });

      let message: Awaited<ReturnType<typeof stream.finalMessage>>;
      try {
        message = await stream.finalMessage();
      } finally {
        clearTimeout(streamTimeout);
      }

      // Emit usage after each turn
      sendEvent({
        type: "usage",
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        model: MODEL,
      });

      // Accumulate tokens on conversation document
      convo!.totalInputTokens += message.usage.input_tokens;
      convo!.totalOutputTokens += message.usage.output_tokens;

      if (message.stop_reason === "end_turn") {
        conversationMessages.push({
          role: "assistant",
          content: message.content,
        });
        sendEvent({ type: "done" });
        continueLoop = false;
      } else if (message.stop_reason === "tool_use") {
        conversationMessages.push({
          role: "assistant",
          content: message.content,
        });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of message.content) {
          if (block.type !== "tool_use") continue;

          sendEvent({ type: "tool_call", toolName: block.name });

          try {
            // ── read_document tool execution ────────────────────────────
            const input = block.input as { file_object_id: string; start_page?: number; end_page?: number };
            const fileObj: any =
              tenderFiles.find((f: any) => f._id.toString() === input.file_object_id) ??
              specFiles.find((f: any) => f._id.toString() === input.file_object_id);
            if (!fileObj)
              throw new Error(
                `File ${input.file_object_id} not found`
              );

            if (!fileObj.file)
              throw new Error(
                `File reference missing for ${input.file_object_id}`
              );

            const fileId =
              fileObj.file && typeof fileObj.file === "object" && (fileObj.file as any)._id
                ? (fileObj.file as any)._id.toString()
                : (fileObj.file as any).toString();
            const docLabel = (fileObj.summary as any)?.documentType || fileObj.documentType || "Document";

            // Guard: deduplicate reloads of the same document+range (allow different page ranges)
            const rangeKey = `${fileId}:${input.start_page ?? 0}:${input.end_page ?? "end"}`;
            if (loadedFileIds.has(rangeKey)) {
              throw new Error(
                `Document "${docLabel}" (same page range) is already loaded in this conversation turn.`
              );
            }

            // Guard: enforce PDF page budget using estimated pages to be read
            // (for large docs with a page range, we only read a subset)
            const docPageCount = fileObj.pageCount ?? 0;
            const requestedPages = input.end_page && input.start_page
              ? input.end_page - input.start_page + 1
              : docPageCount;
            const estimatedPages = Math.min(requestedPages || docPageCount, docPageCount || requestedPages);
            if (estimatedPages > 0 && pdfPagesLoaded + estimatedPages > PDF_PAGE_LIMIT) {
              throw new Error(
                `Cannot load "${docLabel}" — this turn has already used ${pdfPagesLoaded} of the ${PDF_PAGE_LIMIT}-page limit. ` +
                `Please answer based on what has already been loaded, or let the user know they should ask about one document at a time.`
              );
            }

            const s3Object = await getFile(fileId);
            if (!s3Object?.Body) throw new Error("File body empty");

            const buffer = s3Object.Body as Buffer;
            const contentType =
              s3Object.ContentType || "application/pdf";
            const base64 = buffer.toString("base64");

            const isSpreadsheet =
              contentType.includes("spreadsheet") ||
              contentType.includes("excel") ||
              contentType.includes("ms-excel");

            let toolResultContent: Anthropic.ToolResultBlockParam["content"];

            if (isSpreadsheet) {
              const xlsx = await import("xlsx");
              const workbook = xlsx.read(buffer, { type: "buffer" });
              const text = workbook.SheetNames.map((name) => {
                const ws = workbook.Sheets[name];
                return `Sheet: ${name}\n${xlsx.utils.sheet_to_csv(ws)}`;
              }).join("\n\n");
              toolResultContent = `Document: ${docLabel}\n\n${text}`;
            } else if (contentType.startsWith("image/")) {
              toolResultContent = [
                {
                  type: "text" as const,
                  text: `Document: ${docLabel}`,
                },
                {
                  type: "image" as const,
                  source: {
                    type: "base64" as const,
                    media_type: contentType as
                      | "image/jpeg"
                      | "image/png"
                      | "image/webp"
                      | "image/gif",
                    data: base64,
                  },
                },
              ];
            } else {
              // PDF — extract only the requested (or first fitting) page range
              const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
              const totalPages = pdfDoc.getPageCount();

              // Convert 1-indexed user input to 0-indexed, clamp to document bounds
              let startIdx = input.start_page ? Math.max(0, input.start_page - 1) : 0;
              let endIdx = input.end_page ? Math.min(input.end_page, totalPages) : totalPages;

              // Bisect down until the extracted chunk fits
              let pdfChunk: Buffer;
              while (true) {
                const indices = Array.from({ length: endIdx - startIdx }, (_, i) => startIdx + i);
                const chunkDoc = await PDFDocument.create();
                const pages = await chunkDoc.copyPages(pdfDoc, indices);
                for (const page of pages) chunkDoc.addPage(page);
                pdfChunk = Buffer.from(await chunkDoc.save());

                if (pdfChunk.length <= MAX_READABLE_PDF_BYTES || endIdx - startIdx <= 1) break;
                // Halve the page range and retry
                endIdx = startIdx + Math.floor((endIdx - startIdx) / 2);
              }

              const pagesRead = endIdx - startIdx;
              const pageNote = totalPages > pagesRead
                ? `Pages ${startIdx + 1}–${endIdx} of ${totalPages} total. Use start_page/end_page to read other sections.`
                : `All ${totalPages} pages.`;

              toolResultContent = [
                {
                  type: "text" as const,
                  text: `Document: ${docLabel}\n${pageNote}\nWhen citing this document use the filename: "${docLabel}"`,
                },
                {
                  type: "document" as any,
                  source: {
                    type: "base64" as const,
                    media_type: "application/pdf" as const,
                    data: pdfChunk.toString("base64"),
                  },
                },
              ];

              // Update page tracking to use actual pages extracted
              if (pdfPagesLoaded + pagesRead > PDF_PAGE_LIMIT) {
                throw new Error(
                  `Cannot load "${docLabel}" (${pagesRead} pages) — this turn has already used ${pdfPagesLoaded} of the ${PDF_PAGE_LIMIT}-page limit.`
                );
              }
              if (docPageCount > 0) pdfPagesLoaded += pagesRead;
              loadedFileIds.add(rangeKey);

              const resultSummary = `Loaded document: ${docLabel} (${pageNote})`;
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: toolResultContent,
              });
              turnToolResults.push({ toolName: block.name, result: resultSummary });
              sendEvent({ type: "tool_result", toolName: block.name, result: resultSummary });
              continue; // skip the generic push below
            }

            // Track pages loaded and mark this file as loaded (non-PDF paths)
            if (docPageCount > 0) pdfPagesLoaded += docPageCount;
            loadedFileIds.add(rangeKey);

            const resultSummary = `Loaded document: ${docLabel}`;
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: toolResultContent,
            });
            turnToolResults.push({
              toolName: block.name,
              result: resultSummary,
            });
            sendEvent({
              type: "tool_result",
              toolName: block.name,
              result: resultSummary,
            });
          } catch (toolErr) {
            console.error(`Tool call failed: ${block.name}`, toolErr);
            const errorText = `Error: ${
              toolErr instanceof Error
                ? toolErr.message
                : "Tool execution failed"
            }`;
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: errorText,
              is_error: true,
            });
            turnToolResults.push({ toolName: block.name, result: errorText });
            sendEvent({
              type: "tool_result",
              toolName: block.name,
              result: errorText,
            });
          }
        }

        conversationMessages.push({ role: "user", content: toolResults });
      } else {
        // Handles max_tokens and any other non-tool stop reason — still push
        // the message so the save code below captures it.
        conversationMessages.push({
          role: "assistant",
          content: message.content,
        });
        sendEvent({ type: "done" });
        continueLoop = false;
      }
    }

    // ── Persist messages + token counts ────────────────────────────────────
    // Append new user message from the incoming request
    const lastUserMsg = messages[messages.length - 1];
    if (
      lastUserMsg?.role === "user" &&
      typeof lastUserMsg.content === "string"
    ) {
      convo!.messages.push({ role: "user", content: lastUserMsg.content });
    }

    // Find the last assistant turn (skip tool_use blocks, get text only)
    const lastAssistantTurn = [...conversationMessages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAssistantTurn) {
      const content = lastAssistantTurn.content;
      const text =
        typeof content === "string"
          ? content
          : (content as Anthropic.ContentBlock[])
              .filter((b): b is Anthropic.TextBlock => b.type === "text")
              .map((b) => b.text)
              .join("");
      if (text) {
        convo!.messages.push({
          role: "assistant",
          content: text,
          model: MODEL,
          inputTokens: convo!.totalInputTokens - tokensBefore.input,
          outputTokens: convo!.totalOutputTokens - tokensBefore.output,
          ...(turnToolResults.length > 0
            ? { toolResults: turnToolResults }
            : {}),
        });
      }
    }

    await convo!.save();

    // ── Title generation (first turn only) ─────────────────────────────────
    if (
      isFirstTurn &&
      firstUserMessage &&
      typeof firstUserMessage === "string"
    ) {
      try {
        const titleResponse = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 30,
          messages: [
            {
              role: "user",
              content: `Generate a concise 4-6 word title for a conversation that starts with this message:\n\n"${firstUserMessage}"\n\nRespond with only the title. No quotes, no punctuation at the end.`,
            },
          ],
        });
        const title =
          titleResponse.content[0]?.type === "text"
            ? titleResponse.content[0].text.trim()
            : "New conversation";
        convo!.title = title;
        await convo!.save();
        sendEvent({ type: "title", title });
      } catch (err) {
        console.error("Title generation failed:", err);
        // Non-fatal: conversation still works without a generated title
      }
    }
  } catch (err) {
    console.error("Claude API error:", err);
    let userMessage = err instanceof Error ? err.message : "Unknown error";
    if (err instanceof Anthropic.APIError) {
      const body = err.error as { error?: { type?: string } } | undefined;
      const errType = body?.error?.type;
      if (errType === "overloaded_error") {
        userMessage = "Claude is currently overloaded. Please try again in a moment.";
      } else if (err instanceof Anthropic.BadRequestError) {
        if (err.message.toLowerCase().includes("too long")) {
          userMessage =
            "The document is too large to load in full. Try asking about a specific section or request a page range.";
        } else if (err.message.includes("100 PDF pages")) {
          userMessage =
            "Too many PDF pages were loaded in a single request. Please ask about one document at a time, or start a new conversation for a fresh context.";
        }
      }
    }

    // Partial save — if the stream generated text before dying, persist it so
    // the user sees it on refresh rather than losing the whole turn.
    if (streamedText && convo) {
      try {
        const lastUserMsg = messages[messages.length - 1];
        if (lastUserMsg?.role === "user" && typeof lastUserMsg.content === "string") {
          convo.messages.push({ role: "user", content: lastUserMsg.content });
        }
        convo.messages.push({
          role: "assistant",
          content: streamedText + "\n\n*(response interrupted)*",
          model: MODEL,
          inputTokens: convo.totalInputTokens - tokensBefore.input,
          outputTokens: convo.totalOutputTokens - tokensBefore.output,
        });
        await convo.save();
      } catch (saveErr) {
        console.error("Failed to save partial response:", saveErr);
      }
    }

    sendEvent({ type: "error", message: userMessage });
  } finally {
    clearInterval(keepalive);
    res.end();
  }
});

export default router;
