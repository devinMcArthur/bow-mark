# Developer Role & Ratings Review — Design Spec

**Date:** 2026-03-17
**Status:** Approved

---

## Overview

Add a `Developer` user role (value `4`, above Admin) that gates developer-only tooling inside the existing paving and concrete apps. The first developer tool is a ratings review page for inspecting chat message ratings collected from users.

This approach was chosen over a separate developer client because per-app review is acceptable, the existing role system supports it cleanly, and a separate client would require significant new infrastructure (Docker image, k8s deployment, CI pipeline, cross-app API) for minimal gain.

---

## Section 1: The `DEVELOPER` Role

### Enum

Add `Developer = 4` to `UserRoles` in `server/src/typescript/user.ts`:

```typescript
export enum UserRoles {
  User = 1,
  ProjectManager = 2,
  Admin = 3,
  Developer = 4,
}
```

### Auth Checker (`server/src/utils/authChecker.ts`)

Two changes:

1. Change the `"ADMIN"` check from `role === 3` to `role >= 3`. **This is what gives Developer users all admin access** — Developer inherits admin permissions because `role === 4` passes the `>= 3` threshold on any `@Authorized(["ADMIN"])` resolver. The `"DEVELOPER"` branch does NOT provide this inheritance; it only fires when `"DEVELOPER"` is explicitly listed in the roles array.
2. Add a `"DEVELOPER"` check: `role === 4` — used to gate developer-only endpoints.

```typescript
if (roles.includes("DEVELOPER") && context.user.role === 4) return true;
if (roles.includes("ADMIN") && context.user.role >= 3) return true;  // >= 3 gives Developer admin access
if (roles.includes("PM") && context.user.role >= 2) return true;
```

The existing `"DEV"` env-based check (`NODE_ENV === "development"`) is left unchanged.

### Server-Side Role Assignment Guard

The `userUpdateRole` mutation in `index.ts` passes directly to `mutations.role(id, role)` in `mutations.ts`. The guard must be placed in **`mutations.ts`** in the `role()` function, before `user.updateRole(role)` is called:

```typescript
const role = async (id: Id, role: UserRoles): Promise<UserDocument> => {
  if (role === UserRoles.Developer) throw new Error("Cannot assign Developer role");
  // ...existing logic
};
```

This prevents role escalation even via raw GraphQL requests from an Admin.

### Client (`client/src/utils/hasPermission.ts`)

Add `Developer` to `ROLE_WEIGHTS`. **This must be done in the same step as running `npm run codegen`** — if codegen runs first and `ROLE_WEIGHTS` is not updated, TypeScript will error on the missing key. If `ROLE_WEIGHTS` is updated before codegen, the `UserRoles.Developer` value won't exist yet and won't compile either. Do both changes together.

```typescript
const ROLE_WEIGHTS: Record<UserRoles, number> = {
  [UserRoles.Admin]: 3,
  [UserRoles.ProjectManager]: 2,
  [UserRoles.User]: 1,
  [UserRoles.Developer]: 4,
};
```

The `Permission` component and `hasPermission` utility require no other changes. A Developer user (weight 4) will pass every `hasPermission` check for Admin (3), PM (2), and User (1) — this is intentional, matching the server-side `role >= 3` change that gives Developer full admin access throughout the app.

### Role Dropdown

`Developer` is **not** added to the user role management dropdown in `client/src/components/Forms/User/Role.tsx`. It cannot be assigned through the app UI. Assignment is done directly in MongoDB only.

### GraphQL Codegen & Deployment Sequencing

Register the new enum value on the server so it flows through to generated client types. Deployment order matters:

1. Deploy the updated server (GraphQL schema now includes `Developer`)
2. Run `npm run codegen` on the client (generated types now include `Developer`)
3. Deploy the updated client

