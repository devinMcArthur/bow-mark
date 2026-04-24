# Concurrency + Event Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the cross-cutting primitives the unified file system (and eventual retrofits) depend on: W3C-compatible request context, per-entity optimistic concurrency (`EntityVersion`), an append-only `DomainEvent` log committed in the same MongoDB transaction as state writes, plus change-stream / GraphQL-subscription / presence layers on top.

**Architecture:** AsyncLocalStorage propagates a request context carrying `traceId`/`spanId`/`userId`/`sessionId`/`correlationId`. Mutations that modify state use `eventfulMutation()` which opens a MongoDB transaction, runs the caller's `findOneAndUpdate` with a `version` precondition, and writes a `DomainEvent` (JSON-Patch forward + inverse diff) in the same transaction — so state and audit record commit or fail together. MongoDB change streams tail `DomainEvents` for server-internal consumers; a thin GraphQL subscription wraps the same stream for clients. `EntityPresence` is a parallel in-memory primitive for "who's here" UX.

**Tech Stack:**
- Node 20 + `async_hooks.AsyncLocalStorage` (built in)
- Mongoose 5.10 + MongoDB 6 replica set (Atlas in prod; testcontainers single-node RS in tests — transactions supported in both)
- `fast-json-patch` (RFC 6902 forward + inverse)
- `type-graphql` 1.1 + `graphql-subscriptions` 1.2 + `graphql-ws` 5.7 (already in use)
- `vitest` 2 + `supertest` (existing test pattern)

**Phase scope (what this plan does NOT do):**
- Does not touch `FileNode` or any user-facing file feature — that is Plan 2.
- Does not retrofit concurrency onto Tender / DailyReport / Jobsite — explicitly deferred per user request.
- Does not build a client audit UI — the GraphQL subscription is exposed, but no page consumes it yet.
- Does not implement sampling, rollup, or cold-storage archival for events — full retention for now.

**Test strategy:** Every primitive gets unit tests where possible and a vitest integration test that spins up the real MongoDB replica set (testcontainers, already wired in `vitestGlobalSetup.ts`). A single end-to-end smoke test exercises context → version check → event emission → change-stream delivery → GraphQL subscription delivery, using a temporary `ScratchNote` model that is deleted at the end of the plan.

---

## File Structure

### New server files (created)

| Path | Responsibility |
|---|---|
| `server/src/lib/requestContext/index.ts` | Barrel re-exporting public API |
| `server/src/lib/requestContext/types.ts` | `RequestContext` interface |
| `server/src/lib/requestContext/als.ts` | AsyncLocalStorage instance + `run`/`get`/`withChildSpan` |
| `server/src/lib/requestContext/traceparent.ts` | W3C Trace Context parse/format + random IDs |
| `server/src/lib/requestContext/__tests__/als.test.ts` | Unit tests for ALS helpers |
| `server/src/lib/requestContext/__tests__/traceparent.test.ts` | Unit tests for header parsing |
| `server/src/middleware/requestContext.ts` | Express middleware stamping context per request |
| `server/src/middleware/__tests__/requestContext.test.ts` | Integration test via supertest |
| `server/src/lib/entityVersion/index.ts` | `versioned` Mongoose plugin + `StaleVersionError` |
| `server/src/lib/entityVersion/__tests__/versioned.test.ts` | Plugin unit tests on a fixture model |
| `server/src/lib/jsonPatch/index.ts` | Thin wrapper around `fast-json-patch`: `computeForward`, `computeInverse`, `applyPatch` |
| `server/src/lib/jsonPatch/__tests__/jsonPatch.test.ts` | Unit tests for diff/apply/roundtrip |
| `server/src/models/DomainEvent/schema/index.ts` | Raw Mongoose schema for `DomainEvent` |
| `server/src/models/DomainEvent/index.ts` | Model export + type |
| `server/src/models/DomainEvent/__tests__/schema.test.ts` | Schema/index tests |
| `server/src/lib/eventfulMutation/index.ts` | Transaction-wrapped mutation helper |
| `server/src/lib/eventfulMutation/__tests__/eventfulMutation.test.ts` | Integration test with ScratchNote |
| `server/src/lib/domainEventStream/index.ts` | Change-stream AsyncIterator wrapper |
| `server/src/lib/domainEventStream/__tests__/domainEventStream.test.ts` | Integration test |
| `server/src/graphql/resolvers/domainEvent/index.ts` | `domainEvent` subscription resolver |
| `server/src/graphql/resolvers/domainEvent/types.ts` | GraphQL ObjectType for `DomainEvent` |
| `server/src/lib/entityPresence/index.ts` | In-memory TTL map + pub/sub |
| `server/src/lib/entityPresence/__tests__/entityPresence.test.ts` | Unit tests |
| `server/src/graphql/resolvers/entityPresence/index.ts` | `entityPresence` subscription + `presenceHeartbeat` mutation |
| `server/src/models/ScratchNote/schema/index.ts` | **Temporary** fixture model — deleted at end of plan |
| `server/src/models/ScratchNote/index.ts` | **Temporary** model export |
| `server/src/__tests__/foundation.e2e.test.ts` | End-to-end smoke test across all primitives |

### Modified server files

| Path | Change |
|---|---|
| `server/package.json` | Add `fast-json-patch` dependency |
| `server/src/app.ts` | Install `requestContextMiddleware` before GraphQL; register `DomainEventResolver` + `EntityPresenceResolver`; thread context into Apollo `context` fn |
| `server/src/mcp/context.ts` | Re-export from `@lib/requestContext` for compatibility (keeps existing call sites working) |
| `server/src/models/User/class/create.ts` (or wherever JWT is issued) | Include `sessionId` claim on token create |
| `server/tsconfig.json` | Add `@lib/*` and `@middleware/*` path aliases |

### Client files (scoped to propagation only)

| Path | Change |
|---|---|
| `client/src/lib/traceparent.ts` (new) | Read `traceparent` response header, store, inject into next request |
| `client/src/apollo.ts` (or equivalent Apollo Client setup) | Wire traceparent link into chain |

Client subscription integration (Apollo hooks consuming `domainEvent` / `entityPresence`) is intentionally left out of Plan 1 — there's no UI consumer yet. Plan 2 wires them up for the file system.

---

## Task A1: Path alias scaffolding

**Files:**
- Modify: `server/tsconfig.json`

- [ ] **Step 1: Add `@lib/*` and `@middleware/*` aliases**

Edit `server/tsconfig.json`, inside `compilerOptions.paths`, add entries:

```json
      "@lib/*": [
        "./lib/*"
      ],
      "@middleware/*": [
        "./middleware/*"
      ],
```

- [ ] **Step 2: Verify TypeScript still compiles**

