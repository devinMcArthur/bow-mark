# Tender MCP Pricing Tools — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize all Tender Chat tools into the existing MCP server with per-request auth context, add 5 new pricing-row tools, and auto-transition row status when an estimator edits non-SoQ fields.

**Architecture:** The MCP server (`mcp-server.ts`, port 8081) becomes auth-aware via `Authorization` + `X-Tender-Id` headers extracted on each POST `/mcp` request, then passed to tool handlers via `AsyncLocalStorage`. Tender Chat router stops registering inline tools and instead consumes everything through `connectMcp` + `client.callTool`. New pricing tools (`create_pricing_rows`, `update_pricing_rows`, `delete_pricing_rows`, `reorder_pricing_rows`, `get_tender_pricing_rows`) live in `mcp/tools/tender.ts` alongside the migrated note + document tools. Auto-transition lives entirely in the GraphQL resolver path so Claude's edits never trigger it.

**Tech Stack:** Node.js + Express + Apollo Server + Type-GraphQL, MongoDB (Typegoose), `@modelcontextprotocol/sdk`, `@anthropic-ai/sdk`, Jest, Zod, `jsonwebtoken`, `async_hooks` (AsyncLocalStorage).

**Branch:** Already on `feat/tender-mcp-pricing-tools`.

**Per project preference (`feedback_no_tests.md`):** Test files are written as part of each task but are **never executed during the implementation session**. They run in CI. Skip any "run the test" step the user might add later.

**Spec:** `docs/superpowers/specs/2026-04-14-tender-mcp-pricing-tools-design.md`

---

## File Structure

**New files:**
- `server/src/mcp/context.ts` — `AsyncLocalStorage` wrapper, `runWithContext`, `getRequestContext`, `requireTenderContext`
- `server/src/mcp/tools/tender.ts` — single registration entry point for all 9 tender-scoped tools
- `server/src/__tests__/mcp/context.test.ts` — context isolation tests
- `server/src/__tests__/mcp/tenderTools.test.ts` — tool tests (replaces `tenderNoteTools.test.ts`)
- `server/src/__tests__/graphql/tenderPricingRowAutoTransition.test.ts` — auto-transition tests

**Modified files:**
- `server/src/mcp-server.ts` — JWT validation, header extraction, ALS wrapping, register tender tools
- `server/src/lib/mcpClient.ts` — accept `{ authToken, tenderId }` opts, pass as headers
- `server/src/router/tender-chat.ts` — drop inline tools, use `connectMcp` + `client.callTool` dispatch
- `server/src/router/chat.ts`, `server/src/router/pm-jobsite-chat.ts` — pass `authToken: req.token` to `connectMcp`
- `server/src/graphql/resolvers/tenderPricingSheet/index.ts` — auto-transition logic in `tenderPricingRowUpdate`

**Deleted files:**
- `server/src/lib/tenderNoteTools.ts`
- `server/src/lib/readDocumentExecutor.ts`
- `server/src/__tests__/tenderNoteTools.test.ts`

---

## Task 1: AsyncLocalStorage context module

**Files:**
- Create: `server/src/mcp/context.ts`
- Create: `server/src/__tests__/mcp/context.test.ts`

- [ ] **Step 1: Write the context module**

```ts
// server/src/mcp/context.ts
import { AsyncLocalStorage } from "async_hooks";
import { UserRoles } from "@typescript/user";

export interface RequestContext {
  userId: string;
  role: UserRoles;
  tenderId?: string;
  conversationId?: string;
}

const als = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(
  ctx: RequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  return als.run(ctx, fn);
}

export function getRequestContext(): RequestContext {
  const ctx = als.getStore();
  if (!ctx) {
    throw new Error("No request context — tool called outside MCP request");
  }
  return ctx;
}

export function requireTenderContext(): RequestContext & { tenderId: string } {
  const ctx = getRequestContext();
  if (!ctx.tenderId) {
    throw new Error("This tool requires X-Tender-Id header");
  }
  return ctx as RequestContext & { tenderId: string };
}
```

- [ ] **Step 2: Write the test file**

```ts
// server/src/__tests__/mcp/context.test.ts
import { UserRoles } from "@typescript/user";
import {
  runWithContext,
  getRequestContext,
  requireTenderContext,
} from "../../mcp/context";

describe("mcp/context", () => {
  it("round-trips userId/role/tenderId via runWithContext + getRequestContext", async () => {
    await runWithContext(
      { userId: "u1", role: UserRoles.ProjectManager, tenderId: "t1" },
      async () => {
        const ctx = getRequestContext();
        expect(ctx.userId).toBe("u1");
        expect(ctx.role).toBe(UserRoles.ProjectManager);
        expect(ctx.tenderId).toBe("t1");
      },
    );
  });

  it("getRequestContext throws when called outside runWithContext", () => {
    expect(() => getRequestContext()).toThrow(
      /No request context/,
    );
  });

  it("requireTenderContext throws when tenderId missing", async () => {
    await runWithContext(
      { userId: "u1", role: UserRoles.User },
      async () => {
        expect(() => requireTenderContext()).toThrow(
          /This tool requires X-Tender-Id/,
        );
      },
    );
  });

  it("isolates concurrent contexts", async () => {
    const tasks = [1, 2, 3].map((i) =>
      runWithContext(
        { userId: `u${i}`, role: UserRoles.ProjectManager, tenderId: `t${i}` },
        async () => {
          await new Promise((r) => setTimeout(r, 5 * (4 - i)));
          return getRequestContext().tenderId;
        },
      ),
    );
    const results = await Promise.all(tasks);
    expect(results).toEqual(["t1", "t2", "t3"]);
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add server/src/mcp/context.ts server/src/__tests__/mcp/context.test.ts
git commit -m "feat(mcp): add AsyncLocalStorage request context helpers"
```

---

## Task 2: MCP server JWT auth + ALS wrapping

**Files:**
- Modify: `server/src/mcp-server.ts:36-92`

- [ ] **Step 1: Add imports at top of `mcp-server.ts`**

After the existing imports (around line 17), add:

```ts
import jwt from "jsonwebtoken";
import { User } from "@models";
import { UserRoles } from "@typescript/user";
import mongooseLib from "mongoose";
import { runWithContext, RequestContext } from "./mcp/context";
```

- [ ] **Step 2: Replace the entire POST `/mcp` handler with the auth-aware version**

Replace lines 41-68 (`app.post("/mcp", ...)`) with:

```ts
app.post("/mcp", async (req, res) => {
  // ── Auth: validate JWT from Authorization header ────────────────────────
  const token = req.headers.authorization;
  if (!token || !process.env.JWT_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let userId: string;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
    if (!decoded?.userId) {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }
    userId = decoded.userId;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const role = (user.role ?? UserRoles.User) as UserRoles;

  // ── Optional tender binding ─────────────────────────────────────────────
  const tenderIdHeader = req.headers["x-tender-id"];
  const tenderId =
    typeof tenderIdHeader === "string" ? tenderIdHeader : undefined;
  if (tenderId && !mongooseLib.isValidObjectId(tenderId)) {
    res.status(400).json({ error: "Invalid X-Tender-Id" });
    return;
  }

  const conversationIdHeader = req.headers["x-conversation-id"];
  const conversationId =
    typeof conversationIdHeader === "string" ? conversationIdHeader : undefined;

  const ctx: RequestContext = { userId, role, tenderId, conversationId };

  // ── Route through MCP transport inside the ALS context ─────────────────
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await runWithContext(ctx, () =>
      transport.handleRequest(req, res, req.body),
    );
    return;
  }

  // New session
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
  await runWithContext(ctx, () =>
    transport.handleRequest(req, res, req.body),
  );
});
```

- [ ] **Step 3: Commit**

```bash
git add server/src/mcp-server.ts
git commit -m "feat(mcp): JWT-validate /mcp requests and wrap in ALS context"
```

---

## Task 3: Extend `connectMcp` with auth headers

**Files:**
- Modify: `server/src/lib/mcpClient.ts`

- [ ] **Step 1: Replace the entire file**

