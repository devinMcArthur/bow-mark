# Developer Role & Ratings Review Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Developer` user role (value 4) that gates a new `/developer` page containing a ratings review tool for inspecting chat message ratings.

**Architecture:** Server-side: extend the `UserRoles` enum, update the GraphQL auth checker, add a `requireDeveloper` Express middleware, add a `ratedAt` timestamp to rated messages, and expose a `GET /api/developer/ratings` endpoint. Client-side: run codegen to pick up the new enum value, update `hasPermission.ts`, and build a `/developer` page with a summary bar and filterable ratings table.

**Tech Stack:** TypeScript, Typegoose/Mongoose, Type-GraphQL, Express, Next.js 12, React, Chakra UI, supertest (tests)

**Spec:** `docs/superpowers/specs/2026-03-17-developer-role-and-ratings-review-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/typescript/user.ts` | Modify | Add `Developer = 4` to `UserRoles` enum |
| `server/src/utils/authChecker.ts` | Modify | Add `"DEVELOPER"` check; change `"ADMIN"` to `role >= 3` |
| `server/src/graphql/resolvers/user/mutations.ts` | Modify | Guard `role()` against assigning Developer |
| `server/src/models/Conversation/schema/index.ts` | Modify | Add `ratedAt?: Date` to `ConversationMessageClass` |
| `server/src/router/conversations.ts` | Modify | Set/clear `ratedAt` when rating is written/cleared |
| `server/src/lib/authMiddleware.ts` | Modify | Add `requireDeveloper` middleware |
| `server/src/testing/_ids.ts` | Modify | Add `developer_user` id |
| `server/src/testing/documents/users.ts` | Modify | Add `developer_user` seed document |
| `server/src/router/developer.ts` | Create | `GET /ratings` endpoint |
| `server/src/router/__tests__/developerRatings.test.ts` | Create | Integration tests for developer router |
| `server/src/app.ts` | Modify | Mount `/api/developer` router; add sparse index |
| `client/src/utils/hasPermission.ts` | Modify | Add `Developer: 4` to `ROLE_WEIGHTS` |
| `client/src/pages/developer/index.tsx` | Create | `/developer` page with role gate |
| `client/src/components/pages/developer/RatingsReview.tsx` | Create | Summary bar + filterable ratings table |
| `client/src/generated/graphql.tsx` | Auto-updated | Via `npm run codegen` in client/ |

---

## Chunk 1: Server Role Foundation

### Task 1: Add `Developer` to `UserRoles` and update auth checker

**Files:**
- Modify: `server/src/typescript/user.ts`
- Modify: `server/src/utils/authChecker.ts`

- [ ] **Step 1: Update the enum**

In `server/src/typescript/user.ts`, change:

```typescript
export enum UserRoles {
  User = 1, // Lowerest power in UserType
  ProjectManager = 2, // Highest power in UserType
  Admin = 3, // Type Independent, full power
  Developer = 4, // Developer-only tooling access
}
```

- [ ] **Step 2: Update the auth checker**

In `server/src/utils/authChecker.ts`, replace the body of the `if (context.user)` block:

```typescript
if (context.user) {
  const isDevelopment = process.env.NODE_ENV === "development";

  if (roles.includes("DEV") && isDevelopment && context.user) return true;

  if (roles.includes("DEVELOPER") && context.user.role === 4) return true;

  // >= 3 so Developer (4) also passes ADMIN checks
  if (roles.includes("ADMIN") && context.user.role >= 3) return true;

  if (roles.includes("PM") && context.user.role >= 2) return true;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd server && npm run build 2>&1 | head -30
```

Expected: no errors (warnings are OK)

- [ ] **Step 4: Commit**

```bash
git add server/src/typescript/user.ts server/src/utils/authChecker.ts
git commit -m "feat(auth): add Developer role (4) and DEVELOPER auth checker"
```

---

### Task 2: Guard `userUpdateRole` mutation against assigning Developer

**Files:**
- Modify: `server/src/graphql/resolvers/user/mutations.ts`

