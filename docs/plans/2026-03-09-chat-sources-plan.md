# Chat Sources Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Sources" drawer to chat that shows the raw MCP tool results backing each assistant response, persisted in MongoDB so historical conversations retain their sources.

**Architecture:** The server accumulates tool results during the agentic loop, emits them as a new `tool_result` SSE event, and persists them on the assistant message in MongoDB. The client stores them on the `ChatMessage` object and renders a Chakra Drawer with adaptive formatting (table for arrays, key-value for objects) when the user clicks "Sources".

**Tech Stack:** TypeScript, Mongoose (MongoDB), Express SSE, React, Chakra UI

---

## Context for the implementer

The chat system works as follows:
- `server/src/router/chat.ts` — Express route that streams SSE events to the client while running an agentic loop (Claude API → MCP tool calls → Claude API)
- `server/src/models/ChatConversation.ts` — Mongoose model; `IChatMessage` is the subdocument type for each message
- `client/src/pages/chat.tsx` — All chat UI in one file; reads SSE events and updates React state
- `server/src/router/conversations.ts` — REST endpoints for listing/loading past conversations; `GET /conversations/:id` returns full `messages` array

Current SSE events the server emits: `text_delta`, `tool_call` (name only), `usage`, `done`, `error`, `conversation_id`, `title`.

The new event is `tool_result` — emitted after each MCP tool call with the full JSON result string.

---

### Task 1: Extend the MongoDB message model

**Files:**
- Modify: `server/src/models/ChatConversation.ts`

**Step 1: Add the `IToolResult` interface and extend `IChatMessage`**

Replace the existing interfaces and schema with:

```typescript
export interface IToolResult {
  toolName: string;
  result: string; // raw JSON string from MCP
}

export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  toolResults?: IToolResult[];
}
```

Add the `ToolResultSchema` subdocument and update `ChatMessageSchema`:

```typescript
const ToolResultSchema = new Schema<IToolResult>(
  {
    toolName: { type: String, required: true },
    result:   { type: String, required: true },
  },
  { _id: false }
);

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role:         { type: String, enum: ["user", "assistant"], required: true },
    content:      { type: String, required: true },
    model:        { type: String },
    inputTokens:  { type: Number },
    outputTokens: { type: Number },
    toolResults:  { type: [ToolResultSchema], default: undefined },
  },
  { _id: false }
);
```

**Step 2: Verify TypeScript compiles**

```bash
cd server && npm run build 2>&1 | head -30
```

Expected: no errors (zero output or only warnings).

**Step 3: Commit**

```bash
git add server/src/models/ChatConversation.ts
git commit -m "feat: add toolResults field to ChatConversation message schema"
```

---

### Task 2: Emit tool_result SSE events and persist results

**Files:**
- Modify: `server/src/router/chat.ts`

**Context:** The agentic loop is a `while (continueLoop)` block starting around line 220. Inside, when `stop_reason === "tool_use"`, it iterates over `message.content` blocks and calls `mcpClient.callTool(...)`. After each tool call, `resultText` is built and pushed to `toolResults`. This is where we need to (a) emit the SSE event and (b) accumulate for persistence.

The assistant message is persisted around line 304 where `convo!.messages.push({ role: "assistant", content: text, ... })`.

**Step 1: Add the `turnToolResults` accumulator before the agentic loop**

Find this comment in `chat.ts`:
```typescript
  // ── Agentic loop ─────────────────────────────────────────────────────────
```

Add directly above the `let continueLoop = true;` line:

```typescript
  const turnToolResults: Array<{ toolName: string; result: string }> = [];
```

**Step 2: Emit `tool_result` event after each successful tool call**

Find the block that builds `resultText` and pushes to `toolResults`:

```typescript
            const resultText =
              (mcpResult.content as Array<{ type: string; text?: string }>)
                .filter((c) => c.type === "text")
                .map((c) => c.text ?? "")
                .join("\n") || "No result";

            toolResults.push({
```

