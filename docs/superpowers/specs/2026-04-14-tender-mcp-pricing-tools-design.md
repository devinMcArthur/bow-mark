# Tender MCP Pricing Tools — Design

**Date:** 2026-04-14
**Branch:** `feat/tender-mcp-pricing-tools`
**Status:** Approved, ready for implementation plan

## Goal

Give Tender Chat the ability to compose a tender's schedule of quantities through conversation: create/update/delete/reorder pricing rows (schedules, groups, items) within hard server-side guards. Migrate all existing Tender Chat tools (notes, document reading) into the centralized MCP server so any chat endpoint can reuse them.

The end state: an estimator opens a tender PDF, talks to the assistant, and ends up with a populated pricing sheet — without leaving the chat. Templates, inputs, and pricing work remain estimator-driven for now.

## Scope

In:
- New MCP tools: `create_pricing_rows`, `update_pricing_rows`, `delete_pricing_rows`, `reorder_pricing_rows`, `get_tender_pricing_rows`
- Migration of existing Tender Chat inline tools into the MCP server: `save_tender_note`, `delete_tender_note`, `list_document_pages`, `read_document`
- Per-request auth/context propagation through the MCP server via headers + `AsyncLocalStorage`
- Auto-transition of row status from `not_started` → `in_progress` when an estimator (GraphQL path) edits a non-allowlisted field
- Tender Chat router refactor to consume MCP tools instead of inline tools

Out:
- Template attachment, input editing, comments, audit trail
- Cross-row validation (e.g. group must have a parent schedule)
- Concurrency control / optimistic locking — separate discussion
- Migration of MCP server consumers other than Tender Chat (`router/chat.ts`, `router/pm-jobsite-chat.ts` are updated to pass auth headers but no functional changes)
- Load testing, Playwright E2E, multi-user concurrency tests

## Architecture

### File layout

**New files:**
- `server/src/mcp/context.ts` — `AsyncLocalStorage<RequestContext>` + `runWithContext` / `getRequestContext` / `requireTenderContext` helpers
- `server/src/mcp/tools/tender.ts` — single registration entry point for all tender-scoped tools (read + write + notes + docs)
- `server/src/__tests__/mcp/context.test.ts` — context isolation + helper tests
- `server/src/__tests__/mcp/tenderTools.test.ts` — unit tests for every tool
- `server/src/__tests__/graphql/tenderPricingRowAutoTransition.test.ts` — auto-transition resolver tests

**Modified files:**
- `server/src/mcp-server.ts` — POST `/mcp` extracts `Authorization` + `X-Tender-Id` headers, validates JWT, runs handler in ALS context. Adds `registerTender(server)` to the registration list.
- `server/src/lib/mcpClient.ts` — `connectMcp()` accepts an optional `{ authToken, tenderId }` opts object and threads it as headers via `StreamableHTTPClientTransport`'s `requestInit`
- `server/src/router/tender-chat.ts` — drops inline tools imports + `executeTool`, uses `connectMcp({ authToken, tenderId })` + `client.callTool()` dispatch
- `server/src/router/chat.ts`, `server/src/router/pm-jobsite-chat.ts` — pass `authToken: req.token` when calling `connectMcp` (non-breaking)
- `server/src/graphql/resolvers/tenderPricingSheet/index.ts` — auto-transition logic in `tenderPricingRowUpdate` mutation

**Deleted files:**
- `server/src/lib/tenderNoteTools.ts`
- `server/src/lib/readDocumentExecutor.ts`
- `server/src/__tests__/tenderNoteTools.test.ts` (replaced by new MCP tool tests)

### Auth and request context

The MCP server (`mcp-server.ts`) is a separate Express process on port 8081 in the same Docker image as the main API, so it has access to `JWT_SECRET` and all model code already. Today it is unauthenticated and stateless. This work adds per-request authentication without persistent server-side session state.

#### `RequestContext`

```ts
type RequestContext = {
  userId: string;
  role: UserRoles;
  tenderId?: string;  // optional — read-only tools may be called without it
};
```

#### `mcp/context.ts`

```ts
import { AsyncLocalStorage } from "async_hooks";

const als = new AsyncLocalStorage<RequestContext>();

export const runWithContext = <T>(
  ctx: RequestContext,
  fn: () => Promise<T>,
): Promise<T> => als.run(ctx, fn);

export const getRequestContext = (): RequestContext => {
  const ctx = als.getStore();
  if (!ctx) {
    throw new Error("No request context — tool called outside MCP request");
  }
  return ctx;
};

export const requireTenderContext = (): RequestContext & { tenderId: string } => {
  const ctx = getRequestContext();
  if (!ctx.tenderId) {
    throw new Error("This tool requires X-Tender-Id header");
  }
  return ctx as RequestContext & { tenderId: string };
};
```

