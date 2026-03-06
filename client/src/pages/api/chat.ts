import type { NextApiRequest, NextApiResponse } from "next";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import jwt from "jsonwebtoken";

// Disable body parser so we can stream the response
export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
};

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://mcp-analytics:8081";
const JWT_SECRET = process.env.JWT_SECRET;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// System prompt for the analytics assistant
const SYSTEM_PROMPT = `You are an analytics assistant for Bow-Mark, a construction and paving company.
You have access to tools that query the company's PostgreSQL reporting database.
Use these tools to answer questions about jobsite financial performance, productivity metrics, crew benchmarks, and material costs.

Guidelines:
- Always use tools to fetch real data before answering. Do not make up numbers.
- When asked about a jobsite, use search_jobsites to find its ID first, then fetch performance data.
- Format currency values as dollars with commas (e.g. $1,234,567).
- Format percentages to one decimal place.
- Format tonnes/hour to two decimal places.
- If asked about "this year" or "current year", use the current calendar year (${new Date().getFullYear()}).
- If asked about multiple jobsites, compare them clearly in a table or list format.
- Be concise and direct. Lead with the key numbers, then provide context.`;

type Message = Anthropic.MessageParam;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // ── Auth check ──────────────────────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader || !JWT_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    jwt.verify(authHeader, JWT_SECRET);
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const { messages } = req.body as { messages: Message[] };
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  if (!ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    return;
  }

  // ── Connect to MCP server ───────────────────────────────────────────────────
  const mcpClient = new Client({ name: "bow-mark-chat", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${MCP_SERVER_URL}/mcp`));

  try {
    await mcpClient.connect(transport);
  } catch (err) {
    console.error("Failed to connect to MCP server:", err);
    res.status(503).json({ error: "Analytics server unavailable" });
    return;
  }

  // ── Load tools from MCP server ──────────────────────────────────────────────
  let mcpTools: Awaited<ReturnType<typeof mcpClient.listTools>>["tools"];
  try {
    const toolsResult = await mcpClient.listTools();
    mcpTools = toolsResult.tools;
  } catch (err) {
    console.error("Failed to load MCP tools:", err);
    await mcpClient.close();
    res.status(503).json({ error: "Failed to load analytics tools" });
    return;
  }

  // Convert MCP tool definitions to Anthropic tool format
  const anthropicTools: Anthropic.Tool[] = mcpTools.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    input_schema: (t.inputSchema as Anthropic.Tool["input_schema"]) ?? {
      type: "object" as const,
      properties: {},
    },
  }));

  // ── Streaming response setup ────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Transfer-Encoding", "chunked");

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  // ── Agentic loop with streaming ─────────────────────────────────────────────
  const conversationMessages: Message[] = [...messages];

  try {
    let continueLoop = true;

    while (continueLoop) {
      const stream = anthropic.messages.stream({
        model: "claude-opus-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: anthropicTools,
        messages: conversationMessages,
      });

      // Stream text deltas to client
      stream.on("text", (delta) => {
        sendEvent({ type: "text_delta", delta });
      });

      const message = await stream.finalMessage();

      if (message.stop_reason === "end_turn") {
        // Natural completion
        sendEvent({ type: "done" });
        continueLoop = false;
      } else if (message.stop_reason === "tool_use") {
        // Execute tool calls via MCP server
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
              mcpResult.content
                .filter((c) => c.type === "text")
                .map((c) => ("text" in c ? c.text : ""))
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
        // max_tokens or other stop reason
        sendEvent({ type: "done" });
        continueLoop = false;
      }
    }
  } catch (err) {
    console.error("Claude API error:", err);
    sendEvent({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
  } finally {
    await mcpClient.close();
    res.end();
  }
}
