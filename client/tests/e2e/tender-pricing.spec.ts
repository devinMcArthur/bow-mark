/**
 * E2E tests for the tender pricing "golden path" wire: UI → Apollo → server → DB → reload.
 *
 * These specs are NOT re-validating the evaluator math (that's exhaustively
 * unit-tested). They exercise the plumbing between the already-proven pieces:
 * RateBuildupInputs event handlers → snapshot state → evaluateSnapshot →
 * debounced save mutation → DB persist → reload render.
 *
 * Seeded fixture (see server/src/testing/documents/):
 *   Tender:     _ids.tenders.e2e_pricing._id        (629a49205f76f65244785d01)
 *   Sheet:      _ids.tenders.e2e_pricing.sheetId    (629a49205f76f65244785d02)
 *   Row:        _ids.tenders.e2e_pricing.rowId      (629a49205f76f65244785d03)
 *   Template:   "E2E Paving Test"
 *   Initial unitPrice (qty 100, m2, waste off, defaults): $64.40
 *
 *   Expected values under defaults (qty 100):
 *     m2 + waste off                  : 14.40 + 50.00 + 0     = $64.40
 *     m2 + waste on                   : 14.40 + 50.00 + 1.50  = $65.90
 *     m2 + depth 0.08 + waste off     : 23.04 + 50.00 + 0     = $73.04
 *     m3 + waste off (conv qty=2000)  : 14.40 +  2.50 + 0     = $16.90
 */
import { expect, test, type Page, type Locator } from "@playwright/test";

const TENDER_ID = "629a49205f76f65244785d01";
const SHEET_ID = "629a49205f76f65244785d02";
const ROW_ID = "629a49205f76f65244785d03";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function goTender(page: Page) {
  await page.goto(`/tender/${TENDER_ID}`);
  // Wait for the pricing row (description "E2E Paving Row") to render. This
  // guards against navigating before the Apollo query resolves.
  await expect(
    page.getByText("E2E Paving Row", { exact: true }).first()
  ).toBeVisible({ timeout: 15_000 });
}

async function openDetail(page: Page) {
  // Clicking the row description in the pricing table opens LineItemDetail.
  await page.getByText("E2E Paving Row", { exact: true }).first().click();
  // The buildup unit price testid only mounts when a row is selected.
  await expect(page.getByTestId("buildup-unit-price")).toBeVisible({ timeout: 10_000 });
}

/**
 * Expand the Rate Buildup section if it's currently collapsed. The section
 * mounts even when collapsed (so the evaluator keeps firing), but the input
 * fields are display:none until expanded.
 */
async function expandBuildup(page: Page) {
  const expandLabel = page.getByText(/^expand$/i).first();
  if (await expandLabel.isVisible().catch(() => false)) {
    await expandLabel.click();
  }
}

/** Parse "$NN.NN" into a number. */
function parsePrice(text: string): number {
  return parseFloat(text.replace(/[^0-9.]/g, ""));
}

async function readDetailUnitPrice(page: Page): Promise<number> {
  const txt = (await page.getByTestId("buildup-unit-price").textContent()) ?? "";
  return parsePrice(txt);
}

async function readRowUnitPrice(page: Page): Promise<number> {
  const txt = (await page.getByTestId("row-cost-up").first().textContent()) ?? "";
  return parsePrice(txt);
}

/**
 * Locate a parameter input by its visible label (e.g. "Depth (m)"). The
 * ParamRow renders <Text>{label}</Text> then <Input type="number"> inside
 * the same container, so we anchor on the label and walk to the next input.
 */
function paramInput(page: Page, labelSubstring: string): Locator {
  return page
    .getByText(labelSubstring, { exact: false })
    .first()
    .locator("xpath=following::input[@type='number'][1]");
}

/**
 * Reset the row back to baseline via a direct GraphQL mutation. Called from
 * afterEach so each test starts from a known state without re-seeding.
 */
async function resetRow(page: Page) {
  await page.evaluate(
    async ({ sheetId, rowId }) => {
      // Reset both the quantity/unit/unitPrice AND re-send the default snapshot
      // via the tenderPricingRowUpdate mutation. We don't touch rateBuildupSnapshot
      // here since the UI will recompute from whatever is stored next time the
      // detail opens; the unitPrice + unit + quantity fields are sufficient to
      // restore the visual baseline.
      const mutation = `
        mutation ResetRow($sheetId: ID!, $rowId: ID!, $data: TenderPricingRowUpdateData!) {
          tenderPricingRowUpdate(sheetId: $sheetId, rowId: $rowId, data: $data) { _id }
        }
      `;
      await fetch("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: mutation,
          variables: {
            sheetId,
            rowId,
            data: { quantity: 100, unit: "m2", unitPrice: 64.4 },
          },
        }),
      });
    },
    { sheetId: SHEET_ID, rowId: ROW_ID }
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Tender pricing — golden path wire", () => {
  test.afterEach(async ({ page }) => {
    await resetRow(page);
  });

  test("initial load shows seeded unit price $64.40 in row + detail", async ({ page }) => {
    await goTender(page);

    // Full-width table is rendered when no row is selected.
    const rowPrice = await readRowUnitPrice(page);
    expect(rowPrice).toBeCloseTo(64.4, 2);

    // Open detail → price mirrors in the buildup summary.
    await openDetail(page);
    const detailPrice = await readDetailUnitPrice(page);
    expect(detailPrice).toBeCloseTo(64.4, 2);
  });

  test("changing depth param recomputes and persists across reload", async ({ page }) => {
    await goTender(page);
    await openDetail(page);
    await expandBuildup(page);

    // Change depth 0.05 → 0.08
    const input = paramInput(page, "Depth");
    await input.fill("0.08");
    await input.blur();

    // Wait for debounced save (500ms client-side + mutation roundtrip)
    await expect(async () => {
      const price = await readDetailUnitPrice(page);
      // 0.08 * 2.4 * 120 + 5000/100 = 23.04 + 50 = 73.04
      expect(price).toBeCloseTo(73.04, 1);
    }).toPass({ timeout: 6_000 });

    // Reload — the detail pane persists its selected row across reloads via
    // URL/state, so the buildup unit price testid remounts and must show the
    // saved value after hydrating from the DB.
    await page.reload();
    await expect(page.getByTestId("buildup-unit-price")).toBeVisible({ timeout: 15_000 });
    await expect(async () => {
      const reloaded = await readDetailUnitPrice(page);
      expect(reloaded).toBeCloseTo(73.04, 1);
    }).toPass({ timeout: 5_000 });
  });
});
