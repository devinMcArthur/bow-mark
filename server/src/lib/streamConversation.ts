/**
 * Shared streaming conversation factory.
 *
 * Handles everything identical across all chat contexts:
 *   - Conversation load-or-create (scoped by tenderId / jobsiteId / neither)
 *   - SSE setup, keepalive pings, per-stream abort timeout
 *   - Complexity classification → model routing
 *   - Claude agentic streaming loop (text, tool_call, tool_result, usage, done/error)
 *   - Message + token persistence, partial save on failure
 *   - Async title generation on the first turn
 *
 * Each chat router supplies:
 *   - systemPrompt   — context-specific instructions
 *   - tools          — Anthropic tool definitions
 *   - executeTool    — how to run a tool (MCP, file fetch, etc.)
 *   - tenderId / jobsiteId — optional conversation scope
 *   - toolChoice / maxTokens — optional tuning
 */

import Anthropic from "@anthropic-ai/sdk";
import { Response } from "express";
import mongoose from "mongoose";
import { Conversation, ConversationToolResultClass } from "@models";

export interface ToolExecutionResult {
  /** Sent to Claude as the tool_result content (may include PDF/image blocks) */
  content: Anthropic.ToolResultBlockParam["content"];
  /** Short plain-text summary persisted in the DB and emitted as tool_result event */
  summary: string;
}

export interface StreamConversationOptions {
  res: Response;
  userId: string;
  conversationId?: string;
  /** Scopes the conversation to a tender — mutually exclusive with jobsiteId */
  tenderId?: string;
  /** Scopes the conversation to a jobsite — mutually exclusive with tenderId */
  jobsiteId?: string;
  chatType?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  systemPrompt: string;
  tools: Anthropic.Tool[];
  /**
   * Called for each tool_use block. Returns content sent to Claude plus a
   * plain-text summary for logging and persistence. Throw to signal a tool error.
   */
  executeTool: (name: string, input: Record<string, unknown>) => Promise<ToolExecutionResult>;
  /** Override Claude tool_choice. Default: { type: "auto" } */
  toolChoice?: Anthropic.Messages.ToolChoiceAuto | Anthropic.Messages.ToolChoiceAny | Anthropic.Messages.ToolChoiceTool;
  /** Max tokens per Claude turn. Default: 4096 */
  maxTokens?: number;
  logPrefix?: string;
}