- [ ] **Step 1: Add the guard**

In `server/src/graphql/resolvers/user/mutations.ts`, update the `role` function (line ~92):

```typescript
const role = async (id: Id, role: UserRoles): Promise<UserDocument> => {
  if (role === UserRoles.Developer)
    throw new Error("Cannot assign Developer role");

  const user = await User.getById(id, { throwError: true });
  if (!user) throw new Error("Unable to find user");

  await user.updateRole(role);
  await user.save();

  return user;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npm run build 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add server/src/graphql/resolvers/user/mutations.ts
git commit -m "feat(auth): block Developer role assignment via userUpdateRole mutation"
```

---

### Task 3: Add `ratedAt` to `ConversationMessageClass` and update rating endpoint

**Files:**
- Modify: `server/src/models/Conversation/schema/index.ts`
- Modify: `server/src/router/conversations.ts`
- Test: `server/src/router/__tests__/conversationRating.test.ts`

- [ ] **Step 1: Add `ratedAt` to the schema**

In `server/src/models/Conversation/schema/index.ts`, add after `ratingComment`:

```typescript
  @Field({ nullable: true })
  @prop()
  public ratingComment?: string;

  @Field({ nullable: true })
  @prop()
  public ratedAt?: Date;
```

- [ ] **Step 2: Write failing tests for `ratedAt`**

Open `server/src/router/__tests__/conversationRating.test.ts`. Add these tests inside the existing `describe("PATCH /api/conversations/:id/messages/:msgId/rating")` block, after the existing tests:

```typescript
describe("ratedAt timestamp", () => {
  it("sets ratedAt when upvoting", async () => {
    const before = new Date();
    await request(app)
      .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
      .set("Authorization", token)
      .send({ rating: "up" });
    const convo = await Conversation.findById(conversationId).lean();
    const msg = (convo!.messages as any[]).find(
      (m) => m._id.toString() === assistantMsgId
    );
    expect(msg.ratedAt).toBeDefined();
    expect(new Date(msg.ratedAt).getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("sets ratedAt when downvoting", async () => {
    const before = new Date();
    await request(app)
      .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
      .set("Authorization", token)
      .send({ rating: "down", reasons: ["too_vague"] });
    const convo = await Conversation.findById(conversationId).lean();
    const msg = (convo!.messages as any[]).find(
      (m) => m._id.toString() === assistantMsgId
    );
    expect(msg.ratedAt).toBeDefined();
    expect(new Date(msg.ratedAt).getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("clears ratedAt when rating is null", async () => {
    // First upvote to set ratedAt
    await request(app)
      .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
      .set("Authorization", token)
      .send({ rating: "up" });
    // Then clear
    await request(app)
      .patch(`/api/conversations/${conversationId}/messages/${assistantMsgId}/rating`)
      .set("Authorization", token)
      .send({ rating: null });
    const convo = await Conversation.findById(conversationId).lean();
    const msg = (convo!.messages as any[]).find(
      (m) => m._id.toString() === assistantMsgId
    );
    expect(msg.ratedAt).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd server && npm run test -- src/router/__tests__/conversationRating.test.ts 2>&1 | tail -20
```

Expected: `ratedAt` tests FAIL — `ratedAt` is undefined

- [ ] **Step 4: Update the rating endpoint to set/clear `ratedAt`**

In `server/src/router/conversations.ts`, update the rating assignment block (lines ~310-322):

```typescript
    if (rating === null) {
      msgs[msgIdx].rating = undefined;
      msgs[msgIdx].ratingReasons = undefined;
      msgs[msgIdx].ratingComment = undefined;
      msgs[msgIdx].ratedAt = undefined;
    } else if (rating === "up") {
      msgs[msgIdx].rating = "up";
      msgs[msgIdx].ratingReasons = undefined;
      msgs[msgIdx].ratingComment = undefined;
      msgs[msgIdx].ratedAt = new Date();
    } else {
      msgs[msgIdx].rating = "down";
      msgs[msgIdx].ratingReasons = reasons;
      msgs[msgIdx].ratingComment = comment || undefined;
      msgs[msgIdx].ratedAt = new Date();
    }
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd server && npm run test -- src/router/__tests__/conversationRating.test.ts 2>&1 | tail -20
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/models/Conversation/schema/index.ts \
        server/src/router/conversations.ts \
        server/src/router/__tests__/conversationRating.test.ts
git commit -m "feat(ratings): add ratedAt timestamp to ConversationMessageClass"
```

