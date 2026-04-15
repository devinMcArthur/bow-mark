/**
 * Playwright E2E global setup — seeds the test MongoDB and prepares auth state.
 *
 * Prerequisites:
 *   - Test MongoDB must be running: docker compose -f docker-compose.test.yml up -d
 *
 * What this does:
 *   1. Seeds the test database via the server's seed:e2e script.
 *   2. Logs in as admin once and saves the auth cookies to playwright/.auth/admin.json.
 *      Tests that need auth load this storageState instead of logging in each time.
 *   3. Pre-warms the Next.js dev server by visiting the login and daily-report pages
 *      so their bundles are compiled before any test runs.
 */
import { chromium, expect } from "@playwright/test";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3001";
const DAILY_REPORT_ID = "623e0f6a31d677c42489c429";

export default async function globalSetup() {
  // E2E_SERVER_DIR is set in playwright.e2e.config.ts where __dirname is reliable.
  const serverDir =
    process.env.E2E_SERVER_DIR ?? path.resolve(process.cwd(), "../server");
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27018/bowmark-test";

  // ── 1. Seed ────────────────────────────────────────────────────────────────
  console.log("[e2e-setup] Seeding test database...");
  execSync("npm run seed:e2e", {
    cwd: serverDir,
    stdio: "inherit",
    env: {
      ...process.env,
      MONGODB_URI: mongoUri,
      SEARCH_HOST: process.env.SEARCH_HOST ?? "http://localhost:7701",
      SEARCH_API_KEY: process.env.SEARCH_API_KEY ?? "e2e-test-meili-key",
    },
  });
  console.log("[e2e-setup] Seed complete.");

  // ── 2. Login once + save auth state ───────────────────────────────────────
  const authDir = path.resolve(__dirname, ".auth");
  fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  console.log("[e2e-setup] Logging in as admin to capture auth state...");
  // Next.js dev mode compiles each page on first request. Cold-compile of
  // /login can take 60s+ on the first run after a fresh webServer start.
  await page.goto("/login", { timeout: 120_000 });
  await page.getByLabel("Email").fill("admin@bowmark.ca");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: /submit/i }).click();
  await expect(page).not.toHaveURL(/login/, { timeout: 30_000 });

  await context.storageState({ path: path.join(authDir, "admin.json") });
  console.log("[e2e-setup] Auth state saved.");

  // ── 3. Pre-warm Next.js page bundles ──────────────────────────────────────
  console.log("[e2e-setup] Pre-warming daily report page...");
  await page.goto(`/daily-report/${DAILY_REPORT_ID}`);
  // Wait for the page to be meaningfully loaded (heading present)
  await page.waitForSelector("h2", { timeout: 30_000 });
  console.log("[e2e-setup] Pre-warm complete.");

  await browser.close();
}
