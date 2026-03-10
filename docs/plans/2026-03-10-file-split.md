# File Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split `ChatPage.tsx` (1,073 lines) and `mcp-server.ts` (1,887 lines) into focused files by logical component/domain.

**Architecture:** Pure refactor — no logic changes. Move code blocks verbatim into new files, update imports, verify TypeScript compiles.

**Tech Stack:** React/TypeScript (client), Node.js/TypeScript (server), Chakra UI, @modelcontextprotocol/sdk

---

## Part 1: ChatPage.tsx

### Task 1: Create `types.ts`

**Files:**
- Create: `client/src/components/Chat/types.ts`

**Step 1: Create the file**

```ts
export type Role = "user" | "assistant";

export interface ToolResult {
  toolName: string;
  result: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  toolCalls?: string[];
  toolResults?: ToolResult[];
  isStreaming?: boolean;
  model?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  updatedAt: string;
}
```

**Step 2: Verify it compiles**

```bash
cd client && npm run type-check
```
Expected: no errors

**Step 3: Commit**

```bash
git add client/src/components/Chat/types.ts
git commit -m "refactor: extract Chat types into types.ts"
```

---

### Task 2: Create `MarkdownContent.tsx`

**Files:**
- Create: `client/src/components/Chat/MarkdownContent.tsx`

**Step 1: Create the file**

Cut the `MarkdownContent` component verbatim from `ChatPage.tsx` (lines 93–155). It needs React, Chakra Box/Code/Text, ReactMarkdown, remarkGfm, and CopyableTable.

```tsx
import React from "react";
import { Box, Code, Text } from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyableTable } from "./CopyableTable";

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
      table: (props) => <CopyableTable {...props} />,
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
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </Box>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

export default MarkdownContent;
```

**Step 2: Verify it compiles**