---

## Chunk 2: Developer API

### Task 4: Add seed developer user (needed for tests)

**Files:**
- Modify: `server/src/testing/_ids.ts`
- Modify: `server/src/testing/documents/users.ts`

- [ ] **Step 1: Add developer user id to `_ids.ts`**

In `server/src/testing/_ids.ts`, add to the `users` object:

```typescript
users: {
  base_foreman_1_user: {
    _id: Types.ObjectId("621680482564b66de7083a1b"),
  },
  admin_user: {
    _id: Types.ObjectId("6241f81d8b757d1c8ae18b13"),
  },
  developer_user: {
    _id: Types.ObjectId("6241f81d8b757d1c8ae18b99"),
  },
},
```

- [ ] **Step 2: Add developer user to seed**

In `server/src/testing/documents/users.ts`, add after `admin_user`:

```typescript
export interface SeededUsers {
  base_foreman_1_user: UserDocument;
  admin_user: UserDocument;
  developer_user: UserDocument;
}

// In createUsers():
const developer_user = new User({
  _id: _ids.users.developer_user._id,
  name: "Developer User",
  email: "developer@bowmark.ca",
  password: await hashPassword("password"),
  employee: _ids.employees.office_admin._id,
  role: UserRoles.Developer,
});
```

And include it in the returned object and the save loop.

- [ ] **Step 3: Verify build**

```bash
cd server && npm run build 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add server/src/testing/_ids.ts server/src/testing/documents/users.ts
git commit -m "test: add developer_user to seed database"
```

---

### Task 5: Add `requireDeveloper` middleware and create developer router

**Files:**
- Modify: `server/src/lib/authMiddleware.ts`
- Create: `server/src/router/developer.ts`
- Modify: `server/src/app.ts`
- Create: `server/src/router/__tests__/developerRatings.test.ts`

- [ ] **Step 1: Write failing tests for the developer router**

Create `server/src/router/__tests__/developerRatings.test.ts`:

```typescript
import request from "supertest";
import { prepareDatabase, disconnectAndStopServer } from "@testing/jestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import createApp from "../../app";
import { Conversation, Jobsite } from "@models";
import jestLogin from "@testing/jestLogin";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "http";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

let mongoServer: MongoMemoryServer;
let documents: SeededDatabase;
let app: Server;
let adminToken: string;
let developerToken: string;
let conversationId: string;
let assistantMsgId: string;

beforeAll(async () => {
  mongoServer = await prepareDatabase();
  app = await createApp();
  documents = await seedDatabase();
  adminToken = await jestLogin(app, "admin@bowmark.ca");
  developerToken = await jestLogin(app, "developer@bowmark.ca");

  // Create a conversation with a rated message
  const jobsite = documents.jobsites.jobsite_1;
  const convo = new Conversation({
    user: documents.users.developer_user._id,
    jobsiteId: jobsite._id,
    title: "Test conversation",
    aiModel: "claude-sonnet-4-6",
    messages: [
      { role: "user", content: "What is the ramp slope?" },
      {
        role: "assistant",
        content: "The slope is 8.3%.",
        rating: "up",
        ratedAt: new Date(),
      },
    ],
  });
  await convo.save();
  conversationId = convo._id.toString();
  assistantMsgId = (convo.messages[1] as any)._id.toString();
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});

describe("GET /api/developer/ratings", () => {
  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/api/developer/ratings");
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-developer user (Admin)", async () => {
    const res = await request(app)
      .get("/api/developer/ratings")
      .set("Authorization", adminToken);
    expect(res.status).toBe(403);
  });

  it("returns 200 and rated messages for developer user", async () => {
    const res = await request(app)
      .get("/api/developer/ratings")
      .set("Authorization", developerToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const item = res.body[0];
    expect(item).toHaveProperty("conversationId");
    expect(item).toHaveProperty("rating");
    expect(item).toHaveProperty("assistantMessage");
    expect(item).toHaveProperty("userMessage");
    expect(item).toHaveProperty("contextType");
  });

  it("filters by rating=up", async () => {
    const res = await request(app)
      .get("/api/developer/ratings?rating=up")
      .set("Authorization", developerToken);
    expect(res.status).toBe(200);
    expect(res.body.every((r: any) => r.rating === "up")).toBe(true);
  });

  it("filters by rating=down returns empty when no downvotes exist", async () => {
    const res = await request(app)
      .get("/api/developer/ratings?rating=down")
      .set("Authorization", developerToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && npm run test -- src/router/__tests__/developerRatings.test.ts 2>&1 | tail -20
```