```ts
// server/src/lib/mcpClient.ts
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Response } from "express";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://mcp-analytics:8081";

export interface McpConnection {
  client: Client;
  tools: Anthropic.Tool[];
}

export interface ConnectMcpOptions {
  /** Authorization header value passed to the MCP server (raw token, no "Bearer" prefix needed — the existing requireAuth pattern uses raw tokens). */
  authToken?: string;
  /** Tender ID bound to this MCP session. Used by tender-scoped tools. */
  tenderId?: string;
  /** Optional conversation ID — passed through for note traceability. */
  conversationId?: string;
}

/**
 * Connect to the MCP analytics server and load its tool list.
 * Returns null and writes a 503 response if connection or tool loading fails.
 * Caller is responsible for calling client.close() in a finally block.
 */
export async function connectMcp(
  clientName: string,
  logPrefix: string,
  res: Response,
  opts?: ConnectMcpOptions,
): Promise<McpConnection | null> {
  const client = new Client({ name: clientName, version: "1.0.0" });

  const headers: Record<string, string> = {};
  if (opts?.authToken) headers["Authorization"] = opts.authToken;
  if (opts?.tenderId) headers["X-Tender-Id"] = opts.tenderId;
  if (opts?.conversationId) headers["X-Conversation-Id"] = opts.conversationId;

  const transport = new StreamableHTTPClientTransport(
    new URL(`${MCP_SERVER_URL}/mcp`),
    Object.keys(headers).length > 0
      ? { requestInit: { headers } }
      : undefined,
  );

  try {
    await client.connect(transport);
  } catch (err) {
    console.error(`${logPrefix} Failed to connect to MCP server:`, err);
    res.status(503).json({ error: "Analytics server unavailable" });
    return null;
  }

  let tools: Anthropic.Tool[];
  try {
    const { tools: rawTools } = await client.listTools();
    tools = rawTools.map((t) => ({
      name: t.name,
      description: t.description ?? "",
      input_schema: (t.inputSchema as Anthropic.Tool["input_schema"]) ?? {
        type: "object" as const,
        properties: {},
      },
    }));
  } catch (err) {
    console.error(`${logPrefix} Failed to load MCP tools:`, err);
    await client.close();
    res.status(503).json({ error: "Failed to load analytics tools" });
    return null;
  }

  return { client, tools };
}
```

- [ ] **Step 2: Update existing consumers to pass `authToken`**

Modify `server/src/router/chat.ts` — find the line that calls `connectMcp(...)` and add `{ authToken: req.token }` as the fourth argument. Example (the existing call probably looks like `connectMcp("chat", "[chat]", res)`):

```ts
const conn = await connectMcp("chat", "[chat]", res, { authToken: req.token });
```

Modify `server/src/router/pm-jobsite-chat.ts` — same change:

```ts
const conn = await connectMcp("pm-jobsite-chat", "[pm-jobsite-chat]", res, { authToken: req.token });
```

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/mcpClient.ts server/src/router/chat.ts server/src/router/pm-jobsite-chat.ts
git commit -m "feat(mcp): connectMcp accepts auth + tender headers; thread through existing chats"
```

---

## Task 4: Tender tools file scaffold

**Files:**
- Create: `server/src/mcp/tools/tender.ts`
- Modify: `server/src/mcp-server.ts:20-32`

- [ ] **Step 1: Create the tender tools file with session state plumbing**

```ts
// server/src/mcp/tools/tender.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Per-MCP-session state for the document tools — preserves the per-turn
 * page-budget + dedup behavior that the legacy `makeReadDocumentExecutor`
 * closure provided. A fresh object is allocated for each new MCP session.
 */
export interface TenderToolsSessionState {
  pdfPagesLoaded: number;
  loadedRangeKeys: Set<string>;
}

export function makeSessionState(): TenderToolsSessionState {
  return { pdfPagesLoaded: 0, loadedRangeKeys: new Set() };
}

/**
 * Registers all tender-scoped MCP tools:
 *   - get_tender_pricing_rows (read)
 *   - create_pricing_rows / update_pricing_rows / delete_pricing_rows / reorder_pricing_rows (write, PM+)
 *   - save_tender_note / delete_tender_note (write, PM+)
 *   - list_document_pages / read_document (read)
 *
 * All tools pull the active tender + user from `getRequestContext()` and never
 * accept tenderId/userId as Claude-visible parameters (prompt-injection guard).
 *
 * The `sessionState` argument carries per-MCP-session state (page budget +
 * dedup) for the document tools — fresh per session, never shared.
 */
export function register(
  _server: McpServer,
  _sessionState: TenderToolsSessionState,
): void {
  // Tools added in subsequent tasks.
}
```

- [ ] **Step 2: Wire `registerTender` into `mcp-server.ts`**

In `server/src/mcp-server.ts`, add to the imports near the existing `register as registerSearch` lines:

```ts
import { register as registerTender, makeSessionState as makeTenderSessionState } from "./mcp/tools/tender";
```

Then replace `createMcpServer` (lines 20-32) with:

```ts
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "bow-mark-analytics",
    version: "1.0.0",
  });

  registerSearch(server);
  registerFinancial(server);
  registerProductivity(server);
  registerOperational(server);

  // Per-session state for tender tools (page budget + dedup) — fresh per
  // McpServer instance, which createMcpServer() creates one of per session.
  const tenderSessionState = makeTenderSessionState();
  registerTender(server, tenderSessionState);

  return server;
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/mcp/tools/tender.ts server/src/mcp-server.ts
git commit -m "feat(mcp): scaffold tender tools registration with per-session state"
```

---

## Task 5: Migrate `save_tender_note` + `delete_tender_note`

**Files:**
- Modify: `server/src/mcp/tools/tender.ts`

- [ ] **Step 1: Replace the file with the note tool registrations**

Replace `server/src/mcp/tools/tender.ts` with:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import mongoose from "mongoose";
import { Tender } from "@models";
import { UserRoles } from "@typescript/user";
import { scheduleTenderSummary } from "../../lib/generateTenderSummary";
import { requireTenderContext } from "../context";

export interface TenderToolsSessionState {
  pdfPagesLoaded: number;
  loadedRangeKeys: Set<string>;
}

export function makeSessionState(): TenderToolsSessionState {
  return { pdfPagesLoaded: 0, loadedRangeKeys: new Set() };
}

function requirePmRole(): void {
  const ctx = requireTenderContext();
  if (ctx.role < UserRoles.ProjectManager) {
    throw new Error("Forbidden: PM or Admin role required");
  }
}

function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function register(
  server: McpServer,
  _sessionState: TenderToolsSessionState,
): void {
  // ── save_tender_note ──────────────────────────────────────────────────────
  server.registerTool(
    "save_tender_note",
    {
      description:
        "Save an important piece of information to this tender's permanent job notes. " +
        "Only call this AFTER the user has confirmed they want to save it. " +
        'Always draft the note content in your message first and ask "Should I save that to the job notes?" before calling this tool. ' +
        "Never call this tool without explicit user confirmation.",
      inputSchema: {
        content: z.string().describe("The note text to save, as confirmed by the user."),
      },
    },
    async ({ content }) => {
      requirePmRole();
      const ctx = requireTenderContext();

      await (Tender as any).findByIdAndUpdate(ctx.tenderId, {
        $push: {
          notes: {
            _id: new mongoose.Types.ObjectId(),
            content,
            savedAt: new Date(),
            savedBy: new mongoose.Types.ObjectId(ctx.userId),
            conversationId: ctx.conversationId ?? "",
          },
        },
      });

      scheduleTenderSummary(ctx.tenderId);
      return ok(`Note saved: "${content}"`);
    },
  );

  // ── delete_tender_note ────────────────────────────────────────────────────
  server.registerTool(
    "delete_tender_note",
    {
      description:
        "Delete a previously saved note from this tender's job notes. " +
        "Only call this if the user explicitly asks to remove a specific note.",
      inputSchema: {
        noteId: z.string().describe("The _id of the note to delete."),
      },
    },
    async ({ noteId }) => {
      requirePmRole();
      const { tenderId } = requireTenderContext();

      const result = await (Tender as any).updateOne(
        { _id: tenderId },
        { $pull: { notes: { _id: new mongoose.Types.ObjectId(noteId) } } },
      );

      if (result.modifiedCount === 0) {
        return ok(`Error: Note not found — nothing was deleted.`);
      }

      scheduleTenderSummary(tenderId);
      return ok("Note deleted.");
    },
  );
}
```

Note `conversationId` is read from `requireTenderContext()` and stored on the note exactly as the legacy `tenderNoteTools.ts:65` did. The chat router will pass `conversationId` through `connectMcp` opts in Task 7, which sets the `X-Conversation-Id` header, which Task 2 reads into the request context.

- [ ] **Step 2: Commit**

```bash
git add server/src/mcp/tools/tender.ts
git commit -m "feat(mcp): migrate save_tender_note + delete_tender_note into MCP server"
```

---

## Task 6: Migrate `list_document_pages` + `read_document`

**Files:**
- Modify: `server/src/mcp/tools/tender.ts`