#### `mcp-server.ts` POST `/mcp` flow

1. Read `Authorization` header → verify JWT inline using `jwt.verify(token, process.env.JWT_SECRET)`, same approach as `requireAuth` in `lib/authMiddleware.ts:22`. Extract the `userId` from the decoded payload. Missing token, missing secret, or verification failure → respond 401.
2. Load the `User` document and confirm `role >= UserRoles.User`. Otherwise 401.
3. Read `X-Tender-Id` header (optional). If present, must be a valid Mongo ObjectId or the request is rejected with 400.
4. Build `ctx = { userId, role, tenderId }`.
5. `runWithContext(ctx, () => transport.handleRequest(req, res, req.body))`.

The role check at the MCP server level is just "is this a real, authenticated user." Per-tool role enforcement (PM+ for write tools, save/delete notes) happens inside each tool handler via `getRequestContext().role`. This lets the same MCP endpoint serve both estimators (read-only) and PMs (read + write).

The existing `requireAuth` middleware on the Tender Chat route stays in place — it validates the token and rejects unauthenticated requests before they ever reach `connectMcp`. The route-level PM+ check on `tender-chat.ts:51` also stays. The MCP server's JWT validation is layered defense: even if a future caller bypasses the route guards, the MCP server still verifies the token. The two checks are not redundant — they protect different layers.

#### `mcpClient.ts` extension

```ts
export interface ConnectMcpOptions {
  authToken?: string;
  tenderId?: string;
}

export async function connectMcp(
  clientName: string,
  logPrefix: string,
  res: Response,
  opts?: ConnectMcpOptions,
): Promise<McpConnection | null> {
  const transport = new StreamableHTTPClientTransport(
    new URL(`${MCP_SERVER_URL}/mcp`),
    {
      requestInit: {
        headers: {
          ...(opts?.authToken ? { Authorization: opts.authToken } : {}),
          ...(opts?.tenderId ? { "X-Tender-Id": opts.tenderId } : {}),
        },
      },
    },
  );
  // ... rest unchanged
}
```

`router/chat.ts` and `pm-jobsite-chat.ts` are updated to pass `authToken: req.token`. They do not pass `tenderId` because their tools today are cross-tender. Existing stateless tools (`search_jobsites`, etc.) continue to work because they never call `getRequestContext()`.

#### Prompt-injection guard

Write tools never accept `tenderId` as an input parameter. They always pull from `requireTenderContext()`. The chat router sets `X-Tender-Id` per request based on the URL path the user is on. Claude has no surface to override which tender it is editing, even via a prompt-injection in tender documents.

### Tool registry

`mcp-server.ts` adds one new register call:

```ts
import { register as registerTender } from "./mcp/tools/tender";
// ...
registerTender(server);
```

`mcp/tools/tender.ts` exports a single `register(server: McpServer)` function that registers all 9 tools in one place: 5 new pricing tools + 4 migrated tools.

## Tool definitions

### Common conventions

- All schemas are zod, registered via `server.registerTool(name, { description, inputSchema }, handler)`.
- Every handler pulls user/tender from `requireTenderContext()`, loads the sheet/tender once, validates everything, mutates via existing service functions in `models/TenderPricingSheet/class/update.ts`, saves once, returns a result.
- Batch tools are **all-or-nothing** for create / update / delete: every input row is validated up front. If any fails, the whole batch is rejected with a structured error message listing which rows failed and why. No partial state is ever written.
- Reorder is naturally all-or-nothing (partial reorder = corrupt `sortOrder`).
- Errors are returned as `{ content: "Error: ...", summary: "..." }` and the stream layer marks them `is_error: true`. Validation messages are detailed enough for Claude to retry intelligently.
- Tools are capped at `100` rows per call — sane upper bound for a single conversational batch.

### Read tool

#### `get_tender_pricing_rows`

```ts
inputSchema: {} // no inputs — tenderId from context
```

Returns the full pricing sheet structure. Excludes the internal `rateBuildupSnapshot` blob (noisy serialization), but exposes a `hasTemplate` flag plus the structured `rateBuildupOutputs` so Claude can reason about pricing without parsing internal serialization.

