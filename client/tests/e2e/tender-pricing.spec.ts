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
 *
 * State reset strategy: we snapshot the seeded row's full rateBuildupSnapshot
 * + rateBuildupOutputs once in beforeAll, then replay them via a direct
 * GraphQL mutation before each test. This is ~1s per test vs ~25s for a full
 * reseed, and guarantees pristine snapshot state even if a prior test mutated
 * params, controllers, or output selections inside the JSON blob.
 */
import { expect, test, type APIRequestContext, type Page, type Locator } from "@playwright/test";

const TENDER_ID = "629a49205f76f65244785d01";
const SHEET_ID = "629a49205f76f65244785d02";
const ROW_ID = "629a49205f76f65244785d03";
const GRAPHQL_URL = "http://localhost:4001/graphql";

// ── State reset — login + seeded row cache ───────────────────────────────────

let authToken: string;
let seedSnapshotJson: string;
let seedOutputs: any[];
let seedUnit: string;
let seedQuantity: number;
let seedUnitPrice: number;

async function gqlLogin(request: APIRequestContext): Promise<string> {
  const res = await request.post(GRAPHQL_URL, {
    data: {
      query: `
        mutation Login($data: LoginData!) {
          login(data: $data)
        }
      `,
      variables: {
        data: { email: "admin@bowmark.ca", password: "password", rememberMe: true },
      },
    },
  });
  const body = await res.json();
  if (!body.data?.login) throw new Error(`Login failed: ${JSON.stringify(body)}`);
  return body.data.login as string;
}

/**
 * Query the seeded row and stash its snapshot + outputs for later reset.
 * Runs once before all tests, after globalSetup has finished seeding.
 */
async function captureSeedRowState(request: APIRequestContext) {
  const res = await request.post(GRAPHQL_URL, {
    headers: { Authorization: authToken },
    data: {
      query: `
        query ($tenderId: ID!) {
          tenderPricingSheet(tenderId: $tenderId) {
            _id
            rows {
              _id
              quantity
              unit
              unitPrice
              rateBuildupSnapshot
              rateBuildupOutputs {
                kind
                materialId
                crewKindId
                unit
                perUnitValue
                totalValue
              }
            }
          }
        }
      `,
      variables: { tenderId: TENDER_ID },
    },
  });
  const body = await res.json();
  if (body.errors) throw new Error(`Seed capture failed: ${JSON.stringify(body.errors)}`);
  const row = body.data.tenderPricingSheet.rows.find((r: any) => r._id === ROW_ID);
  if (!row) throw new Error(`Seeded row ${ROW_ID} not found`);
  seedSnapshotJson = row.rateBuildupSnapshot;
  seedOutputs = (row.rateBuildupOutputs ?? []).map((o: any) => {
    // Strip Apollo's __typename before sending back as mutation input
    const { __typename, ...rest } = o;
    return rest;
  });
  seedUnit = row.unit;
  seedQuantity = row.quantity;
  seedUnitPrice = row.unitPrice;
}

/**
 * Replay the seeded row state — scalar fields, snapshot blob, and outputs —
 * via the same mutation the client uses. Runs in beforeEach to guarantee
 * each test starts from a pristine state.
 */
async function resetRowState(request: APIRequestContext) {
  const res = await request.post(GRAPHQL_URL, {
    headers: { Authorization: authToken },
    data: {
      query: `
        mutation Reset($sheetId: ID!, $rowId: ID!, $data: TenderPricingRowUpdateData!) {
          tenderPricingRowUpdate(sheetId: $sheetId, rowId: $rowId, data: $data) { _id }
        }
      `,
      variables: {
        sheetId: SHEET_ID,
        rowId: ROW_ID,
        data: {
          quantity: seedQuantity,
          unit: seedUnit,
          unitPrice: seedUnitPrice,
          rateBuildupSnapshot: seedSnapshotJson,
          rateBuildupOutputs: seedOutputs,
        },
      },
    },
  });
  const body = await res.json();
  if (body.errors) throw new Error(`Reset failed: ${JSON.stringify(body.errors)}`);
}

// ── UI helpers ───────────────────────────────────────────────────────────────

async function goTender(page: Page) {
  await page.goto(`/tender/${TENDER_ID}`);
  await expect(
    page.getByText("E2E Paving Row", { exact: true }).first()
  ).toBeVisible({ timeout: 15_000 });
}

async function openDetail(page: Page) {
  await page.getByText("E2E Paving Row", { exact: true }).first().click();
  await expect(page.getByTestId("buildup-unit-price")).toBeVisible({ timeout: 10_000 });
}

async function expandBuildup(page: Page) {
  const expandLabel = page.getByText(/^expand$/i).first();
  if (await expandLabel.isVisible().catch(() => false)) {
    await expandLabel.click();
  }
}

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

function paramInput(page: Page, labelSubstring: string): Locator {
  return page
    .getByText(labelSubstring, { exact: false })
    .first()
    .locator("xpath=following::input[@type='number'][1]");
}

/**
 * Returns a promise that resolves on the next tenderPricingRowUpdate response
 * from the GraphQL endpoint. MUST be started BEFORE the action that triggers
 * the save — otherwise a fast mutation can complete before the listener
 * attaches and the wait will time out.
 *
 * Usage:
 *   const waiter = pendingRowSave(page);
 *   await doSomethingThatTriggersSave();
 *   await waiter;
 */
