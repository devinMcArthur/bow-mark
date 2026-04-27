# Telemetry MCP + Agent Access Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Execute task-by-task; commit at the end of each task.

**Goal:** Finish the telemetry-logging branch by exposing telemetry data via MCP, and add an API-key + JWT-scope guard system so external agents can be granted read-only or read-write access to the bow-mark MCP server without requiring a User row.

**Architecture:**
- New `AgentApiKey` Mongo collection holds long-lived credentials with `{ keyPrefix, keyHash, scope, revokedAt }`. Format: `agtkey_<8-char-prefix>_<48-char-secret>`.
- New `POST /mcp/auth` endpoint exchanges a raw API key for a 1h JWT carrying `{ agentId, scope, sessionId }`. Existing `/mcp` POST handler branches: `userId` claim → user flow; `agentId` claim → agent flow.
- Tool registration becomes scope-aware: `register(server, scope)`. Read tools always register; write tools only register when `scope === "readwrite"`. Convention: tools default to write (fail-safe).
- New `mcp/tools/telemetry.ts` exposes Phase 3 tools (`get_error_summary`, `get_slow_operations`, `get_consumer_health`, `get_system_health`) — all read.
- Consumer instrumentation (Phase 2c) wraps `SyncHandler.handle()` to call `recordConsumerEvent` on success/failure.

**Tech Stack:** TypeScript, Typegoose, Express, `@modelcontextprotocol/sdk`, Kysely (Postgres), `jsonwebtoken`, `bcryptjs`.

**Branch:** `feature/telemetry-logging` (continues the cloud-agent commit `ba60af66`).

---

## Pre-flight

- [ ] **P0: Switch to feature branch and pull**

```bash
git checkout feature/telemetry-logging
git pull origin feature/telemetry-logging
git fetch origin master
git merge origin/master   # bring branch up to date; resolve any conflicts
```

---

## Phase A — Foundation Cleanup

Existing telemetry commit uses `db as Kysely<any>` to bypass typing. Run the migration in dev so codegen picks up the new tables, then drop the cast.

### Task A1: Apply telemetry migration in dev and regenerate Kysely types

**Files:**
- Modify: `server/src/db/generated-types.ts` (regenerated)

- [ ] **Step 1: Verify minikube context and bring up the dev stack**

```bash
kubectl config current-context   # must be "minikube"
tilt up &                         # if not already running
```

Wait until `server` and `postgres` pods are Ready.

- [ ] **Step 2: Run the migration via the project script**

```bash
cd server
npm run db:migrate
```

This applies pending `db/migrations/*.sql` against `bowmark_reports_paving` and runs `scripts/generate-db-types.sh` against the same DB.

- [ ] **Step 3: Verify the generated types include telemetry tables**

```bash
grep -E "telemetry_(errors|op_timings|consumer_events)" server/src/db/generated-types.ts
```

Expected: three matches — one per table — with column types.

- [ ] **Step 4: Repeat for concrete DB**

The migration script defaults to paving; concrete needs the same migration. Per memory, concrete uses `bowmark_reports_concrete`.

```bash
POSTGRES_DB=bowmark_reports_concrete npm run db:migrate
```

- [ ] **Step 5: Commit the regenerated types**

```bash
git add server/src/db/generated-types.ts
git commit -m "chore: regen Kysely types for telemetry tables"
```

### Task A2: Drop the `as Kysely<any>` cast in `telemetryDb.ts`

**Files:**
- Modify: `server/src/lib/telemetryDb.ts`

- [ ] **Step 1: Remove the `anyDb` cast**

Find the top of `server/src/lib/telemetryDb.ts`:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyDb = db as Kysely<any>;
```

Replace with `db` directly. Update all three call sites (`recordError`, `recordOpTiming`, `recordConsumerEvent`) to use `db` instead of `anyDb`. Remove the unused `Kysely` import.

- [ ] **Step 2: Type-check**

```bash
cd server && npm run build
```

Expected: clean build. Any error here means the migration didn't apply or the codegen ran against the wrong DB — check minikube context and re-run A1.

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/telemetryDb.ts
git commit -m "refactor(telemetry): drop Kysely<any> cast now that types are generated"
```

### Task A3: Extend `RequestContext` with `actorKind: "agent"` and `scope`

**Files:**
- Modify: `server/src/lib/requestContext/types.ts`
- Modify: `server/src/mcp/context.ts`

- [ ] **Step 1: Update `requestContext/types.ts`**

In `server/src/lib/requestContext/types.ts`, find the `actorKind` union and extend it:

```ts
actorKind: "user" | "ai" | "agent" | "system";
```

Add an optional field for the agent identity and the access scope:

```ts
agentId?: string;        // present only when actorKind === "agent"
mcpScope?: "read" | "readwrite";  // present on MCP requests
```

- [ ] **Step 2: Update `mcp/context.ts` `RequestContext` shape**

Add the same two optional fields to the MCP-specific `RequestContext` type. Confirm callers don't need updating (they consume the extended type read-only).

- [ ] **Step 3: Type-check and commit**

