# Chat Response Ratings Design

## Goal

Allow users to upvote or downvote AI assistant responses across all chat contexts (analytics, jobsite, tender). Downvotes capture a structured reason and optional comment. Data is stored for future use in an evaluation system.

## Scope

- All chat contexts: analytics, jobsite, tender
- No admin view in this iteration (planned separately alongside a Developer role)
- Users can change or clear their rating at any time
- Regenerate behavior: when a message is regenerated, the new assistant message has no `messageId` and no rating (the old subdocument is deleted from the DB). This is acceptable — no special handling needed.

---

## Data Model

Add three optional fields to `ConversationMessageClass` in `server/src/models/Conversation/schema/index.ts`:

```typescript
rating?: "up" | "down"
ratingReasons?: string[]
ratingComment?: string
```

Both GET conversation detail endpoints already return `messages: convo.messages` verbatim via `.lean()`, so `_id`, `rating`, `ratingReasons`, and `ratingComment` are all present in responses automatically. No transformation needed. The client treats `_id` as a string (JSON serialisation converts ObjectId to string).

### Valid reason values (enum)

- `wrong_answer` — factually incorrect based on the documents
- `hallucinated_citation` — referenced a page/section that doesn't say what it claims
- `couldnt_find_it` — answer exists in the documents but Claude said it wasn't there
- `wrong_document` — answered from the wrong file or section
- `too_vague` — hedged too much, didn't give a concrete answer
- `misunderstood_question` — answered a different question than what was asked

---

## API

### PATCH /api/conversations/:id/messages/:msgId/rating

Updates the rating on a specific message within a conversation.

**Auth:** JWT middleware (same as all other conversation routes)

**Request body:**
```json
{ "rating": "up" | "down" | null, "reasons": ["hallucinated_citation"], "comment": "Optional text" }
```

- `rating: null` clears an existing rating
- `reasons` and `comment` are silently cleared server-side when rating is `"up"` or `null` — no `400` returned if reasons are sent with an upvote
- At least one reason is required when `rating` is `"down"`

**Success response:** `{ "success": true }`

**Error responses:**
- `400 { "error": "rating must be 'up', 'down', or null" }`
- `400 { "error": "reasons required for downvote" }`
- `400 { "error": "invalid reason value" }`
- `404 { "error": "Not found" }` — conversation or message not found
- `403 { "error": "Forbidden" }` — conversation does not belong to requesting user

**Validation:**
- Both `:id` and `:msgId` must pass `mongoose.isValidObjectId()` — return `404` immediately if either fails (same pattern used throughout `conversations.ts`)
- Conversation must exist and its `user` field must match requesting user's `userId` (`String(convo.user) !== req.userId`)
- All `Conversation` documents share the same `user` field semantics across contexts
- `msgId` must match the `_id` of one of the conversation's message subdocuments
- `rating` must be `"up"`, `"down"`, or `null`
- If `rating` is `"down"`, `reasons` must be a non-empty array of valid reason enum values

**Note:** This single endpoint in `conversations.ts` covers all contexts — analytics, jobsite, and tender. The client always calls `/api/conversations/:id/messages/:msgId/rating` directly (not via `conversationsBase`, which varies by context).

---

## UI Components

### `RatingButtons` component

Rendered inside `MessageBubble` (inline in `ChatPage.tsx`), below the message bubble, in the same action row as the Sources button and regenerate icon.

**Props:**
```typescript
interface RatingButtonsProps {
  messageId: string;
  rating?: "up" | "down";
  ratingReasons?: string[];
  ratingComment?: string;
  onRate: (rating: "up" | "down" | null, reasons?: string[], comment?: string) => void;
}
```

**Visibility:**
- On desktop: hidden by default, revealed on hover of the message container
- On mobile: always visible (no hover available)
- Only rendered when `isStreaming: false` AND `conversationId !== null`
- Never shown on user messages

**States:**
- Default: both thumbs shown in muted gray
- Upvoted: thumbs-up icon green, thumbs-down muted
- Downvoted: thumbs-down icon red, thumbs-up muted

**Interactions:**
- Click thumbs-up: call `onRate("up")`
- Click active thumbs-up again: call `onRate(null)`
- Click thumbs-down when unrated: open `DownvoteForm` inline
- Click thumbs-down when currently upvoted: open `DownvoteForm` inline (upvote replaced on submit)
- Click active thumbs-down again: re-open `DownvoteForm` pre-filled with existing reasons

**Icons:** `FiThumbsUp` / `FiThumbsDown` from `react-icons/fi` (already used in project)

### `DownvoteForm` component

Expands inline below the action row when thumbs-down is clicked. Rendered inside `RatingButtons`.

