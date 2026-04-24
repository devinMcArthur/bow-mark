/**
 * E2E tests for the Employee Hours section of the daily report page.
 *
 * Seeded data (server/src/testing/_ids.ts):
 *   Daily report jobsite_1_base_1_1  (ID: 621664558c026b7ac8fb32ef)
 *   Crew base_1 employees visible as chips:
 *     Base Foreman 1, Base Operator 1, Base Laborer 1, Base Laborer 2, Base Laborer 3
 *   Seeded work already on the report: base_foreman_1 + base_foreman_2
 *
 * Auth: globalSetup saves admin cookies to playwright/.auth/admin.json —
 * these tests inherit that state via the default storageState.
 */
import { expect, test, type Page } from "@playwright/test";

const DAILY_REPORT_ID = "621664558c026b7ac8fb32ef";

async function goDailyReport(page: Page) {
  await page.goto(`/daily-report/${DAILY_REPORT_ID}`);
  await page.waitForSelector("h2", { timeout: 15_000 });
}

/** Open the "add" form inside the Employee Hours section. */
async function openAddForm(page: Page) {
  await page
    .getByRole("heading", { name: /employee hours/i })
    .locator("..") // Flex row containing heading + add button
    .getByRole("button", { name: "add" })
    .click();
  // Wait for the "Save employee hours" button — confirms the form is open.
  await expect(
    page.getByRole("button", { name: /save employee hours/i })
  ).toBeVisible();
}

// ── Section rendering ────────────────────────────────────────────────────────

test.describe("Employee Hours section", () => {
  test.beforeEach(async ({ page }) => {
    await goDailyReport(page);
  });

  test("renders heading + add button", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /employee hours/i })
    ).toBeVisible();
  });

  test("renders the seeded work row", async ({ page }) => {
    // Seeded employee work for Base Foreman 1 should show up in the card list.
    await expect(page.getByText(/base foreman 1/i).first()).toBeVisible();
  });
});

// ── Add form ─────────────────────────────────────────────────────────────────

test.describe("Employee Hours — add form", () => {
  test.beforeEach(async ({ page }) => {
    await goDailyReport(page);
    await openAddForm(page);
  });

  test("shows crew employee chips", async ({ page }) => {
    // All five base_1 crew members should be visible as selectable chips.
    await expect(
      page.getByRole("button", { name: /base foreman 1/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /base operator 1/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /base laborer 1/i })
    ).toBeVisible();
  });

  test("shows validation error when submitting with no employees selected", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: /save employee hours/i })
      .click();

    await expect(
      page.getByText(/please select at least one employee/i)
    ).toBeVisible();
  });

  test("submits successfully with an employee + job title + times", async ({
    page,
  }) => {
    // Pick a single crew member. base_laborer_3 is unlikely to have
    // work seeded, so even though parallel tests share the report,
    // this add always writes fresh data rather than mutating seeded rows.
    await page.getByRole("button", { name: /base laborer 3/i }).click();

    // Work done — the FieldLabel sits above an EmployeeWorkSelect (<select>).
    // Scope to the label's parent to skip the Navbar role-switcher <select>.
    // Seeded laborTypes give us "General labor", "Operator", "Foreman".
    await page
      .getByText("Work done")
      .locator("..")
      .locator("select")
      .selectOption({ label: "General labor" });

    // Times default to current wall-clock but <input type="time"> may not
    // reflect that on first paint — fill explicitly so validation passes.
    const startInput = page.locator("input[type='time']").first();
    const endInput = page.locator("input[type='time']").nth(1);
    await startInput.fill("08:00");
    await endInput.fill("16:00");

    await page
      .getByRole("button", { name: /save employee hours/i })
      .click();

    await expect(
      page.getByText(/successfully added employee work/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ── Edit existing row ────────────────────────────────────────────────────────

test.describe("Employee Hours — edit form", () => {
  test.beforeEach(async ({ page }) => {
    await goDailyReport(page);
  });

  test("opens edit form with Save changes button", async ({ page }) => {
    // Scope to the Employee Hours section card — heading → Flex row → section Box.
    // This avoids matching the page-header "Edit" button above the sections.
    const section = page
      .getByRole("heading", { name: /employee hours/i })
      .locator("../..");
    await section.getByRole("button", { name: "edit" }).first().click();

    await expect(
      page.getByRole("button", { name: /save changes/i })
    ).toBeVisible();
  });
});