```bash
cd server && npm run build
git add server/src/lib/requestContext/types.ts server/src/mcp/context.ts
git commit -m "feat(context): add 'agent' actorKind and mcpScope to RequestContext"
```

---

## Phase B — `AgentApiKey` model + CLI scripts

### Task B1: Create the `AgentApiKey` Typegoose model

**Files:**
- Create: `server/src/models/AgentApiKey/index.ts`
- Create: `server/src/models/AgentApiKey/schema/index.ts`
- Create: `server/src/models/AgentApiKey/class/index.ts`
- Create: `server/src/models/AgentApiKey/class/static.ts`
- Modify: `server/src/models/index.ts` (add export)

- [ ] **Step 1: Create the schema**

`server/src/models/AgentApiKey/schema/index.ts`:

```ts
import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";

export type AgentScope = "read" | "readwrite";

@modelOptions({ schemaOptions: { collection: "agent-api-keys", timestamps: true } })
export class AgentApiKeySchema {
  @prop({ required: true, trim: true })
  public name!: string;

  /** First 8 chars of the raw key, indexed for O(1) lookup. */
  @prop({ required: true, index: true, unique: true })
  public keyPrefix!: string;

  /** bcrypt hash of the secret portion (everything after the prefix). */
  @prop({ required: true })
  public keyHash!: string;

  @prop({ required: true, enum: ["read", "readwrite"] })
  public scope!: AgentScope;

  @prop({ default: null })
  public lastUsedAt?: Date | null;

  @prop({ default: null })
  public revokedAt?: Date | null;
}

export const AgentApiKeyModel = getModelForClass(AgentApiKeySchema);
```

- [ ] **Step 2: Create the static methods**

`server/src/models/AgentApiKey/class/static.ts`:

```ts
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { AgentApiKeyModel, AgentApiKeySchema, AgentScope } from "../schema";

const PREFIX_LEN = 8;
const SECRET_LEN = 48;

export interface CreateKeyOpts {
  name: string;
  scope: AgentScope;
}

export interface CreateKeyResult {
  rawKey: string;       // ONLY returned at creation time — never stored
  doc: AgentApiKeySchema;
}

const randomHex = (bytes: number) => randomBytes(bytes).toString("hex");

const create = async (opts: CreateKeyOpts): Promise<CreateKeyResult> => {
  const prefix = randomHex(PREFIX_LEN / 2);     // 4 bytes → 8 hex chars
  const secret = randomHex(SECRET_LEN / 2);     // 24 bytes → 48 hex chars
  const rawKey = `agtkey_${prefix}_${secret}`;
  const keyHash = await bcrypt.hash(secret, 10);

  const doc = await AgentApiKeyModel.create({
    name: opts.name,
    keyPrefix: prefix,
    keyHash,
    scope: opts.scope,
  });

  return { rawKey, doc };
};

const verify = async (
  rawKey: string
): Promise<AgentApiKeySchema | null> => {
  const match = /^agtkey_([a-f0-9]{8})_([a-f0-9]{48})$/i.exec(rawKey);
  if (!match) return null;
  const [, prefix, secret] = match;

  const doc = await AgentApiKeyModel.findOne({ keyPrefix: prefix });
  if (!doc || doc.revokedAt) return null;

  const ok = await bcrypt.compare(secret, doc.keyHash);
  if (!ok) return null;

  // Fire-and-forget update of lastUsedAt
  AgentApiKeyModel.updateOne(
    { _id: (doc as unknown as { _id: unknown })._id },
    { $set: { lastUsedAt: new Date() } }
  ).catch(() => {});

  return doc;
};

const revoke = async (id: string): Promise<boolean> => {
  const res = await AgentApiKeyModel.updateOne(
    { _id: id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  return res.modifiedCount === 1;
};

export default { create, verify, revoke };
```

- [ ] **Step 3: Wire the class into the model**

`server/src/models/AgentApiKey/class/index.ts`:

```ts
import staticMethods from "./static";
export { staticMethods };
```

`server/src/models/AgentApiKey/index.ts`:

```ts
export * from "./schema";
export * as AgentApiKey from "./class/static";
```

- [ ] **Step 4: Re-export from the models barrel**

In `server/src/models/index.ts`, add:

```ts
export { AgentApiKeyModel, AgentApiKeySchema, AgentScope, AgentApiKey } from "./AgentApiKey";
```

- [ ] **Step 5: Type-check**

```bash
cd server && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add server/src/models/AgentApiKey server/src/models/index.ts
git commit -m "feat(models): add AgentApiKey for MCP agent credentials"
```

### Task B2: Test `AgentApiKey.verify` rejects revoked / malformed keys

**Files:**
- Create: `server/src/models/AgentApiKey/class/__tests__/static.test.ts`

> Per project memory: test files importing `@models` may fail to emit unless colocated under `src/models/*/class/`. This test colocates correctly.

- [ ] **Step 1: Write the test**