After the `resultText` is computed (before the `toolResults.push`), add:

```typescript
            turnToolResults.push({ toolName: block.name, result: resultText });
            sendEvent({ type: "tool_result", toolName: block.name, result: resultText });
```

**Step 3: Attach tool results when persisting the assistant message**

Find the block that pushes the assistant message to `convo!.messages`:

```typescript
      if (text) {
        convo!.messages.push({
          role: "assistant",
          content: text,
          model: MODEL,
          inputTokens: convo!.totalInputTokens - tokensBefore.input,
          outputTokens: convo!.totalOutputTokens - tokensBefore.output,
        });
      }
```

Add `toolResults` to the push:

```typescript
      if (text) {
        convo!.messages.push({
          role: "assistant",
          content: text,
          model: MODEL,
          inputTokens: convo!.totalInputTokens - tokensBefore.input,
          outputTokens: convo!.totalOutputTokens - tokensBefore.output,
          ...(turnToolResults.length > 0 ? { toolResults: turnToolResults } : {}),
        });
      }
```

**Step 4: Verify TypeScript compiles**

```bash
cd server && npm run build 2>&1 | head -30
```

Expected: no errors.

**Step 5: Commit**

```bash
git add server/src/router/chat.ts
git commit -m "feat: emit tool_result SSE events and persist sources on assistant messages"
```

---

### Task 3: Update client types and SSE handler

**Files:**
- Modify: `client/src/pages/chat.tsx`

**Step 1: Add `ToolResult` interface and extend `ChatMessage`**

Find the existing types near the top of the file (around line 32):

```typescript
type Role = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  toolCalls?: string[];
  isStreaming?: boolean;
  model?: string;
}
```

Replace with:

```typescript
type Role = "user" | "assistant";

interface ToolResult {
  toolName: string;
  result: string;
}

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  toolCalls?: string[];
  toolResults?: ToolResult[];
  isStreaming?: boolean;
  model?: string;
}
```

**Step 2: Handle `tool_result` SSE events**

Find the SSE event type annotation (around line 483):

```typescript
              const event = JSON.parse(raw) as {
                type: string;
                delta?: string;
                toolName?: string;
                message?: string;
                id?: string;
                inputTokens?: number;
                outputTokens?: number;
                model?: string;
                title?: string;
              };
```

Add `result?: string` to the type:

```typescript
              const event = JSON.parse(raw) as {
                type: string;
                delta?: string;
                toolName?: string;
                result?: string;
                message?: string;
                id?: string;
                inputTokens?: number;
                outputTokens?: number;
                model?: string;
                title?: string;
              };
```

Then find the `tool_call` SSE handler (around line 503):

```typescript
              } else if (event.type === "tool_call" && event.toolName) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, toolCalls: [...(m.toolCalls ?? []), event.toolName!] }
                      : m
                  )
                );
```

Add a new handler immediately after it:

```typescript
              } else if (event.type === "tool_result" && event.toolName && event.result !== undefined) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolResults: [
                            ...(m.toolResults ?? []),
                            { toolName: event.toolName!, result: event.result! },
                          ],
                        }
                      : m
                  )
                );
```

**Step 3: Map toolResults when loading historical conversations**

Find the `loadConversation` function. It fetches `GET /conversations/:id` and maps the response messages. Find the part that maps each message to a `ChatMessage`:

```typescript
        setMessages(
          data.messages.map((m: any) => ({
            id: genId(),
            role: m.role,
            content: m.content,
            model: m.model,
          }))
        );
```

Add `toolResults`:

```typescript
        setMessages(
          data.messages.map((m: any) => ({
            id: genId(),
            role: m.role,
            content: m.content,
            model: m.model,
            toolResults: m.toolResults ?? [],
          }))
        );
```

**Step 4: Verify TypeScript compiles**

```bash
cd client && npm run type-check 2>&1 | head -30
```

Expected: no errors.

**Step 5: Commit**