Expected: FAIL — `/api/developer/ratings` route does not exist (404 or similar)

- [ ] **Step 3: Add `requireDeveloper` to `authMiddleware.ts`**

In `server/src/lib/authMiddleware.ts`, add after the existing `requireAuth` function:

```typescript
import { User } from "@models";
import { UserRoles } from "@typescript/user";

export async function requireDeveloper(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = await User.findById(req.userId).lean();
  if (!user || user.role !== UserRoles.Developer) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
```

> Note: `Request`, `Response`, `NextFunction` are already imported from `express` at the top of this file.

- [ ] **Step 4: Create the developer router**

Create `server/src/router/developer.ts`:

```typescript
import { Router } from "express";
import mongoose from "mongoose";
import { Conversation, User } from "@models";
import { requireAuth, requireDeveloper } from "@lib/authMiddleware";

const router = Router();

// GET /api/developer/ratings
// Returns all rated assistant messages across all conversations.
router.get("/ratings", requireAuth, requireDeveloper, async (req: any, res) => {
  try {
    const { rating, reason, from, to } = req.query as {
      rating?: "up" | "down";
      reason?: string;
      from?: string;
      to?: string;
    };

    const convos = await Conversation.find({
      "messages.rating": { $exists: true },
    })
      .populate("user", "name")
      .populate("jobsiteId", "name")
      .populate("tenderId", "name")
      .lean();

    const results: any[] = [];

    for (const convo of convos) {
      const messages = convo.messages as any[];

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (!msg.rating) continue;

        // Apply filters
        if (rating && msg.rating !== rating) continue;
        if (reason && (!msg.ratingReasons || !msg.ratingReasons.includes(reason))) continue;
        if (from && msg.ratedAt && new Date(msg.ratedAt) < new Date(from)) continue;
        if (to && msg.ratedAt && new Date(msg.ratedAt) > new Date(to)) continue;

        // Find preceding user message for context
        const userMessage = messages
          .slice(0, i)
          .reverse()
          .find((m) => m.role === "user");

        const contextType = convo.jobsiteId
          ? "jobsite"
          : convo.tenderId
          ? "tender"
          : null;

        const context = convo.jobsiteId
          ? (convo.jobsiteId as any).name
          : convo.tenderId
          ? (convo.tenderId as any).name
          : "Unknown";

        const ratedByUser = convo.user as any;

        results.push({
          conversationId: convo._id.toString(),
          context,
          contextType,
          userMessage: userMessage?.content ?? "",
          assistantMessage: msg.content,
          rating: msg.rating,
          reasons: msg.ratingReasons,
          comment: msg.ratingComment,
          ratedAt: msg.ratedAt,
          ratedByUserId: ratedByUser?._id?.toString() ?? "",
          ratedByUserName: ratedByUser?.name ?? "",
        });
      }
    }

    // Sort newest first
    results.sort((a, b) => {
      if (!a.ratedAt) return 1;
      if (!b.ratedAt) return -1;
      return new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime();
    });

    res.json(results);
  } catch (err) {
    console.error("GET /developer/ratings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
```

