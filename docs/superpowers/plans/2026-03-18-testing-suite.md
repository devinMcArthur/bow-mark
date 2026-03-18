# Testing Suite Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a comprehensive, CI-integrated testing suite covering GraphQL API authorization, the MongoDB→PostgreSQL consumer sync pipeline, and Kysely report query correctness.

**Architecture:** Three test layers sharing a common Vitest + supertest foundation: HTTP-level GraphQL API tests (MongoDB memory server), consumer sync tests (MongoDB memory server + Testcontainers PostgreSQL), and report query tests (Testcontainers PostgreSQL only). All service lifecycle is managed in-process via libraries — no external `docker compose up` required.

**Tech Stack:** Vitest, vite-tsconfig-paths, @testcontainers/postgresql, supertest, mongodb-memory-server (existing), dbmate (existing)

**Spec:** `docs/superpowers/specs/2026-03-18-testing-suite-design.md`

---

## Chunk 1: Feature Branch + Vitest Migration

### Task 1: Create feature branch

**Files:**
- No file changes

- [ ] **Step 1: Create and check out feature branch**

```bash
git checkout -b feature/testing-suite
```

---

### Task 2: Swap Jest for Vitest

**Files:**
- Modify: `server/package.json`
- Create: `server/vitest.config.ts`
- Delete: `server/jest.config.js` (replaced by vitest.config.ts)

- [ ] **Step 1: Update package.json devDependencies**

Remove: `jest`, `ts-jest`, `@types/jest`, `@shelf/jest-mongodb`, `babel-jest`, `@babel/core`, `@babel/preset-env`, `@babel/preset-typescript`

Add:
```json
"vitest": "^2.0.0",
"@vitest/coverage-v8": "^2.0.0",
"vite-tsconfig-paths": "^5.0.0",
"@testcontainers/postgresql": "^10.0.0"
```

Update the `test` script:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Also update `server/tsconfig.json` — find the `"types"` array and remove `"jest"`, add `"vitest/globals"`. For example:
```json
// before
"types": ["jest", "node"]
// after
"types": ["vitest/globals", "node"]
```
Without this, TypeScript will error on `describe`, `it`, `expect`, etc. after `@types/jest` is removed.

- [ ] **Step 2: Create `server/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // The MCP SDK is ESM-only and incompatible with the CommonJS test
      // environment. Redirect to the existing mock used in jest.config.js.
      "@modelcontextprotocol/sdk/client/index.js": path.resolve(
        __dirname,
        "src/__mocks__/mcpSdk.ts"
      ),
      "@modelcontextprotocol/sdk/client/streamableHttp.js": path.resolve(
        __dirname,
        "src/__mocks__/mcpSdk.ts"
      ),
    },
  },
  test: {
    globals: true,
    environment: "node",
    // Match the existing jest.config.js timeout of 60s
    testTimeout: 60000,
    globalSetup: ["./src/testing/vitestGlobalSetup.ts"],
    // singleFork: all test files share one worker process, so db/index.ts is
    // loaded exactly once with the env vars set by globalSetup. Required for
    // the Kysely pool singleton to point at the Testcontainer.
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
```

- [ ] **Step 3: Delete `server/jest.config.js`**

- [ ] **Step 4: Run `npm install` in `server/`**