```ts
import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { AgentApiKey, AgentApiKeyModel } from "..";

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

beforeEach(async () => {
  await AgentApiKeyModel.deleteMany({});
});

describe("AgentApiKey.verify", () => {
  it("returns the doc for a valid key", async () => {
    const { rawKey, doc } = await AgentApiKey.create({ name: "t", scope: "read" });
    const verified = await AgentApiKey.verify(rawKey);
    expect(verified).not.toBeNull();
    expect(verified!.name).toBe(doc.name);
  });

  it("returns null for malformed keys", async () => {
    expect(await AgentApiKey.verify("not-a-key")).toBeNull();
    expect(await AgentApiKey.verify("agtkey_short_short")).toBeNull();
  });

  it("returns null for revoked keys", async () => {
    const { rawKey, doc } = await AgentApiKey.create({ name: "t", scope: "read" });
    await AgentApiKey.revoke((doc as unknown as { _id: { toString(): string } })._id.toString());
    expect(await AgentApiKey.verify(rawKey)).toBeNull();
  });

  it("returns null when secret is wrong", async () => {
    const { rawKey } = await AgentApiKey.create({ name: "t", scope: "read" });
    const tampered = rawKey.slice(0, -1) + (rawKey.endsWith("0") ? "1" : "0");
    expect(await AgentApiKey.verify(tampered)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd server && npm run test -- src/models/AgentApiKey
```

Expected: 4 passing tests.

- [ ] **Step 3: Commit**

```bash
git add server/src/models/AgentApiKey/class/__tests__/static.test.ts
git commit -m "test(AgentApiKey): cover verify happy path + revoked/malformed cases"
```

### Task B3: CLI script — create an agent key

**Files:**
- Create: `server/src/scripts/create-agent-key.ts`

- [ ] **Step 1: Write the script**

```ts
import "reflect-metadata";
import * as dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { AgentApiKey } from "@models";

if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
  dotenv.config({ path: path.join(__dirname, "..", "..", ".env.development") });
}

interface Args {
  name?: string;
  scope?: string;
}

const parseArgs = (): Args => {
  const out: Args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const flag = process.argv[i];
    const value = process.argv[i + 1];
    if (flag === "--name" && value) { out.name = value; i++; }
    else if (flag === "--scope" && value) { out.scope = value; i++; }
  }
  return out;
};

const main = async () => {
  const { name, scope } = parseArgs();
  if (!name) { console.error("Usage: --name <label> --scope <read|readwrite>"); process.exit(1); }
  if (scope !== "read" && scope !== "readwrite") {
    console.error("--scope must be 'read' or 'readwrite'");
    process.exit(1);
  }
  if (!process.env.MONGO_URI) { console.error("MONGO_URI env var required"); process.exit(1); }

  await mongoose.connect(process.env.MONGO_URI);

  const { rawKey, doc } = await AgentApiKey.create({ name, scope });

  console.log("");
  console.log("Created agent API key:");
  console.log(`  id:    ${(doc as unknown as { _id: { toString(): string } })._id.toString()}`);
  console.log(`  name:  ${doc.name}`);
  console.log(`  scope: ${doc.scope}`);
  console.log("");
  console.log("Raw key (copy now — it will not be shown again):");
  console.log(`  ${rawKey}`);
  console.log("");

  await mongoose.disconnect();
};

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Smoke-test against the dev cluster**

```bash
kubectl config current-context   # minikube
SERVER_POD=$(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $SERVER_POD -- ts-node src/scripts/create-agent-key.ts \
  --name "Test Read Agent" --scope read
```

Expected: prints id, name=Test Read Agent, scope=read, and a `agtkey_...` raw key.

- [ ] **Step 3: Commit**

```bash
git add server/src/scripts/create-agent-key.ts
git commit -m "feat(scripts): add create-agent-key CLI for minting MCP agent credentials"
```

### Task B4: CLI script — revoke an agent key

**Files:**
- Create: `server/src/scripts/revoke-agent-key.ts`

- [ ] **Step 1: Write the script**

```ts
import "reflect-metadata";
import * as dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { AgentApiKey, AgentApiKeyModel } from "@models";

if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
  dotenv.config({ path: path.join(__dirname, "..", "..", ".env.development") });
}

const main = async () => {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: revoke-agent-key.ts <id>");
    console.error("Tip: list keys with `db.agent-api-keys.find({}, { name: 1, keyPrefix: 1, scope: 1, revokedAt: 1 })`");
    process.exit(1);
  }
  if (!process.env.MONGO_URI) { console.error("MONGO_URI required"); process.exit(1); }

  await mongoose.connect(process.env.MONGO_URI);

  const ok = await AgentApiKey.revoke(id);
  if (!ok) {
    console.error(`No active key found with id=${id} (already revoked or wrong id)`);
    process.exit(1);
  }
  const doc = await AgentApiKeyModel.findById(id).lean();
  console.log(`Revoked: ${doc?.name} (id=${id}). Existing JWTs expire within 1h.`);

  await mongoose.disconnect();
};

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Commit**

```bash
git add server/src/scripts/revoke-agent-key.ts
git commit -m "feat(scripts): add revoke-agent-key CLI"
```

---

## Phase C — Auth endpoint and JWT branching

### Task C1: Add `POST /mcp/auth` endpoint

**Files:**
- Modify: `server/src/mcp-server.ts`

- [ ] **Step 1: Add the endpoint above the existing `/mcp` POST handler**

