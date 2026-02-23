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
- **CI/CD**: CircleCI builds Docker images to Docker Hub
- **Services**: MongoDB, PostgreSQL, RabbitMQ, Meilisearch

### Data Sync Architecture

MongoDB → RabbitMQ → Consumer → PostgreSQL (star schema)

- Mongoose post-save hooks publish events to RabbitMQ
- Consumer process transforms and syncs to PostgreSQL reporting tables
- See `db/migrations/` for PostgreSQL schema (dimensions + fact tables)

## Environment Variables

Key production secrets (see README.md for full list):
- `MONGO_URI`, `JWT_SECRET` - Core auth/db
- `RABBITMQ_*` - RabbitMQ connection
- `POSTGRES_*` / `DATABASE_URL` - PostgreSQL connection
- `SPACES_*` - DigitalOcean Spaces (file storage)
- `SEARCH_HOST`, `SEARCH_API_KEY` - Meilisearch
- `EMAIL_*` - SMTP configuration
- `APP_TYPE` - "api" or "worker" for server mode