```jsonc
{
  "defaultMarkupPct": 15,
  "rows": [
    {
      "rowId": "...",
      "type": "schedule" | "group" | "item",
      "sortOrder": 0,
      "itemNumber": "A.1.3",
      "description": "150mm asphalt base course",
      "indentLevel": 2,
      "status": "not_started" | "in_progress" | "review" | "approved",
      "quantity": 1200,
      "unit": "tonne",
      "notes": "free-text or null",
      "docRefs": [
        { "docRefId": "...", "enrichedFileId": "...", "page": 12, "description": "..." }
      ],
      // Pricing fields — read-only for Claude, omitted from write tools
      "unitPrice": 145.50,
      "markupOverride": null,
      "extraUnitPrice": null,
      "extraUnitPriceMemo": null,
      "hasTemplate": true,
      "rateBuildupOutputs": [
        { "kind": "material", "materialId": "...", "unit": "tonne", "perUnitValue": 0.95, "totalValue": 1140 },
        { "kind": "crewHours", "crewKindId": "...", "unit": "hr", "perUnitValue": 0.12, "totalValue": 144 }
      ]
    }
  ],
  "totalRows": N
}
```

This shape supports cross-chat queries like "what did we price job X's asphalt at?" — a future executive chat can call `get_tender_pricing_rows` after resolving a tender ID and get the full pricing breakdown.

### Write tools

#### `create_pricing_rows`

```ts
inputSchema: {
  rows: z.array(z.object({
    type: z.enum(["schedule", "group", "item"]),
    itemNumber: z.string().optional(),
    description: z.string().min(1),
    indentLevel: z.number().int().min(0).max(3).default(0),
    quantity: z.number().optional(),       // items only
    unit: z.string().optional(),           // items only
    notes: z.string().optional(),          // initial notes
    docRefs: z.array(z.object({
      enrichedFileId: z.string(),
      page: z.number().int().min(1),
      description: z.string().optional(),
    })).optional(),
  })).min(1).max(100),
}
```

Validation, applied to every row before any mutation:
- `quantity` and `unit` are only allowed when `type === "item"`. Schedules and groups must omit them.
- Each `enrichedFileId` must resolve to a file currently attached to the tender (or the system spec files).
- `description` must be non-empty after trim.

Behavior:
- For each row in the order received: call `addRow(sheet, { ...rowData, sortOrder: sheet.rows.length, status: "not_started" })`. New rows always start `not_started` regardless of input.
- A single `sheet.save()` at the end.
- Return: `{ created: [{ rowId, type, itemNumber, description }, ...], totalRows: N }`.

No automatic numbering. Claude provides `itemNumber` from the source SoQ (PDFs are typically already numbered). The existing `tenderPricingSheetAutoNumber` mutation remains available for estimators to call manually if they want the system to renumber.

#### `update_pricing_rows`

```ts
inputSchema: {
  updates: z.array(z.object({
    rowId: z.string(),
    itemNumber: z.string().optional(),
    description: z.string().optional(),
    indentLevel: z.number().int().min(0).max(3).optional(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
    appendNotes: z.string().optional(),    // append-only
    appendDocRefs: z.array(z.object({
      enrichedFileId: z.string(),
      page: z.number().int().min(1),
      description: z.string().optional(),
    })).optional(),
  })).min(1).max(100),
}
```

Validation, applied to every update before any mutation:
- `rowId` must exist on the sheet.
- `row.status === "not_started"` — otherwise the whole batch is rejected with `Row {id} is in state '{status}', cannot edit. Only rows in 'not_started' state can be edited.`
- `quantity` and `unit` are only allowed when `row.type === "item"`.

Behavior for each update:
- Replaceable fields (`itemNumber`, `description`, `indentLevel`, `quantity`, `unit`) are applied via existing `updateRow()`.
- `appendNotes`: `row.notes = (row.notes ? row.notes + "\n\n" : "") + appendNotes`. Server-enforced concatenation, never replace. The single-string nature of the underlying field means newline separator is the natural append unit.
- `appendDocRefs`: each ref is added via existing `addDocRef()`, which already deduplicates against `(enrichedFileId, page)`.
- A single `sheet.save()` at the end.
- Return: `{ updated: [{ rowId, fieldsChanged: ["description", "appendNotes"] }, ...], totalUpdated: N }`.

#### `delete_pricing_rows`