```bash
cd server && npm install
```

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/package-lock.json server/tsconfig.json server/vitest.config.ts
git rm server/jest.config.js
git commit -m "chore(test): replace Jest with Vitest"
```

---

### Task 3: Fix jasmine globals in existing test files

**Files:**
- Modify: `server/src/graphql/__tests__/crewResolver.test.ts`
- Modify: `server/src/graphql/__tests__/dailyReportResolver.test.ts`
- Modify: `server/src/graphql/__tests__/employeeResolver.test.ts`
- Modify: `server/src/graphql/__tests__/employeeWorkResolver.test.ts`
- Modify: `server/src/graphql/__tests__/invoiceResolver.test.ts`
- Modify: `server/src/graphql/__tests__/jobsiteMaterialResolver.test.ts`
- Modify: `server/src/graphql/__tests__/jobsiteResolver.test.ts`
- Modify: `server/src/graphql/__tests__/materialShipmentResolver.test.ts`
- Modify: `server/src/graphql/__tests__/reportNoteResolver.test.ts`
- Modify: `server/src/graphql/__tests__/signupResolver.test.ts`
- Modify: `server/src/graphql/__tests__/systemResolver.test.ts`
- Modify: `server/src/graphql/__tests__/userResolver.test.ts`
- Modify: `server/src/graphql/__tests__/vehicleResolver.test.ts`
- Modify: `server/src/graphql/__tests__/vehicleWorkResolver.test.ts`
- Modify: `server/src/router/__tests__/conversationRating.test.ts`
- Modify: `server/src/router/__tests__/developerRatings.test.ts`

- [ ] **Step 1: Delete `jasmine.DEFAULT_TIMEOUT_INTERVAL` from every test file**

In each file, find and delete this line:
```typescript
jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
```

No replacement is needed — `testTimeout: 60000` is configured globally in `vitest.config.ts`.

- [ ] **Step 2: Update `@testing/jestDB` import paths**

The existing files import from `@testing/jestDB`. This module will be renamed in Task 5. For now, verify the alias resolves — `vite-tsconfig-paths` reads the `paths` from `server/tsconfig.json`, so `@testing/*` → `src/testing/*` should work automatically.

- [ ] **Step 3: Commit**

```bash
git add server/src/graphql/__tests__/ server/src/router/__tests__/
git commit -m "chore(test): remove jasmine globals for Vitest compatibility"
```

---

## Chunk 2: PostgreSQL Test Infrastructure

### Task 4: Rename jestDB.ts → vitestDB.ts and jestLogin.ts → vitestLogin.ts

> **Note:** `@testcontainers/postgresql` was already added to `package.json` in Task 2. No separate install step needed here.

### Task 5: Rename jestDB.ts → vitestDB.ts and jestLogin.ts → vitestLogin.ts

**Files:**
- Create: `server/src/testing/vitestDB.ts` (copy of jestDB.ts)
- Create: `server/src/testing/vitestLogin.ts` (copy of jestLogin.ts)
- Modify: All test files that import `@testing/jestDB` or `@testing/jestLogin`

- [ ] **Step 1: Create `server/src/testing/vitestDB.ts`**

Copy the contents of `jestDB.ts` verbatim — the MongoDB memory server logic is unchanged. The file is renamed for naming consistency.

```typescript
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const prepareDatabase = async () => {
  const mongoServer = new MongoMemoryServer();
  const mongoUri = await mongoServer.getUri();
  await mongoose.connect(
    mongoUri,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    },
    (err) => {
      if (err) console.error(err);
    }
  );
  return mongoServer;
};

const disconnectAndStopServer = async (mongoServer: MongoMemoryServer) => {
  await mongoose.disconnect();
  await mongoServer.stop();
  return mongoServer;
};

export { prepareDatabase, disconnectAndStopServer };
```

- [ ] **Step 2: Create `server/src/testing/vitestLogin.ts`**

Copy the contents of `jestLogin.ts` verbatim — same logic, renamed for consistency.

- [ ] **Step 3: Update all test file imports**

In all 14 files in `server/src/graphql/__tests__/`, all files in `server/src/router/__tests__/`, and `server/src/testing/_playground.test.ts`:
- Replace `from "@testing/jestDB"` → `from "@testing/vitestDB"`
- Replace `from "@testing/jestLogin"` → `from "@testing/vitestLogin"`

- [ ] **Step 4: Commit**

```bash
git add server/src/testing/vitestDB.ts server/src/testing/vitestLogin.ts server/src/graphql/__tests__/ server/src/router/__tests__/ server/src/testing/_playground.test.ts
git commit -m "chore(test): rename jestDB → vitestDB, jestLogin → vitestLogin, update imports"
```

---

### Task 6: Create vitestGlobalSetup.ts (Testcontainer before module load)

**Files:**
- Create: `server/src/testing/vitestGlobalSetup.ts`

**Why this file exists:** `server/src/db/index.ts` creates the Kysely connection pool at module load time using `process.env` values. Node.js module caching means that setting env vars in `beforeAll` is too late — the pool is already created with whatever env vars existed when the module was first imported. Vitest's `globalSetup` runs before any test module is loaded, making it the correct place to start the Testcontainer and set env vars.

- [ ] **Step 1: Create `server/src/testing/vitestGlobalSetup.ts`**

```typescript
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "child_process";
import path from "path";

let pgContainer: InstanceType<typeof PostgreSqlContainer> | null = null;

export async function setup() {
  // Only start the PG container if we're running tests that need it.
  // Check an env flag set by specific test scripts, or always start it
  // (it won't be used by Layer 1 tests that don't import db/index.ts).
  pgContainer = await new PostgreSqlContainer("postgres:15")
    .withDatabase("bowmark_reports_test")
    .withUsername("bowmark")
    .withPassword("devpassword")
    .start();

  // Set env vars BEFORE any test module is imported.
  // db/index.ts reads these at module load time.
  process.env.POSTGRES_HOST = pgContainer.getHost();
  process.env.POSTGRES_PORT = String(pgContainer.getPort());
  process.env.POSTGRES_USER = pgContainer.getUsername();
  process.env.POSTGRES_PASSWORD = pgContainer.getPassword();
  process.env.POSTGRES_DB = pgContainer.getDatabase();

  // Run migrations against the test database.
  // Migrations live at db/migrations/ (repo root), relative to server/.
  const migrationsPath = path.resolve(__dirname, "../../../db/migrations");
  const dbUrl = `postgres://bowmark:devpassword@${pgContainer.getHost()}:${pgContainer.getPort()}/bowmark_reports_test`;
  execSync(`dbmate --url "${dbUrl}" --migrations-dir "${migrationsPath}" up`, {
    stdio: "inherit",
  });
}

export async function teardown() {
  if (pgContainer) {
    await pgContainer.stop();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/testing/vitestGlobalSetup.ts
git commit -m "chore(test): add vitestGlobalSetup for Testcontainers PG"
```

---

### Task 7: Create vitestPgDB.ts (per-suite PG helpers)

**Files:**
- Create: `server/src/testing/vitestPgDB.ts`

- [ ] **Step 1: Create `server/src/testing/vitestPgDB.ts`**

```typescript
import { db } from "../db";

/**
 * Truncate all fact and dimension tables between tests.
 * Call in beforeEach for consumer sync and report query tests.
 * Order matters: truncate facts before dimensions (FK constraints).
 */
export async function truncateAllPgTables(): Promise<void> {
  const factTables = [
    "fact_employee_work",
    "fact_vehicle_work",
    "fact_material_shipment",
    "fact_non_costed_material",
    "fact_trucking",
    "fact_production",
    "fact_invoice",
  ];

  const dimTables = [
    "dim_daily_report",
    "dim_employee_rate",
    "dim_employee",
    "dim_vehicle_rate",
    "dim_vehicle",
    "dim_jobsite_material",
    "dim_material",
    "dim_company",
    "dim_crew",
    "dim_jobsite",
  ];

  // Truncate in dependency order (facts first, then dims)
  for (const table of [...factTables, ...dimTables]) {
    await db.deleteFrom(table as any).execute();
  }
}
```

**Note:** The table list above must match the actual tables created by migrations in `db/migrations/`. Cross-reference against `server/src/db/generated-types.ts` to confirm all table names before finalizing.

- [ ] **Step 2: Commit**

```bash
git add server/src/testing/vitestPgDB.ts
git commit -m "chore(test): add vitestPgDB truncation helper"
```

---

## Chunk 3: Seed Data Expansion

**Background:** The current seed data was written as the bare minimum for existing tests. It must be expanded significantly to support consumer sync assertions (known numeric values) and GraphQL permission tests (all roles). All new IDs must be added to `_ids.ts` using the same `Types.ObjectId("...")` pattern with hardcoded hex strings.

### Task 8: Expand _ids.ts with new document IDs

**Files:**
- Modify: `server/src/testing/_ids.ts`

- [ ] **Step 1: Add new IDs to `_ids.ts`**

Add the following new entries (use the hex strings shown — these are fixed, deterministic IDs):

```typescript
// In users:
project_manager_user: {
  _id: Types.ObjectId("6241f81d8b757d1c8ae18b14"),
},

// In employees (new):
base_foreman_2: {
  _id: Types.ObjectId("6215623f22057ba3cfbd959b"),
},
pm_employee: {
  _id: Types.ObjectId("6241f83c8542b250a1b765bb"),
},

// In crews (new):
base_2: {
  _id: Types.ObjectId("62156102e79a8931895f2b2b"),
},

// In vehicles (new — add rate entries):
gravel_truck_2: {
  _id: Types.ObjectId("621565c67fbbbddff42b17e1"),
},

// New daily reports for sync testing (fully populated):
jobsite_1_base_1_sync_1: {
  _id: Types.ObjectId("621664558c026b7ac8fb32f0"),
},
jobsite_2_base_1_sync_1: {
  _id: Types.ObjectId("621664558c026b7ac8fb32f1"),
},

