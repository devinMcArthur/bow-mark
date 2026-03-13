import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Jobsite, User, System, EnrichedFile } from "@models";
import { isDocument } from "@typegoose/typegoose";
import { streamConversation } from "../lib/streamConversation";
import { READ_DOCUMENT_TOOL, makeReadDocumentExecutor } from "../lib/readDocumentExecutor";
import { UserRoles } from "../typescript/user";

const router = Router();

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://mcp-analytics:8081";

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

  const { messages, conversationId, jobsiteId } = req.body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    conversationId?: string;
    jobsiteId: string;
  };

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }
  if (!jobsiteId || !mongoose.isValidObjectId(jobsiteId)) {
    res.status(400).json({ error: "valid jobsiteId required" });
    return;
  }

  // ── Load context ──────────────────────────────────────────────────────────
  const [jobsite, systemDoc, user] = await Promise.all([
    Jobsite.findById(jobsiteId).lean(),
    System.getSystem(),
    User.findById(userId).populate("employee"),
  ]);

  if (!jobsite) {
    res.status(404).json({ error: "Jobsite not found" });
    return;
  }

  const employee = isDocument(user?.employee) ? user!.employee : null;
  const userContext = [
    user?.name && `The user's name is ${user.name}.`,
    employee?.jobTitle && `Their job title is ${employee.jobTitle}.`,
  ]
    .filter(Boolean)
    .join(" ");

  // PM chat: full PM-level document access
  // Default to UserRoles.User (least privilege) when role is unknown
  const userRole = user?.role ?? UserRoles.User;
  const allEntries = ((jobsite?.enrichedFiles ?? []) as any[]);
  const allowedEntries = allEntries.filter(
    (entry: any) => (entry.minRole ?? UserRoles.ProjectManager) <= userRole
  );
  const allowedEnrichedFileIds = allowedEntries.map((e: any) => e.enrichedFile);
  const jobsiteFiles = await EnrichedFile.find({ _id: { $in: allowedEnrichedFileIds } }).populate("file").lean();
  const specFiles = ((systemDoc?.specFiles ?? []) as any[]);
  const readyFiles = jobsiteFiles.filter((f: any) => f.summaryStatus === "ready");
  const pendingFiles = jobsiteFiles.filter(
    (f: any) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
  );
  const readySpecFiles = specFiles.filter((f: any) => f.summaryStatus === "ready");

  const serverBase = process.env.API_BASE_URL || `${req.protocol}://${req.get("host")}`;

  const buildFileEntry = (f: any) => {
    const summary = f.summary as any;
    const chunks = summary?.chunks as Array<{ startPage: number; endPage: number; overview: string; keyTopics: string[] }> | undefined;
    const chunkIndex =
      chunks && chunks.length > 1
        ? `\nPage Sections:\n${chunks.map((c) => `  Pages ${c.startPage}–${c.endPage}: ${c.keyTopics.slice(0, 6).join(", ")}`).join("\n")}`
        : "";
    return [
      `**File ID: ${f._id}**`,
      `Type: ${summary?.documentType || f.documentType || "Unknown"}`,
      `URL: ${serverBase}/api/enriched-files/${f._id}?token=${token}`,
      summary
        ? `Overview: ${summary.overview}\nKey Topics: ${(summary.keyTopics as string[]).join(", ")}${chunkIndex}`
        : "Summary: not yet available",
    ].join("\n");
  };

  const fileIndex = readyFiles.map(buildFileEntry).join("\n\n---\n\n");
  const specFileIndex = readySpecFiles.map(buildFileEntry).join("\n\n---\n\n");
  const pendingNotice =
    pendingFiles.length > 0
      ? `\n\nNOTE: ${pendingFiles.length} document(s) are still being processed.`
      : "";

  const APP_NAME = process.env.APP_NAME || "paving";

  const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are a Project Manager assistant for Bow-Mark's ${APP_NAME} division.

You are currently focused on jobsite: **${(jobsite as any).name}**${(jobsite as any).jobcode ? ` (Job Code: ${(jobsite as any).jobcode})` : ""}${(jobsite as any).description ? `\nJobsite description: ${(jobsite as any).description}` : ""}

You have access to two types of tools:
1. **read_document** — load and read jobsite specification and contract documents
2. **Analytics tools** — query the company's PostgreSQL reporting database for financial performance, productivity metrics, crew data, and more

## Jobsite Documents

${fileIndex || "No documents have been uploaded yet."}${pendingNotice}${specFileIndex ? `\n\n## Reference Specifications\n\n${specFileIndex}` : ""}

## Instructions

- For questions about specifications, contracts, or compliance: use read_document.
- For questions about financial performance, productivity, crew hours, material costs, or comparisons: use analytics tools.
- You can compare this jobsite to others — analytics tools are company-wide, not restricted to this jobsite.
- Always use tools to fetch real data. Do not make up numbers.
- When asked about this jobsite's performance, use search_jobsites to find it by jobcode/name, then fetch data.
- Format currency as $X,XXX,XXX. Format percentages to one decimal place. Format tonnes/hour to two decimal places.
- Be concise and lead with the key numbers or findings, then provide context.
- Link named entities when their ID is known from tool results:
  - Jobsite: [Name](/jobsite/{mongo_id})
  - Daily report: [date](/daily-report/{mongo_id})
  - Employee: [Name](/employee/{mongo_id})
- Citations for document quotes: **[[Document Type, p.X]](URL#page=X)**`;

  // ── Connect to MCP server ──────────────────────────────────────────────────
  const mcpClient = new Client({ name: "bow-mark-pm-chat", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${MCP_SERVER_URL}/mcp`));

  try {
    await mcpClient.connect(transport);
  } catch (err) {
    console.error("[pm-jobsite-chat] Failed to connect to MCP server:", err);
    res.status(503).json({ error: "Analytics server unavailable" });
    return;
  }

  let mcpTools: Anthropic.Tool[];
  try {
    const { tools: rawTools } = await mcpClient.listTools();
    mcpTools = rawTools.map((t) => ({
      name: t.name,
      description: t.description ?? "",
      input_schema: (t.inputSchema as Anthropic.Tool["input_schema"]) ?? {
        type: "object" as const,
        properties: {},
      },
    }));
  } catch (err) {
    console.error("[pm-jobsite-chat] Failed to load MCP tools:", err);
    await mcpClient.close();
    res.status(503).json({ error: "Failed to load analytics tools" });
    return;
  }

  // Combine read_document with MCP analytics tools
  const allTools: Anthropic.Tool[] = [READ_DOCUMENT_TOOL, ...mcpTools];

  const docExecutor = makeReadDocumentExecutor([...jobsiteFiles, ...specFiles]);

  try {
    await streamConversation({
      res,
      userId,
      conversationId,
      jobsiteId,
      chatType: "jobsite-pm",
      messages,
      systemPrompt,
      tools: allTools,
      maxTokens: 8192,
      executeTool: async (name, input) => {
        // Route to document executor or MCP
        if (name === READ_DOCUMENT_TOOL.name) {
          return docExecutor(name, input);
        }
        const mcpResult = await mcpClient.callTool({ name, arguments: input });
        const text =
          (mcpResult.content as Array<{ type: string; text?: string }>)
            .filter((c) => c.type === "text")
            .map((c) => c.text ?? "")
            .join("\n") || "No result";
        return { content: text, summary: text };
      },
      logPrefix: "[pm-jobsite-chat]",
    });
  } finally {
    await mcpClient.close();
  }
});

export default router;