```ts
inputSchema: {
  rowIds: z.array(z.string()).min(1).max(100),
}
```

Validation: every `rowId` must exist and have `status === "not_started"`. Either fails → reject the whole batch with the same error format as update.

Behavior: `deleteRow()` for each, single save at the end.

Return: `{ deleted: [rowId, ...], totalDeleted: N }`.

#### `reorder_pricing_rows`

```ts
inputSchema: {
  rowIds: z.array(z.string()).min(1),
}
```

Validation:
- `rowIds.length` must equal `sheet.rows.length` and the sets must match — partial reorders corrupt `sortOrder` and are rejected.
- **Status guard NOT enforced.** Reordering does not change row content, only position. Estimators may want Claude to fix positioning even on `in_progress` rows.

Behavior: existing `reorderRows()` reassigns `sortOrder` for every row.

Return: `{ reordered: true, totalRows: N }`.

### Migrated tools (no behavior change)

All four lift from inline files into `mcp/tools/tender.ts`, registered the same way as the new tools. Same input shapes, same observable behavior. The structural change is they pull `tenderId/userId` from `getRequestContext()` instead of executor-factory closures.

| Old location | New tool name | Notes |
|---|---|---|
| `tenderNoteTools.ts` `SAVE_TENDER_NOTE_TOOL` | `save_tender_note` | tenderId/userId from context; PM+ role required |
| `tenderNoteTools.ts` `DELETE_TENDER_NOTE_TOOL` | `delete_tender_note` | tenderId from context; PM+ role required |
| `readDocumentExecutor.ts` `LIST_DOCUMENT_PAGES_TOOL` | `list_document_pages` | Tender files reloaded inside the handler from the context tenderId |
| `readDocumentExecutor.ts` `READ_DOCUMENT_TOOL` | `read_document` | Tender files reloaded inside the handler from the context tenderId |

The document-reading tools currently receive a pre-built file index from a closure in `tender-chat.ts` (`buildFileIndex(tenderFiles, specFiles, ...)`). After migration, both `list_document_pages` and `read_document` reload the tender (with `files` populated) and the system spec files inside themselves on each call. This adds one Mongo query per tool call; acceptable trade-off for centralization. Spec files come from `System.getSystem()`, the tender from `Tender.findById(tenderId).populate(...)`, exactly as `tender-chat.ts` does today.

## Auto-transition of row status (estimator path)

Independent feature, lives entirely in the GraphQL resolver path. Claude's MCP tool path bypasses it (Claude only edits `not_started` rows by definition, and we want its edits not to trigger the transition since it is helping define the SoQ, not pricing the work).

### Allowlist

Fields whose edits keep a row in `not_started`:

```ts
const SOQ_DEFINITION_FIELDS = new Set([
  "itemNumber",
  "description",
  "quantity",
  "unit",
  "indentLevel",
  "notes",
  "docRefs",
]);
```

Anything else (`unitPrice`, `markupOverride`, `extraUnitPrice`, `extraUnitPriceMemo`, `rateBuildupSnapshot`, `rateBuildupOutputs`, etc.) is "pricing work" and triggers the transition.

### Logic

Added to `tenderPricingRowUpdate` resolver in `server/src/graphql/resolvers/tenderPricingSheet/index.ts`, before delegating to `updateRow`:

```ts
const row = sheet.rows.find(/* ... */);
if (row.status === "not_started" && data.status === undefined) {
  const editedFields = Object.keys(data).filter((k) => data[k] !== undefined);
  const hasNonAllowlistEdit = editedFields.some(
    (f) => !SOQ_DEFINITION_FIELDS.has(f),
  );
  if (hasNonAllowlistEdit) {
    data.status = "in_progress";
  }
}
```

### Edge cases

- **Already past `not_started`** → no-op, transition only fires from `not_started`.
- **Explicit `status` in the mutation input** → wins over auto-transition. If an estimator manually flips a row to `review`, that intent is respected.
- **Doc ref add/remove mutations** (`tenderPricingRowDocRefAdd`, `tenderPricingRowDocRefRemove`) → `docRefs` is in the allowlist, so they do **not** trigger the transition.
- **Reorder, duplicate, autoNumber** → do not represent estimator pricing work, no transition.

### Backfill

None. Existing rows keep their current status. The transition fires only on edits going forward.

## Tender Chat router refactor

Today `tender-chat.ts` builds inline tool definitions and dispatches via a hand-rolled `executeTool`. After this work:

