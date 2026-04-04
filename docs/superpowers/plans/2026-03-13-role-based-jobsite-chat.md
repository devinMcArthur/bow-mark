# Role-Based Jobsite Chat Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single jobsite chat into two role-differentiated chats — a Foreman chat (plain language, document-only, ESL-aware) and a PM chat (analytical, documents + full MCP analytics tools) — determined by the authenticated user's role on both the Jobsite and Daily Report pages.

**Architecture:** Add a `chatType` field to the `Conversation` schema to separate conversation pools. Create two new server routes (`/api/foreman-jobsite-chat` and `/api/pm-jobsite-chat`) with different system prompts and toolsets. The client detects the user's role via `useAuth` and passes the appropriate endpoints to the existing `ChatDrawer` component — no new UI components needed.

**Tech Stack:** Node.js/Express, Typegoose/Mongoose, Anthropic SDK, MCP client, React/Next.js, Chakra UI

---

## File Map

**Server — create:**
- `server/src/router/foreman-jobsite-chat.ts` — foreman route: jobsite documents, read_document tool, plain-language prompt
- `server/src/router/pm-jobsite-chat.ts` — PM route: jobsite documents + full MCP analytics tools, strategic prompt

**Server — modify:**
- `server/src/models/Conversation/schema/index.ts` — add `chatType?: string` field with index
- `server/src/lib/streamConversation.ts` — add `chatType?` to `StreamConversationOptions`, pass when creating new conversations
- `server/src/router/conversations.ts` — add `chatType` query filter; include `chatType` in `scope=all` response
- `server/src/app.ts` — mount new routes; remove old `/api/jobsite-chat` route

**Client — modify:**
- `client/src/components/DailyReport/DailyReportChatDrawer.tsx` — use `useAuth` to select foreman vs PM endpoints and suggestions
- `client/src/components/pages/jobsite/id/ClientContent.tsx` — same role-based endpoint selection

---

## Chunk 1: Server — Schema, streamConversation, and new routes

### Task 1: Add `chatType` to Conversation schema and streamConversation

**Files:**
- Modify: `server/src/models/Conversation/schema/index.ts`
- Modify: `server/src/lib/streamConversation.ts`

- [ ] **Step 1: Add `chatType` prop to ConversationSchema**

  In `server/src/models/Conversation/schema/index.ts`, add after the `jobsiteId` prop:

  ```typescript
  @Field({ nullable: true })
  @prop({ index: true })
  public chatType?: string;
  ```

  Full updated class (only the new field shown in context):
  ```typescript
  @Field(() => JobsiteClass, { nullable: true })
  @prop({ ref: () => JobsiteClass, index: true })
  public jobsiteId?: Ref<JobsiteClass>;

  @Field({ nullable: true })
  @prop({ index: true })
  public chatType?: string;

  @Field()
  @prop({ required: true, default: "New conversation" })
  public title!: string;
  ```

- [ ] **Step 2: Add `chatType` to StreamConversationOptions and pass it on create**

  In `server/src/lib/streamConversation.ts`, update the interface and the `Conversation.create` block:

  ```typescript
  export interface StreamConversationOptions {
    res: Response;
    userId: string;
    conversationId?: string;
    tenderId?: string;
    jobsiteId?: string;
    chatType?: string;   // ← add this
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    // ... rest unchanged
  }
  ```

  In the destructure at top of `streamConversation`:
  ```typescript
  const {
    res,
    userId,
    conversationId,
    tenderId,
    jobsiteId,
    chatType,          // ← add this
    messages,
    // ... rest unchanged
  } = opts;
  ```

  In the `Conversation.create` block (around line 92–102):
  ```typescript
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
  if (chatType) createData.chatType = chatType;   // ← add this
  convo = await Conversation.create(createData);
  ```

- [ ] **Step 3: Verify server compiles**

  ```bash
  cd /home/dev/work/bow-mark/server && npm run build 2>&1 | tail -20
  ```
  Expected: no TypeScript errors