The legacy `readDocumentExecutor.ts` uses Anthropic's tool-input naming (`file_object_id`, `start_page`, `end_page`) — the migration **must preserve those exact names** so the chat system prompt and Claude's training stay accurate. It also tracks per-turn state (`pdfPagesLoaded`, `loadedRangeKeys`) via a closure — we preserve this by reading from the `sessionState` argument that Task 4 threads through `register()`.

- [ ] **Step 1: Add imports + constants at the top of `tender.ts`**

Add to the existing imports block:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import { Tender as TenderModel, System } from "@models";
import { getFile } from "@utils/fileStorage";
```

Add these constants near the top of the file (after the imports, before `requirePmRole`):

```ts
const MAX_READABLE_PDF_BYTES = 3 * 1024 * 1024;
const PDF_PAGE_LIMIT = 90;

async function loadTenderFiles(tenderId: string): Promise<any[]> {
  const [tender, sys] = await Promise.all([
    TenderModel.findById(tenderId)
      .populate({ path: "files", populate: { path: "file" } })
      .lean(),
    System.getSystem(),
  ]);
  if (!tender) throw new Error(`Tender ${tenderId} not found`);
  return [
    ...(((tender as any).files ?? []) as any[]),
    ...(((sys?.specFiles ?? []) as any[])),
  ];
}
```

- [ ] **Step 2: Update the `register()` signature to use `sessionState`**

Inside `register(server, sessionState)`, change the parameter from `_sessionState` to `sessionState` (it's now used by the doc tools below).

- [ ] **Step 3: Add `list_document_pages` registration**

Inside `register()`, after the `delete_tender_note` block, add:

```ts
  // ── list_document_pages ───────────────────────────────────────────────────
  server.registerTool(
    "list_document_pages",
    {
      description:
        "Returns a page-by-page index for a specific document — one line per page with a brief description of its content. Use this BEFORE read_document to identify exactly which pages contain the information you need. Much cheaper than loading the full document.",
      inputSchema: {
        file_object_id: z
          .string()
          .describe("The _id of the file object from the document list"),
      },
    },
    async ({ file_object_id }) => {
      const { tenderId } = requireTenderContext();
      const allFiles = await loadTenderFiles(tenderId);
      const fileObj = allFiles.find((f: any) => f._id.toString() === file_object_id);
      if (!fileObj) throw new Error(`File ${file_object_id} not found`);

      const docLabel =
        (fileObj.summary as any)?.documentType || fileObj.documentType || "Document";
      const pageIndex = fileObj.pageIndex as
        | Array<{ page: number; summary: string }>
        | undefined;

      if (!pageIndex || pageIndex.length === 0) {
        return ok(
          `No page index is available for "${docLabel}" yet. Use read_document to load pages directly.`,
        );
      }

      const lines = pageIndex.map((e) => `p.${e.page}: ${e.summary}`).join("\n");
      return ok(
        `Page index for "${docLabel}" (${pageIndex.length} pages total):\n\n${lines}`,
      );
    },
  );
```

- [ ] **Step 4: Add `read_document` registration**

After `list_document_pages`, add:

```ts
  // ── read_document ────────────────────────────────────────────────────────
  server.registerTool(
    "read_document",
    {
      description:
        "Load the contents of one specific document. For large documents (spec books, etc.) only a page range is loaded at a time — the response will tell you the total page count so you can request other sections if needed. IMPORTANT: Call this tool for ONE document at a time only — never request multiple documents in the same response.",
      inputSchema: {
        file_object_id: z
          .string()
          .describe("The _id of the file object from the document list"),
        start_page: z
          .number()
          .optional()
          .describe(
            "First page to read (1-indexed, inclusive). Omit to start from the beginning.",
          ),
        end_page: z
          .number()
          .optional()
          .describe(
            "Last page to read (1-indexed, inclusive). Omit to read as far as the size limit allows.",
          ),
      },
    },
    async ({ file_object_id, start_page, end_page }) => {
      const { tenderId } = requireTenderContext();
      const allFiles = await loadTenderFiles(tenderId);

      const fileObj = allFiles.find((f: any) => f._id.toString() === file_object_id);
      if (!fileObj) throw new Error(`File ${file_object_id} not found`);
      if (!fileObj.file) throw new Error(`File reference missing for ${file_object_id}`);

      const fileId =
        typeof fileObj.file === "object" && (fileObj.file as any)._id
          ? (fileObj.file as any)._id.toString()
          : (fileObj.file as any).toString();

      const docLabel =
        (fileObj.summary as any)?.documentType || fileObj.documentType || "Document";

      // Per-session dedup
      const rangeKey = `${fileId}:${start_page ?? 0}:${end_page ?? "end"}`;
      if (sessionState.loadedRangeKeys.has(rangeKey)) {
        throw new Error(
          `Document "${docLabel}" (same page range) is already loaded in this conversation turn.`,
        );
      }

      // Pre-flight page budget check
      const docPageCount = fileObj.pageCount ?? 0;
      const requestedPages =
        end_page && start_page ? end_page - start_page + 1 : docPageCount;
      const estimatedPages = Math.min(
        requestedPages || docPageCount,
        docPageCount || requestedPages,
      );
      if (
        estimatedPages > 0 &&
        sessionState.pdfPagesLoaded + estimatedPages > PDF_PAGE_LIMIT
      ) {
        throw new Error(
          `Cannot load "${docLabel}" — this turn has already used ${sessionState.pdfPagesLoaded} of the ${PDF_PAGE_LIMIT}-page limit. Please answer based on what has already been loaded, or let the user know they should ask about one document at a time.`,
        );
      }

      const s3Object = await getFile(fileId);
      if (!s3Object?.Body) throw new Error("File body empty");

      const buffer = s3Object.Body as Buffer;
      const contentType = s3Object.ContentType || "application/pdf";

      const isSpreadsheet =
        contentType.includes("spreadsheet") ||
        contentType.includes("excel") ||
        contentType.includes("ms-excel");

      let content: Anthropic.ToolResultBlockParam["content"];

      if (isSpreadsheet) {
        const xlsx = await import("xlsx");
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const text = workbook.SheetNames.map((name) => {
          const ws = workbook.Sheets[name];
          return `Sheet: ${name}\n${xlsx.utils.sheet_to_csv(ws)}`;
        }).join("\n\n");
        content = `Document: ${docLabel}\n\n${text}`;
        if (docPageCount > 0) sessionState.pdfPagesLoaded += docPageCount;
        sessionState.loadedRangeKeys.add(rangeKey);
      } else if (contentType.startsWith("image/")) {
        const base64 = buffer.toString("base64");
        content = [
          { type: "text" as const, text: `Document: ${docLabel}` },
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
        if (docPageCount > 0) sessionState.pdfPagesLoaded += docPageCount;
        sessionState.loadedRangeKeys.add(rangeKey);
      } else {
        // PDF — extract only the requested page range, bisecting if too large
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const totalPages = pdfDoc.getPageCount();

        let startIdx = start_page ? Math.max(0, start_page - 1) : 0;
        let endIdx = end_page ? Math.min(end_page, totalPages) : totalPages;

        let pdfChunk: Buffer;
        while (true) {
          const indices = Array.from(
            { length: endIdx - startIdx },
            (_, i) => startIdx + i,
          );
          const chunkDoc = await PDFDocument.create();
          const pages = await chunkDoc.copyPages(pdfDoc, indices);
          for (const page of pages) chunkDoc.addPage(page);
          pdfChunk = Buffer.from(await chunkDoc.save());
          if (pdfChunk.length <= MAX_READABLE_PDF_BYTES || endIdx - startIdx <= 1)
            break;
          endIdx = startIdx + Math.floor((endIdx - startIdx) / 2);
        }

        const pagesRead = endIdx - startIdx;

        if (sessionState.pdfPagesLoaded + pagesRead > PDF_PAGE_LIMIT) {
          throw new Error(
            `Cannot load "${docLabel}" (${pagesRead} pages) — this turn has already used ${sessionState.pdfPagesLoaded} of the ${PDF_PAGE_LIMIT}-page limit.`,
          );
        }

        const pageNote =
          totalPages > pagesRead
            ? `Pages ${startIdx + 1}–${endIdx} of ${totalPages} total. Use start_page/end_page to read other sections.`
            : `All ${totalPages} pages.`;

        content = [
          {
            type: "text" as const,
            text: `Document: ${docLabel}\n${pageNote}\nWhen citing this document use the filename: "${docLabel}"`,
          },
          {
            type: "document" as any,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: pdfChunk.toString("base64"),
            },
          },
        ];

        if (docPageCount > 0) sessionState.pdfPagesLoaded += pagesRead;
        sessionState.loadedRangeKeys.add(rangeKey);
      }

      return { content: content as any };
    },
  );