Insert into `server/src/mcp-server.ts`, after `app.use(express.json())`:

```ts
import { AgentApiKey } from "@models";
import createJWT from "@utils/createJWT";

const AGENT_JWT_TTL_SECONDS = 60 * 60; // 1h

app.post("/mcp/auth", async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }
  const rawKey = header.slice("Bearer ".length).trim();

  const doc = await AgentApiKey.verify(rawKey);
  if (!doc) {
    res.status(401).json({ error: "Invalid or revoked key" });
    return;
  }

  if (!process.env.JWT_SECRET) {
    res.status(500).json({ error: "Server misconfigured: missing JWT_SECRET" });
    return;
  }

  const token = createJWT(
    {
      agentId: (doc as unknown as { _id: { toString(): string } })._id.toString(),
      scope: doc.scope,
      sessionId: randomUUID(),
    },
    { expiresIn: AGENT_JWT_TTL_SECONDS }
  );

  res.json({ token, expiresIn: AGENT_JWT_TTL_SECONDS });
});
```

- [ ] **Step 2: Type-check and rebuild**

```bash
cd server && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add server/src/mcp-server.ts
git commit -m "feat(mcp): add POST /mcp/auth endpoint exchanging API key for short-lived JWT"
```

### Task C2: Update `POST /mcp` auth to branch on `userId` vs `agentId`

**Files:**
- Modify: `server/src/mcp-server.ts`

- [ ] **Step 1: Replace the existing JWT-decode block**

Find the block in `server/src/mcp-server.ts` that decodes the JWT and looks up the user. Replace its body so the JWT can carry either `userId` or `agentId`. Keep the existing user flow intact and add an agent branch:

```ts
let userId: string | undefined;
let agentId: string | undefined;
let scope: "read" | "readwrite" | undefined;

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
  if (decoded?.userId) {
    userId = decoded.userId;
  } else if (decoded?.agentId) {
    agentId = decoded.agentId;
    scope = decoded.scope === "readwrite" ? "readwrite" : "read";
  } else {
    res.status(401).json({ error: "Invalid token payload" });
    return;
  }
} catch {
  res.status(401).json({ error: "Invalid token" });
  return;
}

let role: UserRoles | undefined;
let actorKind: "ai" | "agent" = "ai";

if (userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  role = (user.role ?? UserRoles.User) as UserRoles;
  if (role < UserRoles.User) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
} else if (agentId) {
  // Confirm the underlying key wasn't revoked between JWT issuance and now.
  // Cheap MongoDB lookup; OK to keep on hot path because requests are infrequent.
  const doc = await AgentApiKeyModel.findById(agentId).lean();
  if (!doc || doc.revokedAt) {
    res.status(401).json({ error: "Agent key revoked" });
    return;
  }
  actorKind = "agent";
}
```

Update the `RequestContext` construction below to include the new fields:

```ts
const ctx: RequestContext = {
  traceId: inbound?.traceId ?? randomTraceId(),
  spanId: randomSpanId(),
  parentSpanId: inbound?.spanId,
  actorKind,
  userId,
  agentId,
  role,
  mcpScope: scope,
  tenderId,
  jobsiteId,
  conversationId,
};
```

Add the import for `AgentApiKeyModel` at the top of the file.

- [ ] **Step 2: Pass `scope` into `createMcpServer`**

Change the signature:

```ts
function createMcpServer(scope: "read" | "readwrite"): McpServer {
  // ...
  registerSearch(server, scope);
  registerFinancial(server, scope);
  registerProductivity(server, scope);
  registerOperational(server, scope);

  const tenderSessionState = makeTenderSessionState();
  registerTender(server, tenderSessionState, scope);

  return server;
}
```

And at the call site:

```ts
const effectiveScope: "read" | "readwrite" = scope ?? "readwrite";
// ^ default for human users (no scope claim) is full access
const server = createMcpServer(effectiveScope);
```

- [ ] **Step 3: Type-check (the tool `register` signatures will fail until Phase D)**

Expected: build will report missing arguments to `registerSearch`/`registerFinancial`/`registerProductivity`/`registerOperational`/`registerTender`. That's the next phase.

- [ ] **Step 4: Stub the registers temporarily so the branch compiles**

Quick scaffolding only — full classification happens in Task D2. In each of `search.ts`, `financial.ts`, `productivity.ts`, `operational.ts`, change the existing signature:

```ts
export function register(server: McpServer): void {
```

to:

```ts
export function register(
  server: McpServer,
  _scope: "read" | "readwrite" = "readwrite"
): void {
```

In `tender.ts`, change to:

```ts
export function register(
  server: McpServer,
  state: SessionState,
  _scope: "read" | "readwrite" = "readwrite"
): void {
```

This keeps current behavior identical — the next task adds real gating.

- [ ] **Step 5: Build + commit**

```bash
cd server && npm run build
git add server/src/mcp-server.ts server/src/mcp/tools/*.ts
git commit -m "feat(mcp): branch /mcp auth on userId vs agentId; thread scope into createMcpServer"
```

---

## Phase D — Tool scope enforcement

### Task D1: Add the access helper

