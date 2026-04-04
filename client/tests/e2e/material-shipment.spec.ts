/**
 * E2E tests for the material shipment create form on the daily report page.
 *
 * Seeded data:
 *   User:          admin@bowmark.ca / password  (Admin role — bypasses crew check)
 *   Daily report:  jobsite_2_base_1_1  (ID: 623e0f6a31d677c42489c429, date: 2022-02-25)
 *   Jobsite 2 materials:
 *     623e0c5d2afef82206a0ddab  "Material 1 - Supplier Company 1"         legacy rate
 *     629a49205f76f65244785a10  "Second Material - Supplier Company 1"     invoice
 *     629a49205f76f65244785a14  "Material 1 - Supplier Company 1"         rate model + scenarios
 *       scenarios:
 *         629a49205f76f65244785a15  Pickup          (delivered: false)
 *         629a49205f76f65244785a16  Tandem Delivered (delivered: true)
 *
 * IDs are stable across seed runs (server/src/testing/_ids.ts).
 *
 * Auth: globalSetup logs in as admin once and saves cookies to
 * playwright/.auth/admin.json. The playwright.e2e.config.ts sets this as the
 * default storageState, so all tests start already authenticated — no per-test login.
 * The "Authentication" suite opts out via test.use({ storageState: undefined }).
 */
import { expect, test, type Page } from "@playwright/test";

const DAILY_REPORT_ID = "623e0f6a31d677c42489c429";
const SCENARIO_MATERIAL_ID = "629a49205f76f65244785a14";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function goDailyReport(page: Page) {
  await page.goto(`/daily-report/${DAILY_REPORT_ID}`);
  // Wait for the page heading rather than networkidle — faster and more reliable.
  await page.waitForSelector("h2", { timeout: 15_000 });
}

async function openAddForm(page: Page) {
  // The "add" button in the Material Shipments card (aria-label="add", FiPlus icon)
  await page
    .getByRole("heading", { name: /material shipments/i })
    .locator("..") // Flex row containing heading + button
    .getByRole("button", { name: "add" })
    .click();
}

async function selectScenarioMaterial(page: Page) {
  // Two materials share the label "Material 1 - Supplier Company 1".
  // Select by value (_id) to get the rate-model scenario one.
  const select = page.locator("select[name='jobsiteMaterialId']").first();
  await select.selectOption({ value: SCENARIO_MATERIAL_ID });
  // Wait for the auto-effect to fire and select the first scenario (Pickup)
  await expect(page.getByText("Rate Scenario")).toBeVisible();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

// These tests verify auth behaviour — run without saved auth state.
test.describe("Authentication", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto(`/daily-report/${DAILY_REPORT_ID}`);
    await expect(page).toHaveURL(/login/);
  });

  test("logs in successfully", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@bowmark.ca");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: /submit/i }).click();
    await expect(page).not.toHaveURL(/login/);
  });
});

// ── Page loading ──────────────────────────────────────────────────────────────

test.describe("Daily report page", () => {
  test.beforeEach(async ({ page }) => {
    await goDailyReport(page);
  });

  test("shows the daily report date", async ({ page }) => {
    await expect(page.getByText(/2022/).first()).toBeVisible();
  });

  test("shows the Material Shipments section with an add button", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: /material shipments/i })
    ).toBeVisible();
    await openAddForm(page);
    // Form opens — material select should appear
    await expect(
      page.locator("select[name='jobsiteMaterialId']").first()
    ).toBeVisible();
  });
});

// ── Scenario picker UI ────────────────────────────────────────────────────────