**Props:**
```typescript
interface DownvoteFormProps {
  initialReasons?: string[];
  initialComment?: string;
  previousRating?: "up" | "down";  // rating before the form was opened, for cancel restore
  onSubmit: (reasons: string[], comment: string) => void;
  onCancel: () => void;
}
```

**Contents:**
- Header: "What was wrong with this response?"
- Six checkboxes, one per reason category (labels are human-readable, values are the enum keys)
- Optional comment textarea (placeholder: "Optional comment...")
- Cancel and Submit buttons

**Behavior:**
- Submit is disabled until at least one checkbox is selected
- On submit: call `onSubmit(reasons, comment)`, collapse form
- Cancel (no previous rating or previous rating was `"up"`): call `onCancel()` — `RatingButtons` restores the pre-open state using `previousRating`
- Cancel (previous rating was `"down"`): call `onCancel()` — `RatingButtons` restores the downvoted state
- When `initialReasons` is provided, pre-fill checkboxes; when `initialComment` is provided, pre-fill textarea

---

## Client-Side State

### `ChatMessage` type changes (`client/src/components/Chat/types.ts`)

Add four optional fields:
```typescript
messageId?: string      // MongoDB _id of the message subdocument (string)
rating?: "up" | "down"
ratingReasons?: string[]
ratingComment?: string
```

### `MessageBubble` props update

Add `rateMessage` to `MessageBubbleProps` in `ChatPage.tsx`:
```typescript
interface MessageBubbleProps {
  msg: ChatMessage;
  onShowSources: (msg: ChatMessage) => void;
  rateMessage: (messageId: string, rating: "up" | "down" | null, reasons?: string[], comment?: string) => void;
}
```

### Loading a conversation

The four new fields are added to the existing `data.messages.map(...)` call inside `loadConversation` in `ChatPage`. The existing mapping (role, content, model, toolResults, perModel token accumulation) is preserved — only the new fields are added:

```typescript
// Add to the existing message object shape in the .map() call:
messageId: m._id,
rating: m.rating,
ratingReasons: m.ratingReasons,
ratingComment: m.ratingComment,
```

### `rateMessage` callback

Defined with `useCallback` in `ChatPage` (required — `MessageBubble` is `React.memo`'d; an unstable reference breaks the memo on every streaming update). Guard: no-op if `conversationId` is null.

```typescript
const rateMessage = useCallback(
  async (messageId: string, rating: "up" | "down" | null, reasons?: string[], comment?: string) => {
    if (!conversationId) return;

    // Snapshot previous state for revert
    const prev = messages.find(m => m.messageId === messageId);
    const prevRating = prev?.rating;
    const prevReasons = prev?.ratingReasons;
    const prevComment = prev?.ratingComment;

    // Optimistic update — all four fields
    setMessages(msgs => msgs.map(m =>
      m.messageId === messageId
        ? { ...m, rating: rating ?? undefined, ratingReasons: reasons, ratingComment: comment }
        : m
    ));

    try {
      // Always use /api/conversations directly (not conversationsBase)
      const res = await fetch(`${serverBase}/api/conversations/${conversationId}/messages/${messageId}/rating`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: getToken() ?? "" },
        body: JSON.stringify({ rating, reasons, comment }),
      });
      if (!res.ok) throw new Error(`Rating failed: ${res.status}`);
    } catch {
      // Revert to previous state on network or server error
      setMessages(msgs => msgs.map(m =>
        m.messageId === messageId
          ? { ...m, rating: prevRating, ratingReasons: prevReasons, ratingComment: prevComment }
          : m
      ));
    }
  },
  // `messages` intentionally excluded — prev state is captured via the functional setMessages
  // updater, keeping this callback stable so React.memo on MessageBubble is not broken.
  [conversationId, serverBase]
);
```

The optimistic update stores all four fields so that re-opening the downvote form within the same session correctly pre-fills the just-submitted values.

### Streaming

`RatingButtons` is not rendered while `isStreaming: true` or when `conversationId` is null.

---

## Files Touched

### Server
- `server/src/models/Conversation/schema/index.ts` — add `rating`, `ratingReasons`, `ratingComment` to `ConversationMessageClass`
- `server/src/router/conversations.ts` — add `PATCH /:id/messages/:msgId/rating` endpoint (GET responses need no changes — `_id` already returned)

### Client
- `client/src/components/Chat/types.ts` — add `messageId`, `rating`, `ratingReasons`, `ratingComment` to `ChatMessage`
- `client/src/components/Chat/ChatPage.tsx` — add `rateMessage` useCallback; extend `MessageBubbleProps` with `rateMessage`; map rating fields in `loadConversation`; update inline `MessageBubble` to render `RatingButtons` and pass `rateMessage`
- `client/src/components/Chat/RatingButtons.tsx` — new component
- `client/src/components/Chat/DownvoteForm.tsx` — new component
