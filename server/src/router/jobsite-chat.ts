import Anthropic from "@anthropic-ai/sdk";
import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { PDFDocument } from "pdf-lib";
import { Jobsite, User, System } from "@models";
import { ChatConversation } from "../models/ChatConversation";
import { getFile } from "@utils/fileStorage";
import { isDocument } from "@typegoose/typegoose";
import { IToolResult } from "../models/ChatConversation";

const MAX_READABLE_PDF_BYTES = 3 * 1024 * 1024;

const router = Router();

const READ_DOCUMENT_TOOL: Anthropic.Tool = {
  name: "read_document",
  description:
    "Load the contents of one specific document. For large documents only a page range is loaded at a time — the response will tell you the total page count so you can request other sections if needed. IMPORTANT: Call this tool for ONE document at a time only — never request multiple documents in the same response.",
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
  // ── Auth ──────────────────────────────────────────────────────────────────
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
    messages: Anthropic.MessageParam[];
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
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    return;
  }

  // ── Load jobsite ──────────────────────────────────────────────────────────
  const [jobsite, systemDoc] = await Promise.all([
    Jobsite.findById(jobsiteId)
      .populate({ path: "enrichedFiles", populate: { path: "file" } })
      .lean(),
    System.getSystem(),
  ]);
  if (!jobsite) {
    res.status(404).json({ error: "Jobsite not found" });
    return;
  }

  // ── User context ──────────────────────────────────────────────────────────
  const user = await User.findById(userId).populate("employee");
  const employee = isDocument(user?.employee) ? user!.employee : null;
  const userContext = [
    user?.name && `The user's name is ${user.name}.`,
    employee?.jobTitle && `Their job title is ${employee.jobTitle}.`,
  ]
    .filter(Boolean)
    .join(" ");

  // ── Build system prompt ───────────────────────────────────────────────────
  const jobsiteFiles = ((jobsite.enrichedFiles ?? []) as any[]);
  const specFiles = ((systemDoc?.specFiles ?? []) as any[]);
  const readyFiles = jobsiteFiles.filter((f: any) => f.summaryStatus === "ready");
  const pendingFiles = jobsiteFiles.filter(
    (f: any) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
  );
  const readySpecFiles = specFiles.filter((f: any) => f.summaryStatus === "ready");

  const serverBase =
    process.env.API_BASE_URL || `${req.protocol}://${req.get("host")}`;

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
    .map((f: any) =>
      buildFileEntry(f, `${serverBase}/api/enriched-files/${f._id}?token=${token}`)
    )
    .join("\n\n---\n\n");

  const specFileIndex = readySpecFiles
    .map((f: any) =>
      buildFileEntry(f, `${serverBase}/api/enriched-files/${f._id}?token=${token}`)
    )
    .join("\n\n---\n\n");

  const pendingNotice =
    pendingFiles.length > 0
      ? `\n\nNOTE: ${pendingFiles.length} document(s) are still being processed and are not yet available.`
      : "";

  const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are an AI assistant helping with jobsite documents for Bow-Mark, a paving and concrete company.

You are working on jobsite: **${jobsite.name}**${jobsite.jobcode ? ` (Job Code: ${jobsite.jobcode})` : ""}${jobsite.description ? `\nJobsite description: ${jobsite.description}` : ""}

## Jobsite Documents

${fileIndex || "No documents have been uploaded yet."}${pendingNotice}${specFileIndex ? `\n\n## Reference Specifications (shared across all jobsites)\n\n${specFileIndex}` : ""}

## Instructions