- [ ] **Step 4: Commit**

  ```bash
  git add server/src/models/Conversation/schema/index.ts server/src/lib/streamConversation.ts
  git commit -m "feat(chat): add chatType field to Conversation schema and streamConversation"
  ```

---

### Task 2: Create foreman-jobsite-chat route

**Files:**
- Create: `server/src/router/foreman-jobsite-chat.ts`

The foreman route is a simplified version of the existing `jobsite-chat.ts` with a different system prompt. Key differences: plain language, 8th grade reading level, respond in user's language, focus on practical field guidance. Same `read_document` tool.

- [ ] **Step 1: Create `server/src/router/foreman-jobsite-chat.ts`**

  ```typescript
  import { Router } from "express";
  import jwt from "jsonwebtoken";
  import mongoose from "mongoose";
  import { Jobsite, User, System, EnrichedFile } from "@models";
  import { isDocument } from "@typegoose/typegoose";
  import { streamConversation } from "../lib/streamConversation";
  import { READ_DOCUMENT_TOOL, makeReadDocumentExecutor } from "../lib/readDocumentExecutor";
  import { UserRoles } from "../typescript/user";

  const router = Router();

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
      user?.name && `The worker's name is ${user.name}.`,
      employee?.jobTitle && `Their job title is ${employee.jobTitle}.`,
    ]
      .filter(Boolean)
      .join(" ");

    // Foreman chat: respect per-file minRole access
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

    const systemPrompt = `${userContext ? userContext + "\n\n" : ""}You are a field assistant helping foremen and crew at Bow-Mark, a paving and concrete company.

You are helping with jobsite: **${(jobsite as any).name}**${(jobsite as any).jobcode ? ` (Job Code: ${(jobsite as any).jobcode})` : ""}

## Jobsite Documents

${fileIndex || "No documents have been uploaded yet."}${pendingNotice}${specFileIndex ? `\n\n## Reference Specifications\n\n${specFileIndex}` : ""}

## Instructions

- Write at an 8th grade reading level. Use plain, simple language. Avoid jargon.
- Respond in the same language the user writes in. Workers may write in Spanish, French, or other languages — always reply in their language.
- Focus on practical, actionable information: what needs to be done, safety requirements, material specs for the current work.
- Use document summaries to find the right document, then use read_document to load it.
- Load ONE document at a time. Never call read_document more than once per response.
- There is a strict 90-page limit per conversation turn.
- When quoting requirements, include the page number: e.g. "According to the specs (p. 12)..."
- Keep answers short and focused. Workers are in the field.`;

    await streamConversation({
      res,
      userId,
      conversationId,
      jobsiteId,
      chatType: "jobsite-foreman",
      messages,
      systemPrompt,
      tools: [READ_DOCUMENT_TOOL],
      toolChoice: { type: "auto", disable_parallel_tool_use: true },
      maxTokens: 4096,
      executeTool: makeReadDocumentExecutor([...jobsiteFiles, ...specFiles]),
      logPrefix: "[foreman-jobsite-chat]",
    });
  });

  export default router;
  ```

- [ ] **Step 2: Verify server compiles**

  ```bash
  cd /home/dev/work/bow-mark/server && npm run build 2>&1 | tail -20
  ```
  Expected: no errors

- [ ] **Step 3: Commit**

  ```bash
  git add server/src/router/foreman-jobsite-chat.ts
  git commit -m "feat(chat): add foreman-jobsite-chat route with plain-language field-focused prompt"
  ```

---

### Task 3: Create pm-jobsite-chat route

**Files:**
- Create: `server/src/router/pm-jobsite-chat.ts`

The PM route combines jobsite documents (like the foreman route) with the full MCP analytics toolset (like `chat.ts`). The system prompt is strategic and analytical, establishes jobsite context, and instructs the AI to use analytics tools for performance questions.

