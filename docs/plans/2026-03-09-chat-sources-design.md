# Chat Sources — Design

**Goal:** Make Claude's chat responses auditable by surfacing the raw tool result data that backs each answer in a "Sources" drawer.

**Architecture:** Tool results are persisted alongside messages in MongoDB, streamed to the client via a new SSE event, and displayed in a Chakra Drawer when the user clicks "Sources" on an assistant message.

---

## Data model

Add `toolResults` to `IChatMessage` in `server/src/models/ChatConversation.ts`:

```typescript
interface IToolResult {
  toolName: string;
  result: string; // raw JSON string returned by MCP
}

interface IChatMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  toolResults?: IToolResult[]; // new — populated on assistant messages only
}
```

Old messages without `toolResults` are unaffected (field is optional, defaults to empty).

---

## Server changes (`server/src/router/chat.ts`)

1. Accumulate tool results in a `turnToolResults: IToolResult[]` array during the agentic loop.
2. After each MCP tool call returns, push `{ toolName, result: resultText }` to `turnToolResults` and emit a new SSE event:
   ```json
   { "type": "tool_result", "toolName": "get_jobsite_performance", "result": "{ ... }" }
   ```
3. When persisting the assistant message to MongoDB, attach `toolResults: turnToolResults`.

No changes needed to `server/src/router/conversations.ts` — `GET /conversations/:id` already returns the full `messages` array.

---

## Client changes (`client/src/pages/chat.tsx`)

### Types

```typescript
interface ToolResult {
  toolName: string;
  result: string;
}

interface ChatMessage {
  // existing fields unchanged
  toolResults?: ToolResult[]; // new
}
```

### SSE handler

Handle the new `tool_result` event by appending to the active assistant message:

```typescript
} else if (event.type === "tool_result" && event.toolName) {
  setMessages((prev) =>
    prev.map((m) =>
      m.id === assistantId
        ? { ...m, toolResults: [...(m.toolResults ?? []), { toolName: event.toolName!, result: event.result! }] }
        : m
    )
  );
}
```

### Historical conversations

In `loadConversation`, map `toolResults` from the API response onto each message.

### Sources button

On assistant messages with `toolResults.length > 0`, render a small "Sources" link below the message bubble. Clicking it opens the drawer, passing the message's `toolResults`.

---

## Sources Drawer UI

A Chakra `Drawer` (size `md`, placement `right`) with one collapsible `Accordion` section per tool result.

**Section header:** tool name in monospace (e.g. `get_jobsite_performance`)

**Section body — adaptive rendering:**
- If the parsed result contains a prominent array property (`jobsites`, `crews`, `employees`, `reports`, `vehicles`, `materials`) → render as a scrollable `Table`
- Otherwise (aggregate results like `get_jobsite_performance`, `get_dashboard_overview`) → render as key-value pairs
- A "Raw JSON" toggle at the bottom of each section reveals the full unformatted payload in a `<pre>` block for complete auditability

**Array detection logic:** check the top-level keys of the parsed JSON for any value that is an `Array`. If found, use that array as the table rows with the first item's keys as column headers.
