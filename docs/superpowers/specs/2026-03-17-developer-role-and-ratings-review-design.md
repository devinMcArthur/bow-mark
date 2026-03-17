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

1. Change the `"ADMIN"` check from `role === 3` to `role >= 3` so Developer inherits all admin access.
2. Add a `"DEVELOPER"` check: `role === 4` — used to gate developer-only endpoints and resolvers.

```typescript
if (roles.includes("DEVELOPER") && context.user.role === 4) return true;
if (roles.includes("ADMIN") && context.user.role >= 3) return true;
if (roles.includes("PM") && context.user.role >= 2) return true;
```

The existing `"DEV"` env-based check (`NODE_ENV === "development"`) is left unchanged — it's a separate escape hatch for local development only.

### Server-Side Role Assignment Guard

The `userUpdateRole` mutation (`@Authorized(["ADMIN", "DEV"])`) must validate that the requested role value is not `Developer = 4`. This prevents a raw GraphQL request from escalating any user to Developer, even if the caller is an Admin.

### Client (`client/src/utils/hasPermission.ts`)

Add `Developer` to `ROLE_WEIGHTS`:

```typescript
const ROLE_WEIGHTS: Record<UserRoles, number> = {
  [UserRoles.Admin]: 3,
  [UserRoles.ProjectManager]: 2,
  [UserRoles.User]: 1,
  [UserRoles.Developer]: 4,
};
```

The `Permission` component and `hasPermission` utility require no other changes — the weight-based comparison handles Developer automatically.

### Role Dropdown

`Developer` is **not** added to the user role management dropdown in the client. It cannot be assigned through the app UI. Assignment is done directly in MongoDB only.

### GraphQL Codegen

Register the new enum value on the server so it flows through to generated client types after `npm run codegen`.

---

## Section 2: Ratings Review Page

### Route

`/developer` — a new Next.js page, separate from `/settings`, to keep developer tools isolated as more are added over time.

Access control:
- **Client:** page checks `user.role === UserRoles.Developer`; redirects to home otherwise.
- **Server:** all developer endpoints require `@Authorized(["DEVELOPER"])` / `"DEVELOPER"` JWT check; return 403 otherwise.

### Server Endpoint

`GET /api/developer/ratings`

Returns rated assistant messages across all conversations for this app instance. Response shape per item:

```typescript
{
  conversationId: string;
  context: string;           // e.g. jobsite name or tender name
  contextType: "jobsite" | "tender" | "other";
  userMessage: string;       // the preceding user message (for context)
  assistantMessage: string;  // the rated assistant message
  rating: "up" | "down";
  reasons?: string[];        // downvote reasons
  comment?: string;
  ratedAt: Date;
  ratedByUserId: string;
  ratedByUserName: string;
}
```

Supports query params: `rating` (`up`|`down`), `reason` (single reason code), `from`/`to` (ISO date strings).

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

Additional developer tools (e.g. cross-app logging, system diagnostics) would be added as sub-pages or tabs under `/developer`. The role gate on the page/layout handles access for all of them.

---

## Files Affected

| File | Change |
|------|--------|
| `server/src/typescript/user.ts` | Add `Developer = 4` to `UserRoles` |
| `server/src/utils/authChecker.ts` | Add `"DEVELOPER"` check; change `"ADMIN"` to `role >= 3` |
| `server/src/graphql/resolvers/user/index.ts` | Guard `userUpdateRole` against assigning `Developer` role |
| `server/src/router/developer.ts` | New Express router for developer endpoints |
| `server/src/router/index.ts` | Mount `/api/developer` router |
| `client/src/utils/hasPermission.ts` | Add `Developer: 4` to `ROLE_WEIGHTS` |
| `client/src/components/Forms/User/Role.tsx` | Ensure `Developer` is not in role dropdown |
| `client/src/pages/developer/index.tsx` | New `/developer` page (ratings review) |
| `client/src/components/pages/developer/RatingsReview.tsx` | Ratings review component |
| `client/src/generated/graphql.tsx` | Auto-updated via `npm run codegen` |