- [ ] **Step 1: Create `server/src/router/pm-jobsite-chat.ts`**

  ```typescript
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
  ```

- [ ] **Step 2: Verify server compiles**

  ```bash
  cd /home/dev/work/bow-mark/server && npm run build 2>&1 | tail -20
  ```
  Expected: no errors

- [ ] **Step 3: Commit**

  ```bash
  git add server/src/router/pm-jobsite-chat.ts
  git commit -m "feat(chat): add pm-jobsite-chat route with documents + full analytics toolset"
  ```

---

## Chunk 2: Server — Conversations endpoint + app.ts wiring

### Task 4: Update conversations endpoint to support chatType filtering

**Files:**
- Modify: `server/src/router/conversations.ts`

The `GET /conversations` endpoint needs to:
1. Accept `?chatType=` query param and filter by it when present
2. Include `chatType` in `scope=all` response items

- [ ] **Step 1: Update the `jobsiteId` filter branch to include `chatType`**

  In `server/src/router/conversations.ts`, find the section that builds the `query` object (around line 92–99) and update it:

  ```typescript
  const { jobsiteId, scope, chatType } = req.query as {
    jobsiteId?: string;
    scope?: string;
    chatType?: string;
  };
  ```

  Then in the `query` building block:
  ```typescript
  const query: Record<string, unknown> = { user: req.userId };
  if (jobsiteId && mongoose.isValidObjectId(jobsiteId)) {
    query.jobsiteId = new mongoose.Types.ObjectId(jobsiteId);
    if (chatType) query.chatType = chatType;        // ← add this
  } else {
    query.tenderId = { $exists: false };
    query.jobsiteId = { $exists: false };
  }
  ```

- [ ] **Step 2: Include `chatType` in scope=all response**

  In the `scope === "all"` branch, add `chatType` to the projection and return it:

  ```typescript
  const convos = await Conversation.find(
    { user: req.userId },
    "title aiModel totalInputTokens totalOutputTokens updatedAt createdAt jobsiteId tenderId chatType"  // ← add chatType
  )
  ```

  And in the `return res.json(convos.map(...))` block, add `chatType` to each item:
  ```typescript
  return {
    id: c._id.toString(),
    title: c.title,
    model: c.aiModel,
    totalInputTokens: c.totalInputTokens,
    totalOutputTokens: c.totalOutputTokens,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
    ...(context ? { context } : {}),
    ...(c.chatType ? { chatType: c.chatType } : {}),  // ← add this
  };
  ```

- [ ] **Step 3: Verify server compiles**

  ```bash
  cd /home/dev/work/bow-mark/server && npm run build 2>&1 | tail -20
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add server/src/router/conversations.ts
  git commit -m "feat(chat): add chatType filter and field to conversations endpoint"
  ```

---

### Task 5: Mount new routes and remove old jobsite-chat route

**Files:**
- Modify: `server/src/app.ts`

- [ ] **Step 1: Update imports in `server/src/app.ts`**

  Replace:
  ```typescript
  import jobsiteChatRouter from "./router/jobsite-chat";
  ```
  With:
  ```typescript
  import foremanJobsiteChatRouter from "./router/foreman-jobsite-chat";
  import pmJobsiteChatRouter from "./router/pm-jobsite-chat";
  ```

- [ ] **Step 2: Update route mounts**

  Replace:
  ```typescript
  app.use("/api/jobsite-chat", jobsiteChatRouter);
  ```
  With:
  ```typescript
  app.use("/api/foreman-jobsite-chat", foremanJobsiteChatRouter);
  app.use("/api/pm-jobsite-chat", pmJobsiteChatRouter);
  ```

- [ ] **Step 3: Verify server compiles**

  ```bash
  cd /home/dev/work/bow-mark/server && npm run build 2>&1 | tail -20
  ```
  Expected: no errors