// New employee work with explicit hours for sync assertions:
sync_employee_work_1: {
  _id: Types.ObjectId("621667718d92575bd6dc70d6"),
},
sync_employee_work_2: {
  _id: Types.ObjectId("621667718d92575bd6dc70d7"),
},

// New vehicle work for sync assertions:
sync_vehicle_work_1: {
  _id: Types.ObjectId("62166a572a3444b242d7801d"),
},

// New material shipments (costed, non-costed, trucking, invoice cost type):
sync_shipment_costed_1: {
  _id: Types.ObjectId("62166e38ef63bebc19532514"),
},
sync_shipment_non_costed_1: {
  _id: Types.ObjectId("62166e38ef63bebc19532515"),
},
sync_shipment_trucking_1: {
  _id: Types.ObjectId("62166e38ef63bebc19532516"),
},
sync_shipment_invoice_cost_1: {
  _id: Types.ObjectId("62166e38ef63bebc19532517"),
},

// New productions:
sync_production_1: {
  _id: Types.ObjectId("62166bd2bab11e05ea2f6c0e"),
},

// New invoices for sync testing:
sync_invoice_revenue_1: {
  _id: Types.ObjectId("6241fc1132d9ce63e6fbf374"),
},
sync_invoice_expense_1: {
  _id: Types.ObjectId("6241fc1132d9ce63e6fbf375"),
},
// Invoice used as cost type for material shipment:
sync_invoice_for_shipment_rate: {
  _id: Types.ObjectId("6241fc1132d9ce63e6fbf376"),
},

// New jobsite material for invoice-cost-type shipment:
sync_jobsite_material_invoice_cost: {
  _id: Types.ObjectId("629a49205f76f65244785a11"),
},
```

- [ ] **Step 2: Commit**

```bash
git add server/src/testing/_ids.ts
git commit -m "chore(test): expand _ids.ts with seed IDs for new test scenarios"
```

---

### Task 9: Add ProjectManager user and expand users seed

**Files:**
- Modify: `server/src/testing/documents/users.ts`

- [ ] **Step 1: Add `project_manager_user` to `createUsers`**

Add to `SeededUsers` interface:
```typescript
project_manager_user: UserDocument;
```

Add to the factory function:
```typescript
const project_manager_user = new User({
  _id: _ids.users.project_manager_user._id,
  name: "Project Manager User",
  email: "pm@bowmark.ca",
  password: await hashPassword("password"),
  employee: _ids.employees.pm_employee._id,
  role: UserRoles.ProjectManager,
});
```

Add to the `users` object and the save loop.

- [ ] **Step 2: Add `pm_employee` to employees seed**

In `server/src/testing/documents/employees.ts`, add to `SeededEmployees` interface and factory:
```typescript
pm_employee: new Employee({
  _id: _ids.employees.pm_employee._id,
  name: "PM Employee",
  jobTitle: "Project Manager",
  rates: [{ date: new Date("2022-01-01"), rate: 35 }],
})
```

- [ ] **Step 3: Update `seedDatabase.ts`** to reflect new user/employee types in `SeededDatabase`.

- [ ] **Step 4: Commit**

```bash
git add server/src/testing/documents/users.ts server/src/testing/documents/employees.ts server/src/testing/seedDatabase.ts
git commit -m "chore(test): seed ProjectManager user and pm_employee"
```

---

### Task 10: Add rates to all employees and a second crew

**Files:**
- Modify: `server/src/testing/documents/employees.ts`
- Modify: `server/src/testing/documents/crews.ts`

- [ ] **Step 1: Add `rates` arrays to all employees that are missing them**

In `createEmployees`, add a `rates` entry to every employee that currently has none. Use `date: new Date("2022-01-01")` as the effective date. Suggested rates:
- `base_operator_1`: `rate: 28`
- `base_laborer_1`, `base_laborer_2`, `base_laborer_3`: `rate: 22`
- `base_foreman_2` (new): `rate: 26`

Also add `base_foreman_2` as a new seeded employee with `rates`.

- [ ] **Step 2: Add `base_2` crew in `crews.ts`**

Add to `SeededCrews` interface and factory:
```typescript
base_2: new Crew({
  _id: _ids.crews.base_2._id,
  name: "Base Crew 2",
  type: CrewTypes.Base,
  employees: [_ids.employees.base_foreman_2._id],
  vehicles: [_ids.vehicles.gravel_truck_2._id],
})
```

- [ ] **Step 3: Add `gravel_truck_2` vehicle in `vehicles.ts`**

```typescript
gravel_truck_2: new Vehicle({
  _id: _ids.vehicles.gravel_truck_2._id,
  name: "T-13",
  vehicleCode: "T-13",
  vehicleType: "Gravel Truck",
  crews: [_ids.crews.base_2._id],
  rates: [{ date: new Date("2022-01-01"), rate: 95 }],
})
```

Note: Also add `rates` to `skidsteer_1` and `gravel_truck_1` if they are missing them — check the Vehicle model schema to confirm the field name (likely `rates` with `date`/`rate` sub-fields, analogous to employees).

- [ ] **Step 4: Update `seedDatabase.ts`** interface and function to include `base_foreman_2` and `base_2` crew and `gravel_truck_2`.

- [ ] **Step 5: Commit**

```bash
git add server/src/testing/documents/employees.ts server/src/testing/documents/crews.ts server/src/testing/documents/vehicles.ts server/src/testing/seedDatabase.ts
git commit -m "chore(test): add rates to all employees, add base_2 crew and gravel_truck_2"
```

---

### Task 11: Add fully-populated daily reports for sync testing

**Files:**
- Modify: `server/src/testing/documents/dailyReports.ts`
- Modify: `server/src/testing/documents/employeeWork.ts`
- Modify: `server/src/testing/documents/vehicleWork.ts`
- Modify: `server/src/testing/documents/materialShipments.ts`
- Modify: `server/src/testing/documents/productions.ts`
- Modify: `server/src/testing/documents/invoices.ts`
- Modify: `server/src/testing/documents/jobsiteMaterials.ts`
- Modify: `server/src/testing/seedDatabase.ts`

**Purpose:** These documents are used in consumer sync tests (Layer 2). Values are chosen to produce known, assertable numbers.

- [ ] **Step 1: Add sync employee work records in `employeeWork.ts`**

```typescript
// Employee works 7:00 AM – 3:00 PM = 8 hours.
// base_foreman_1 rate on 2022-02-23 = $25/hr → labour cost = $200.
sync_employee_work_1: new EmployeeWork({
  _id: _ids.employeeWork.sync_employee_work_1._id,
  startTime: new Date("2022-02-23 7:00 AM"),
  endTime: new Date("2022-02-23 3:00 PM"),
  jobTitle: "Grading",
  employee: _ids.employees.base_foreman_1._id,
})
```

Add to `SeededEmployeeWork` interface and return object.

- [ ] **Step 2: Add sync vehicle work record in `vehicleWork.ts`**

```typescript
// Skidsteer works 8:00 AM – 11:00 AM = 3 hours.
// skidsteer_1 rate on 2022-02-23: check vehicle rates added in Task 10.
sync_vehicle_work_1: new VehicleWork({
  _id: _ids.vehicleWork.sync_vehicle_work_1._id,
  startTime: new Date("2022-02-23 8:00 AM"),
  endTime: new Date("2022-02-23 11:00 AM"),
  jobTitle: "Excavation",
  hours: 3,
  vehicle: _ids.vehicles.skidsteer_1._id,
})
```

- [ ] **Step 3: Add sync material shipments in `materialShipments.ts`**

Add four shipments representing the four test scenarios:

```typescript
// Scenario A: Costed material with "rate" cost type
// 5 tonnes @ $12.00/tonne (rate cost type) = $60.00
sync_shipment_costed_1: new MaterialShipment({
  _id: _ids.materialShipments.sync_shipment_costed_1._id,
  shipmentType: "Delivered",
  quantity: 5,
  unit: "tonnes",
  noJobsiteMaterial: false,
  jobsiteMaterial: _ids.jobsiteMaterials.jobsite_2_material_1._id,
  // Set the cost type to "rate" on the jobsiteMaterial (see Task 11 Step 4)
})