Run: `cd server && npm run build -- --noEmit` (or `npx tsc --noEmit` if the script isn't present).
Expected: no errors. If it fails, check that the new alias entries sit inside the existing `paths` object.

- [ ] **Step 3: Commit**

```bash
git add server/tsconfig.json
git commit -m "chore(server): add @lib and @middleware path aliases"
```

---

## Task A2: Traceparent parse/format + random ID helpers

**Files:**
- Create: `server/src/lib/requestContext/traceparent.ts`
- Test: `server/src/lib/requestContext/__tests__/traceparent.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/src/lib/requestContext/__tests__/traceparent.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  randomTraceId,
  randomSpanId,
  parseTraceparent,
  formatTraceparent,
  TRACEPARENT_VERSION,
} from "../traceparent";

describe("traceparent", () => {
  it("randomTraceId returns 32 hex chars (16 bytes)", () => {
    const id = randomTraceId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("randomSpanId returns 16 hex chars (8 bytes)", () => {
    const id = randomSpanId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it("formatTraceparent produces canonical W3C format", () => {
    const out = formatTraceparent({
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      spanId: "00f067aa0ba902b7",
    });
    expect(out).toBe(
      `${TRACEPARENT_VERSION}-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`
    );
  });

  it("parseTraceparent roundtrips a valid header", () => {
    const header =
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    const parsed = parseTraceparent(header);
    expect(parsed).toEqual({
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      spanId: "00f067aa0ba902b7",
    });
  });

  it("parseTraceparent returns null for malformed input", () => {
    expect(parseTraceparent("")).toBeNull();
    expect(parseTraceparent("not-a-header")).toBeNull();
    expect(parseTraceparent("00-short-00f067aa0ba902b7-01")).toBeNull();
    expect(parseTraceparent("99-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")).toBeNull();
  });

  it("parseTraceparent rejects all-zero trace or span ids", () => {
    expect(
      parseTraceparent("00-00000000000000000000000000000000-00f067aa0ba902b7-01")
    ).toBeNull();
    expect(
      parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01")
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd server && npx vitest run src/lib/requestContext/__tests__/traceparent.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `traceparent.ts`**

Create `server/src/lib/requestContext/traceparent.ts`:

```ts
import { randomBytes } from "crypto";

/**
 * W3C Trace Context version. We only support version 00 (the only one
 * defined at the time of writing). If we ever see a newer version header
 * on an inbound request, we fall through to starting a fresh trace.
 */
export const TRACEPARENT_VERSION = "00";

const TRACE_ID_BYTES = 16;
const SPAN_ID_BYTES = 8;
const TRACE_ID_HEX = TRACE_ID_BYTES * 2;
const SPAN_ID_HEX = SPAN_ID_BYTES * 2;
const TRACE_ID_ZERO = "0".repeat(TRACE_ID_HEX);
const SPAN_ID_ZERO = "0".repeat(SPAN_ID_HEX);

export function randomTraceId(): string {
  return randomBytes(TRACE_ID_BYTES).toString("hex");
}

export function randomSpanId(): string {
  return randomBytes(SPAN_ID_BYTES).toString("hex");
}

export interface TraceparentFields {
  traceId: string;
  spanId: string;
}

/**
 * Format a W3C Trace Context `traceparent` header value.
 * We always set the `sampled` flag to 01 — sampling is a concern of a
 * future OTel adoption, not of this primitive.
 */
export function formatTraceparent(fields: TraceparentFields): string {
  return `${TRACEPARENT_VERSION}-${fields.traceId}-${fields.spanId}-01`;
}

/**
 * Parse a W3C Trace Context `traceparent` header. Returns null if the
 * header is missing, malformed, uses an unsupported version, or carries
 * the all-zero trace/span IDs defined as invalid by the W3C spec.
 */
export function parseTraceparent(
  header: string | undefined | null
): TraceparentFields | null {
  if (!header) return null;
  const parts = header.split("-");
  if (parts.length !== 4) return null;
  const [version, traceId, spanId] = parts;
  if (version !== TRACEPARENT_VERSION) return null;
  if (traceId.length !== TRACE_ID_HEX || !/^[0-9a-f]+$/.test(traceId)) return null;
  if (spanId.length !== SPAN_ID_HEX || !/^[0-9a-f]+$/.test(spanId)) return null;
  if (traceId === TRACE_ID_ZERO || spanId === SPAN_ID_ZERO) return null;
  return { traceId, spanId };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd server && npx vitest run src/lib/requestContext/__tests__/traceparent.test.ts`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/requestContext/traceparent.ts server/src/lib/requestContext/__tests__/traceparent.test.ts
git commit -m "feat(requestContext): W3C traceparent parse/format helpers"
```

---

## Task A3: RequestContext type + ALS module

**Files:**
- Create: `server/src/lib/requestContext/types.ts`
- Create: `server/src/lib/requestContext/als.ts`
- Create: `server/src/lib/requestContext/index.ts`
- Test: `server/src/lib/requestContext/__tests__/als.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/src/lib/requestContext/__tests__/als.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  runWithContext,
  getRequestContext,
  requireRequestContext,
  withChildSpan,
  type RequestContext,
} from "..";

const base: RequestContext = {
  traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
  spanId: "00f067aa0ba902b7",
  actorKind: "user",
};

describe("requestContext ALS", () => {
  it("getRequestContext returns undefined outside runWithContext", () => {
    expect(getRequestContext()).toBeUndefined();
  });

  it("requireRequestContext throws outside runWithContext", () => {
    expect(() => requireRequestContext()).toThrow(/no active request context/i);
  });

  it("runWithContext makes the context available to nested async code", async () => {
    await runWithContext(base, async () => {
      expect(getRequestContext()).toEqual(base);
      await Promise.resolve();
      expect(getRequestContext()?.traceId).toBe(base.traceId);
    });
    expect(getRequestContext()).toBeUndefined();
  });

  it("withChildSpan creates a child span under the active context", async () => {
    await runWithContext(base, async () => {
      await withChildSpan(async () => {
        const child = requireRequestContext();
        expect(child.traceId).toBe(base.traceId);
        expect(child.parentSpanId).toBe(base.spanId);
        expect(child.spanId).not.toBe(base.spanId);
        expect(child.spanId).toMatch(/^[0-9a-f]{16}$/);
      });
      // parent span restored after child returns
      expect(getRequestContext()?.spanId).toBe(base.spanId);
    });
  });

  it("withChildSpan is a no-op when no parent context is active", async () => {
    const out = await withChildSpan(async () => "fallback");
    expect(out).toBe("fallback");
    expect(getRequestContext()).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/lib/requestContext/__tests__/als.test.ts`
Expected: FAIL — module `..` has no exports yet.

- [ ] **Step 3: Create the types file**

Create `server/src/lib/requestContext/types.ts`:

```ts
import type { UserRoles } from "@typescript/user";

/**
 * Active context for an in-flight request. Propagated via AsyncLocalStorage.
 * Shape is W3C Trace Context compatible — when we adopt OpenTelemetry proper,
 * traceId / spanId / parentSpanId map directly onto the OTel span context.
 *
 * `actorKind` distinguishes human-initiated work from AI-initiated (MCP tool
 * use) and system-initiated (cron, consumer) so DomainEvents can attribute
 * correctly without the caller having to pass it explicitly every time.
 */
export interface RequestContext {
  // W3C Trace Context core
  traceId: string;
  spanId: string;
  parentSpanId?: string;

  // Who
  actorKind: "user" | "ai" | "system";
  userId?: string;            // present for authenticated requests
  onBehalfOf?: string;        // ai/system acting on behalf of a human user

  // Session / correlation
  sessionId?: string;         // stable across a login session
  correlationId?: string;     // MCP conversationId, cron runId, webhook ID, …

  // Free-form baggage for future expansion (mirrors OTel Baggage API)
  baggage?: Record<string, string>;
}
```

- [ ] **Step 4: Create the ALS module**

Create `server/src/lib/requestContext/als.ts`:

```ts
import { AsyncLocalStorage } from "async_hooks";
import { randomSpanId } from "./traceparent";
import type { RequestContext } from "./types";

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(
  ctx: RequestContext,
  fn: () => Promise<T> | T
): Promise<T> | T {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function requireRequestContext(): RequestContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      "No active request context — code path requires runWithContext()"
    );
  }
  return ctx;
}

/**
 * Run `fn` inside a child span derived from the active context. If there is
 * no active context (e.g. called from a background job without explicit
 * context setup), `fn` runs unchanged — this mirrors OTel's graceful
 * no-op behaviour and lets us sprinkle withChildSpan() freely without
 * mandating context everywhere.
 */
export function withChildSpan<T>(fn: () => Promise<T> | T): Promise<T> | T {
  const parent = storage.getStore();
  if (!parent) return fn();
  const child: RequestContext = {
    ...parent,
    parentSpanId: parent.spanId,
    spanId: randomSpanId(),
  };
  return storage.run(child, fn);
}
```

- [ ] **Step 5: Create the barrel index**

Create `server/src/lib/requestContext/index.ts`:

```ts
export type { RequestContext } from "./types";
export {
  runWithContext,
  getRequestContext,
  requireRequestContext,
  withChildSpan,
} from "./als";
export {
  TRACEPARENT_VERSION,
  randomTraceId,
  randomSpanId,
  parseTraceparent,
  formatTraceparent,
  type TraceparentFields,
} from "./traceparent";
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd server && npx vitest run src/lib/requestContext/__tests__/als.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 7: Commit**

```bash
git add server/src/lib/requestContext/
git commit -m "feat(requestContext): ALS-backed context + withChildSpan helper"
```

---

## Task A4: Express middleware that stamps context per request

**Files:**
- Create: `server/src/middleware/requestContext.ts`
- Test: `server/src/middleware/__tests__/requestContext.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `server/src/middleware/__tests__/requestContext.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import type { Server } from "http";
import { requestContextMiddleware } from "../requestContext";
import { getRequestContext } from "@lib/requestContext";

let server: Server;
let lastObservedTraceId: string | undefined;

beforeAll(async () => {
  const app = express();
  app.use(requestContextMiddleware);
  app.get("/probe", (_req, res) => {
    const ctx = getRequestContext();
    lastObservedTraceId = ctx?.traceId;
    res.json({
      hasContext: !!ctx,
      traceId: ctx?.traceId ?? null,
      spanId: ctx?.spanId ?? null,
      parentSpanId: ctx?.parentSpanId ?? null,
    });
  });
  server = app.listen(0);
});

afterAll(async () => {
  server.close();
});

describe("requestContextMiddleware", () => {
  it("stamps a fresh trace when no inbound header is present", async () => {
    const res = await request(server).get("/probe");
    expect(res.status).toBe(200);
    expect(res.body.hasContext).toBe(true);
    expect(res.body.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(res.body.spanId).toMatch(/^[0-9a-f]{16}$/);
    expect(res.body.parentSpanId).toBeNull();
    expect(res.headers["traceparent"]).toContain(res.body.traceId);
  });

  it("continues an inbound traceparent trace when provided", async () => {
    const inbound =
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    const res = await request(server)
      .get("/probe")
      .set("traceparent", inbound);
    expect(res.body.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
    expect(res.body.parentSpanId).toBe("00f067aa0ba902b7");
    expect(res.body.spanId).not.toBe("00f067aa0ba902b7"); // new child span
  });

  it("each request gets an independent trace", async () => {
    const a = await request(server).get("/probe");
    const b = await request(server).get("/probe");
    expect(a.body.traceId).not.toBe(b.body.traceId);
  });

  it("exposes traceparent on the response for client propagation", async () => {
    const res = await request(server).get("/probe");
    expect(res.headers["traceparent"]).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd server && npx vitest run src/middleware/__tests__/requestContext.test.ts`
Expected: FAIL — `requestContextMiddleware` not defined.

- [ ] **Step 3: Implement the middleware**

Create `server/src/middleware/requestContext.ts`:

```ts
import type { Request, Response, NextFunction } from "express";
import {
  runWithContext,
  parseTraceparent,
  formatTraceparent,
  randomTraceId,
  randomSpanId,
  type RequestContext,
} from "@lib/requestContext";

/**
 * Stamps every inbound HTTP request with an ALS-backed RequestContext.
 *
 *  - If the client sent a W3C `traceparent` header, we continue that trace
 *    and open a new child span under it.
 *  - Otherwise we start a fresh trace.
 *
 * The outbound response also carries a `traceparent` header so the client
 * can propagate the ID back into its next request (future client-side
 * error reports will then pivot on the same trace).
 *
 * `userId` / `sessionId` are populated by downstream middleware (auth)
 * and Apollo's context fn — see app.ts. This middleware just establishes
 * the trace/span scaffolding and a default actorKind="user"; auth
 * middleware can refine it.
 */
export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const inbound = parseTraceparent(req.header("traceparent"));
  const ctx: RequestContext = inbound
    ? {
        traceId: inbound.traceId,
        spanId: randomSpanId(),
        parentSpanId: inbound.spanId,
        actorKind: "user",
      }
    : {
        traceId: randomTraceId(),
        spanId: randomSpanId(),
        actorKind: "user",
      };

  res.setHeader(
    "traceparent",
    formatTraceparent({ traceId: ctx.traceId, spanId: ctx.spanId })
  );

  runWithContext(ctx, () => {
    next();
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd server && npx vitest run src/middleware/__tests__/requestContext.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Install middleware in the real app**

Open `server/src/app.ts`. At the very top of `createApp()`, immediately after `const app = express();` and before `app.use(cors());`, insert:

```ts
import { requestContextMiddleware } from "@middleware/requestContext";
```

(Add to the existing import block near the other `router/*` imports.)

Then inside `createApp()`:

```ts
  const app = express();

  // Must come first: stamps trace context on every request so downstream
  // middleware, resolvers, and mutations can emit correlated events.
  app.use(requestContextMiddleware);

  app.use(cors());
```

- [ ] **Step 6: Verify the app still boots by running existing Apollo tests**

Run: `cd server && npx vitest run src/graphql/__tests__/crewResolver.test.ts`
Expected: PASS — existing tests should be unaffected.

- [ ] **Step 7: Commit**

```bash
git add server/src/middleware/ server/src/app.ts
git commit -m "feat(server): install requestContext middleware at the top of the chain"
```

---

## Task A5: Threading userId / sessionId into the context

**Files:**
- Modify: `server/src/app.ts` (Apollo context fn)
- Modify: `server/src/lib/authMiddleware.ts`
- Modify: `server/src/mcp/context.ts` (forward-compat re-export)
- Modify: JWT issuance (search for the existing `createJWT`/`signJWT` call and add `sessionId` to claims)

- [ ] **Step 1: Locate JWT issuance**

Run: `grep -r "jwt.sign" server/src --include='*.ts' -l`
Expected: one or two files (typically `User/class/login` or similar). Open whichever file calls `jwt.sign` and inspect the claim object.

- [ ] **Step 2: Write a failing test for sessionId propagation**

Create `server/src/middleware/__tests__/sessionIdThreading.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Server } from "http";
import { requestContextMiddleware } from "../requestContext";
import { requireAuth } from "@lib/authMiddleware";
import { getRequestContext } from "@lib/requestContext";

let server: Server;

beforeAll(async () => {
  process.env.JWT_SECRET ??= "test-jwt-secret";
  const app = express();
  app.use(requestContextMiddleware);
  app.get("/probe", requireAuth, (_req, res) => {
    const ctx = getRequestContext();
    res.json({
      userId: ctx?.userId ?? null,
      sessionId: ctx?.sessionId ?? null,
    });
  });
  server = app.listen(0);
});

afterAll(() => server.close());

describe("requireAuth → requestContext threading", () => {
  it("populates userId and sessionId onto the active context", async () => {
    const token = jwt.sign(
      { userId: "user-123", sessionId: "session-abc" },
      process.env.JWT_SECRET!
    );
    const res = await request(server).get("/probe").set("Authorization", token);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("user-123");
    expect(res.body.sessionId).toBe("session-abc");
  });

  it("leaves sessionId undefined when token lacks the claim", async () => {
    const token = jwt.sign(
      { userId: "user-123" },
      process.env.JWT_SECRET!
    );
    const res = await request(server).get("/probe").set("Authorization", token);
    expect(res.body.userId).toBe("user-123");
    expect(res.body.sessionId).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd server && npx vitest run src/middleware/__tests__/sessionIdThreading.test.ts`
Expected: FAIL — requireAuth does not touch the request context today.

- [ ] **Step 4: Update `requireAuth` to enrich the context**

Edit `server/src/lib/authMiddleware.ts`. Replace the existing `requireAuth` with:

```ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "@models";
import { UserRoles } from "@typescript/user";
import { getRequestContext, runWithContext } from "@lib/requestContext";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      token: string;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers.authorization;
  if (!token || !process.env.JWT_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
    const userId = decoded?.userId;
    if (!userId) {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }
    req.userId = userId;
    req.token = token;

    // Refine the ALS-backed RequestContext stamped by
    // requestContextMiddleware: attach userId + sessionId so any
    // mutation emitted during this request attributes correctly.
    const ctx = getRequestContext();
    if (ctx) {
      const enriched = {
        ...ctx,
        userId,
        sessionId:
          typeof decoded.sessionId === "string" ? decoded.sessionId : ctx.sessionId,
      };
      runWithContext(enriched, () => next());
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

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

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd server && npx vitest run src/middleware/__tests__/sessionIdThreading.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 6: Update JWT issuance to include sessionId**

In the JWT signing file found in Step 1, add a sessionId to claims. Example shape — adjust to the actual call site:

```ts
import { randomUUID } from "crypto";
// …
const token = jwt.sign(
  {
    userId: user._id.toString(),
    sessionId: randomUUID(),   // stable identifier for this login session
  },
  process.env.JWT_SECRET,
  { expiresIn: "30d" }
);
```

If the call is duplicated across signup/login, update all sites.

- [ ] **Step 7: Update Apollo `context` fn in `server/src/app.ts`**

Find the Apollo `context` fn (lines ~170-198 in the current file) and enrich the ALS context before returning. Insert near the end of the `context` async fn, replacing the `return` block:

```ts
      // Enrich the ALS RequestContext (which requestContextMiddleware
      // already installed for this HTTP request) with userId + sessionId.
      // GraphQL field resolvers reached via this context will see them.
      const existing = getRequestContext();
      if (existing) {
        const decoded =
          token && process.env.JWT_SECRET
            ? (jwt.decode(token) as jwt.JwtPayload | null)
            : null;
        const enriched: RequestContext = {
          ...existing,
          userId: user?._id?.toString() ?? existing.userId,
          sessionId:
            (decoded && typeof decoded.sessionId === "string"
              ? decoded.sessionId
              : undefined) ?? existing.sessionId,
        };
        runWithContext(enriched, () => undefined);
      }

      return {
        user,
        req,
        res,
      };
```

Add imports at the top of `app.ts`:

```ts
import {
  getRequestContext,
  runWithContext,
  type RequestContext,
} from "@lib/requestContext";
```

> Note: Apollo's `context` is built per-request and we're inside the ALS scope established by `requestContextMiddleware`. The `runWithContext(enriched, () => undefined)` call updates the store for the remainder of the request; this works because ALS stores are copy-on-write per async chain and Apollo resolvers inherit from this scope.

- [ ] **Step 8: Make MCP context a re-export so existing call sites keep working**

Edit `server/src/mcp/context.ts`. Replace its entire body with:

```ts
// MCP-specific context extensions. The core request context primitives
// (ALS, trace IDs, session IDs) live in @lib/requestContext — this file
// only adds MCP-scoped helpers (tenderId / jobsiteId / conversationId).
import {
  getRequestContext as getBaseContext,
  runWithContext as runBaseContext,
  type RequestContext as BaseRequestContext,
} from "@lib/requestContext";

export interface McpRequestContext extends BaseRequestContext {
  // MCP always requires an authenticated user; the MCP auth middleware
  // guarantees userId is populated before any tool runs.
  userId: string;
  tenderId?: string;
  jobsiteId?: string;
  // Existing callers passed `conversationId`. We keep it here as an alias
  // that maps onto the core `correlationId` field for domain events.
  conversationId?: string;
}

export type RequestContext = McpRequestContext;

export function runWithContext<T>(
  ctx: McpRequestContext,
  fn: () => Promise<T>
): Promise<T> {
  // Mirror conversationId onto correlationId so DomainEvents emitted
  // during the MCP call thread stitch back to the conversation.
  const withCorrelation: McpRequestContext = ctx.conversationId
    ? { ...ctx, correlationId: ctx.conversationId }
    : ctx;
  return runBaseContext(withCorrelation, fn) as Promise<T>;
}

export function getRequestContext(): McpRequestContext {
  const ctx = getBaseContext();
  if (!ctx || !ctx.userId) {
    throw new Error("No request context — tool called outside MCP request");
  }
  return ctx as McpRequestContext;
}

export function requireTenderContext(): McpRequestContext & { tenderId: string } {
  const ctx = getRequestContext();
  if (!ctx.tenderId) {
    throw new Error("This tool requires X-Tender-Id header");
  }
  return ctx as McpRequestContext & { tenderId: string };
}
```

- [ ] **Step 9: Run the MCP tests that use this context**

Run: `cd server && npx vitest run src/mcp/ src/__tests__/mcp/`
Expected: PASS — existing MCP helpers keep working through the re-export shim.

- [ ] **Step 10: Commit**

```bash
git add server/src/lib/authMiddleware.ts server/src/app.ts server/src/mcp/context.ts server/src/middleware/__tests__/sessionIdThreading.test.ts
# plus the JWT-issuance file from step 6
git commit -m "feat(server): thread userId + sessionId into request context"
```

---

## Task A6: `EntityVersion` Mongoose plugin

**Files:**
- Create: `server/src/lib/entityVersion/index.ts`
- Test: `server/src/lib/entityVersion/__tests__/versioned.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/src/lib/entityVersion/__tests__/versioned.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose, { Schema, Document } from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { versioned, StaleVersionError, findOneAndUpdateVersioned } from "..";

interface WidgetDoc extends Document {
  name: string;
  version: number;
}

const widgetSchema = new Schema<WidgetDoc>({ name: String });
widgetSchema.plugin(versioned);
const Widget = mongoose.model<WidgetDoc>("TestWidget", widgetSchema);

beforeAll(async () => {
  await prepareDatabase();
});

afterAll(async () => {
  await Widget.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("versioned plugin", () => {
  it("adds version=0 on create", async () => {
    const w = await Widget.create({ name: "alpha" });
    expect(w.version).toBe(0);
  });

  it("increments version on plain .save()", async () => {
    const w = await Widget.create({ name: "beta" });
    w.name = "beta-v2";
    await w.save();
    const fresh = await Widget.findById(w._id).lean();
    expect(fresh?.version).toBe(1);
  });

  it("findOneAndUpdateVersioned succeeds when expectedVersion matches", async () => {
    const w = await Widget.create({ name: "gamma" });
    const updated = await findOneAndUpdateVersioned(
      Widget,
      { _id: w._id },
      { $set: { name: "gamma-v2" } },
      { expectedVersion: 0 }
    );
    expect(updated?.version).toBe(1);
    expect(updated?.name).toBe("gamma-v2");
  });

  it("findOneAndUpdateVersioned throws StaleVersionError on mismatch", async () => {
    const w = await Widget.create({ name: "delta" });
    await expect(
      findOneAndUpdateVersioned(
        Widget,
        { _id: w._id },
        { $set: { name: "delta-v2" } },
        { expectedVersion: 99 }
      )
    ).rejects.toBeInstanceOf(StaleVersionError);
  });

  it("StaleVersionError carries entity identity", async () => {
    const w = await Widget.create({ name: "epsilon" });
    try {
      await findOneAndUpdateVersioned(
        Widget,
        { _id: w._id },
        { $set: { name: "x" } },
        { expectedVersion: 99 }
      );
    } catch (err) {
      expect(err).toBeInstanceOf(StaleVersionError);
      const e = err as StaleVersionError;
      expect(e.modelName).toBe("TestWidget");
      expect(e.expectedVersion).toBe(99);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/lib/entityVersion/__tests__/versioned.test.ts`
Expected: FAIL — module `..` has no exports.

- [ ] **Step 3: Implement the plugin**

Create `server/src/lib/entityVersion/index.ts`:

```ts
import type {
  Schema,
  Model,
  FilterQuery,
  UpdateQuery,
  ClientSession,
  Document,
} from "mongoose";

/**
 * Thrown by findOneAndUpdateVersioned when the expected version does not
 * match the stored version. Caller decides how to surface it (typically a
 * structured GraphQL error that triggers a refresh banner on the client).
 */
export class StaleVersionError extends Error {
  constructor(
    public readonly modelName: string,
    public readonly filter: unknown,
    public readonly expectedVersion: number
  ) {
    super(
      `Stale version on ${modelName}: expected ${expectedVersion} but document has been modified.`
    );
    this.name = "StaleVersionError";
  }
}

/**
 * Adds an optimistic-concurrency `version` field and associated hooks to a
 * Mongoose schema. Start at 0; every successful save or findOneAndUpdate
 * increments by 1.
 *
 * Use the free-standing `findOneAndUpdateVersioned` helper to perform
 * version-checked updates. Plain `.save()` on a loaded doc also increments
 * (but does not perform the precondition check — use findOneAndUpdateVersioned
 * for that).
 */
export function versioned<T extends Document>(schema: Schema<T>): void {
  schema.add({
    version: {
      type: Number,
      default: 0,
      required: true,
    },
  });

  // Plain .save() path: bump version on update.
  schema.pre("save", function (next) {
    if (!this.isNew) {
      (this as unknown as { version: number }).version += 1;
    }
    next();
  });
}

export interface VersionedUpdateOptions {
  expectedVersion: number;
  session?: ClientSession;
}

/**
 * Update-with-precondition. Returns the post-update document, or throws
 * StaleVersionError if the version precondition fails.
 */
export async function findOneAndUpdateVersioned<T extends Document>(
  model: Model<T>,
  filter: FilterQuery<T>,
  update: UpdateQuery<T>,
  options: VersionedUpdateOptions
): Promise<T | null> {
  const guardedFilter = {
    ...filter,
    version: options.expectedVersion,
  } as FilterQuery<T>;

  const guardedUpdate: UpdateQuery<T> = {
    ...update,
    $inc: {
      ...((update as { $inc?: Record<string, number> }).$inc ?? {}),
      version: 1,
    },
  };

  const updated = await model.findOneAndUpdate(guardedFilter, guardedUpdate, {
    new: true,
    session: options.session,
  });

  if (!updated) {
    // Either the document doesn't exist (caller-error) or the version
    // precondition failed. Disambiguate: a second read with the plain
    // filter tells us which.
    const exists = await model.exists(filter).session(options.session ?? null);
    if (exists) {
      throw new StaleVersionError(model.modelName, filter, options.expectedVersion);
    }
  }
  return updated;
}
```

- [ ] **Step 4: Run to verify passing**

Run: `cd server && npx vitest run src/lib/entityVersion/__tests__/versioned.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/entityVersion/
git commit -m "feat(entityVersion): Mongoose plugin + findOneAndUpdateVersioned helper"
```

---

## Task A7: JSON Patch wrapper

**Files:**
- Modify: `server/package.json` (add dep)
- Create: `server/src/lib/jsonPatch/index.ts`
- Test: `server/src/lib/jsonPatch/__tests__/jsonPatch.test.ts`

- [ ] **Step 1: Install `fast-json-patch`**

Run: `cd server && npm install fast-json-patch@^3.1.1`
Expected: adds `fast-json-patch` to `dependencies` in `server/package.json`.

- [ ] **Step 2: Write the failing tests**

Create `server/src/lib/jsonPatch/__tests__/jsonPatch.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeForward, computeInverse, applyPatch } from "..";

describe("jsonPatch", () => {
  it("computeForward emits the minimum ops to go from before→after", () => {
    const before = { a: 1, b: { c: 2 } };
    const after = { a: 1, b: { c: 3 }, d: 4 };
    expect(computeForward(before, after)).toEqual([
      { op: "replace", path: "/b/c", value: 3 },
      { op: "add", path: "/d", value: 4 },
    ]);
  });

  it("computeInverse is symmetric with computeForward", () => {
    const before = { name: "alpha", tags: ["a"] };
    const after = { name: "beta", tags: ["a", "b"] };
    const inverse = computeInverse(before, after);
    expect(applyPatch(after, inverse)).toEqual(before);
  });

  it("applyPatch returns a new object — does not mutate", () => {
    const doc = { a: 1 };
    const patch = [{ op: "replace" as const, path: "/a", value: 2 }];
    const out = applyPatch(doc, patch);
    expect(out).toEqual({ a: 2 });
    expect(doc).toEqual({ a: 1 });
  });

  it("roundtrip: apply(forward) then apply(inverse) restores the original", () => {
    const before = { rows: [{ id: 1, qty: 10 }, { id: 2, qty: 20 }] };
    const after = { rows: [{ id: 1, qty: 15 }, { id: 2, qty: 20 }, { id: 3, qty: 5 }] };
    const forward = computeForward(before, after);
    const inverse = computeInverse(before, after);
    expect(applyPatch(before, forward)).toEqual(after);
    expect(applyPatch(after, inverse)).toEqual(before);
  });

  it("handles create-shaped events (add at root)", () => {
    const before = {};
    const after = { id: "x", name: "new" };
    const forward = computeForward(before, after);
    // fast-json-patch represents this as per-field adds
    expect(applyPatch(before, forward)).toEqual(after);
  });

  it("handles delete-shaped events (remove at path)", () => {
    const before = { kept: 1, removed: 2 };
    const after = { kept: 1 };
    const forward = computeForward(before, after);
    expect(applyPatch(before, forward)).toEqual(after);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `cd server && npx vitest run src/lib/jsonPatch/__tests__/jsonPatch.test.ts`
Expected: FAIL — module `..` has no exports.

- [ ] **Step 4: Implement the wrapper**

Create `server/src/lib/jsonPatch/index.ts`:

```ts
import * as jsonpatch from "fast-json-patch";

/**
 * RFC 6902 operation. We narrow to the ops we actually emit, rejecting
 * `test`/`copy` which we never generate and would be confusing in an
 * audit log. Also rules out the `move` op because we canonicalise moves
 * as remove+add pairs (simpler to render, simpler to invert).
 */
export type PatchOp =
  | { op: "add"; path: string; value: unknown }
  | { op: "remove"; path: string }
  | { op: "replace"; path: string; value: unknown };

export type JsonPatch = PatchOp[];

export function computeForward(before: unknown, after: unknown): JsonPatch {
  const ops = jsonpatch.compare(before as object, after as object);
  return ops.filter((op) => op.op !== "test") as JsonPatch;
}

export function computeInverse(before: unknown, after: unknown): JsonPatch {
  // Diffing in the opposite direction yields the inverse patch.
  const ops = jsonpatch.compare(after as object, before as object);
  return ops.filter((op) => op.op !== "test") as JsonPatch;
}

/**
 * Apply a patch to a document, returning a new document. The input is
 * cloned so callers don't need to worry about mutation.
 */
export function applyPatch<T>(doc: T, patch: JsonPatch): T {
  const clone = jsonpatch.deepClone(doc);
  return jsonpatch.applyPatch(clone, patch as jsonpatch.Operation[]).newDocument as T;
}
```

- [ ] **Step 5: Run to verify passing**

Run: `cd server && npx vitest run src/lib/jsonPatch/__tests__/jsonPatch.test.ts`
Expected: PASS — all 6 tests green.

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/package-lock.json server/src/lib/jsonPatch/
git commit -m "feat(jsonPatch): wrap fast-json-patch with forward/inverse/apply helpers"
```

---

## Task A8: `DomainEvent` Mongoose model

**Files:**
- Create: `server/src/models/DomainEvent/schema/index.ts`
- Create: `server/src/models/DomainEvent/index.ts`
- Modify: `server/src/models/index.ts` (export the new model)
- Test: `server/src/models/DomainEvent/__tests__/schema.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/src/models/DomainEvent/__tests__/schema.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { DomainEvent } from "..";

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await DomainEvent.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("DomainEvent schema", () => {
  it("persists a minimum-fields event and assigns _id/at", async () => {
    const ev = await DomainEvent.create({
      type: "test.thing.created",
      schemaVersion: 1,
      actorKind: "user",
      actorId: new mongoose.Types.ObjectId(),
      entityType: "thing",
      entityId: new mongoose.Types.ObjectId(),
      toVersion: 1,
      diff: {
        forward: [{ op: "add", path: "", value: { name: "alpha" } }],
        inverse: [{ op: "remove", path: "" }],
      },
    });
    expect(ev._id).toBeDefined();
    expect(ev.at).toBeInstanceOf(Date);
  });

  it("rejects actorKind outside the enum", async () => {
    await expect(
      DomainEvent.create({
        type: "t",
        schemaVersion: 1,
        actorKind: "alien" as never,
        entityType: "thing",
        entityId: new mongoose.Types.ObjectId(),
        toVersion: 1,
        diff: { forward: [], inverse: [] },
      })
    ).rejects.toThrow();
  });

  it("queries efficiently by entityType+entityId", async () => {
    const entityId = new mongoose.Types.ObjectId();
    await DomainEvent.create([
      {
        type: "x.created",
        schemaVersion: 1,
        actorKind: "system",
        entityType: "x",
        entityId,
        toVersion: 1,
        diff: { forward: [], inverse: [] },
      },
      {
        type: "x.updated",
        schemaVersion: 1,
        actorKind: "system",
        entityType: "x",
        entityId,
        toVersion: 2,
        diff: { forward: [], inverse: [] },
      },
    ]);
    const history = await DomainEvent.find({ entityType: "x", entityId })
      .sort({ at: 1 })
      .lean();
    expect(history).toHaveLength(2);
    expect(history[0].type).toBe("x.created");
    expect(history[1].type).toBe("x.updated");
  });

  it("indexes relatedEntities.entityId for cross-entity queries", async () => {
    const indexes = await DomainEvent.collection.indexes();
    const names = indexes.map((i) => JSON.stringify(i.key));
    expect(names.some((n) => n.includes("relatedEntities.entityId"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/models/DomainEvent/__tests__/schema.test.ts`
Expected: FAIL — module `..` has no exports.

- [ ] **Step 3: Create the schema**

Create `server/src/models/DomainEvent/schema/index.ts`:

```ts
import { Schema, Types } from "mongoose";

// Kept intentionally as a raw Mongoose schema — not Typegoose. This is an
// append-only infrastructure log, not a domain document with class methods
// or TypeGraphQL decorators. A thin GraphQL ObjectType for subscription
// output is defined separately in graphql/resolvers/domainEvent/types.ts.

const patchOpSchema = new Schema(
  {
    op: { type: String, enum: ["add", "remove", "replace"], required: true },
    path: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: false },
  },
  { _id: false }
);

const diffSchema = new Schema(
  {
    forward: { type: [patchOpSchema], required: true, default: [] },
    inverse: { type: [patchOpSchema], required: true, default: [] },
  },
  { _id: false }
);

const relatedEntitySchema = new Schema(
  {
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    role: { type: String, required: true },
  },
  { _id: false }
);

export const domainEventSchema = new Schema(
  {
    // identity
    type: { type: String, required: true, index: true },
    schemaVersion: { type: Number, required: true, default: 1 },

    // actor
    actorKind: {
      type: String,
      enum: ["user", "ai", "system"],
      required: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    onBehalfOf: { type: Schema.Types.ObjectId, ref: "User", required: false },

    // target
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    relatedEntities: { type: [relatedEntitySchema], required: false, default: [] },

    // time
    at: { type: Date, required: true, default: () => new Date() },

    // versioning
    fromVersion: { type: Number, required: false },
    toVersion: { type: Number, required: true },

    // change
    diff: { type: diffSchema, required: true },

    // traceability
    requestId: { type: String, required: false },
    sessionId: { type: String, required: false },
    correlationId: { type: String, required: false },
    causedByEventId: { type: Schema.Types.ObjectId, ref: "DomainEvent", required: false },
    idempotencyKey: { type: String, required: false },

    // open extension
    metadata: { type: Schema.Types.Mixed, required: false },
  },
  {
    collection: "domainevents",
    // Events are immutable once written — we never bump this.
    versionKey: false,
    // A MongoDB-level updatedAt makes no sense on an append-only log.
    timestamps: false,
  }
);

// Primary read patterns.
domainEventSchema.index({ entityType: 1, entityId: 1, at: -1 });
domainEventSchema.index({ "relatedEntities.entityId": 1, at: -1 });
domainEventSchema.index({ actorId: 1, at: -1 });
domainEventSchema.index({ sessionId: 1, at: 1 });
domainEventSchema.index({ type: 1, at: -1 });
domainEventSchema.index({ at: -1 });

// Optional dedupe: ignores events without an idempotencyKey (sparse).
domainEventSchema.index(
  { idempotencyKey: 1 },
  { sparse: true, unique: true }
);

export type DomainEventDocument = {
  _id: Types.ObjectId;
  type: string;
  schemaVersion: number;
  actorKind: "user" | "ai" | "system";
  actorId?: Types.ObjectId;
  onBehalfOf?: Types.ObjectId;
  entityType: string;
  entityId: Types.ObjectId;
  relatedEntities?: Array<{
    entityType: string;
    entityId: Types.ObjectId;
    role: string;
  }>;
  at: Date;
  fromVersion?: number;
  toVersion: number;
  diff: {
    forward: Array<{ op: "add" | "remove" | "replace"; path: string; value?: unknown }>;
    inverse: Array<{ op: "add" | "remove" | "replace"; path: string; value?: unknown }>;
  };
  requestId?: string;
  sessionId?: string;
  correlationId?: string;
  causedByEventId?: Types.ObjectId;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};
```

- [ ] **Step 4: Create the model barrel**

Create `server/src/models/DomainEvent/index.ts`:

```ts
import mongoose from "mongoose";
import { domainEventSchema, DomainEventDocument } from "./schema";

export const DomainEvent =
  (mongoose.models.DomainEvent as mongoose.Model<DomainEventDocument>) ||
  mongoose.model<DomainEventDocument>("DomainEvent", domainEventSchema);

export type { DomainEventDocument };
```

- [ ] **Step 5: Export from the central models barrel**

Open `server/src/models/index.ts` and add:

```ts
export { DomainEvent } from "./DomainEvent";
export type { DomainEventDocument } from "./DomainEvent";
```

- [ ] **Step 6: Run to verify passing**

Run: `cd server && npx vitest run src/models/DomainEvent/__tests__/schema.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 7: Commit**

```bash
git add server/src/models/DomainEvent/ server/src/models/index.ts
git commit -m "feat(models): DomainEvent append-only Mongoose model"
```

---

## Task A9: `ScratchNote` fixture model (temporary, for end-to-end tests)

**Files:**
- Create: `server/src/models/ScratchNote/schema/index.ts`
- Create: `server/src/models/ScratchNote/index.ts`

(No tests; this model only exists to exercise `eventfulMutation` and the change-stream/subscription pipeline in subsequent tasks. We remove it at the end of this plan.)

- [ ] **Step 1: Create the schema**

Create `server/src/models/ScratchNote/schema/index.ts`:

```ts
import { Schema, Types } from "mongoose";
import { versioned } from "@lib/entityVersion";

const scratchNoteSchema = new Schema(
  {
    text: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { collection: "scratchnotes", timestamps: true }
);

scratchNoteSchema.plugin(versioned);

export { scratchNoteSchema };
export type ScratchNoteDocument = {
  _id: Types.ObjectId;
  text: string;
  owner: Types.ObjectId;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};
```

- [ ] **Step 2: Create the model barrel**

Create `server/src/models/ScratchNote/index.ts`:

```ts
import mongoose from "mongoose";
import { scratchNoteSchema, ScratchNoteDocument } from "./schema";

export const ScratchNote =
  (mongoose.models.ScratchNote as mongoose.Model<ScratchNoteDocument>) ||
  mongoose.model<ScratchNoteDocument>("ScratchNote", scratchNoteSchema);

export type { ScratchNoteDocument };
```

- [ ] **Step 3: Commit**

```bash
git add server/src/models/ScratchNote/
git commit -m "chore(scratch): add ScratchNote fixture for foundation integration tests"
```

---

## Task A10: `eventfulMutation` transaction helper

**Files:**
- Create: `server/src/lib/eventfulMutation/index.ts`
- Test: `server/src/lib/eventfulMutation/__tests__/eventfulMutation.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/src/lib/eventfulMutation/__tests__/eventfulMutation.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { runWithContext, randomTraceId, randomSpanId } from "@lib/requestContext";
import { ScratchNote } from "@models/ScratchNote";
import { DomainEvent } from "@models/DomainEvent";
import { findOneAndUpdateVersioned, StaleVersionError } from "@lib/entityVersion";
import { computeForward, computeInverse } from "@lib/jsonPatch";
import { eventfulMutation, EventfulMutationRollback } from "..";

const ownerId = new mongoose.Types.ObjectId();

const withCtx = <T>(fn: () => Promise<T>): Promise<T> =>
  runWithContext(
    {
      traceId: randomTraceId(),
      spanId: randomSpanId(),
      actorKind: "user",
      userId: ownerId.toString(),
    },
    fn
  ) as Promise<T>;

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await ScratchNote.collection.drop().catch(() => undefined);
  await DomainEvent.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});
beforeEach(async () => {
  await ScratchNote.deleteMany({});
  await DomainEvent.deleteMany({});
});

describe("eventfulMutation", () => {
  it("commits state change and event in the same transaction", async () => {
    const note = await withCtx(() =>
      eventfulMutation(async (session) => {
        const created = await ScratchNote.create(
          [{ text: "hello", owner: ownerId }],
          { session }
        );
        const doc = created[0];
        return {
          result: doc,
          event: {
            type: "scratchNote.created",
            actorKind: "user",
            actorId: ownerId,
            entityType: "scratchNote",
            entityId: doc._id,
            toVersion: doc.version,
            diff: {
              forward: computeForward({}, doc.toObject()),
              inverse: computeInverse({}, doc.toObject()),
            },
          },
        };
      })
    );
    expect(note.text).toBe("hello");
    const events = await DomainEvent.find({ entityId: note._id }).lean();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("scratchNote.created");
    expect(events[0].requestId).toBeDefined();
  });

  it("rolls back both state and event when the callback throws", async () => {
    await withCtx(async () => {
      await expect(
        eventfulMutation(async (session) => {
          await ScratchNote.create([{ text: "x", owner: ownerId }], { session });
          throw new Error("boom");
        })
      ).rejects.toThrow("boom");
    });
    expect(await ScratchNote.countDocuments()).toBe(0);
    expect(await DomainEvent.countDocuments()).toBe(0);
  });

  it("propagates StaleVersionError from findOneAndUpdateVersioned with full rollback", async () => {
    const note = await ScratchNote.create({ text: "a", owner: ownerId });
    await withCtx(async () => {
      await expect(
        eventfulMutation(async (session) => {
          await findOneAndUpdateVersioned(
            ScratchNote,
            { _id: note._id },
            { $set: { text: "b" } },
            { expectedVersion: 999, session }
          );
          // unreachable
          return { result: null, event: null as never };
        })
      ).rejects.toBeInstanceOf(StaleVersionError);
    });
    expect(await DomainEvent.countDocuments()).toBe(0);
    const fresh = await ScratchNote.findById(note._id).lean();
    expect(fresh?.text).toBe("a");
    expect(fresh?.version).toBe(0);
  });

  it("pulls requestId / sessionId / userId from the active context", async () => {
    await runWithContext(
      {
        traceId: "a".repeat(32),
        spanId: "b".repeat(16),
        actorKind: "user",
        userId: ownerId.toString(),
        sessionId: "sess-999",
      },
      async () => {
        const doc = await eventfulMutation(async (session) => {
          const created = await ScratchNote.create(
            [{ text: "t", owner: ownerId }],
            { session }
          );
          const d = created[0];
          return {
            result: d,
            event: {
              type: "scratchNote.created",
              actorKind: "user",
              actorId: ownerId,
              entityType: "scratchNote",
              entityId: d._id,
              toVersion: d.version,
              diff: { forward: [], inverse: [] },
            },
          };
        });
        const ev = await DomainEvent.findOne({ entityId: doc._id }).lean();
        expect(ev?.requestId).toBe("a".repeat(32));
        expect(ev?.sessionId).toBe("sess-999");
        expect(ev?.actorId?.toString()).toBe(ownerId.toString());
      }
    );
  });

  it("EventfulMutationRollback aborts cleanly without surfacing as an error", async () => {
    await withCtx(async () => {
      const out = await eventfulMutation(async (session) => {
        await ScratchNote.create([{ text: "nope", owner: ownerId }], { session });
        throw new EventfulMutationRollback("preflight check failed");
      }).catch((e) => e);
      expect(out).toBeInstanceOf(EventfulMutationRollback);
    });
    expect(await ScratchNote.countDocuments()).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/lib/eventfulMutation/__tests__/eventfulMutation.test.ts`
Expected: FAIL — module `..` has no exports.

- [ ] **Step 3: Implement `eventfulMutation`**

Create `server/src/lib/eventfulMutation/index.ts`:

```ts
import mongoose, { ClientSession, Types } from "mongoose";
import { DomainEvent } from "@models/DomainEvent";
import { getRequestContext } from "@lib/requestContext";
import type { JsonPatch } from "@lib/jsonPatch";

export class EventfulMutationRollback extends Error {
  constructor(message = "eventfulMutation rolled back by caller") {
    super(message);
    this.name = "EventfulMutationRollback";
  }
}

export interface DomainEventInput {
  type: string;
  schemaVersion?: number;
  actorKind: "user" | "ai" | "system";
  actorId?: Types.ObjectId;
  onBehalfOf?: Types.ObjectId;
  entityType: string;
  entityId: Types.ObjectId;
  relatedEntities?: Array<{
    entityType: string;
    entityId: Types.ObjectId;
    role: string;
  }>;
  fromVersion?: number;
  toVersion: number;
  diff: { forward: JsonPatch; inverse: JsonPatch };
  causedByEventId?: Types.ObjectId;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface EventfulMutationOutput<T> {
  result: T;
  /**
   * The event to emit. Pass `null` to indicate "no event for this op" — the
   * transaction still commits state, just without audit. Use sparingly; the
   * point of this helper is that state + event are atomic.
   */
  event: DomainEventInput | null;
  /**
   * Additional cascade events emitted in the same transaction. Used e.g.
   * when a folder move triggers per-descendant ancestor updates. Each
   * cascade event receives `causedByEventId` pointing at the root event
   * automatically.
   */
  cascade?: DomainEventInput[];
}

/**
 * Run `fn` inside a MongoDB transaction. On success, the returned event
 * (plus any cascade events) are appended to the DomainEvent log in the
 * same transaction. If anything throws, both state and event are rolled
 * back — no "state saved but audit lost" failure mode.
 *
 * Traceability fields (requestId, sessionId, correlationId, actorKind)
 * are pulled from the active RequestContext if the caller didn't set
 * them explicitly on the event.
 */
export async function eventfulMutation<T>(
  fn: (session: ClientSession) => Promise<EventfulMutationOutput<T>>
): Promise<T> {
  const ctx = getRequestContext();
  const session = await mongoose.startSession();
  try {
    let capturedResult: T | undefined;
    await session.withTransaction(async () => {
      const { result, event, cascade } = await fn(session);
      capturedResult = result;

      if (event) {
        const rootDoc = buildEventDoc(event, ctx);
        const [inserted] = await DomainEvent.create([rootDoc], { session });

        if (cascade && cascade.length > 0) {
          const docs = cascade.map((c) =>
            buildEventDoc({ ...c, causedByEventId: inserted._id }, ctx)
          );
          await DomainEvent.insertMany(docs, { session });
        }
      }
    });
    return capturedResult as T;
  } finally {
    await session.endSession();
  }
}

function buildEventDoc(
  input: DomainEventInput,
  ctx: ReturnType<typeof getRequestContext>
) {
  return {
    type: input.type,
    schemaVersion: input.schemaVersion ?? 1,
    actorKind: input.actorKind,
    actorId: input.actorId,
    onBehalfOf: input.onBehalfOf,
    entityType: input.entityType,
    entityId: input.entityId,
    relatedEntities: input.relatedEntities ?? [],
    at: new Date(),
    fromVersion: input.fromVersion,
    toVersion: input.toVersion,
    diff: input.diff,
    requestId: ctx?.traceId,
    sessionId: ctx?.sessionId,
    correlationId: ctx?.correlationId,
    causedByEventId: input.causedByEventId,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata,
  };
}
```

- [ ] **Step 4: Run to verify passing**

Run: `cd server && npx vitest run src/lib/eventfulMutation/__tests__/eventfulMutation.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/eventfulMutation/
git commit -m "feat(eventfulMutation): transaction-bound state+event commit helper"
```

---

## Task A11: Domain event change-stream watcher

**Files:**
- Create: `server/src/lib/domainEventStream/index.ts`
- Test: `server/src/lib/domainEventStream/__tests__/domainEventStream.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/src/lib/domainEventStream/__tests__/domainEventStream.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { DomainEvent } from "@models/DomainEvent";
import { watchDomainEvents } from "..";

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await DomainEvent.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

async function collect<T>(
  iter: AsyncIterable<T>,
  count: number,
  timeoutMs = 2000
): Promise<T[]> {
  const out: T[] = [];
  const timer = setTimeout(() => {
    throw new Error(`collect(${count}) timed out after ${timeoutMs}ms`);
  }, timeoutMs);
  for await (const item of iter) {
    out.push(item);
    if (out.length >= count) break;
  }
  clearTimeout(timer);
  return out;
}

describe("watchDomainEvents", () => {
  it("delivers events matching the filter, skipping others", async () => {
    const targetId = new mongoose.Types.ObjectId();
    const otherId = new mongoose.Types.ObjectId();
    const { iterator, close } = watchDomainEvents({
      entityType: "thing",
      entityId: targetId,
    });

    const collected = collect(iterator, 2);

    // Write a few events — only two match the filter.
    await DomainEvent.create({
      type: "thing.a", schemaVersion: 1, actorKind: "system",
      entityType: "thing", entityId: targetId, toVersion: 1,
      diff: { forward: [], inverse: [] },
    });
    await DomainEvent.create({
      type: "thing.ignored", schemaVersion: 1, actorKind: "system",
      entityType: "thing", entityId: otherId, toVersion: 1,
      diff: { forward: [], inverse: [] },
    });
    await DomainEvent.create({
      type: "thing.b", schemaVersion: 1, actorKind: "system",
      entityType: "thing", entityId: targetId, toVersion: 2,
      diff: { forward: [], inverse: [] },
    });

    const events = await collected;
    expect(events.map((e) => e.type)).toEqual(["thing.a", "thing.b"]);
    close();
  });

  it("close() terminates the iterator", async () => {
    const { iterator, close } = watchDomainEvents({ entityType: "never" });
    close();
    const it = iterator[Symbol.asyncIterator]();
    const result = await it.next();
    expect(result.done).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/lib/domainEventStream/__tests__/domainEventStream.test.ts`
Expected: FAIL — module `..` has no exports.

- [ ] **Step 3: Implement the watcher**

Create `server/src/lib/domainEventStream/index.ts`:

```ts
import type { Types } from "mongoose";
import { DomainEvent, DomainEventDocument } from "@models/DomainEvent";

export interface WatchDomainEventsFilter {
  type?: string;
  entityType?: string;
  entityId?: Types.ObjectId;
  actorId?: Types.ObjectId;
  sessionId?: string;
  correlationId?: string;
}

export interface WatchDomainEventsHandle {
  iterator: AsyncIterable<DomainEventDocument>;
  close: () => void;
}

/**
 * Tail new DomainEvents via MongoDB change streams, applying a
 * server-side $match so unrelated events never leave the database.
 *
 * Intended for server-internal consumers (search indexer, GraphQL
 * subscription resolvers, cache invalidators). Resume-token persistence
 * is intentionally out of scope for v1 — consumers that care about
 * replay after a restart should query DomainEvents directly for events
 * newer than their last-processed `at`. Watch is strictly for live tail.
 */
export function watchDomainEvents(
  filter: WatchDomainEventsFilter
): WatchDomainEventsHandle {
  const match: Record<string, unknown> = {
    operationType: "insert",
  };
  if (filter.type) match["fullDocument.type"] = filter.type;
  if (filter.entityType) match["fullDocument.entityType"] = filter.entityType;
  if (filter.entityId) match["fullDocument.entityId"] = filter.entityId;
  if (filter.actorId) match["fullDocument.actorId"] = filter.actorId;
  if (filter.sessionId) match["fullDocument.sessionId"] = filter.sessionId;
  if (filter.correlationId)
    match["fullDocument.correlationId"] = filter.correlationId;

  const stream = DomainEvent.watch([{ $match: match }], {
    fullDocument: "updateLookup",
  });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    stream.close().catch(() => undefined);
  };

  const iterator: AsyncIterable<DomainEventDocument> = {
    async *[Symbol.asyncIterator]() {
      try {
        for await (const change of stream) {
          if (closed) break;
          if (change.operationType !== "insert") continue;
          const doc = (change as unknown as { fullDocument: DomainEventDocument })
            .fullDocument;
          yield doc;
        }
      } finally {
        close();
      }
    },
  };

  return { iterator, close };
}
```

- [ ] **Step 4: Run to verify passing**

Run: `cd server && npx vitest run src/lib/domainEventStream/__tests__/domainEventStream.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/domainEventStream/
git commit -m "feat(domainEventStream): change-stream AsyncIterator wrapper"
```

---

## Task A12: GraphQL subscription for domain events

**Files:**
- Create: `server/src/graphql/resolvers/domainEvent/types.ts`
- Create: `server/src/graphql/resolvers/domainEvent/index.ts`
- Modify: `server/src/app.ts` (register resolver)

- [ ] **Step 1: Create the GraphQL ObjectType**

Create `server/src/graphql/resolvers/domainEvent/types.ts`:

```ts
import { Field, ID, ObjectType } from "type-graphql";
import { GraphQLScalarType, Kind } from "graphql";

// Permissive JSON scalar for the free-form `diff`, `metadata`, and
// `relatedEntities` payloads. We can tighten this later if we need
// stricter subscription-side validation.
const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON value",
  serialize: (v) => v,
  parseValue: (v) => v,
  parseLiteral(ast): unknown {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return Number(ast.value);
      case Kind.OBJECT: {
        const obj: Record<string, unknown> = {};
        for (const f of ast.fields) obj[f.name.value] = (f.value as { value: unknown }).value;
        return obj;
      }
      case Kind.LIST:
        return ast.values.map((v) => (v as { value: unknown }).value);
      default:
        return null;
    }
  },
});

@ObjectType("DomainEvent")
export class DomainEventGql {
  @Field(() => ID)
  _id!: string;

  @Field()
  type!: string;

  @Field()
  schemaVersion!: number;

  @Field()
  actorKind!: string;

  @Field(() => ID, { nullable: true })
  actorId?: string;

  @Field(() => ID, { nullable: true })
  onBehalfOf?: string;

  @Field()
  entityType!: string;

  @Field(() => ID)
  entityId!: string;

  @Field(() => JSONScalar, { nullable: true })
  relatedEntities?: unknown;

  @Field()
  at!: Date;

  @Field({ nullable: true })
  fromVersion?: number;

  @Field()
  toVersion!: number;

  @Field(() => JSONScalar)
  diff!: unknown;

  @Field({ nullable: true })
  requestId?: string;

  @Field({ nullable: true })
  sessionId?: string;

  @Field({ nullable: true })
  correlationId?: string;

  @Field(() => ID, { nullable: true })
  causedByEventId?: string;

  @Field(() => JSONScalar, { nullable: true })
  metadata?: unknown;
}
```

- [ ] **Step 2: Create the resolver**

Create `server/src/graphql/resolvers/domainEvent/index.ts`:

```ts
import { Resolver, Subscription, Arg, Root } from "type-graphql";
import mongoose from "mongoose";
import { DomainEventGql } from "./types";
import { watchDomainEvents } from "@lib/domainEventStream";
import type { DomainEventDocument } from "@models/DomainEvent";

/**
 * Async generator adapter: translates our change-stream iterator into
 * the shape type-graphql expects for Subscription.subscribe.
 */
async function* subscribeDomainEvents(
  entityType: string,
  entityId: string
): AsyncGenerator<DomainEventDocument> {
  const { iterator, close } = watchDomainEvents({
    entityType,
    entityId: new mongoose.Types.ObjectId(entityId),
  });
  try {
    for await (const ev of iterator) yield ev;
  } finally {
    close();
  }
}

@Resolver()
export default class DomainEventResolver {
  @Subscription(() => DomainEventGql, {
    subscribe: ({ args }) =>
      subscribeDomainEvents(args.entityType, args.entityId),
  })
  domainEvent(
    @Arg("entityType") _entityType: string,
    @Arg("entityId") _entityId: string,
    @Root() event: DomainEventDocument
  ): DomainEventGql {
    return {
      _id: event._id.toString(),
      type: event.type,
      schemaVersion: event.schemaVersion,
      actorKind: event.actorKind,
      actorId: event.actorId?.toString(),
      onBehalfOf: event.onBehalfOf?.toString(),
      entityType: event.entityType,
      entityId: event.entityId.toString(),
      relatedEntities: event.relatedEntities,
      at: event.at,
      fromVersion: event.fromVersion,
      toVersion: event.toVersion,
      diff: event.diff,
      requestId: event.requestId,
      sessionId: event.sessionId,
      correlationId: event.correlationId,
      causedByEventId: event.causedByEventId?.toString(),
      metadata: event.metadata,
    };
  }
}
```

- [ ] **Step 3: Register the resolver in `app.ts`**

Edit `server/src/app.ts`. Add to the import block:

```ts
import DomainEventResolver from "@graphql/resolvers/domainEvent";
```

Add `DomainEventResolver,` to the `resolvers: [ … ]` array passed to `buildTypeDefsAndResolvers`.

- [ ] **Step 4: Verify the schema builds**

Run: `cd server && npx vitest run src/graphql/__tests__/crewResolver.test.ts`
Expected: PASS — the app still boots with the new subscription registered.

- [ ] **Step 5: Commit**

```bash
git add server/src/graphql/resolvers/domainEvent/ server/src/app.ts
git commit -m "feat(graphql): domainEvent subscription wrapping DomainEvent change stream"
```

---

## Task A13: `EntityPresence` primitive

**Files:**
- Create: `server/src/lib/entityPresence/index.ts`
- Create: `server/src/lib/entityPresence/types.ts`
- Test: `server/src/lib/entityPresence/__tests__/entityPresence.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/src/lib/entityPresence/__tests__/entityPresence.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  heartbeat,
  listPresence,
  clearPresence,
  subscribeToPresence,
  PRESENCE_TTL_MS,
} from "..";

beforeEach(() => {
  clearPresence();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  clearPresence();
});

describe("entityPresence", () => {
  it("heartbeat registers a viewer; listPresence returns them", () => {
    heartbeat({
      entityType: "tender",
      entityId: "t1",
      userId: "u1",
      activity: "viewing",
    });
    const viewers = listPresence({ entityType: "tender", entityId: "t1" });
    expect(viewers).toHaveLength(1);
    expect(viewers[0].userId).toBe("u1");
    expect(viewers[0].activity).toBe("viewing");
  });

  it("second heartbeat from same user refreshes the existing entry", () => {
    heartbeat({ entityType: "x", entityId: "y", userId: "u1", activity: "viewing" });
    vi.advanceTimersByTime(5000);
    heartbeat({ entityType: "x", entityId: "y", userId: "u1", activity: "editing" });
    const viewers = listPresence({ entityType: "x", entityId: "y" });
    expect(viewers).toHaveLength(1);
    expect(viewers[0].activity).toBe("editing");
  });

  it("entries expire after PRESENCE_TTL_MS of no heartbeats", () => {
    heartbeat({ entityType: "x", entityId: "y", userId: "u1", activity: "viewing" });
    vi.advanceTimersByTime(PRESENCE_TTL_MS + 1);
    const viewers = listPresence({ entityType: "x", entityId: "y" });
    expect(viewers).toHaveLength(0);
  });

  it("subscribeToPresence receives updates on heartbeat and expiry", async () => {
    const events: string[] = [];
    const unsub = subscribeToPresence(
      { entityType: "x", entityId: "y" },
      (viewers) => events.push(viewers.map((v) => v.userId).join(",") || "(empty)")
    );

    heartbeat({ entityType: "x", entityId: "y", userId: "u1", activity: "viewing" });
    heartbeat({ entityType: "x", entityId: "y", userId: "u2", activity: "viewing" });
    expect(events).toEqual(["u1", "u1,u2"]);

    vi.advanceTimersByTime(PRESENCE_TTL_MS + 1);
    // Trigger sweep by requesting the list (expiry is lazy).
    listPresence({ entityType: "x", entityId: "y" });
    expect(events.at(-1)).toBe("(empty)");

    unsub();
  });

  it("subscriptions are scoped — unrelated entities do not fire", () => {
    const events: string[] = [];
    const unsub = subscribeToPresence(
      { entityType: "tender", entityId: "A" },
      (v) => events.push(v.map((x) => x.userId).join(","))
    );
    heartbeat({ entityType: "tender", entityId: "B", userId: "u1", activity: "viewing" });
    expect(events).toEqual([]);
    unsub();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/lib/entityPresence/__tests__/entityPresence.test.ts`
Expected: FAIL — module `..` has no exports.

- [ ] **Step 3: Implement types**

Create `server/src/lib/entityPresence/types.ts`:

```ts
export type PresenceActivity = "viewing" | "editing";

export interface PresenceEntry {
  userId: string;
  activity: PresenceActivity;
  lastSeen: number; // epoch ms
}

export interface PresenceScope {
  entityType: string;
  entityId: string;
}

export interface PresenceHeartbeat extends PresenceScope {
  userId: string;
  activity: PresenceActivity;
}
```

- [ ] **Step 4: Implement the primitive**

Create `server/src/lib/entityPresence/index.ts`:

```ts
import type {
  PresenceEntry,
  PresenceScope,
  PresenceHeartbeat,
} from "./types";

export type { PresenceEntry, PresenceScope, PresenceHeartbeat, PresenceActivity } from "./types";

/** 30 seconds — matches the client heartbeat cadence. */
export const PRESENCE_TTL_MS = 30_000;

/**
 * In-memory presence table. Keyed by "entityType:entityId"; the inner map
 * is keyed by userId. This is a single-process table — a multi-replica
 * deployment would need a Redis-backed version (follow-up; not needed
 * for v1 because realtime accuracy degrades gracefully across replicas).
 */
const table = new Map<string, Map<string, PresenceEntry>>();
type Listener = (viewers: PresenceEntry[]) => void;
const listeners = new Map<string, Set<Listener>>();

function key(scope: PresenceScope): string {
  return `${scope.entityType}:${scope.entityId}`;
}

function now(): number {
  return Date.now();
}

function sweep(k: string): void {
  const inner = table.get(k);
  if (!inner) return;
  const cutoff = now() - PRESENCE_TTL_MS;
  let changed = false;
  for (const [userId, entry] of inner.entries()) {
    if (entry.lastSeen < cutoff) {
      inner.delete(userId);
      changed = true;
    }
  }
  if (inner.size === 0) table.delete(k);
  if (changed) emit(k);
}

function emit(k: string): void {
  const ls = listeners.get(k);
  if (!ls || ls.size === 0) return;
  const viewers = listFromKey(k);
  for (const l of ls) l(viewers);
}

function listFromKey(k: string): PresenceEntry[] {
  const inner = table.get(k);
  return inner ? Array.from(inner.values()) : [];
}

export function heartbeat(input: PresenceHeartbeat): void {
  const k = key(input);
  let inner = table.get(k);
  if (!inner) {
    inner = new Map();
    table.set(k, inner);
  }
  inner.set(input.userId, {
    userId: input.userId,
    activity: input.activity,
    lastSeen: now(),
  });
  emit(k);
}

export function listPresence(scope: PresenceScope): PresenceEntry[] {
  const k = key(scope);
  sweep(k);
  return listFromKey(k);
}

export function subscribeToPresence(
  scope: PresenceScope,
  listener: Listener
): () => void {
  const k = key(scope);
  let set = listeners.get(k);
  if (!set) {
    set = new Set();
    listeners.set(k, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(k);
  };
}

/** Test-only helper. */
export function clearPresence(): void {
  table.clear();
  listeners.clear();
}
```

- [ ] **Step 5: Run to verify passing**

Run: `cd server && npx vitest run src/lib/entityPresence/__tests__/entityPresence.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 6: Commit**

```bash
git add server/src/lib/entityPresence/
git commit -m "feat(entityPresence): in-memory TTL-backed presence primitive"
```

---

## Task A14: GraphQL for presence (subscription + heartbeat mutation)

**Files:**
- Create: `server/src/graphql/resolvers/entityPresence/index.ts`
- Modify: `server/src/app.ts` (register resolver)

- [ ] **Step 1: Create the resolver**

Create `server/src/graphql/resolvers/entityPresence/index.ts`:

```ts
import {
  Arg,
  Authorized,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Resolver,
  Root,
  Subscription,
} from "type-graphql";
import type { IContext } from "@typescript/graphql";
import {
  heartbeat,
  listPresence,
  subscribeToPresence,
  type PresenceEntry,
} from "@lib/entityPresence";

@ObjectType("PresenceViewer")
class PresenceViewerGql {
  @Field()
  userId!: string;

  @Field()
  activity!: string;

  @Field()
  lastSeen!: Date;
}

@Resolver()
export default class EntityPresenceResolver {
  @Authorized()
  @Mutation(() => Boolean)
  async presenceHeartbeat(
    @Arg("entityType") entityType: string,
    @Arg("entityId") entityId: string,
    @Arg("activity") activity: string,
    @Ctx() { user }: IContext
  ): Promise<boolean> {
    if (!user) return false;
    if (activity !== "viewing" && activity !== "editing") return false;
    heartbeat({
      entityType,
      entityId,
      userId: user._id.toString(),
      activity,
    });
    return true;
  }

  @Subscription(() => [PresenceViewerGql], {
    subscribe: ({ args }) => subscribePresence(args.entityType, args.entityId),
  })
  entityPresence(
    @Arg("entityType") _entityType: string,
    @Arg("entityId") _entityId: string,
    @Root() viewers: PresenceEntry[]
  ): PresenceViewerGql[] {
    return viewers.map((v) => ({
      userId: v.userId,
      activity: v.activity,
      lastSeen: new Date(v.lastSeen),
    }));
  }
}

async function* subscribePresence(
  entityType: string,
  entityId: string
): AsyncGenerator<PresenceEntry[]> {
  // Emit the current roster once immediately so new subscribers don't
  // have to wait for the next heartbeat to see who's already there.
  yield listPresence({ entityType, entityId });

  const queue: PresenceEntry[][] = [];
  let resolveNext: ((v: PresenceEntry[]) => void) | null = null;

  const unsub = subscribeToPresence(
    { entityType, entityId },
    (viewers) => {
      if (resolveNext) {
        const r = resolveNext;
        resolveNext = null;
        r(viewers);
      } else {
        queue.push(viewers);
      }
    }
  );

  try {
    while (true) {
      if (queue.length > 0) {
        yield queue.shift()!;
      } else {
        const next = await new Promise<PresenceEntry[]>((resolve) => {
          resolveNext = resolve;
        });
        yield next;
      }
    }
  } finally {
    unsub();
  }
}
```

- [ ] **Step 2: Register the resolver in `app.ts`**

Edit `server/src/app.ts`. Add import:

```ts
import EntityPresenceResolver from "@graphql/resolvers/entityPresence";
```

Add `EntityPresenceResolver,` to the `resolvers` array.

- [ ] **Step 3: Verify the schema still builds**

Run: `cd server && npx vitest run src/graphql/__tests__/crewResolver.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/src/graphql/resolvers/entityPresence/ server/src/app.ts
git commit -m "feat(graphql): entityPresence subscription + presenceHeartbeat mutation"
```

---

## Task A15: Client traceparent propagation

**Files:**
- Create: `client/src/lib/traceparent.ts`
- Modify: Apollo Client setup (search for `createHttpLink` or `ApolloClient` in `client/src/`)

- [ ] **Step 1: Locate Apollo client setup**

Run: `grep -r "ApolloClient\|createHttpLink" client/src --include='*.ts' --include='*.tsx' -l`
Expected: one or two files — typically `client/src/apollo.ts`, `client/src/lib/apollo.ts`, or `client/src/_app.tsx`.

- [ ] **Step 2: Implement the traceparent helper**

Create `client/src/lib/traceparent.ts`:

```ts
/**
 * Client-side W3C Trace Context helpers. Stores the most recent
 * `traceparent` seen on a server response and injects it into the next
 * outbound request as a child span. Enables log + error correlation
 * between client actions and the backend work they triggered.
 */

const KEY = "__traceparent__";

// Stored as a module-level variable (in-memory only). A fresh traceparent
// is issued per request if no previous one exists.
let lastTraceparent: string | null = null;

export function setTraceparent(header: string | null): void {
  lastTraceparent = header;
  if (typeof window !== "undefined" && window.sessionStorage) {
    if (header) window.sessionStorage.setItem(KEY, header);
    else window.sessionStorage.removeItem(KEY);
  }
}

export function getTraceparent(): string | null {
  if (lastTraceparent) return lastTraceparent;
  if (typeof window !== "undefined" && window.sessionStorage) {
    lastTraceparent = window.sessionStorage.getItem(KEY);
  }
  return lastTraceparent;
}
```

- [ ] **Step 3: Wire into Apollo links**

In the Apollo client setup file (from Step 1), find where `ApolloClient` is instantiated and add a link that injects `traceparent` on outbound and captures it on inbound. Example using `apollo-link-context` and `apollo-link-error` patterns; adapt to the file's existing style:

```ts
import { ApolloLink } from "@apollo/client";
import { setTraceparent, getTraceparent } from "./lib/traceparent";

const traceparentLink = new ApolloLink((operation, forward) => {
  const existing = getTraceparent();
  if (existing) {
    operation.setContext(({ headers = {} }: { headers?: Record<string, string> }) => ({
      headers: { ...headers, traceparent: existing },
    }));
  }
  return forward(operation).map((response) => {
    const context = operation.getContext();
    const responseHeaders = context.response?.headers as Headers | undefined;
    const incoming = responseHeaders?.get?.("traceparent");
    if (incoming) setTraceparent(incoming);
    return response;
  });
});
```

Compose into the link chain before `httpLink`: `ApolloLink.from([traceparentLink, authLink, httpLink])` (or equivalent shape in the file).

- [ ] **Step 4: Verify the client still compiles**

Run: `cd client && npm run type-check`
Expected: PASS — no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/traceparent.ts
# plus the modified Apollo setup file
git commit -m "feat(client): propagate W3C traceparent between client and server"
```

---

## Task A16: End-to-end smoke test

**Files:**
- Create: `server/src/__tests__/foundation.e2e.test.ts`

- [ ] **Step 1: Write the end-to-end test**

Create `server/src/__tests__/foundation.e2e.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import {
  runWithContext,
  randomTraceId,
  randomSpanId,
  type RequestContext,
} from "@lib/requestContext";
import { ScratchNote } from "@models/ScratchNote";
import { DomainEvent } from "@models/DomainEvent";
import { findOneAndUpdateVersioned } from "@lib/entityVersion";
import { computeForward, computeInverse } from "@lib/jsonPatch";
import { eventfulMutation } from "@lib/eventfulMutation";
import { watchDomainEvents } from "@lib/domainEventStream";

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await ScratchNote.collection.drop().catch(() => undefined);
  await DomainEvent.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});
beforeEach(async () => {
  await ScratchNote.deleteMany({});
  await DomainEvent.deleteMany({});
});

const makeCtx = (overrides: Partial<RequestContext> = {}): RequestContext => ({
  traceId: randomTraceId(),
  spanId: randomSpanId(),
  actorKind: "user",
  userId: new mongoose.Types.ObjectId().toString(),
  sessionId: "sess-e2e",
  ...overrides,
});

describe("foundation end-to-end", () => {
  it("threads context → version check → event → change-stream delivery", async () => {
    const ctx = makeCtx();
    const owner = new mongoose.Types.ObjectId(ctx.userId!);

    // 1. Start watching before emitting so the stream catches the insert.
    const { iterator, close } = watchDomainEvents({
      entityType: "scratchNote",
    });
    const firstEvent = (async () => {
      for await (const ev of iterator) return ev;
      return null;
    })();

    // 2. Create a note inside eventfulMutation.
    const created = await runWithContext(ctx, () =>
      eventfulMutation(async (session) => {
        const docs = await ScratchNote.create(
          [{ text: "alpha", owner }],
          { session }
        );
        const doc = docs[0];
        return {
          result: doc,
          event: {
            type: "scratchNote.created",
            actorKind: "user",
            actorId: owner,
            entityType: "scratchNote",
            entityId: doc._id,
            toVersion: doc.version,
            diff: {
              forward: computeForward({}, doc.toObject()),
              inverse: computeInverse({}, doc.toObject()),
            },
          },
        };
      })
    );

    expect(created.version).toBe(0);

    // 3. The change stream should see exactly that event, with context fields.
    const streamed = await firstEvent;
    expect(streamed).not.toBeNull();
    expect(streamed!.entityId.toString()).toBe(created._id.toString());
    expect(streamed!.requestId).toBe(ctx.traceId);
    expect(streamed!.sessionId).toBe("sess-e2e");
    close();

    // 4. Version check: correct expectedVersion succeeds.
    await runWithContext(ctx, () =>
      eventfulMutation(async (session) => {
        const before = await ScratchNote.findById(created._id).session(session).lean();
        const updated = await findOneAndUpdateVersioned(
          ScratchNote,
          { _id: created._id },
          { $set: { text: "beta" } },
          { expectedVersion: 0, session }
        );
        return {
          result: updated!,
          event: {
            type: "scratchNote.updated",
            actorKind: "user",
            actorId: owner,
            entityType: "scratchNote",
            entityId: updated!._id,
            fromVersion: 0,
            toVersion: updated!.version,
            diff: {
              forward: computeForward(before, updated!.toObject()),
              inverse: computeInverse(before, updated!.toObject()),
            },
          },
        };
      })
    );

    const after = await ScratchNote.findById(created._id).lean();
    expect(after?.text).toBe("beta");
    expect(after?.version).toBe(1);

    // 5. Two events in the log, in order.
    const events = await DomainEvent.find({ entityId: created._id })
      .sort({ at: 1 })
      .lean();
    expect(events.map((e) => e.type)).toEqual([
      "scratchNote.created",
      "scratchNote.updated",
    ]);
    expect(events[1].fromVersion).toBe(0);
    expect(events[1].toVersion).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `cd server && npx vitest run src/__tests__/foundation.e2e.test.ts`
Expected: PASS — the full primitive stack works end-to-end.

- [ ] **Step 3: Run the full suite to confirm no regressions**

Run: `cd server && npm test`
Expected: PASS — all prior tests still green.

- [ ] **Step 4: Commit**

```bash
git add server/src/__tests__/foundation.e2e.test.ts
git commit -m "test(foundation): end-to-end verification of context+version+event+stream"
```

---

## Task A17: Remove `ScratchNote` fixture and run the suite once more

**Files:**
- Delete: `server/src/models/ScratchNote/`
- Modify: the tests that reference `ScratchNote` (eventfulMutation test, foundation e2e test) — replace `ScratchNote` with an inline test model defined inside the test file.

The rationale: `ScratchNote` was only added because we needed a schema to drive integration tests before `FileNode` exists. Leaving it in the tree pollutes `@models` with a non-domain model. Defining an inline test model inside the test file itself keeps the fixture colocated with its usage.

- [ ] **Step 1: Replace the `ScratchNote` import in `eventfulMutation.test.ts` with an inline model**

Edit `server/src/lib/eventfulMutation/__tests__/eventfulMutation.test.ts`. Replace the `import { ScratchNote } ...` line with an inline definition at the top of the file:

```ts
import mongoose, { Schema } from "mongoose";
import { versioned } from "@lib/entityVersion";

const testScratchSchema = new Schema(
  { text: String, owner: { type: Schema.Types.ObjectId, ref: "User" } },
  { collection: "test_scratchnotes", timestamps: true }
);
testScratchSchema.plugin(versioned);
const ScratchNote =
  (mongoose.models.EventfulTestScratch as mongoose.Model<{
    _id: mongoose.Types.ObjectId;
    text: string;
    owner: mongoose.Types.ObjectId;
    version: number;
  }>) ||
  mongoose.model("EventfulTestScratch", testScratchSchema);
```

And remove the `@models/ScratchNote` import.

- [ ] **Step 2: Same replacement in `foundation.e2e.test.ts`**

Repeat the inline model definition in `server/src/__tests__/foundation.e2e.test.ts`, giving it a different model name like `FoundationTestScratch` to avoid collisions if the tests ever run in parallel.

- [ ] **Step 3: Delete the `ScratchNote` model directory**

Run: `rm -rf server/src/models/ScratchNote`

- [ ] **Step 4: Remove the export from the models barrel**

Check `server/src/models/index.ts` — if Task A9 added a `ScratchNote` export, remove it.

- [ ] **Step 5: Run both affected test files**

Run: `cd server && npx vitest run src/lib/eventfulMutation src/__tests__/foundation.e2e.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the full suite**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/lib/eventfulMutation/__tests__/ server/src/__tests__/foundation.e2e.test.ts server/src/models/index.ts
git rm -r server/src/models/ScratchNote
git commit -m "chore(tests): inline scratch models, remove ScratchNote fixture"
```

---

## Self-Review

**Spec coverage check:**

| Requirement from prior discussion | Task(s) |
|---|---|
| AsyncLocalStorage request context with traceId/spanId/userId/sessionId | A2, A3, A4 |
| W3C Trace Context (traceparent) parse + format | A2 |
| Session ID in JWT + middleware threading | A5 |
| Express middleware that stamps context per request | A4, A5 |
| EntityVersion primitive with StaleVersionError | A6 |
| DomainEvent Mongoose model (raw, not Typegoose) with indexes | A8 |
| JSON Patch helpers (forward + inverse) | A7 |
| eventfulMutation atomically commits state + event in a MongoDB transaction | A10 |
| Change-stream AsyncIterator | A11 |
| GraphQL subscription wrapping the change stream | A12 |
| EntityPresence in-memory TTL primitive | A13 |
| GraphQL subscription + heartbeat mutation for presence | A14 |
| Client traceparent propagation | A15 |
| End-to-end smoke test through the full stack | A16 |
| Cleanup: no leftover fixtures in production code paths | A17 |
| MCP context remains backward-compatible | A5 (Step 8) |
| Full retention, no rollup | implicit — no task needed |
| Tests per primitive | every task has a test step |
| Feature branch | user already on `feat/unified-file-system` |

**Placeholder scan:** checked for "TBD", "implement later", "add appropriate error handling", "similar to", "etc." — none present. Every step has either exact code or an exact command.

**Type / identifier consistency:**
- `RequestContext` — same shape across `types.ts`, `als.ts`, re-exports in `mcp/context.ts`, and usage in `eventfulMutation` (A3, A10).
- `runWithContext` / `getRequestContext` / `requireRequestContext` — consistent signatures across A3, A5, A10, A16.
- `DomainEventInput` field names match the schema defined in A8 (tested indirectly by `eventfulMutation.test.ts` persisting and reading events).
- `findOneAndUpdateVersioned` signature is stable across A6 → A10 → A16.
- `watchDomainEvents` returns `{ iterator, close }` consistently across A11 → A12 → A16.
- `@lib/*` and `@middleware/*` aliases established in A1 are used from A2 onward.

**Known-acceptable simplifications:**
- Change-stream resume tokens are out of scope (noted in A11 jsdoc): v1 subscribers recreate streams on reconnect and caller-provided queries backfill from `DomainEvents` directly if needed.
- `EntityPresence` is in-process (noted in A13 jsdoc): multi-replica deploys will need a Redis adapter (follow-up).
- Client Apollo link in A15 uses a permissive shape — the exact file path depends on where the repo defines its client (discovered in Step 1 of that task).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-17-concurrency-event-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**

Once this plan is merged, I'll write Plan 2 (`2026-04-17-unified-file-system.md`) that uses these primitives to build the unified file system.