- [ ] **Step 4: Check k8s pod logs to confirm server started correctly**

  ```bash
  kubectl config current-context   # must be minikube
  kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=30
  ```
  Expected: server started without errors

- [ ] **Step 5: Commit**

  ```bash
  git add server/src/app.ts
  git commit -m "feat(chat): mount foreman and PM jobsite chat routes, remove legacy jobsite-chat route"
  ```

---

## Chunk 3: Client — Role-based drawer selection

### Task 6: Update DailyReportChatDrawer to use role-based endpoints

**Files:**
- Modify: `client/src/components/DailyReport/DailyReportChatDrawer.tsx`

The drawer currently passes hardcoded foreman-appropriate endpoints. Now it needs to check the user's role and pass the PM or Foreman endpoint accordingly.

- [ ] **Step 1: Update `DailyReportChatDrawer.tsx`**

  Full replacement:

  ```typescript
  import { useAuth } from "../../contexts/Auth";
  import { UserRoles } from "../../generated/graphql";
  import ChatDrawer from "../Chat/ChatDrawer";

  const FOREMAN_SUGGESTIONS = [
    "What do I need to know for today's work?",
    "Are there any safety requirements I should be aware of?",
    "What are the material or mix specifications for this job?",
    "What are the compaction or quality requirements?",
  ];

  const PM_SUGGESTIONS = [
    "How is this jobsite performing financially?",
    "Summarize the key scope and contract requirements",
    "What are the specification requirements for this job?",
    "Compare this jobsite's productivity to similar jobs",
  ];

  interface DailyReportChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    jobsiteId: string;
    jobsiteName: string;
  }

  const DailyReportChatDrawer = ({
    isOpen,
    onClose,
    jobsiteId,
    jobsiteName,
  }: DailyReportChatDrawerProps) => {
    const { state: { user } } = useAuth();
    const isPM = user?.role === UserRoles.Admin || user?.role === UserRoles.ProjectManager;

    const messageEndpoint = isPM
      ? "/api/pm-jobsite-chat/message"
      : "/api/foreman-jobsite-chat/message";

    const conversationsEndpoint = isPM
      ? `/conversations?jobsiteId=${jobsiteId}&chatType=jobsite-pm`
      : `/conversations?jobsiteId=${jobsiteId}&chatType=jobsite-foreman`;

    const suggestions = isPM ? PM_SUGGESTIONS : FOREMAN_SUGGESTIONS;

    return (
      <ChatDrawer
        isOpen={isOpen}
        onClose={onClose}
        title={jobsiteName}
        messageEndpoint={messageEndpoint}
        conversationsEndpoint={conversationsEndpoint}
        extraPayload={{ jobsiteId }}
        suggestions={suggestions}
        minRole={UserRoles.User}
      />
    );
  };

  export default DailyReportChatDrawer;
  ```