// Scenario B: Non-costed material
sync_shipment_non_costed_1: new MaterialShipment({
  _id: _ids.materialShipments.sync_shipment_non_costed_1._id,
  quantity: 3,
  unit: "tonnes",
  noJobsiteMaterial: true,
  shipmentType: "Asphalt",
  // noJobsiteMaterial=true routes to fact_non_costed_material
})

// Scenario C: Trucking (with truckingRateId)
sync_shipment_trucking_1: new MaterialShipment({
  _id: _ids.materialShipments.sync_shipment_trucking_1._id,
  quantity: 2,
  unit: "tonnes",
  noJobsiteMaterial: false,
  jobsiteMaterial: _ids.jobsiteMaterials.jobsite_2_material_1._id,
  vehicleObject: {
    source: "Company",
    vehicleType: "Tandem",
    truckingRateId: _ids.jobsites.jobsite_2.truckingRates[0],
    // 2 hours @ $120/hr (jobsite_2 tandem rate) = $240
    startTime: new Date("2022-02-25 8:00 AM"),
    endTime: new Date("2022-02-25 10:00 AM"),
  },
})

// Scenario D: Invoice cost type (highest-risk calculation)
// Requires a separate jobsiteMaterial with costType=invoice + an invoice
sync_shipment_invoice_cost_1: new MaterialShipment({
  _id: _ids.materialShipments.sync_shipment_invoice_cost_1._id,
  quantity: 10,
  unit: "tonnes",
  noJobsiteMaterial: false,
  jobsiteMaterial: _ids.jobsiteMaterials.sync_jobsite_material_invoice_cost._id,
})
```

**Note:** Exact field names (e.g., `vehicleObject`, `truckingRateId`, `shipmentType`) must be verified against the `MaterialShipment` Typegoose model schema before writing. Adjust to match the actual model.

- [ ] **Step 4: Add sync jobsite material for invoice cost type**

In `jobsiteMaterials.ts`, add:
```typescript
sync_jobsite_material_invoice_cost: new JobsiteMaterial({
  _id: _ids.jobsiteMaterials.sync_jobsite_material_invoice_cost._id,
  jobsite: _ids.jobsites.jobsite_2._id,
  material: _ids.materials.material_1._id,
  supplier: _ids.companies.company_1._id,
  costType: JobsiteMaterialCostType.invoice, // uses invoice cost type
  delivered: false,
  quantity: 100,
  unit: "tonnes",
})
```

- [ ] **Step 5: Add sync invoice for shipment rate resolution**

In `invoices.ts`, add:
```typescript
// This invoice will be queried by getMaterialShipmentRate for invoice cost type.
// Rate = $500 / 10 tonnes = $50/tonne → 10 tonnes × $50 = $500 total.
sync_invoice_for_shipment_rate: new Invoice({
  _id: _ids.invoices.sync_invoice_for_shipment_rate._id,
  company: _ids.companies.company_1._id,
  invoiceNumber: "INV-SYNC-001",
  date: new Date("2022-02-01"),
  cost: 500,
  internal: false,
})
```

Then in `jobsiteMaterials.ts`, add the invoice to `sync_jobsite_material_invoice_cost`'s `invoices` array so `getMaterialShipmentRate` can find it:

```typescript
// In sync_jobsite_material_invoice_cost:
invoices: [_ids.invoices.sync_invoice_for_shipment_rate._id],
```

Verify that `JobsiteMaterial` has an `invoices` field by checking `server/src/models/JobsiteMaterial/schema/index.ts` before writing.

- [ ] **Step 6: Add sync production in `productions.ts`**

```typescript
sync_production_1: new Production({
  _id: _ids.productions.sync_production_1._id,
  quantity: 150,
  unit: "tonnes",
  description: "Grading production",
})
```

- [ ] **Step 7: Add sync revenue and expense invoices in `invoices.ts`**

```typescript
sync_invoice_revenue_1: new Invoice({
  _id: _ids.invoices.sync_invoice_revenue_1._id,
  company: _ids.companies.company_1._id,
  invoiceNumber: "INV-REV-001",
  date: new Date("2022-03-01"),
  cost: 25000,
  internal: false,
})

sync_invoice_expense_1: new Invoice({
  _id: _ids.invoices.sync_invoice_expense_1._id,
  company: _ids.companies.company_1._id,
  invoiceNumber: "INV-EXP-001",
  date: new Date("2022-03-01"),
  cost: 8000,
  internal: true,
})
```

**Note:** Verify field names (`internal`, `cost`, etc.) against the Invoice Typegoose model. The `company` field is required.

- [ ] **Step 8: Add sync daily reports in `dailyReports.ts`**

```typescript
// Fully-populated report on jobsite_1 with crew base_1:
// Contains sync_employee_work_1, sync_vehicle_work_1, sync_production_1, sync_shipment_costed_1
jobsite_1_base_1_sync_1: new DailyReport({
  _id: _ids.dailyReports.jobsite_1_base_1_sync_1._id,
  date: new Date("2022-02-23 7:00 AM"),
  jobsite: _ids.jobsites.jobsite_1._id,
  crew: _ids.crews.base_1._id,
  approved: true,
  employeeWork: [_ids.employeeWork.sync_employee_work_1._id],
  vehicleWork: [_ids.vehicleWork.sync_vehicle_work_1._id],
  production: [_ids.productions.sync_production_1._id],
  materialShipment: [_ids.materialShipments.sync_shipment_costed_1._id],
  temporaryEmployees: [],
  temporaryVehicles: [],
})