```

This is a near-verbatim port of `readDocumentExecutor.ts`. Behavior changes:
- `_sessionState` is now `sessionState` and is read directly (not a closure)
- File list is reloaded inside the handler from `requireTenderContext().tenderId` instead of receiving a pre-built closure
- `summary` field is removed from the return value because MCP tools return content blocks directly; the chat router's `executeTool` adapter (Task 7) derives a summary from the first text block

- [ ] **Step 5: Commit**

```bash
git add server/src/mcp/tools/tender.ts
git commit -m "feat(mcp): migrate list_document_pages + read_document into MCP server"
```

---

## Task 7: Refactor Tender Chat router to consume MCP

**Files:**
- Modify: `server/src/router/tender-chat.ts`

- [ ] **Step 1: Update imports**

Replace the imports block at the top of `server/src/router/tender-chat.ts` (lines 1-12) with:

```ts
import { Router } from "express";
import mongoose from "mongoose";
import Anthropic from "@anthropic-ai/sdk";
import { Tender, User, System } from "@models";
import { isDocument } from "@typegoose/typegoose";
import { streamConversation, ToolExecutionResult } from "../lib/streamConversation";
import { connectMcp } from "../lib/mcpClient";
import { buildFileIndex } from "../lib/buildFileIndex";
import { requireAuth } from "../lib/authMiddleware";
import { UserRoles } from "../typescript/user";
```

(removed: `READ_DOCUMENT_TOOL`, `LIST_DOCUMENT_PAGES_TOOL`, `makeReadDocumentExecutor`, `SAVE_TENDER_NOTE_TOOL`, `DELETE_TENDER_NOTE_TOOL`, `makeTenderNoteExecutor`)

- [ ] **Step 2: Replace the `streamConversation` call (lines 173-194) with the MCP-backed version**

```ts
  // ── Connect to MCP server (auth + tender + conversation bound via headers) ─
  const conn = await connectMcp(
    "tender-chat",
    "[tender-chat]",
    res,
    { authToken: req.token, tenderId, conversationId },
  );
  if (!conn) return; // connectMcp already wrote the 503

  try {
    await streamConversation({
      res,
      userId: req.userId,
      conversationId,
      tenderId,
      messages,
      systemPrompt,
      tools: conn.tools,
      toolChoice: { type: "auto", disable_parallel_tool_use: true },
      maxTokens: 8192,
      executeTool: async (name, input): Promise<ToolExecutionResult> => {
        const result = await conn.client.callTool({
          name,
          arguments: input as Record<string, unknown>,
        });
        // MCP returns content as an array of blocks. streamConversation
        // expects { content, summary }: pass the raw blocks through, derive
        // a short summary from the first text block (if any) for logging.
        const blocks = (result.content ?? []) as Array<{
          type: string;
          text?: string;
        }>;
        const firstText = blocks.find((b) => b.type === "text")?.text ?? "";
        const summary = firstText.length > 200
          ? firstText.slice(0, 200) + "…"
          : firstText || `${name} completed`;
        return {
          content: blocks as any,
          summary,
        };
      },
      logPrefix: "[tender-chat]",
    });
  } finally {
    await conn.client.close().catch(() => undefined);
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add server/src/router/tender-chat.ts
git commit -m "refactor(tender-chat): consume MCP tools instead of inline tools"
```

---

## Task 8: Delete the old inline tool files

**Files:**
- Delete: `server/src/lib/tenderNoteTools.ts`
- Delete: `server/src/lib/readDocumentExecutor.ts`
- Delete: `server/src/__tests__/tenderNoteTools.test.ts`

- [ ] **Step 1: Verify no remaining references**

Run:
```bash
grep -rn "tenderNoteTools\|readDocumentExecutor\|SAVE_TENDER_NOTE_TOOL\|DELETE_TENDER_NOTE_TOOL\|LIST_DOCUMENT_PAGES_TOOL\|READ_DOCUMENT_TOOL\|makeTenderNoteExecutor\|makeReadDocumentExecutor" server/src/
```
Expected: no matches. If any matches appear, update them before deleting.

- [ ] **Step 2: Delete the files**

```bash
git rm server/src/lib/tenderNoteTools.ts
git rm server/src/lib/readDocumentExecutor.ts
git rm server/src/__tests__/tenderNoteTools.test.ts
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove inline tender chat tool files (migrated to MCP)"
```

---

## Task 9: `get_tender_pricing_rows` read tool

**Files:**
- Modify: `server/src/mcp/tools/tender.ts`

- [ ] **Step 1: Add the read tool**

In `server/src/mcp/tools/tender.ts`, add this import alongside the existing model imports:

```ts
import { TenderPricingSheet } from "@models";
```

Inside `register(server)` (place it as the first tool registered, before the note tools), add:

```ts
  // ── get_tender_pricing_rows ──────────────────────────────────────────────
  server.registerTool(
    "get_tender_pricing_rows",
    {
      description:
        "Read the full pricing schedule for the active tender — every schedule, group, and item with quantity, unit, status, notes, doc references, and pricing fields (unitPrice, markup, rate buildup outputs). Call this whenever you need to know the current state of the schedule of quantities before suggesting edits.",
      inputSchema: {},
    },
    async () => {
      const { tenderId } = requireTenderContext();
      const sheet = await TenderPricingSheet.getByTenderId(tenderId);
      if (!sheet) {
        return ok(JSON.stringify({ rows: [], totalRows: 0, defaultMarkupPct: null }));
      }

      const rows = sheet.rows.map((r: any) => ({
        rowId: r._id.toString(),
        type: r.type,
        sortOrder: r.sortOrder,
        itemNumber: r.itemNumber ?? "",
        description: r.description ?? "",
        indentLevel: r.indentLevel,
        status: r.status ?? "not_started",
        quantity: r.quantity ?? null,
        unit: r.unit ?? null,
        notes: r.notes ?? null,
        docRefs: (r.docRefs ?? []).map((d: any) => ({
          docRefId: d._id.toString(),
          enrichedFileId: d.enrichedFileId.toString(),
          page: d.page,
          description: d.description ?? null,
        })),
        unitPrice: r.unitPrice ?? null,
        markupOverride: r.markupOverride ?? null,
        extraUnitPrice: r.extraUnitPrice ?? null,
        extraUnitPriceMemo: r.extraUnitPriceMemo ?? null,
        hasTemplate: r.rateBuildupSnapshot != null,
        rateBuildupOutputs: (r.rateBuildupOutputs ?? []).map((o: any) => ({
          kind: o.kind,
          materialId: o.materialId?.toString() ?? null,
          crewKindId: o.crewKindId?.toString() ?? null,
          unit: o.unit,
          perUnitValue: o.perUnitValue,
          totalValue: o.totalValue,
        })),
      }));

      return ok(
        JSON.stringify({
          defaultMarkupPct: sheet.defaultMarkupPct,
          rows,
          totalRows: rows.length,
        }),
      );
    },
  );
```

- [ ] **Step 2: Commit**

```bash
git add server/src/mcp/tools/tender.ts
git commit -m "feat(mcp): get_tender_pricing_rows read tool"
```

---

## Task 10: `create_pricing_rows` write tool

**Files:**
- Modify: `server/src/mcp/tools/tender.ts`
- Create: `server/src/__tests__/mcp/tenderTools.test.ts`

- [ ] **Step 1: Add the create tool registration**

In `server/src/mcp/tools/tender.ts`, add this import alongside the existing model imports:

```ts
import { Types } from "mongoose";
```

Inside `register(server)`, after `get_tender_pricing_rows`, add:

```ts
  // ── create_pricing_rows ──────────────────────────────────────────────────
  server.registerTool(
    "create_pricing_rows",
    {
      description:
        "Create one or more pricing rows (schedules, groups, or items) on the active tender. Rows are appended to the end of the sheet in the order provided. New rows always start in 'not_started' state. Quantity and unit are only allowed on items, not schedules or groups. itemNumber should be set to the SoQ-source number (e.g. 'A.1.3'). Up to 100 rows per call. Validation is all-or-nothing — if any row is invalid, none are saved.",
      inputSchema: {
        rows: z
          .array(
            z.object({
              type: z.enum(["schedule", "group", "item"]),
              itemNumber: z.string().optional(),
              description: z.string().min(1),
              indentLevel: z.number().int().min(0).max(3).default(0),
              quantity: z.number().optional(),
              unit: z.string().optional(),
              notes: z.string().optional(),
              docRefs: z
                .array(
                  z.object({
                    enrichedFileId: z.string(),
                    page: z.number().int().min(1),
                    description: z.string().optional(),
                  }),
                )
                .optional(),
            }),
          )
          .min(1)
          .max(100),
      },
    },
    async ({ rows }) => {
      requirePmRole();
      const { tenderId } = requireTenderContext();
      const sheet = await TenderPricingSheet.getByTenderId(tenderId);
      if (!sheet) throw new Error(`No pricing sheet found for tender ${tenderId}`);

      // Build a set of valid enrichedFileIds attached to this tender + sys spec files
      const [tender, sys] = await Promise.all([
        TenderModel.findById(tenderId)
          .populate({ path: "files", populate: { path: "file" } })
          .lean(),
        System.getSystem(),
      ]);
      const validFileIds = new Set<string>();
      for (const f of [
        ...(((tender as any)?.files ?? []) as any[]),
        ...(((sys?.specFiles ?? []) as any[])),
      ]) {
        if (f?._id) validFileIds.add(f._id.toString());
        if (f?.file?._id) validFileIds.add(f.file._id.toString());
      }

      // Validate every row first
      const errors: string[] = [];
      rows.forEach((r, i) => {
        if (r.type !== "item" && (r.quantity != null || r.unit != null)) {
          errors.push(`row[${i}]: quantity/unit only allowed on items, not ${r.type}`);
        }
        for (const ref of r.docRefs ?? []) {
          if (!validFileIds.has(ref.enrichedFileId)) {
            errors.push(
              `row[${i}]: docRef enrichedFileId '${ref.enrichedFileId}' is not attached to this tender`,
            );
          }
        }
      });
      if (errors.length > 0) {
        return ok(`Error: validation failed. No rows created.\n${errors.join("\n")}`);
      }

      // Apply each row
      const created: Array<{
        rowId: string;
        type: string;
        itemNumber: string;
        description: string;
      }> = [];
      for (const r of rows) {
        const newRow: any = {
          _id: new Types.ObjectId(),
          type: r.type,
          sortOrder: sheet.rows.length,
          itemNumber: r.itemNumber ?? "",
          description: r.description,
          indentLevel: r.indentLevel,
          ...(r.type === "item" && r.quantity != null ? { quantity: r.quantity } : {}),
          ...(r.type === "item" && r.unit != null ? { unit: r.unit } : {}),
          ...(r.notes != null ? { notes: r.notes } : {}),
          docRefs: (r.docRefs ?? []).map((d) => ({
            _id: new Types.ObjectId(),
            enrichedFileId: new Types.ObjectId(d.enrichedFileId),
            page: d.page,
            ...(d.description != null ? { description: d.description } : {}),
          })),
          status: "not_started",
        };
        sheet.rows.push(newRow);
        created.push({
          rowId: newRow._id.toString(),
          type: newRow.type,
          itemNumber: newRow.itemNumber,
          description: newRow.description,
        });
      }
      sheet.updatedAt = new Date();
      await sheet.save();

      return ok(JSON.stringify({ created, totalRows: created.length }));
    },
  );
```

- [ ] **Step 2: Add `TenderModel` import alias if not already present**

In the imports block of `server/src/mcp/tools/tender.ts`, ensure both `TenderPricingSheet` and `Tender as TenderModel` are imported:

```ts
import { Tender as TenderModel, System, TenderPricingSheet } from "@models";
```

(consolidate with the existing `import { Tender as TenderModel, System } from "@models";` if present from Task 6 and 9)

- [ ] **Step 3: Write the create test cases**

Create `server/src/__tests__/mcp/tenderTools.test.ts`:

```ts
import mongoose, { Types } from "mongoose";
import { TenderPricingSheet, Tender, System } from "@models";
import { UserRoles } from "@typescript/user";
import { runWithContext } from "../../mcp/context";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { register as registerTender } from "../../mcp/tools/tender";

// Helper: spin up an in-memory McpServer with the tender tools registered,
// expose a `call(name, args)` shortcut that bypasses the transport layer.
function makeServer() {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerTender(server);
  // The MCP SDK exposes the registered tool handlers internally. The cleanest
  // test seam: call the handler directly via the underlying registry.
  // Replace `(server as any)._registeredTools` with whichever internal map
  // matches your installed SDK version (verify by `console.dir(server)`).
  return {
    call: async (name: string, args: Record<string, unknown>) => {
      const reg = (server as any)._registeredTools?.[name];
      if (!reg) throw new Error(`Tool ${name} not registered`);
      return reg.callback(args);
    },
  };
}

describe("create_pricing_rows", () => {
  let tenderId: string;
  let sheetId: string;

  beforeEach(async () => {
    // Set up minimal in-memory tender + empty pricing sheet.
    // (Replace this with your project's existing test-db helper if one exists.)
    const tender = await Tender.create({
      name: "Test Tender",
      jobcode: "T-001",
      files: [],
    } as any);
    tenderId = tender._id.toString();
    const sheet = await TenderPricingSheet.create({
      tender: tender._id,
      defaultMarkupPct: 15,
      rows: [],
    } as any);
    sheetId = sheet._id.toString();
  });

  afterEach(async () => {
    await Tender.deleteOne({ _id: tenderId });
    await TenderPricingSheet.deleteOne({ _id: sheetId });
  });

  it("creates a mixed batch of schedule + group + item in order", async () => {
    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () =>
        srv.call("create_pricing_rows", {
          rows: [
            { type: "schedule", description: "Earthworks", indentLevel: 0, itemNumber: "A" },
            { type: "group", description: "Excavation", indentLevel: 1, itemNumber: "A.1" },
            {
              type: "item",
              description: "Bulk excavation",
              indentLevel: 2,
              itemNumber: "A.1.1",
              quantity: 500,
              unit: "m³",
            },
          ],
        }),
    );
    const text = (result.content[0] as any).text;
    const parsed = JSON.parse(text);
    expect(parsed.totalRows).toBe(3);
    expect(parsed.created).toHaveLength(3);

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows).toHaveLength(3);
    expect(sheet!.rows[0].type).toBe("schedule");
    expect(sheet!.rows[2].quantity).toBe(500);
    expect(sheet!.rows[0].sortOrder).toBe(0);
    expect(sheet!.rows[1].sortOrder).toBe(1);
    expect(sheet!.rows[2].sortOrder).toBe(2);
    expect(sheet!.rows.every((r: any) => r.status === "not_started")).toBe(true);
  });

  it("rejects the whole batch if a schedule row has quantity", async () => {
    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () =>
        srv.call("create_pricing_rows", {
          rows: [
            { type: "schedule", description: "OK schedule", indentLevel: 0 },
            {
              type: "schedule",
              description: "Bad schedule with quantity",
              indentLevel: 0,
              quantity: 100,
            } as any,
          ],
        }),
    );
    const text = (result.content[0] as any).text;
    expect(text).toMatch(/validation failed/);
    expect(text).toMatch(/quantity\/unit only allowed on items/);

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows).toHaveLength(0);
  });

  it("rejects PM role check when user role < ProjectManager", async () => {
    const srv = makeServer();
    await expect(
      runWithContext(
        { userId: new Types.ObjectId().toString(), role: UserRoles.User, tenderId },
        () =>
          srv.call("create_pricing_rows", {
            rows: [{ type: "schedule", description: "Earthworks", indentLevel: 0 }],
          }),
      ),
    ).rejects.toThrow(/Forbidden: PM or Admin role required/);
  });
});
```

> **Note for engineer:** the test suite assumes a working Jest + Mongo setup. If `Tender.create(...)` in `beforeEach` requires fields the schema enforces (e.g. `createdBy`), look at `server/src/__tests__/tenderNoteTools.test.ts` (before Task 8 deletes it — read it in Task 6 for reference) for the existing pattern. The internal handler registry path `(server as any)._registeredTools?.[name]` must be confirmed against the installed `@modelcontextprotocol/sdk` version: open `node_modules/@modelcontextprotocol/sdk/server/mcp.js` and search for the property name where `registerTool` stores its handlers.

- [ ] **Step 4: Commit**

```bash
git add server/src/mcp/tools/tender.ts server/src/__tests__/mcp/tenderTools.test.ts
git commit -m "feat(mcp): create_pricing_rows tool with validation + tests"
```

---

## Task 11: `update_pricing_rows` write tool

**Files:**
- Modify: `server/src/mcp/tools/tender.ts`
- Modify: `server/src/__tests__/mcp/tenderTools.test.ts`

- [ ] **Step 1: Add the update tool**

Inside `register(server)` in `server/src/mcp/tools/tender.ts`, after `create_pricing_rows`, add:

```ts
  // ── update_pricing_rows ──────────────────────────────────────────────────
  server.registerTool(
    "update_pricing_rows",
    {
      description:
        "Update one or more pricing rows on the active tender. Each update is identified by rowId. Only rows in 'not_started' state can be edited — already-started rows are protected. Editable fields: itemNumber, description, indentLevel, quantity, unit (items only). Notes and docRefs are append-only via appendNotes / appendDocRefs — existing content is never overwritten. Up to 100 updates per call. Validation is all-or-nothing.",
      inputSchema: {
        updates: z
          .array(
            z.object({
              rowId: z.string(),
              itemNumber: z.string().optional(),
              description: z.string().optional(),
              indentLevel: z.number().int().min(0).max(3).optional(),
              quantity: z.number().optional(),
              unit: z.string().optional(),
              appendNotes: z.string().optional(),
              appendDocRefs: z
                .array(
                  z.object({
                    enrichedFileId: z.string(),
                    page: z.number().int().min(1),
                    description: z.string().optional(),
                  }),
                )
                .optional(),
            }),
          )
          .min(1)
          .max(100),
      },
    },
    async ({ updates }) => {
      requirePmRole();
      const { tenderId } = requireTenderContext();
      const sheet = await TenderPricingSheet.getByTenderId(tenderId);
      if (!sheet) throw new Error(`No pricing sheet found for tender ${tenderId}`);

      const rowsById = new Map(
        sheet.rows.map((r: any) => [r._id.toString(), r]),
      );

      // Validate-all-then-apply
      const errors: string[] = [];
      for (const u of updates) {
        const row = rowsById.get(u.rowId) as any;
        if (!row) {
          errors.push(`row ${u.rowId}: not found`);
          continue;
        }
        if (row.status !== "not_started") {
          errors.push(
            `row ${u.rowId}: in state '${row.status}', cannot edit (only 'not_started' rows are editable)`,
          );
        }
        if (
          row.type !== "item" &&
          (u.quantity !== undefined || u.unit !== undefined)
        ) {
          errors.push(
            `row ${u.rowId}: quantity/unit only allowed on items, not ${row.type}`,
          );
        }
      }
      if (errors.length > 0) {
        return ok(`Error: validation failed. No updates applied.\n${errors.join("\n")}`);
      }

      const updated: Array<{ rowId: string; fieldsChanged: string[] }> = [];
      for (const u of updates) {
        const row = rowsById.get(u.rowId) as any;
        const fieldsChanged: string[] = [];

        if (u.itemNumber !== undefined) {
          row.itemNumber = u.itemNumber;
          fieldsChanged.push("itemNumber");
        }
        if (u.description !== undefined) {
          row.description = u.description;
          fieldsChanged.push("description");
        }
        if (u.indentLevel !== undefined) {
          row.indentLevel = u.indentLevel;
          fieldsChanged.push("indentLevel");
        }
        if (u.quantity !== undefined) {
          row.quantity = u.quantity;
          fieldsChanged.push("quantity");
        }
        if (u.unit !== undefined) {
          row.unit = u.unit;
          fieldsChanged.push("unit");
        }
        if (u.appendNotes !== undefined) {
          row.notes = (row.notes ? row.notes + "\n\n" : "") + u.appendNotes;
          fieldsChanged.push("appendNotes");
        }
        if (u.appendDocRefs !== undefined) {
          const existing = (row.docRefs ?? []) as any[];
          for (const ref of u.appendDocRefs) {
            const isDup = existing.some(
              (e) =>
                e.enrichedFileId.toString() === ref.enrichedFileId &&
                e.page === ref.page,
            );
            if (isDup) continue;
            existing.push({
              _id: new Types.ObjectId(),
              enrichedFileId: new Types.ObjectId(ref.enrichedFileId),
              page: ref.page,
              ...(ref.description != null ? { description: ref.description } : {}),
            });
          }
          row.docRefs = existing;
          fieldsChanged.push("appendDocRefs");
        }

        updated.push({ rowId: u.rowId, fieldsChanged });
      }
      sheet.updatedAt = new Date();
      await sheet.save();

      return ok(JSON.stringify({ updated, totalUpdated: updated.length }));
    },
  );
