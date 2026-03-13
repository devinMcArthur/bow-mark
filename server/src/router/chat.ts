import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Router } from "express";
import { isDocument } from "@typegoose/typegoose";
import { User } from "@models";
import { streamConversation } from "../lib/streamConversation";
import { requireAuth } from "../lib/authMiddleware";

const router = Router();

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://mcp-analytics:8081";
const APP_NAME = process.env.APP_NAME || "paving";

const SYSTEM_PROMPT = `You are an analytics assistant for Bow-Mark's ${APP_NAME} division.
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

router.post("/message", requireAuth, async (req, res) => {
  const { messages, conversationId } = req.body as {
    messages: Anthropic.MessageParam[];
    conversationId?: string;
  };
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  // ── Build user-aware system prompt ─────────────────────────────────────────
  const user = await User.findById(req.userId).populate("employee");
  const employee = isDocument(user?.employee) ? user!.employee : null;
  const userContext = [
    user?.name && `The user's name is ${user.name}.`,
    employee?.jobTitle && `Their job title is ${employee.jobTitle}.`,
  ]
    .filter(Boolean)
    .join(" ");
  const systemPrompt = userContext ? `${userContext}\n\n${SYSTEM_PROMPT}` : SYSTEM_PROMPT;

  // ── Connect to MCP server and fetch tools ──────────────────────────────────
  const mcpClient = new Client({ name: "bow-mark-chat", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${MCP_SERVER_URL}/mcp`));

  try {
    await mcpClient.connect(transport);
  } catch (err) {
    console.error("Failed to connect to MCP server:", err);
    res.status(503).json({ error: "Analytics server unavailable" });
    return;
  }

  let anthropicTools: Anthropic.Tool[];
  try {
    const { tools: mcpTools } = await mcpClient.listTools();
    anthropicTools = mcpTools.map((t) => ({
      name: t.name,
      description: t.description ?? "",
      input_schema: (t.inputSchema as Anthropic.Tool["input_schema"]) ?? {
        type: "object" as const,
        properties: {},
      },
    }));
  } catch (err) {
    console.error("Failed to load MCP tools:", err);
    await mcpClient.close();
    res.status(503).json({ error: "Failed to load analytics tools" });
    return;
  }

  // ── Stream (MCP client closed in executeTool's parent finally via factory) ─
  try {
    await streamConversation({
      res,
      userId: req.userId,
      conversationId,
      messages: messages as Array<{ role: "user" | "assistant"; content: string }>,
      systemPrompt,
      tools: anthropicTools,
      executeTool: async (name, input) => {
        const mcpResult = await mcpClient.callTool({ name, arguments: input });
        const text =
          (mcpResult.content as Array<{ type: string; text?: string }>)
            .filter((c) => c.type === "text")
            .map((c) => c.text ?? "")
            .join("\n") || "No result";
        return { content: text, summary: text };
      },
      logPrefix: "[chat]",
    });
  } finally {
    await mcpClient.close();
  }
});

export default router;