// Report on jobsite_2 for material shipment sync tests:
jobsite_2_base_1_sync_1: new DailyReport({
  _id: _ids.dailyReports.jobsite_2_base_1_sync_1._id,
  date: new Date("2022-02-25 7:00 AM"),
  jobsite: _ids.jobsites.jobsite_2._id,
  crew: _ids.crews.base_1._id,
  approved: true,
  employeeWork: [],
  vehicleWork: [],
  production: [],
  materialShipment: [
    _ids.materialShipments.sync_shipment_non_costed_1._id,
    _ids.materialShipments.sync_shipment_trucking_1._id,
    _ids.materialShipments.sync_shipment_invoice_cost_1._id,
  ],
  temporaryEmployees: [],
  temporaryVehicles: [],
})
```

- [ ] **Step 9: Update `seedDatabase.ts`** to include all new documents in `SeededDatabase` interface and the `seedDatabase` function body.

- [ ] **Step 10: Commit**

```bash
git add server/src/testing/documents/ server/src/testing/seedDatabase.ts server/src/testing/_ids.ts
git commit -m "chore(test): expand seed data for consumer sync and report query tests"
```

---

## Chunk 3 Review Checkpoint

At this point, the test infrastructure and seed data are complete. The existing test suite should still pass (no production code changed). Before proceeding:

- Verify `server/src/db/generated-types.ts` contains all table names referenced in `vitestPgDB.ts`
- Verify vehicle/employee rate field names against model schemas before finalizing seed values

---

## Chunk 4: GraphQL API Tests (Layer 1)

**Pattern used in every test file:**

```typescript
import request from "supertest";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import createApp from "../../app";
import _ids from "@testing/_ids";
import jestLogin from "@testing/jestLogin";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "http";

let mongoServer: MongoMemoryServer;
let documents: SeededDatabase;
let app: Server;
let adminToken: string;
let foremanToken: string;
let pmToken: string;

beforeAll(async () => {
  mongoServer = await prepareDatabase();
  app = await createApp();
  documents = await seedDatabase();
  adminToken = await jestLogin(app, "admin@bowmark.ca");
  foremanToken = await jestLogin(app, "baseforeman1@bowmark.ca");
  pmToken = await jestLogin(app, "pm@bowmark.ca");
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});
```

**Authorization testing pattern:** For each mutation or query that should be role-restricted, test it with:
1. The authorized role (expect success)
2. An unauthorized role (expect a GraphQL `errors` array with an auth error)
3. No token (expect a GraphQL `errors` array with an auth error)

```typescript
it("rejects unauthenticated requests", async () => {
  const res = await request(app).post("/graphql").send({ query: MUTATION, variables: { ... } });
  expect(res.body.errors).toBeDefined();
  expect(res.body.errors[0].message).toMatch(/not authenticated|not authorized/i);
});
```

### Task 12: Expand employeeResolver tests (representative example)

**Files:**
- Modify: `server/src/graphql/__tests__/employeeResolver.test.ts`

This file is documented as a representative example. The same pattern applies to all other resolver test files.

- [ ] **Step 1: Add auth setup to the test file**

Add `pmToken` and `foremanToken` variables alongside the existing `adminToken`. Log in all three roles in `beforeAll` using `jestLogin`.

- [ ] **Step 2: Add permission tests for `employeeCreate` mutation**

```typescript
describe("employeeCreate", () => {
  const mutation = `
    mutation EmployeeCreate($data: EmployeeCreateData!) {
      employeeCreate(data: $data) {
        _id
        name
        jobTitle
      }
    }
  `;
  const variables = { data: { name: "New Employee", jobTitle: "Laborer" } };

  it("creates an employee as Admin", async () => {
    const res = await request(app)
      .post("/graphql")
      .set("Authorization", adminToken)
      .send({ query: mutation, variables });
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.employeeCreate.name).toBe("New Employee");
  });

  it("rejects Foreman from creating an employee", async () => {
    const res = await request(app)
      .post("/graphql")
      .set("Authorization", foremanToken)
      .send({ query: mutation, variables });
    expect(res.body.errors).toBeDefined();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app)
      .post("/graphql")
      .send({ query: mutation, variables });
    expect(res.body.errors).toBeDefined();
  });
});
```

- [ ] **Step 3: Add permission tests for `employeeUpdate` mutation**

Follow the same pattern as Step 2. Test Admin success, Foreman rejection, unauthenticated rejection.

- [ ] **Step 4: Add validation tests for `employee` query (not-found case)**

```typescript
it("returns null for a non-existent employee id", async () => {
  const res = await request(app)
    .post("/graphql")
    .set("Authorization", adminToken)
    .send({
      query: `query { employee(id: "000000000000000000000001") { _id } }`,
    });
  expect(res.body.data.employee).toBeNull();
});
```

- [ ] **Step 5: Commit**

```bash
git add server/src/graphql/__tests__/employeeResolver.test.ts
git commit -m "test(graphql): expand employeeResolver with auth and validation coverage"
```

---

### Task 13: Expand remaining GraphQL resolver tests

**Files:**
- Modify: All files in `server/src/graphql/__tests__/`

Apply the same pattern from Task 12 to each remaining resolver. For each resolver test file:

1. Add `pmToken` and `foremanToken` login in `beforeAll`
2. For every **mutation**, add: Admin success test, unauthorized-role rejection test, unauthenticated rejection test
3. For every **query**, add: successful response with known seeded data, not-found/invalid ID case

**Resolver-specific notes:**

- **crewResolver** — `crewCreate`, `crewAddEmployee`, `crewAddVehicle` are Admin-only. Test that Foreman cannot add/remove members.
- **dailyReportResolver** — Foreman should be able to update a daily report they're part of. Admin can update any. Test this distinction explicitly.
- **jobsiteResolver** — `jobsiteCreate`, `jobsiteAddCrew` are Admin-only. Test Foreman rejection.
- **invoiceResolver** — Admin-only mutations. Test Foreman and PM rejection.
- **userResolver** — Admin-only mutations (role assignment). Verify non-Admin cannot escalate privileges.
- **vehicleResolver** / **vehicleWorkResolver** — Foreman can log vehicle work. Admin can manage vehicles.
- **materialShipmentResolver** — Foreman can log shipments. Admin manages jobsite materials.
- **signupResolver** — Test the signup flow (no auth required) and admin approval (admin required).
- **systemResolver** — Admin-only system operations.

For each resolver, look at its `index.ts` file and check which mutations/queries have `@Authorized(...)` decorators to know which roles to test.

- [ ] **Step 1–N: Expand each test file individually**

Work through each file. Commit after each resolver is complete:

```bash
git add server/src/graphql/__tests__/crewResolver.test.ts
git commit -m "test(graphql): expand crewResolver with auth coverage"
# ... repeat for each resolver
```

---

## Chunk 5: Consumer Sync Tests (Layer 2)

**Pattern for every consumer sync test file:**

```typescript
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { truncateAllPgTables } from "@testing/vitestPgDB";
import { db } from "../../db";
import { MongoMemoryServer } from "mongodb-memory-server";
// Each test file also imports its specific handler, e.g.:
// import { employeeWorkSyncHandler } from "../../consumer/handlers/employeeWorkSync";