```bash
git add client/src/pages/chat.tsx
git commit -m "feat: handle tool_result SSE events and map sources on conversation load"
```

---

### Task 4: Add Sources button to assistant messages

**Files:**
- Modify: `client/src/pages/chat.tsx`

**Step 1: Add state for the open drawer**

Find the component's state declarations (look for `useState` calls near the top of the page component). Add:

```typescript
  const [sourcesMessage, setSourcesMessage] = React.useState<ChatMessage | null>(null);
```

**Step 2: Add the Sources button below assistant message bubbles**

Find the section that renders the assistant message bubble. It looks like:

```tsx
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
                        ...
                      </Box>
```

After the closing `</Box>` of the bubble (but still inside the assistant message wrapper), add:

```tsx
                        {msg.toolResults && msg.toolResults.length > 0 && !msg.isStreaming && (
                          <Box mt={1}>
                            <Text
                              as="button"
                              fontSize="xs"
                              color="gray.400"
                              _hover={{ color: "gray.600", textDecoration: "underline" }}
                              onClick={() => setSourcesMessage(msg)}
                              cursor="pointer"
                            >
                              Sources ({msg.toolResults.length})
                            </Text>
                          </Box>
                        )}
```

**Step 3: Verify the button appears by checking TypeScript**

```bash
cd client && npm run type-check 2>&1 | head -30
```

Expected: no errors.

**Step 4: Commit**

```bash
git add client/src/pages/chat.tsx
git commit -m "feat: add Sources button to assistant messages with tool results"
```

---

### Task 5: Build the Sources Drawer component

**Files:**
- Create: `client/src/components/Chat/SourcesDrawer.tsx`

**Step 1: Create the component file**

```tsx
import React from "react";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Code,
  Button,
  VStack,
  HStack,
} from "@chakra-ui/react";

interface ToolResult {
  toolName: string;
  result: string;
}

interface SourcesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  toolResults: ToolResult[];
}

// ── Adaptive result renderer ──────────────────────────────────────────────────

function findArray(obj: Record<string, unknown>): unknown[] | null {
  // Check for known array keys first (most common)
  const knownKeys = ["jobsites", "crews", "employees", "reports", "vehicles", "materials"];
  for (const key of knownKeys) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[];
  }
  // Fall back to first array-valued key
  for (const val of Object.values(obj)) {
    if (Array.isArray(val) && val.length > 0) return val as unknown[];
  }
  return null;
}

function ResultTable({ rows }: { rows: unknown[] }) {
  if (rows.length === 0) return <Text fontSize="sm" color="gray.500">No rows.</Text>;
  const cols = Object.keys(rows[0] as object).filter((k) => k !== "id");
  return (
    <TableContainer maxH="400px" overflowY="auto">
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            {cols.map((c) => (
              <Th key={c} fontSize="xs" whiteSpace="nowrap">{c}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {(rows as Record<string, unknown>[]).map((row, i) => (
            <Tr key={i}>
              {cols.map((c) => (
                <Td key={c} fontSize="xs" whiteSpace="nowrap">
                  {row[c] === null || row[c] === undefined
                    ? <Text color="gray.300">—</Text>
                    : String(row[c])}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

function KeyValuePairs({ obj }: { obj: Record<string, unknown> }) {
  return (
    <VStack align="stretch" spacing={1}>
      {Object.entries(obj)
        .filter(([, v]) => !Array.isArray(v) && typeof v !== "object")
        .map(([k, v]) => (
          <HStack key={k} justify="space-between" fontSize="sm">
            <Text color="gray.500" fontFamily="mono" flexShrink={0}>{k}</Text>
            <Text fontWeight="medium" textAlign="right">{String(v ?? "—")}</Text>
          </HStack>
        ))}
    </VStack>
  );
}

function ToolResultView({ result }: { result: string }) {
  const [showRaw, setShowRaw] = React.useState(false);

  let parsed: unknown;
  try {
    parsed = JSON.parse(result);
  } catch {
    return <Code fontSize="xs" whiteSpace="pre-wrap" display="block">{result}</Code>;
  }

  const isObj = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
  const arr = isObj ? findArray(parsed as Record<string, unknown>) : Array.isArray(parsed) ? parsed : null;

  return (
    <VStack align="stretch" spacing={3}>
      {isObj && <KeyValuePairs obj={parsed as Record<string, unknown>} />}
      {arr && <ResultTable rows={arr} />}
      <Box>
        <Button
          size="xs"
          variant="ghost"
          colorScheme="gray"
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? "Hide" : "Raw JSON"}
        </Button>
        {showRaw && (
          <Box
            as="pre"
            mt={2}
            p={2}
            bg="gray.50"
            borderRadius="md"
            fontSize="xs"
            overflowX="auto"
            maxH="300px"
            overflowY="auto"
          >
            {JSON.stringify(parsed, null, 2)}
          </Box>
        )}
      </Box>
    </VStack>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

export default function SourcesDrawer({ isOpen, onClose, toolResults }: SourcesDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader fontSize="md" borderBottom="1px solid" borderColor="gray.200">
          Sources
          <Text fontSize="xs" color="gray.500" fontWeight="normal" mt={0.5}>
            Raw data returned by each tool call
          </Text>
        </DrawerHeader>
        <DrawerBody px={4} py={4}>
          <Accordion allowMultiple defaultIndex={toolResults.map((_, i) => i)}>
            {toolResults.map((tr, i) => (
              <AccordionItem key={i} border="1px solid" borderColor="gray.200" borderRadius="md" mb={3}>
                <AccordionButton px={3} py={2} _hover={{ bg: "gray.50" }}>
                  <Box flex={1} textAlign="left">
                    <Text fontSize="xs" fontFamily="mono" color="gray.600">{tr.toolName}</Text>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel px={3} pb={3}>
                  <ToolResultView result={tr.result} />
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
```