```

- [ ] **Step 2: Add update test cases**

Append to `server/src/__tests__/mcp/tenderTools.test.ts` (inside the existing top-level describe, after the `create_pricing_rows` block):

```ts
describe("update_pricing_rows", () => {
  let tenderId: string;
  let sheetId: string;
  let rowId: string;

  beforeEach(async () => {
    const tender = await Tender.create({ name: "T", jobcode: "T-002", files: [] } as any);
    tenderId = tender._id.toString();
    const rowOid = new mongoose.Types.ObjectId();
    rowId = rowOid.toString();
    const sheet = await TenderPricingSheet.create({
      tender: tender._id,
      defaultMarkupPct: 15,
      rows: [
        {
          _id: rowOid,
          type: "item",
          sortOrder: 0,
          itemNumber: "A.1",
          description: "Old description",
          indentLevel: 2,
          quantity: 100,
          unit: "m",
          status: "not_started",
          docRefs: [],
        },
      ],
    } as any);
    sheetId = sheet._id.toString();
  });

  afterEach(async () => {
    await Tender.deleteOne({ _id: tenderId });
    await TenderPricingSheet.deleteOne({ _id: sheetId });
  });

  it("applies allowlisted updates to a not_started row", async () => {
    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () =>
        srv.call("update_pricing_rows", {
          updates: [{ rowId, description: "New description", quantity: 250 }],
        }),
    );
    const text = (result.content[0] as any).text;
    expect(text).toContain("totalUpdated");

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows[0].description).toBe("New description");
    expect(sheet!.rows[0].quantity).toBe(250);
  });

  it("rejects the whole batch if any row is not_started", async () => {
    // Flip the row to in_progress
    await TenderPricingSheet.updateOne(
      { _id: sheetId, "rows._id": new mongoose.Types.ObjectId(rowId) },
      { $set: { "rows.$.status": "in_progress" } },
    );

    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () =>
        srv.call("update_pricing_rows", {
          updates: [{ rowId, description: "Should not apply" }],
        }),
    );
    const text = (result.content[0] as any).text;
    expect(text).toMatch(/in state 'in_progress'/);

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows[0].description).toBe("Old description");
  });

  it("appendNotes concatenates with newline separator instead of replacing", async () => {
    // Pre-fill an existing note
    await TenderPricingSheet.updateOne(
      { _id: sheetId, "rows._id": new mongoose.Types.ObjectId(rowId) },
      { $set: { "rows.$.notes": "Original note" } },
    );

    const srv = makeServer();
    await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () =>
        srv.call("update_pricing_rows", {
          updates: [{ rowId, appendNotes: "Added note" }],
        }),
    );

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows[0].notes).toBe("Original note\n\nAdded note");
  });

  it("appendDocRefs dedupes against existing (enrichedFileId, page) pairs", async () => {
    const fileId = new mongoose.Types.ObjectId().toString();

    // Add an existing docRef
    await TenderPricingSheet.updateOne(
      { _id: sheetId, "rows._id": new mongoose.Types.ObjectId(rowId) },
      {
        $set: {
          "rows.$.docRefs": [
            {
              _id: new mongoose.Types.ObjectId(),
              enrichedFileId: new mongoose.Types.ObjectId(fileId),
              page: 5,
            },
          ],
        },
      },
    );

    const srv = makeServer();
    await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () =>
        srv.call("update_pricing_rows", {
          updates: [
            {
              rowId,
              appendDocRefs: [
                { enrichedFileId: fileId, page: 5 }, // duplicate, should be skipped
                { enrichedFileId: fileId, page: 7 }, // new, should be added
              ],
            },
          ],
        }),
    );

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows[0].docRefs).toHaveLength(2);
    expect(sheet!.rows[0].docRefs.map((d: any) => d.page).sort()).toEqual([5, 7]);
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add server/src/mcp/tools/tender.ts server/src/__tests__/mcp/tenderTools.test.ts
git commit -m "feat(mcp): update_pricing_rows tool with append-only notes/docRefs + tests"
```

---

## Task 12: `delete_pricing_rows` write tool

**Files:**
- Modify: `server/src/mcp/tools/tender.ts`
- Modify: `server/src/__tests__/mcp/tenderTools.test.ts`

- [ ] **Step 1: Add the delete tool**

Inside `register(server)`, after `update_pricing_rows`, add:

```ts
  // ── delete_pricing_rows ──────────────────────────────────────────────────
  server.registerTool(
    "delete_pricing_rows",
    {
      description:
        "Delete one or more pricing rows from the active tender. Only rows in 'not_started' state can be deleted. Up to 100 rows per call. Validation is all-or-nothing — if any row is not editable, none are deleted.",
      inputSchema: {
        rowIds: z.array(z.string()).min(1).max(100),
      },
    },
    async ({ rowIds }) => {
      requirePmRole();
      const { tenderId } = requireTenderContext();
      const sheet = await TenderPricingSheet.getByTenderId(tenderId);
      if (!sheet) throw new Error(`No pricing sheet found for tender ${tenderId}`);

      const errors: string[] = [];
      const rowsById = new Map(
        sheet.rows.map((r: any) => [r._id.toString(), r]),
      );
      for (const id of rowIds) {
        const row = rowsById.get(id) as any;
        if (!row) {
          errors.push(`row ${id}: not found`);
          continue;
        }
        if (row.status !== "not_started") {
          errors.push(
            `row ${id}: in state '${row.status}', cannot delete (only 'not_started' rows can be deleted)`,
          );
        }
      }
      if (errors.length > 0) {
        return ok(`Error: validation failed. No rows deleted.\n${errors.join("\n")}`);
      }

      const idSet = new Set(rowIds);
      sheet.rows = sheet.rows.filter(
        (r: any) => !idSet.has(r._id.toString()),
      ) as any;
      sheet.updatedAt = new Date();
      await sheet.save();

      return ok(JSON.stringify({ deleted: rowIds, totalDeleted: rowIds.length }));
    },
  );
