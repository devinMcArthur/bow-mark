# Chat: Saved Conversations + Cost Ticker — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist chat conversations per-user in MongoDB, allow resuming/renaming/deleting them, and display a real-time per-conversation cost ticker in the chat header.

**Architecture:** New `ChatConversation` Mongoose model (plain schema, no GraphQL). New REST router at `/conversations` for CRUD. Chat router updated to create/load conversations, accumulate token counts, emit `conversation_id`/`usage`/`title` SSE events. Client gains a 240px left sidebar and a cost badge.

**Tech Stack:** Express + Mongoose (plain schema), Anthropic SDK (`claude-haiku-4-5` for title gen), Chakra UI, React state, SSE streaming.

---

### Task 1: ChatConversation Mongoose model

**Files:**
- Create: `server/src/models/ChatConversation.ts`
- Modify: `server/src/models/index.ts`

**Step 1: Create the model file**

```ts
// server/src/models/ChatConversation.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface IChatConversation extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  model: string;
  messages: IChatMessage[];
  totalInputTokens: number;
  totalOutputTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const ChatConversationSchema = new Schema<IChatConversation>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, default: "New conversation" },
    model: { type: String, required: true },
    messages: { type: [ChatMessageSchema], default: [] },
    totalInputTokens: { type: Number, default: 0 },
    totalOutputTokens: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ChatConversation: Model<IChatConversation> =
  mongoose.models.ChatConversation ||
  mongoose.model<IChatConversation>("ChatConversation", ChatConversationSchema);
```

**Step 2: Export from models index**

In `server/src/models/index.ts`, add at the end of the file (after the last export):

```ts
export * from "./ChatConversation";
```

**Step 3: Commit**

```bash
git add server/src/models/ChatConversation.ts server/src/models/index.ts
git commit -m "feat: add ChatConversation Mongoose model"
```

---

### Task 2: Conversations REST router

**Files:**
- Create: `server/src/router/conversations.ts`
- Modify: `server/src/app.ts`

**Step 1: Create the router**

```ts
// server/src/router/conversations.ts
import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { ChatConversation } from "../models/ChatConversation";

const router = Router();

// Middleware: verify JWT and extract userId
const auth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization;
  if (!token || !process.env.JWT_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    req.userId = decoded?.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// GET /conversations — list user's conversations (no messages)
router.get("/", auth, async (req: any, res) => {
  const convos = await ChatConversation.find(
    { user: req.userId },
    "title model totalInputTokens totalOutputTokens updatedAt createdAt"
  )
    .sort({ updatedAt: -1 })
    .lean();

  res.json(
    convos.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      model: c.model,
      totalInputTokens: c.totalInputTokens,
      totalOutputTokens: c.totalOutputTokens,
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    }))
  );
});

// GET /conversations/:id — full conversation
router.get("/:id", auth, async (req: any, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const convo = await ChatConversation.findById(req.params.id).lean();
  if (!convo) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (convo.user.toString() !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json({
    id: convo._id.toString(),
    title: convo.title,
    model: convo.model,
    messages: convo.messages,
    totalInputTokens: convo.totalInputTokens,
    totalOutputTokens: convo.totalOutputTokens,
    updatedAt: convo.updatedAt,
    createdAt: convo.createdAt,
  });
});

// PATCH /conversations/:id/title — rename
router.patch("/:id/title", auth, async (req: any, res) => {
  const { title } = req.body as { title: string };
  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title required" });
    return;
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const convo = await ChatConversation.findById(req.params.id);
  if (!convo) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (convo.user.toString() !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  convo.title = title.trim();
  await convo.save();
  res.json({ id: convo._id.toString(), title: convo.title });
});

// DELETE /conversations/:id
router.delete("/:id", auth, async (req: any, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const convo = await ChatConversation.findById(req.params.id);
  if (!convo) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (convo.user.toString() !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await convo.deleteOne();
  res.json({ success: true });
});

export default router;
```