**Step 2: Wire the drawer into chat.tsx**

In `client/src/pages/chat.tsx`:

Import the component at the top:
```tsx
import SourcesDrawer from "../components/Chat/SourcesDrawer";
```

At the bottom of the JSX return (just before the closing `</Permission>` tag), add:
```tsx
        <SourcesDrawer
          isOpen={sourcesMessage !== null}
          onClose={() => setSourcesMessage(null)}
          toolResults={sourcesMessage?.toolResults ?? []}
        />
```

**Step 3: Verify TypeScript compiles**

```bash
cd client && npm run type-check 2>&1 | head -30
```

Expected: no errors.

**Step 4: Commit**

```bash
git add client/src/components/Chat/SourcesDrawer.tsx client/src/pages/chat.tsx
git commit -m "feat: add Sources drawer with adaptive table/key-value rendering"
```

---

### Task 6: End-to-end verification

**Step 1: Check k8s server pod logs compile cleanly**

```bash
kubectl logs $(kubectl get pods -l component=server -o jsonpath='{.items[0].metadata.name}') --tail=20
```

Expected: no TSError or crash.

**Step 2: Send a chat message that triggers tool calls**

Open `https://paving.bowmark.ca/chat` (or local dev), send: `"What jobsites are active this year?"`

Expected:
- Tool call badges appear while streaming
- After response, "Sources (N)" link appears below the assistant bubble
- Clicking it opens the drawer showing `list_jobsites` with a table of jobsites

**Step 3: Verify sources persist on reload**

1. Note the conversation in the sidebar
2. Click "New Chat", then click back to the previous conversation
3. The "Sources" link should still appear on the assistant message

**Step 4: Test with an aggregate tool**

Ask: `"Give me an overview of this year's performance"` (triggers `get_dashboard_overview`)

Expected: Sources drawer shows key-value pairs (no table, since it's a single aggregate object) plus Raw JSON toggle.

**Step 5: Push and create PR**

```bash
git push origin master
gh pr create --base production --head master --title "feat: add Sources drawer for chat response auditability"
```
