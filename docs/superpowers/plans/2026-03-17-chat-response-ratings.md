# Chat Response Ratings Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add thumbs-up/down rating to AI assistant messages in all chat contexts, storing structured downvote reasons for future evaluation use.

**Architecture:** Rating fields are added to the `ConversationMessageClass` message subdocument. A single REST endpoint `PATCH /api/conversations/:id/messages/:msgId/rating` handles all contexts (analytics, jobsite, tender all share the same `Conversation` collection). The client renders `RatingButtons` and `DownvoteForm` components inline inside the existing `MessageBubble` in `ChatPage.tsx`, using an optimistic update pattern with snapshot-based revert.

**Tech Stack:** Typegoose/Mongoose (MongoDB subdocument schema), Express REST, React + Chakra UI, react-icons/fi, React.memo + useCallback

---

## File Structure

| File | Change |
|------|--------|
| `server/src/models/Conversation/schema/index.ts` | Add `rating`, `ratingReasons`, `ratingComment` fields to `ConversationMessageClass` |
| `server/src/router/conversations.ts` | Add `PATCH /:id/messages/:msgId/rating` endpoint |
| `server/src/router/__tests__/conversationRating.test.ts` | New — integration tests for the rating endpoint |
| `client/src/components/Chat/types.ts` | Add `messageId`, `rating`, `ratingReasons`, `ratingComment` to `ChatMessage` |
| `client/src/components/Chat/RatingButtons.tsx` | New — thumbs up/down icons + form toggle |
| `client/src/components/Chat/DownvoteForm.tsx` | New — reason checkboxes + comment + submit |
| `client/src/components/Chat/ChatPage.tsx` | Add `rateMessage` useCallback; extend `MessageBubbleProps`; map rating fields in `loadConversation`; render `RatingButtons` in `MessageBubble` |

---

## Chunk 1: Server

### Task 1: Add rating fields to ConversationMessageClass

**Files:**
- Modify: `server/src/models/Conversation/schema/index.ts`

- [ ] **Step 1: Add the three rating fields**

Open `server/src/models/Conversation/schema/index.ts`. After the `toolResults` field (line 43), add:

```typescript
@Field({ nullable: true })
@prop({ enum: ["up", "down"] })
public rating?: "up" | "down";

@Field(() => [String], { nullable: true })
@prop({ type: () => [String] })
public ratingReasons?: string[];

@Field({ nullable: true })
@prop()
public ratingComment?: string;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npm run build 2>&1 | head -30
```

Expected: no TypeScript errors. If errors appear, fix before continuing.

- [ ] **Step 3: Commit**

```bash
cd server && git add src/models/Conversation/schema/index.ts
git commit -m "feat(ratings): add rating fields to ConversationMessageClass"
```

---

### Task 2: Add PATCH rating endpoint + tests

**Files:**
- Create: `server/src/router/__tests__/conversationRating.test.ts`
- Modify: `server/src/router/conversations.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/src/router/__tests__/conversationRating.test.ts`:

```typescript
import request from "supertest";
import { prepareDatabase, disconnectAndStopServer } from "@testing/jestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import createApp from "../../app";
import { Conversation } from "@models";
import jestLogin from "@testing/jestLogin";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "http";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

let mongoServer: MongoMemoryServer;
let documents: SeededDatabase;
let app: Server;
let token: string;
let otherToken: string;
let conversationId: string;
let userMsgId: string;
let assistantMsgId: string;

beforeAll(async () => {
  mongoServer = await prepareDatabase();
  app = await createApp();
  documents = await seedDatabase();
  token = await jestLogin(app, "admin@bowmark.ca");
  otherToken = await jestLogin(app, "baseforeman1@bowmark.ca");

  const convo = new Conversation({
    user: documents.users.admin_user._id,
    title: "Test conversation",
    aiModel: "claude-sonnet-4-6",
    messages: [
      { role: "user", content: "What is the ramp slope?" },
      { role: "assistant", content: "The slope is 8.3%." },
    ],
  });
  await convo.save();
  conversationId = convo._id.toString();
  userMsgId = (convo.messages[0] as any)._id.toString();
  assistantMsgId = (convo.messages[1] as any)._id.toString();
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});

describe("PATCH /api/conversations/:id/messages/:msgId/rating", () => {
  describe("upvote", () => {
    it("returns success and persists upvote", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "up" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const convo = await Conversation.findById(conversationId).lean();
      const msg = (convo!.messages as any[]).find(
        (m) => m._id.toString() === assistantMsgId
      );
      expect(msg.rating).toBe("up");
    });
  });

  describe("downvote", () => {
    it("returns success and persists downvote with reasons", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({
          rating: "down",
          reasons: ["hallucinated_citation", "wrong_answer"],
          comment: "It cited the wrong page",
        });
      expect(res.status).toBe(200);
      const convo = await Conversation.findById(conversationId).lean();
      const msg = (convo!.messages as any[]).find(
        (m) => m._id.toString() === assistantMsgId
      );
      expect(msg.rating).toBe("down");
      expect(msg.ratingReasons).toEqual(["hallucinated_citation", "wrong_answer"]);
      expect(msg.ratingComment).toBe("It cited the wrong page");
    });
  });

  describe("clear rating", () => {
    it("clears rating and reasons when rating is null", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: null });
      expect(res.status).toBe(200);
      const convo = await Conversation.findById(conversationId).lean();
      const msg = (convo!.messages as any[]).find(
        (m) => m._id.toString() === assistantMsgId
      );
      expect(msg.rating).toBeUndefined();
      expect(msg.ratingReasons).toBeUndefined();
    });
  });

  describe("upvote clears previous downvote reasons", () => {
    it("removes ratingReasons when switching to upvote", async () => {
      // First downvote
      await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "down", reasons: ["too_vague"] });
      // Then upvote
      await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "up" });
      const convo = await Conversation.findById(conversationId).lean();
      const msg = (convo!.messages as any[]).find(
        (m) => m._id.toString() === assistantMsgId
      );
      expect(msg.rating).toBe("up");
      expect(msg.ratingReasons).toBeUndefined();
    });
  });

  describe("validation", () => {
    it("returns 400 for invalid rating value", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "sideways" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/rating must be/);
    });

    it("returns 400 when downvote has no reasons", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "down", reasons: [] });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/reasons required/);
    });

    it("returns 400 for invalid reason value", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "down", reasons: ["not_a_real_reason"] });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid reason/);
    });

    it("returns 404 for invalid conversation id", async () => {
      const res = await request(app)
        .patch(`/api/conversations/not-an-id/messages/${assistantMsgId}/rating`)
        .set("Authorization", token)
        .send({ rating: "up" });
      expect(res.status).toBe(404);
    });

    it("returns 404 for invalid message id", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/not-an-id/rating`)
        .set("Authorization", token)
        .send({ rating: "up" });
      expect(res.status).toBe(404);
    });

    it("returns 404 when message id does not exist in conversation", async () => {
      const fakeId = "000000000000000000000001";
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${fakeId}/rating`)
        .set("Authorization", token)
        .send({ rating: "up" });
      expect(res.status).toBe(404);
    });

    it("returns 403 when conversation belongs to another user", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .set("Authorization", otherToken)
        .send({ rating: "up" });
      expect(res.status).toBe(403);
    });

    it("returns 401 without auth token", async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
        .send({ rating: "up" });
      expect(res.status).toBe(401);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && npm run test -- src/router/__tests__/conversationRating.test.ts 2>&1 | tail -20
```

Expected: tests fail with "Cannot PATCH /api/conversations/..." (404 — route doesn't exist yet).

- [ ] **Step 3: Add the PATCH endpoint to conversations.ts**

Open `server/src/router/conversations.ts`. Add this constant before the `router` definition (after the imports):

```typescript
const VALID_REASONS = new Set([
  "wrong_answer",
  "hallucinated_citation",
  "couldnt_find_it",
  "wrong_document",
  "too_vague",
  "misunderstood_question",
]);
```

Then add this route at the end of the file, before `export default router`:

```typescript
// PATCH /conversations/:id/messages/:msgId/rating
router.patch("/:id/messages/:msgId/rating", auth, async (req: any, res) => {
  try {
    if (
      !mongoose.isValidObjectId(req.params.id) ||
      !mongoose.isValidObjectId(req.params.msgId)
    ) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const { rating, reasons, comment } = req.body as {
      rating: "up" | "down" | null;
      reasons?: string[];
      comment?: string;
    };

    if (rating !== "up" && rating !== "down" && rating !== null) {
      res.status(400).json({ error: "rating must be 'up', 'down', or null" });
      return;
    }

    if (rating === "down") {
      if (!reasons || !Array.isArray(reasons) || reasons.length === 0) {
        res.status(400).json({ error: "reasons required for downvote" });
        return;
      }
      if (reasons.some((r) => !VALID_REASONS.has(r))) {
        res.status(400).json({ error: "invalid reason value" });
        return;
      }
    }

    const convo = await Conversation.findById(req.params.id);
    if (!convo) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (String(convo.user) !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const msgs = convo.messages as any[];
    const msgIdx = msgs.findIndex((m) => String(m._id) === req.params.msgId);
    if (msgIdx === -1) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    if (rating === null) {
      msgs[msgIdx].rating = undefined;
      msgs[msgIdx].ratingReasons = undefined;
      msgs[msgIdx].ratingComment = undefined;
    } else if (rating === "up") {
      msgs[msgIdx].rating = "up";
      msgs[msgIdx].ratingReasons = undefined;
      msgs[msgIdx].ratingComment = undefined;
    } else {
      msgs[msgIdx].rating = "down";
      msgs[msgIdx].ratingReasons = reasons;
      msgs[msgIdx].ratingComment = comment || undefined;
    }

    convo.markModified("messages");
    await convo.save();

    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /conversations/:id/messages/:msgId/rating error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && npm run test -- src/router/__tests__/conversationRating.test.ts 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
cd server && npm run test 2>&1 | tail -20
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/router/__tests__/conversationRating.test.ts server/src/router/conversations.ts
git commit -m "feat(ratings): add PATCH /conversations/:id/messages/:msgId/rating endpoint"
```

---

## Chunk 2: Client

### Task 3: Add rating fields to ChatMessage type

**Files:**
- Modify: `client/src/components/Chat/types.ts`

- [ ] **Step 1: Add four fields to ChatMessage**

Open `client/src/components/Chat/types.ts`. Find the `ChatMessage` interface. After the `model?: string;` line, add these four lines (do not replace the whole interface):

```typescript
  messageId?: string;       // MongoDB _id of the message subdocument
  rating?: "up" | "down";
  ratingReasons?: string[];
  ratingComment?: string;
```

The final interface should look like:

```typescript
export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  toolCalls?: string[];
  toolResults?: ToolResult[];
  isStreaming?: boolean;
  model?: string;
  messageId?: string;
  rating?: "up" | "down";
  ratingReasons?: string[];
  ratingComment?: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd client && npm run type-check 2>&1 | head -20
```

Expected: no new errors. Fix any that appear before continuing.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Chat/types.ts
git commit -m "feat(ratings): add rating fields to ChatMessage type"
```

---

### Task 4: Create DownvoteForm component

**Files:**
- Create: `client/src/components/Chat/DownvoteForm.tsx`

- [ ] **Step 1: Create the component**

```typescript
// client/src/components/Chat/DownvoteForm.tsx
import React from "react";
import { Box, VStack, HStack, Text, Checkbox, Textarea, Button } from "@chakra-ui/react";

const REASONS: { value: string; label: string }[] = [
  { value: "wrong_answer", label: "Wrong answer" },
  { value: "hallucinated_citation", label: "Hallucinated citation" },
  { value: "couldnt_find_it", label: "Couldn't find it" },
  { value: "wrong_document", label: "Wrong document" },
  { value: "too_vague", label: "Too vague" },
  { value: "misunderstood_question", label: "Misunderstood the question" },
];

interface DownvoteFormProps {
  initialReasons?: string[];
  initialComment?: string;
  onSubmit: (reasons: string[], comment: string) => void;
  onCancel: () => void;
}

const DownvoteForm = ({
  initialReasons,
  initialComment,
  onSubmit,
  onCancel,
}: DownvoteFormProps) => {
  const [selected, setSelected] = React.useState<Set<string>>(
    new Set(initialReasons ?? [])
  );
  const [comment, setComment] = React.useState(initialComment ?? "");

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  return (
    <Box
      mt={2}
      p={3}
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      maxW="380px"
    >
      <Text fontWeight="600" fontSize="xs" mb={2} color="gray.700">
        What was wrong with this response?
      </Text>
      <VStack align="start" spacing={1.5} mb={3}>
        {REASONS.map(({ value, label }) => (
          <Checkbox
            key={value}
            isChecked={selected.has(value)}
            onChange={() => toggle(value)}
            size="sm"
            colorScheme="blue"
          >
            <Text fontSize="xs" color="gray.600">
              {label}
            </Text>
          </Checkbox>
        ))}
      </VStack>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment..."
        size="xs"
        resize="none"
        rows={2}
        mb={2}
        fontSize="xs"
      />
      <HStack justify="flex-end" spacing={2}>
        <Button size="xs" variant="ghost" colorScheme="gray" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="xs"
          colorScheme="blue"
          isDisabled={selected.size === 0}
          onClick={() => onSubmit(Array.from(selected), comment)}
        >
          Submit
        </Button>
      </HStack>
    </Box>
  );
};

export default DownvoteForm;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd client && npm run type-check 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Chat/DownvoteForm.tsx
git commit -m "feat(ratings): add DownvoteForm component"
```

---

### Task 5: Create RatingButtons component

**Files:**
- Create: `client/src/components/Chat/RatingButtons.tsx`

- [ ] **Step 1: Create the component**

```typescript
// client/src/components/Chat/RatingButtons.tsx
import React from "react";
import { HStack, IconButton, Tooltip } from "@chakra-ui/react";
import { FiThumbsUp, FiThumbsDown } from "react-icons/fi";
import DownvoteForm from "./DownvoteForm";

interface RatingButtonsProps {
  messageId: string;
  rating?: "up" | "down";
  ratingReasons?: string[];
  ratingComment?: string;
  onRate: (rating: "up" | "down" | null, reasons?: string[], comment?: string) => void;
}

const RatingButtons = ({
  rating,
  ratingReasons,
  ratingComment,
  onRate,
}: RatingButtonsProps) => {
  const [showForm, setShowForm] = React.useState(false);

  const handleThumbsUp = () => {
    if (showForm) setShowForm(false);
    onRate(rating === "up" ? null : "up");
  };

  const handleThumbsDown = () => {
    setShowForm(true);
  };

  const handleSubmit = (reasons: string[], comment: string) => {
    onRate("down", reasons, comment);
    setShowForm(false);
  };

  const handleCancel = () => {
    // If opening the form replaced an upvote, restore it
    if (rating === "up") {
      onRate("up");
    }
    setShowForm(false);
  };

  return (
    <>
      <HStack spacing={0}>
        <Tooltip label="Good response" placement="bottom" fontSize="xs">
          <IconButton
            aria-label="Upvote response"
            icon={<FiThumbsUp />}
            size="xs"
            variant="ghost"
            color={rating === "up" ? "green.500" : "gray.400"}
            _hover={{ color: "green.500", bg: "transparent" }}
            onClick={handleThumbsUp}
          />
        </Tooltip>
        <Tooltip label="Bad response" placement="bottom" fontSize="xs">
          <IconButton
            aria-label="Downvote response"
            icon={<FiThumbsDown />}
            size="xs"
            variant="ghost"
            color={rating === "down" ? "red.500" : "gray.400"}
            _hover={{ color: "red.500", bg: "transparent" }}
            onClick={handleThumbsDown}
          />
        </Tooltip>
      </HStack>
      {showForm && (
        <DownvoteForm
          initialReasons={ratingReasons}
          initialComment={ratingComment}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};

export default RatingButtons;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd client && npm run type-check 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Chat/RatingButtons.tsx
git commit -m "feat(ratings): add RatingButtons component"
```

---

### Task 6: Wire ratings into ChatPage

**Files:**
- Modify: `client/src/components/Chat/ChatPage.tsx`

This task has four distinct sub-changes:
1. Extend `MessageBubbleProps` with `rateMessage`
2. Render `RatingButtons` inside `MessageBubble`
3. Map rating fields in `loadConversation`
4. Add `rateMessage` useCallback and pass it to `MessageBubble`

- [ ] **Step 1: Extend MessageBubbleProps and update MessageBubble**

In `ChatPage.tsx`, find the `MessageBubbleProps` interface (around line 69):

```typescript
interface MessageBubbleProps {
  msg: ChatMessage;
  onShowSources: (msg: ChatMessage) => void;
}
```

Replace with:

```typescript
interface MessageBubbleProps {
  msg: ChatMessage;
  onShowSources: (msg: ChatMessage) => void;
  rateMessage: (messageId: string, rating: "up" | "down" | null, reasons?: string[], comment?: string) => void;
}
```

- [ ] **Step 2: Add RatingButtons import**

At the top of `ChatPage.tsx`, add after the existing imports:

```typescript
import RatingButtons from "./RatingButtons";
```

- [ ] **Step 3: Render RatingButtons inside MessageBubble**

In `MessageBubble`, find the block after the closing `</Box>` of the assistant message bubble (around line 155) where the Sources button is rendered:

```typescript
{msg.toolResults && msg.toolResults.length > 0 && (
  <Button
    variant="ghost"
    size="xs"
    mt={1}
    color="gray.500"
    fontWeight="normal"
    onClick={() => onShowSources(msg)}
  >
    Sources ({msg.toolResults.length})
  </Button>
)}
```

Replace with:

> **Note (V1 limitation):** Rating buttons only appear on messages that have a `messageId`, which is only populated by `loadConversation`. Freshly streamed messages in the current session won't show rating buttons until the page is reloaded and the conversation is re-fetched. This is acceptable for V1 — the `msg.messageId` guard prevents calling the API without a valid message ID.

```typescript
{(!msg.isStreaming || (msg.toolResults && msg.toolResults.length > 0)) && (
  <HStack spacing={2} align="center" flexWrap="wrap" mt={1}>
    {!msg.isStreaming && msg.messageId && (
      <Box
        sx={{
          "@media (hover: hover)": {
            visibility: "hidden",
            ".message-container:hover &": { visibility: "visible" },
          },
        }}
      >
        <RatingButtons
          messageId={msg.messageId}
          rating={msg.rating}
          ratingReasons={msg.ratingReasons}
          ratingComment={msg.ratingComment}
          onRate={(r, reasons, comment) =>
            rateMessage(msg.messageId!, r, reasons, comment)
          }
        />
      </Box>
    )}
    {msg.toolResults && msg.toolResults.length > 0 && (
      <Button
        variant="ghost"
        size="xs"
        color="gray.500"
        fontWeight="normal"
        onClick={() => onShowSources(msg)}
      >
        Sources ({msg.toolResults.length})
      </Button>
    )}
  </HStack>
)}
```

- [ ] **Step 4: Add `message-container` class to MessageBubble's outer Box**

Find the outer `Box` wrapping the assistant message (around line 90, the one rendered by `MessageBubble` for assistant role):

```typescript
return (
  <Box>
    {msg.toolCalls && ...}
```

Change to:

```typescript
return (
  <Box className="message-container">
    {msg.toolCalls && ...}
```

- [ ] **Step 5: Update MessageBubble render call to pass rateMessage**

Find the render site for `MessageBubble` (around line 899):

```typescript
<MessageBubble msg={msg} onShowSources={setSourcesMessage} />
```

Replace with:

```typescript
<MessageBubble msg={msg} onShowSources={setSourcesMessage} rateMessage={rateMessage} />
```

- [ ] **Step 6: Map rating fields in loadConversation**

Find the `setMessages(` call inside `loadConversation` (around line 363):

```typescript
setMessages(
  data.messages.map((m: { role: Role; content: string; model?: string; toolResults?: ToolResult[] }) => ({
    id: genId(),
    role: m.role,
    content: m.content,
    model: m.model,
    toolResults: m.toolResults,
  }))
);
```

Replace with:

```typescript
setMessages(
  data.messages.map((m: { role: Role; content: string; model?: string; toolResults?: ToolResult[]; _id?: string; rating?: "up" | "down"; ratingReasons?: string[]; ratingComment?: string }) => ({
    id: genId(),
    role: m.role,
    content: m.content,
    model: m.model,
    toolResults: m.toolResults,
    messageId: m._id,
    rating: m.rating,
    ratingReasons: m.ratingReasons,
    ratingComment: m.ratingComment,
  }))
);
```

- [ ] **Step 7: Add the rateMessage useCallback**

Find the `regenerateLastMessage` useCallback (around line 669). Add `rateMessage` before it:

```typescript
// Ref used to snapshot prev rating state before optimistic update.
// This avoids both a stale `messages` closure and a side-effect inside a
// setMessages updater (which is a React anti-pattern / breaks Strict Mode).
const prevRatingSnapshot = React.useRef<{
  rating?: "up" | "down";
  ratingReasons?: string[];
  ratingComment?: string;
} | null>(null);

const rateMessage = useCallback(
  async (
    messageId: string,
    rating: "up" | "down" | null,
    reasons?: string[],
    comment?: string
  ) => {
    if (!conversationId) return;

    // Snapshot happens inside the functional updater so it reads latest state,
    // but we store it in a ref (not a local let) to avoid the side-effect anti-pattern.
    setMessages((msgs) => {
      const m = msgs.find((msg) => msg.messageId === messageId);
      prevRatingSnapshot.current = {
        rating: m?.rating,
        ratingReasons: m?.ratingReasons,
        ratingComment: m?.ratingComment,
      };
      return msgs.map((msg) =>
        msg.messageId === messageId
          ? {
              ...msg,
              rating: rating ?? undefined,
              ratingReasons: reasons,
              ratingComment: comment,
            }
          : msg
      );
    });

    try {
      const token = getToken();
      const res = await fetch(
        `${serverBase}/api/conversations/${conversationId}/messages/${messageId}/rating`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ?? "",
          },
          body: JSON.stringify({ rating, reasons, comment }),
        }
      );
      if (!res.ok) throw new Error(`Rating failed: ${res.status}`);
    } catch {
      // Revert to previous state on error
      const prev = prevRatingSnapshot.current;
      setMessages((msgs) =>
        msgs.map((msg) =>
          msg.messageId === messageId
            ? {
                ...msg,
                rating: prev?.rating,
                ratingReasons: prev?.ratingReasons,
                ratingComment: prev?.ratingComment,
              }
            : msg
        )
      );
    }
  },
  [conversationId, serverBase]
);
```

Note: `messages` is intentionally NOT in the deps array. The ref snapshot approach keeps this callback stable across streaming updates so `React.memo` on `MessageBubble` remains effective. The ref (not a `let` variable) ensures the snapshot survives Strict Mode's double-invocation of updater functions correctly.

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd client && npm run type-check 2>&1 | head -30
```

Expected: no errors. Fix any before continuing.

- [ ] **Step 9: Check pod logs in dev environment**

```bash
kubectl config current-context  # must show: minikube
kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=20
```

Expected: no crash loops or TypeScript errors. If the server is in CrashLoopBackOff, check the full logs and fix the compile error before continuing.

- [ ] **Step 10: Manual smoke test in the browser**

1. Open the local dev environment in the browser
2. Navigate to any chat page (Analytics, a Jobsite, or a Tender) that has an existing conversation, or send a message and wait for it to stream completely
3. **Reload the page** — freshly streamed messages do not have a `messageId` until the conversation is re-fetched (V1 limitation); reloading triggers `loadConversation` which maps `_id` → `messageId`
4. Hover over an assistant message — thumbs-up and thumbs-down icons should appear
5. If the conversation has tool results, verify the **Sources button is visible even before hovering** — it must not be hidden by the hover rule (the hover only hides the thumbs, not Sources)
6. Click thumbs-up — icon should turn green
7. Click thumbs-up again — icon should return to gray (cleared)
8. Click thumbs-down — the inline form should expand below the message
9. Select at least one reason checkbox — Submit button should become enabled
10. Click Submit — form collapses, thumbs-down icon turns red
11. Reload the page and load the same conversation — thumbs-down should still appear red (confirming persistence)
12. Click thumbs-down again (re-open) — reasons should be pre-filled
13. Click Cancel — form collapses, existing downvote preserved

- [ ] **Step 11: Commit**

```bash
git add client/src/components/Chat/ChatPage.tsx
git commit -m "feat(ratings): wire RatingButtons into ChatPage"
```

---

## Final verification

- [ ] **Run server tests one more time**

```bash
cd server && npm run test 2>&1 | tail -10
```

Expected: all tests pass, including the new rating tests.

- [ ] **Run client type-check**

```bash
cd client && npm run type-check 2>&1 | head -10
```

Expected: no errors.