**Step 2: Mount router in app.ts**

In `server/src/app.ts`, add after the existing router imports:
```ts
import conversationsRouter from "./router/conversations";
```

And add after `app.use("/chat", chatRouter);`:
```ts
app.use("/conversations", conversationsRouter);
```

**Step 3: Commit**

```bash
git add server/src/router/conversations.ts server/src/app.ts
git commit -m "feat: add conversations REST router (list, get, rename, delete)"
```

---

### Task 3: Update chat router — conversation persistence + usage events

**Files:**
- Modify: `server/src/router/chat.ts`

**Step 1: Read the current file**

Read `server/src/router/chat.ts` before editing.

**Step 2: Update the request handler**

Replace the full `router.post("/", ...)` handler. Key changes:

1. Decode JWT to extract `userId` (after verifying it)
2. Accept `conversationId?: string` from request body
3. Create or load `ChatConversation` document
4. Emit `conversation_id` for new conversations
5. After each Claude turn completes (`await stream.finalMessage()`), increment token counts and emit `usage` event
6. After the loop, append new user+assistant messages to the conversation
7. First turn only: fire Haiku title generation, emit `title` event

Full updated handler:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Router } from "express";
import jwt from "jsonwebtoken";
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

router.post("/", async (req, res) => {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const token = req.headers.authorization;
  if (!token || !process.env.JWT_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let userId: string;
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    userId = decoded?.userId;
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
  const MODEL = "claude-opus-4-6";
  let convo: Awaited<ReturnType<typeof ChatConversation.findById>>;
  let isNewConversation = false;

  if (conversationId) {
    convo = await ChatConversation.findById(conversationId);
    if (!convo || convo.user.toString() !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  } else {
    convo = await ChatConversation.create({
      user: userId,
      title: "New conversation",
      model: MODEL,
      messages: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
    });
    isNewConversation = true;
  }

  // ── Connect to MCP server ────────────────────────────────────────────────
  const mcpClient = new Client({ name: "bow-mark-chat", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${MCP_SERVER_URL}/mcp`));

  try {
    await mcpClient.connect(transport);
  } catch (err) {
    console.error("Failed to connect to MCP server:", err);
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

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // Use messages from request (client manages history for active session)
  const conversationMessages: Anthropic.MessageParam[] = [...messages];

  // Track which turn we're on (for title generation)
  const isFirstTurn = convo!.messages.length === 0;
  // Capture the first user message for title generation
  const firstUserMessage = messages.find((m) => m.role === "user")?.content;

  // ── Agentic loop ─────────────────────────────────────────────────────────
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
      });

      // Accumulate tokens on conversation document
      convo!.totalInputTokens += message.usage.input_tokens;
      convo!.totalOutputTokens += message.usage.output_tokens;

      if (message.stop_reason === "end_turn") {
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
    // Append new user + final assistant messages to conversation
    const lastUserMsg = messages[messages.length - 1];
    const lastAssistantContent = conversationMessages[conversationMessages.length - 1];
    if (lastUserMsg?.role === "user" && typeof lastUserMsg.content === "string") {
      convo!.messages.push({ role: "user", content: lastUserMsg.content });
    }
    if (lastAssistantContent?.role === "assistant") {
      // Extract text content from potentially array content
      const content = lastAssistantContent.content;
      const text = typeof content === "string"
        ? content
        : (content as Anthropic.ContentBlock[])
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map((b) => b.text)
            .join("");
      if (text) convo!.messages.push({ role: "assistant", content: text });
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
        // Non-fatal: conversation still works without a good title
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
```

**Step 3: Commit**

```bash
git add server/src/router/chat.ts
git commit -m "feat: persist conversations, emit conversation_id/usage/title SSE events"
```

---

### Task 4: Client — conversation sidebar + SSE event handling

**Files:**
- Modify: `client/src/pages/chat.tsx`

This task rewrites the chat page to add the sidebar, handle the 3 new SSE event types, send `conversationId` in requests, and load past conversations.

**Step 1: Read the current file before editing**

Read `client/src/pages/chat.tsx` first.

**Step 2: Replace the full file**

```tsx
import React from "react";
import {
  Box,
  Code,
  Flex,
  HStack,
  IconButton,
  Input,
  Spinner,
  Text,
  VStack,
  Tooltip,
  useDisclosure,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverFooter,
  Button,
} from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NextPage } from "next";
import { FiSend, FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import Permission from "../components/Common/Permission";
import { UserRoles } from "../generated/graphql";
import { localStorageTokenKey } from "../contexts/Auth";
import { navbarHeight } from "../constants/styles";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  toolCalls?: string[];
  isStreaming?: boolean;
}

interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  updatedAt: string;
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6":   { input: 5.00, output: 25.00 },
  "claude-sonnet-4-6": { input: 3.00, output: 15.00 },
  "claude-haiku-4-5":  { input: 1.00, output:  5.00 },
};

const ACTIVE_MODEL = "claude-opus-4-6";

function calcCost(inputTokens: number, outputTokens: number, model: string): number {
  const rate = MODEL_RATES[model] ?? MODEL_RATES["claude-opus-4-6"];
  return (inputTokens / 1e6) * rate.input + (outputTokens / 1e6) * rate.output;
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

const MarkdownContent = ({ content }: { content: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }) => (
        <Text fontSize="sm" lineHeight="1.7" mb={2}>{children}</Text>
      ),
      h1: ({ children }) => (
        <Text fontSize="lg" fontWeight="700" mb={2} mt={3}>{children}</Text>
      ),
      h2: ({ children }) => (
        <Text fontSize="md" fontWeight="700" mb={2} mt={3}>{children}</Text>
      ),
      h3: ({ children }) => (
        <Text fontSize="sm" fontWeight="700" mb={1} mt={2}>{children}</Text>
      ),
      ul: ({ children }) => (
        <Box as="ul" pl={5} mb={2} fontSize="sm" lineHeight="1.7">{children}</Box>
      ),
      ol: ({ children }) => (
        <Box as="ol" pl={5} mb={2} fontSize="sm" lineHeight="1.7">{children}</Box>
      ),
      li: ({ children }) => <Box as="li" mb={0.5}>{children}</Box>,
      code: ({ children, className, inline }: { children: React.ReactNode; className?: string; inline?: boolean }) =>
        !inline ? (
          <Code display="block" whiteSpace="pre" p={3} borderRadius="md" fontSize="xs" bg="gray.50" border="1px solid" borderColor="gray.200" overflowX="auto" mb={2} w="full">{children}</Code>
        ) : (
          <Code fontSize="xs" px={1} py={0.5} borderRadius="sm" bg="gray.100">{children}</Code>
        ),
      table: ({ children }) => (
        <Box overflowX="auto" mb={2}>
          <Box as="table" w="full" fontSize="sm" borderCollapse="collapse">{children}</Box>
        </Box>
      ),
      thead: ({ children }) => <Box as="thead" bg="gray.50">{children}</Box>,
      th: ({ children }) => (
        <Box as="th" px={3} py={1.5} textAlign="left" fontWeight="600" borderBottom="2px solid" borderColor="gray.200" whiteSpace="nowrap">{children}</Box>
      ),
      td: ({ children }) => (
        <Box as="td" px={3} py={1.5} borderBottom="1px solid" borderColor="gray.100">{children}</Box>
      ),
      strong: ({ children }) => <Box as="strong" fontWeight="600">{children}</Box>,
      em: ({ children }) => <Box as="em" fontStyle="italic">{children}</Box>,
      hr: () => <Box borderTop="1px solid" borderColor="gray.200" my={3} />,
      blockquote: ({ children }) => (
        <Box borderLeft="3px solid" borderColor="blue.300" pl={3} py={0.5} my={2} color="gray.600">{children}</Box>
      ),
      a: ({ href, children }) => (
        <Box
          as="a"
          href={href}
          color="blue.600"
          textDecoration="underline"
          _hover={{ color: "blue.800" }}
          target={href?.startsWith("/") ? "_self" : "_blank"}
          rel={href?.startsWith("/") ? undefined : "noopener noreferrer"}
        >
          {children}
        </Box>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "How are we performing this year overall?",
  "Which jobsite has the highest net margin this year?",
  "What's our T/H compared to last year?",
  "Show me crew productivity rankings for 2025",
];

// ─── Sidebar conversation item ────────────────────────────────────────────────

const ConversationItem = ({
  convo,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  convo: ConversationSummary;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) => {
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(convo.title);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { isOpen: deleteOpen, onOpen: openDelete, onClose: closeDelete } = useDisclosure();

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(convo.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const saveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== convo.title) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <Box
      px={3}
      py={2}
      borderRadius="md"
      bg={isActive ? "blue.50" : "transparent"}
      border="1px solid"
      borderColor={isActive ? "blue.200" : "transparent"}
      cursor="pointer"
      _hover={{ bg: isActive ? "blue.50" : "gray.100" }}
      onClick={onSelect}
      role="group"
      position="relative"
    >
      {editing ? (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          size="xs"
          onClick={(e) => e.stopPropagation()}
          autoFocus
        />
      ) : (
        <>
          <Text fontSize="xs" fontWeight="500" color="gray.700" noOfLines={1}>
            {convo.title}
          </Text>
          <Text fontSize="xs" color="gray.400" mt={0.5}>
            {relativeTime(convo.updatedAt)}
          </Text>
          <HStack
            spacing={1}
            position="absolute"
            right={2}
            top="50%"
            transform="translateY(-50%)"
            opacity={0}
            _groupHover={{ opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip label="Rename" placement="top" hasArrow>
              <IconButton
                aria-label="Rename"
                icon={<FiEdit2 />}
                size="xs"
                variant="ghost"
                onClick={startEdit}
              />
            </Tooltip>
            <Popover isOpen={deleteOpen} onClose={closeDelete} placement="right">
              <PopoverTrigger>
                <IconButton
                  aria-label="Delete"
                  icon={<FiTrash2 />}
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={openDelete}
                />
              </PopoverTrigger>
              <PopoverContent w="200px">
                <PopoverBody>
                  <Text fontSize="xs">Delete this conversation?</Text>
                </PopoverBody>
                <PopoverFooter>
                  <HStack spacing={2}>
                    <Button size="xs" variant="ghost" onClick={closeDelete}>Cancel</Button>
                    <Button
                      size="xs"
                      colorScheme="red"
                      onClick={() => { closeDelete(); onDelete(); }}
                    >
                      Delete
                    </Button>
                  </HStack>
                </PopoverFooter>
              </PopoverContent>
            </Popover>
          </HStack>
        </>
      )}
    </Box>
  );
};

// ─── Chat Page ────────────────────────────────────────────────────────────────

const ChatPage: NextPage = () => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [conversations, setConversations] = React.useState<ConversationSummary[]>([]);
  const [inputTokens, setInputTokens] = React.useState(0);
  const [outputTokens, setOutputTokens] = React.useState(0);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const serverBase = (process.env.NEXT_PUBLIC_API_URL as string).replace("/graphql", "");
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem(localStorageTokenKey) : null;

  // Load conversation list on mount
  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${serverBase}/conversations`, {
          headers: { Authorization: getToken() ?? "" },
        });
        if (res.ok) setConversations(await res.json());
      } catch {}
    };
    load();
  }, []);

  // Scroll to bottom whenever messages update
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInputTokens(0);
    setOutputTokens(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`${serverBase}/conversations/${id}`, {
        headers: { Authorization: getToken() ?? "" },
      });
      if (!res.ok) return;
      const data = await res.json();
      setConversationId(data.id);
      setInputTokens(data.totalInputTokens);
      setOutputTokens(data.totalOutputTokens);
      setMessages(
        data.messages.map((m: { role: Role; content: string }) => ({
          id: genId(),
          role: m.role,
          content: m.content,
        }))
      );
    } catch {}
  };

  const renameConversation = async (id: string, title: string) => {
    try {
      const res = await fetch(`${serverBase}/conversations/${id}/title`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: getToken() ?? "",
        },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title } : c))
        );
      }
    } catch {}
  };

  const deleteConversation = async (id: string) => {
    try {
      const res = await fetch(`${serverBase}/conversations/${id}`, {
        method: "DELETE",
        headers: { Authorization: getToken() ?? "" },
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (conversationId === id) startNewChat();
      }
    } catch {}
  };

  const sendMessage = React.useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMessage: ChatMessage = {
        id: genId(),
        role: "user",
        content: text.trim(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setLoading(true);

      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const assistantId = genId();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", toolCalls: [], isStreaming: true },
      ]);

      try {
        const token = getToken();
        const body: Record<string, unknown> = { messages: history };
        if (conversationId) body.conversationId = conversationId;

        const response = await fetch(`${serverBase}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ?? "",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Request failed" }));
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: `Error: ${err.error || "Request failed"}`, isStreaming: false }
                : m
            )
          );
          return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) return;

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            try {
              const event = JSON.parse(raw) as {
                type: string;
                delta?: string;
                toolName?: string;
                message?: string;
                id?: string;
                inputTokens?: number;
                outputTokens?: number;
                title?: string;
              };

              if (event.type === "text_delta" && event.delta) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.delta }
                      : m
                  )
                );
              } else if (event.type === "tool_call" && event.toolName) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, toolCalls: [...(m.toolCalls ?? []), event.toolName!] }
                      : m
                  )
                );
              } else if (event.type === "conversation_id" && event.id) {
                setConversationId(event.id);
                // Add new conversation to sidebar
                setConversations((prev) => [
                  {
                    id: event.id!,
                    title: "New conversation",
                    model: "claude-opus-4-6",
                    totalInputTokens: 0,
                    totalOutputTokens: 0,
                    updatedAt: new Date().toISOString(),
                  },
                  ...prev,
                ]);
              } else if (event.type === "usage") {
                setInputTokens((prev) => prev + (event.inputTokens ?? 0));
                setOutputTokens((prev) => prev + (event.outputTokens ?? 0));
                // Update token counts in sidebar list
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === conversationId || (event.id && c.id === event.id)
                      ? {
                          ...c,
                          totalInputTokens: c.totalInputTokens + (event.inputTokens ?? 0),
                          totalOutputTokens: c.totalOutputTokens + (event.outputTokens ?? 0),
                          updatedAt: new Date().toISOString(),
                        }
                      : c
                  )
                );
              } else if (event.type === "title" && event.title) {
                // Update title in sidebar — use functional update to capture current conversationId
                setConversations((prev) =>
                  prev.map((c, idx) =>
                    idx === 0 && c.title === "New conversation"
                      ? { ...c, title: event.title! }
                      : c
                  )
                );
              } else if (event.type === "done" || event.type === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          isStreaming: false,
                          content:
                            event.type === "error"
                              ? `Error: ${event.message || "Unknown error"}`
                              : m.content,
                        }
                      : m
                  )
                );
              }
            } catch {
              // skip malformed events
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
        );
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [messages, loading, conversationId]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const isEmpty = messages.length === 0;
  const cost = calcCost(inputTokens, outputTokens, ACTIVE_MODEL);

  return (
    <Permission minRole={UserRoles.Admin} type={null} showError>
      <Flex h={`calc(100vh - ${navbarHeight})`} overflow="hidden">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <Flex
          direction="column"
          w="240px"
          flexShrink={0}
          bg="white"
          borderRight="1px solid"
          borderColor="gray.200"
          overflow="hidden"
        >
          <Box px={3} py={3} borderBottom="1px solid" borderColor="gray.100">
            <Button
              leftIcon={<FiPlus />}
              size="sm"
              w="full"
              variant="outline"
              colorScheme="blue"
              onClick={startNewChat}
            >
              New Chat
            </Button>
          </Box>
          <Box flex={1} overflowY="auto" px={2} py={2}>
            <VStack spacing={1} align="stretch">
              {conversations.map((c) => (
                <ConversationItem
                  key={c.id}
                  convo={c}
                  isActive={c.id === conversationId}
                  onSelect={() => loadConversation(c.id)}
                  onRename={(title) => renameConversation(c.id, title)}
                  onDelete={() => deleteConversation(c.id)}
                />
              ))}
            </VStack>
          </Box>
        </Flex>

        {/* ── Chat area ───────────────────────────────────────────────────── */}
        <Flex direction="column" flex={1} bg="gray.50" overflow="hidden">
          {/* Header */}
          <Box
            px={6}
            py={3}
            bg="white"
            borderBottom="1px solid"
            borderColor="gray.200"
            flexShrink={0}
          >
            <HStack spacing={3} justify="space-between">
              <HStack spacing={3}>
                <Box w={2} h={2} borderRadius="full" bg="green.400" />
                <Text fontSize="sm" fontWeight="600" color="gray.700" letterSpacing="wide">
                  Analytics Assistant
                </Text>
                <Text fontSize="xs" color="gray.400">
                  Powered by Claude
                </Text>
              </HStack>
              {(inputTokens > 0 || outputTokens > 0) && (
                <Tooltip
                  label={`${inputTokens.toLocaleString()} input + ${outputTokens.toLocaleString()} output tokens`}
                  placement="bottom"
                >
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    bg="gray.100"
                    px={2}
                    py={0.5}
                    borderRadius="md"
                    fontFamily="mono"
                    cursor="default"
                  >
                    ~${cost.toFixed(4)}
                  </Text>
                </Tooltip>
              )}
            </HStack>
          </Box>

          {/* Messages area */}
          <Box flex={1} overflowY="auto" px={4} py={6}>
            <Box maxW="800px" mx="auto">
              {isEmpty && (
                <VStack spacing={6} mt={16} align="center">
                  <VStack spacing={1}>
                    <Text fontSize="xl" fontWeight="700" color="gray.700">
                      Ask about jobsite performance
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      Query revenue, productivity, crew benchmarks, and more
                    </Text>
                  </VStack>
                  <VStack spacing={2} align="stretch" w="full" maxW="520px">
                    {SUGGESTIONS.map((s) => (
                      <Box
                        key={s}
                        as="button"
                        onClick={() => sendMessage(s)}
                        px={4}
                        py={3}
                        bg="white"
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="md"
                        textAlign="left"
                        fontSize="sm"
                        color="gray.700"
                        _hover={{ borderColor: "blue.400", bg: "blue.50", color: "blue.700" }}
                        transition="all 0.15s"
                        cursor="pointer"
                      >
                        {s}
                      </Box>
                    ))}
                  </VStack>
                </VStack>
              )}

              <VStack spacing={4} align="stretch">
                {messages.map((msg) => (
                  <Box key={msg.id} alignSelf={msg.role === "user" ? "flex-end" : "flex-start"} maxW="85%">
                    {msg.role === "user" ? (
                      <Box
                        bg="blue.600"
                        color="white"
                        px={4}
                        py={3}
                        borderRadius="lg"
                        borderBottomRightRadius="sm"
                      >
                        <Text fontSize="sm" lineHeight="1.6">
                          {msg.content}
                        </Text>
                      </Box>
                    ) : (
                      <Box>
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <HStack spacing={1} mb={2} flexWrap="wrap">
                            {[...new Set(msg.toolCalls)].map((tool) => (
                              <Box
                                key={tool}
                                px={2}
                                py={0.5}
                                bg="gray.100"
                                borderRadius="sm"
                                fontSize="xs"
                                color="gray.500"
                                fontFamily="mono"
                              >
                                {tool}
                              </Box>
                            ))}
                          </HStack>
                        )}
                        <Box
                          bg="white"
                          border="1px solid"
                          borderColor="gray.200"
                          px={4}
                          py={3}
                          borderRadius="lg"
                          borderBottomLeftRadius="sm"
                          shadow="sm"
                        >
                          {msg.isStreaming && msg.content === "" ? (
                            <HStack spacing={2}>
                              <Spinner size="xs" color="blue.400" />
                              <Text fontSize="sm" color="gray.400">
                                {msg.toolCalls && msg.toolCalls.length > 0
                                  ? "Querying database..."
                                  : "Thinking..."}
                              </Text>
                            </HStack>
                          ) : (
                            <>
                              <MarkdownContent content={msg.content} />
                              {msg.isStreaming && (
                                <Box
                                  display="inline-block"
                                  w="2px"
                                  h="14px"
                                  bg="blue.500"
                                  ml={0.5}
                                  verticalAlign="middle"
                                  animation="blink 1s step-end infinite"
                                  sx={{
                                    "@keyframes blink": {
                                      "0%, 100%": { opacity: 1 },
                                      "50%": { opacity: 0 },
                                    },
                                  }}
                                />
                              )}
                            </>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}
              </VStack>

              <Box ref={bottomRef} />
            </Box>
          </Box>

          {/* Input area */}
          <Box
            bg="white"
            borderTop="1px solid"
            borderColor="gray.200"
            px={4}
            py={4}
            flexShrink={0}
          >
            <Box maxW="800px" mx="auto">
              <form onSubmit={handleSubmit}>
                <HStack spacing={2}>
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about jobsite performance, revenue, productivity..."
                    size="md"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.300"
                    _focus={{ borderColor: "blue.400", bg: "white", boxShadow: "none" }}
                    _placeholder={{ color: "gray.400", fontSize: "sm" }}
                    disabled={loading}
                    autoFocus
                  />
                  <IconButton
                    type="submit"
                    aria-label="Send"
                    icon={<FiSend />}
                    colorScheme="blue"
                    isLoading={loading}
                    isDisabled={!input.trim()}
                    size="md"
                  />
                </HStack>
              </form>
            </Box>
          </Box>
        </Flex>
      </Flex>
    </Permission>
  );
};

export default ChatPage;
```

**Step 3: Verify TypeScript compiles**

```bash
cd client && npm run type-check 2>&1 | head -40
```

Expected: no errors (or only pre-existing unrelated errors).

**Step 4: Commit**

```bash
git add client/src/pages/chat.tsx
git commit -m "feat: add conversation sidebar, cost ticker, and SSE event handling"
```

---

### Task 5: Final verification

**Step 1: Verify server TypeScript compiles**

```bash
cd server && npm run build 2>&1 | tail -20
```

Expected: no new errors.

**Step 2: Manual smoke test (dev environment)**

If Tilt is running:
1. Open `/chat` — sidebar should appear with "New Chat" button
2. Send a message — sidebar should gain a new entry with Haiku-generated title
3. Cost ticker (`~$0.00xx`) should appear in header after response
4. Reload page — conversation list should persist
5. Click a past conversation — messages should load, cost ticker initializes from saved tokens
6. Hover a conversation row — rename pencil and delete trash icons appear
7. Click pencil → type new name → Enter → title updates in sidebar
8. Click trash → confirm → conversation removed

**Step 3: Commit**

If any TypeScript fixes were needed, commit them:

```bash
git add -A
git commit -m "fix: resolve any TypeScript issues in chat saved conversations"
```

---

## Summary of new SSE events

| Event | Shape | When |
|-------|-------|------|
| `conversation_id` | `{ type, id }` | New conversation created — before streaming |
| `usage` | `{ type, inputTokens, outputTokens }` | After each Claude API turn completes |
| `title` | `{ type, title }` | After first turn, once Haiku generates title |