- [ ] **Step 5: Mount the router and add the sparse index in `app.ts`**

In `server/src/app.ts`, add the import at the top with the other router imports:

```typescript
import developerRouter from "./router/developer";
```

Add the route mount after the other `/api` routes (before `apolloServer.start()`):

```typescript
app.use("/api/developer", developerRouter);
```

Add the sparse index creation after the route mounts:

```typescript
// Sparse index for developer ratings query — non-blocking, safe to re-run
Conversation.collection
  .createIndex({ "messages.rating": 1 }, { sparse: true, background: true })
  .catch((err) => console.warn("Conversation ratings index:", err.message));
```

> `Conversation` is already imported in `app.ts` via `@models` — check the import and add it if not present.

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd server && npm run test -- src/router/__tests__/developerRatings.test.ts 2>&1 | tail -30
```

Expected: all tests PASS

- [ ] **Step 7: Verify full server build**

```bash
cd server && npm run build 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add server/src/lib/authMiddleware.ts \
        server/src/router/developer.ts \
        server/src/router/__tests__/developerRatings.test.ts \
        server/src/app.ts
git commit -m "feat(developer): add requireDeveloper middleware and GET /api/developer/ratings endpoint"
```

---

## Chunk 3: Client

### Task 6: Run codegen and update `hasPermission.ts`

**Files:**
- Modify: `client/src/utils/hasPermission.ts`
- Auto-updated: `client/src/generated/graphql.tsx`

> **Prerequisite:** The server must be running (or the GraphQL schema file must be accessible) for codegen to pick up the new `Developer` enum value. If running locally with Tilt, the server will have the new enum after the Task 1 deploy. If running codegen against a schema file, ensure the server source has been updated.

- [ ] **Step 1: Run codegen**

```bash
cd client && npm run codegen 2>&1 | tail -20
```

Expected: completes without error; `UserRoles.Developer` now appears in `client/src/generated/graphql.tsx`

- [ ] **Step 2: Verify `Developer` is in the generated enum**

```bash
grep "Developer" client/src/generated/graphql.tsx
```

Expected: `Developer = 'Developer'` (or similar string value)

- [ ] **Step 3: Update `hasPermission.ts`**

In `client/src/utils/hasPermission.ts`, add `Developer` to `ROLE_WEIGHTS`:

```typescript
const ROLE_WEIGHTS: Record<UserRoles, number> = {
  [UserRoles.Admin]: 3,
  [UserRoles.ProjectManager]: 2,
  [UserRoles.User]: 1,
  [UserRoles.Developer]: 4,
};
```

- [ ] **Step 4: Run TypeScript check**

```bash
cd client && npm run type-check 2>&1 | tail -20
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add client/src/generated/graphql.tsx client/src/utils/hasPermission.ts
git commit -m "feat(client): add Developer role weight; update generated GraphQL types"
```

---

### Task 7: Create `/developer` page and `RatingsReview` component

**Files:**
- Create: `client/src/pages/developer/index.tsx`
- Create: `client/src/components/pages/developer/RatingsReview.tsx`

- [ ] **Step 1: Create the `RatingsReview` component**

Create `client/src/components/pages/developer/RatingsReview.tsx`:

```typescript
import React from "react";
import {
  Box,
  Flex,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Select,
  Text,
  Spinner,
  HStack,
  Input,
} from "@chakra-ui/react";
import { localStorageTokenKey } from "../../../contexts/Auth";

interface RatingItem {
  conversationId: string;
  context: string;
  contextType: "jobsite" | "tender" | null;
  userMessage: string;
  assistantMessage: string;
  rating: "up" | "down";
  reasons?: string[];
  comment?: string;
  ratedAt?: string;
  ratedByUserName: string;
}

const REASON_LABELS: Record<string, string> = {
  wrong_answer: "Wrong answer",
  hallucinated_citation: "Hallucinated citation",
  couldnt_find_it: "Couldn't find it",
  wrong_document: "Wrong document",
  too_vague: "Too vague",
  misunderstood_question: "Misunderstood question",
};