- [ ] **Step 2: Check TypeScript**

  ```bash
  cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | grep -E "DailyReport"
  ```
  Expected: no errors for this file

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/components/DailyReport/DailyReportChatDrawer.tsx
  git commit -m "feat(chat): role-based endpoint selection in DailyReportChatDrawer"
  ```

---

### Task 7: Update Jobsite ClientContent to use role-based endpoints

**Files:**
- Modify: `client/src/components/pages/jobsite/id/ClientContent.tsx`

The Jobsite page currently uses hardcoded `ChatDrawer` props pointing at the old `/api/jobsite-chat` endpoint. Update to use role-based endpoints and suggestions, matching the same pattern as the daily report drawer.

- [ ] **Step 1: Add PM suggestions constant**

  At the top of `client/src/components/pages/jobsite/id/ClientContent.tsx`, replace the existing `JOBSITE_SUGGESTIONS` constant with two role-specific ones:

  ```typescript
  const FOREMAN_JOBSITE_SUGGESTIONS = [
    "What do I need to know for today's work?",
    "Are there any safety requirements I should be aware of?",
    "What are the material or mix specifications for this job?",
    "What are the compaction or quality requirements?",
  ];

  const PM_JOBSITE_SUGGESTIONS = [
    "How is this jobsite performing financially?",
    "Summarize the key scope and contract requirements",
    "What are the specification requirements for this job?",
    "Compare this jobsite's productivity to similar jobs",
  ];
  ```

- [ ] **Step 2: Add `useAuth` import**

  `useAuth` is not currently imported in this file. Add it near the other context imports:
  ```typescript
  import { useAuth } from "../../../../contexts/Auth";
  ```

- [ ] **Step 3: Add role detection in the component body**

  In `JobsiteClientContent`, after the existing hook initializations, add:

  ```typescript
  const { state: { user } } = useAuth();
  const isPM = user?.role === UserRoles.Admin || user?.role === UserRoles.ProjectManager;

  const chatMessageEndpoint = isPM
    ? "/api/pm-jobsite-chat/message"
    : "/api/foreman-jobsite-chat/message";

  const chatConversationsEndpoint = isPM
    ? `/conversations?jobsiteId=${id}&chatType=jobsite-pm`
    : `/conversations?jobsiteId=${id}&chatType=jobsite-foreman`;

  const chatSuggestions = isPM ? PM_JOBSITE_SUGGESTIONS : FOREMAN_JOBSITE_SUGGESTIONS;
  ```

- [ ] **Step 4: Lower the Permission gate on the chat button**

  The chat open button is currently wrapped in `<Permission minRole={UserRoles.ProjectManager}>`, which prevents foremen from seeing it. Since both roles now have a chat, lower it to `UserRoles.User`:

  Find the `<Permission>` wrapper around the chat `IconButton` (search for `onChatOpen` in the JSX) and change:
  ```tsx
  <Permission minRole={UserRoles.ProjectManager}>
  ```
  to:
  ```tsx
  <Permission minRole={UserRoles.User}>
  ```

- [ ] **Step 5: Update the ChatDrawer usage**

  Find the `<ChatDrawer` block near the bottom of the JSX and update its props:

  ```tsx
  <ChatDrawer
    isOpen={chatOpen}
    onClose={onChatClose}
    title={jobsite.name}
    messageEndpoint={chatMessageEndpoint}
    conversationsEndpoint={chatConversationsEndpoint}
    extraPayload={{ jobsiteId: jobsite._id }}
    suggestions={chatSuggestions}
    minRole={UserRoles.User}
  />
  ```

- [ ] **Step 6: Also update the `useMemo` deps array**

  The derived endpoint strings and suggestions are constants computed from `isPM` — they don't need to be in deps independently. Add only `isPM` to the `React.useMemo` dependency array at the bottom of the component (the large array that includes `data`, `previousYears`, etc.):

  ```typescript
  // In the useMemo deps array, add:
  isPM,
  ```

- [ ] **Step 7: Check TypeScript**

  ```bash
  cd /home/dev/work/bow-mark/client && npm run type-check 2>&1 | grep -v "JobsiteEnrichedFiles"
  ```
  Expected: no new errors

- [ ] **Step 8: Commit**

  ```bash
  git add client/src/components/pages/jobsite/id/ClientContent.tsx
  git commit -m "feat(chat): role-based endpoint selection in Jobsite page chat drawer"
  ```

---

## Cleanup

### Task 8: Remove the now-unused legacy jobsite-chat router file

**Files:**
- Delete: `server/src/router/jobsite-chat.ts`

- [ ] **Step 1: Delete the file**

  ```bash
  rm server/src/router/jobsite-chat.ts
  ```

- [ ] **Step 2: Verify server still compiles**

  ```bash
  cd /home/dev/work/bow-mark/server && npm run build 2>&1 | tail -20
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add -A server/src/router/jobsite-chat.ts
  git commit -m "chore: remove legacy jobsite-chat router (replaced by foreman and PM variants)"
  ```
