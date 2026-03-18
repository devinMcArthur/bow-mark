# Testing Suite Design

**Date:** 2026-03-18
**Status:** Approved for implementation

---

## Background and Goals

The app currently has a sparse test suite — approximately 2% coverage. Existing tests cover some GraphQL resolvers (happy paths only) and a few REST endpoints, but large swaths of the codebase are untested: permissions/auth enforcement, the MongoDB→PostgreSQL sync pipeline, and Kysely report queries.

The primary goals, in priority order:

1. **Reporting correctness** — The PostgreSQL reporting layer must be verified by tests. A sign error in a calculation went undetected for two years in a prior system. This cannot happen again.
2. **Permission enforcement** — Auth failures are silent. Tests must confirm what each role can and cannot access.
3. **GraphQL API coverage** — Significant coverage across all resolvers: happy paths, validation errors, and role-based authorization.

Frontend tests are explicitly out of scope for this phase.

---

## Guiding Principles

- **Test at the integration level, not unit level.** Test the behavior of the system through its real entry points (HTTP endpoints, sync handlers, query functions). Do not mock internal functions.
- **Never modify production code to make a failing test pass without explicit user approval.** A failing test may have found a real bug. The user decides whether to fix the code or adjust the test.
- **Seed data is part of the test suite.** The existing seed factories are intentionally minimal. Expanding them to cover the full domain is a first-class deliverable of this project.
- **Tests must be deterministic.** Use fixed IDs, fixed dates, and fixed numeric values so assertions never depend on ordering or timing.

---

## Test Layers

### Layer 1 — GraphQL API Tests (existing, significantly expanded)

**What is tested:** Every GraphQL query and mutation, tested via HTTP using supertest. Coverage dimensions per resolver:

- **Happy path** — valid input from an authorized user returns the correct result
- **Validation** — invalid inputs (bad IDs, missing required fields, out-of-range values) return appropriate GraphQL errors
- **Authorization** — each role that should have access can access the operation; each role that should not is rejected with a clear error

**Role matrix for authorization tests:**

| Role | Description |
|---|---|
| `User` (Foreman) | Field-level operations, limited write access |
| `ProjectManager` | Broader read access, some administrative writes |
| `Admin` | Full access |
| `Developer` | Developer tooling only |
| Unauthenticated | Should be rejected on all protected operations |

Currently only `Admin`, `User` (base_foreman_1), and `Developer` are seeded. A `ProjectManager` user must be added.

**Infrastructure:** MongoDB memory server only. No PostgreSQL needed for this layer.

---

### Layer 2 — Consumer Sync Tests (new)

**What is tested:** The transformation from MongoDB documents to PostgreSQL fact and dimension tables. This is the layer where the "minus instead of plus" class of bug lives.

**How it works:** Each consumer handler (`employeeWorkSyncHandler`, `vehicleWorkSyncHandler`, `materialShipmentSyncHandler`, `productionSyncHandler`, `invoiceSyncHandler`, `dailyReportSyncHandler`) exposes a `handle({ mongoId, action })` method. Tests:

1. Seed MongoDB with documents that have **mathematically explicit values** (e.g., employee worked from 7:00 AM to 3:00 PM = 8 hours, hourly rate = $25.00, expected labour cost = $200.00)
2. Call the handler directly: `await handler.handle({ mongoId, action: 'created' })`
3. Query the PostgreSQL fact table and assert the exact values written

**What is asserted per entity:**
- `fact_employee_work` — correct `daily_report_id`, `employee_id`, `crew_id`, `jobsite_id`, `work_date`, `start_time`, `end_time`, `hourly_rate`; rate lookup uses correct date-effective rate. Note: `hours` is a generated column derived from `start_time`/`end_time` — tests assert `start_time` and `end_time` directly, not a raw `hours` value.
- `fact_vehicle_work` — same structure, vehicle rate applied correctly
- `fact_material_shipment` — MaterialShipment sync is the most complex handler. It branches across three distinct paths and three fact tables:
  - **Costed material** (`noJobsiteMaterial=false`) → `fact_material_shipment`. Rate is looked up via `getMaterialShipmentRate` which itself branches across three cost types: `rate`, `deliveredRate`, and `invoice`.
  - **Non-costed material** (`noJobsiteMaterial=true`) → `fact_non_costed_material`
  - **Trucking** (when `vehicleObject.truckingRateId` is set) → `fact_trucking`

  The `invoice` cost type is the highest-risk calculation — it requires live queries against `Invoice` and `DailyReport` collections to resolve a rate, and needs an explicit test scenario with all related documents seeded. This is where a sign-error class of bug is most likely to hide.