test.describe("Rate model — scenario picker", () => {
  test.beforeEach(async ({ page }) => {
    await goDailyReport(page);
    await openAddForm(page);
    await selectScenarioMaterial(page);
  });

  test("shows both scenario cards", async ({ page }) => {
    await expect(page.getByRole("button", { name: /^pickup/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^tandem delivered/i })
    ).toBeVisible();
  });

  test("pickup scenario shows vehicle section by default", async ({ page }) => {
    // Pickup is auto-selected on material change
    await expect(page.getByText("Vehicle Source")).toBeVisible();
  });

  test("switching to delivered hides vehicle section and shows callout", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /^tandem delivered/i }).click();

    await expect(page.getByText("Vehicle Source")).not.toBeVisible();
    await expect(
      page.getByText(/trucking is included in this rate/i)
    ).toBeVisible();
  });

  test("switching back to pickup restores vehicle section", async ({ page }) => {
    await page.getByRole("button", { name: /^tandem delivered/i }).click();
    await page.getByRole("button", { name: /^pickup/i }).click();

    await expect(page.getByText("Vehicle Source")).toBeVisible();
  });
});

// ── Delivered scenario — full submission ──────────────────────────────────────

test.describe("Delivered scenario submission", () => {
  test.beforeEach(async ({ page }) => {
    await goDailyReport(page);
    await openAddForm(page);
    await selectScenarioMaterial(page);
  });

  test("submits successfully with quantity only", async ({ page }) => {
    // Switch to delivered scenario
    await page.getByRole("button", { name: /^tandem delivered/i }).click();
    await expect(page.getByText("Vehicle Source")).not.toBeVisible();

    // Fill quantity
    const quantityInput = page.getByLabel("Quantity").first();
    await quantityInput.fill("5");

    // Submit
    await page.getByRole("button", { name: "Submit" }).click();

    // Success toast
    await expect(page.getByText("Successfully added material shipments")).toBeVisible({
      timeout: 10_000,
    });

    // Form closes after success
    await expect(
      page.locator("select[name='jobsiteMaterialId']")
    ).not.toBeVisible();
  });

  test("shows quantity validation error on empty submit", async ({ page }) => {
    await page.getByRole("button", { name: /^tandem delivered/i }).click();

    // Clear the quantity field — initial value is 0, which passes isEmpty(),
    // so we need an actual empty string to trigger the validation error.
    await page.getByLabel("Quantity").first().clear();

    await page.getByRole("button", { name: "Submit" }).click();

    await expect(page.getByText(/please provide a quantity/i)).toBeVisible();
  });
});

// ── Pickup scenario — full submission ─────────────────────────────────────────

test.describe("Pickup scenario submission", () => {
  test.beforeEach(async ({ page }) => {
    await goDailyReport(page);
    await openAddForm(page);
    await selectScenarioMaterial(page);
    // Pickup is auto-selected — stay on it
  });

  test("submits successfully with quantity, vehicle source, vehicle type, and vehicle code", async ({
    page,
  }) => {
    // Fill quantity
    await page.getByLabel("Quantity").first().fill("10");

    // Vehicle source: search for the seeded company
    await page.getByPlaceholder("Search Companies").click();
    await page.getByPlaceholder("Search Companies").fill("Supplier");
    // Scope to the search-result span (id="option-N") to avoid matching select <option> elements
    await page.locator("span[id^='option-']").filter({ hasText: "Supplier Company 1" }).click();

    // Vehicle type: select the first available trucking rate
    await page.locator("select[name='vehicleType']").selectOption({ index: 1 });

    // Vehicle code
    await page.getByLabel("Vehicle Code").fill("TEST-001");

    // Submit
    await page.getByRole("button", { name: "Submit" }).click();

    await expect(page.getByText("Successfully added material shipments")).toBeVisible({
      timeout: 10_000,
    });

    // Form closes after success
    await expect(
      page.locator("select[name='jobsiteMaterialId']")
    ).not.toBeVisible();
  });

  test("shows vehicle validation errors when vehicle fields are empty", async ({
    page,
  }) => {
    // Fill quantity but leave vehicle fields empty
    await page.getByLabel("Quantity").first().fill("10");

    await page.getByRole("button", { name: "Submit" }).click();

    await expect(
      page.getByText(/please provide a vehicle source/i)
    ).toBeVisible();
    await expect(
      page.getByText(/please provide a vehicle type/i)
    ).toBeVisible();
    await expect(
      page.getByText(/please provide a vehicle code/i)
    ).toBeVisible();
  });
});
