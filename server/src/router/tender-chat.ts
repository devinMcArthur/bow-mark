import Anthropic from "@anthropic-ai/sdk";
import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Tender, User } from "@models";
import { TenderConversation } from "../models/TenderConversation";
import { getFile } from "@utils/fileStorage";
import { isDocument } from "@typegoose/typegoose";
import { IToolResult } from "../models/ChatConversation";

const router = Router();

const READ_DOCUMENT_TOOL: Anthropic.Tool = {
  name: "read_document",
  description:
    "Load the full contents of a specific tender document. Use this when a document summary indicates it is relevant to the question and you need the actual content, including drawings, tables, and specifications.",
  input_schema: {
    type: "object" as const,
    properties: {
      file_object_id: {
        type: "string",
        description: "The _id of the file object from the document list",
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
  const tender = await Tender.findById(tenderId).lean();
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
  const readyFiles = tender.files.filter((f) => f.summaryStatus === "ready");
  const pendingFiles = tender.files.filter(
    (f) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
  );

  const fileIndex = readyFiles
    .map((f) => {
      const summary = f.summary as any;
      return [
        `**File ID: ${f._id}**`,
        `Type: ${f.documentType}`,
        summary
          ? `Overview: ${summary.overview}\nKey Topics: ${(summary.keyTopics as string[]).join(", ")}`
          : "Summary: not yet available",
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const pendingNotice =
    pendingFiles.length > 0
      ? `\n\nNOTE: ${pendingFiles.length} document(s) are still being processed and are not yet available for reading. Mention this if your answer may be incomplete.`
      : "";

  const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are an AI assistant helping to analyze tender documents for Bow-Mark, a paving and concrete company.

You are working on tender: **${tender.name}** (Job Code: ${tender.jobcode})${tender.description ? `\nTender description: ${tender.description}` : ""}

## Available Documents

${fileIndex || "No documents have been processed yet."}${pendingNotice}

## Instructions

- Use the read_document tool to load specific documents when you need their full content to answer a question.
- Prefer reading relevant documents over guessing from summaries alone.
- Always cite your sources inline using the format **[Document Type, p.X]** where X is the page number.
- If a document is a drawing, describe what you see in the drawing as part of your answer.
- Be accurate. If you are unsure, say so and recommend the user verify in the source document.
- For questions about specific requirements, clauses, or quantities, always read the relevant document rather than relying on the summary.`;

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

  try {
    let continueLoop = true;
    const turnToolResults: IToolResult[] = [];

    while (continueLoop) {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        tools: [READ_DOCUMENT_TOOL],
        messages: conversationMessages,
      });

      stream.on("text", (delta: string) => {
        sendEvent({ type: "text_delta", delta });
      });

      const message = await stream.finalMessage();

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
            const input = block.input as { file_object_id: string };
            const fileObj = tender.files.find(
              (f) => f._id.toString() === input.file_object_id
            );
            if (!fileObj)
              throw new Error(
                `File ${input.file_object_id} not found on tender`
              );

            if (!fileObj.file)
              throw new Error(
                `File reference missing on tender file ${input.file_object_id}`
              );

            const fileId = fileObj.file.toString();
            const s3Object = await getFile(fileId);
            if (!s3Object?.Body) throw new Error("File body empty");

            const buffer = s3Object.Body as Buffer;
            const contentType =
              s3Object.ContentType || "application/pdf";
            const base64 = buffer.toString("base64");

            const isSpreadsheet =
              contentType.includes("spreadsheet") ||
              contentType.includes("excel") ||
              contentType.includes("ms-excel") ||
              fileId.toLowerCase().endsWith(".xlsx") ||
              fileId.toLowerCase().endsWith(".xls");

            let toolResultContent: Anthropic.ToolResultBlockParam["content"];

            if (isSpreadsheet) {
              const xlsx = await import("xlsx");
              const workbook = xlsx.read(buffer, { type: "buffer" });
              const text = workbook.SheetNames.map((name) => {
                const ws = workbook.Sheets[name];
                return `Sheet: ${name}\n${xlsx.utils.sheet_to_csv(ws)}`;
              }).join("\n\n");
              toolResultContent = `Document: ${fileObj.documentType}\n\n${text}`;
            } else if (contentType.startsWith("image/")) {
              toolResultContent = [
                {
                  type: "text" as const,
                  text: `Document: ${fileObj.documentType}`,
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
              // PDF
              toolResultContent = [
                {
                  type: "text" as const,
                  text: `Document: ${fileObj.documentType}\nWhen citing this document use the filename: "${fileObj.documentType}"`,
                },
                {
                  type: "document" as any,
                  source: {
                    type: "base64" as const,
                    media_type: "application/pdf" as const,
                    data: base64,
                  },
                },
              ];
            }

            const resultSummary = `Loaded document: ${fileObj.documentType}`;
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
    if (
      err instanceof Anthropic.BadRequestError &&
      err.message.toLowerCase().includes("too long")
    ) {
      userMessage =
        "The document is too large to load in full. Try asking about a specific section or request a page range.";
    }
    sendEvent({ type: "error", message: userMessage });
  } finally {
    res.end();
  }
});

export default router;
