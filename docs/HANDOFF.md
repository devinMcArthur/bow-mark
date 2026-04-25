# Project Handoff — 2026-04-24

## In-flight

- **feature/telemetry-logging** — branch exists on origin. Session 1 (Phase 1+2) complete and committed (`ba60af66`). Session 2 (Phase 3+4+5) not yet started.
  - Phase 1 done: `db/migrations/20260425120000_telemetry_tables.sql` — telemetry_errors, telemetry_op_timings, telemetry_consumer_events tables
  - Phase 2 done: `server/src/lib/telemetryDb.ts`, `server/src/lib/telemetryPlugin.ts`, logger transport, unhandled rejection handlers, wired into app.ts
  - Next: Session 2 — MCP telemetry tools (`server/src/mcp/tools/telemetry.ts`), health summary HTTP endpoint (`server/src/router/developer.ts`), then Hermes daily cron

## Pending

- **TELEGRAM_ALERT_CHAT_ID** env var — needs to be added to k8s secrets (production) and k8s-dev ConfigMap (dev). Value is Devin's Telegram user ID: 8765609720
- **Session 2 delegation** — ready to kick off. Full plan at `.hermes/plans/2026-04-24_telemetry-logging-improvements.md`
- **DB migration** — do NOT run yet, needs Session 2 complete first so everything ships together

## Cloud Hermes setup (completed 2026-04-24)

- Droplet: tor1, 143.110.213.39, `ssh hermes-agent`, $24/mo
- Container `hermes` running, restart:always, Telegram connected
- bow-mark repo at `/home/hermes/bow-mark` — always `git pull` before starting work
- Claude Code installed at `/usr/bin/claude`, wrapper at `/usr/local/bin/claude-auth`
- gh CLI authenticated as devinMcArthur
- Run scripts pattern: write to `/tmp/run-<task>.sh`, `scp` to droplet, `sudo -u hermes /tmp/run-<task>.sh`

## Recently shipped

- **Cloud Hermes** (2026-04-24) — persistent DigitalOcean droplet, Telegram gateway, bow-mark repo, Claude Code auth
- **Agent context sync conventions** (2026-04-24) — CLAUDE.md updated, plans committed to git, GitHub as sync mechanism
- **feat(telemetry) Phase 1+2** (2026-04-25) — DB migration + full server instrumentation on feature/telemetry-logging