**Files:**
- Create: `server/src/mcp/access.ts`

- [ ] **Step 1: Write the helper**

```ts
export type ToolScope = "read" | "readwrite";

/** True if the current scope permits exposing write-capable tools. */
export const canExposeWrite = (scope: ToolScope): boolean =>
  scope === "readwrite";
```

- [ ] **Step 2: Commit**

```bash
git add server/src/mcp/access.ts
git commit -m "feat(mcp): add scope helper for tool access guards"
```

### Task D2: Classify tools in `tender.ts` (the only file with writes)

**Files:**
- Modify: `server/src/mcp/tools/tender.ts`

`search.ts`, `financial.ts`, `productivity.ts`, `operational.ts` are read-only and need no per-tool gating beyond the scaffolded signature change in C2.4. `tender.ts` has both reads and writes (snapshot creation/updates are writes).

- [ ] **Step 1: Tool inventory (verified at plan time)**

Reads (always register): `search_tenders`, `get_tender_pricing_rows`, `list_document_pages`, `read_document`.

Writes (gate behind `canExposeWrite`): `create_pricing_rows`, `update_pricing_rows`, `delete_pricing_rows`, `reorder_pricing_rows`, `save_tender_note`, `delete_tender_note`.

Verify the list is still accurate before editing:

```bash
grep -nE 'registerInstrumented\(' server/src/mcp/tools/tender.ts
```

Each `registerInstrumented(server, "<name>", ...)` call — confirm the name matches one of the lists above. If a new tool has been added since this plan was written, classify it conservatively as write unless it's clearly a pure read.

- [ ] **Step 2: Gate write tools behind `canExposeWrite`**

In `server/src/mcp/tools/tender.ts`:

1. Add `import { canExposeWrite, type ToolScope } from "../access";` at the top.
2. Change `register` signature to accept the real scope parameter (drop the underscore prefix):

   ```ts
   export function register(
     server: McpServer,
     state: SessionState,
     scope: ToolScope = "readwrite"
   ): void {
   ```

3. Wrap each write-tool registration individually. The reads and writes are interleaved (reads at lines ~138, ~199, ~730, ~768; writes at ~275, ~385, ~566, ~614, ~665, ~700), so wrap each write block individually rather than using one big `if`:

   ```ts
   if (canExposeWrite(scope)) {
     registerInstrumented(server, "create_pricing_rows", /* ...existing config... */);
   }
   ```

   Apply the same wrapping around `update_pricing_rows`, `delete_pricing_rows`, `reorder_pricing_rows`, `save_tender_note`, and `delete_tender_note`. Leave the four read tools (`search_tenders`, `get_tender_pricing_rows`, `list_document_pages`, `read_document`) unwrapped.

- [ ] **Step 3: Spot-confirm `search.ts` / `financial.ts` / `productivity.ts` / `operational.ts` are read-only**

```bash
grep -E "InsertInto|UpdateOne|FindOneAndUpdate|deleteOne|create\(|save\(" \
  server/src/mcp/tools/search.ts \
  server/src/mcp/tools/financial.ts \
  server/src/mcp/tools/productivity.ts \
  server/src/mcp/tools/operational.ts
```

Expected: no matches. If matches appear, that file also needs `canExposeWrite` gating — apply the same pattern.

- [ ] **Step 4: Build, manual test, commit**

```bash
cd server && npm run build
# Manual sanity check:
#   1. mint a read key with create-agent-key
#   2. POST /mcp/auth → JWT
#   3. POST /mcp `tools/list` with that JWT → should NOT include tender write tools
#   4. mint a readwrite key, repeat → should include write tools
git add server/src/mcp/tools/tender.ts
git commit -m "feat(mcp): gate tender write tools behind readwrite scope"
```

### Task D3: Test scope filtering

**Files:**
- Create: `server/src/mcp/__tests__/scope.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from "vitest";
import { canExposeWrite } from "../access";

describe("canExposeWrite", () => {
  it("permits writes only at readwrite scope", () => {
    expect(canExposeWrite("read")).toBe(false);
    expect(canExposeWrite("readwrite")).toBe(true);
  });
});
```

> A higher-level integration test that mints both scopes and checks `tools/list` would be ideal but requires spinning up the full MCP transport. Defer to manual verification in Task D2.4 for v1.

- [ ] **Step 2: Run, commit**

```bash
cd server && npm run test -- src/mcp/__tests__/scope.test.ts
git add server/src/mcp/__tests__/scope.test.ts
git commit -m "test(mcp): scope helper unit test"
```

---

## Phase E — Telemetry MCP tools (Phase 3 of original plan)

### Task E1: Create `server/src/mcp/tools/telemetry.ts` with four read-only tools

**Files:**
- Create: `server/src/mcp/tools/telemetry.ts`
- Modify: `server/src/mcp-server.ts` (register import + call)

- [ ] **Step 1: Write the tool file**

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sql } from "kysely";
import { db } from "../../db";
import type { ToolScope } from "../access";

const HOURS_INPUT = z.object({
  hours: z.number().int().positive().max(24 * 7).default(24),
});

