import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { ChatConversation } from "../models/ChatConversation";

const router = Router();

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://mcp-analytics:8081";

const SYSTEM_PROMPT = `You are an analytics assistant for Bow-Mark, a construction and paving company.
You have access to tools that query the company's PostgreSQL reporting database and MongoDB.
Use these tools to answer questions about jobsite financial performance, productivity metrics, crew benchmarks, material costs, daily activity, and employee productivity.

Guidelines:
- Always use tools to fetch real data before answering. Do not make up numbers.
- When asked about a jobsite, use search_jobsites to find its ID first, then fetch performance data.
- For questions about "what happened" or "recent activity" on a jobsite, use get_daily_report_activity.
- For questions about specific employees, hours worked, or who was on site, use get_employee_productivity.
- Format currency values as dollars with commas (e.g. $1,234,567).
- Format percentages to one decimal place.
- Format tonnes/hour to two decimal places.
- If asked about "this year" or "current year", use the current calendar year (${new Date().getFullYear()}).
- If asked about multiple jobsites, compare them clearly in a table or list format.
- When report notes are present in daily activity, summarize qualitative themes alongside the numbers.
- Be concise and direct. Lead with the key numbers, then provide context.
- When mentioning named entities that have dedicated pages, embed relative markdown links using their ID from tool results:
  - Jobsite: [Jobsite Name](/jobsite/{mongo_id})
  - Daily report: [date](/daily-report/{mongo_id})
  - Employee: [Employee Name](/employee/{mongo_id})
  - Crew: [Crew Name](/crew/{mongo_id})
  - Vehicle: [Vehicle Name](/vehicle/{mongo_id})
- Only link entities when their ID is known from tool results. Never guess or fabricate IDs.`;

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

  const { messages, conversationId } = req.body as {
    messages: Anthropic.MessageParam[];
    conversationId?: string;
  };
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    return;
  }

  // ── Load or create conversation ──────────────────────────────────────────
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
        aiModel: "claude-opus-4-6", // updated after routing below
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
  // Run in parallel with MCP connect to add no meaningful latency.
  // Default to Opus (the more capable model) on any failure or uncertainty.
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
              content: `Classify this analytics query for a construction company as SIMPLE or COMPLEX.

SIMPLE: A single direct lookup — one jobsite, one time period, one specific number or fact (e.g. "What is jobsite X's revenue this year?").
COMPLEX: Comparisons, rankings, multiple entities, trends, year-over-year, aggregations, anything requiring multi-step reasoning, or anything involving financial summaries.

Err towards COMPLEX when uncertain. Financial accuracy is critical.

Query: "${queryText}"

Reply with exactly one word: SIMPLE or COMPLEX`,
            },
          ],
        })
        .then((r) => {
          const text =
            r.content[0]?.type === "text" ? r.content[0].text.trim().toUpperCase() : "";
          return text === "SIMPLE" ? "simple" : "complex";
        })
        .catch(() => "complex" as const)
    : Promise.resolve("complex" as const);

  // ── Connect to MCP server ────────────────────────────────────────────────
  const mcpClient = new Client({ name: "bow-mark-chat", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${MCP_SERVER_URL}/mcp`));

  try {
    await mcpClient.connect(transport);
  } catch (err) {
    console.error("Failed to connect to MCP server:", err);
    if (isNewConversation && convo) {
      await convo.deleteOne().catch(() => {});
    }
    res.status(503).json({ error: "Analytics server unavailable" });
    return;
  }

  let mcpTools: Awaited<ReturnType<typeof mcpClient.listTools>>["tools"];
  try {
    const toolsResult = await mcpClient.listTools();
    mcpTools = toolsResult.tools;
  } catch (err) {
    console.error("Failed to load MCP tools:", err);
    await mcpClient.close();
    if (isNewConversation && convo) {
      await convo.deleteOne().catch(() => {});
    }
    res.status(503).json({ error: "Failed to load analytics tools" });
    return;
  }

  const anthropicTools: Anthropic.Tool[] = mcpTools.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    input_schema: (t.inputSchema as Anthropic.Tool["input_schema"]) ?? {
      type: "object" as const,
      properties: {},
    },
  }));

  // ── Await classification result → choose model ───────────────────────────
  const complexity = await classificationPromise;
  const MODEL = complexity === "simple" ? "claude-sonnet-4-6" : "claude-opus-4-6";
  console.log(`[chat] complexity=${complexity} → model=${MODEL}`);

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

    while (continueLoop) {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: anthropicTools,
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
            const mcpResult = await mcpClient.callTool({
              name: block.name,
              arguments: block.input as Record<string, unknown>,
            });

            const resultText =
              (mcpResult.content as Array<{ type: string; text?: string }>)
                .filter((c) => c.type === "text")
                .map((c) => c.text ?? "")
                .join("\n") || "No result";

            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: resultText,
            });
          } catch (toolErr) {
            console.error(`Tool call failed: ${block.name}`, toolErr);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: `Error: ${toolErr instanceof Error ? toolErr.message : "Tool execution failed"}`,
              is_error: true,
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
    if (lastUserMsg?.role === "user" && typeof lastUserMsg.content === "string") {
      convo!.messages.push({ role: "user", content: lastUserMsg.content });
    }

    // Find the last assistant turn (skip tool_use blocks, get text only)
    const lastAssistantTurn = [...conversationMessages].reverse().find(
      (m) => m.role === "assistant"
    );
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
    sendEvent({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
  } finally {
    await mcpClient.close();
    res.end();
  }
});

export default router;