- Use document summaries to identify the most likely relevant document, then use read_document to load it.
- Load ONE document at a time. Never call read_document more than once per response.
- There is a strict 90-page limit per conversation turn across all loaded documents.
- **Citations are mandatory.** Every specific fact, requirement, clause, or drawing you reference MUST include an inline page link. Use this format: **[[Document Type, p.X]](URL#page=X)**
- Be accurate. If you are unsure, say so and recommend the user verify in the source document.`;

  // ── Load or create conversation ───────────────────────────────────────────
  let convo: Awaited<ReturnType<typeof ChatConversation.findById>> | null = null;
  let isNewConversation = false;

  try {
    if (conversationId) {
      if (!mongoose.isValidObjectId(conversationId)) {
        res.status(400).json({ error: "Invalid conversationId" });
        return;
      }
      convo = await ChatConversation.findById(conversationId);
      if (!convo || convo.user.toString() !== userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    } else {
      convo = await ChatConversation.create({
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

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ── Complexity classification → model selection ───────────────────────────
  const lastUserContent = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.content;
  const queryText = typeof lastUserContent === "string" ? lastUserContent : null;

  const complexity: "simple" | "complex" = queryText
    ? await anthropic.messages
        .create({
          model: "claude-haiku-4-5",
          max_tokens: 10,
          messages: [
            {
              role: "user",
              content: `Classify this construction jobsite question as SIMPLE or COMPLEX.\n\nSIMPLE: A single direct lookup.\nCOMPLEX: Synthesis, comparison, or multi-document reading.\n\nQuery: "${queryText}"\n\nReply with exactly one word: SIMPLE or COMPLEX`,
            },
          ],
        })
        .then((r) => {
          const text = r.content[0]?.type === "text" ? r.content[0].text.trim().toUpperCase() : "";
          return text === "SIMPLE" ? "simple" : "complex";
        })
        .catch(() => "complex" as const)
    : "complex";

  const MODEL = complexity === "simple" ? "claude-sonnet-4-6" : "claude-opus-4-6";

  // ── Streaming setup ───────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Transfer-Encoding", "chunked");

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const keepalive = setInterval(() => {
    res.write(": ping\n\n");
  }, 20000);

  if (isNewConversation) {
    sendEvent({ type: "conversation_id", id: convo!._id.toString() });
  }

  convo!.aiModel = MODEL;

  const conversationMessages: Anthropic.MessageParam[] = [...messages];
  const isFirstTurn = convo!.messages.length === 0;
  const firstUserMessage = messages.find((m) => m.role === "user")?.content;
  const tokensBefore = { input: convo!.totalInputTokens, output: convo!.totalOutputTokens };
  let streamedText = "";
  const PDF_PAGE_LIMIT = 90;
  let pdfPagesLoaded = 0;
  const loadedFileIds = new Set<string>();

  try {
    let continueLoop = true;
    const turnToolResults: IToolResult[] = [];

    while (continueLoop) {
      const controller = new AbortController();
      const streamTimeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

      const stream = anthropic.messages.stream(
        {
          model: MODEL,
          max_tokens: 8192,
          system: systemPrompt,
          tools: [READ_DOCUMENT_TOOL],
          tool_choice: { type: "auto", disable_parallel_tool_use: true },
          messages: conversationMessages,
        },
        { signal: controller.signal }
      );

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

      sendEvent({
        type: "usage",
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        model: MODEL,
      });

      convo!.totalInputTokens += message.usage.input_tokens;
      convo!.totalOutputTokens += message.usage.output_tokens;

      if (message.stop_reason === "end_turn") {
        conversationMessages.push({ role: "assistant", content: message.content });
        sendEvent({ type: "done" });
        continueLoop = false;
      } else if (message.stop_reason === "tool_use") {
        conversationMessages.push({ role: "assistant", content: message.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of message.content) {
          if (block.type !== "tool_use") continue;

          sendEvent({ type: "tool_call", toolName: block.name });

          try {
            const input = block.input as { file_object_id: string; start_page?: number; end_page?: number };
            const fileObj: any =
              jobsiteFiles.find((f: any) => f._id.toString() === input.file_object_id) ??
              specFiles.find((f: any) => f._id.toString() === input.file_object_id);

            if (!fileObj) throw new Error(`File ${input.file_object_id} not found`);
            if (!fileObj.file) throw new Error(`File reference missing for ${input.file_object_id}`);

            const fileId =
              fileObj.file && typeof fileObj.file === "object" && fileObj.file._id
                ? fileObj.file._id.toString()
                : fileObj.file.toString();

            const docLabel = fileObj.summary?.documentType || fileObj.documentType || "Document";
            const rangeKey = `${fileId}:${input.start_page ?? 0}:${input.end_page ?? "end"}`;

            if (loadedFileIds.has(rangeKey)) {
              throw new Error(`Document "${docLabel}" (same page range) is already loaded this turn.`);
            }

            const docPageCount = fileObj.pageCount ?? 0;
            const requestedPages = input.end_page && input.start_page
              ? input.end_page - input.start_page + 1
              : docPageCount;
            const estimatedPages = Math.min(requestedPages || docPageCount, docPageCount || requestedPages);
            if (estimatedPages > 0 && pdfPagesLoaded + estimatedPages > PDF_PAGE_LIMIT) {
              throw new Error(
                `Cannot load "${docLabel}" — this turn has already used ${pdfPagesLoaded} of the ${PDF_PAGE_LIMIT}-page limit.`
              );
            }

            const s3Object = await getFile(fileId);
            if (!s3Object?.Body) throw new Error("File body empty");

            const buffer = s3Object.Body as Buffer;
            const contentType = s3Object.ContentType || "application/pdf";
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
                { type: "text" as const, text: `Document: ${docLabel}` },
                {
                  type: "image" as const,
                  source: {
                    type: "base64" as const,
                    media_type: contentType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                    data: base64,
                  },
                },
              ];
            } else {
              const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
              const totalPages = pdfDoc.getPageCount();
              let startIdx = input.start_page ? Math.max(0, input.start_page - 1) : 0;
              let endIdx = input.end_page ? Math.min(input.end_page, totalPages) : totalPages;

              let pdfChunk: Buffer;
              while (true) {
                const indices = Array.from({ length: endIdx - startIdx }, (_, i) => startIdx + i);
                const chunkDoc = await PDFDocument.create();
                const pages = await chunkDoc.copyPages(pdfDoc, indices);
                for (const page of pages) chunkDoc.addPage(page);
                pdfChunk = Buffer.from(await chunkDoc.save());
                if (pdfChunk.length <= MAX_READABLE_PDF_BYTES || endIdx - startIdx <= 1) break;
                endIdx = startIdx + Math.floor((endIdx - startIdx) / 2);
              }

              const pagesRead = endIdx - startIdx;
              const pageNote = totalPages > pagesRead
                ? `Pages ${startIdx + 1}–${endIdx} of ${totalPages} total. Use start_page/end_page to read other sections.`
                : `All ${totalPages} pages.`;

              if (pdfPagesLoaded + pagesRead > PDF_PAGE_LIMIT) {
                throw new Error(
                  `Cannot load "${docLabel}" (${pagesRead} pages) — this turn has already used ${pdfPagesLoaded} of the ${PDF_PAGE_LIMIT}-page limit.`
                );
              }
              if (docPageCount > 0) pdfPagesLoaded += pagesRead;
              loadedFileIds.add(rangeKey);

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

              const resultSummary = `Loaded document: ${docLabel} (${pageNote})`;
              toolResults.push({ type: "tool_result", tool_use_id: block.id, content: toolResultContent });
              turnToolResults.push({ toolName: block.name, result: resultSummary });
              sendEvent({ type: "tool_result", toolName: block.name, result: resultSummary });
              continue;
            }

            if (docPageCount > 0) pdfPagesLoaded += docPageCount;
            loadedFileIds.add(rangeKey);
            const resultSummary = `Loaded document: ${docLabel}`;
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: toolResultContent });
            turnToolResults.push({ toolName: block.name, result: resultSummary });
            sendEvent({ type: "tool_result", toolName: block.name, result: resultSummary });
          } catch (toolErr) {
            console.error(`Tool call failed: ${block.name}`, toolErr);
            const errorText = `Error: ${toolErr instanceof Error ? toolErr.message : "Tool execution failed"}`;
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: errorText, is_error: true });
            turnToolResults.push({ toolName: block.name, result: errorText });
            sendEvent({ type: "tool_result", toolName: block.name, result: errorText });
          }
        }

        conversationMessages.push({ role: "user", content: toolResults });
      } else {
        conversationMessages.push({ role: "assistant", content: message.content });
        sendEvent({ type: "done" });
        continueLoop = false;
      }
    }

    // ── Persist messages ──────────────────────────────────────────────────
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === "user" && typeof lastUserMsg.content === "string") {
      convo!.messages.push({ role: "user", content: lastUserMsg.content });
    }

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
          ...(turnToolResults.length > 0 ? { toolResults: turnToolResults } : {}),
        });
      }
    }

    await convo!.save();

    // ── Title generation ──────────────────────────────────────────────────
    if (isFirstTurn && firstUserMessage && typeof firstUserMessage === "string") {
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
          userMessage = "The document is too large to load in full. Try asking about a specific section.";
        }
      }
    }

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