export async function streamConversation(opts: StreamConversationOptions): Promise<void> {
  const {
    res,
    userId,
    conversationId,
    tenderId,
    jobsiteId,
    chatType,
    messages,
    systemPrompt,
    tools,
    executeTool,
    toolChoice,
    maxTokens = 4096,
    logPrefix = "[chat]",
  } = opts;

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    return;
  }

  // ── Load or create conversation ────────────────────────────────────────────
  let convo: Awaited<ReturnType<typeof Conversation.findById>> | null = null;
  let isNewConversation = false;

  try {
    if (conversationId) {
      if (!mongoose.isValidObjectId(conversationId)) {
        res.status(400).json({ error: "Invalid conversationId" });
        return;
      }
      convo = await Conversation.findById(conversationId);
      if (!convo || (convo.user as any).toString() !== userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    } else {
      const createData: Record<string, unknown> = {
        user: userId,
        title: "New conversation",
        aiModel: "claude-opus-4-6",
        messages: [],
        totalInputTokens: 0,
        totalOutputTokens: 0,
      };
      if (tenderId) createData.tenderId = new mongoose.Types.ObjectId(tenderId);
      if (jobsiteId) createData.jobsiteId = new mongoose.Types.ObjectId(jobsiteId);
      if (chatType) createData.chatType = chatType;
      convo = await Conversation.create(createData);
      isNewConversation = true;
    }
  } catch (err) {
    console.error(`${logPrefix} Conversation load/create error:`, err);
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ── Complexity classification → model routing ──────────────────────────────
  const lastUserContent = [...messages].reverse().find((m) => m.role === "user")?.content;
  const queryText = typeof lastUserContent === "string" ? lastUserContent : null;

  const classificationPromise: Promise<"simple" | "complex"> = queryText
    ? anthropic.messages
        .create({
          model: "claude-haiku-4-5",
          max_tokens: 10,
          messages: [
            {
              role: "user",
              content: `Classify this query as SIMPLE or COMPLEX.

SIMPLE: Most questions — lookups, summaries, explanations, single or multi-document reading, comparisons, calculations, and general reasoning. Default to SIMPLE when uncertain.
COMPLEX: Only use for tasks requiring deep multi-step reasoning chains — e.g. synthesising contradictory information across many sources, complex financial modelling, or open-ended analysis where the answer requires significant judgment.

Err towards SIMPLE when uncertain.

Query: "${queryText}"

Reply with exactly one word: SIMPLE or COMPLEX`,
            },
          ],
        })
        .then((r) => {
          const text = r.content[0]?.type === "text" ? r.content[0].text.trim().toUpperCase() : "";
          return text === "COMPLEX" ? "complex" : "simple";
        })
        .catch(() => "simple" as const)
    : Promise.resolve("simple" as const);

  const complexity = await classificationPromise;
  const MODEL = complexity === "complex" ? "claude-opus-4-6" : "claude-sonnet-4-6";
  console.log(`${logPrefix} complexity=${complexity} → model=${MODEL}`);
  convo!.aiModel = MODEL;

  // ── SSE setup ─────────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Transfer-Encoding", "chunked");

  const sendEvent = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // Keepalive: SSE comment every 20s prevents proxy/browser timeout during long ops
  const keepalive = setInterval(() => res.write(": ping\n\n"), 20000);

  if (isNewConversation) {
    sendEvent({ type: "conversation_id", id: convo!._id.toString() });
  }

  const conversationMessages: Anthropic.MessageParam[] = [...messages];
  const isFirstTurn = convo!.messages.length === 0;
  const firstUserMessage = messages.find((m) => m.role === "user")?.content;
  const tokensBefore = { input: convo!.totalInputTokens, output: convo!.totalOutputTokens };

  let streamedText = "";

  // ── Agentic streaming loop ─────────────────────────────────────────────────
  try {
    let continueLoop = true;
    const turnToolResults: ConversationToolResultClass[] = [];

    while (continueLoop) {
      // Per-turn abort timeout — prevents hanging if Anthropic goes silent
      const controller = new AbortController();
      const streamTimeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

      const streamParams: Anthropic.Messages.MessageStreamParams = {
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        tools,
        messages: conversationMessages,
      };
      if (toolChoice) streamParams.tool_choice = toolChoice;

      const stream = anthropic.messages.stream(streamParams, { signal: controller.signal });

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
            const { content, summary } = await executeTool(
              block.name,
              block.input as Record<string, unknown>
            );
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content });
            turnToolResults.push({ toolName: block.name, result: summary });
            sendEvent({ type: "tool_result", toolName: block.name, result: summary });
          } catch (toolErr) {
            console.error(`${logPrefix} Tool call failed: ${block.name}`, toolErr);
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

    // ── Persist messages ───────────────────────────────────────────────────
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === "user" && typeof lastUserMsg.content === "string") {
      convo!.messages.push({ role: "user", content: lastUserMsg.content });
    }

    const lastAssistantTurn = [...conversationMessages].reverse().find((m) => m.role === "assistant");
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

    // ── Title generation (first turn only) ─────────────────────────────────
    if (isFirstTurn && firstUserMessage && typeof firstUserMessage === "string") {
      try {
        const titleResponse = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 30,
          messages: [
            {
              role: "user",
              content: `Generate a concise 4-6 word title for a conversation starting with:\n\n"${firstUserMessage}"\n\nRespond with only the title. No quotes, no punctuation at the end.`,
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
      } catch {
        // Non-fatal
      }
    }
  } catch (err) {
    console.error(`${logPrefix} Claude API error:`, err);
    let userMessage = err instanceof Error ? err.message : "Unknown error";
    if (err instanceof Anthropic.APIError) {
      const body = err.error as { error?: { type?: string } } | undefined;
      if (body?.error?.type === "overloaded_error") {
        userMessage = "Claude is currently overloaded. Please try again in a moment.";
      } else if (err instanceof Anthropic.BadRequestError) {
        if (err.message.toLowerCase().includes("too long")) {
          userMessage = "The document is too large to load in full. Try asking about a specific section or request a page range.";
        } else if (err.message.includes("100 PDF pages")) {
          userMessage = "Too many PDF pages were loaded in a single request. Please ask about one document at a time, or start a new conversation for a fresh context.";
        }
      }
    }

    // Partial save — preserve any streamed text so the user sees it on refresh
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
        console.error(`${logPrefix} Failed to save partial response:`, saveErr);
      }
    }

    sendEvent({ type: "error", message: userMessage });
  } finally {
    clearInterval(keepalive);
    res.end();
  }
}
