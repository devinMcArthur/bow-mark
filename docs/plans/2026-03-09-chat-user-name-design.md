# Chat User Name — Design

**Date:** 2026-03-09
**Scope:** Inject the authenticated user's name into the chat system prompt

## Problem

The chat assistant has no knowledge of who it's talking to, so responses are impersonal and generic.

## Solution

In the chat router, look up the authenticated user by `userId` (already available from the JWT) and inject their name into the system prompt so Claude can address them personally.

## Files

### Modified

- `server/src/router/chat.ts` — fetch `User` by `userId`, prepend name to `SYSTEM_PROMPT`

## Detailed Design

The `SYSTEM_PROMPT` constant becomes a function (or is prepended at request time):

```ts
const buildSystemPrompt = (userName: string) =>
  `The user's name is ${userName}.\n\n${SYSTEM_PROMPT}`;
```

The existing `User.findById(userId)` call (or equivalent) runs once per `/message` request, before the Anthropic API call. The `system` field passed to the Anthropic client uses `buildSystemPrompt(user.name)` instead of the static `SYSTEM_PROMPT`.

If the user lookup fails or returns null, fall back to the static prompt — the feature degrades gracefully.

## Non-Goals

- No schema changes
- No new GraphQL mutations
- No UI changes
- No job role / description fields (can be added later)