```bash
cd client && npm run type-check
```
Expected: no errors (MarkdownContent not yet used from new location — that's fine)

**Step 3: Commit**

```bash
git add client/src/components/Chat/MarkdownContent.tsx
git commit -m "refactor: extract MarkdownContent into its own file"
```

---

### Task 3: Create `ConversationItem.tsx`

**Files:**
- Create: `client/src/components/Chat/ConversationItem.tsx`

**Step 1: Create the file**

Cut the `ConversationItem` component verbatim from `ChatPage.tsx` (lines 168–308). It uses `ConversationSummary` from types.ts.

```tsx
import React from "react";
import {
  Box,
  HStack,
  IconButton,
  Input,
  Portal,
  Text,
  Tooltip,
  useDisclosure,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverFooter,
  Button,
} from "@chakra-ui/react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { ConversationSummary } from "./types";

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
            onClick={(e) => e.stopPropagation()}
            sx={{
              opacity: 0,
              pointerEvents: "none",
              "[role=group]:hover &": { opacity: 1, pointerEvents: "auto" },
            }}
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
            <Popover isOpen={deleteOpen} onClose={closeDelete} placement="bottom-end">
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
              <Portal>
                <PopoverContent w="200px" zIndex={9999}>
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
              </Portal>
            </Popover>
          </HStack>
        </>
      )}
    </Box>
  );
};

export default ConversationItem;
```

**Step 2: Verify it compiles**

```bash
cd client && npm run type-check
```
Expected: no errors

**Step 3: Commit**

```bash
git add client/src/components/Chat/ConversationItem.tsx
git commit -m "refactor: extract ConversationItem into its own file"
```

---

### Task 4: Update `ChatPage.tsx` imports

**Files:**
- Modify: `client/src/components/Chat/ChatPage.tsx`

**Step 1: Replace the types block and inline components with imports**

Remove from `ChatPage.tsx`:
- The `// ─── Types ───` block (lines 41–67, the `Role`, `ToolResult`, `ChatMessage`, `ConversationSummary` declarations)
- The `// ─── Markdown renderer ───` block (lines 93–155, the `MarkdownContent` component)
- The `// ─── Sidebar conversation item ───` block (lines 168–308, the `ConversationItem` component)
- The now-unused imports: `ReactMarkdown`, `remarkGfm`, `Code` (if only used in MarkdownContent), `FiEdit2`, `FiTrash2`, `Portal`, `useDisclosure`, `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverBody`, `PopoverFooter`

Add to the import block at the top:

```ts
import { Role, ToolResult, ChatMessage, ConversationSummary } from "./types";
import MarkdownContent from "./MarkdownContent";
import ConversationItem from "./ConversationItem";
```

**Step 2: Verify it compiles**

```bash
cd client && npm run type-check
```
Expected: no errors

**Step 3: Commit**

```bash
git add client/src/components/Chat/ChatPage.tsx
git commit -m "refactor: ChatPage.tsx now imports from extracted component files"
```

---

## Part 2: mcp-server.ts

### Task 5: Create `mcp/shared.ts`

**Files:**
- Create: `server/src/mcp/shared.ts`

**Step 1: Create the file**

```ts
import { sql } from "kysely";
import {
  CUBIC_METERS_TO_TONNES,
  TANDEM_TONNES_PER_LOAD,
} from "@constants/UnitConversions";

/** Converts material_shipment quantities to tonnes. Used across multiple tool files. */
export const getTonnesConversion = () => sql<number>`
  CASE
    WHEN LOWER(ms.unit) = 'tonnes' THEN ms.quantity
    WHEN LOWER(ms.unit) = 'loads' AND ms.vehicle_type ILIKE '%tandem%'
      THEN ms.quantity * ${TANDEM_TONNES_PER_LOAD}
    WHEN LOWER(ms.unit) = 'm3'
      THEN ms.quantity * ${CUBIC_METERS_TO_TONNES}
    ELSE NULL
  END
`;
```

**Step 2: Verify it compiles**

```bash
cd server && npm run build 2>&1 | head -20
```
Expected: no errors for this file

**Step 3: Commit**

```bash
git add server/src/mcp/shared.ts
git commit -m "refactor: extract getTonnesConversion into mcp/shared.ts"
```

---

### Task 6: Create `mcp/tools/search.ts`

Contains: `search_jobsites` (lines 49–100), `list_jobsites` (lines 103–291).

**Files:**
- Create: `server/src/mcp/tools/search.ts`

**Step 1: Create the file**

```ts
// @ts-nocheck — see mcp-server.ts for explanation
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sql } from "kysely";
import { db } from "../../db";
import { getTonnesConversion } from "../shared";

export function register(server: McpServer): void {
  // ── search_jobsites ──────────────────────────────────────────────────────────
  server.registerTool(
    // paste search_jobsites block verbatim from mcp-server.ts lines 49–100
  );

  // ── list_jobsites ────────────────────────────────────────────────────────────
  server.registerTool(
    // paste list_jobsites block verbatim from mcp-server.ts lines 103–291
  );
}
```

> Note: "paste verbatim" means copy the exact `server.registerTool("search_jobsites", ...)` call including its full body. Do not alter any SQL or logic.

**Step 2: Verify it compiles**

```bash
cd server && npm run build 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add server/src/mcp/tools/search.ts
git commit -m "refactor: extract search tools into mcp/tools/search.ts"
```

---

### Task 7: Create `mcp/tools/financial.ts`

Contains: `get_jobsite_performance` (lines 294–497), `get_dashboard_overview` (lines 500–712), `get_financial_performance` (lines 715–903).

**Files:**
- Create: `server/src/mcp/tools/financial.ts`

**Step 1: Create the file**

```ts
// @ts-nocheck — see mcp-server.ts for explanation
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sql } from "kysely";
import { db } from "../../db";
import { getTonnesConversion } from "../shared";

export function register(server: McpServer): void {
  // ── get_jobsite_performance ───────────────────────────────────────────────────
  server.registerTool(
    // paste verbatim from lines 294–497
  );

  // ── get_dashboard_overview ───────────────────────────────────────────────────
  server.registerTool(
    // paste verbatim from lines 500–712
  );

  // ── get_financial_performance ────────────────────────────────────────────────
  server.registerTool(
    // paste verbatim from lines 715–903
    // note: get_financial_performance does NOT use getTonnesConversion
    // but the import is harmless
  );
}
```

**Step 2: Verify it compiles**

```bash
cd server && npm run build 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add server/src/mcp/tools/financial.ts
git commit -m "refactor: extract financial tools into mcp/tools/financial.ts"
```

---

### Task 8: Create `mcp/tools/productivity.ts`

Contains: `get_crew_benchmarks` (lines 906–1041), `get_equipment_utilization` (lines 1220–1371), `get_employee_productivity` (lines 1626–1801).

**Files:**
- Create: `server/src/mcp/tools/productivity.ts`

**Step 1: Create the file**

```ts
// @ts-nocheck — see mcp-server.ts for explanation
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sql } from "kysely";
import { db } from "../../db";
import { getTonnesConversion } from "../shared";

export function register(server: McpServer): void {
  // ── get_crew_benchmarks ──────────────────────────────────────────────────────
  server.registerTool(
    // paste verbatim from lines 906–1041
  );

  // ── get_equipment_utilization ────────────────────────────────────────────────
  server.registerTool(
    // paste verbatim from lines 1220–1371
    // note: get_equipment_utilization does NOT use getTonnesConversion
  );

  // ── get_employee_productivity ────────────────────────────────────────────────
  server.registerTool(
    // paste verbatim from lines 1626–1801
  );
}
```

**Step 2: Verify it compiles**

```bash
cd server && npm run build 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add server/src/mcp/tools/productivity.ts
git commit -m "refactor: extract productivity tools into mcp/tools/productivity.ts"
```

---

### Task 9: Create `mcp/tools/operational.ts`

Contains: `get_material_breakdown` (lines 1044–1146), `get_vehicle_utilization` (lines 1149–1217), `get_daily_report_activity` (lines 1374–1623).

`get_daily_report_activity` is the only tool that uses MongoDB — it imports `DailyReport` and `ReportNote` from `@models`.

**Files:**
- Create: `server/src/mcp/tools/operational.ts`

**Step 1: Create the file**

```ts
// @ts-nocheck — see mcp-server.ts for explanation
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sql } from "kysely";
import { db } from "../../db";
import mongoose from "mongoose";
import { DailyReport, ReportNote } from "@models";
import { getTonnesConversion } from "../shared";

export function register(server: McpServer): void {
  // ── get_material_breakdown ───────────────────────────────────────────────────
  server.registerTool(
    // paste verbatim from lines 1044–1146
    // does NOT use getTonnesConversion
  );

  // ── get_vehicle_utilization ──────────────────────────────────────────────────
  server.registerTool(
    // paste verbatim from lines 1149–1217
    // does NOT use getTonnesConversion
  );

  // ── get_daily_report_activity ────────────────────────────────────────────────
  server.registerTool(
    // paste verbatim from lines 1374–1623
    // uses DailyReport, ReportNote, and getTonnesConversion
  );
}
```

**Step 2: Verify it compiles**

```bash
cd server && npm run build 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add server/src/mcp/tools/operational.ts
git commit -m "refactor: extract operational tools into mcp/tools/operational.ts"
```

---

### Task 10: Slim down `mcp-server.ts`

Replace the `createMcpServer()` body (all 11 `server.registerTool(...)` calls, ~1,750 lines) with four `register()` calls. Remove now-unused imports (`z`, `db`, `sql`, `mongoose`, `DailyReport`, `ReportNote`, `CUBIC_METERS_TO_TONNES`, `TANDEM_TONNES_PER_LOAD`). The `// @ts-nocheck` comment can also be removed since no Zod types remain in this file.

**Files:**
- Modify: `server/src/mcp-server.ts`

**Step 1: Replace the file content**

```ts
import * as dotenv from "dotenv";
import path from "path";
import "reflect-metadata";

if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
  dotenv.config({ path: path.join(__dirname, "..", ".env.development") });
}

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import mongoose from "mongoose";
import { register as registerSearch } from "./mcp/tools/search";
import { register as registerFinancial } from "./mcp/tools/financial";
import { register as registerProductivity } from "./mcp/tools/productivity";
import { register as registerOperational } from "./mcp/tools/operational";

// ─── MCP Server ───────────────────────────────────────────────────────────────

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "bow-mark-analytics",
    version: "1.0.0",
  });

  registerSearch(server);
  registerFinancial(server);
  registerProductivity(server);
  registerOperational(server);

  return server;
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

const transports: Map<string, StreamableHTTPServerTransport> = new Map();

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () =>
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    onsessioninitialized: (sid) => {
      transports.set(sid, transport);
    },
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      transports.delete(transport.sessionId);
    }
  };

  const server = createMcpServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.close();
    transports.delete(sessionId);
  }
  res.status(204).send();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "bow-mark-mcp-analytics" });
});

const PORT = process.env.MCP_PORT || 8081;

const start = async () => {
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      });
      console.log("MCP: MongoDB connected");
    } catch (err) {
      console.error("MCP: MongoDB connection failed — notes unavailable", err);
    }
  }

  app.listen(PORT, () => {
    console.log(`MCP Analytics server running on port ${PORT}`);
  });
};

start();
```

**Step 2: Final compile check**

```bash
cd server && npm run build 2>&1 | head -30
```
Expected: clean build

**Step 3: Commit**

```bash
git add server/src/mcp-server.ts
git commit -m "refactor: mcp-server.ts delegates tool registration to domain files"
```