const SLOW_OPS_INPUT = HOURS_INPUT.extend({
  thresholdMs: z.number().int().positive().default(1000),
});

const jsonResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function register(
  server: McpServer,
  _scope: ToolScope = "readwrite"
): void {
  // All telemetry tools are read; no scope gating needed.

  server.registerTool(
    "get_error_summary",
    {
      description:
        "Server-side error counts grouped by source (graphql/consumer/logger/unhandled) over a time window. Returns total count, breakdown by source, and the top 10 most frequent error messages.",
      inputSchema: HOURS_INPUT.shape,
    },
    async ({ hours }) => {
      const since = new Date(Date.now() - hours * 3600_000);
      const [total, bySource, topMessages] = await Promise.all([
        db
          .selectFrom("telemetry_errors")
          .where("occurred_at", ">=", since)
          .select(sql<number>`count(*)::int`.as("count"))
          .executeTakeFirst(),
        db
          .selectFrom("telemetry_errors")
          .where("occurred_at", ">=", since)
          .select(["source", sql<number>`count(*)::int`.as("count")])
          .groupBy("source")
          .orderBy("count", "desc")
          .execute(),
        db
          .selectFrom("telemetry_errors")
          .where("occurred_at", ">=", since)
          .select(["error_message", sql<number>`count(*)::int`.as("count")])
          .groupBy("error_message")
          .orderBy("count", "desc")
          .limit(10)
          .execute(),
      ]);

      return jsonResult({
        windowHours: hours,
        total: total?.count ?? 0,
        bySource,
        topMessages,
      });
    }
  );

  server.registerTool(
    "get_slow_operations",
    {
      description:
        "GraphQL operations slower than thresholdMs in the time window. Returns p50, p95, max, and count per operation.",
      inputSchema: SLOW_OPS_INPUT.shape,
    },
    async ({ hours, thresholdMs }) => {
      const since = new Date(Date.now() - hours * 3600_000);
      const rows = await db
        .selectFrom("telemetry_op_timings")
        .where("recorded_at", ">=", since)
        .where("duration_ms", ">=", thresholdMs)
        .select([
          "operation_name",
          sql<number>`count(*)::int`.as("count"),
          sql<number>`percentile_cont(0.5) within group (order by duration_ms)::int`.as("p50"),
          sql<number>`percentile_cont(0.95) within group (order by duration_ms)::int`.as("p95"),
          sql<number>`max(duration_ms)::int`.as("max"),
        ])
        .groupBy("operation_name")
        .orderBy("p95", "desc")
        .limit(50)
        .execute();

      return jsonResult({ windowHours: hours, thresholdMs, operations: rows });
    }
  );

  server.registerTool(
    "get_consumer_health",
    {
      description:
        "RabbitMQ consumer event outcomes in the time window. Returns total events, error rate, and most common failing event types.",
      inputSchema: HOURS_INPUT.shape,
    },
    async ({ hours }) => {
      const since = new Date(Date.now() - hours * 3600_000);
      const [byStatus, topFailing] = await Promise.all([
        db
          .selectFrom("telemetry_consumer_events")
          .where("occurred_at", ">=", since)
          .select(["status", sql<number>`count(*)::int`.as("count")])
          .groupBy("status")
          .execute(),
        db
          .selectFrom("telemetry_consumer_events")
          .where("occurred_at", ">=", since)
          .where("status", "=", "error")
          .select(["event_type", sql<number>`count(*)::int`.as("count")])
          .groupBy("event_type")
          .orderBy("count", "desc")
          .limit(10)
          .execute(),
      ]);

      const total = byStatus.reduce((acc, r) => acc + r.count, 0);
      const errors = byStatus.find((r) => r.status === "error")?.count ?? 0;
      const errorRate = total > 0 ? errors / total : 0;

      return jsonResult({
        windowHours: hours,
        total,
        byStatus,
        errorRate: Number(errorRate.toFixed(4)),
        topFailing,
      });
    }
  );

  server.registerTool(
    "get_system_health",
    {
      description:
        "Composite health summary across errors, slow ops, and consumer events. Returns a single status: healthy/degraded/critical based on thresholds.",
      inputSchema: HOURS_INPUT.shape,
    },
    async ({ hours }) => {
      const since1h = new Date(Date.now() - 3600_000);
      const sinceWindow = new Date(Date.now() - hours * 3600_000);

      const [errors1h, errorsWindow, p95, consumerStats] = await Promise.all([
        db
          .selectFrom("telemetry_errors")
          .where("occurred_at", ">=", since1h)
          .select(sql<number>`count(*)::int`.as("count"))
          .executeTakeFirst(),
        db
          .selectFrom("telemetry_errors")
          .where("occurred_at", ">=", sinceWindow)
          .select(sql<number>`count(*)::int`.as("count"))
          .executeTakeFirst(),
        db
          .selectFrom("telemetry_op_timings")
          .where("recorded_at", ">=", sinceWindow)
          .select(
            sql<number>`percentile_cont(0.95) within group (order by duration_ms)::int`.as("p95")
          )
          .executeTakeFirst(),
        db
          .selectFrom("telemetry_consumer_events")
          .where("occurred_at", ">=", sinceWindow)
          .select([
            sql<number>`count(*) filter (where status = 'error')::int`.as("errors"),
            sql<number>`count(*)::int`.as("total"),
          ])
          .executeTakeFirst(),
      ]);

      const consumerErrorRate =
        consumerStats && consumerStats.total > 0
          ? consumerStats.errors / consumerStats.total
          : 0;

      let status: "healthy" | "degraded" | "critical" = "healthy";
      if ((errors1h?.count ?? 0) > 0 || consumerErrorRate > 0.05) {
        status = "critical";
      } else if (
        (errorsWindow?.count ?? 0) > 0 ||
        (p95?.p95 ?? 0) > 3000 ||
        consumerErrorRate > 0.02
      ) {
        status = "degraded";
      }

      return jsonResult({
        status,
        windowHours: hours,
        errorsLastHour: errors1h?.count ?? 0,
        errorsInWindow: errorsWindow?.count ?? 0,
        p95DurationMs: p95?.p95 ?? null,
        consumerErrorRate: Number(consumerErrorRate.toFixed(4)),
      });
    }
  );
}
```

- [ ] **Step 2: Wire into the MCP server**

In `server/src/mcp-server.ts`:

```ts
import { register as registerTelemetry } from "./mcp/tools/telemetry";