If the client is deployed before the server, the `UserRoles.Developer` comparison will never match (the value won't be in the token). The `currentUser` query already returns `role` (confirmed by existing role dropdown usage) — no query changes needed.

---

## Section 2: Ratings Review Page

### Route

`/developer` — a new Next.js page, separate from `/settings`, to keep developer tools isolated as more are added over time.

- **Client:** page checks `user.role === UserRoles.Developer`; redirects to home otherwise.
- **Server:** all developer endpoints are protected by a `requireDeveloper` middleware (see below).

### Express Auth for Developer Endpoints

The canonical auth middleware is `requireAuth` from `server/src/lib/authMiddleware.ts` — it extracts `userId` from the JWT. Role is not stored in the JWT payload, so a second `requireDeveloper` middleware is needed. Add it to `authMiddleware.ts` (alongside `requireAuth`, so future developer routers can import it from one place):

```typescript
export async function requireDeveloper(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await UserModel.findById(req.userId).lean();
  if (!user || user.role !== UserRoles.Developer) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
```

This adds one MongoDB lookup per developer request. Developer tools are low-frequency internal tooling, so this is acceptable.

All developer routes use both: `router.get("/ratings", requireAuth, requireDeveloper, handler)`.

### Data Model Changes

The current `ConversationMessageClass` stores `rating`, `ratingReasons`, and `ratingComment` but has no timestamp on the rating action. Add `ratedAt?: Date` to `ConversationMessageClass`:

- Set `ratedAt = new Date()` when `rating` is written (upvote or downvote)
- Clear `ratedAt = undefined` when rating is removed (`rating === null`)

The rater is always the conversation owner — conversations have a `user` ref on the parent document. No separate `ratedByUserId` on the message is needed; resolve it from the conversation at query time.

### Server Endpoint

`GET /api/developer/ratings`

Returns rated assistant messages across all conversations for this app instance. Pagination is **out of scope for the initial implementation** — the expected volume (one small construction company, low chat usage) is small enough that an unbounded query is acceptable. This can be revisited if data volume grows.

Response shape per item:

```typescript
{
  conversationId: string;
  context: string;              // jobsite or tender name
  contextType: "jobsite" | "tender";
  userMessage: string;          // the preceding user message (for context)
  assistantMessage: string;     // the rated assistant message
  rating: "up" | "down";
  reasons?: string[];
  comment?: string;
  ratedAt?: Date;
  ratedByUserId: string;        // from parent Conversation.user
  ratedByUserName: string;      // resolved from User collection
}
```

Supports query params: `rating` (`up`|`down`), `reason` (single reason code), `from`/`to` (ISO date strings).

**Query strategy:** Filter conversations with `{ "messages.rating": { $exists: true } }` then flatten rated messages from results. A sparse index on `messages.rating` should be added to the `conversations` collection to avoid a full collection scan as volume grows. Add this index in the same migration/deploy as the `ratedAt` schema change.

### Page Layout

**Summary bar (top)**
- Total rated messages
- Upvote count
- Downvote count
- Downvote reason breakdown (counts per reason code)

**Ratings table**
- Columns: date, context (jobsite/tender), rating, reasons, user
- Filterable by: rating type, downvote reason, date range
- Each row expandable to show:
  - The user message that prompted the response
  - The full assistant message
  - The comment (if any)

### Future Developer Tools

Additional developer tools would be added as sub-pages or tabs under `/developer`. The `requireDeveloper` middleware and client role gate handle access for all of them.

---

## Files Affected

| File | Change |
|------|--------|
| `server/src/typescript/user.ts` | Add `Developer = 4` to `UserRoles` |
| `server/src/utils/authChecker.ts` | Add `"DEVELOPER"` check; change `"ADMIN"` to `role >= 3` |
| `server/src/graphql/resolvers/user/mutations.ts` | Guard `role()` function against assigning `Developer` |
| `server/src/models/Conversation/schema/index.ts` | Add `ratedAt?: Date` to `ConversationMessageClass` |
| `server/src/router/conversations.ts` | Set/clear `ratedAt` when rating is written/removed |
| `server/src/lib/authMiddleware.ts` | Add `requireDeveloper` middleware |
| `server/src/router/developer.ts` | New Express router with `GET /ratings` |
| `server/src/app.ts` | Mount `/api/developer` router |
| `client/src/utils/hasPermission.ts` | Add `Developer: 4` to `ROLE_WEIGHTS` (same step as codegen) |
| `client/src/components/Forms/User/Role.tsx` | Confirm `Developer` not in dropdown (no change expected) |
| `client/src/pages/developer/index.tsx` | New `/developer` page (ratings review) |
| `client/src/components/pages/developer/RatingsReview.tsx` | Ratings review component |
| `client/src/generated/graphql.tsx` | Auto-updated via `npm run codegen` |
