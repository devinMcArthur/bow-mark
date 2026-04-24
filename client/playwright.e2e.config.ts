/**
 * Playwright E2E configuration.
 *
 * Requires:
 *   docker compose -f docker-compose.test.yml up -d   # start test MongoDB
 *
 * Then run:
 *   npm run test:e2e              # headless
 *   npm run test:e2e:ui           # with Playwright UI
 *
 * The config auto-starts the server (port 4001) and Next.js client (port 3001)
 * before tests, and seeds the database via globalSetup.
 *
 * In CI, set MONGODB_URI if the test MongoDB uses a different address.
 */
import path from "path";
import { defineConfig, devices } from "@playwright/test";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27018/bowmark-test";

// Server env — overrides .env.development values (dotenv doesn't override existing vars)
const serverEnv = {
  MONGO_URI: MONGODB_URI,
  PORT: "4001",
  JWT_SECRET: "e2e-test-jwt-secret",
  NODE_ENV: "development",
  SEARCH_HOST: "http://localhost:7701",
  SEARCH_API_KEY: "e2e-test-meili-key",
  // Skip System.validateSystem() / Company.validateCompanies() on startup —
  // the seed already handles both.
  SKIP_POST_STARTUP: "true",
  // Dummy Spaces/S3 creds so the `File.downloadUrl` field resolver can
  // generate a signed URL locally without a real bucket. aws-sdk v2's
  // getSignedUrl signs purely client-side, so fake values are fine —
  // the URL will point to a bucket that doesn't exist but we only
  // assert the field resolves, not that it streams bytes.
  //
  // Without this, any DailyReport rendered via a Jobsite with seeded
  // fileObjects (jobsite_1) 500s on the downloadUrl resolver, which
  // cascades up non-nullable fields and nulls out the whole
  // `dailyReport` query field — leaving the page stuck on Loading.
  SPACES_NAME: "e2e-test-bucket",
  SPACES_REGION: "e2e",
  SPACES_KEY: "e2e-test-key",
  SPACES_SECRET: "e2e-test-secret",
};

// Client env — override API URL to point at test server
const clientEnv = {
  NEXT_PUBLIC_API_URL: "http://localhost:4001/graphql",
  NEXT_PUBLIC_WS_API_URL: "ws://localhost:4001/graphql",
  SSR_API_URL: "http://localhost:4001/graphql",
};

const serverDir = path.resolve(__dirname, "../server");

// Pass computed path to globalSetup via env var — __dirname is reliable here
// but may not be in the compiled globalSetup temp directory.
process.env.E2E_SERVER_DIR = serverDir;

// In CI, use a pre-built Next.js app (next build + next start) for fast JS bundles.
// Locally, dev mode is used so you don't need to rebuild on every change.
const isCI = !!process.env.CI;
const clientCommand = isCI
  ? Object.entries(clientEnv).map(([k, v]) => `${k}=${v}`).join(" ") +
    " npm run start -- -p 3001"
  : Object.entries(clientEnv).map(([k, v]) => `${k}=${v}`).join(" ") +
    " npm run dev -- -p 3001";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: isCI ? 2 : 0,
  // Run tests in parallel — each worker gets its own browser context.
  // Submission tests share the same daily report but only assert on success/failure,
  // not on total shipment counts, so concurrent writes are safe.
  workers: process.env.E2E_WORKERS ? parseInt(process.env.E2E_WORKERS) : 4,
  // Each test gets its own browser context so parallel execution is safe
  // even for tests that mutate data (each assertion is self-contained).
  fullyParallel: true,

  globalSetup: "./playwright/e2e-global-setup.ts",

  use: {
    baseURL: "http://localhost:3001",
    viewport: { width: 1280, height: 720 },
    // Reuse admin auth cookies captured in globalSetup — avoids logging in per test.
    storageState: "./playwright/.auth/admin.json",
    // Capture screenshots and traces on failure
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    {
      // GraphQL server
      command:
        Object.entries(serverEnv)
          .map(([k, v]) => `${k}=${v}`)
          .join(" ") + " npm run start:dev",
      port: 4001,
      cwd: serverDir,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      // Next.js client — dev mode locally, production build in CI
      command: clientCommand,
      port: 3001,
      cwd: __dirname,
      timeout: 120_000,
      reuseExistingServer: !isCI,
    },
  ],
});
