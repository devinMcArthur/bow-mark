import Anthropic from "@anthropic-ai/sdk";
import { Router } from "express";
import { isDocument } from "@typegoose/typegoose";
import { User } from "@models";
import { streamConversation } from "../lib/streamConversation";
import { requireAuth } from "../lib/authMiddleware";
import { connectMcp } from "../lib/mcpClient";
import { adaptMcpContent, deriveSummary } from "../lib/mcpContentAdapter";
import { UserRoles } from "../typescript/user";

const router = Router();

const APP_NAME = process.env.APP_NAME || "paving";

const SYSTEM_PROMPT = `You are an analytics assistant for Bow Mark's ${APP_NAME} division.
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

  // Server-side role guard: the analytics assistant exposes revenue, cost,
  // margin, and tender pricing data — restricted to Admin and above.
  if (!user || (user.role ?? UserRoles.User) < UserRoles.Admin) {
    res.status(403).json({ error: "Forbidden: Admin role required" });
    return;
  }

  const employee = isDocument(user?.employee) ? user!.employee : null;
  const userContext = [
    user?.name && `The user's name is ${user.name}.`,
    employee?.jobTitle && `Their job title is ${employee.jobTitle}.`,
  ]
    .filter(Boolean)
    .join(" ");
  const systemPrompt = userContext ? `${userContext}\n\n${SYSTEM_PROMPT}` : SYSTEM_PROMPT;

  // ── Connect to MCP server and fetch tools ──────────────────────────────────
  const mcpConnection = await connectMcp("bow-mark-chat", "[chat]", res, { authToken: req.token });
  if (!mcpConnection) return;
  const { client: mcpClient, tools: mcpTools } = mcpConnection;

  // ── Stream (MCP client closed in finally block below) ──────────────────────
  try {
    await streamConversation({
      res,
      userId: req.userId,
      conversationId,
      messages: messages as Array<{ role: "user" | "assistant"; content: string }>,
      systemPrompt,
      tools: mcpTools,
      executeTool: async (name, input) => {
        const mcpResult = await mcpClient.callTool({ name, arguments: input });
        const blocks = adaptMcpContent(mcpResult.content);
        return {
          content: blocks as any,
          summary: deriveSummary(blocks, name),
        };
      },
      logPrefix: "[chat]",
    });
  } finally {
    await mcpClient.close();
  }
});

export default router;