const serverBase = (process.env.NEXT_PUBLIC_API_URL as string).replace("/graphql", "");

const RatingsReview: React.FC = () => {
  const [items, setItems] = React.useState<RatingItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [ratingFilter, setRatingFilter] = React.useState<"" | "up" | "down">("");
  const [reasonFilter, setReasonFilter] = React.useState("");
  const [fromFilter, setFromFilter] = React.useState("");
  const [toFilter, setToFilter] = React.useState("");

  // Expanded row tracking
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchRatings = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (ratingFilter) params.set("rating", ratingFilter);
        if (reasonFilter) params.set("reason", reasonFilter);
        if (fromFilter) params.set("from", fromFilter);
        if (toFilter) params.set("to", toFilter);

        const token =
          typeof window !== "undefined"
            ? localStorage.getItem(localStorageTokenKey)
            : null;

        const res = await fetch(
          `${serverBase}/api/developer/ratings?${params.toString()}`,
          { headers: { Authorization: token ?? "" } }
        );
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        setItems(await res.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRatings();
  }, [ratingFilter, reasonFilter, fromFilter, toFilter]);

  const upvotes = items.filter((i) => i.rating === "up").length;
  const downvotes = items.filter((i) => i.rating === "down").length;

  const reasonCounts = items
    .flatMap((i) => i.reasons ?? [])
    .reduce<Record<string, number>>((acc, r) => {
      acc[r] = (acc[r] ?? 0) + 1;
      return acc;
    }, {});

  return (
    <Box>
      <Heading size="md" mb={4}>
        Chat Ratings
      </Heading>

      {/* Summary bar */}
      <SimpleGrid columns={[2, 4]} spacing={4} mb={6}>
        <Stat>
          <StatLabel>Total</StatLabel>
          <StatNumber>{items.length}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Upvotes</StatLabel>
          <StatNumber color="green.500">{upvotes}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Downvotes</StatLabel>
          <StatNumber color="red.500">{downvotes}</StatNumber>
        </Stat>
        {Object.entries(reasonCounts).map(([reason, count]) => (
          <Stat key={reason}>
            <StatLabel fontSize="xs">{REASON_LABELS[reason] ?? reason}</StatLabel>
            <StatNumber>{count}</StatNumber>
          </Stat>
        ))}
      </SimpleGrid>

      {/* Filters */}
      <HStack mb={4} flexWrap="wrap" spacing={3}>
        <Select
          size="sm"
          w="160px"
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value as any)}
          placeholder="All ratings"
        >
          <option value="up">Upvotes</option>
          <option value="down">Downvotes</option>
        </Select>
        <Select
          size="sm"
          w="200px"
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          placeholder="All reasons"
        >
          {Object.entries(REASON_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          size="sm"
          type="date"
          w="160px"
          value={fromFilter}
          onChange={(e) => setFromFilter(e.target.value)}
          placeholder="From"
        />
        <Input
          size="sm"
          type="date"
          w="160px"
          value={toFilter}
          onChange={(e) => setToFilter(e.target.value)}
          placeholder="To"
        />
      </HStack>

      {loading && <Spinner />}
      {error && <Text color="red.500">{error}</Text>}

      {!loading && !error && (
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Date</Th>
              <Th>Context</Th>
              <Th>Rating</Th>
              <Th>Reasons</Th>
              <Th>User</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map((item) => {
              const rowKey = `${item.conversationId}-${item.assistantMessage.slice(0, 20)}`;
              const isExpanded = expandedId === rowKey;
              return (
                <React.Fragment key={rowKey}>
                  <Tr
                    cursor="pointer"
                    _hover={{ bg: "gray.50" }}
                    onClick={() => setExpandedId(isExpanded ? null : rowKey)}
                  >
                    <Td whiteSpace="nowrap" fontSize="xs" color="gray.500">
                      {item.ratedAt
                        ? new Date(item.ratedAt).toLocaleDateString()
                        : "—"}
                    </Td>
                    <Td>
                      <Text fontSize="sm">{item.context}</Text>
                      {item.contextType && (
                        <Badge fontSize="xs" colorScheme="gray">
                          {item.contextType}
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <Badge colorScheme={item.rating === "up" ? "green" : "red"}>
                        {item.rating === "up" ? "👍" : "👎"}
                      </Badge>
                    </Td>
                    <Td>
                      <Flex flexWrap="wrap" gap={1}>
                        {(item.reasons ?? []).map((r) => (
                          <Badge key={r} fontSize="xs" colorScheme="orange">
                            {REASON_LABELS[r] ?? r}
                          </Badge>
                        ))}
                      </Flex>
                    </Td>
                    <Td fontSize="sm">{item.ratedByUserName}</Td>
                  </Tr>
                  {isExpanded && (
                    <Tr>
                      <Td colSpan={5} bg="gray.50" px={6} py={4}>
                        <Box mb={2}>
                          <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                            USER
                          </Text>
                          <Text fontSize="sm">{item.userMessage || "—"}</Text>
                        </Box>
                        <Box mb={item.comment ? 2 : 0}>
                          <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                            ASSISTANT
                          </Text>
                          <Text fontSize="sm" whiteSpace="pre-wrap">
                            {item.assistantMessage}
                          </Text>
                        </Box>
                        {item.comment && (
                          <Box>
                            <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                              COMMENT
                            </Text>
                            <Text fontSize="sm" fontStyle="italic">
                              {item.comment}
                            </Text>
                          </Box>
                        )}
                      </Td>
                    </Tr>
                  )}
                </React.Fragment>
              );
            })}
            {items.length === 0 && (
              <Tr>
                <Td colSpan={5} textAlign="center" color="gray.400" py={8}>
                  No ratings found
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      )}
    </Box>
  );
};

export default RatingsReview;
```

- [ ] **Step 2: Create the `/developer` page**

Create `client/src/pages/developer/index.tsx`:

```typescript
import { Flex, Heading, Icon } from "@chakra-ui/react";
import { useRouter } from "next/router";
import React from "react";
import { FiTool } from "react-icons/fi";
import ClientOnly from "../../components/Common/ClientOnly";
import Container from "../../components/Common/Container";
import RatingsReview from "../../components/pages/developer/RatingsReview";
import { useAuth } from "../../contexts/Auth";
import { UserRoles } from "../../generated/graphql";

const DeveloperPage: React.FC = () => {
  const { state: { user } } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    // user === undefined means still loading; null means not logged in
    if (user === null) {
      router.replace("/");
    } else if (user !== undefined && user.role !== UserRoles.Developer) {
      router.replace("/");
    }
  }, [user, router]);

  // Show nothing while auth resolves or redirecting
  if (!user || user.role !== UserRoles.Developer) return null;

  return (
    <Container>
      <Flex flexDir="row" w="auto" gap={2} mb={6}>
        <Icon my="auto" as={FiTool} />
        <Heading size="sm" color="gray.600">
          Developer Tools
        </Heading>
      </Flex>
      <ClientOnly>
        <RatingsReview />
      </ClientOnly>
    </Container>
  );
};

export default DeveloperPage;
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd client && npm run type-check 2>&1 | tail -30
```

Expected: no errors

- [ ] **Step 4: Run lint**

```bash
cd client && npm run lint 2>&1 | tail -20
```

Expected: no errors (fix any that appear)

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/developer/index.tsx \
        client/src/components/pages/developer/RatingsReview.tsx
git commit -m "feat(developer): add /developer page with ratings review UI"
```

---

## Deployment Checklist

When deploying to production, follow this order to avoid type mismatches:

1. **Deploy server first** — the GraphQL schema will now include `Developer` in `UserRoles`
2. **Run `npm run codegen` in `client/`** — picks up the new enum value
3. **Deploy client** — the `UserRoles.Developer` comparison now matches

Assign the Developer role directly in MongoDB (never via the UI):

```javascript
// In MongoDB shell or Atlas:
db.users.updateOne(
  { email: "your-email@bowmark.ca" },
  { $set: { role: 4 } }
)
```