```

- [ ] **Step 2: Add delete test cases**

Append to `server/src/__tests__/mcp/tenderTools.test.ts`:

```ts
describe("delete_pricing_rows", () => {
  let tenderId: string;
  let sheetId: string;
  let row1Id: string;
  let row2Id: string;

  beforeEach(async () => {
    const tender = await Tender.create({ name: "T", jobcode: "T-003", files: [] } as any);
    tenderId = tender._id.toString();
    const r1 = new mongoose.Types.ObjectId();
    const r2 = new mongoose.Types.ObjectId();
    row1Id = r1.toString();
    row2Id = r2.toString();
    const sheet = await TenderPricingSheet.create({
      tender: tender._id,
      defaultMarkupPct: 15,
      rows: [
        { _id: r1, type: "item", sortOrder: 0, description: "A", indentLevel: 0, status: "not_started", docRefs: [] },
        { _id: r2, type: "item", sortOrder: 1, description: "B", indentLevel: 0, status: "not_started", docRefs: [] },
      ],
    } as any);
    sheetId = sheet._id.toString();
  });

  afterEach(async () => {
    await Tender.deleteOne({ _id: tenderId });
    await TenderPricingSheet.deleteOne({ _id: sheetId });
  });

  it("deletes both rows when both are not_started", async () => {
    const srv = makeServer();
    await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () => srv.call("delete_pricing_rows", { rowIds: [row1Id, row2Id] }),
    );
    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows).toHaveLength(0);
  });

  it("rejects whole batch if one row is in_progress", async () => {
    await TenderPricingSheet.updateOne(
      { _id: sheetId, "rows._id": new mongoose.Types.ObjectId(row2Id) },
      { $set: { "rows.$.status": "in_progress" } },
    );
    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () => srv.call("delete_pricing_rows", { rowIds: [row1Id, row2Id] }),
    );
    const text = (result.content[0] as any).text;
    expect(text).toMatch(/in state 'in_progress'/);

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add server/src/mcp/tools/tender.ts server/src/__tests__/mcp/tenderTools.test.ts
git commit -m "feat(mcp): delete_pricing_rows tool with status guard + tests"
```

---

## Task 13: `reorder_pricing_rows` write tool

**Files:**
- Modify: `server/src/mcp/tools/tender.ts`
- Modify: `server/src/__tests__/mcp/tenderTools.test.ts`

- [ ] **Step 1: Add the reorder tool**

Inside `register(server)`, after `delete_pricing_rows`, add:

```ts
  // ── reorder_pricing_rows ─────────────────────────────────────────────────
  server.registerTool(
    "reorder_pricing_rows",
    {
      description:
        "Reorder ALL rows in the active tender's pricing sheet. Pass the complete list of rowIds in the desired order — partial reorders are rejected because they corrupt sortOrder. Reordering does not change row content, so it is allowed regardless of row status (not blocked by 'in_progress' rows).",
      inputSchema: {
        rowIds: z.array(z.string()).min(1),
      },
    },
    async ({ rowIds }) => {
      requirePmRole();
      const { tenderId } = requireTenderContext();
      const sheet = await TenderPricingSheet.getByTenderId(tenderId);
      if (!sheet) throw new Error(`No pricing sheet found for tender ${tenderId}`);

      if (rowIds.length !== sheet.rows.length) {
        return ok(
          `Error: rowIds.length (${rowIds.length}) does not match sheet.rows.length (${sheet.rows.length}). Reorder requires the full list of rows in the new order.`,
        );
      }
      const sheetIdSet = new Set(sheet.rows.map((r: any) => r._id.toString()));
      const inputIdSet = new Set(rowIds);
      if (
        sheetIdSet.size !== inputIdSet.size ||
        ![...sheetIdSet].every((id) => inputIdSet.has(id))
      ) {
        return ok(
          `Error: rowIds set does not match sheet.rows set. Every existing rowId must appear exactly once.`,
        );
      }

      const rowMap = new Map(
        sheet.rows.map((r: any) => [r._id.toString(), r]),
      );
      const reordered = rowIds.map((id, i) => {
        const row = rowMap.get(id) as any;
        row.sortOrder = i;
        return row;
      });
      sheet.rows = reordered as any;
      sheet.updatedAt = new Date();
      await sheet.save();

      return ok(
        JSON.stringify({ reordered: true, totalRows: reordered.length }),
      );
    },
  );
```

- [ ] **Step 2: Add reorder test cases**

Append to `server/src/__tests__/mcp/tenderTools.test.ts`:

```ts
describe("reorder_pricing_rows", () => {
  let tenderId: string;
  let sheetId: string;
  let r1Id: string;
  let r2Id: string;
  let r3Id: string;

  beforeEach(async () => {
    const tender = await Tender.create({ name: "T", jobcode: "T-004", files: [] } as any);
    tenderId = tender._id.toString();
    const r1 = new mongoose.Types.ObjectId();
    const r2 = new mongoose.Types.ObjectId();
    const r3 = new mongoose.Types.ObjectId();
    r1Id = r1.toString();
    r2Id = r2.toString();
    r3Id = r3.toString();
    const sheet = await TenderPricingSheet.create({
      tender: tender._id,
      defaultMarkupPct: 15,
      rows: [
        { _id: r1, type: "item", sortOrder: 0, description: "A", indentLevel: 0, status: "not_started", docRefs: [] },
        { _id: r2, type: "item", sortOrder: 1, description: "B", indentLevel: 0, status: "in_progress", docRefs: [] },
        { _id: r3, type: "item", sortOrder: 2, description: "C", indentLevel: 0, status: "not_started", docRefs: [] },
      ],
    } as any);
    sheetId = sheet._id.toString();
  });

  afterEach(async () => {
    await Tender.deleteOne({ _id: tenderId });
    await TenderPricingSheet.deleteOne({ _id: sheetId });
  });

  it("reorders the full list and reassigns sortOrder", async () => {
    const srv = makeServer();
    await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () => srv.call("reorder_pricing_rows", { rowIds: [r3Id, r1Id, r2Id] }),
    );
    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows.map((r: any) => r._id.toString())).toEqual([r3Id, r1Id, r2Id]);
    expect(sheet!.rows.map((r: any) => r.sortOrder)).toEqual([0, 1, 2]);
  });

  it("allows reordering even when a row is in_progress", async () => {
    // r2 is in_progress in beforeEach; reorder should still succeed
    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () => srv.call("reorder_pricing_rows", { rowIds: [r2Id, r3Id, r1Id] }),
    );
    const text = (result.content[0] as any).text;
    expect(text).toContain("reordered");

    const sheet = await TenderPricingSheet.findById(sheetId).lean();
    expect(sheet!.rows[0]._id.toString()).toBe(r2Id);
    expect(sheet!.rows[0].status).toBe("in_progress");
  });

  it("rejects partial reorders (missing row)", async () => {
    const srv = makeServer();
    const result = await runWithContext(
      { userId: new Types.ObjectId().toString(), role: UserRoles.ProjectManager, tenderId },
      () => srv.call("reorder_pricing_rows", { rowIds: [r1Id, r2Id] }),
    );
    const text = (result.content[0] as any).text;
    expect(text).toMatch(/does not match sheet\.rows\.length/);
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add server/src/mcp/tools/tender.ts server/src/__tests__/mcp/tenderTools.test.ts
git commit -m "feat(mcp): reorder_pricing_rows tool (status-agnostic) + tests"
```

---

## Task 14: Auto-transition row status (estimator path)

**Files:**
- Modify: `server/src/graphql/resolvers/tenderPricingSheet/index.ts:96-134`
- Create: `server/src/__tests__/graphql/tenderPricingRowAutoTransition.test.ts`

- [ ] **Step 1: Add the SOQ allowlist constant**

In `server/src/graphql/resolvers/tenderPricingSheet/index.ts`, near the top of the file (just below the `VALID_ROW_STATUSES` constant on line 23), add:

```ts
const SOQ_DEFINITION_FIELDS = new Set([
  "itemNumber",
  "description",
  "quantity",
  "unit",
  "indentLevel",
  "notes",
]);
```

(`docRefs` is excluded because it's not part of `TenderPricingRowUpdateData` — doc ref edits go through their own dedicated mutations and never trigger this resolver path.)

- [ ] **Step 2: Inject the auto-transition logic into `tenderPricingRowUpdate`**

In the `tenderPricingRowUpdate` mutation, between the existing `const row = sheet!.rows.find(...)` line (line 113) and the `await sheet!.updateRow(rowId, data)` call (line 114), insert:

```ts
    // ── Auto-transition: estimator editing pricing fields on a not_started
    // row flips it to in_progress. Allowlisted fields (SoQ definition) keep
    // the row in not_started. Explicit `status` on the input always wins.
    if (
      row?.status === "not_started" &&
      (data as any).status === undefined
    ) {
      const editedFields = Object.keys(data).filter(
        (k) => (data as any)[k] !== undefined,
      );
      const hasNonAllowlistEdit = editedFields.some(
        (f) => !SOQ_DEFINITION_FIELDS.has(f),
      );
      if (hasNonAllowlistEdit) {
        (data as any).status = "in_progress";
      }
    }
```

- [ ] **Step 3: Write the auto-transition tests**

Create `server/src/__tests__/graphql/tenderPricingRowAutoTransition.test.ts`:

```ts
import mongoose from "mongoose";
import { TenderPricingSheet, Tender } from "@models";
import TenderPricingSheetResolver from "../../graphql/resolvers/tenderPricingSheet";

// Minimal context shim — the resolver only uses ctx.user for audit logging,
// which is conditional. Tests can pass undefined to skip audit writes.
const noCtx = { user: undefined } as any;

describe("tenderPricingRowUpdate auto-transition", () => {
  let resolver: TenderPricingSheetResolver;
  let tenderId: string;
  let sheetId: string;
  let rowId: string;

  beforeEach(async () => {
    resolver = new TenderPricingSheetResolver();
    const tender = await Tender.create({ name: "T", jobcode: "T-AT", files: [] } as any);
    tenderId = tender._id.toString();
    const rowOid = new mongoose.Types.ObjectId();
    rowId = rowOid.toString();
    const sheet = await TenderPricingSheet.create({
      tender: tender._id,
      defaultMarkupPct: 15,
      rows: [
        {
          _id: rowOid,
          type: "item",
          sortOrder: 0,
          itemNumber: "A.1",
          description: "Item",
          indentLevel: 0,
          quantity: 100,
          unit: "m",
          status: "not_started",
          docRefs: [],
        },
      ],
    } as any);
    sheetId = sheet._id.toString();
  });

  afterEach(async () => {
    await Tender.deleteOne({ _id: tenderId });
    await TenderPricingSheet.deleteOne({ _id: sheetId });
  });

  async function reload() {
    const s = await TenderPricingSheet.findById(sheetId).lean();
    return s!.rows[0] as any;
  }

  it("editing only quantity on a not_started row keeps it not_started", async () => {
    await resolver.tenderPricingRowUpdate(sheetId as any, rowId as any, { quantity: 200 } as any, noCtx);
    expect((await reload()).status).toBe("not_started");
  });

  it("editing unitPrice on a not_started row flips to in_progress", async () => {
    await resolver.tenderPricingRowUpdate(sheetId as any, rowId as any, { unitPrice: 99.5 } as any, noCtx);
    expect((await reload()).status).toBe("in_progress");
  });

  it("editing description + unitPrice flips to in_progress (any non-allowlist triggers)", async () => {
    await resolver.tenderPricingRowUpdate(
      sheetId as any,
      rowId as any,
      { description: "New", unitPrice: 50 } as any,
      noCtx,
    );
    expect((await reload()).status).toBe("in_progress");
  });

  it("editing quantity on an in_progress row stays in_progress (no flip)", async () => {
    await TenderPricingSheet.updateOne(
      { _id: sheetId, "rows._id": new mongoose.Types.ObjectId(rowId) },
      { $set: { "rows.$.status": "in_progress" } },
    );
    await resolver.tenderPricingRowUpdate(sheetId as any, rowId as any, { quantity: 300 } as any, noCtx);
    expect((await reload()).status).toBe("in_progress");
  });

  it("editing quantity + explicit status: 'review' becomes review (explicit wins)", async () => {
    await resolver.tenderPricingRowUpdate(
      sheetId as any,
      rowId as any,
      { quantity: 250, status: "review" } as any,
      noCtx,
    );
    expect((await reload()).status).toBe("review");
  });

  it("editing only allowlisted fields (description) on a not_started row stays not_started", async () => {
    await resolver.tenderPricingRowUpdate(
      sheetId as any,
      rowId as any,
      { description: "Renamed" } as any,
      noCtx,
    );
    expect((await reload()).status).toBe("not_started");
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add server/src/graphql/resolvers/tenderPricingSheet/index.ts server/src/__tests__/graphql/tenderPricingRowAutoTransition.test.ts
git commit -m "feat(tender-pricing): auto-transition row status to in_progress on estimator pricing edits"
```

---

## Task 15: Final compile check

**Files:** none modified

- [ ] **Step 1: Run TypeScript compile**

```bash
cd server && npm run build
```
Expected: clean exit, no `TSError`. If errors appear, fix them in the relevant file and amend the most recent commit (or create a `fix:` commit if multiple).

- [ ] **Step 2: Sanity-check the pod logs**

After the change is picked up by Tilt's hot reload (it watches `server/src/`), confirm the server pod is healthy:

```bash
kubectl config current-context  # MUST say minikube
kubectl get pods
kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=50
```

Look for: server start log, no `TSError`, no crash loops. If `kubectl logs` shows a stack trace from the changes, fix the underlying issue (per `feedback_test_failures.md`: do NOT fix tests to make compile errors go away — fix the code).

- [ ] **Step 3: Manual smoke test (optional, recommended before handoff)**

In a browser:
1. Open Tender Chat on a tender with an empty `not_started` pricing sheet
2. Ask: *"Add a schedule called 'Earthworks' with three items: clearing 1 ha, excavation 500 m³, fill 200 m³"*
3. Verify rows appear in the pricing sheet UI in order
4. Ask: *"Rename item 2 to 'bulk excavation'"* — verify the update lands
5. Ask: *"Delete item 3"* — verify removal
6. From a row already in_progress: try editing via chat → verify the assistant reports the status guard error verbatim

- [ ] **Step 4: No commit needed for verification**

Tasks complete when build is clean and pods are healthy.

---

## Self-review notes

**Spec coverage check:**
- AsyncLocalStorage context → Task 1 ✓
- MCP server JWT + ALS wrap → Task 2 ✓
- mcpClient header threading → Task 3 ✓
- Tools registration scaffold → Task 4 ✓
- Note tool migration → Task 5 ✓
- Doc tool migration → Task 6 ✓
- Tender chat router refactor → Task 7 ✓
- Old file cleanup → Task 8 ✓
- get_tender_pricing_rows (incl. pricing fields, hasTemplate, rateBuildupOutputs) → Task 9 ✓
- create_pricing_rows + tests → Task 10 ✓
- update_pricing_rows + appendNotes/appendDocRefs + tests → Task 11 ✓
- delete_pricing_rows + status guard + tests → Task 12 ✓
- reorder_pricing_rows (status-agnostic) + tests → Task 13 ✓
- Auto-transition resolver + tests → Task 14 ✓
- Compile/health verification → Task 15 ✓

**Type consistency check:**
- `RequestContext`, `runWithContext`, `getRequestContext`, `requireTenderContext` — defined Task 1, used Tasks 2, 5, 6, 9, 10, 11, 12, 13 ✓
- `connectMcp(name, prefix, res, opts?)` signature — defined Task 3, used Task 7 ✓
- `requirePmRole()` helper — defined Task 5, reused Tasks 10–13 ✓
- `ok(text)` content-block helper — defined Task 5, reused throughout ✓
- `TenderModel`/`Tender` import alias consolidated in Task 10 Step 2

**Out of scope (deferred to follow-ups):**
- Concurrency control (separate discussion pending)
- Template/input/comment tools (future plan)
- Cross-row hierarchy validation (groups need parent schedule, etc.)