function pendingRowSave(page: Page) {
  return page.waitForResponse(
    (res) =>
      res.url().includes("/graphql") &&
      res.request().method() === "POST" &&
      res.request().postData()?.includes("tenderPricingRowUpdate") === true,
    { timeout: 8_000 }
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe.configure({ mode: "serial" });

test.describe("Tender pricing — golden path wire", () => {
  test.beforeAll(async ({ request }) => {
    authToken = await gqlLogin(request);
    await captureSeedRowState(request);
  });

  test.beforeEach(async ({ request }) => {
    await resetRowState(request);
  });

  test("initial load shows seeded unit price $64.40 in row + detail", async ({ page }) => {
    await goTender(page);

    const rowPrice = await readRowUnitPrice(page);
    expect(rowPrice).toBeCloseTo(64.4, 2);

    await openDetail(page);
    const detailPrice = await readDetailUnitPrice(page);
    expect(detailPrice).toBeCloseTo(64.4, 2);
  });

  test("changing depth param recomputes and persists across reload", async ({ page }) => {
    await goTender(page);
    await openDetail(page);
    await expandBuildup(page);

    const input = paramInput(page, "Depth");
    const savePending = pendingRowSave(page);
    await input.fill("0.08");
    await input.blur();

    // Wait for the debounced save (500ms) to reach the server, then verify
    // the DOM reflects the new value.
    await savePending;
    await expect(async () => {
      expect(await readDetailUnitPrice(page)).toBeCloseTo(73.04, 1);
    }).toPass({ timeout: 4_000 });

    await page.reload();
    await expect(page.getByTestId("buildup-unit-price")).toBeVisible({ timeout: 15_000 });
    await expect(async () => {
      expect(await readDetailUnitPrice(page)).toBeCloseTo(73.04, 1);
    }).toPass({ timeout: 5_000 });
  });

  test("switching unit variant m2 → m3 recomputes via conversion formula", async ({ page }) => {
    await goTender(page);
    await openDetail(page);

    // The Unit <select> lives in the Quantity card inside LineItemDetail.
    // Changing unit fires onUpdate immediately (no debounce), so we set up
    // the listener first.
    const unitSelect = page.getByRole("combobox").filter({ hasText: "m²" }).first();
    const savePending = pendingRowSave(page);
    await unitSelect.selectOption("m3");
    await savePending;

    // raw qty 100 → converted 100/0.05 = 2000
    // mat_per_unit = 0.05*2.4*120 = 14.40
    // lab_per_unit = 5000/2000    =  2.50
    // total = 16.90
    await expect(async () => {
      expect(await readDetailUnitPrice(page)).toBeCloseTo(16.9, 1);
    }).toPass({ timeout: 4_000 });

    await page.reload();
    await expect(page.getByTestId("buildup-unit-price")).toBeVisible({ timeout: 15_000 });
    await expect(async () => {
      expect(await readDetailUnitPrice(page)).toBeCloseTo(16.9, 1);
    }).toPass({ timeout: 5_000 });
  });

  test("toggling waste group adds fixed per-unit cost", async ({ page }) => {
    await goTender(page);
    await openDetail(page);
    await expandBuildup(page);

    await expect(async () => {
      expect(await readDetailUnitPrice(page)).toBeCloseTo(64.4, 2);
    }).toPass({ timeout: 3_000 });

    // The toggle switch lives in the Waste group card header. It has a
    // stable testid so we don't depend on the click coordinates inside the
    // small Chakra pill.
    const savePending = pendingRowSave(page);
    await page.getByTestId("group-toggle-g_waste").click();
    await savePending;

    // 64.40 + 1.50 = 65.90
    await expect(async () => {
      expect(await readDetailUnitPrice(page)).toBeCloseTo(65.9, 2);
    }).toPass({ timeout: 4_000 });

    await page.reload();
    await expect(page.getByTestId("buildup-unit-price")).toBeVisible({ timeout: 15_000 });
    await expect(async () => {
      expect(await readDetailUnitPrice(page)).toBeCloseTo(65.9, 2);
    }).toPass({ timeout: 5_000 });
  });

  test("changing output material selection persists through reload", async ({ page }) => {
    await goTender(page);
    await openDetail(page);
    await expandBuildup(page);

    // Material picker lives in the Demand section. Anchor on the "Asphalt"
    // OutputDef label then the nearest combobox below it.
    const picker = page
      .getByText("Asphalt", { exact: true })
      .first()
      .locator("xpath=following::select[1]");

    const initialValue = await picker.inputValue();
    await expect(
      picker.locator(`option[value="${initialValue}"]`)
    ).toHaveText("Material 1");

    const savePending = pendingRowSave(page);
    await picker.selectOption({ label: "Second Material" });
    const newValue = await picker.inputValue();
    expect(newValue).not.toBe(initialValue);

    // Wait for debounced save to reach the server.
    await savePending;

    // Reload — picker should rehydrate with the saved selection
    await page.reload();
    await expect(page.getByTestId("buildup-unit-price")).toBeVisible({ timeout: 15_000 });
    await expandBuildup(page);

    const pickerAfter = page
      .getByText("Asphalt", { exact: true })
      .first()
      .locator("xpath=following::select[1]");
    await expect(pickerAfter).toHaveValue(newValue);
  });
});
