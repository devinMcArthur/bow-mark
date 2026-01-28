# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack construction/paving jobsite management application (monorepo). Supports multiple app instances (Paving and Concrete) from the same codebase. Features material tracking, employee work tracking, daily reports, invoicing, and document management.

## Development Commands

### Local Development

```bash
# Start full environment with Skaffold (recommended)
./scripts/dev-start.sh

# Stop environment
./scripts/dev-stop.sh

# Alternative: Docker Compose
docker-compose up
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
./scripts/restore-dump.sh    # Restore from committed dump
./scripts/seed-from-atlas.sh # Initial seed from Atlas (requires ATLAS_URI)
```

## Architecture

### Backend (`/server/src`)

- **GraphQL API** using Apollo Server + Type-GraphQL with Typegoose decorators
- **Dual database**: MongoDB (Mongoose/Typegoose) for documents, PostgreSQL (Kysely) for SQL workloads
- **Path aliases**: `@models`, `@graphql/*`, `@utils/*`, `@workers`, `@events`, `@pubsub`, `@logger`, `@search`, etc.
- **Key directories**:
  - `models/` - Typegoose MongoDB schemas
  - `graphql/resolvers/` - 40+ feature resolvers (Company, Crew, DailyReport, Employee, Jobsite, Material, Vehicle, Invoice, etc.)
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

- **Development**: Skaffold with Minikube for local Kubernetes
- **Production**: DigitalOcean Kubernetes with Nginx Ingress + Cert-Manager
- **CI/CD**: CircleCI builds Docker images to Docker Hub
- **Services**: MongoDB, PostgreSQL, Redis, Meilisearch, RabbitMQ

## Database Workflow

Branch-specific MongoDB data is supported. Live data in `dev-data/mongodb/` (gitignored), committable snapshots in `dev-data/mongodb-dump/`. When switching branches with schema changes, run `./scripts/restore-dump.sh` after checkout.

## Environment Variables

Key production secrets (see README.md for full list):
- `MONGO_URI`, `JWT_SECRET` - Core auth/db
- `SPACES_*` - DigitalOcean Spaces (file storage)
- `SEARCH_HOST`, `SEARCH_API_KEY` - Meilisearch
- `EMAIL_*` - SMTP configuration
- `APP_TYPE` - "api" or "worker" for server mode
