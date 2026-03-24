# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack construction/paving jobsite management application (monorepo). Supports multiple app instances (Paving and Concrete) from the same codebase. Features material tracking, employee work tracking, daily reports, invoicing, and document management.

## Development Commands

### Local Development

```bash
# Start full environment with Tilt (recommended)
eval $(minikube docker-env)  # Use minikube's docker daemon
tilt up                       # Dashboard at http://localhost:10350

# Stop environment
tilt down

# Alternative: Skaffold (legacy)
skaffold dev
```

### kubectl Context Safety

**ALWAYS verify the kubectl context before running any kubectl command.** Using the wrong context can affect production.

```bash
kubectl config current-context   # verify before every kubectl command
kubectl config use-context minikube          # switch to dev
kubectl config use-context <do-tor-context>  # switch to production
```

| Context | Environment |
|---------|-------------|
| `minikube` | Local development |
| `do-tor...` | Production (DigitalOcean Toronto) |

### Checking Service Health During Development

**Always check k8s pod logs after making server-side changes** to confirm the server started successfully. A TypeScript compile error or runtime crash will show up here, not in the local terminal.

```bash
# Check pod status
kubectl get pods

# Tail server logs (replace pod name with current)
kubectl logs -f $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}')

# Quick one-liner to check for errors
kubectl logs $(kubectl get pods -l app=server -o jsonpath='{.items[0].metadata.name}') --tail=30
```

The server runs with `nodemon` + `ts-node` in dev, so TypeScript errors surface as crash loops. If the pod is in `CrashLoopBackOff` or logs show `TSError`, fix the compile error before continuing.

### Server (`/server`)

```bash
npm run start:dev       # Dev server with hot-reload
npm run build           # Compile TypeScript
npm run test            # Run Jest tests
npm run test -- path/to/test.ts  # Run single test file
npm run lint            # ESLint + Prettier check
npm run prettier:fix    # Auto-fix formatting
npm run db:migrate      # Run Postgres migrations + generate types
```

### Client (`/client`)

```bash
npm run dev             # Next.js dev server (port 3000)
npm run build           # Production build
npm run codegen         # Generate GraphQL types from schema
npm run type-check      # TypeScript check without emit
npm run lint            # ESLint + Next.js lint
```

### Database Management

```bash
./scripts/save-db-state.sh   # Dump MongoDB for committing
./scripts/seed-from-atlas.sh # Initial seed from Atlas (requires ATLAS_URI)

# In Tilt UI (http://localhost:10350):
# - restore-mongo: Auto-runs on startup if DB is empty
# - restore-mongo-force: Manual trigger to wipe and restore
# - save-db-state: Dump current state
```

## Architecture

### Backend (`/server/src`)

- **GraphQL API** using Apollo Server + Type-GraphQL with Typegoose decorators
- **Dual database**: MongoDB (Mongoose/Typegoose) for documents, PostgreSQL (Kysely) for reporting/analytics
- **RabbitMQ consumer** syncs MongoDB changes to PostgreSQL star schema for reporting
- **Path aliases**: `@models`, `@graphql/*`, `@utils/*`, `@workers`, `@events`, `@pubsub`, `@logger`, `@search`, etc.
- **Key directories**:
  - `models/` - Typegoose MongoDB schemas
  - `graphql/resolvers/` - Feature resolvers (Company, Crew, DailyReport, Employee, Jobsite, Material, Vehicle, Invoice, etc.)
  - `consumer/` - RabbitMQ consumer for PostgreSQL sync
  - `rabbitmq/` - RabbitMQ connection, publishers, config
  - `workers/` - Background job processors for report generation
  - `search/` - Meilisearch integration
  - `db/` - PostgreSQL connection and Kysely query builders

### Frontend (`/client/src`)

- **Next.js 12** with React 17, Chakra UI
- **Apollo Client** with GraphQL Code Generator for type-safe queries
- **Key directories**:
  - `pages/` - Next.js routing
  - `components/` - React components
  - `forms/` - Form components with React Hook Form + Zod/Yup
  - `generated/` - Auto-generated GraphQL types (run `npm run codegen`)

### Infrastructure

- **Development**: Tilt with Minikube for local Kubernetes (see `Tiltfile`)
- **Production**: DigitalOcean Kubernetes with Nginx Ingress + Cert-Manager
- **CI/CD**: GitHub Actions (`.github/workflows/`) — see below
- **Services**: MongoDB, PostgreSQL, RabbitMQ, Meilisearch

### CI/CD (GitHub Actions)

Two workflows, two branches:

| Branch | Workflow | What it does |
|--------|----------|--------------|
| `master` | `ci.yml` | Builds server + paving client + concrete client images in parallel, pushes to Docker Hub as `:$SHA`. Warms the layer cache. |
| `production` | `build-deploy.yml` | Checks if `:$SHA` images already exist on Docker Hub. If yes, re-tags as `:latest` instantly. If no, full parallel build. Then deploys to DigitalOcean k8s via `doctl` + `kubectl`. |

**Why two client images, one server?**
`NEXT_PUBLIC_*` vars are baked into the JS bundle at webpack build time — they
can't change at runtime. The server reads `process.env` at runtime, so one
image works for both paving and concrete (k8s ConfigMap injects `MONGO_URI`,
`POSTGRES_DB`, `APP_NAME` per deployment).

**To deploy to production:**
```bash
# 1. Push to master first (triggers CI image build)
git push origin master

# 2. Open a PR from master → production (triggers deploy once merged)
gh pr create --base production --head master --title "..." --body "..."
```

**Required GitHub repository secrets:** `DOCKERHUB_USERNAME`, `DOCKERHUB_PASS`,
`DO_API_TOKEN`, `DO_CLUSTER` — see README.md for details.

### Data Sync Architecture

MongoDB → RabbitMQ → Consumer → PostgreSQL (star schema)

- Mongoose post-save hooks publish events to RabbitMQ
- Consumer process transforms and syncs to PostgreSQL reporting tables
- See `db/migrations/` for PostgreSQL schema (dimensions + fact tables)

## Code Organization

### File Size and Separation

Keep files focused and navigable. When a file grows beyond ~300 lines, consider whether it contains multiple distinct concerns that belong in separate files.

**Extract when a unit is independently reusable or testable:**
- Shared types used across multiple files → `types.ts` (or colocated `types.ts` per feature folder)
- A React component with its own state and props → its own `.tsx` file
- A group of related functions serving a single domain → its own module

**Don't extract just for length:**
- A long file that is truly one cohesive concern (e.g. a complex form, a single resolver) is fine as-is
- Only extract to a shared file when the code is used in 2+ places; otherwise keep it colocated

**MCP tools pattern** (`server/src/mcp/tools/`):
- Each domain (`search`, `financial`, `productivity`, `operational`) lives in its own file
- Each file exports `register(server: McpServer): void`
- Shared SQL helpers go in `mcp/shared.ts`

**React components pattern** (`client/src/components/<Feature>/`):
- Types shared across the feature → `types.ts`
- Each distinct component → its own `.tsx` file
- The main page/container component imports from the above

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`.

## Environment Variables

Key production secrets (see README.md for full list):
- `MONGO_URI`, `JWT_SECRET` - Core auth/db
- `RABBITMQ_*` - RabbitMQ connection
- `POSTGRES_*` / `DATABASE_URL` - PostgreSQL connection
- `SPACES_*` - DigitalOcean Spaces (file storage)
- `SEARCH_HOST`, `SEARCH_API_KEY` - Meilisearch
- `EMAIL_*` - SMTP configuration
- `APP_TYPE` - "api" or "worker" for server mode