- `fact_production` — quantity and type recorded correctly
- `fact_invoice` — amount, type, jobsite association correct
- Dimension tables (`dim_employee`, `dim_employee_rate`, `dim_crew`, `dim_jobsite`, `dim_daily_report`, `dim_vehicle`, `dim_vehicle_rate`, `dim_material`) — upsert creates on first sync, updates on subsequent sync, does not duplicate
- Delete/archive — `archived_at` is set, record is not removed

**Infrastructure:** MongoDB memory server + PostgreSQL test instance (via Testcontainers).

---

### Layer 3 — Report Query Tests (new)

**What is tested:** The Kysely report queries that produce the data shown to the executive team. These tests operate entirely within PostgreSQL — no MongoDB involved.

**How it works:**
1. Insert rows directly into PostgreSQL fact and dimension tables with known values
2. Call the report query function
3. Assert the aggregated result matches the hand-calculated expected value

Example: insert 3 `fact_employee_work` rows for the same jobsite with `start_time`/`end_time` pairs that total 22 hours, assert the report returns 22 hours of labour for that jobsite. (Do not attempt to insert `hours` directly — it is a generated column computed from `start_time` and `end_time`.)

This layer catches wrong JOINs, wrong aggregations, off-by-one date filters, and missing `WHERE` clauses that could cause data from one jobsite to bleed into another.

**Infrastructure:** PostgreSQL test instance only (via Testcontainers). MongoDB memory server not needed.

---

## Tooling

### Test Runner: Vitest

Replaces Jest + ts-jest. Reasons:

- **ts-jest is slow and brittle.** Vitest uses esbuild-based TypeScript transformation — no separate compilation step, significantly faster.
- **The API is compatible.** `describe`, `it`, `expect`, `beforeAll`, `afterAll`, `vi.fn()` — all work the same as Jest.
- **Better developer experience.** Watch mode, error output, and TypeScript support are all superior.
- The existing `jasmine2` test runner in `jest.config.js` is the previous generation. Vitest's runner is current.

The server's `jest.config.js` is replaced with `vitest.config.ts`. The `ts-jest`, `jest`, `@shelf/jest-mongodb` devDependencies are removed. The `@types/jest` dependency is replaced with the `globals: true` Vitest config option.

**Migration note:** The existing test files use `jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000` — a Jasmine-specific global that does not exist in Vitest. All occurrences must be replaced with `vi.setConfig({ testTimeout: 30000 })` or a per-suite `timeout` option. This must be audited across all existing test files before migration is complete.

**Path aliases:** The existing `jest.config.js` resolves `@models`, `@testing/*`, `@graphql/*`, etc. via `pathsToModuleNameMapper`. Vitest requires the `vite-tsconfig-paths` plugin in `vitest.config.ts` to replicate this. Without it, all path alias imports in test files will fail to resolve.

### Service Management: Testcontainers

Replaces any Docker Compose approach for test infrastructure. The `@testcontainers/postgresql` library manages the PostgreSQL container lifecycle from within the test setup code.

**Why Testcontainers over Docker Compose:**
- **Self-contained.** `npm run test` is the only command needed — no `docker compose up` prerequisite.
- **Identical locally and in CI.** No divergence between environments.
- **Automatic cleanup.** Containers start with the suite and are destroyed when it finishes.

Requires Docker to be running locally. In CI, Docker is available by default on GitHub Actions runners.

### MongoDB: mongodb-memory-server (unchanged)

Already works well. No change needed.

---

## PostgreSQL Test Setup

Two new files are added to `server/src/testing/`:

- `vitestDB.ts` — replaces `jestDB.ts`. Same MongoDB memory server setup, renamed for consistency.
- `vitestPgDB.ts` — new PostgreSQL/Testcontainers setup. Provides:

```
preparePgDatabase()     — starts a Testcontainer, runs migrations, returns connection info
disconnectAndStopPg()   — stops the container after the suite
truncateAllTables()     — truncates fact + dimension tables between tests for isolation
```

