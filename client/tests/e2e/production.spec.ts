/**
 * E2E tests for the Production section of the daily report page.
 *
 * Seeded data (server/src/testing/_ids.ts):
 *   Daily report jobsite_1_base_1_1 (ID: 621664558c026b7ac8fb32ef)
 *   Seeded production already on the report: jobsite_1_base_1_1_production_1
 */
import { expect, test, type Page } from "@playwright/test";

const DAILY_REPORT_ID = "621664558c026b7ac8fb32ef";

async function goDailyReport(page: Page) {
  await page.goto(`/daily-report/${DAILY_REPORT_ID}`);
  await page.waitForSelector("h2", { timeout: 15_000 });
}

async function openAddForm(page: Page) {
  await page
    .getByRole("heading", { name: /^production$/i })
    .locator("..")
    .getByRole("button", { name: "add" })
    .click();
  await expect(
    page.getByRole("button", { name: /save production/i })
  ).toBeVisible();
}

// ── Section rendering ────────────────────────────────────────────────────────

test.describe("Production section", () => {
  test.beforeEach(async ({ page }) => {
    await goDailyReport(page);
  });

  test("renders heading + add button", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /^production$/i })
    ).toBeVisible();
  });
});

// ── Add form ─────────────────────────────────────────────────────────────────

test.describe("Production — add form", () => {
  test.beforeEach(async ({ page }) => {
    await goDailyReport(page);
    await openAddForm(page);
  });

  test("shows validation errors on empty submit", async ({ page }) => {
    await page.getByRole("button", { name: /save production/i }).click();

    // jobTitle is required via yup; validation surfaces below the field.
    await expect(page.getByText(/please provide a job title/i)).toBeVisible();
  });

  test("submits successfully with required fields filled", async ({ page }) => {
    // Scope to the production create form — it renders inside a <form>, and
    // it's the only <form> that exists on the daily report page while the
    // add drawer is open. Scoping prevents us from grabbing the Navbar
    // role-switcher <select> or the site-wide search input.
    const form = page.locator("form");

    // Work done — freeform text input (first input inside the form).
    await form
      .getByText("Work done")
      .locator("..")
      .locator("input")
      .fill("Paving test");

    // Quantity — NumberInput renders role="spinbutton".
    await form
      .getByText("Quantity")
      .locator("..")
      .locator("input")
      .fill("25");

    // Unit — seeded System provides canonical units.
    await form
      .getByText("Unit")
      .locator("..")
      .locator("select")
      .selectOption({ index: 1 });

    // Start + End time.
    await form
      .getByText("Start")
      .locator("..")
      .locator("input")
      .fill("08:00");
    await form
      .getByText("End")
      .locator("..")
      .locator("input")
      .fill("12:00");

    await page.getByRole("button", { name: /save production/i }).click();

    // Toast copy: "Production successfully created"
    await expect(
      page.getByText(/production successfully created/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ── Edit existing row ────────────────────────────────────────────────────────

test.describe("Production — edit form", () => {
  test.beforeEach(async ({ page }) => {
    await goDailyReport(page);
  });

  test("opens edit form with Save changes button", async ({ page }) => {
    const section = page
      .getByRole("heading", { name: /^production$/i })
      .locator("../..");
    await section.getByRole("button", { name: "edit" }).first().click();

    await expect(
      page.getByRole("button", { name: /save changes/i })
    ).toBeVisible();
  });
});
