/**
 * E2E tests for the Equipment Hours section (vehicle work) on the daily
 * report page.
 *
 * Seeded data (server/src/testing/_ids.ts):
 *   Daily report jobsite_1_base_1_1 (ID: 621664558c026b7ac8fb32ef)
 *   Crew base_1 vehicles visible as chips:
 *     T-12 (Gravel Truck), T-52 (1 Ton), G-25 (Skidsteer)
 *   Seeded work already on the report: skidsteer_1 (G-25) with jobTitle "Prep work"
 */
import { expect, test, type Page } from "@playwright/test";

const DAILY_REPORT_ID = "621664558c026b7ac8fb32ef";

async function goDailyReport(page: Page) {
  await page.goto(`/daily-report/${DAILY_REPORT_ID}`);
  await page.waitForSelector("h2", { timeout: 15_000 });
}

async function openAddForm(page: Page) {
  await page
    .getByRole("heading", { name: /equipment hours/i })
    .locator("..")
    .getByRole("button", { name: "add" })
    .click();
  await expect(
    page.getByRole("button", { name: /save vehicle hours/i })
  ).toBeVisible();
}

// ── Section rendering ────────────────────────────────────────────────────────

test.describe("Equipment Hours section", () => {
  test.beforeEach(async ({ page }) => {
    await goDailyReport(page);
  });

  test("renders heading + add button", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /equipment hours/i })
    ).toBeVisible();
  });

  test("renders the seeded vehicle work row", async ({ page }) => {
    // Seeded row: "Prep work - G-25"
    await expect(page.getByText(/prep work/i).first()).toBeVisible();
  });
});

// ── Add form ─────────────────────────────────────────────────────────────────

test.describe("Equipment Hours — add form", () => {
  test.beforeEach(async ({ page }) => {
    await goDailyReport(page);
    await openAddForm(page);
  });

  test("shows crew vehicle chips", async ({ page }) => {
    // Chip shows vehicleCode bolded + name. Both are set to the code in seed,
    // so matching by the code is reliable. Vehicle chips live in the add form;
    // the seeded card above also contains G-25 — use the button role to scope.
    await expect(
      page.getByRole("button", { name: /G-25/ }).first()
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /T-12/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /T-52/ })).toBeVisible();
  });

  test("shows validation error when submitting with no vehicles selected", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: /save vehicle hours/i })
      .click();

    await expect(
      page.getByText(/please select at least one vehicle/i)
    ).toBeVisible();
  });

  test("submits successfully with a vehicle + hours", async ({ page }) => {
    // Click the T-12 chip in the add form (not the seeded list above).
    await page.getByRole("button", { name: /T-12/ }).click();

    await page
      .getByRole("button", { name: /save vehicle hours/i })
      .click();

    await expect(
      page.getByText(/successfully added vehicle work/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ── Edit existing row ────────────────────────────────────────────────────────

test.describe("Equipment Hours — edit form", () => {
  test.beforeEach(async ({ page }) => {
    await goDailyReport(page);
  });

  test("opens edit form with Save changes button", async ({ page }) => {
    const section = page
      .getByRole("heading", { name: /equipment hours/i })
      .locator("../..");
    await section.getByRole("button", { name: "edit" }).first().click();

    await expect(
      page.getByRole("button", { name: /save changes/i })
    ).toBeVisible();
  });
});