let mongoServer: MongoMemoryServer;
let documents: SeededDatabase;

beforeAll(async () => {
  mongoServer = await prepareDatabase();
  documents = await seedDatabase();
});

beforeEach(async () => {
  await truncateAllPgTables();
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});
```

The PostgreSQL connection (`db`) is already pointing at the test container because `vitestGlobalSetup.ts` set the env vars before any module was loaded.

### Task 14: employeeWorkSync tests

**Files:**
- Create: `server/src/consumer/__tests__/employeeWorkSync.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { employeeWorkSyncHandler } from "../../consumer/handlers/employeeWorkSync";
// ... standard beforeAll/beforeEach/afterAll pattern above

describe("employeeWorkSyncHandler", () => {
  describe("created action", () => {
    it("writes a fact_employee_work row with correct fields", async () => {
      const mongoId = documents.employeeWork.sync_employee_work_1._id.toString();
      await employeeWorkSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_employee_work")
        .selectAll()
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row).toBeDefined();
      expect(row!.start_time).toEqual(new Date("2022-02-23 7:00 AM"));
      expect(row!.end_time).toEqual(new Date("2022-02-23 3:00 PM"));
      // base_foreman_1 rate on 2022-02-23 is $25/hr (rate effective 2022-01-01)
      expect(Number(row!.hourly_rate)).toBe(25);
    });

    it("creates the dimension records (jobsite, crew, employee, daily report)", async () => {
      const mongoId = documents.employeeWork.sync_employee_work_1._id.toString();
      await employeeWorkSyncHandler.handle({ mongoId, action: "created" });

      const jobsite = await db
        .selectFrom("dim_jobsite")
        .select("mongo_id")
        .where("mongo_id", "=", documents.jobsites.jobsite_1._id.toString())
        .executeTakeFirst();
      expect(jobsite).toBeDefined();

      const employee = await db
        .selectFrom("dim_employee")
        .select("mongo_id")
        .where("mongo_id", "=", documents.employees.base_foreman_1._id.toString())
        .executeTakeFirst();
      expect(employee).toBeDefined();
    });

    it("uses the date-effective rate, not the latest rate", async () => {
      // base_foreman_1 has rates: $20/hr from 2021-01-01, $25/hr from 2022-01-01.
      // Work date is 2022-02-23, so $25/hr should apply (not $20/hr).
      const mongoId = documents.employeeWork.sync_employee_work_1._id.toString();
      await employeeWorkSyncHandler.handle({ mongoId, action: "created" });

      const row = await db
        .selectFrom("fact_employee_work")
        .select("hourly_rate")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(Number(row!.hourly_rate)).toBe(25);
      expect(Number(row!.hourly_rate)).not.toBe(20);
    });

    it("is idempotent — running twice does not create duplicate rows", async () => {
      const mongoId = documents.employeeWork.sync_employee_work_1._id.toString();
      await employeeWorkSyncHandler.handle({ mongoId, action: "created" });
      await employeeWorkSyncHandler.handle({ mongoId, action: "created" });

      const rows = await db
        .selectFrom("fact_employee_work")
        .where("mongo_id", "=", mongoId)
        .execute();
      expect(rows.length).toBe(1);
    });
  });

  describe("deleted action", () => {
    it("sets archived_at on the fact row", async () => {
      const mongoId = documents.employeeWork.sync_employee_work_1._id.toString();
      await employeeWorkSyncHandler.handle({ mongoId, action: "created" });
      await employeeWorkSyncHandler.handle({ mongoId, action: "deleted" });

      const row = await db
        .selectFrom("fact_employee_work")
        .select("archived_at")
        .where("mongo_id", "=", mongoId)
        .executeTakeFirst();

      expect(row!.archived_at).not.toBeNull();
    });
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add server/src/consumer/__tests__/employeeWorkSync.test.ts
git commit -m "test(consumer): add employeeWorkSync tests"
```

---

### Task 15: vehicleWorkSync tests

**Files:**
- Create: `server/src/consumer/__tests__/vehicleWorkSync.test.ts`

Follow the same pattern as Task 14. Key assertions:
- `fact_vehicle_work` row written with correct `hours` (vehicle work stores hours directly — there are no `start_time`/`end_time` columns on `fact_vehicle_work`) and correct vehicle rate
- Dimension records created (`dim_vehicle`, `dim_crew`, `dim_jobsite`, `dim_daily_report`)
- Idempotent (second sync does not duplicate)
- Delete sets `archived_at`

- [ ] **Step 1: Write tests and commit**

```bash
git commit -m "test(consumer): add vehicleWorkSync tests"
```

---

### Task 16: materialShipmentSync tests (three paths)

**Files:**
- Create: `server/src/consumer/__tests__/materialShipmentSync.test.ts`

This is the highest-complexity sync test. It covers three code paths.

- [ ] **Step 1: Write costed material test**

```typescript
describe("costed material (noJobsiteMaterial=false, rate cost type)", () => {
  it("writes to fact_material_shipment with correct quantity and rate", async () => {
    const mongoId = documents.materialShipments.sync_shipment_costed_1._id.toString();
    await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

    const row = await db
      .selectFrom("fact_material_shipment")
      .selectAll()
      .where("mongo_id", "=", mongoId)
      .executeTakeFirst();

    expect(row).toBeDefined();
    expect(Number(row!.quantity)).toBe(5);
    // Verify rate and cost based on what was seeded in Task 11
  });
});
```

- [ ] **Step 2: Write non-costed material test**

```typescript
describe("non-costed material (noJobsiteMaterial=true)", () => {
  it("writes to fact_non_costed_material, not fact_material_shipment", async () => {
    const mongoId = documents.materialShipments.sync_shipment_non_costed_1._id.toString();
    await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

    const factRow = await db
      .selectFrom("fact_material_shipment")
      .where("mongo_id", "=", mongoId)
      .executeTakeFirst();
    expect(factRow).toBeUndefined(); // must NOT be in fact_material_shipment

    const nonCostedRow = await db
      .selectFrom("fact_non_costed_material")
      .where("mongo_id", "=", mongoId)
      .executeTakeFirst();
    expect(nonCostedRow).toBeDefined();
    expect(Number(nonCostedRow!.quantity)).toBe(3);
  });
});
```

- [ ] **Step 3: Write trucking test**

```typescript
describe("trucking (vehicleObject.truckingRateId present)", () => {
  it("writes to fact_trucking with correct rate", async () => {
    const mongoId = documents.materialShipments.sync_shipment_trucking_1._id.toString();
    await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

    const row = await db
      .selectFrom("fact_trucking")
      .selectAll()
      .where("mongo_id", "=", mongoId)
      .executeTakeFirst();

    expect(row).toBeDefined();
    // jobsite_2 tandem rate = $120/hr, 2 hours = $240
    // Assert the rate value matches what was configured
  });
});
```

- [ ] **Step 4: Write invoice cost type test**

```typescript
describe("invoice cost type (highest-risk path)", () => {
  it("resolves rate from invoice and writes correct cost to fact_material_shipment", async () => {
    const mongoId = documents.materialShipments.sync_shipment_invoice_cost_1._id.toString();
    await materialShipmentSyncHandler.handle({ mongoId, action: "created" });

    const row = await db
      .selectFrom("fact_material_shipment")
      .selectAll()
      .where("mongo_id", "=", mongoId)
      .executeTakeFirst();

    expect(row).toBeDefined();
    // Invoice cost = $500, quantity = 10 tonnes → rate = $50/tonne
    // Verify the stored rate matches expectations
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add server/src/consumer/__tests__/materialShipmentSync.test.ts
git commit -m "test(consumer): add materialShipmentSync tests (all 3 paths)"
```

---

### Task 17: productionSync, invoiceSync, dailyReportSync tests

**Files:**
- Create: `server/src/consumer/__tests__/productionSync.test.ts`
- Create: `server/src/consumer/__tests__/invoiceSync.test.ts`
- Create: `server/src/consumer/__tests__/dailyReportSync.test.ts`

For each, follow the same pattern: seed → call handler → assert fact row → test idempotency → test delete/archive.

Key assertions per entity:
- **productionSync:** `fact_production` row has correct quantity, unit, daily_report_id, jobsite_id
- **invoiceSync:** `fact_invoice` row has correct cost, jobsite_id, type (revenue vs expense)
- **dailyReportSync:** This handler syncs all child work records in bulk. Assert that all child fact rows are created via the bulk sync path, not just via individual handlers.

- [ ] **Step 1–3: Write each test file and commit individually**

```bash
git commit -m "test(consumer): add productionSync tests"
git commit -m "test(consumer): add invoiceSync tests"
git commit -m "test(consumer): add dailyReportSync tests"
```

---

### Task 18: Dimension upsert tests

**Files:**
- Create: `server/src/consumer/__tests__/dimensions.test.ts`

- [ ] **Step 1: Write dimension upsert tests**

```typescript
import { upsertDimJobsite, upsertDimEmployee, upsertDimCrew } from "../../consumer/handlers/dimensions";

describe("upsertDimJobsite", () => {
  it("creates a dim_jobsite row on first call", async () => {
    const jobsite = documents.jobsites.jobsite_1;
    const id = await upsertDimJobsite(jobsite);
    expect(id).toBeDefined();

    const row = await db.selectFrom("dim_jobsite").selectAll()
      .where("mongo_id", "=", jobsite._id.toString()).executeTakeFirst();
    expect(row!.name).toBe(jobsite.name);
    expect(row!.jobcode).toBe(jobsite.jobcode);
  });

  it("returns the same id on second call (no duplicate)", async () => {
    const jobsite = documents.jobsites.jobsite_1;
    const id1 = await upsertDimJobsite(jobsite);
    const id2 = await upsertDimJobsite(jobsite);
    expect(id1).toBe(id2);

    const rows = await db.selectFrom("dim_jobsite")
      .where("mongo_id", "=", jobsite._id.toString()).execute();
    expect(rows.length).toBe(1);
  });

  it("updates the record when called with changed data", async () => {
    const jobsite = documents.jobsites.jobsite_1;
    await upsertDimJobsite(jobsite);

    // Mutate the document in-memory (do not save to MongoDB)
    const modified = { ...jobsite.toObject(), name: "Updated Name" };
    await upsertDimJobsite(modified as any);

    const row = await db.selectFrom("dim_jobsite").selectAll()
      .where("mongo_id", "=", jobsite._id.toString()).executeTakeFirst();
    expect(row!.name).toBe("Updated Name");
  });
});
```

Repeat for `upsertDimEmployee`, `upsertDimCrew`, `upsertDimVehicle`, `upsertDimMaterial`.

- [ ] **Step 2: Commit**

```bash
git add server/src/consumer/__tests__/dimensions.test.ts
git commit -m "test(consumer): add dimension upsert tests"
```

---

## Chunk 6: Report Query Tests (Layer 3)

**Pattern:** No MongoDB involved. Insert rows directly into PostgreSQL using Kysely, call the report query function, assert the result.

```typescript
import { truncateAllPgTables } from "@testing/vitestPgDB";
import { db } from "../../db";
// import the report query function being tested

beforeEach(async () => {
  await truncateAllPgTables();
  // Insert controlled test data here
});
```

### Task 19: Identify and test existing report query functions

**Files:**
- Create: `server/src/db/__tests__/jobsiteReport.test.ts`
- Create: one test file per report query function found in `server/src/graphql/resolvers/jobsiteReportPG/`

- [ ] **Step 1: Read the report query implementation**

Read `server/src/graphql/resolvers/jobsiteReportPG/index.ts` to understand what query functions exist and what they return. This determines what to assert.

- [ ] **Step 2: Write a seed helper for Layer 3**

Create a helper that inserts a known set of fact + dimension rows for a standard test scenario:

```typescript
// In vitestPgDB.ts or a new file, add:
export async function seedPgReportData() {
  // Insert dim records
  const jobsiteId = await db.insertInto("dim_jobsite").values({
    mongo_id: "000000000000000000000001",
    name: "Test Jobsite",
    jobcode: "TEST-001",
    active: true,
  }).returning("id").executeTakeFirstOrThrow();

  const employeeId = await db.insertInto("dim_employee").values({
    mongo_id: "000000000000000000000002",
    name: "Test Employee",
    job_title: "Laborer",
  }).returning("id").executeTakeFirstOrThrow();

  const crewId = await db.insertInto("dim_crew").values({
    mongo_id: "000000000000000000000003",
    name: "Test Crew",
    type: "Base",
  }).returning("id").executeTakeFirstOrThrow();

  const drId = await db.insertInto("dim_daily_report").values({
    mongo_id: "000000000000000000000004",
    jobsite_id: jobsiteId.id,
    crew_id: crewId.id,
    report_date: new Date("2022-02-23"), // column is report_date, not date
  }).returning("id").executeTakeFirstOrThrow();

  // Insert fact rows with known values
  // Employee A: 7am–3pm = 8 hours @ $25/hr
  await db.insertInto("fact_employee_work").values({
    mongo_id: "000000000000000000000010",
    daily_report_id: drId.id,
    jobsite_id: jobsiteId.id,
    employee_id: employeeId.id,
    crew_id: crewId.id,
    crew_type: "Base",
    work_date: new Date("2022-02-23"),
    start_time: new Date("2022-02-23 07:00:00"),
    end_time: new Date("2022-02-23 15:00:00"),
    job_title: "Laborer",
    hourly_rate: "25.00",
  }).execute();

  // Employee B: 8am–2pm = 6 hours @ $30/hr
  await db.insertInto("fact_employee_work").values({
    mongo_id: "000000000000000000000011",
    daily_report_id: drId.id,
    jobsite_id: jobsiteId.id,
    employee_id: employeeId.id,
    crew_id: crewId.id,
    crew_type: "Base",
    work_date: new Date("2022-02-23"),
    start_time: new Date("2022-02-23 08:00:00"),
    end_time: new Date("2022-02-23 14:00:00"),
    job_title: "Operator",
    hourly_rate: "30.00",
  }).execute();

  // Total: 14 hours. Labour cost: (8 × 25) + (6 × 30) = 200 + 180 = $380
  return { jobsiteId: jobsiteId.id };
}
```

**Note:** Column names must match the actual schema from `server/src/db/generated-types.ts`. Adjust field names accordingly before writing.

- [ ] **Step 3: Write report query assertions**

```typescript
describe("jobsite labour report query", () => {
  it("returns correct total hours for a jobsite", async () => {
    const { jobsiteId } = await seedPgReportData();

    // Call the actual Kysely report query function
    const result = await getJobsiteLabourReport(jobsiteId);

    expect(result.totalHours).toBe(14);
  });

  it("returns correct total labour cost for a jobsite", async () => {
    const { jobsiteId } = await seedPgReportData();
    const result = await getJobsiteLabourReport(jobsiteId);
    expect(Number(result.totalLabourCost)).toBe(380);
  });

  it("does not include data from a different jobsite", async () => {
    const { jobsiteId } = await seedPgReportData();

    // Insert a fact row for a different jobsite
    const otherJobsiteId = await db.insertInto("dim_jobsite").values({
      mongo_id: "000000000000000000000099",
      name: "Other Jobsite",
      jobcode: "OTHER-001",
      active: true,
    }).returning("id").executeTakeFirstOrThrow();

    // Must insert a real dim_daily_report row — FK constraint on fact_employee_work.daily_report_id
    const otherDrId = await db.insertInto("dim_daily_report").values({
      mongo_id: "000000000000000000000098",
      jobsite_id: otherJobsiteId.id,
      crew_id: crewId.id,
      report_date: new Date("2022-02-23"),
    }).returning("id").executeTakeFirstOrThrow();

    await db.insertInto("fact_employee_work").values({
      mongo_id: "000000000000000000000099",
      daily_report_id: otherDrId.id,
      jobsite_id: otherJobsiteId.id,
      employee_id: employeeId.id,
      crew_id: crewId.id,
      crew_type: "Base",
      work_date: new Date("2022-02-23"),
      start_time: new Date("2022-02-23 07:00:00"),
      end_time: new Date("2022-02-23 15:00:00"),
      job_title: "Laborer",
      hourly_rate: "999.00",
    }).execute();

    const result = await getJobsiteLabourReport(jobsiteId);
    expect(Number(result.totalLabourCost)).toBe(380); // Other jobsite not included
  });
});
```

- [ ] **Step 4: Write tests for each report query function found in the resolvers**

Repeat this pattern for each query: material cost, trucking cost, non-costed materials, invoice totals, production quantities.

- [ ] **Step 5: Commit**

```bash
git add server/src/db/__tests__/
git commit -m "test(db): add report query tests (Layer 3)"
```

---

## Chunk 7: CI Integration

### Task 20: Add test job to ci.yml

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add `test` job before the build jobs**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json

      - name: Install dbmate
        run: |
          curl -fsSL -o /usr/local/bin/dbmate \
            https://github.com/amacneil/dbmate/releases/latest/download/dbmate-linux-amd64
          chmod +x /usr/local/bin/dbmate

      - name: Install server dependencies
        run: npm ci
        working-directory: server

      - name: Run tests
        run: npm run test
        working-directory: server

  build-server:
    needs: test   # ← add this line to existing job
    runs-on: ubuntu-latest
    # ... rest unchanged

  build-client-paving:
    needs: test   # ← add this line to existing job
    runs-on: ubuntu-latest
    # ... rest unchanged

  build-client-concrete:
    needs: test   # ← add this line to existing job
    runs-on: ubuntu-latest
    # ... rest unchanged
```

No PostgreSQL `services:` block needed — Testcontainers manages its own Docker container. Docker is available by default on `ubuntu-latest` runners.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add test job before Docker builds"
```

---

## Final Step: Open PR

- [ ] **Push the feature branch and open a PR**

```bash
git push origin feature/testing-suite
gh pr create --base master --head feature/testing-suite \
  --title "feat(test): implement testing suite (Vitest + Testcontainers)" \
  --body "Implements the testing suite design spec. Three layers: GraphQL API tests, consumer sync tests, report query tests. Migrates Jest → Vitest, adds Testcontainers for PostgreSQL, significantly expands seed data."
```