**Critical — db singleton initialization:** `server/src/db/index.ts` creates the Kysely `Pool` at module load time (top-level `new Pool({ ... })`). Node.js module caching means the pool is instantiated with whatever env vars exist at the time the module is first imported — setting env vars in `beforeAll` is too late.

The solution is Vitest's `globalSetup` option: a file that runs once before any test module is loaded. The Testcontainer is started there, the container's connection details are written to `process.env`, and only then do test modules (and therefore `db/index.ts`) get imported. The `vitest.config.ts` will specify this file via `globalSetup: ['./src/testing/vitestGlobalSetup.ts']`.

**Migrations:** Applied using `dbmate` (same tool used in production) before tests run. Migrations are in `db/migrations/` at the repo root. The `dbmate` command must be invoked with the path `../../db/migrations` relative to the server directory (matching the existing `db:migrate` script in `server/package.json`).

---

## Seeding Strategy

### MongoDB Seed Expansion

The current seed data is sparse by design — it was the minimum needed for existing tests. A substantial expansion is required:

**Users** (currently: Admin, Foreman, Developer)
- Add: `ProjectManager` user linked to an employee

**Crews** (currently: 1 crew)
- Add: at least 2 additional crews (e.g., a second base crew, a vehicle maintenance crew) to test cross-crew isolation in reports

**Employees** (currently: 8, only 1 has rates)
- Add rates to all employees with effective dates spanning multiple years — required for rate-lookup tests in consumer sync
- Add employees of each job title category

**Daily Reports** (currently: 5, most are empty shells)
- Add: reports with full populations — employee work, vehicle work, material shipments, productions — with known numeric values that can be asserted against
- Add: reports across multiple date ranges (multi-year span) for date-filter testing in report queries
- Add: reports on the same jobsite across different crews for cross-crew aggregation tests

**Invoices, Material Shipments, Productions**
- Expand with explicit monetary values and quantities so consumer sync assertions can check exact numbers

### PostgreSQL Seed (Layer 3 only)

For report query tests, seed data is inserted directly as raw SQL/Kysely inserts — not derived from MongoDB. Values are chosen to make assertions obvious:

```
Employee A: 8 hours @ $25/hr = $200
Employee B: 6 hours @ $30/hr = $180
Total labour: 14 hours, $380
```

This makes test failures immediately interpretable.

---

## CI Integration

A new `test` job is added to `.github/workflows/ci.yml` that runs before the Docker image builds. If tests fail, the build does not proceed.

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: server/package-lock.json
    - run: npm ci
      working-directory: server
    - run: npm run test
      working-directory: server
```

No PostgreSQL service block is needed — Testcontainers starts its own Docker container. Docker is available by default on GitHub Actions `ubuntu-latest` runners.

---

## Test File Organization

```
server/src/
  graphql/
    __tests__/              ← existing, expanded
      crewResolver.test.ts
      dailyReportResolver.test.ts
      employeeResolver.test.ts
      ... (all resolvers)
  router/
    __tests__/              ← existing, expanded
      conversationRating.test.ts
      developerRatings.test.ts
  consumer/
    __tests__/              ← new
      employeeWorkSync.test.ts
      vehicleWorkSync.test.ts
      materialShipmentSync.test.ts
      productionSync.test.ts
      invoiceSync.test.ts
      dailyReportSync.test.ts
      dimensions.test.ts
  db/
    __tests__/              ← new
      jobsiteReport.test.ts
      (one file per report query)
  testing/
    vitestDB.ts             ← renames jestDB.ts (MongoDB setup, same logic)
    vitestPgDB.ts           ← new (PostgreSQL/Testcontainers setup)
    vitestGlobalSetup.ts    ← new (starts PG Testcontainer before module load, sets env vars)
    seedDatabase.ts         ← significantly expanded
    documents/              ← expanded factories
```

---

## Out of Scope

- **Frontend tests** — React Testing Library / Vitest for client components. Deferred to a future cycle.
- **RabbitMQ plumbing tests** — Testing that messages are published and consumed is lower value than testing the transformation logic. Deferred.
- **End-to-end browser tests** — Playwright. Not needed to achieve the stated goals.
- **Performance/load testing** — Volume testing at scale. Not part of correctness testing.