// ...inside createMcpServer:
registerTelemetry(server, scope);
```

- [ ] **Step 3: Manual smoke-test**

Mint a read-scope key, exchange for JWT, then call `tools/list` and `tools/call` via curl or your agent client. Verify `get_system_health` returns a structured JSON payload.

- [ ] **Step 4: Commit**

```bash
git add server/src/mcp/tools/telemetry.ts server/src/mcp-server.ts
git commit -m "feat(mcp): add telemetry tools (error summary, slow ops, consumer health, system health)"
```

---

## Phase F — Consumer instrumentation (Phase 2c of original plan)

### Task F1: Wrap `SyncHandler.handle()` to record consumer events

**Files:**
- Modify: `server/src/consumer/handlers/base.ts`

- [ ] **Step 1: Update the handler base**

Add the import at the top:

```ts
import { recordConsumerEvent } from "@lib/telemetryDb";
```

Wrap the existing logic in `handle(message)` so success/error/duration get recorded:

```ts
async handle(message: SyncMessage): Promise<void> {
  const { mongoId, action } = message;
  const eventType = `${this.entityName}.${action}`;
  const start = Date.now();

  console.log(`[${this.entityName}Sync] Processing ${action} for ${mongoId}`);

  try {
    if (action === "deleted") {
      await this.handleDelete(mongoId);
      console.log(
        `[${this.entityName}Sync] Successfully handled deletion for ${mongoId}`
      );
      recordConsumerEvent({
        eventType,
        status: "ok",
        durationMs: Date.now() - start,
      }).catch(() => {});
      return;
    }

    const doc = await this.fetchFromMongo(mongoId);
    if (!doc) {
      console.warn(`[${this.entityName}Sync] ${mongoId} not found in MongoDB`);
      recordConsumerEvent({
        eventType,
        status: "ok",
        durationMs: Date.now() - start,
        metadata: { skipped: "not_found" },
      }).catch(() => {});
      return;
    }

    if (!this.validate(doc)) {
      console.warn(
        `[${this.entityName}Sync] ${mongoId} failed validation, skipping`
      );
      recordConsumerEvent({
        eventType,
        status: "ok",
        durationMs: Date.now() - start,
        metadata: { skipped: "validation" },
      }).catch(() => {});
      return;
    }

    await this.syncToPostgres(doc);
    console.log(`[${this.entityName}Sync] Successfully synced ${mongoId}`);
    recordConsumerEvent({
      eventType,
      status: "ok",
      durationMs: Date.now() - start,
    }).catch(() => {});
  } catch (error) {
    console.error(
      `[${this.entityName}Sync] Failed to process ${mongoId}:`,
      error
    );
    recordConsumerEvent({
      eventType,
      status: "error",
      durationMs: Date.now() - start,
      errorMessage: error instanceof Error ? error.message : String(error),
      metadata: { mongoId },
    }).catch(() => {});
    throw error;
  }
}
```

- [ ] **Step 2: Build + smoke test**

```bash
cd server && npm run build
```

Trigger a daily-report save in the dev UI; check for a row in `telemetry_consumer_events`:

```bash
PG_POD=$(kubectl get pods -l app=postgres -o jsonpath='{.items[0].metadata.name}')
kubectl exec $PG_POD -- psql -U postgres -d bowmark_reports_paving \
  -c "SELECT event_type, status, duration_ms, occurred_at FROM telemetry_consumer_events ORDER BY id DESC LIMIT 5;"