1. After loading tender + user + role check (existing code), call `connectMcp("tender-chat", "[tender-chat]", res, { authToken: req.token, tenderId })`. Bail out if it returns null (the helper already writes 503 on failure).
2. Pass the returned `tools` array directly to `streamConversation`.
3. Replace `executeTool` with a thin dispatcher: `(name, input) => client.callTool({ name, arguments: input })`, mapping the result into `{ content, summary }` shape that `streamConversation` expects.
4. Close the client in a `finally` block.

The tender-chat router shrinks: no more inline tool imports, no more hand-written executor dispatch, no more file index pre-building (the migrated `read_document`/`list_document_pages` tools handle that themselves).

## Testing strategy

Per project preference (`feedback_no_tests.md`), tests are written but not run during implementation. They serve as regression coverage for review and CI. Unit-only — no integration tests, no Playwright.

### Unit tests

**`mcp/context.test.ts`** (new)
- `runWithContext` + `getRequestContext` round-trip
- `getRequestContext` throws when called outside `runWithContext`
- `requireTenderContext` throws when `tenderId` missing
- Concurrent `runWithContext` calls do not contaminate each other (parallel awaits each see their own context)

**`mcp/tenderTools.test.ts`** (new, replaces `tenderNoteTools.test.ts`)
- **`create_pricing_rows`**
  - Valid mixed batch (schedule + group + item) creates all rows in order
  - `sortOrder` assigned correctly
  - Status defaults to `not_started`
  - Validation rejects whole batch when any row has `quantity` on a schedule
  - Validation rejects whole batch when an `enrichedFileId` doesn't belong to the tender
- **`update_pricing_rows`**
  - Allowlisted field updates apply
  - Status guard rejects in_progress rows with explicit error
  - `appendNotes` concatenates with newline separator (not replace)
  - `appendDocRefs` dedupes against existing refs
  - One bad row → none applied (atomicity)
- **`delete_pricing_rows`**
  - Deletes all valid rowIds
  - Rejects batch if any row is in_progress
- **`reorder_pricing_rows`**
  - Full-list reorder works
  - Rejects partial lists
  - Allowed regardless of row status (reorder is content-neutral)
- **`get_tender_pricing_rows`**
  - Returns expected shape including pricing fields
  - Omits internal `rateBuildupSnapshot`
  - Includes computed `hasTemplate` flag
- **Migrated `save_tender_note` / `delete_tender_note`** — existing tests ported to MCP context pattern
- **Migrated `list_document_pages` / `read_document`** — file index lookup works from context tenderId

**`graphql/tenderPricingRowAutoTransition.test.ts`** (new)
- Update `quantity` only on `not_started` row → stays `not_started`
- Update `unitPrice` on `not_started` row → flips to `in_progress`
- Update `description` + `unitPrice` → flips (any non-allowlist triggers)
- Update `quantity` on `in_progress` row → stays `in_progress` (no flip)
- Update `quantity` + explicit `status: "review"` → becomes `review` (explicit wins)
- Add docRef to `not_started` → stays `not_started`

### Manual verification (post-implementation)

1. Open Tilt, navigate to a tender with a `not_started` pricing sheet
2. Tender Chat: *"Add a schedule called 'Earthworks' with three items: clearing 1 ha, excavation 500 m³, fill 200 m³"* → verify rows appear in the pricing sheet UI in order
3. *"Rename item 2 to 'bulk excavation'"* → verify update applied
4. *"Delete item 3"* → verify removal
5. From a row already `in_progress` (manually flipped via UI): try editing via chat → verify Claude reports the status guard error and doesn't mutate
6. Cross-chat: open `/chat` and ask *"what did we price the asphalt at on job X"* → verify `get_tender_pricing_rows` works, returns pricing fields
7. Estimator path: edit `unitPrice` directly via existing UI on a `not_started` row → verify auto-transition flips to `in_progress`
8. Edit `description` only on `not_started` → verify it stays `not_started`

## Open follow-ups (not in this spec)

- **Concurrency** — multi-user race conditions across mutations. Surfaced during this brainstorm, marked for its own discussion across the codebase.
- **Template tools** — `attach_row_template`, `set_row_inputs`, `clear_row_template`. Will reuse the same MCP context pattern.
- **Comment tools** — separate from notes, scoped per row.
- **Optimistic locking** — the existing `updateRow` flow has no version check. Out of scope here, will be addressed under the concurrency discussion.
