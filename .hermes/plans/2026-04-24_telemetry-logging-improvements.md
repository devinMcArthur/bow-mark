# Telemetry & Logging Improvements
**Date:** 2026-04-24  
**Goal:** Production observability for field season — persistent error capture, structured performance data, and a daily Hermes health report delivered via Telegram.

---

## Context & Current State

| What exists | Status |
|---|---|
| Winston logger | Console-only. Logs live in k8s pod stdout — ephemeral, gone on restart |
| `lib/requestContext` | AsyncLocalStorage with traceId/spanId — solid foundation |
| `lib/opTiming.ts` | In-memory ring buffer of GraphQL timings — dev-only, not persisted |
| `winston-elasticsearch` | Installed, unused. Dead stack from earlier iteration. Ignore it. |
| PostgreSQL | Live, queryable, already has star schema — natural telemetry sink |
| MCP tools | Financial/operational/productivity/search/tender — no telemetry domain yet |

The core problem: everything interesting happens in-memory and disappears. If the server crashes at 2am, there's no record of what caused it.

---

## Proposed Approach

Use PostgreSQL as the telemetry sink — no new external services, no Datadog/Sentry accounts to manage in the field. Three new Postgres tables capture errors, slow ops, and consumer health. New MCP tools expose this data. A dedicated summary endpoint lets Hermes query it from outside the cluster. A daily Hermes cron sends you a Telegram digest.

---

## Phase 1: Postgres Telemetry Tables (Migration)

New migration: `db/migrations/YYYYMMDDHHMMSS_telemetry_tables.sql`

### `telemetry_errors`
Captures server-side errors with context.

```sql
CREATE TABLE telemetry_errors (
  id            BIGSERIAL PRIMARY KEY,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  source        TEXT NOT NULL,          -- 'graphql' | 'consumer' | 'worker' | 'mcp' | 'unhandled'
  operation     TEXT,                   -- GQL operation name or consumer queue name
  error_message TEXT NOT NULL,
  error_code    TEXT,                   -- GQL extensions.code if present
  trace_id      TEXT,                   -- from requestContext
  user_id       TEXT,                   -- if authenticated
  metadata      JSONB                   -- arbitrary extra context
);

CREATE INDEX idx_telemetry_errors_occurred ON telemetry_errors (occurred_at DESC);
CREATE INDEX idx_telemetry_errors_source   ON telemetry_errors (source, occurred_at DESC);

-- Auto-purge after 30 days (keep it lean)
-- Run via a cron in the DB or a cleanup job — see Phase 4 note
```

### `telemetry_op_timings`
Persists GraphQL operation timing samples (replaces/augments in-memory ring buffer).

```sql
CREATE TABLE telemetry_op_timings (
  id             BIGSERIAL PRIMARY KEY,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  operation_name TEXT NOT NULL,
  duration_ms    INTEGER NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('ok', 'error')),
  trace_id       TEXT
);

CREATE INDEX idx_telemetry_op_timings_recorded ON telemetry_op_timings (recorded_at DESC);
CREATE INDEX idx_telemetry_op_timings_op       ON telemetry_op_timings (operation_name, recorded_at DESC);
```

### `telemetry_consumer_events`
Tracks RabbitMQ consumer processing outcomes.

```sql
CREATE TABLE telemetry_consumer_events (
  id           BIGSERIAL PRIMARY KEY,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type   TEXT NOT NULL,    -- e.g. 'DailyReport.updated', 'Employee.created'
  status       TEXT NOT NULL CHECK (status IN ('ok', 'error', 'retry')),
  duration_ms  INTEGER,
  error_message TEXT,
  metadata     JSONB
);

CREATE INDEX idx_telemetry_consumer_occurred ON telemetry_consumer_events (occurred_at DESC);
CREATE INDEX idx_telemetry_consumer_status   ON telemetry_consumer_events (status, occurred_at DESC);
```

---

## Phase 2: Instrumentation (Server-side writes)

### 2a. Apollo Plugin — error capture + timing persistence

Extend the existing `opTimingPlugin` in `server/src/lib/opTiming.ts` (or create a separate `server/src/lib/telemetryPlugin.ts`):

- On `didEncounterErrors`: insert into `telemetry_errors` (source='graphql', operation name, error messages, trace_id from requestContext)
- On `willSendResponse`: insert into `telemetry_op_timings` if duration > threshold (e.g. all ops, or only >100ms to avoid noise — configurable)

Keep writes async (fire-and-forget with silent catch) — never let telemetry writes block a GQL response.

### 2b. Unhandled rejection + uncaught exception capture

In `server/src/index.ts` (or wherever the process bootstraps):

```ts
process.on('unhandledRejection', (reason) => {
  // insert into telemetry_errors, source='unhandled'
});
process.on('uncaughtException', (err) => {
  // insert into telemetry_errors, source='unhandled'
  // then exit(1) — this is correct, uncaughtException is fatal
});
```

### 2c. Consumer instrumentation

In `server/src/consumer/` — wrap each event handler in a try/catch that writes to `telemetry_consumer_events` on both success (status='ok') and failure (status='error'). Duration measured per-event.

### 2d. Winston transport

Upgrade `server/src/logger/index.ts` to add a second transport that writes `error`-level log calls to `telemetry_errors` (source='logger'). This means any existing `logger.error(...)` calls automatically become durable.

Keep console transport as-is — this is additive.

---

## Phase 3: MCP Telemetry Tools

New file: `server/src/mcp/tools/telemetry.ts`

Register in the MCP server alongside the existing domains.

### Tools:

**`get_error_summary`**  
- Input: `{ hours: number }` (default 24)  
- Returns: total error count, breakdown by source, top 10 most frequent error messages, any spikes vs prior equivalent window  

**`get_slow_operations`**  
- Input: `{ hours: number, thresholdMs: number }` (defaults: 24h, 1000ms)  
- Returns: operations exceeding threshold, p50/p95/max per operation, trend vs prior window  

**`get_consumer_health`**  
- Input: `{ hours: number }`  
- Returns: total events processed, error rate, most common failing event types  

**`get_system_health`**  
- Input: `{ hours: number }`  
- Composite tool: calls the above three internally, returns a structured summary with a `status: 'healthy' | 'degraded' | 'critical'` field based on thresholds:
  - critical: any errors in last hour, or error rate >5%
  - degraded: errors in last 6h, or p95 >3s, or consumer error rate >2%
  - healthy: otherwise

---

## Phase 4: Hermes-Accessible Summary Endpoint

The MCP tools above are for Claude Desktop / AI clients with MCP access. For Hermes to query from outside the cluster, we need an HTTP endpoint.

New route in `server/src/router/developer.ts` (or a new `server/src/router/telemetry.ts`):

```
GET /api/developer/health-summary?hours=24
Authorization: Bearer <TELEMETRY_SECRET>
```

Returns the same payload as `get_system_health`. Protected by a new env var `TELEMETRY_SECRET` — a simple static bearer token (no user auth, just keeps it from being public).

This endpoint is what the Hermes cron hits. Store `TELEMETRY_SECRET` in Hermes memory (or as a cron env var).

---

## Phase 5: Alerting — Two Tiers

### Tier 1: Immediate Alerts (real-time)

Critical operations where a failure means a foreman's work may not have saved. These fire a Telegram message immediately when an error is captured.

**Critical operations list:**
- `CreateDailyReport` / `UpdateDailyReport`
- `CreateEmployeeWork` / `UpdateEmployeeWork`
- `CreateVehicleWork` / `UpdateVehicleWork`
- `CreateMaterialShipment` / `UpdateMaterialShipment`
- Any consumer event of type `DailyReport.*`, `EmployeeWork.*`, `MaterialShipment.*`

> Scope intentionally narrow for v1. Expand to other domains (invoicing, trucking, etc.) in future iterations.

**Implementation:**  
In `telemetryDb.ts`, after writing to `telemetry_errors`, check if the operation is in the critical list. If yes, call the Hermes Telegram webhook immediately with a message like:

```
🚨 CRITICAL ERROR — bow-mark
Operation: CreateDailyReport
User: John Smith (john@company.com)
Error: "Validation failed: employee rate missing"
Time: 2026-05-14 09:32 AM MDT
Trace: abc123def
```

User name + email populated from a lookup against the `users` collection using the `user_id` from context. This lookup happens at write time so the alert is self-contained.

**Delivery mechanism:**  
POST to Hermes Telegram webhook URL (stored as env var `HERMES_WEBHOOK_URL` + `HERMES_WEBHOOK_SECRET`). Simple fire-and-forget HTTP call from the server — no dependency on Hermes being the caller.

### Tier 2: Daily Summary Cron (Hermes-initiated)

- Schedule: daily at 7:00 AM Mountain Time (13:00 UTC)
- Action: hit `GET /api/developer/health-summary?hours=24`
- Only sends if status is 'degraded' or 'critical'
- Includes: error counts by source, top error messages, slow op breakdown, consumer failure rate, list of affected users (name + email) for any errors in the window
- Toolset: `web` only

---

## Files to Change

```
db/migrations/
  YYYYMMDDHHMMSS_telemetry_tables.sql        NEW

server/src/
  lib/telemetryPlugin.ts                     NEW (Apollo plugin for GQL errors + timings)
  lib/telemetryDb.ts                         NEW (DB write helpers, fire-and-forget wrappers)
  logger/index.ts                            MODIFY (add Postgres transport for error level)
  consumer/index.ts (or per-handler file)    MODIFY (wrap handlers, write consumer events)
  mcp/tools/telemetry.ts                     NEW
  mcp/index.ts (or wherever register() is called)  MODIFY (register telemetry tools)
  router/developer.ts                        MODIFY (add /health-summary endpoint)
  index.ts (process bootstrap)               MODIFY (unhandledRejection/uncaughtException)
```

---

## Data Retention

To keep Postgres lean, purge old telemetry on a rolling basis. Options:
1. Postgres `pg_cron` extension (if available on DO)
2. A nightly cleanup job in the existing worker process
3. Manual — run a script every few months

Suggested retention: 30 days for errors, 14 days for op timings, 7 days for consumer events.

---

## Risks & Tradeoffs

| Risk | Mitigation |
|---|---|
| Telemetry writes slow down GQL responses | All writes are fire-and-forget async, errors silently swallowed |
| opTiming table grows large | Index on recorded_at + retention policy |
| TELEMETRY_SECRET leaked | Low-value target — read-only health data, rotate if needed |
| Consumer instrumentation adds noise | Only write on error by default, success writes optional |
| Missing errors before server fully boots | unhandledRejection catches async bootstrap errors |

---

## Decisions

| Question | Decision |
|---|---|
| Per-user error attribution | Yes — capture `user_id` on all errors. Lookup name + email at alert time for Telegram messages. |
| Slow op threshold | 2000ms — configurable later |
| Daily cron mode | Alerts-only — only sends Telegram message if status is degraded or critical |
| k8s pod health | Out of scope for now |

## Open Questions

None — ready for implementation.