```

Expected: at least one `*.created` or `*.updated` row with `status = 'ok'`.

- [ ] **Step 3: Commit**

```bash
git add server/src/consumer/handlers/base.ts
git commit -m "feat(consumer): instrument SyncHandler with telemetry_consumer_events writes"
```

---

## Phase G — Cleanup, docs, deployment

### Task G1: Document new env vars in CLAUDE.md and runbook

**Files:**
- Modify: `CLAUDE.md` (replace stale Hermes references; add new env vars)
- Create: `docs/runbooks/mcp-agent-keys.md`

- [ ] **Step 1: Add new env vars to CLAUDE.md**

In the "Environment Variables" section of `CLAUDE.md`, add:

```
- `TELEGRAM_ALERT_CHAT_ID` - Telegram chat for critical-op alerts (used by telemetryDb.sendTelegramAlert)
- `JWT_SECRET` - already exists; now also signs MCP agent JWTs
```

Also remove or update the "Agent Context & Knowledge Sync" section, which references Hermes — replace it with a note that plans live in `docs/plans/`, specs in `docs/specs/`, runbooks in `docs/runbooks/`.

- [ ] **Step 2: Write the agent-key runbook**

`docs/runbooks/mcp-agent-keys.md`:

```markdown
# MCP Agent API Keys

Bow-mark's MCP server (port 8081) supports two principal types: human users (JWT from password login) and external agents (JWT from API-key exchange). This runbook covers the agent flow.

## Mint a key

```bash
SERVER_POD=$(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $SERVER_POD -- ts-node src/scripts/create-agent-key.ts \
  --name "<descriptive-label>" --scope <read|readwrite>
```

The script prints the raw key **once**. Store it in the agent's secret manager — it cannot be recovered.

## Use the key

The agent should:

1. POST `/mcp/auth` with `Authorization: Bearer <raw-key>` → `{ token, expiresIn }`.
2. Cache the JWT in memory.
3. Use the JWT as `Authorization: <jwt>` (no `Bearer` prefix — matches existing /mcp behavior) on POST `/mcp` and subsequent SSE/DELETE calls.
4. Refresh ~50 minutes into the 60-minute lifetime by calling `/mcp/auth` again.

## Revoke a key

```bash
kubectl exec -it $SERVER_POD -- ts-node src/scripts/revoke-agent-key.ts <id>
```

Existing JWTs continue to work for at most 1 hour; new exchanges fail immediately.

## Scope semantics

- `read`: agent can list and call read-only tools across search/financial/productivity/operational/telemetry. Tender write tools are not registered for read-only sessions.
- `readwrite`: full access to all tools, including tender write operations. Use sparingly.

## Multiple instances

Bow-mark runs as separate paving + concrete deployments, each with its own MCP server. Mint one key per instance per agent. Agent should hold both keys and fan out as needed.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/runbooks/mcp-agent-keys.md
git commit -m "docs: document MCP agent keys + new TELEGRAM_ALERT_CHAT_ID env var"
```

### Task G2: Add `TELEGRAM_ALERT_CHAT_ID` to k8s ConfigMap / Secret

**Files:**
- Modify: appropriate k8s manifest (likely `k8s/api-deployment.yaml` or a Secret manifest)

- [ ] **Step 1: Locate the existing Telegram config**

```bash
grep -rn "TELEGRAM_BOT_TOKEN" k8s/ k8s-dev/ 2>/dev/null
```

- [ ] **Step 2: Add `TELEGRAM_ALERT_CHAT_ID` next to it**

If `TELEGRAM_BOT_TOKEN` lives in a Secret, add `TELEGRAM_ALERT_CHAT_ID` to the same Secret. If it lives in a ConfigMap, add to that. The value is a Telegram chat id (positive integer for DM, negative for group). Ask the user for the value before applying — don't guess.

- [ ] **Step 3: Apply and verify**

```bash
kubectl config current-context   # confirm minikube
kubectl apply -f <manifest>
kubectl rollout restart deploy/server
```

Trigger a critical-op error in dev (mutate a daily report with bad input) and confirm the Telegram alert fires.

- [ ] **Step 4: Commit**

```bash
git add <manifest>
git commit -m "ops: add TELEGRAM_ALERT_CHAT_ID to deployment config"
```

---

## Self-review checklist

Before declaring done:

- [ ] Branch builds clean: `cd server && npm run build`
- [ ] All new tests pass: `cd server && npm run test -- src/models/AgentApiKey src/mcp/__tests__`
- [ ] Manual: read-scope key cannot see tender write tools in `tools/list`
- [ ] Manual: readwrite-scope key sees all tools including tender writes
- [ ] Manual: revoked key returns 401 from `/mcp/auth`
- [ ] Manual: in-flight JWT continues to work after revocation (until expiry) — by design
- [ ] Telemetry tools (`get_system_health`) return data after a few real GraphQL calls + consumer events
- [ ] No stray `as Kysely<any>` casts remain in `server/src/lib/`

## Out of scope (parking lot)

These were in the original plan but are **not** part of this branch:

- HTTP `/api/developer/health-summary` endpoint (Phase 4) — superseded by direct MCP access; agent talks MCP, not HTTP.
- Daily Hermes cron (Phase 5 Tier 2) — moved to the new agent's responsibility, not bow-mark's.
- Per-agent telemetry attribution column (`agent_id` on `telemetry_errors`) — leave for v2 once we have multiple agents and need to slice errors by which agent triggered them.
- Auto-rotation of agent keys — manual rotation via revoke + recreate is fine for v1.
